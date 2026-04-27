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

  assert.equal(manifest.projectId, 'project-1');
  assert.equal(manifest.projectName, '中文系统综述');
  assert.equal(manifest.aiMode, 'off');
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
  assert.equal(JSON.parse(jsonl).after.title, '针灸, RCT');
  assert.match(decisionCsv, /"中文备注, ""quote"""/);
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
