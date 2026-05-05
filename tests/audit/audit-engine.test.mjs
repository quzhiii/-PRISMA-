import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const AuditEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/audit-engine.js'));

test('creates a project manifest with conservative defaults', () => {
  const manifest = AuditEngine.createProjectManifest({
    projectId: 'project-1',
    projectName: 'Acupuncture review',
  });

  assert.equal(manifest.projectId, 'project-1');
  assert.equal(manifest.projectName, 'Acupuncture review');
  assert.equal(manifest.reviewType, 'systematic_review');
  assert.equal(manifest.prismaVersion, 'PRISMA_2020');
  assert.equal(manifest.aiMode, 'off');
  assert.equal(manifest.schemaVersion, AuditEngine.AUDIT_SCHEMA_VERSION);
  assert.ok(manifest.createdAt);
  assert.ok(manifest.updatedAt);
});

test('creates audit events with normalized actor and source metadata', () => {
  const event = AuditEngine.createAuditEvent({
    projectId: 'project-1',
    eventType: 'record_imported',
    recordId: 'record-1',
    after: { title: 'Trial record' },
  });

  assert.equal(event.projectId, 'project-1');
  assert.equal(event.eventType, 'record_imported');
  assert.equal(event.recordId, 'record-1');
  assert.equal(event.actorId, 'system');
  assert.equal(event.actorRole, 'system');
  assert.equal(event.source, 'system');
  assert.equal(event.schemaVersion, AuditEngine.AUDIT_SCHEMA_VERSION);
  assert.ok(event.eventId);
  assert.ok(event.timestamp);
});

test('appends events immutably and filters a record audit trail', () => {
  const first = AuditEngine.createAuditEvent({
    eventId: 'event-1',
    timestamp: '2026-04-27T00:00:00.000Z',
    eventType: 'record_imported',
    recordId: 'record-1',
  });
  const second = AuditEngine.createAuditEvent({
    eventId: 'event-2',
    timestamp: '2026-04-27T00:01:00.000Z',
    eventType: 'rule_screen_decision',
    recordId: 'record-2',
  });
  const third = AuditEngine.createAuditEvent({
    eventId: 'event-3',
    timestamp: '2026-04-27T00:02:00.000Z',
    eventType: 'full_text_decision_finalized',
    recordId: 'record-1',
  });

  const initial = [first];
  const next = AuditEngine.appendAuditEvent(initial, second);
  const finalEvents = AuditEngine.appendAuditEvent(next, third);

  assert.equal(initial.length, 1);
  assert.equal(finalEvents.length, 3);
  assert.deepEqual(
    AuditEngine.getAuditTrail(finalEvents, 'record-1').map((event) => event.eventId),
    ['event-1', 'event-3']
  );
});

test('creates and updates screening decisions without losing original decision time', () => {
  const initial = AuditEngine.createScreeningDecision({
    recordId: 'record-1',
    stage: 'title_abstract',
    decision: 'exclude',
    exclusionReason: 'wrong_population',
    reviewerId: 'system_rule',
    source: 'rule',
    decidedAt: '2026-04-27T00:00:00.000Z',
  });
  const updated = AuditEngine.updateScreeningDecision(initial, {
    decision: 'include',
    exclusionReason: '',
    reviewerId: 'reviewer_1',
    source: 'human',
    updatedAt: '2026-04-27T00:10:00.000Z',
  });

  assert.equal(updated.recordId, 'record-1');
  assert.equal(updated.stage, 'title_abstract');
  assert.equal(updated.decision, 'include');
  assert.equal(updated.exclusionReason, '');
  assert.equal(updated.decidedAt, '2026-04-27T00:00:00.000Z');
  assert.equal(updated.updatedAt, '2026-04-27T00:10:00.000Z');
});

test('calculates PRISMA counts from durable decisions and dedup events', () => {
  const decisions = [
    AuditEngine.createScreeningDecision({
      recordId: 'record-1',
      stage: 'title_abstract',
      decision: 'include',
    }),
    AuditEngine.createScreeningDecision({
      recordId: 'record-2',
      stage: 'title_abstract',
      decision: 'exclude',
      exclusionReason: 'wrong_population',
    }),
    AuditEngine.createScreeningDecision({
      recordId: 'record-1',
      stage: 'full_text',
      decision: 'include',
    }),
    AuditEngine.createScreeningDecision({
      recordId: 'record-3',
      stage: 'full_text',
      decision: 'exclude',
      exclusionReason: 'not_full_text_available',
    }),
  ];
  const events = [
    AuditEngine.createAuditEvent({ eventType: 'record_imported', recordId: 'record-1' }),
    AuditEngine.createAuditEvent({ eventType: 'record_imported', recordId: 'record-2' }),
    AuditEngine.createAuditEvent({ eventType: 'record_imported', recordId: 'record-3' }),
    AuditEngine.createAuditEvent({ eventType: 'dedup_auto_removed', recordId: 'record-4' }),
  ];

  const counts = AuditEngine.calculatePrismaCountsFromDecisions(decisions, events);

  assert.equal(counts.recordsImported, 3);
  assert.equal(counts.duplicatesRemoved, 1);
  assert.equal(counts.titleAbstractIncluded, 1);
  assert.equal(counts.titleAbstractExcluded, 1);
  assert.equal(counts.fullTextAssessed, 2);
  assert.equal(counts.fullTextExcluded, 1);
  assert.equal(counts.studiesIncluded, 1);
});

