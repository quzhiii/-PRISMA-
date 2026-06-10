import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

async function readV22App() {
  return fs.readFile(path.join(repoRoot, 'literature-screening-v2.2/app.js'), 'utf8');
}

async function readV22File(filename) {
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
  assert.match(indexHtml, /document\.documentElement\.dataset\.lang = document\.documentElement\.lang/);
  assert.match(indexHtml, /try \{ storedLang = localStorage\.getItem\('prisma_lang'\); \} catch \(_\) \{\}/);
});

test('public V2.5 release labels are synchronized across page shells', async () => {
  const [rootIndexHtml, indexHtml, workspaceHtml, landingHtml, appSource] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'index.html'), 'utf8'),
    readV22File('index.html'),
    readV22File('workspace.html'),
    readV22File('landing.html'),
    readV22App(),
  ]);

  assert.match(rootIndexHtml, /默认版本已切换至 V2\.5/);
  assert.match(rootIndexHtml, /打开 V2\.5 工作台/);
  assert.match(rootIndexHtml, /打开 V2\.5 双人复核/);
  assert.match(indexHtml, /PRISMA Workbench v2\.5/);
  assert.match(indexHtml, /V2\.5 dual-review workstation/);
  assert.doesNotMatch(indexHtml, /V2\.3/);
  assert.match(workspaceHtml, /PRISMA Literature Screening v2\.5/);
  assert.match(workspaceHtml, /Research-grade workspace v2\.5/);
  assert.match(workspaceHtml, /PRISMA Workbench v2\.5 工作台/);
  assert.match(workspaceHtml, /PRISMA Workbench v2\.5 audit-ready local-first workspace/);
  assert.match(landingHtml, /PRISMA Workbench v2\.5 - Overview/);
  assert.match(landingHtml, /V2\.5 product overview/);
  assert.match(appSource, /const APP_RELEASE_VERSION = '2\.5-dual-review-release';/);
  assert.match(appSource, /version: APP_RELEASE_VERSION/);
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
  assert.match(readme, /Current%20demo-V2\.5/);
  assert.match(readme, /Audit%20trail-events%20%2B%20decision%20ledger/);
  assert.match(readme, /## 当前公开版本线/);
  assert.match(readme, /V2\.5 dual-review closeout \| `literature-screening-v2\.2\/` \| 当前公开版本线/);
  assert.match(readme, /V2\.5\.1 project history rollback \| `literature-screening-v2\.2\/` \| 当前 patch-line 能力/);
  assert.match(readme, /最近一次 V2\.6 foundation 回归结果：`151\/151` 通过/);
  assert.match(readmeEn, /# PRISMA Screening & Audit Workbench/);
  assert.match(readmeEn, /Version-V2\.5%20Dual%20Review/);
  assert.match(readmeEn, /Current%20demo-V2\.5/);
  assert.match(readmeEn, /Audit%20trail-events%20%2B%20decision%20ledger/);
  assert.match(readmeEn, /## Current public release line/);
  assert.match(readmeEn, /V2\.5 dual-review closeout \| `literature-screening-v2\.2\/` \| Current public release line/);
  assert.match(readmeEn, /V2\.5\.1 project history rollback \| `literature-screening-v2\.2\/` \| Current patch-line capability/);
  assert.match(readmeEn, /Latest V2\.6 foundation regression result: `151\/151` passed/);
  assert.match(roadmap, /V2\.5\.1 本地历史记录与回溯/);
  assert.match(roadmap, /project_snapshot_created/);
  assert.match(roadmap, /source_file_removed/);
  assert.match(historyPlan, /# V2\.5\.1 Project History and Rollback Implementation Plan/);
  assert.match(historyPlan, /restoreProjectState\(snapshot\)/);
  assert.match(historyPlan, /project_snapshot_restored/);
});

test('public docs describe reviewer bundles as file-based local-first collaboration', async () => {
  const [readme, readmeEn, roadmap] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
  ]);

  assert.match(readme, /Reviewer Bundle protocol/i);
  assert.match(readme, /collaboration seed package/i);
  assert.match(readme, /reviewer decision bundle/i);
  assert.match(readme, /merge import/i);
  assert.match(readme, /file-based local-first collaboration/i);
  assert.match(readme, /完整项目保存\/加载仍是单独的备份路径/);
  assert.doesNotMatch(readme, /Reviewer Bundle[\s\S]{0,400}(real-time sync|cloud collaboration|account-based collaboration|billing)/i);

  assert.match(readmeEn, /Reviewer Bundle protocol/i);
  assert.match(readmeEn, /collaboration seed package/i);
  assert.match(readmeEn, /reviewer decision bundle/i);
  assert.match(readmeEn, /merge import/i);
  assert.match(readmeEn, /file-based local-first collaboration/i);
  assert.match(readmeEn, /Full-project save\/load remains a separate backup path/);
  assert.doesNotMatch(readmeEn, /Reviewer Bundle[\s\S]{0,400}(real-time sync|cloud collaboration|account-based collaboration|billing)/i);

  assert.match(roadmap, /Reviewer Bundle protocol \| completed local-first handoff slice/);
  assert.match(roadmap, /collaboration seed package、reviewer decision bundle、merge import、冲突重算/);
  assert.match(roadmap, /file-based local-first collaboration/);
  assert.match(roadmap, /不是 backend sync、real-time sync 或账号协作平台/);
});

