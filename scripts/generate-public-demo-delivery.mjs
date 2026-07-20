import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  buildProtectedDeliveryDirs,
  findLocalAbsolutePathLeaks,
  isSameOrDescendantPath,
  resolvePrimaryRepositoryRootFromGitCommonDir,
  validateSafeOutputPath,
} from './public-demo-safety.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const checkoutRoot = path.resolve(__dirname, '..');
const requireFromRepo = createRequire(import.meta.url);
const DedupEngine = requireFromRepo(path.join(checkoutRoot, 'dedup-engine.js'));
const AuditEngine = requireFromRepo(path.join(checkoutRoot, 'literature-screening-v2.2', 'audit-engine.js'));
const DualReviewEngine = requireFromRepo(path.join(checkoutRoot, 'literature-screening-v2.2', 'dual-review-engine.js'));

const NOTICE = '本样例使用 PRISMA Workbench 公开模拟数据生成，不含真实客户数据，不代表真实客户案例或真实项目效果。';
const DEMO_VERSION = 'public-demo-v2.1.1';
const GENERATED_AT = new Date().toISOString();
const SAMPLE_REL = 'literature-screening-v2.2/sample-data.json';
const GENERATOR_REL = 'scripts/generate-public-demo-delivery.mjs';
const OUTPUT_MANIFEST_REL = '09_OUTPUT_MANIFEST.md';
const GENERATION_RECORD_REL = 'GENERATION_RECORD.json';
const STAGING_PREFIX = '.public-demo-v2-1-1-staging-';
const PREFLIGHT_TESTS = [
  'tests/demo/public-demo-consistency.test.mjs',
  'tests/audit/audit-export.test.mjs',
  'tests/audit/dual-review-engine.test.mjs',
  'tests/audit/reviewer-bundle-engine.test.mjs',
  'tests/import/import-hardening.test.mjs',
  'tests/dedup/dedup-engine.test.mjs',
];
const SOURCE_FILES = [
  SAMPLE_REL,
  'dedup-engine.js',
  'literature-screening-v2.2/audit-engine.js',
  'literature-screening-v2.2/dual-review-engine.js',
  'docs/demo/README.md',
  'docs/templates/audit-appendix-template.md',
  GENERATOR_REL,
  'scripts/public-demo-safety.mjs',
  'tests/demo/public-demo-consistency.test.mjs',
  'tests/demo/public-demo-generator.test.mjs',
];

function cleanPreflightEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_TEST_TOKEN;
  delete env.NODE_TEST_WORKER_ID;
  return env;
}

function usage() {
  console.error('Usage: node scripts/generate-public-demo-delivery.mjs <output-directory>');
}

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function fileBytes(absPath) {
  return fs.readFileSync(absPath);
}

function fileHash(absPath) {
  return sha256Buffer(fileBytes(absPath));
}

function fileSize(absPath) {
  return fs.statSync(absPath).size;
}

function relPath(absPath, basePath) {
  return path.relative(basePath, absPath).replace(/\\/g, '/');
}

function isSamePath(left, right) {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

function isSubpath(child, parent) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function writeText(outDir, rel, content) {
  const abs = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${content.replace(/[ \t]+$/gm, '').trimEnd()}\n`, 'utf8');
}

function writeJson(outDir, rel, payload) {
  writeText(outDir, rel, JSON.stringify(payload, null, 2));
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(headers, rows) {
  return [`# ${NOTICE}`, headers.join(','), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(','))].join('\n');
}

function md(title, body) {
  return `${NOTICE}\n\n# ${title}\n\n${body}`;
}

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `|${headers.map(() => '---').join('|')}|`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? '').replace(/\n/g, '<br>')).join(' | ')} |`),
  ].join('\n');
}

function countBy(items, getter) {
  return items.reduce((acc, item) => {
    const key = getter(item) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function normalizeRecord(record, index) {
  const id = `demo-record-${String(index + 1).padStart(3, '0')}`;
  return {
    ...record,
    id,
    record_id: id,
    source_database: record.database || '',
    source_file: SAMPLE_REL,
    identifier_raw: record.doi || record.pmid || record.wanfang_id || record.vip_id || record.sinomed_id || '',
    publication_type: 'journal_article',
  };
}

function sourceQualityFlags(record) {
  const flags = [];
  const abstract = String(record.abstract || '');
  const db = String(record.database || record.source_database || '');
  if (/下载频次|被引频次|分类号|dbcode/i.test(abstract)) flags.push('abstract_noise_detected');
  if (/余略|truncated/i.test(abstract)) flags.push('abstract_truncation_suspected');
  if ((db === 'VIP' && abstract.trim() === '') || (db === 'SinoMed' && String(record.journal || '').trim() === '')) {
    flags.push('source_mapping_incomplete');
  }
  return flags;
}

function screeningDecisionFor(record) {
  const text = [record.title, record.abstract, record.keywords].join(' ').toLowerCase();
  const year = Number(record.year);
  if (!Number.isFinite(year) || year < 2019 || year > 2025) return { decision: 'exclude', reason: 'outside_year_range' };
  if (!text.includes('高血压') && !text.includes('hypertension')) return { decision: 'exclude', reason: 'wrong_outcome' };
  if (text.includes('动物实验') || text.includes('animal study')) return { decision: 'exclude', reason: 'wrong_study_design' };
  return { decision: 'include', reason: '' };
}

function sourceQualitySummary(records) {
  const warningRecords = records.map((record) => ({ record, flags: sourceQualityFlags(record) })).filter((entry) => entry.flags.length > 0);
  const bySourceDatabase = countBy(warningRecords, (entry) => entry.record.database);
  const byWarningType = warningRecords.reduce((acc, entry) => {
    entry.flags.forEach((flag) => { acc[flag] = (acc[flag] || 0) + 1; });
    return acc;
  }, {});
  return {
    warningRecords,
    summary: {
      totalRecords: records.length,
      warningRecordCount: warningRecords.length,
      abstractTruncationCount: byWarningType.abstract_truncation_suspected || 0,
      abstractNoiseCount: byWarningType.abstract_noise_detected || 0,
      sourceMappingIncompleteCount: byWarningType.source_mapping_incomplete || 0,
      bySourceDatabase,
      byWarningType,
    },
  };
}

function makePrismaSvg(counts, pendingFullText) {
  const esc = (value) => String(value).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
  const screened = counts.titleAbstractIncluded + counts.titleAbstractExcluded + counts.titleAbstractUncertain;
  const boxes = [
    ['Identification', `Records identified: ${counts.recordsImported}`, 40, 40],
    ['Deduplication', `Duplicates removed: ${counts.duplicatesRemoved}`, 40, 140],
    ['Screening', `Title/abstract screened: ${screened}`, 40, 240],
    ['Excluded', `Title/abstract excluded: ${counts.titleAbstractExcluded}`, 420, 240],
    ['Pending', `Pending full-text review: ${pendingFullText}`, 40, 340],
    ['Full Text', `Full text assessed: ${counts.fullTextAssessed}`, 40, 440],
    ['Included', `Studies included: ${counts.studiesIncluded}`, 40, 540],
  ];
  const boxMarkup = boxes.map(([label, value, x, y]) => `  <rect x="${x}" y="${y}" width="300" height="62" rx="10" fill="#f8fafc" stroke="#334155" stroke-width="1.5"/>\n  <text x="${x + 16}" y="${y + 25}" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#0f172a">${esc(label)}</text>\n  <text x="${x + 16}" y="${y + 48}" font-family="Arial, sans-serif" font-size="14" fill="#334155">${esc(value)}</text>`).join('\n');
  return `<!-- ${NOTICE} -->\n<svg xmlns="http://www.w3.org/2000/svg" width="780" height="640" viewBox="0 0 780 640" role="img" aria-label="Public demo PRISMA flow diagram">\n  <desc>${esc(NOTICE)}</desc>\n  <rect width="780" height="640" fill="#ffffff"/>\n  <text x="40" y="24" font-family="Arial, sans-serif" font-size="14" fill="#64748b">Public demo data only; not a customer case.</text>\n${boxMarkup}\n  <path d="M190 102 L190 140" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)"/>\n  <path d="M190 202 L190 240" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)"/>\n  <path d="M340 271 L420 271" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)"/>\n  <path d="M190 302 L190 340" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)"/>\n  <path d="M190 402 L190 440" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)"/>\n  <path d="M190 502 L190 540" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)"/>\n  <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#64748b"/></marker></defs>\n</svg>`;
}

