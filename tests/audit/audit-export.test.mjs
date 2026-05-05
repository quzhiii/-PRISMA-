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
  ];
  const expectedFiles = [
    'project_manifest.json',
    'events.jsonl',
    'screening_decisions.csv',
    'exclusion_reasons.csv',
    'prisma_counts.json',
    'audit_summary.md',
  ];

  expectedTypes.forEach((type) => assert.match(source, new RegExp(`'${type}'`)));
  expectedFiles.forEach((filename) => assert.match(source, new RegExp(filename.replace('.', '\\.'))));
  assert.match(source, /buildAuditExportContent/);
  assert.match(source, /buildPrismaCountsJson/);
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
});

test('audit package exports use the stable snake_case ledger schema', () => {
  const manifest = AuditEngine.buildProjectManifestExport({
    projectId: 'project-1',
    projectName: 'Schema Review',
    appVersion: 'v2.2',
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
