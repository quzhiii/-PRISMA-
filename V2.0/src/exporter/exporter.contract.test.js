'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  shapeIncludedStudies,
  shapeExcludedStudies,
  shapeDecisionLog,
  shapeProjectSummary,
  shapeExportArtifact
} = require('./index');

const { EXPORT_SCHEMA_VERSION, EXPORT_ARTIFACT_KEYS } = require('./export-schema');

const {
  createDecisionStore,
  applyWorkflowTransition,
  recordScreeningDecision,
  createDecisionSnapshot
} = require('../decisions/index');

function audit(actor, at, note) {
  return { actor, at, note: note || '' };
}

function makeRecord(overrides) {
  return {
    id: 'rec_001',
    source: 'pubmed',
    source_file: 'pubmed.ris',
    title: 'Test Study',
    abstract: 'Test abstract.',
    authors: ['Smith J', 'Doe A'],
    year: 2022,
    journal: 'Journal of Testing',
    doi: '10.1234/test.2022',
    keywords: ['testing', 'science'],
    language: 'en',
    _dedup_key: 'test-key',
    _duplicate_of: null,
    _decision_stage: null,
    _decision_reason: null,
    _decision_actor: null,
    _decision_at: null,
    ...overrides
  };
}

function buildFullScenario() {
  let store = createDecisionStore();
  store = applyWorkflowTransition(store, 'complete_import', audit('importer', '2026-01-01T00:00:00Z'));
  store = applyWorkflowTransition(store, 'complete_dedup_review', audit('reviewer', '2026-01-01T01:00:00Z'));

  store = recordScreeningDecision(
    store,
    { recordId: 'rec_001', stage: 'screening', verdict: 'include' },
    audit('reviewer', '2026-01-01T02:00:00Z', 'passes title/abstract')
  );
  store = recordScreeningDecision(
    store,
    { recordId: 'rec_002', stage: 'screening', verdict: 'exclude', reason: 'wrong_population' },
    audit('reviewer', '2026-01-01T02:01:00Z')
  );
  store = recordScreeningDecision(
    store,
    { recordId: 'rec_003', stage: 'screening', verdict: 'include' },
    audit('reviewer', '2026-01-01T02:02:00Z')
  );

  store = applyWorkflowTransition(store, 'complete_screening', audit('reviewer', '2026-01-01T03:00:00Z'));

  store = recordScreeningDecision(
    store,
    { recordId: 'rec_001', stage: 'fulltext', verdict: 'include' },
    audit('reviewer', '2026-01-01T04:00:00Z', 'confirmed inclusion')
  );
  store = recordScreeningDecision(
    store,
    { recordId: 'rec_003', stage: 'fulltext', verdict: 'exclude', reason: 'no_outcome' },
    audit('reviewer', '2026-01-01T04:01:00Z')
  );

  store = applyWorkflowTransition(store, 'mark_export_ready', audit('reviewer', '2026-01-01T05:00:00Z'));

  const snapshot = createDecisionSnapshot(store);

  const records = [
    makeRecord({ id: 'rec_001' }),
    makeRecord({ id: 'rec_002', title: 'Wrong Population Study', doi: '10.1234/wrong.2022' }),
    makeRecord({ id: 'rec_003', title: 'No Outcome Study', doi: '10.1234/noout.2022' }),
    makeRecord({ id: 'rec_004', title: 'Duplicate', _duplicate_of: 'rec_001' })
  ];

  return { store, snapshot, records };
}

// shapeIncludedStudies

test('shapeIncludedStudies returns only fulltext-included non-duplicate records', () => {
  const { snapshot, records } = buildFullScenario();
  const included = shapeIncludedStudies(snapshot, records);
  assert.equal(included.length, 1);
  assert.equal(included[0].id, 'rec_001');
  assert.equal(included[0].title, 'Test Study');
});

test('shapeIncludedStudies result entries have exactly the expected keys', () => {
  const { snapshot, records } = buildFullScenario();
  const [entry] = shapeIncludedStudies(snapshot, records);
  const expected = [
    'id', 'title', 'abstract', 'authors', 'year', 'journal',
    'doi', 'keywords', 'language', 'source', 'source_file'
  ].sort();
  assert.deepEqual(Object.keys(entry).sort(), expected);
});

test('shapeIncludedStudies skips duplicate records', () => {
  const { snapshot, records } = buildFullScenario();
  const ids = shapeIncludedStudies(snapshot, records).map((r) => r.id);
  assert.equal(ids.includes('rec_004'), false);
});

test('shapeIncludedStudies returns [] when snapshot is null', () => {
  assert.deepEqual(shapeIncludedStudies(null, [makeRecord()]), []);
});

test('shapeIncludedStudies returns [] when records is not an array', () => {
  const { snapshot } = buildFullScenario();
  assert.deepEqual(shapeIncludedStudies(snapshot, null), []);
});