function runGit(args) {
  const result = spawnSync('git', args, { cwd: checkoutRoot, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

function resolvePrimaryRepositoryRoot() {
  const gitCommonDir = runGit(['rev-parse', '--path-format=absolute', '--git-common-dir']);
  return resolvePrimaryRepositoryRootFromGitCommonDir(gitCommonDir);
}

function repositoryDirty() {
  return runGit(['status', '--short']).length > 0;
}

function validateOutputArgument(outputArg) {
  const primaryRepositoryRoot = resolvePrimaryRepositoryRoot();
  return validateSafeOutputPath(outputArg, {
    checkoutRoot,
    primaryRepositoryRoot,
    protectedDirs: buildProtectedDeliveryDirs(primaryRepositoryRoot),
  });
}

function parseTapSummary(output) {
  const getNumber = (name) => {
    const match = output.match(new RegExp(`# ${name}\\s+([0-9.]+)`));
    return match ? Number(match[1]) : 0;
  };
  return {
    tests: getNumber('tests'),
    pass: getNumber('pass'),
    fail: getNumber('fail'),
    cancelled: getNumber('cancelled'),
    skipped: getNumber('skipped'),
    duration_ms: getNumber('duration_ms'),
  };
}

function runPreflightTests() {
  return PREFLIGHT_TESTS.map((testFile) => {
    const command = `node --test ${testFile}`;
    const result = spawnSync(process.execPath, ['--test', testFile], { cwd: checkoutRoot, encoding: 'utf8', env: cleanPreflightEnv() });
    const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
    const summary = parseTapSummary(combined);
    const exitCode = result.status === null ? 1 : result.status;
    const entry = { command, exit_code: exitCode, ...summary };
    if (exitCode !== 0 || summary.fail !== 0 || summary.cancelled !== 0) {
      throw new Error(`Preflight test failed: ${command}`);
    }
    return entry;
  });
}

function createStagingDir(outputDir) {
  const parent = path.dirname(outputDir);
  if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) {
    throw new Error('Output parent directory does not exist or is not a directory.');
  }
  const random = crypto.randomBytes(8).toString('hex');
  const staging = path.join(parent, `${STAGING_PREFIX}${process.pid}-${Date.now()}-${random}`);
  fs.mkdirSync(staging, { recursive: false });
  return staging;
}

function safeCleanupStaging(stagingDir, outputDir) {
  const parent = path.dirname(outputDir);
  const name = path.basename(stagingDir);
  if (!name.startsWith(STAGING_PREFIX) || !isSameOrDescendantPath(stagingDir, parent) || isSamePath(stagingDir, parent)) {
    throw new Error('Refusing to clean unsafe staging directory.');
  }
  if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true });
}

function publishStaging(stagingDir, outputDir) {
  if (fs.existsSync(outputDir)) throw new Error('Final output directory appeared before publish; refusing to overwrite.');
  fs.renameSync(stagingDir, outputDir);
}

function sourceMetadata(rel) {
  const abs = path.join(checkoutRoot, rel);
  return { relative_path: rel, size: fileSize(abs), sha256: fileHash(abs) };
}