test('public docs separate release lines from completed capability slices', async () => {
  const [readme, readmeEn, roadmap, positioning] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/PRODUCT_POSITIONING_2026.md'), 'utf8'),
  ]);

  assert.match(readme, /当前公开版本线/);
  assert.match(readme, /已完成能力切片/);
  assert.match(readme, /下一阶段切片/);
  assert.match(readme, /Reviewer Bundle protocol/);
  assert.match(readme, /V2\.6 Conservative AI foundation \| `literature-screening-v2\.2\/` \| 已完成 foundation slice/);
  assert.match(readme, /V2\.7 Chinese-source reliability/);
  assert.doesNotMatch(readme, /Reviewer Bundle protocol[\s\S]{0,120}当前公开版本线/);
  assert.doesNotMatch(readme, /V2\.6[\s\S]{0,120}当前公开版本线/);
  assert.doesNotMatch(readme, /## 下一阶段切片[\s\S]{0,300}V2\.1 stable/);
  assert.doesNotMatch(readme, /## 下一阶段切片[\s\S]{0,300}v1\.7\.x/);
  assert.doesNotMatch(readme, /\]\(\.\/docs\/plans\//);

  assert.match(readmeEn, /Current public release line/);
  assert.match(readmeEn, /Completed capability slices/);
  assert.match(readmeEn, /Next slice/);
  assert.match(readmeEn, /V2\.6 Conservative AI foundation \| `literature-screening-v2\.2\/` \| Completed foundation slice/);
  assert.doesNotMatch(readmeEn, /Reviewer Bundle protocol[\s\S]{0,120}Current public release line/);
  assert.doesNotMatch(readmeEn, /V2\.6[\s\S]{0,120}Current public release line/);
  assert.doesNotMatch(readmeEn, /## Next slice[\s\S]{0,300}V2\.1 stable/);
  assert.doesNotMatch(readmeEn, /## Next slice[\s\S]{0,300}v1\.7\.x/);
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

  assert.match(rootIndexHtml, /PRISMA 文献筛选助手入口/);
  assert.match(rootIndexHtml, /默认已切换到 V2\.3 PRISMA-trAIce 工作台/);
  assert.match(rootIndexHtml, /v1\.7 历史版本/);
  assert.match(rootIndexHtml, /继续访问 v1\.7 双人协作模式/);
  assert.match(rootIndexHtml, /v1\.7 新功能/);

  assert.match(indexHtml, /双人复核、冲突队列和 resolver workflow 已纳入当前 V2\.5 工作台/);
  assert.match(indexHtml, /真实 AI provider 仍未默认启用/);
  assert.match(indexHtml, /历史回溯已完成/);
  assert.doesNotMatch(indexHtml, /dual review and real AI provider integration remain roadmap items/);
  assert.doesNotMatch(indexHtml, /双人复核和真实 AI 接入仍在后续路线中/);

  assert.match(landingHtml, /V2\.5 product overview/);
  assert.match(landingHtml, /后续会强化冲突队列和 resolver workflow/);
  assert.match(landingHtml, /Future work strengthens conflict queues and resolver workflows/);
});

test('public docs describe V2.6 as a completed conservative AI foundation slice, not the current release', async () => {
  const [readme, readmeEn, roadmap, positioning, conservativeAiDesign] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/PRODUCT_POSITIONING_2026.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/design/CONSERVATIVE_AI_DESIGN.md'), 'utf8'),
  ]);

  assert.match(readme, /V2\.5 dual-review closeout \| `literature-screening-v2\.2\/` \| 当前公开版本线/);
  assert.match(readmeEn, /V2\.5 dual-review closeout \| `literature-screening-v2\.2\/` \| Current public release line/);
  assert.match(readme, /V2\.6 Conservative AI foundation \| `literature-screening-v2\.2\/` \| 已完成 foundation slice/);
  assert.match(readmeEn, /V2\.6 Conservative AI foundation \| `literature-screening-v2\.2\/` \| Completed foundation slice/);
  assert.match(readme, /Step 3 advisory queue/);
  assert.match(readme, /queue summary/);
  assert.match(readme, /priority sorting/);
  assert.match(readme, /review-state filters/);
  assert.match(readme, /empty-state clarity/);
  assert.match(readme, /audit summary queue summary/);
  assert.match(readme, /最近一次 V2\.6 foundation 回归结果：`151\/151` 通过/);
  assert.match(readmeEn, /Step 3 advisory queue/);
  assert.match(readmeEn, /queue summary/);
  assert.match(readmeEn, /priority sorting/);
  assert.match(readmeEn, /review-state filters/);
  assert.match(readmeEn, /empty-state clarity/);
  assert.match(readmeEn, /audit summary queue summary/);
  assert.match(readmeEn, /Latest V2\.6 foundation regression result: `151\/151` passed/);
  assert.doesNotMatch(readme, /V2\.6.*当前公开版本线/);
  assert.doesNotMatch(readmeEn, /V2\.6.*Current public release line/);
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

test('public docs position V2.7 as a conservative Chinese-source reliability slice', async () => {
  const [readme, readmeEn, roadmap, positioning, chineseSourceDesign] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/PRODUCT_POSITIONING_2026.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/design/CHINESE_SOURCE_COMPATIBILITY.md'), 'utf8'),
  ]);

  assert.match(readme, /V2\.7 Chinese-source reliability \| `literature-screening-v2\.2\/` \| 下一阶段 reliability slice：fixture-backed CNKI、万方、维普和 SinoMed 可靠性增强/);
  assert.match(readmeEn, /V2\.7 Chinese-source reliability \| `literature-screening-v2\.2\/` \| Next reliability slice: fixture-backed CNKI, Wanfang, VIP, and SinoMed reliability hardening/);
  assert.match(readme, /abstract_truncation_suspected/);
  assert.match(readmeEn, /abstract_truncation_suspected/);
  assert.match(roadmap, /P5\.1：V2\.7 中文源可靠性/);
  assert.match(roadmap, /Current status: V2\.7 Chinese-source reliability is the next slice after completed V2\.6/);
  assert.match(roadmap, /fixture-backed CNKI \/ Wanfang \/ VIP \/ SinoMed hardening/);
  assert.match(positioning, /V2\.7 Chinese-source reliability \| 下一阶段 reliability slice/);
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
  const [readme, readmeEn, roadmap, workspaceHtml, landingHtml, appSource] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
    readV22File('workspace.html'),
    readV22File('landing.html'),
    readV22App(),
  ]);

  assert.match(readme, /public demo dataset/i);
  assert.match(readmeEn, /public demo dataset/i);
  assert.match(roadmap, /Demo dataset \| 可公开的演示数据和导入说明/);
  assert.match(workspaceHtml, /公开演示数据|public demo dataset/i);
  assert.match(landingHtml, /公开演示数据|public demo dataset/i);
  assert.match(appSource, /public demo dataset|公开演示数据/i);
});