test('normalizes legacy audit event names to the design contract while preserving count compatibility', () => {
  const events = [
    AuditEngine.createAuditEvent({ eventType: 'record_imported', recordId: 'record-1' }),
    AuditEngine.createAuditEvent({ eventType: 'dedup_auto_removed', recordId: 'record-2' }),
    AuditEngine.createAuditEvent({ eventType: 'dedup_candidate_flagged', recordId: 'record-3' }),
    AuditEngine.createAuditEvent({ eventType: 'rule_screen_decision', recordId: 'record-1' }),
    AuditEngine.createAuditEvent({ eventType: 'full_text_decision_finalized', recordId: 'record-1' }),
    AuditEngine.createAuditEvent({ eventType: 'quality_queue_prepared', recordId: 'record-1' }),
    AuditEngine.createAuditEvent({ eventType: 'study_design_suggested', recordId: 'record-1' }),
  ];
  const jsonl = AuditEngine.serializeEventsJsonl(events);
  const exportedTypes = jsonl.trim().split('\n').map((line) => JSON.parse(line).event_type);

  assert.deepEqual(exportedTypes, [
    'record_imported',
    'hard_duplicate_removed',
    'candidate_duplicate_flagged',
    'rule_screening_decision',
    'manual_screening_decision',
    'quality_appraisal_started',
    'quality_appraisal_updated',
  ]);
  assert.equal(AuditEngine.calculatePrismaCountsFromDecisions([], events).duplicatesRemoved, 1);
  assert.equal(
    AuditEngine.calculatePrismaCountsFromDecisions([], [
      AuditEngine.createAuditEvent({ eventType: 'hard_duplicate_removed', recordId: 'record-2' }),
    ]).duplicatesRemoved,
    1
  );
});

test('serializes audit events as JSONL', () => {
  const events = [
    AuditEngine.createAuditEvent({
      eventId: 'event-1',
      timestamp: '2026-04-27T00:00:00.000Z',
      eventType: 'record_imported',
      recordId: 'record-1',
    }),
    AuditEngine.createAuditEvent({
      eventId: 'event-2',
      timestamp: '2026-04-27T00:01:00.000Z',
      eventType: 'rule_screen_decision',
      recordId: 'record-1',
    }),
  ];

  const jsonl = AuditEngine.serializeEventsJsonl(events);
  const lines = jsonl.trim().split('\n');

  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[0]).event_id, 'event-1');
  assert.equal(JSON.parse(lines[1]).event_type, 'rule_screening_decision');
});

test('serializes screening decisions and exclusion reasons as CSV', () => {
  const decisions = [
    AuditEngine.createScreeningDecision({
      recordId: 'record-1',
      stage: 'full_text',
      decision: 'exclude',
      exclusionReason: 'wrong_population',
      notes: '中文备注, with comma',
    }),
  ];

  const decisionCsv = AuditEngine.serializeScreeningDecisionsCsv(decisions);
  const reasonCsv = AuditEngine.serializeExclusionReasonsCsv(decisions);

  assert.match(decisionCsv, /record_id,source_file,source_database,screening_stage,human_decision,exclusion_reason/);
  assert.match(decisionCsv, /record-1,,,full_text,exclude,wrong_population/);
  assert.match(reasonCsv, /wrong_population/);
  assert.match(reasonCsv, /1/);
});

test('builds an audit summary markdown report', () => {
  const manifest = AuditEngine.createProjectManifest({
    projectId: 'project-1',
    projectName: 'Audit test',
  });
  const events = [
    AuditEngine.createAuditEvent({ eventType: 'record_imported', recordId: 'record-1' }),
    AuditEngine.createAuditEvent({ eventType: 'export_generated', recordId: '' }),
  ];
  const decisions = [
    AuditEngine.createScreeningDecision({
      recordId: 'record-1',
      stage: 'full_text',
      decision: 'include',
    }),
  ];

  const summary = AuditEngine.buildAuditSummaryMarkdown(manifest, events, decisions);

  assert.match(summary, /# Audit Summary/);
  assert.match(summary, /Audit test/);
  assert.match(summary, /record_imported/);
  assert.match(summary, /studiesIncluded/);
  assert.match(summary, /Unresolved Risks And Notes/);
});

test('v2.2 workspace loads audit engine before app.js', async () => {
  const workspaceHtml = await fs.readFile(
    path.join(repoRoot, 'literature-screening-v2.2/workspace.html'),
    'utf8'
  );
  const auditIndex = workspaceHtml.indexOf('audit-engine.js?v=20260427-v22-audit');
  const appIndex = workspaceHtml.indexOf('app.js?v=');

  assert.ok(auditIndex > 0);
  assert.ok(appIndex > auditIndex);
  assert.match(workspaceHtml, /PRISMA Literature Screening v2\.2/);
});

test('v2.2 db worker declares audit stores and message handlers', async () => {
  const workerSource = await fs.readFile(
    path.join(repoRoot, 'literature-screening-v2.2/db-worker.js'),
    'utf8'
  );

  assert.match(workerSource, /PRISMA_LiteratureDB_v2\.2/);
  assert.match(workerSource, /PROJECT_MANIFEST_STORE = 'project_manifest'/);
  assert.match(workerSource, /AUDIT_EVENT_STORE = 'audit_events'/);
  assert.match(workerSource, /SCREENING_DECISION_STORE = 'screening_decisions'/);
  assert.match(workerSource, /case 'APPEND_AUDIT_EVENTS'/);
  assert.match(workerSource, /case 'GET_SCREENING_DECISIONS'/);
});