function classifyOutput(rel) {
  const map = {
    'evidence/dedup_summary.json': ['generator_derived', 'DedupEngine.run'],
    'evidence/hard_duplicates.csv': ['generator_derived', 'DedupEngine.run'],
    'evidence/candidate_duplicates.csv': ['generator_derived', 'DedupEngine.run'],
    'evidence/dual_review_agreement.json': ['engine_output_wrapped', 'DualReviewEngine.serializeDualReviewAgreementJson'],
    'evidence/dual_review_conflicts.csv': ['engine_output_wrapped', 'DualReviewEngine.serializeDualReviewConflictsCsv'],
    'evidence/screening_decisions.csv': ['generator_derived', 'AuditEngine.serializeScreeningDecisionsCsv'],
    'evidence/prisma_counts.json': ['engine_output_wrapped', 'AuditEngine.buildPrismaCountsJson'],
    '06_DEFENSE_AUDIT_PACK.md': ['engine_output_wrapped', 'AuditEngine.buildDefenseReadyAuditPackMarkdown'],
    'evidence/audit_events.json': ['generator_derived', 'AuditEngine.createAuditEvent'],
    'evidence/prisma_flow.svg': ['generator_derived', ''],
    'evidence/input_profile.json': ['generator_derived', ''],
    'evidence/source_distribution.csv': ['generator_derived', ''],
    'evidence/import_quality_summary.json': ['generator_derived', ''],
    'evidence/source_quality_warnings.csv': ['generator_derived', ''],
    'evidence/generation_sources.json': ['generator_derived', ''],
    'GENERATION_RECORD.json': ['generator_derived', ''],
    '05_DUAL_REVIEW_SUMMARY.md': ['structure_example', 'DualReviewEngine.serializeDualReviewAgreementJson'],
    '10_LIMITATIONS.md': ['structure_example', ''],
    '11_CUSTOMER_ACCEPTANCE.md': ['structure_example', ''],
    'evidence/quality_appraisal_status.json': ['structure_example', ''],
    '00_README.md': ['human_authored_template', ''],
    '07_METHODS_APPENDIX_DRAFT.md': ['human_authored_template', ''],
    '08_HANDOFF_NOTES.md': ['human_authored_template', ''],
    'evidence/README.md': ['human_authored_template', ''],
  };
  const [sourceType, engineApi] = map[rel] || ['generator_derived', ''];
  return { sourceType, engineApi };
}

function customerConfirmation(rel) {
  if (rel.includes('dual_review') || rel === '05_DUAL_REVIEW_SUMMARY.md') return '真实项目中确认 reviewer A/B、resolver、agreement 和 conflict queue。';
  if (rel.includes('import_quality')) return '真实项目中确认导入字段质量、来源可靠性和处理边界。';
  if (rel.includes('source_quality')) return '真实项目中确认来源质量提示、导入风险和人工处理边界。';
  if (rel.includes('quality') || rel === '11_CUSTOMER_ACCEPTANCE.md') return '真实项目中确认质量评价、验收和删除证据。';
  if (rel.includes('dedup') || rel.includes('duplicates') || rel === '03_DEDUP_REVIEW.md') return '真实项目中确认候选重复是否合并或保留。';
  if (rel.includes('prisma') || rel === '04_PRISMA_COUNTS.md') return '真实项目中确认全文复核和最终纳入结果。';
  if (rel === '00_INPUT_MANIFEST.md' || rel.includes('input_profile')) return '真实项目中重新登记文件别名、大小和 SHA256。';
  return '真实项目中按客户项目重新生成并确认。';
}