test('shapeIncludedStudies handles screening-only include with no fulltext stage', () => {
  let store = createDecisionStore();
  store = applyWorkflowTransition(store, 'complete_import', audit('sys', '2026-01-01T00:00:00Z'));
  store = applyWorkflowTransition(store, 'complete_dedup_review', audit('sys', '2026-01-01T01:00:00Z'));
  store = recordScreeningDecision(
    store,
    { recordId: 'rec_x', stage: 'screening', verdict: 'include' },
    audit('reviewer', '2026-01-01T02:00:00Z')
  );
  const snapshot = createDecisionSnapshot(store);
  const included = shapeIncludedStudies(snapshot, [makeRecord({ id: 'rec_x' })]);
  assert.equal(included.length, 1);
  assert.equal(included[0].id, 'rec_x');
});

// shapeExcludedStudies

test('shapeExcludedStudies returns screening and fulltext excluded records', () => {
  const { snapshot, records } = buildFullScenario();
  const ids = shapeExcludedStudies(snapshot, records).map((r) => r.id);
  assert.equal(ids.includes('rec_002'), true);
  assert.equal(ids.includes('rec_003'), true);
  assert.equal(ids.length, 2);
});

test('shapeExcludedStudies entries carry stage, reason, decidedBy, decidedAt', () => {
  const { snapshot, records } = buildFullScenario();
  const excluded = shapeExcludedStudies(snapshot, records);
  const rec002 = excluded.find((r) => r.id === 'rec_002');
  const rec003 = excluded.find((r) => r.id === 'rec_003');

  assert.equal(rec002.stage, 'screening');
  assert.equal(rec002.reason, 'wrong_population');
  assert.equal(typeof rec002.decidedBy, 'string');
  assert.equal(typeof rec002.decidedAt, 'string');
  assert.equal(rec003.stage, 'fulltext');
  assert.equal(rec003.reason, 'no_outcome');
});

test('shapeExcludedStudies does not include the included record', () => {
  const { snapshot, records } = buildFullScenario();
  const ids = shapeExcludedStudies(snapshot, records).map((r) => r.id);
  assert.equal(ids.includes('rec_001'), false);
});

test('shapeExcludedStudies skips duplicate records', () => {
  const { snapshot, records } = buildFullScenario();
  const ids = shapeExcludedStudies(snapshot, records).map((r) => r.id);
  assert.equal(ids.includes('rec_004'), false);
});

test('shapeExcludedStudies returns [] for null snapshot', () => {
  assert.deepEqual(shapeExcludedStudies(null, [makeRecord()]), []);
});

// shapeDecisionLog

test('shapeDecisionLog returns entries in ascending sequence order', () => {
  const { snapshot } = buildFullScenario();
  const log = shapeDecisionLog(snapshot);
  assert.ok(log.length > 0);
  for (let i = 1; i < log.length; i++) {
    assert.ok(log[i].sequence > log[i - 1].sequence, 'sequence must be ascending');
  }
});

test('shapeDecisionLog entries have all required keys', () => {
  const { snapshot } = buildFullScenario();
  const [entry] = shapeDecisionLog(snapshot);
  for (const key of ['sequence', 'kind', 'actor', 'at', 'note', 'source', 'action']) {
    assert.ok(Object.prototype.hasOwnProperty.call(entry, key), 'missing key: ' + key);
  }
});

test('shapeDecisionLog workflow_transition entries have empty recordId/stage/verdict', () => {
  const { snapshot } = buildFullScenario();
  const transitions = shapeDecisionLog(snapshot).filter((e) => e.kind === 'workflow_transition');
  assert.ok(transitions.length > 0);
  for (const t of transitions) {
    assert.equal(t.recordId, '');
    assert.equal(t.stage, '');
    assert.equal(t.verdict, '');
  }
});

test('shapeDecisionLog returns [] for null snapshot', () => {
  assert.deepEqual(shapeDecisionLog(null), []);
});

test('shapeDecisionLog returns [] when snapshot has no audit', () => {
  assert.deepEqual(shapeDecisionLog({ decisions: [] }), []);
});

// shapeProjectSummary

test('shapeProjectSummary returns correct PRISMA counts for full scenario', () => {
  const { snapshot, records } = buildFullScenario();
  const s = shapeProjectSummary(snapshot, records);
  assert.equal(s.totalIdentified, 4);
  assert.equal(s.totalDuplicatesRemoved, 1);
  assert.equal(s.totalScreened, 3);
  assert.equal(s.totalExcludedScreening, 1);
  assert.equal(s.totalFulltextReviewed, 2);
  assert.equal(s.totalExcludedFulltext, 1);
  assert.equal(s.totalIncluded, 1);
});

test('shapeProjectSummary exclusionReasonCounts aggregates across stages', () => {
  const { snapshot, records } = buildFullScenario();
  const { exclusionReasonCounts } = shapeProjectSummary(snapshot, records);
  assert.equal(exclusionReasonCounts['wrong_population'], 1);
  assert.equal(exclusionReasonCounts['no_outcome'], 1);
});

test('shapeProjectSummary returns zero-filled object when records is null', () => {
  const s = shapeProjectSummary(null, null);
  assert.equal(s.totalIdentified, 0);
  assert.equal(s.totalIncluded, 0);
  assert.deepEqual(s.exclusionReasonCounts, {});
});

