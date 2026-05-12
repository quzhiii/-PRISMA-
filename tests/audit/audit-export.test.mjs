import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const AuditEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/audit-engine.js'));

test('builds project manifest and PRISMA counts export objects', () => {
  const manifest = AuditEngine.buildProjectManifestExport({
    projectId: 'project-1',
    projectName: '中文系统综述',
    aiMode: 'off',
  });
  const events = [
    AuditEngine.createAuditEvent({ eventType: 'record_imported', recordId: 'record-1' }),
    AuditEngine.createAuditEvent({ eventType: 'dedup_auto_removed', recordId: 'record-2' }),
  ];
  const decisions = [
    AuditEngine.createScreeningDecision({
      recordId: 'record-1',
      stage: 'title_abstract',
      decision: 'include',
    }),
    AuditEngine.createScreeningDecision({
      recordId: 'record-1',
      stage: 'full_text',
      decision: 'include',
    }),
  ];

  const countsExport = AuditEngine.buildPrismaCountsJson(decisions, events);

  assert.equal(manifest.project_id, 'project-1');
  assert.equal(manifest.project_name, '中文系统综述');
  assert.equal(manifest.ai_mode, 'off');
  assert.equal(countsExport.schemaVersion, AuditEngine.AUDIT_SCHEMA_VERSION);
  assert.equal(countsExport.source, 'screening_decisions_and_audit_events');
  assert.equal(countsExport.counts.recordsImported, 1);
  assert.equal(countsExport.counts.duplicatesRemoved, 1);
  assert.equal(countsExport.counts.studiesIncluded, 1);
});

