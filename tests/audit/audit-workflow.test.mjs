import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

async function readV22App() {
  return fs.readFile(path.join(repoRoot, 'literature-screening-v2.2/app.js'), 'utf8');
}

async function readV22File(filename) {
  const canonicalPublicPaths = {
    'index.html': 'index.html',
    'workspace.html': 'app/index.html',
    'landing.html': 'index.html',
    'login.html': 'dual-review/index.html',
    'resources.html': 'resources/index.html',
  };
  if (canonicalPublicPaths[filename]) {
    return fs.readFile(path.join(repoRoot, canonicalPublicPaths[filename]), 'utf8');
  }
  return fs.readFile(path.join(repoRoot, 'literature-screening-v2.2', filename), 'utf8');
}

test('v2.2 app persists audit state in project snapshots', async () => {
  const source = await readV22App();

  assert.match(source, /let projectManifest = null;/);
  assert.match(source, /let auditEvents = \[\];/);
  assert.match(source, /let screeningDecisions = \[\];/);
  assert.match(source, /let aiSuggestionEvents = \[\];/);
  assert.match(source, /let dualReviewConflictState =/);
  assert.match(source, /function appendAuditEventsSafe/);
  assert.match(source, /function upsertScreeningDecisionSafe/);
  assert.match(source, /function appendAiSuggestionEventsSafe/);
  assert.match(source, /function upsertAiUsageRegistrySafe/);
  assert.match(source, /projectManifest: ensureProjectManifest\(\)/);
  assert.match(source, /auditEvents,/);
  assert.match(source, /screeningDecisions/);
  assert.match(source, /aiSuggestionEvents/);
  assert.match(source, /dualReviewResults/);
  assert.match(source, /dualReviewConflictState/);
});

test('v2.2 app records audit events across the review workflow', async () => {
  const source = await readV22App();
  const requiredEventTypes = [
    'record_imported',
    'hard_duplicate_removed',
    'candidate_duplicate_flagged',
    'rule_screening_decision',
    'manual_screening_decision',
    'quality_appraisal_started',
    'quality_appraisal_updated',
    'ai_mode_updated',
    'ai_suggestion_generated',
  ];

  requiredEventTypes.forEach((eventType) => {
    assert.match(source, new RegExp(`eventType: '${eventType}'`));
  });
  assert.match(source, /: 'export_generated'/);
  assert.match(source, /quality_export_generated/);
});

test('v2.2 app wires V2.4 quality and evidence exports without changing AI provider defaults', async () => {
  const source = await readV22App();

  assert.match(source, /function buildQualityAppraisalExportContent/);
  assert.match(source, /serializeQualityAppraisalCsv/);
  assert.match(source, /case 'quality_appraisal':/);
  assert.match(source, /filename = 'quality_appraisal\.csv'/);
  assert.match(source, /function buildEvidenceTableExportContent/);
  assert.match(source, /serializeEvidenceTableCsv/);
  assert.match(source, /case 'evidence_table':/);
  assert.match(source, /filename = 'evidence_table\.csv'/);
  assert.match(source, /evidence_table_export_generated/);
  assert.match(source, /function buildGradeSummaryExportContent/);
  assert.match(source, /serializeGradeSummaryCsv/);
  assert.match(source, /case 'grade_summary':/);
  assert.match(source, /filename = 'grade_summary\.csv'/);
  assert.match(source, /grade_summary_export_generated/);
  assert.match(source, /qualityAssessmentCount: qualityAssessments\.length/);
  assert.doesNotMatch(source, /apiKey\s*:/i);
  assert.doesNotMatch(source, /fetch\([^)]*openai/i);
});

test('v2.2 app supports reviewer-editable item-level quality forms with audit trace', async () => {
  const source = await readV22App();
  const styleCss = await readV22File('style.css');

  assert.match(source, /function saveQualityAssessmentEdits\(recordId\)/);
  assert.match(source, /function cloneQualityAssessmentForAudit/);
  assert.match(source, /data-quality-record-id=/);
  assert.match(source, /saveQualityAssessmentEdits\(this\.dataset\.qualityRecordId\)/);
  assert.match(source, /getQualityDomainInputId\(recordId, domainId, 'judgement'\)/);
  assert.match(source, /supporting_quote: readQualityInputValue/);
  assert.match(source, /reviewer_note: readQualityInputValue/);
  assert.match(source, /reviewer_assessments/);
  assert.match(source, /reviewer_id: reviewerId/);
  assert.match(source, /overall_judgement: readQualityInputValue/);
  assert.match(source, /eventType: 'quality_appraisal_updated'/);
  assert.match(source, /before,/);
  assert.match(source, /after,/);
  assert.match(source, /source: 'human'/);
  assert.match(source, /editor: 'item_level_quality_form'/);
  assert.match(source, /reviewer_assessments: preserveQualityReviewerAssessments/);
  assert.match(source, /reviewer_assessments: \{/);
  assert.match(source, /填写领域判断与引用证据/);
  assert.match(source, /支持性原文 \/ 页码/);
  assert.match(source, /审稿备注/);
  assert.match(source, /保存质量评价/);
  assert.match(source, /质量评价已保存，导出的质量表会使用这些人工填写内容。/);
  assert.match(styleCss, /\.quality-editor-panel/);
  assert.match(styleCss, /\.quality-domain-row/);
  assert.match(styleCss, /\.quality-editor-actions/);
});

test('workspace language visibility has CSS fallback for local file mode', async () => {
  const [styleCss, workspaceHtml, indexHtml] = await Promise.all([
    readV22File('style.css'),
    readV22File('workspace.html'),
    readV22File('index.html'),
  ]);

  assert.match(styleCss, /html\[lang="zh"\]\s+\.en/);
  assert.match(styleCss, /html\[data-lang="zh"\]\s+\.en/);
  assert.match(styleCss, /html\[lang="en"\]\s+\.zh/);
  assert.match(styleCss, /html\[data-lang="en"\]\s+\.zh/);
  assert.match(workspaceHtml, /document\.documentElement\.dataset\.lang = document\.documentElement\.lang/);
  assert.match(workspaceHtml, /try \{ localStorage\.setItem\('prisma_lang', paramLang\); \} catch \(_\) \{\}/);
  assert.match(indexHtml, /document\.documentElement\.dataset\.lang = lang/);
  assert.match(indexHtml, /localStorage\.getItem\('prisma_lang'\)/);
});

test('public V2.5 release labels are synchronized across page shells', async () => {
  const [rootIndexHtml, indexHtml, workspaceHtml, landingHtml, appSource] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'index.html'), 'utf8'),
    readV22File('index.html'),
    readV22File('workspace.html'),
    readV22File('landing.html'),
    readV22App(),
  ]);

  assert.match(rootIndexHtml, /V2\.5 dual-review closeout/i);
  assert.match(rootIndexHtml, /开始一个项目|Start a project/i);
  assert.match(rootIndexHtml, /双人复核|Dual review/i);
  assert.match(indexHtml, /PRISMA Workbench v2\.5/);
  assert.match(indexHtml, /V2\.5 dual-review closeout/i);
  assert.match(workspaceHtml, /PRISMA Literature Screening v2\.5/);
  assert.match(workspaceHtml, /Traceability-oriented workspace v2\.5/);
  assert.match(workspaceHtml, /PRISMA Workbench v2\.5 工作台/);
  assert.match(workspaceHtml, /PRISMA Workbench v2\.5 local-first workspace designed for traceability/);
  assert.equal(landingHtml, indexHtml);
  assert.match(appSource, /const APP_RELEASE_VERSION = '2\.5-dual-review-release';/);
  assert.match(appSource, /version: APP_RELEASE_VERSION/);
});