function writeCoreOutputs(outputDir, context) {
  const { records, sampleSize, sampleHash, sourceDistribution, sourceQuality, dedup, screeningDecisions, auditEvents, pendingFullTextReview, dualReviewAgreement, dualReviewConflictsCsv, sourceRows, warningRows, hardDuplicateRows, candidateRows, includedRows, excludedRows } = context;
  writeJson(outputDir, 'evidence/input_profile.json', { notice: NOTICE, generated_at: GENERATED_AT, source_path: SAMPLE_REL, input_alias: 'public-demo-sample-data', data_nature: '公开模拟数据', file_size_bytes: sampleSize, sha256: sampleHash, record_count: records.length, source_distribution: sourceDistribution });
  writeText(outputDir, 'evidence/source_distribution.csv', csv(['source_database', 'records'], sourceRows));
  writeJson(outputDir, 'evidence/import_quality_summary.json', { notice: NOTICE, generated_at: GENERATED_AT, records_imported: records.length, retained_after_hard_dedup: dedup.retainedRecords.length, source_distribution: sourceDistribution, source_reliability_summary: sourceQuality.summary, missing_field_counts: { doi: records.filter((record) => !String(record.doi || '').trim()).length, abstract: records.filter((record) => !String(record.abstract || '').trim()).length, journal: records.filter((record) => !String(record.journal || '').trim()).length }, rule_source: 'docs/demo/README.md recommended demo configuration' });
  writeText(outputDir, 'evidence/source_quality_warnings.csv', csv(['record_id', 'source_database', 'title', 'warning_flags'], warningRows));
  writeJson(outputDir, 'evidence/dedup_summary.json', { notice: NOTICE, generated_at: GENERATED_AT, engine: 'dedup-engine.js', mode: dedup.mode, stats: dedup.stats, reasons: dedup.reasons, hard_duplicates: hardDuplicateRows, candidate_duplicates: candidateRows });
  writeText(outputDir, 'evidence/hard_duplicates.csv', csv(['duplicate_id', 'kept_record_id', 'duplicate_record_id', 'kept_title', 'duplicate_title', 'reason_code', 'evidence'], hardDuplicateRows));
  writeText(outputDir, 'evidence/candidate_duplicates.csv', csv(['candidate_id', 'left_record_id', 'right_record_id', 'left_title', 'right_title', 'reason_code', 'evidence'], candidateRows));
  writeText(outputDir, 'evidence/screening_decisions.csv', `${NOTICE}\n${AuditEngine.serializeScreeningDecisionsCsv(screeningDecisions)}`);
  writeText(outputDir, 'evidence/included_records.csv', csv(['record_id', 'title', 'year', 'source_database', 'decision'], includedRows));
  writeText(outputDir, 'evidence/excluded_records.csv', csv(['record_id', 'title', 'year', 'source_database', 'decision', 'exclusion_reason'], excludedRows));
  writeJson(outputDir, 'evidence/audit_events.json', { notice: NOTICE, generated_at: GENERATED_AT, engine: 'audit-engine.js', events: auditEvents.map((event) => ({ event_id: event.eventId, project_id: event.projectId, record_id: event.recordId, event_type: event.eventType, source_file: event.sourceFile, source_database: event.sourceDatabase, timestamp: event.timestamp, after: event.after })) });
  writeJson(outputDir, 'evidence/prisma_counts.json', { notice: NOTICE, generated_at: GENERATED_AT, engine: 'audit-engine.js buildPrismaCountsJson', output: context.prismaCountsExport, derived: { pending_full_text_review: pendingFullTextReview } });
  writeText(outputDir, 'evidence/prisma_flow.svg', makePrismaSvg(context.counts, pendingFullTextReview));
  writeJson(outputDir, 'evidence/dual_review_agreement.json', { notice: NOTICE, generated_at: GENERATED_AT, engine: 'dual-review-engine.js serializeDualReviewAgreementJson', output: dualReviewAgreement, scope_note: '当前公开 Demo 数据未包含 reviewer A/B 双审决策，因此 paired decisions 为 0。export gate 的 clear 只表示当前没有记录到未解决冲突，不代表已经完成双审。' });
  writeText(outputDir, 'evidence/dual_review_conflicts.csv', `# ${NOTICE}\n# 当前公开 Demo 数据未包含 reviewer A/B 双审决策，因此该文件只有表头。export gate clear 不代表双审完成。\n${dualReviewConflictsCsv.trimEnd()}`);
  writeJson(outputDir, 'evidence/quality_appraisal_status.json', { notice: NOTICE, generated_at: GENERATED_AT, status: '当前公开 Demo 未生成质量评价、evidence table 或 GRADE summary。', total_assessments: 0, completed_assessments: 0, evidence_table_ready_rows: 0, grade_summary_ready_rows: 0 });
}