test('shapeProjectSummary returns zero counts for empty records array', () => {
  const s = shapeProjectSummary(null, []);
  assert.equal(s.totalIdentified, 0);
  assert.equal(s.totalDuplicatesRemoved, 0);
});

// shapeExportArtifact

test('shapeExportArtifact has all top-level keys', () => {
  const { snapshot, records } = buildFullScenario();
  const artifact = shapeExportArtifact(snapshot, records, { id: 'p1', title: 'Review' });
  for (const key of EXPORT_ARTIFACT_KEYS) {
    assert.ok(Object.prototype.hasOwnProperty.call(artifact, key), 'missing: ' + key);
  }
});

test('shapeExportArtifact schemaVersion equals EXPORT_SCHEMA_VERSION', () => {
  const { snapshot, records } = buildFullScenario();
  assert.equal(shapeExportArtifact(snapshot, records, {}).schemaVersion, EXPORT_SCHEMA_VERSION);
});

test('shapeExportArtifact exportedAt is a valid ISO timestamp', () => {
  const { snapshot, records } = buildFullScenario();
  const { exportedAt } = shapeExportArtifact(snapshot, records, {});
  assert.ok(!isNaN(Date.parse(exportedAt)));
});

test('shapeExportArtifact project block inherits from projectMeta', () => {
  const { snapshot, records } = buildFullScenario();
  const artifact = shapeExportArtifact(snapshot, records, {
    id: 'proj_x',
    title: 'Systematic Review of X',
    createdAt: '2026-01-01T00:00:00Z'
  });
  assert.equal(artifact.project.id, 'proj_x');
  assert.equal(artifact.project.title, 'Systematic Review of X');
  assert.equal(artifact.project.createdAt, '2026-01-01T00:00:00Z');
});

test('shapeExportArtifact does not mutate the input records array', () => {
  const { snapshot, records } = buildFullScenario();
  const originalIds = records.map((r) => r.id);
  shapeExportArtifact(snapshot, records, {});
  assert.deepEqual(records.map((r) => r.id), originalIds);
});

// missing field handling

test('missing string fields default to empty string in included studies', () => {
  let store = createDecisionStore();
  store = applyWorkflowTransition(store, 'complete_import', audit('sys', '2026-01-01T00:00:00Z'));
  store = applyWorkflowTransition(store, 'complete_dedup_review', audit('sys', '2026-01-01T01:00:00Z'));
  store = recordScreeningDecision(
    store,
    { recordId: 'sparse_001', stage: 'screening', verdict: 'include' },
    audit('reviewer', '2026-01-01T02:00:00Z')
  );
  const snapshot = createDecisionSnapshot(store);
  const records = [{ id: 'sparse_001', authors: null, keywords: undefined, year: null, _duplicate_of: null }];
  const [entry] = shapeIncludedStudies(snapshot, records);

  assert.equal(entry.title, '');
  assert.equal(entry.abstract, '');
  assert.equal(entry.doi, '');
  assert.equal(entry.journal, '');
  assert.equal(entry.language, '');
  assert.equal(entry.source, '');
  assert.equal(entry.source_file, '');
  assert.deepEqual(entry.authors, []);
  assert.deepEqual(entry.keywords, []);
  assert.equal(entry.year, null, 'year must be null when unknown');
});

test('missing string fields default to empty string in excluded studies', () => {
  let store = createDecisionStore();
  store = applyWorkflowTransition(store, 'complete_import', audit('sys', '2026-01-01T00:00:00Z'));
  store = applyWorkflowTransition(store, 'complete_dedup_review', audit('sys', '2026-01-01T01:00:00Z'));
  store = recordScreeningDecision(
    store,
    { recordId: 'sparse_002', stage: 'screening', verdict: 'exclude', reason: 'out_of_scope' },
    audit('reviewer', '2026-01-01T02:00:00Z')
  );
  const snapshot = createDecisionSnapshot(store);
  const [entry] = shapeExcludedStudies(
    snapshot,
    [{ id: 'sparse_002', title: null, year: undefined, _duplicate_of: null }]
  );

  assert.equal(entry.title, '');
  assert.equal(entry.year, null);
  assert.equal(entry.stage, 'screening');
  assert.equal(entry.reason, 'out_of_scope');
});

test('year=0 is coerced to null in shaped records', () => {
  let store = createDecisionStore();
  store = applyWorkflowTransition(store, 'complete_import', audit('sys', '2026-01-01T00:00:00Z'));
  store = applyWorkflowTransition(store, 'complete_dedup_review', audit('sys', '2026-01-01T01:00:00Z'));
  store = recordScreeningDecision(
    store,
    { recordId: 'year_rec', stage: 'screening', verdict: 'include' },
    audit('reviewer', '2026-01-01T02:00:00Z')
  );
  const snapshot = createDecisionSnapshot(store);
  const [entry] = shapeIncludedStudies(snapshot, [makeRecord({ id: 'year_rec', year: 0 })]);
  assert.equal(entry.year, null);
});