test('official homepage explains product paths without workspace overload', async () => {
  const indexHtml = await readV22File('index.html');

  assert.match(indexHtml, /Who it is for|适合谁|使用场景/i);
  assert.match(indexHtml, /What it helps organize|它帮你整理什么/i);
  assert.match(indexHtml, /Local save|本地保存/i);
  assert.match(indexHtml, /可追溯导出|Traceable exports/i);
  assert.match(indexHtml, /Start a project|开始一个项目/i);
  assert.match(indexHtml, /Dual review|双人复核/i);
  assert.match(indexHtml, /Resources|资源中心/);
  assert.doesNotMatch(indexHtml, /\bV3(?:\.0)?\b/i);
  assert.doesNotMatch(indexHtml, /audit-ready/i);
  assert.doesNotMatch(indexHtml, /href="sample-data\.json"/);
  assert.doesNotMatch(indexHtml, /href="\.\.\/docs\/benchmarks\/README\.md"/);
  assert.doesNotMatch(indexHtml, /href="\.\.\/docs\/papers\/README\.md"/);
});

test('workspace offers onboarding paths for new users', async () => {
  const workspaceHtml = await readV22File('workspace.html');
  const source = await readV22App();

  assert.match(workspaceHtml, /onboarding-wizard|workspace-onboarding|选择你的使用路径/);
  assert.match(workspaceHtml, /我是新手|try demo data|public demo dataset/i);
  assert.match(workspaceHtml, /真实数据库导出|database export/i);
  assert.match(workspaceHtml, /双人复核|dual review/i);
  assert.match(workspaceHtml, /审计包|audit package/i);
  assert.match(workspaceHtml, /质量评价|quality appraisal/i);
  assert.match(source, /function selectOnboardingPath\(/);
});

test('resources hub exposes review starter kits', async () => {
  const resourcesHtml = await readV22File('resources.html');
  const templatesReadme = await fs.readFile(path.join(repoRoot, 'docs/templates/README.md'), 'utf8');

  assert.match(resourcesHtml, /Review Starter Kits|模板包|Workflow Kits/);
  assert.match(resourcesHtml, /docs\/templates\/README\.md/);
  assert.match(templatesReadme, /screening criteria/i);
  assert.match(templatesReadme, /database export/i);
  assert.match(templatesReadme, /dual-review SOP/i);
  assert.match(templatesReadme, /audit appendix/i);
});

test('search strategy assistant is documented as strategy generation not database crawling', async () => {
  const design = await fs.readFile(path.join(repoRoot, 'docs/design/SEARCH_STRATEGY_ASSISTANT.md'), 'utf8');

  assert.match(design, /search strategy/i);
  assert.match(design, /PubMed/);
  assert.match(design, /CNKI|Wanfang|VIP|SinoMed/);
  assert.match(design, /does not fetch|不抓取|不自动检索/i);
  assert.match(design, /trace|可追溯/i);
});

test('official website iteration brief captures current state and next design direction', async () => {
  const brief = await fs.readFile(path.join(repoRoot, 'docs/design/OFFICIAL_WEBSITE_UI_ITERATION_BRIEF.md'), 'utf8');

  assert.match(brief, /V2\.5 dual-review closeout/);
  assert.match(brief, /static-first|local-first/i);
  assert.match(brief, /资源中心|Resources hub/);
  assert.match(brief, /AI 时代|AI-era/i);
  assert.match(brief, /不要新增后端同步|no backend sync/i);
});

test('workspace capability sections use capability labels instead of V2.4 or V2.6 version badges', async () => {
  const [indexHtml, workspaceHtml, landingHtml] = await Promise.all([
    readV22File('index.html'),
    readV22File('workspace.html'),
    readV22File('landing.html'),
  ]);

  assert.doesNotMatch(indexHtml, /V2\.4|V2\.6/);
  assert.doesNotMatch(landingHtml, /V2\.4|V2\.6/);
  assert.doesNotMatch(workspaceHtml, /V2\.4(?:-beta)?/);
  assert.doesNotMatch(workspaceHtml, /V2\.6/);
  assert.match(workspaceHtml, /Conservative AI Screening Queue/);
  assert.match(workspaceHtml, /Conservative AI \/ PRISMA-trAIce/);
  assert.match(workspaceHtml, /Generate Conservative AI Suggestions/);
  assert.match(workspaceHtml, /quality appraisal export: template, tool family, domain judgement/i);
  assert.match(workspaceHtml, /evidence table export: PICOS, effect measure, quality judgement/i);
  assert.match(workspaceHtml, /GRADE summary scaffold: groups studies by outcome \/ PICOS/i);
});

test('workspace upload and sample data load stay usable from file URLs', async () => {
  const [source, workspaceHtml] = await Promise.all([
    readV22App(),
    readV22File('workspace.html'),
  ]);

  assert.match(workspaceHtml, /id="uploadFilesButton" onclick="openFilePicker\(\)"/);
  assert.match(workspaceHtml, /id="uploadArea"[^>]*onclick="openFilePicker\(\)"/);
  assert.match(source, /window\.openFilePicker = openFilePicker/);
  assert.match(source, /uploadFilesButton\.removeAttribute\('onclick'\)/);
  assert.match(source, /uploadArea\.removeAttribute\('onclick'\)/);
  assert.match(source, /function getBuiltInSampleDataPayload/);
  assert.match(source, /function fetchSampleDataPayload/);
  assert.match(source, /window\.location\?\.protocol === 'file:'/);
  assert.match(source, /return getBuiltInSampleDataPayload\(\)/);
  assert.match(source, /Falling back to built-in sample data/);
  assert.match(source, /applySampleDataPayload\(payload\)/);
});

test('v2.2 app writes durable screening decisions for rule and full-text stages', async () => {
  const source = await readV22App();

  assert.match(source, /stage: 'title_abstract'/);
  assert.match(source, /stage: 'full_text'/);
  assert.match(source, /source: 'rule'/);
  assert.match(source, /source: 'human'/);
  assert.match(source, /normalizeAuditExclusionReason/);
});

test('v2.2 app wires V2.5 dual-review conflict workflow without changing local-first defaults', async () => {
  const source = await readV22App();
  const workspaceHtml = await readV22File('workspace.html');

  assert.match(workspaceHtml, /dual-review-engine\.js/);
  assert.match(source, /const DUAL_REVIEW_ENGINE/);
  assert.match(source, /function recordFulltextReviewerDecision/);
  assert.match(source, /reviewer_A/);
  assert.match(source, /reviewer_B/);
  assert.match(source, /function refreshDualReviewConflictState/);
  assert.match(source, /function getQualityReviewConflictInputs/);
  assert.match(source, /buildScreeningConflictQueue/);
  assert.match(source, /buildQualityConflictQueue/);
  assert.match(source, /createResolverScreeningDecision/);
  assert.match(source, /function showQualityConflictResolver/);
  assert.match(source, /createResolverQualityAssessment/);
  assert.match(source, /review_conflict_resolved/);
  assert.match(source, /createQualityConflictResolvedAuditEvent/);
  assert.match(source, /function upsertResolvedQualityAssessment/);
  assert.match(source, /export_conflict_blocked/);
  assert.match(source, /export_conflict_warning/);
  assert.match(source, /maybeWarnUnresolvedConflictsBeforeExport/);
  assert.match(source, /V25_FINAL_CONFLICT_GATED_EXPORT_TYPES/);
  assert.match(source, /V25_CONFLICT_EVIDENCE_EXPORT_TYPES/);
  assert.match(source, /preserveQualityReviewerAssessments/);
  assert.match(source, /__uncertain__/);
  assert.doesNotMatch(source, /fetch\([^)]*openai/i);
});

test('workspace exposes local-first reviewer bundle workflow entry points', async () => {
  const source = await readV22App();
  const workspaceHtml = await readV22File('workspace.html');

  assert.match(workspaceHtml, /collaboration seed/i);
  assert.match(workspaceHtml, /reviewer decision bundle/i);
  assert.match(workspaceHtml, /exportCollaborationSeedPackage/);
  assert.match(workspaceHtml, /exportReviewerDecisionBundle/);
  assert.match(workspaceHtml, /importReviewerDecisionBundle/);
  assert.match(workspaceHtml, /reviewer-bundle-engine\.js/);
  assert.match(source, /reviewer-bundle-engine\.js/);
  assert.match(source, /const REVIEWER_BUNDLE_ENGINE/);
  assert.match(source, /function exportCollaborationSeedPackage/);
  assert.match(source, /function exportReviewerDecisionBundle/);
  assert.match(source, /function importReviewerDecisionBundle/);
  assert.match(source, /function applyReviewerDecisionBundle/);
  assert.match(source, /refreshDualReviewConflictState\(\)/);
  assert.doesNotMatch(source, /fetch\([^)]*reviewer/i);
  assert.doesNotMatch(source, /billing|payment|account/i);
});

test('workspace exposes dual-review mode controls required by app.js', async () => {
  const [source, workspaceHtml] = await Promise.all([
    readV22App(),
    readV22File('workspace.html'),
  ]);

  ['single-mode-btn', 'dual-mode-btn', 'dual-review-setup', 'reviewer-a-btn', 'reviewer-b-btn'].forEach((id) => {
    assert.match(source, new RegExp(`getElementById\\('${id}'\\)`), `app.js expects #${id}`);
    assert.match(workspaceHtml, new RegExp(`id="${id}"`), `workspace.html should provide #${id}`);
  });

  assert.match(workspaceHtml, /onclick="setReviewMode\('single'\)"/);
  assert.match(workspaceHtml, /onclick="setReviewMode\('dual'\)"/);
  assert.match(workspaceHtml, /onclick="switchReviewer\('A'\)"/);
  assert.match(workspaceHtml, /onclick="switchReviewer\('B'\)"/);
});

test('v2.5 readiness docs describe final export blocking and browser smoke gate', async () => {
  const checklist = await fs.readFile(
    path.join(repoRoot, 'docs/checklists/V2.5_DUAL_REVIEW_READINESS_CHECKLIST.md'),
    'utf8'
  );
  const roadmap = await fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8');

  assert.match(checklist, /Final result exports are blocked/);
  assert.match(checklist, /export_conflict_blocked/);
  assert.match(checklist, /export_conflict_warning/);
  assert.match(checklist, /Browser Smoke Checklist/);
  assert.match(checklist, /dual_review_conflicts\.csv/);
  assert.match(checklist, /dual_review_agreement\.json/);
  assert.match(roadmap, /V2\.5 dual-review closeout/);
  assert.match(roadmap, /未解决冲突时阻止最终结果导出/);
});

test('public docs mark V2.5 as current and history rollback as completed', async () => {
  const [readme, readmeEn, roadmap, historyPlan] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/plans/2026-06-03-v2-5-history-rollback.md'), 'utf8'),
  ]);

  assert.match(readme, /# PRISMA 系统综述筛选与审计工作台/);
  assert.match(readme, /Version-V2\.5%20Dual%20Review/);
  assert.match(readme, /Audit%20trail-events%20%2B%20decision%20ledger/);
  assert.match(readme, /Local%20first-browser--based/);
  assert.match(readme, /## 当前公开版本线/);
  assert.match(readme, /V2\.5 dual-review closeout \| `\/app\/` \| 当前公开版本线/);
  assert.match(readme, /V2\.5\.1 project history rollback \| `\/app\/` \| 当前 patch-line 能力/);
  assert.match(readme, /当前完整回归入口：`node tests\\run-all-regressions\.js`。/);
  assert.match(readmeEn, /# PRISMA Screening & Audit Workbench/);
  assert.match(readmeEn, /Version-V2\.5%20Dual%20Review/);
  assert.match(readmeEn, /Audit%20trail-events%20%2B%20decision%20ledger/);
  assert.match(readmeEn, /Local%20first-browser--based/);
  assert.match(readmeEn, /## Current public release line/);
  assert.match(readmeEn, /V2\.5 dual-review closeout \| `\/app\/` \| Current public line/);
  assert.match(readmeEn, /V2\.5\.1 project history rollback \| `\/app\/` \| Current patch-line capability/);
  assert.match(readmeEn, /Current full regression entry: `node tests\\run-all-regressions\.js`\./);
  assert.match(roadmap, /V2\.5\.1 本地历史记录与回溯/);
  assert.match(roadmap, /project_snapshot_created/);
  assert.match(roadmap, /source_file_removed/);
  assert.match(historyPlan, /# V2\.5\.1 Project History and Rollback Implementation Plan/);
  assert.match(historyPlan, /restoreProjectState\(snapshot\)/);
  assert.match(historyPlan, /project_snapshot_restored/);
});

test('public docs describe reviewer bundles as browser-local file handoff', async () => {
  const [readme, readmeEn, roadmap] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
  ]);

  assert.match(readme, /## 双人复核边界/);
  assert.match(readme, /浏览器本地状态和文件交接/);
  assert.match(readme, /Collaboration Seed/i);
  assert.match(readme, /reviewer decision bundle/i);
  assert.match(readme, /merge import/i);
  assert.match(readme, /完整项目保存\/加载是单独的备份路径/);
  assert.match(readme, /不提供账号、在线项目查询或实时同步/);
  assert.doesNotMatch(readme, /Reviewer Bundle[\s\S]{0,400}(real-time sync|cloud collaboration|account-based collaboration|billing)/i);

  assert.match(readmeEn, /## Dual-review boundary/);
  assert.match(readmeEn, /browser-local state and file handoff/i);
  assert.match(readmeEn, /Collaboration Seed/i);
  assert.match(readmeEn, /reviewer decision bundle/i);
  assert.match(readmeEn, /merge import/i);
  assert.match(readmeEn, /Full-project save\/load remains a separate backup path/);
  assert.match(readmeEn, /does not provide accounts, online project lookup, or real-time sync/i);
  assert.doesNotMatch(readmeEn, /Reviewer Bundle[\s\S]{0,400}(real-time sync|cloud collaboration|account-based collaboration|billing)/i);

  assert.match(roadmap, /Reviewer Bundle protocol \| completed local-first handoff slice/);
  assert.match(roadmap, /collaboration seed package、reviewer decision bundle、merge import、冲突重算/);
  assert.match(roadmap, /file-based local-first collaboration/);
  assert.match(roadmap, /不是 backend sync、real-time sync 或账号协作平台/);
});

test('public docs describe defense-ready audit pack as a local evidence export slice', async () => {
  const [readme, readmeEn, roadmap] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
  ]);

  assert.match(readme, /DEFENSE_AUDIT_PACK\.md/);
  assert.match(readme, /方法附录 \/ 复核证据包/);
  assert.match(readme, /研究者核对/);
  assert.match(readmeEn, /DEFENSE_AUDIT_PACK\.md/);
  assert.match(readmeEn, /Methods appendix \/ review evidence package/);
  assert.match(readmeEn, /researcher verification/i);
  assert.doesNotMatch(`${readme}\n${readmeEn}`, /defense-ready/i);

  assert.match(roadmap, /Current status: P1 now starts with a local defense-ready audit pack export slice/);
  assert.match(roadmap, /DEFENSE_AUDIT_PACK\.md/);
  assert.match(roadmap, /not a backend or commercial execution slice/i);
  assert.doesNotMatch(roadmap, /P1[ -\u4e00-\u9fff]{0,200}(payment code|account system|billing|commercial validation execution)/i);
});

test('public docs keep one V2.5 identity while internal docs retain capability history', async () => {
  const [readme, readmeEn, roadmap, positioning] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/PRODUCT_POSITIONING_2026.md'), 'utf8'),
  ]);

  assert.match(readme, /当前公开版本线/);
  assert.match(readme, /V2\.5 dual-review closeout \| `\/app\/` \| 当前公开版本线/);
  assert.match(readme, /V2\.5\.1 project history rollback \| `\/app\/` \| 当前 patch-line 能力/);
  assert.doesNotMatch(readme, /\bV2\.6\b|\bV2\.7\b|\bV3(?:\.0)?\b/i);
  assert.doesNotMatch(readme, /\]\(\.\/docs\/plans\//);

  assert.match(readmeEn, /Current public release line/);
  assert.match(readmeEn, /V2\.5 dual-review closeout \| `\/app\/` \| Current public line/);
  assert.match(readmeEn, /V2\.5\.1 project history rollback \| `\/app\/` \| Current patch-line capability/);
  assert.doesNotMatch(readmeEn, /\bV2\.6\b|\bV2\.7\b|\bV3(?:\.0)?\b/i);
  assert.doesNotMatch(readmeEn, /\]\(\.\/docs\/plans\//);

  assert.match(roadmap, /Current public release line|当前公开版本线/);
  assert.match(roadmap, /completed capability|已完成能力/);
  assert.match(roadmap, /Next slice|下一阶段/);
  assert.doesNotMatch(roadmap, /\| P1 \| Reviewer Bundle protocol \|/);
  assert.match(positioning, /当前公开版本线|Current public line/);
  assert.match(positioning, /已完成能力切片|completed capability/);
});

test('repo state policy explains release lines capability slices and planning drafts', async () => {
  const policy = await fs.readFile(path.join(repoRoot, 'docs/REPO_STATE_POLICY.md'), 'utf8');

  assert.match(policy, /release lines vs capability slices vs planning drafts/i);
  assert.match(policy, /Reviewer Bundle protocol/);
  assert.match(policy, /V2\.5 dual-review closeout/);
  assert.match(policy, /V2\.5\.1 project history rollback/);
  assert.match(policy, /V2\.6 Conservative AI foundation/);
  assert.match(policy, /V2\.7 Chinese-source reliability/);
  assert.match(policy, /docs\/plans/);
  assert.match(policy, /docs\/strategy/);
});

test('repo archive note explains removal of redundant legacy release directories', async () => {
  const archiveNote = await fs.readFile(path.join(repoRoot, 'docs/REPO_ARCHIVE_NOTES.md'), 'utf8');
  const trackedPaths = execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  const trackedTopLevelDirs = new Set(trackedPaths.map((entry) => entry.split('/')[0]));

  assert.match(archiveNote, /top-level legacy release directories removed/i);
  assert.match(archiveNote, /literature-screening-v1\.3/);
  assert.match(archiveNote, /literature-screening-v1\.4/);
  assert.match(archiveNote, /literature-screening-v1\.5/);
  assert.match(archiveNote, /literature-screening-v1\.6/);
  assert.match(archiveNote, /literature-screening-v30/);
  assert.match(archiveNote, /git history/i);
  assert.ok(trackedTopLevelDirs.has('literature-screening-v2.0'));
  assert.ok(trackedTopLevelDirs.has('literature-screening-v2.2'));
  assert.ok(!trackedTopLevelDirs.has('literature-screening-v1.3'));
  assert.ok(!trackedTopLevelDirs.has('literature-screening-v1.4'));
  assert.ok(!trackedTopLevelDirs.has('literature-screening-v1.5'));
  assert.ok(!trackedTopLevelDirs.has('literature-screening-v1.6'));
  assert.ok(!trackedTopLevelDirs.has('literature-screening-v30'));
});

test('full regression runner includes dual-review and reviewer-bundle protocol tests', async () => {
  const runner = await fs.readFile(path.join(repoRoot, 'tests/run-all-regressions.js'), 'utf8');

  assert.match(runner, /tests\/audit\/dual-review-engine\.test\.mjs/);
  assert.match(runner, /tests\/audit\/reviewer-bundle-engine\.test\.mjs/);
});

test('public positioning copy reflects completed V2.5 and V2.5.1 status', async () => {
  const [rootIndexHtml, indexHtml, landingHtml, roadmap, positioning] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'index.html'), 'utf8'),
    readV22File('index.html'),
    readV22File('landing.html'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/PRODUCT_POSITIONING_2026.md'), 'utf8'),
  ]);

  assert.match(roadmap, /V2\.5\.1 project history rollback \| completed patch-line capability/);
  assert.match(roadmap, /Current status: V2\.5\.1 is completed and merged into the V2\.5 public release line/);
  assert.doesNotMatch(roadmap, /V2\.5\.1 project history rollback \| next patch-line plan/);
  assert.doesNotMatch(roadmap, /Current status: planned/);
  assert.doesNotMatch(roadmap, /\| 计划 \|/);

  assert.match(positioning, /### 7\.1 当前公开版本线/);
  assert.match(positioning, /### 7\.2 已完成能力切片/);
  assert.match(positioning, /### 7\.3 下一阶段切片/);
  assert.match(positioning, /\| V2\.5 dual-review closeout \| 当前公开版本线/);
  assert.match(positioning, /\| V2\.5\.1 project history rollback \| 当前 patch line/);
  assert.match(positioning, /\| Reviewer Bundle protocol \| 已完成本地文件协作切片/);
  assert.match(positioning, /\| V2\.6 Conservative AI \| 已完成 foundation slice/);
  assert.match(positioning, /\| V2\.4 quality appraisal \| 已完成稳定能力/);
  assert.match(positioning, /V2\.6 Conservative AI foundation 已完成/);
  assert.doesNotMatch(positioning, /V2\.4 计划/);
  assert.doesNotMatch(positioning, /V2\.5 计划/);
  assert.doesNotMatch(positioning, /下一步才是 V2\.6 Conservative AI/);
  assert.doesNotMatch(positioning, /next step remains V2\.4/);

  assert.match(rootIndexHtml, /V2\.5 dual-review closeout/);
  assert.match(rootIndexHtml, /href="app\/"/);
  assert.match(rootIndexHtml, /href="legacy\/"/);
  assert.doesNotMatch(rootIndexHtml, /V2\.3|v1\.7 新功能|V3(?:\.0)?/i);
  assert.match(indexHtml, /Reviewer A\/B|A\/B 决定隔离/);
  assert.match(indexHtml, /未解决冲突导出门禁|unresolved-conflict export gate/);
  assert.equal(landingHtml, indexHtml);
});

test('internal docs retain conservative AI history without adding a public release identity', async () => {
  const [readme, readmeEn, roadmap, positioning, conservativeAiDesign] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/PRODUCT_POSITIONING_2026.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/design/CONSERVATIVE_AI_DESIGN.md'), 'utf8'),
  ]);

  assert.match(readme, /V2\.5 dual-review closeout \| `\/app\/` \| 当前公开版本线/);
  assert.match(readmeEn, /V2\.5 dual-review closeout \| `\/app\/` \| Current public line/);
  assert.doesNotMatch(readme, /\bV2\.6\b|\bV2\.7\b|\bV3(?:\.0)?\b/i);
  assert.doesNotMatch(readmeEn, /\bV2\.6\b|\bV2\.7\b|\bV3(?:\.0)?\b/i);
  assert.match(readme, /本地建议只作辅助，最终纳排由人工确认/);
  assert.match(readmeEn, /local suggestions remain advisory and humans make final decisions/i);
  assert.match(readme, /当前完整回归入口：`node tests\\run-all-regressions\.js`。/);
  assert.match(readmeEn, /Current full regression entry: `node tests\\run-all-regressions\.js`\./);
  assert.doesNotMatch(readme, /自动 AI screening/);
  assert.doesNotMatch(readmeEn, /automatic AI screening/);

  assert.match(roadmap, /Current status: V2\.6 local conservative AI foundation slice is completed/);
  assert.match(roadmap, /AI suggestions stay advisory-only until a human accepts or edits them into a final decision/);
  assert.match(roadmap, /Prompt registry foundation/);
  assert.match(roadmap, /Provider boundary remains disabled by default/);
  assert.match(roadmap, /Step 3 advisory queue controls/);
  assert.match(roadmap, /queue summary, priority sorting, review-state filters, and empty-state clarification/);
  assert.match(roadmap, /PRISMA-trAIce and audit summary queue summaries/);
  assert.doesNotMatch(roadmap, /V2\.6 Conservative AI screening \| current public release line/);
  assert.doesNotMatch(roadmap, /automatic AI screening/);
  assert.doesNotMatch(roadmap, /real provider dispatch enabled by default/i);

  assert.match(positioning, /V2\.6 Conservative AI \| 已完成 foundation slice/);
  assert.match(positioning, /本地 advisory suggestions、prioritisation、uncertainty flags 和 prompt registry trace/);
  assert.match(positioning, /Step 3 advisory queue/);
  assert.match(positioning, /queue summary、priority sorting、review-state filters 和 empty-state clarity/);
  assert.match(positioning, /PRISMA-trAIce 和 audit summary queue summary/);
  assert.match(positioning, /PRISMA Workbench 当前不定位为：/);
  assert.match(positioning, /一键自动完成系统综述的平台/);

  assert.match(conservativeAiDesign, /Last updated: 2026-06-07/);
  assert.match(conservativeAiDesign, /V2\.6 foundation slice completed implementation/);
  assert.match(conservativeAiDesign, /local advisory suggestions/);
  assert.match(conservativeAiDesign, /priorityScore/);
  assert.match(conservativeAiDesign, /recommendedQueue/);
  assert.match(conservativeAiDesign, /uncertaintyFlags/);
  assert.match(conservativeAiDesign, /Step 3 advisory queue controls/);
  assert.match(conservativeAiDesign, /PRISMA-trAIce and audit summary queue summaries/);
  assert.match(conservativeAiDesign, /real provider dispatch remains disabled/);
  assert.match(conservativeAiDesign, /当前不做：/);
  assert.match(conservativeAiDesign, /自动生成最终纳入\/排除结论/);
});