function writeMarkdownOutputs(outputDir, context) {
  const { records, sourceDistribution, sourceRows, sourceQuality, warningByTypeRows, dedup, hardDuplicateRows, candidateRows, counts, pendingFullTextReview, dualReviewAgreement, defensePack } = context;
  writeText(outputDir, '00_README.md', md('Public Demo V2.1.1 交付包说明', [
    '本目录是一套可重复生成的公开模拟 Demo 交付包。它只使用仓库内公开 demo、模板、测试与本地引擎资产，不含真实客户数据。',
    '',
    '## 生成方式',
    '',
    '`node scripts/generate-public-demo-delivery.mjs <output-directory>`',
    '',
    '生成脚本会先运行 preflight 测试，拒绝不安全输出路径，使用 staging 目录生成并校验后再发布到最终目录。',
    '',
    '## 阅读顺序',
    '',
    '1. `00_INPUT_MANIFEST.md`：核对输入文件、大小、SHA256 和记录数。',
    '2. `03_DEDUP_REVIEW.md`：查看真实 DedupEngine 输出的硬重复和候选重复。',
    '3. `04_PRISMA_COUNTS.md`：查看 PRISMA counts 及其来源。',
    '4. `06_DEFENSE_AUDIT_PACK.md`：查看包装后的答辩审计包和双审零数据边界。',
    '5. `GENERATION_RECORD.json` 和 `evidence/generation_sources.json`：复核生成命令、测试结果、源文件和哈希。',
  ].join('\n')));
  writeText(outputDir, '00_INPUT_MANIFEST.md', md('输入 Manifest', [table(['字段', '值'], [['input_id', 'demo-input-001'], ['文件别名', 'public-demo-sample-data'], ['来源', SAMPLE_REL], ['数据性质', '公开模拟数据'], ['文件大小', `${context.sampleSize} bytes`], ['SHA256', context.sampleHash], ['实际记录数', records.length], ['来源数据库', Object.keys(sourceDistribution).sort().join(', ')], ['使用范围', '仅用于样例交付结构展示和内部验收']]), '', '## 来源分布', '', table(['来源数据库', '记录数'], sourceRows.map((row) => [row.source_database, row.records]))].join('\n')));
  writeText(outputDir, '01_PROJECT_HEALTH_CHECK.md', md('项目体检摘要', ['## 结论', '', `- 公开 Demo 输入共 ${records.length} 条记录，覆盖 ${Object.keys(sourceDistribution).length} 个来源数据库。`, `- 去重引擎移除硬重复 ${dedup.stats.hardDuplicateCount} 条，保留 ${dedup.stats.retainedRecords} 条进入标题/摘要规则筛选。`, `- 当前去重引擎生成候选重复 ${dedup.stats.candidateDuplicateCount} 组；候选重复必须人工确认，不能自动删除。`, `- 来源质量提示涉及 ${sourceQuality.summary.warningRecordCount} 条记录，覆盖摘要噪音、疑似截断和来源字段不完整。`, '- 当前公开 Demo 仅生成标题/摘要规则筛选；全文复核、质量评价和最终纳入数未生成。'].join('\n')));
  writeText(outputDir, '02_IMPORT_QUALITY_SUMMARY.md', md('导入质量摘要', ['## 汇总', '', table(['指标', '数值', '来源'], [['输入记录数', records.length, 'sample-data.json data 数组'], ['来源数据库数', Object.keys(sourceDistribution).length, 'database 字段分组'], ['带来源质量提示的记录数', sourceQuality.summary.warningRecordCount, '生成脚本 sourceQualityFlags'], ['摘要噪音提示', sourceQuality.summary.abstractNoiseCount, 'abstract 中包含元数据噪音'], ['摘要疑似截断', sourceQuality.summary.abstractTruncationCount, 'abstract 中包含余略'], ['来源映射不完整', sourceQuality.summary.sourceMappingIncompleteCount, 'VIP 缺摘要或 SinoMed 缺 journal']]), '', '## 来源分布', '', table(['来源数据库', '记录数'], sourceRows.map((row) => [row.source_database, row.records])), '', '## 中文源可靠性提示', '', table(['提示类型', '数量'], warningByTypeRows)].join('\n')));
  writeText(outputDir, '03_DEDUP_REVIEW.md', md('去重复核摘要', ['## 去重结果', '', table(['指标', '数值', '来源'], [['输入记录数', dedup.stats.inputRecords, 'DedupEngine.run'], ['保留记录数', dedup.stats.retainedRecords, 'DedupEngine.run'], ['硬重复数', dedup.stats.hardDuplicateCount, 'DedupEngine.run'], ['候选重复数', dedup.stats.candidateDuplicateCount, 'DedupEngine.run']]), '', '## 硬重复', '', table(['保留记录', '重复记录', '原因'], hardDuplicateRows.map((row) => [row.kept_record_id, row.duplicate_record_id, row.reason_code])), '', '## 候选重复', '', table(['左记录', '右记录', '原因'], candidateRows.map((row) => [row.left_record_id, row.right_record_id, row.reason_code])), '', '候选重复由当前 DedupEngine 实际识别，必须人工确认，不能自动删除。'].join('\n')));
  writeText(outputDir, '04_PRISMA_COUNTS.md', md('PRISMA Counts', ['## 工具生成计数', '', table(['指标', '数值', '来源'], Object.entries(counts).map(([key, value]) => [key, value, 'AuditEngine.buildPrismaCountsJson'])), '', '## 衍生解释', '', table(['指标', '数值', '说明'], [['pendingFullTextReview', pendingFullTextReview, '标题/摘要纳入数减去全文评估数；当前公开 Demo 未生成全文复核。'], ['titleAbstractScreened', counts.titleAbstractIncluded + counts.titleAbstractExcluded + counts.titleAbstractUncertain, '由标题/摘要 include、exclude、uncertain 相加。']])].join('\n')));
  writeText(outputDir, '05_DUAL_REVIEW_SUMMARY.md', md('双审摘要', ['## 当前状态', '', '当前公开 Demo 数据没有 reviewer A/B 双审决策、resolver 结论或质量评价 reviewer 分歧，因此双审部分只能作为结构示例。当前 paired decisions 为 0。', '', table(['指标', '数值', '来源'], [['paired decisions', dualReviewAgreement.screening.metrics.pairCount, 'DualReviewEngine.serializeDualReviewAgreementJson'], ['disagreement pairs', dualReviewAgreement.screening.metrics.disagreementPairCount, 'DualReviewEngine.serializeDualReviewAgreementJson'], ['pending disagreements', dualReviewAgreement.screening.metrics.pendingDisagreementCount, 'DualReviewEngine.serializeDualReviewAgreementJson'], ['unresolved conflicts', dualReviewAgreement.exportGate.unresolvedConflictCount, 'DualReviewEngine.buildExportGateStatus'], ['Cohen kappa', dualReviewAgreement.screening.metrics.kappa ?? 0, 'DualReviewEngine.calculateAgreementMetrics']]), '', 'export gate 的 clear 只表示当前没有记录到未解决冲突，不代表已经完成双审。真实项目必须重新生成 reviewer A/B、resolver、agreement 和 conflict queue。'].join('\n')));
  writeText(outputDir, '06_DEFENSE_AUDIT_PACK.md', `${NOTICE}\n\n${defensePack.replace('目标文件：`DEFENSE_AUDIT_PACK.md`', '目标文件：`06_DEFENSE_AUDIT_PACK.md`')}\n## 双审零数据边界\n\n当前 paired decisions 为 0，当前没有 reviewer A/B 双审数据。export gate 的 clear 只表示当前没有记录到未解决冲突，不代表已经完成双审。真实项目必须重新生成 reviewer A/B、resolver、agreement 和 conflict queue。`);
  writeText(outputDir, '07_METHODS_APPENDIX_DRAFT.md', md('方法附录草稿', ['## Screening workflow narrative', '', 'Records were imported from CNKI, Wanfang, VIP, SinoMed, and PubMed using the public demo dataset. The project used local-first PRISMA Workbench evidence builders to preserve provenance, deduplication events, rule screening decisions, PRISMA counts, and source-quality warnings.', '', '## PRISMA counts', '', `- Identified from databases: ${counts.recordsImported}`, '- Identified from other sources: 0', `- Removed as duplicates: ${counts.duplicatesRemoved}`, `- Screened by title / abstract: ${counts.titleAbstractIncluded + counts.titleAbstractExcluded + counts.titleAbstractUncertain}`, `- Excluded by title / abstract: ${counts.titleAbstractExcluded}`, `- Full text assessed: ${counts.fullTextAssessed}`, `- Included studies: ${counts.studiesIncluded}`].join('\n')));
  writeText(outputDir, '08_HANDOFF_NOTES.md', md('交接说明', ['## 需要人工确认', '', '- 候选重复必须人工确认，不能自动删除。', '- 当前公开 Demo 未生成全文复核，因此标题/摘要纳入的记录仍处于 pending full-text review 状态。', '- 当前公开 Demo 未生成双审、质量评价或 GRADE summary。'].join('\n')));
  writeText(outputDir, '10_LIMITATIONS.md', md('限制说明', ['- 本样例使用公开模拟数据，不是客户案例。', '- 本样例只展示交付结构和部分本地工具输出，不证明真实项目可以按同样耗时、同样质量或同样成本完成。', '- 当前公开 Demo 未生成 reviewer A/B 双审决策、resolver 结论、质量评价、evidence table、GRADE summary 或 AI 建议。', '- PRISMA counts 中全文复核和最终纳入相关数字为当前公开 Demo 的未生成状态，不代表真实项目最终结果。'].join('\n')));
  writeText(outputDir, '11_CUSTOMER_ACCEPTANCE.md', md('客户验收字段示例', ['本文件只展示真实项目中应记录的验收字段。当前公开 Demo 没有客户签收、付款、返工或删除证据。', '', table(['字段', '当前样例值'], [['validation_id', '结构示例，真实项目填写'], ['intake_id', '结构示例，真实项目填写'], ['交付日期', '结构示例，真实项目填写'], ['客户验收状态', '当前公开 Demo 不适用'], ['删除完成状态', '当前公开 Demo 不适用']])].join('\n')));
  writeText(outputDir, 'evidence/README.md', md('Evidence 说明', ['## 来源类型', '', table(['类别', '说明'], [['engine_output_wrapped', '使用真实引擎 serializer 或 builder，但增加了免责声明、外层结构或包装。'], ['generator_derived', '生成脚本根据公开输入或引擎结果汇总、转换、创建事件或组织字段。'], ['human_authored_template', '人工说明、方法附录模板和交接内容。'], ['structure_example', '当前 Demo 没有真实双审、质量评价或客户验收，只展示字段结构。']])].join('\n')));
}

function walkFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const abs = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(abs));
    if (entry.isFile()) files.push(abs);
  }
  return files;
}

function buildManifestRows(outputDir) {
  return walkFiles(outputDir)
    .map((abs) => relPath(abs, outputDir))
    .filter((rel) => rel !== OUTPUT_MANIFEST_REL && rel !== GENERATION_RECORD_REL)
    .sort()
    .map((rel) => {
      const abs = path.join(outputDir, rel);
      const classification = classifyOutput(rel);
      return { file_name: rel, source_type: classification.sourceType, engine_api: classification.engineApi, file_size_bytes: fileSize(abs), sha256: fileHash(abs), contains_simulated_data: '是', regenerate_for_real_project: '是', customer_confirmation_needed: customerConfirmation(rel) };
    });
}

function writeManifest(outputDir, rows) {
  writeText(outputDir, OUTPUT_MANIFEST_REL, md('输出 Manifest', ['Manifest 自身不在下表记录 SHA256，以避免循环依赖。`GENERATION_RECORD.json` 记录 Manifest SHA256；Manifest 不记录 `GENERATION_RECORD.json` 的最终 SHA256，采用非循环的两阶段记录方案。', '', table(['文件名', '来源类型', 'engine_api', '文件大小', 'SHA256', '含模拟数据', '真实项目需重新生成', '客户需要确认的内容'], rows.map((row) => [row.file_name, row.source_type, row.engine_api, row.file_size_bytes, row.sha256, row.contains_simulated_data, row.regenerate_for_real_project, row.customer_confirmation_needed]))].join('\n')));
}

function validateManifest(outputDir) {
  const manifestText = fs.readFileSync(path.join(outputDir, OUTPUT_MANIFEST_REL), 'utf8');
  const rows = manifestText.split(/\r?\n/).filter((line) => line.startsWith('| ') && !line.includes('文件名') && !line.includes('---'));
  for (const line of rows) {
    const parts = line.split('|').slice(1, -1).map((part) => part.trim());
    const [rel, , , sizeText, hash] = parts;
    const abs = path.join(outputDir, rel);
    if (!fs.existsSync(abs)) throw new Error(`Manifest references missing file: ${rel}`);
    if (fileSize(abs) !== Number(sizeText)) throw new Error(`Manifest size mismatch: ${rel}`);
    if (fileHash(abs) !== hash) throw new Error(`Manifest hash mismatch: ${rel}`);
  }
}

function validateStagingOutput(outputDir) {
  validateManifest(outputDir);
  const files = walkFiles(outputDir).filter((file) => ['.md', '.json', '.csv', '.svg', '.txt'].includes(path.extname(file)));
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (/[ \t]$/m.test(text)) throw new Error(`Trailing whitespace found in ${relPath(file, outputDir)}`);
    if (/\t/.test(text)) throw new Error(`Tab character found in ${relPath(file, outputDir)}`);
    if (/<<<<<<<|=======|>>>>>>>/.test(text)) throw new Error(`Conflict marker found in ${relPath(file, outputDir)}`);
    const pathLeaks = findLocalAbsolutePathLeaks(text);
    if (pathLeaks.length > 0) throw new Error(`Absolute path leakage found in ${relPath(file, outputDir)}: ${pathLeaks[0].match}`);
    if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text)) throw new Error(`Email-like pattern found in ${relPath(file, outputDir)}`);
    if (/官方认证|保证发表|100%|零误差|全自动|一键完成|已验证商业效果/.test(text)) throw new Error(`High-risk phrase found in ${relPath(file, outputDir)}`);
  }
  const sources = JSON.parse(fs.readFileSync(path.join(outputDir, 'evidence/generation_sources.json'), 'utf8')).sources;
  for (const source of sources) {
    const abs = path.join(checkoutRoot, source.relative_path);
    if (fileSize(abs) !== source.size || fileHash(abs) !== source.sha256) throw new Error(`generation_sources mismatch: ${source.relative_path}`);
  }
}