test('public docs position benchmark package as the next concrete P6 slice', async () => {
  const [readme, readmeEn, roadmap] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
  ]);

  const benchmarkPackageDoc = await fs.readFile(
    path.join(repoRoot, 'docs/benchmarks/README.md'),
    'utf8'
  );

  assert.match(readme, /benchmark package/i);
  assert.match(readmeEn, /benchmark package/i);
  assert.match(roadmap, /Benchmark package \| 导入、去重、筛选、审计 replay 的可复现测试/);
  assert.match(benchmarkPackageDoc, /scripts\/dedup\/run-benchmark\.mjs/);
  assert.match(benchmarkPackageDoc, /tests\/fixtures\/dedup\/benchmark-manifest\.csv/);
});

test('public docs position paper skeleton as the next concrete P6 slice', async () => {
  const [readme, readmeEn, roadmap] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'README.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'README_EN.md'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'docs/ROADMAP_2026.md'), 'utf8'),
  ]);

  const skeletonDoc = await fs.readFile(
    path.join(repoRoot, 'docs/papers/README.md'),
    'utf8'
  );

  assert.match(readme, /paper skeleton/i);
  assert.match(readmeEn, /paper skeleton/i);
  assert.match(roadmap, /Paper skeleton \| JOSS \/ JMIR AI \/ Systematic Reviews 候选材料/);
  assert.match(readme, /下一刀.*paper skeleton|下一阶段.*paper skeleton/i);
  assert.match(readmeEn, /next slice is a `paper skeleton`|next slice is paper skeleton/i);
  assert.match(roadmap, /next concrete slice is a paper skeleton|下一阶段.*paper skeleton/i);
  assert.match(skeletonDoc, /Recommended starting venue/i);
  assert.match(skeletonDoc, /JOSS|JMIR AI|Systematic Reviews/);
  assert.match(skeletonDoc, /docs\/benchmarks\/README\.md/);
  assert.match(skeletonDoc, /literature-screening-v2\.2\/sample-data\.json/);
});