test('internal docs retain Chinese-source reliability history without public version promotion', async () => {
  const [readme, readmeEn, roadmap, positioning, chineseSourceDesign] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/PRODUCT_POSITIONING_2026.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/design/CHINESE_SOURCE_COMPATIBILITY.md'), 'utf8'),
  ]);

  assert.doesNotMatch(readme, /\bV2\.6\b|\bV2\.7\b|\bV3(?:\.0)?\b/i);
  assert.doesNotMatch(readmeEn, /\bV2\.6\b|\bV2\.7\b|\bV3(?:\.0)?\b/i);
  assert.match(readme, /来源提示/);
  assert.match(readmeEn, /source warnings/i);
  assert.match(roadmap, /P5\.1：V2\.7 中文源可靠性/);
  assert.match(roadmap, /V2\.7 Chinese-source reliability is completed/);
  assert.match(roadmap, /fixture-backed CNKI \/ Wanfang \/ VIP \/ SinoMed hardening/);
  assert.match(positioning, /V2.7 Chinese-source reliability \| 已完成 reliability slice/);
  assert.match(positioning, /中文源可靠性是数据质量可见性层，不是自动筛选决策层/);
  assert.match(chineseSourceDesign, /Last updated: 2026-06-08/);
  assert.match(chineseSourceDesign, /V2\.7 Chinese-source reliability/);
  assert.match(chineseSourceDesign, /fixture-backed CNKI \/ Wanfang \/ VIP \/ SinoMed/);
  assert.match(chineseSourceDesign, /source_mapping_incomplete/);
  assert.doesNotMatch(`${readme}\n${readmeEn}\n${roadmap}\n${positioning}\n${chineseSourceDesign}`, /fully supports all Chinese databases|完美支持所有中文数据库/);
  assert.doesNotMatch(`${readme}\n${readmeEn}\n${roadmap}\n${positioning}`, /V2\.7.*creates automatic final decisions|V2\.7.*自动生成最终/);
});