function buildContext() {
  const sampleBytes = fileBytes(path.join(checkoutRoot, SAMPLE_REL));
  const sample = JSON.parse(sampleBytes.toString('utf8'));
  const records = (sample.data || []).map(normalizeRecord);
  const sourceDistribution = countBy(records, (record) => record.database);
  const sourceRows = Object.keys(sourceDistribution).sort().map((source) => ({ source_database: source, records: sourceDistribution[source] }));
  const sourceQuality = sourceQualitySummary(records);
  const warningByTypeRows = Object.keys(sourceQuality.summary.byWarningType).sort().map((key) => [key, sourceQuality.summary.byWarningType[key]]);
  const dedup = DedupEngine.run(records, { mode: DEMO_VERSION });
  const retainedRecords = dedup.retainedRecords;
  const screeningDecisions = retainedRecords.map((record, index) => {
    const result = screeningDecisionFor(record);
    return AuditEngine.createScreeningDecision({ decisionId: `ta-${String(index + 1).padStart(3, '0')}`, projectId: DEMO_VERSION, recordId: record.record_id || record.id, sourceFile: SAMPLE_REL, sourceDatabase: record.database, stage: 'title_abstract', decision: result.decision, exclusionReason: result.reason, reviewerId: 'system_rule', source: 'rule', updatedAt: GENERATED_AT, notes: 'Deterministic public demo rule from docs/demo/README.md' });
  });
  const hardDuplicateRows = dedup.hardDuplicates.map((entry, index) => ({ duplicate_id: `hard-duplicate-${String(index + 1).padStart(3, '0')}`, kept_record_id: entry.keptRecord.record_id || entry.keptRecord.id || entry.keptRecord._engine_record_id, duplicate_record_id: entry.duplicateRecord.record_id || entry.duplicateRecord.id || entry.duplicateRecord._engine_record_id, kept_title: entry.keptRecord.title, duplicate_title: entry.duplicateRecord.title, reason_code: entry.reason.code, evidence: JSON.stringify(entry.reason.evidence) }));
  const candidateRows = dedup.candidateDuplicates.map((entry, index) => ({ candidate_id: `candidate-duplicate-${String(index + 1).padStart(3, '0')}`, left_record_id: entry.leftRecord.record_id || entry.leftRecord.id || entry.leftRecord._engine_record_id, right_record_id: entry.rightRecord.record_id || entry.rightRecord.id || entry.rightRecord._engine_record_id, left_title: entry.leftRecord.title, right_title: entry.rightRecord.title, reason_code: entry.reason.code, evidence: JSON.stringify(entry.reason.evidence) }));
  const auditEvents = [
    ...records.map((record) => AuditEngine.createAuditEvent({ eventId: `import-${record.record_id}`, projectId: DEMO_VERSION, timestamp: GENERATED_AT, eventType: 'record_imported', recordId: record.record_id, sourceFile: SAMPLE_REL, sourceDatabase: record.database, payload: { title: record.title, database: record.database } })),
    ...dedup.hardDuplicates.map((entry, index) => AuditEngine.createAuditEvent({ eventId: `dedup-hard-${String(index + 1).padStart(3, '0')}`, projectId: DEMO_VERSION, timestamp: GENERATED_AT, eventType: 'hard_duplicate_removed', recordId: entry.duplicateRecord.record_id || entry.duplicateRecord.id || entry.duplicateRecord._engine_record_id, sourceFile: SAMPLE_REL, sourceDatabase: entry.duplicateRecord.database, after: { keptRecordId: entry.keptRecord.record_id || entry.keptRecord.id || entry.keptRecord._engine_record_id, reason: entry.reason } })),
    ...dedup.candidateDuplicates.map((entry, index) => AuditEngine.createAuditEvent({ eventId: `dedup-candidate-${String(index + 1).padStart(3, '0')}`, projectId: DEMO_VERSION, timestamp: GENERATED_AT, eventType: 'candidate_duplicate_flagged', recordId: entry.leftRecord.record_id || entry.leftRecord.id || entry.leftRecord._engine_record_id, sourceFile: SAMPLE_REL, sourceDatabase: entry.leftRecord.database, after: { leftRecordId: entry.leftRecord.record_id || entry.leftRecord.id || entry.leftRecord._engine_record_id, rightRecordId: entry.rightRecord.record_id || entry.rightRecord.id || entry.rightRecord._engine_record_id, reason: entry.reason } })),
    ...sourceQuality.warningRecords.map((entry, index) => AuditEngine.createAuditEvent({ eventId: `source-warning-${String(index + 1).padStart(3, '0')}`, projectId: DEMO_VERSION, timestamp: GENERATED_AT, eventType: 'source_quality_warning', recordId: entry.record.record_id, sourceFile: SAMPLE_REL, sourceDatabase: entry.record.database, after: { flags: entry.flags } })),
  ];
  const prismaCountsExport = AuditEngine.buildPrismaCountsJson(screeningDecisions, auditEvents);
  prismaCountsExport.generatedAt = GENERATED_AT;
  const counts = prismaCountsExport.counts;
  const pendingFullTextReview = counts.titleAbstractIncluded - counts.fullTextAssessed;
  const dualReviewAgreement = JSON.parse(DualReviewEngine.serializeDualReviewAgreementJson({ generatedAt: GENERATED_AT, screeningDecisions: [], records: retainedRecords, qualityAssessments: [] }));
  const dualReviewConflictsCsv = DualReviewEngine.serializeDualReviewConflictsCsv({ screeningConflicts: [], qualityConflicts: [] });
  const exportGate = DualReviewEngine.buildExportGateStatus({ screeningConflicts: [], qualityConflicts: [] });
  const defensePack = AuditEngine.buildDefenseReadyAuditPackMarkdown({ projectId: DEMO_VERSION, projectName: 'PRISMA Workbench Public Demo V2.1.1', aiMode: 'off', appVersion: 'v2.1.1-public-demo', prismaVersion: 'PRISMA_2020', exportGeneratedAt: GENERATED_AT, createdAt: GENERATED_AT, updatedAt: GENERATED_AT }, auditEvents, screeningDecisions, { language: 'zh', sourceReliabilitySummary: sourceQuality.summary, dualReviewSummary: { agreementMetrics: { pairCount: 0, percentAgreement: 0, kappa: 0 }, exportGate }, qualitySummary: { totalAssessments: 0, completedAssessments: 0, inProgressAssessments: 0, missingAssessments: pendingFullTextReview, evidenceTableReadyCount: 0, gradeSummaryReadyCount: 0 }, aiSuggestionEvents: [] });
  const warningRows = sourceQuality.warningRecords.map((entry) => ({ record_id: entry.record.record_id, source_database: entry.record.database, title: entry.record.title, warning_flags: entry.flags.join(';') }));
  const includedRows = retainedRecords.filter((record) => screeningDecisionFor(record).decision === 'include').map((record) => ({ record_id: record.record_id, title: record.title, year: record.year, source_database: record.database, decision: 'include' }));
  const excludedRows = retainedRecords.filter((record) => screeningDecisionFor(record).decision === 'exclude').map((record) => ({ record_id: record.record_id, title: record.title, year: record.year, source_database: record.database, decision: 'exclude', exclusion_reason: screeningDecisionFor(record).reason }));
  return { records, sampleSize: sampleBytes.length, sampleHash: sha256Buffer(sampleBytes), sourceDistribution, sourceRows, sourceQuality, warningByTypeRows, dedup, retainedRecords, screeningDecisions, auditEvents, hardDuplicateRows, candidateRows, prismaCountsExport, counts, pendingFullTextReview, dualReviewAgreement, dualReviewConflictsCsv, defensePack, warningRows, includedRows, excludedRows };
}

