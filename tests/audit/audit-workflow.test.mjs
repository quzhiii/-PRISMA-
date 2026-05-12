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
  assert.match(source, /export_conflict_warning/);
  assert.match(source, /maybeWarnUnresolvedConflictsBeforeExport/);
  assert.match(source, /preserveQualityReviewerAssessments/);
  assert.match(source, /__uncertain__/);
  assert.doesNotMatch(source, /fetch\([^)]*openai/i);
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