test('v2.5.1 app persists project history snapshots', async () => {
  const source = await readV22App();
  const workspaceHtml = await readV22File('workspace.html');

  assert.match(workspaceHtml, /project-history-engine\.js/);
  assert.match(source, /let projectHistory = \[\];/);
  assert.match(source, /projectHistory,/);
  assert.match(source, /projectHistory = Array\.isArray\(snapshot\.projectHistory\)/);
  assert.match(source, /function createProjectHistorySnapshot/);
  assert.match(source, /project_snapshot_created/);
});

test('v2.5.1 app creates history snapshots at recovery points', async () => {
  const source = await readV22App();

  assert.match(source, /createProjectHistorySnapshot\('before_import'/);
  assert.match(source, /createProjectHistorySnapshot\('after_import'/);
  assert.match(source, /createProjectHistorySnapshot\('screening_rerun'/);
  assert.match(source, /createProjectHistorySnapshot\('fulltext_finalized'/);
  assert.match(source, /createProjectHistorySnapshot\('quality_saved'/);
  assert.match(source, /createProjectHistorySnapshot\('conflict_resolved'/);
  assert.match(source, /createProjectHistorySnapshot\('before_export'/);
});

test('v2.5.1 workspace exposes history rollback UI and restore flow', async () => {
  const [source, workspaceHtml, styleCss] = await Promise.all([
    readV22App(),
    readV22File('workspace.html'),
    readV22File('style.css'),
  ]);

  assert.match(workspaceHtml, /id="projectHistoryPanel"/);
  assert.match(source, /renderProjectHistoryPanel\(\)/);
  assert.match(source, /function renderProjectHistoryPanel/);
  assert.match(source, /function restoreProjectHistorySnapshot/);
  assert.match(source, /project_snapshot_restored/);
  assert.match(source, /restoreProjectState\(historySnapshot\.state\)/);
  assert.match(source, /refreshDualReviewConflictState/);
  assert.match(styleCss, /\.project-history-panel/);
});

test('v2.5.1 app records source file add and remove history', async () => {
  const source = await readV22App();
  const workspaceHtml = await readV22File('workspace.html');

  assert.match(workspaceHtml, /id="sourceFileHistoryPanel"/);
  assert.match(source, /function removeSourceFileFromProject/);
  assert.match(source, /source_file_removed/);
  assert.match(source, /source_file_added/);
  assert.match(source, /createProjectHistorySnapshot\('source_file_removed'/);
  assert.match(source, /createProjectHistorySnapshot\('source_file_added'/);
});

test('v2.2 app keeps mock AI suggestions separate from final screening decisions', async () => {
  const source = await readV22App();

  assert.match(source, /generateMockAiSuggestions/);
  assert.match(source, /buildMockAiSuggestionForRecord/);
  assert.match(source, /getAiSuggestionIdentity/);
  assert.match(source, /hasAiSuggestionForIdentity/);
  assert.match(source, /skippedExistingSuggestionCount/);
  assert.match(source, /appendAiSuggestionEventsSafe\(suggestions/);
});

test('v2.2 app supports accept, reject, and edit actions for AI suggestions', async () => {
  const source = await readV22App();

  assert.match(source, /function acceptAiSuggestion/);
  assert.match(source, /function rejectAiSuggestion/);
  assert.match(source, /function editAiSuggestion\(suggestionId, editedDecision, exclusionReason = ''\)/);
  assert.match(source, /human_ai_confirmation/);
  assert.match(source, /eventType: 'ai_suggestion_reviewed'/);
  assert.match(source, /renderAiSuggestionPanel/);
  assert.match(source, /normalizeAiHumanDecision\(editedDecision\)/);
  assert.match(source, /toggleAiSuggestionEditReason/);
  assert.match(source, /const chooseReasonText = panelLang === 'zh'/);
  assert.match(source, /Choose a reason/);
  assert.match(source, /humanEditedDecision: normalizedDecision/);
  assert.doesNotMatch(source, /suggestion\.suggestedDecision === 'include' \? 'uncertain' : 'include'/);
});

test('v2.7 import reliability warnings surface without automatic final decisions', async () => {
  const source = await readV22App();
  const workspaceHtml = await readV22File('workspace.html');

  assert.match(source, /abstract_truncation_suspected/);
  assert.match(source, /abstract_noise_detected/);
  assert.match(source, /source_mapping_incomplete/);
  assert.match(source, /function summarizeImportReliabilityWarnings/);
  assert.match(source, /source_quality_warning/);
  assert.match(workspaceHtml, /importJobSummary/);
  assert.doesNotMatch(source, /abstract_truncation_suspected[\s\S]{0,240}upsertScreeningDecisionSafe/);
  assert.doesNotMatch(source, /abstract_noise_detected[\s\S]{0,240}upsertScreeningDecisionSafe/);
  assert.doesNotMatch(source, /source_mapping_incomplete[\s\S]{0,240}upsertScreeningDecisionSafe/);
});

test('public docs and workspace position sample data as a public demo dataset', async () => {
  const [readme, readmeEn, roadmap, workspaceHtml, landingHtml, resourcesHtml, appSource] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
    readV22File('workspace.html'),
    readV22File('landing.html'),
    readV22File('resources.html'),
    readV22App(),
  ]);

  assert.match(readme, /docs\/demo\/README\.md/);
  assert.match(readmeEn, /Public demo guide/i);
  assert.match(roadmap, /Demo dataset \| 可公开的演示数据/);
  assert.match(workspaceHtml, /公开演示数据|public demo dataset/i);
  assert.match(landingHtml, /Demo 熟悉流程|Try the demo first/i);
  assert.match(resourcesHtml, /公开演示数据|Public demo/i);
  assert.match(appSource, /public demo dataset|公开演示数据/i);
});

test('public docs expose the reproducibility benchmark without release promotion', async () => {
  const [readme, readmeEn, roadmap] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
  ]);

  const benchmarkPackageDoc = await fs.readFile(
    path.join(repoRoot, 'docs/benchmarks/README.md'),
    'utf8'
  );

  assert.match(readme, /docs\/benchmarks\/README\.md/);
  assert.match(readmeEn, /Reproducibility benchmark guide/i);
  assert.doesNotMatch(`${readme}\n${readmeEn}`, /\bV2\.6\b|\bV2\.7\b|\bV3(?:\.0)?\b/i);
  assert.match(roadmap, /Benchmark package \| 导入、去重、筛选、审计 replay 的可复现测试/);
  assert.match(benchmarkPackageDoc, /scripts\/dedup\/run-benchmark\.mjs/);
  assert.match(benchmarkPackageDoc, /tests\/fixtures\/dedup\/benchmark-manifest\.csv/);
});

test('paper preparation assets stay internal and outside public navigation', async () => {
  const [readme, readmeEn, roadmap, resourcesHtml, buildScript] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
    readV22File('resources.html'),
    fs.readFile(path.join(repoRoot, 'scripts/build-public-site.mjs'), 'utf8'),
  ]);

  const skeletonDoc = await fs.readFile(
    path.join(repoRoot, 'docs/papers/README.md'),
    'utf8'
  );

  assert.doesNotMatch(readme, /paper skeleton|docs\/papers\//i);
  assert.doesNotMatch(readmeEn, /paper skeleton|docs\/papers\//i);
  assert.doesNotMatch(resourcesHtml, /paper skeleton|docs\/papers\//i);
  assert.doesNotMatch(buildScript, /docs\/papers\//i);
  assert.match(roadmap, /Paper skeleton \| JOSS \/ JMIR AI \/ Systematic Reviews 候选材料/);
  assert.match(roadmap, /paper skeleton is now established|paper skeleton.*docs\/papers\//i);
  assert.match(skeletonDoc, /Recommended starting venue/i);
  assert.match(skeletonDoc, /JOSS|JMIR AI|Systematic Reviews/);
  assert.match(skeletonDoc, /docs\/benchmarks\/README\.md/);
  assert.match(skeletonDoc, /literature-screening-v2\.2\/sample-data\.json/);
});

test('commercial validation material stays internal and outside the public artifact', async () => {
  const [readme, readmeEn, roadmap, commercializationNotes] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/COMMERCIALIZATION_NOTES.md'), 'utf8'),
  ]);

  const validationDocPath = path.join(repoRoot, 'docs/commercial/VALIDATION.md');
  const validationDocExists = await fs.access(validationDocPath).then(
    () => true,
    () => false
  );
  const validationDoc = validationDocExists
    ? await fs.readFile(validationDocPath, 'utf8')
    : '';

  assert.equal(validationDocExists, true);
  assert.doesNotMatch(readme, /commercial validation|docs\/commercial\//i);
  assert.doesNotMatch(readmeEn, /commercial validation|docs\/commercial\//i);
  assert.match(roadmap, /Commercial validation \| 访谈、试用、模板包、机构部署意向验证/);
  assert.match(validationDoc, /open-core/i);
  assert.match(validationDoc, /individual|team|institution/i);
  assert.match(validationDoc, /evidence record|interview record|trial record/i);
  assert.match(validationDoc, /no payment code|不写支付代码/i);
  assert.match(commercializationNotes, /validation before monetization implementation|commercial validation contract/i);
});

test('roadmap captures release hardening and formal website direction before validation', async () => {
  const roadmap = await fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8');

  assert.match(roadmap, /Release hardening/i);
  assert.match(roadmap, /首页主入口清理|homepage entry cleanup/i);
  assert.match(roadmap, /CSV\s*\/\s*RIS\s*\/\s*BibTeX/);
  assert.match(roadmap, /217\/217/);
  assert.match(roadmap, /正式网站|formal website|official website/i);
  assert.match(roadmap, /Commercial validation remains|commercial validation 仍然|商业验证仍然/i);
});

test('release-facing pages keep the public entry beginner-friendly while docs stay linked from resources', async () => {
  const [rootIndexHtml, indexHtml, landingHtml] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'index.html'), 'utf8'),
    readV22File('index.html'),
    readV22File('landing.html'),
  ]);

  assert.match(rootIndexHtml, /从文献检索结果开始，完成去重、筛选、复核和 PRISMA 导出/);
  assert.match(rootIndexHtml, /适合第一次做系统综述的学生|students starting their first systematic review/i);
  assert.match(rootIndexHtml, /模板和示例|Templates and examples/i);
  assert.doesNotMatch(indexHtml, /href="[^\"]*sample-data\.json"/);
  assert.doesNotMatch(indexHtml, /href="[^\"]*docs\/benchmarks\/README\.md"/);
  assert.doesNotMatch(indexHtml, /href="[^\"]*docs\/papers\/README\.md"/);
  assert.equal(landingHtml, indexHtml);
  assert.match(indexHtml, /开始一个项目|Start a project/i);
  assert.match(indexHtml, /了解流程|Learn the workflow/i);
  assert.doesNotMatch(indexHtml, /\bV3(?:\.0)?\b/i);
});

test('release-facing pages route allowlisted assets through an unversioned resources hub', async () => {
  const [indexHtml, landingHtml, resourcesHtml] = await Promise.all([
    readV22File('index.html'),
    readV22File('landing.html'),
    readV22File('resources.html'),
  ]);

  assert.match(indexHtml, /href="resources\/"/);
  assert.equal(landingHtml, indexHtml);
  assert.match(resourcesHtml, /PRISMA Workbench 资源中心/);
  assert.match(resourcesHtml, /从示例、模板和说明开始/);
  assert.match(resourcesHtml, /公开演示数据/);
  assert.match(resourcesHtml, /基准复现/);
  assert.match(resourcesHtml, /模板包/);
  assert.match(resourcesHtml, /方法说明|Methods guide/i);
  assert.doesNotMatch(resourcesHtml, /<span class="zh">[^<]*(public demo dataset|benchmark package|paper skeleton|Workflow Kits|Review Starter Kits|Search Strategy Assistant|Paper|Design|Boundary|Skeleton|Tests)[^<]*<\/span>/i);
  assert.match(resourcesHtml, /sample-data\.json/);
  assert.match(resourcesHtml, /docs\/demo\/README\.md/);
  assert.match(resourcesHtml, /docs\/benchmarks\/README\.md/);
  assert.doesNotMatch(resourcesHtml, /docs\/papers\//);
  assert.doesNotMatch(resourcesHtml, /\bV3(?:\.0)?\b/i);
});

test('release-facing pages expose dual-review entry and current V2.5 wording', async () => {
  const [indexHtml, landingHtml, loginHtml] = await Promise.all([
    readV22File('index.html'),
    readV22File('landing.html'),
    readV22File('login.html'),
  ]);

  assert.match(indexHtml, /href="dual-review\/"/);
  assert.match(indexHtml, /双人复核|Dual review/i);
  assert.match(indexHtml, /A\/B 决定隔离，冲突由 resolver 处理/);
  assert.match(indexHtml, /未解决冲突导出门禁/);
  assert.equal(landingHtml, indexHtml);
  assert.match(loginHtml, /两位复核者可以用本地文件完成独立筛选交接|Two reviewers can hand off independent screening with local files/i);
  assert.match(loginHtml, /No account|无需账号/i);
  assert.doesNotMatch(loginHtml, /登录|加入项目|等待同步|\blogin\b|join project|wait(?:ing)? for sync/i);
});

test('README workflow sections use ASCII flow blocks instead of Mermaid', async () => {
  const [readme, readmeEn] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
  ]);

  assert.match(readme, /导入文献 -> 保守去重 -> 配置筛选规则 -> 标题\/摘要筛选 -> 全文复核 -> 质量评价 -> PRISMA 与审计包导出/);
  assert.match(readmeEn, /Import records -> Conservative deduplication -> Screening rules -> Title\/abstract screening -> Full-text review -> Quality assessment -> PRISMA and audit exports/);
  assert.doesNotMatch(readme, /```mermaid|flowchart LR/);
  assert.doesNotMatch(readmeEn, /```mermaid|flowchart LR/);
});