function writeGenerationSources(outputDir) {
  writeJson(outputDir, 'evidence/generation_sources.json', { notice: NOTICE, schema_version: 'public-demo-generation-sources.v1', demo_version: DEMO_VERSION, generated_at: GENERATED_AT, sources: SOURCE_FILES.map(sourceMetadata) });
}

function sourceClassificationSchema() {
  return {
    engine_output_wrapped: 'Uses a real engine serializer or builder, with demo notice, wrapper object, or boundary text added by the generator.',
    generator_derived: 'Created, summarized, converted, or organized by the generator from public inputs or engine results.',
    human_authored_template: 'Human-readable explanatory template or handoff prose emitted by the generator.',
    structure_example: 'Structure-only output because the public demo has no real data for that section.',
  };
}

function writeGenerationRecord(outputDir, context, testStatus, manifestSha256, outputFileCount) {
  writeJson(outputDir, GENERATION_RECORD_REL, { notice: NOTICE, schema_version: 'public-demo-generation-record.v1', demo_version: DEMO_VERSION, generated_at: GENERATED_AT, generation_command: `node ${GENERATOR_REL} <output-directory>`, node_version: process.version, repository_head: runGit(['rev-parse', 'HEAD']), repository_dirty: repositoryDirty(), generator_relative_path: GENERATOR_REL, generator_sha256: fileHash(path.join(checkoutRoot, GENERATOR_REL)), input_relative_path: SAMPLE_REL, input_size: context.sampleSize, input_sha256: context.sampleHash, input_record_count: context.records.length, source_distribution: context.sourceDistribution, dedup_engine_stats: context.dedup.stats, prisma_counts: context.counts, test_status: testStatus, output_file_count: outputFileCount, manifest_sha256: manifestSha256, staging_and_publish_strategy: 'Preflight tests run before any output directory is created. Files are written to a sibling staging directory with a script-owned random prefix, validated there, then published with a single fs.renameSync call. On failure, only that owned staging directory is removed.', source_classification_schema: sourceClassificationSchema(), non_circular_recording_scheme: '09_OUTPUT_MANIFEST.md excludes itself and GENERATION_RECORD.json. GENERATION_RECORD.json records the manifest SHA256 after manifest validation.' });
}

function generateInto(stagingDir, testStatus) {
  const context = buildContext();
  writeCoreOutputs(stagingDir, context);
  writeMarkdownOutputs(stagingDir, context);
  writeGenerationSources(stagingDir);
  writeManifest(stagingDir, buildManifestRows(stagingDir));
  validateStagingOutput(stagingDir);
  const manifestSha256 = fileHash(path.join(stagingDir, OUTPUT_MANIFEST_REL));
  writeGenerationRecord(stagingDir, context, testStatus, manifestSha256, walkFiles(stagingDir).length + 1);
  validateStagingOutput(stagingDir);
  return { context, manifestSha256 };
}

function main() {
  const outputArg = process.argv[2];
  let outputDir;
  try {
    outputDir = validateOutputArgument(outputArg);
  } catch (error) {
    usage();
    throw error;
  }
  const testStatus = runPreflightTests();
  const stagingDir = createStagingDir(outputDir);
  try {
    const { context } = generateInto(stagingDir, testStatus);
    publishStaging(stagingDir, outputDir);
    const result = { output_directory: '<output-directory>', demo_version: DEMO_VERSION, input_record_count: context.records.length, source_distribution: context.sourceDistribution, dedup_engine_stats: context.dedup.stats, prisma_counts: context.counts, manifest_sha256: fileHash(path.join(outputDir, OUTPUT_MANIFEST_REL)), output_file_count: walkFiles(outputDir).length };
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    safeCleanupStaging(stagingDir, outputDir);
    throw error;
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