test('public docs position commercial validation as the next concrete P6 slice', async () => {
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
  assert.match(readme, /commercial validation/i);
  assert.match(readmeEn, /commercial validation/i);
  assert.match(roadmap, /Commercial validation \| 访谈、试用、模板包、机构部署意向验证/);
  assert.match(readme, /下一刀.*commercial validation|下一阶段.*commercial validation/i);
  assert.match(readmeEn, /next slice is a `commercial validation`|next slice is commercial validation/i);
  assert.match(validationDoc, /open-core/i);
  assert.match(validationDoc, /individual|team|institution/i);
  assert.match(validationDoc, /evidence record|interview record|trial record/i);
  assert.match(validationDoc, /no payment code|不写支付代码/i);
  assert.match(commercializationNotes, /validation before monetization implementation|commercial validation contract/i);
});

test('release-facing pages surface current workspace entry and V3 preparation assets', async () => {
  const [rootIndexHtml, indexHtml, landingHtml] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'index.html'), 'utf8'),
    readV22File('index.html'),
    readV22File('landing.html'),
  ]);

  assert.match(rootIndexHtml, /public demo dataset/i);
  assert.match(rootIndexHtml, /benchmark package/i);
  assert.match(rootIndexHtml, /paper skeleton/i);
  assert.match(indexHtml, /public demo dataset/i);
  assert.match(indexHtml, /benchmark package/i);
  assert.match(indexHtml, /paper skeleton/i);
  assert.match(landingHtml, /public demo dataset/i);
  assert.match(landingHtml, /benchmark package/i);
  assert.match(landingHtml, /paper skeleton/i);
  assert.match(indexHtml, /Open Workspace/);
  assert.match(landingHtml, /Open Workspace/);
});