test('builds AI usage registry and PRISMA-trAIce report exports', () => {
  const manifest = AuditEngine.createProjectManifest({
    projectId: 'project-1',
    projectName: 'AI transparency review',
    aiMode: 'assistive',
    aiUsageRegistry: [{
      usageId: 'default-ai-mode',
      projectId: 'project-1',
      aiMode: 'assistive',
      providerType: 'local',
      providerName: 'local_mock_provider',
      modelName: 'mock-screening-assistant',
      allowedStages: ['title_abstract'],
      dataBoundary: 'local_only',
      userAcknowledged: true,
      metadata: {
        providerConfig: {
          apiKeyPresent: false,
          requestPolicy: 'disabled',
          realProviderConnected: false,
          endpointOrigin: 'https://api.example.test',
          apiKeyStorage: 'not_configured',
        },
      },
    }],
  });
  const registryExport = AuditEngine.buildAiUsageRegistryExport(manifest);
  const suggestionsJsonl = AuditEngine.serializeAiSuggestionEventsJsonl([
    AuditEngine.createAiSuggestionEvent({
      projectId: 'project-1',
      recordId: 'record-1',
      stage: 'title_abstract',
      mode: 'suggest_only',
      modelName: 'mock-screening-assistant',
      promptHash: 'prompt-hash',
      inputHash: 'input-hash',
      inputSummary: 'short summary',
      suggestedDecision: 'include',
      rationale: 'Mock suggestion',
      confidence: 0.7,
      humanAction: 'pending',
    }),
  ]);
  const report = AuditEngine.buildPrismaTraiceReportMarkdown(manifest, [
    AuditEngine.createAiSuggestionEvent({
      projectId: 'project-1',
      recordId: 'record-1',
      stage: 'title_abstract',
      mode: 'suggest_only',
      modelName: 'mock-screening-assistant',
      promptHash: 'prompt-hash',
      inputHash: 'input-hash',
      inputSummary: 'short summary',
      suggestedDecision: 'include',
      rationale: 'Mock suggestion',
      confidence: 0.7,
      humanAction: 'accepted',
      linkedDecisionId: 'decision-1',
    }),
    AuditEngine.createAiSuggestionEvent({
      projectId: 'project-1',
      recordId: 'record-2',
      stage: 'title_abstract',
      mode: 'suggest_only',
      modelName: 'mock-screening-assistant',
      promptHash: 'prompt-hash-2',
      inputHash: 'input-hash-2',
      inputSummary: 'second summary',
      suggestedDecision: 'exclude',
      rationale: 'Mock exclusion suggestion',
      confidence: 0.5,
      humanAction: 'rejected',
    }),
  ]);

  assert.equal(registryExport.aiMode, 'assistive');
  assert.equal(registryExport.registry.length, 1);
  assert.equal(registryExport.registry[0].provider_type, 'local');
  assert.equal(registryExport.registry[0].metadata.providerConfig.requestPolicy, 'disabled');
  assert.equal(JSON.parse(suggestionsJsonl.trim()).suggested_decision, 'include');
  assert.match(report, /AI Usage Registry/);
  assert.match(report, /AI Provider Boundary/);
  assert.match(report, /Request policy/);
  assert.match(report, /Real provider connected/);
  assert.match(report, /Endpoint origin/);
  assert.match(report, /\| assistive \| local \| local_mock_provider \| mock-screening-assistant \| disabled \| no \| local_only \| https:\/\/api\.example\.test \| no \| not_configured \|/);
  assert.match(report, /Exported AI Audit Files/);
  assert.match(report, /ai_usage_registry\.json/);
  assert.match(report, /ai_suggestions\.jsonl/);
  assert.match(report, /PRISMA_TRAICE_REPORT\.md/);
  assert.match(report, /AI Suggestion Review Trace Fields/);
  assert.match(report, /`reviewed_at`/);
  assert.match(report, /`human_edited_decision`/);
  assert.match(report, /`human_edited_exclusion_reason`/);
  assert.match(report, /`linked_decision_id`/);
  assert.match(report, /`prisma_count_boundary`/);
  assert.match(report, /AI Suggestion Summary/);
  assert.match(report, /Total suggestions: 2/);
  assert.match(report, /Reviewed suggestions: 2/);
  assert.match(report, /Pending suggestions: 0/);
  assert.match(report, /Linked human decisions: 1/);
  assert.match(report, /Reviewed suggestions without linked human decision: 1/);
  assert.match(report, /Advisory-only reviewed suggestions: 1/);
  assert.match(report, /Accepted or edited suggestions without linked human decision: 0/);
  assert.match(report, /\| accepted \| 1 \|/);
  assert.match(report, /\| rejected \| 1 \|/);
  assert.match(report, /\| include \| 1 \|/);
  assert.match(report, /\| exclude \| 1 \|/);
  assert.match(report, /human confirmation/i);
  assert.match(report, /rejected or ignored suggestions only update the AI suggestion log/i);
  assert.match(report, /screening_decisions\.csv` remains the final human decision ledger/i);

  const zhReport = AuditEngine.buildPrismaTraiceReportMarkdown(manifest, [], { language: 'zh' });
  assert.match(zhReport, /PRISMA-trAIce 透明报告/);
  assert.match(zhReport, /AI 使用登记/);
  assert.match(zhReport, /AI 服务边界/);
  assert.match(zhReport, /AI 建议处理摘要/);
  assert.match(zhReport, /辅助记录/);
  assert.match(zhReport, /本地示例服务/);
  assert.match(zhReport, /AI 建议不会/);
});

test('serializes audit package artifacts with stable escaping', () => {
  const events = [
    AuditEngine.createAuditEvent({
      eventId: 'event-1',
      eventType: 'record_imported',
      recordId: 'record-1',
      after: { title: '针灸, RCT' },
    }),
  ];
  const decisions = [
    AuditEngine.createScreeningDecision({
      decisionId: 'decision-1',
      recordId: 'record-1',
      stage: 'full_text',
      decision: 'exclude',
      exclusionReason: 'wrong_population',
      notes: '中文备注, "quote"',
    }),
  ];

  const jsonl = AuditEngine.serializeEventsJsonl(events);
  const decisionCsv = AuditEngine.serializeScreeningDecisionsCsv(decisions);
  const reasonsCsv = AuditEngine.serializeExclusionReasonsCsv(decisions);
  const summary = AuditEngine.buildAuditSummaryMarkdown(
    AuditEngine.buildProjectManifestExport({ projectId: 'project-1', projectName: 'Audit Export' }),
    events,
    decisions
  );

  assert.equal(jsonl.trim().split('\n').length, 1);
  assert.equal(JSON.parse(jsonl).new_value.title, '针灸, RCT');
  assert.match(decisionCsv, /screening_stage,human_decision,exclusion_reason/);
  assert.match(reasonsCsv, /wrong_population,1/);
  assert.match(summary, /Schema version: audit\.v1/);
  assert.match(summary, /record_imported/);
  assert.match(summary, /fullTextExcluded/);
  assert.match(summary, /Unresolved Risks And Notes/);

  const zhSummary = AuditEngine.buildAuditSummaryMarkdown(
    AuditEngine.buildProjectManifestExport({ projectId: 'project-1', projectName: 'Audit Export' }),
    events,
    decisions,
    { language: 'zh' }
  );
  assert.match(zhSummary, /审计摘要/);
  assert.match(zhSummary, /事件摘要/);
  assert.match(zhSummary, /PRISMA 计数/);
  assert.match(zhSummary, /最终纳入研究数/);
  assert.match(zhSummary, /AI 建议不会/);
});

test('serializes AI suggestion review trace fields in JSONL exports', () => {
  const acceptedJsonl = AuditEngine.serializeAiSuggestionEventsJsonl([
    AuditEngine.createAiSuggestionEvent({
      suggestionId: 'suggestion-accepted',
      projectId: 'project-1',
      recordId: 'record-1',
      suggestedDecision: 'include',
      humanAction: 'accepted',
      linkedDecisionId: 'decision-1',
      metadata: {
        reviewedAt: '2026-05-07T10:00:00.000Z',
        reviewNote: 'Human accepted AI suggestion and created a linked ScreeningDecision.',
      },
    }),
  ]);
  const editedJsonl = AuditEngine.serializeAiSuggestionEventsJsonl([
    AuditEngine.createAiSuggestionEvent({
      suggestionId: 'suggestion-edited',
      projectId: 'project-1',
      recordId: 'record-2',
      suggestedDecision: 'include',
      humanAction: 'edited',
      linkedDecisionId: 'decision-2',
      metadata: {
        reviewedAt: '2026-05-07T10:01:00.000Z',
        humanEditedDecision: 'exclude',
        humanEditedExclusionReason: 'wrong_population',
        humanEditedOriginalExclusionReason: '\u4eba\u7fa4\u4e0d\u7b26',
        reviewNote: 'Human rewrote AI suggestion and created a linked ScreeningDecision.',
      },
    }),
  ]);
  const rejectedJsonl = AuditEngine.serializeAiSuggestionEventsJsonl([
    AuditEngine.createAiSuggestionEvent({
      suggestionId: 'suggestion-rejected',
      projectId: 'project-1',
      recordId: 'record-3',
      suggestedDecision: 'uncertain',
      humanAction: 'rejected',
      metadata: {
        reviewedAt: '2026-05-07T10:02:00.000Z',
        reviewNote: 'Human rejected AI suggestion; no ScreeningDecision was created from this suggestion.',
      },
    }),
  ]);

  const accepted = JSON.parse(acceptedJsonl);
  const edited = JSON.parse(editedJsonl);
  const rejected = JSON.parse(rejectedJsonl);

  assert.equal(accepted.reviewed_at, '2026-05-07T10:00:00.000Z');
  assert.equal(accepted.review_note, 'Human accepted AI suggestion and created a linked ScreeningDecision.');
  assert.equal(accepted.prisma_count_boundary, 'linked_human_screening_decision_required_for_counts');
  assert.equal(edited.human_edited_decision, 'exclude');
  assert.equal(edited.human_edited_exclusion_reason, 'wrong_population');
  assert.equal(edited.human_edited_original_exclusion_reason, '\u4eba\u7fa4\u4e0d\u7b26');
  assert.equal(edited.prisma_count_boundary, 'linked_human_screening_decision_required_for_counts');
  assert.equal(rejected.linked_decision_id, null);
  assert.equal(rejected.prisma_count_boundary, 'advisory_log_only_not_counted_directly');
});

test('v2.2 app exposes all audit export download types', async () => {
  const source = await fs.readFile(path.join(repoRoot, 'literature-screening-v2.2/app.js'), 'utf8');
  const expectedTypes = [
    'audit_manifest',
    'audit_events',
    'audit_screening_decisions',
    'audit_exclusion_reasons',
    'audit_prisma_counts',
    'audit_summary',
    'ai_usage_registry',
    'ai_suggestions',
    'prisma_traice_report',
  ];
  const expectedFiles = [
    'project_manifest.json',
    'events.jsonl',
    'screening_decisions.csv',
    'exclusion_reasons.csv',
    'prisma_counts.json',
    'audit_summary.md',
    'ai_usage_registry.json',
    'ai_suggestions.jsonl',
    'PRISMA_TRAICE_REPORT.md',
  ];

  expectedTypes.forEach((type) => assert.match(source, new RegExp(`'${type}'`)));
  expectedFiles.forEach((filename) => assert.match(source, new RegExp(filename.replace('.', '\\.'))));
  assert.match(source, /buildAuditExportContent/);
  assert.match(source, /buildPrismaCountsJson/);
});

test('v2.2 app exposes V2.4 quality deliverables outside the frozen V2.3 audit trio', async () => {
  const source = await fs.readFile(path.join(repoRoot, 'literature-screening-v2.2/app.js'), 'utf8');

  assert.match(source, /'quality_appraisal'/);
  assert.match(source, /quality_appraisal\.csv/);
  assert.match(source, /buildQualityAppraisalExportContent/);
  assert.match(source, /quality_export_generated/);
  assert.match(source, /'evidence_table'/);
  assert.match(source, /evidence_table\.csv/);
  assert.match(source, /buildEvidenceTableExportContent/);
  assert.match(source, /evidence_table_export_generated/);
  assert.match(source, /'grade_summary'/);
  assert.match(source, /grade_summary\.csv/);
  assert.match(source, /buildGradeSummaryExportContent/);
  assert.match(source, /grade_summary_export_generated/);
  assert.match(source, /'dual_review_conflicts'/);
  assert.match(source, /dual_review_conflicts\.csv/);
  assert.match(source, /serializeDualReviewConflictsCsv/);
  assert.match(source, /'dual_review_agreement'/);
  assert.match(source, /dual_review_agreement\.json/);
  assert.match(source, /serializeDualReviewAgreementJson/);
  assert.match(source, /dual_review_export_generated/);
  assert.match(source, /createResolverQualityAssessment/);
  assert.match(source, /createQualityConflictResolvedAuditEvent/);
  const auditExportTypesBlock = source.match(/const AUDIT_EXPORT_TYPES = Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(auditExportTypesBlock);
  assert.doesNotMatch(auditExportTypesBlock[1], /'quality_appraisal'/);
  assert.doesNotMatch(auditExportTypesBlock[1], /'evidence_table'/);
  assert.doesNotMatch(auditExportTypesBlock[1], /'grade_summary'/);
  assert.doesNotMatch(auditExportTypesBlock[1], /'dual_review_conflicts'/);
  assert.doesNotMatch(auditExportTypesBlock[1], /'dual_review_agreement'/);
});

test('v2.2 workspace includes the audit package export buttons', async () => {
  const workspaceHtml = await fs.readFile(
    path.join(repoRoot, 'literature-screening-v2.2/workspace.html'),
    'utf8'
  );

  assert.match(workspaceHtml, /Audit Package/);
  assert.match(workspaceHtml, /downloadFile\('audit_manifest'\)/);
  assert.match(workspaceHtml, /downloadFile\('audit_events'\)/);
  assert.match(workspaceHtml, /downloadFile\('audit_screening_decisions'\)/);
  assert.match(workspaceHtml, /downloadFile\('audit_exclusion_reasons'\)/);
  assert.match(workspaceHtml, /downloadFile\('audit_prisma_counts'\)/);
  assert.match(workspaceHtml, /downloadFile\('audit_summary'\)/);
  assert.match(workspaceHtml, /downloadFile\('ai_usage_registry'\)/);
  assert.match(workspaceHtml, /downloadFile\('ai_suggestions'\)/);
  assert.match(workspaceHtml, /downloadFile\('prisma_traice_report'\)/);
  assert.match(workspaceHtml, /downloadFile\('quality_appraisal'\)/);
  assert.match(workspaceHtml, /quality_appraisal\.csv/);
  assert.match(workspaceHtml, /downloadFile\('evidence_table'\)/);
  assert.match(workspaceHtml, /evidence_table\.csv/);
  assert.match(workspaceHtml, /downloadFile\('grade_summary'\)/);
  assert.match(workspaceHtml, /grade_summary\.csv/);
  assert.match(workspaceHtml, /downloadFile\('dual_review_conflicts'\)/);
  assert.match(workspaceHtml, /dual_review_conflicts\.csv/);
  assert.match(workspaceHtml, /downloadFile\('dual_review_agreement'\)/);
  assert.match(workspaceHtml, /dual_review_agreement\.json/);
  assert.match(workspaceHtml, /dual-review-engine\.js/);
  assert.match(workspaceHtml, /class="surface-panel workspace-side-panel secondary-info-zone export-files-panel"/);
  assert.match(workspaceHtml, /class="info-box ai-readiness-box ai-transparency-panel"/);
  assert.match(workspaceHtml, /class="button-group audit-package-downloads"/);
  assert.match(workspaceHtml, /V2\.3 PRISMA-trAIce/);
  assert.match(workspaceHtml, /reviewed_at/);
  assert.match(workspaceHtml, /human edit fields/);
  assert.match(workspaceHtml, /prisma_count_boundary/);
  assert.match(workspaceHtml, /Generate Local Example AI Suggestions/);
  assert.match(workspaceHtml, /configuration evidence, not a final decision ledger/);
  assert.match(workspaceHtml, /rejected suggestions do not enter PRISMA counts/);
  assert.match(workspaceHtml, /final counts come from human ScreeningDecision records/);
  assert.match(workspaceHtml, /PRISMA Literature Screening v2\.4/);
  assert.match(workspaceHtml, /no real AI provider is connected by default/i);
  assert.match(workspaceHtml, /GRADE remains human-confirmed/i);
  assert.match(workspaceHtml, /final GRADE and downgrade reasons stay human-confirmed/i);
});

test('audit package exports use the stable snake_case ledger schema', () => {
  const manifest = AuditEngine.buildProjectManifestExport({
    projectId: 'project-1',
    projectName: 'Schema Review',
    appVersion: 'v2.3',
    aiMode: 'off',
    timestamp: '2026-04-28T00:00:00.000Z',
  });
  const eventJsonl = AuditEngine.serializeEventsJsonl([
    AuditEngine.createAuditEvent({
      eventId: 'event-1',
      projectId: 'project-1',
      recordId: 'record-1',
      eventType: 'record_imported',
      stage: 'import',
      sourceFile: 'cnki.rdf',
      sourceDatabase: 'CNKI',
      payload: { raw_field_keys: ['题名', '摘要'] },
      before: { imported: false },
      after: { imported: true },
      timestamp: '2026-04-28T00:01:00.000Z',
    }),
  ]);
  const decisionCsv = AuditEngine.serializeScreeningDecisionsCsv([
    AuditEngine.createScreeningDecision({
      decisionId: 'decision-1',
      projectId: 'project-1',
      recordId: 'record-1',
      sourceFile: 'cnki.rdf',
      sourceDatabase: 'CNKI',
      stage: 'full_text',
      decision: 'exclude',
      exclusionReason: 'wrong_population',
      reviewerId: 'reviewer-1',
      conflictStatus: 'none',
      qualityAppraisalStatus: 'queued',
      aiAssistanceUsed: false,
      finalExportStatus: 'excluded',
      updatedAt: '2026-04-28T00:02:00.000Z',
    }),
  ]);

  assert.deepEqual(Object.keys(manifest), [
    'project_id',
    'project_name',
    'created_at',
    'updated_at',
    'app_version',
    'audit_schema_version',
    'prisma_version',
    'ai_mode',
    'data_residency',
    'export_generated_at',
  ]);
  assert.equal(manifest.data_residency, 'local_browser');
  assert.equal(manifest.export_generated_at, '2026-04-28T00:00:00.000Z');

  const event = JSON.parse(eventJsonl.trim());
  assert.deepEqual(Object.keys(event), [
    'event_id',
    'project_id',
    'record_id',
    'event_type',
    'stage',
    'timestamp',
    'actor_id',
    'source_file',
    'source_database',
    'payload',
    'previous_value',
    'new_value',
    'audit_schema_version',
  ]);
  assert.equal(event.source_file, 'cnki.rdf');
  assert.equal(event.source_database, 'CNKI');
  assert.deepEqual(event.previous_value, { imported: false });
  assert.deepEqual(event.new_value, { imported: true });

  const header = decisionCsv.split('\n')[0];
  assert.equal(
    header,
    'decision_id,project_id,record_id,source_file,source_database,screening_stage,human_decision,exclusion_reason,reviewer_id,conflict_status,quality_appraisal_status,ai_assistance_used,ai_model,ai_prompt_hash,ai_output_summary,final_export_status,updated_at'
  );
  assert.match(decisionCsv, /decision-1,project-1,record-1,cnki\.rdf,CNKI,full_text,exclude,wrong_population,reviewer-1,none,queued,false,,,,excluded,2026-04-28T00:02:00\.000Z/);
});
