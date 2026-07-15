import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const ProjectPackageEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/project-package-engine.js'));

function makeCurrentProject(overrides = {}) {
  return {
    packageType: 'full_project',
    packageSchema: 'project_package.v1.local',
    producer: 'PRISMA Workbench',
    producerVersion: '2.5-dual-review-release',
    version: '2.5-dual-review-release',
    timestamp: '2026-07-14T08:00:00.000Z',
    projectId: 'project-current',
    reviewMode: 'single',
    uploadedData: [{ id: 'record-1', title: 'Study' }],
    uploadedFiles: [{ name: 'source.ris', recordCount: 1 }],
    screeningResults: null,
    columnMapping: {},
    fileFormat: 'RIS',
    formatSource: 'RIS',
    currentStep: 2,
    exclusionReasons: ['wrong_population'],
    filterRules: null,
    qualityAssessments: [],
    importJobs: [],
    projectManifest: {
      projectId: 'project-current',
      appVersion: 'v2.5',
      schemaVersion: 'audit.v1',
    },
    auditEvents: [],
    screeningDecisions: [],
    aiSuggestionEvents: [],
    projectHistory: [],
    dualReviewResults: { A: {}, B: {}, final: {} },
    dualReviewConflictState: {},
    ...overrides,
  };
}

test('builds and diagnoses a current full-project package without changing app release identity', () => {
  const project = ProjectPackageEngine.buildProjectPackage(makeCurrentProject(), {
    timestamp: '2026-07-14T09:00:00.000Z',
  });
  const diagnosis = ProjectPackageEngine.diagnoseProjectPackage(project);

  assert.equal(project.packageType, 'full_project');
  assert.equal(project.packageSchema, 'project_package.v1.local');
  assert.equal(project.producer, 'PRISMA Workbench');
  assert.equal(project.version, '2.5-dual-review-release');
  assert.equal(project.timestamp, '2026-07-14T09:00:00.000Z');
  assert.equal(diagnosis.ok, true);
  assert.equal(diagnosis.kind, 'full_project');
  assert.deepEqual(diagnosis.errors, []);
  assert.equal(diagnosis.normalized.projectId, 'project-current');
});

test('accepts supported legacy project files with explicit compatibility warnings', () => {
  const legacy = makeCurrentProject({
    packageType: undefined,
    packageSchema: undefined,
    producer: undefined,
    producerVersion: undefined,
    version: '1.4',
    projectManifest: null,
    exclusionReasons: { population: true, intervention: true },
  });
  const diagnosis = ProjectPackageEngine.diagnoseProjectPackage(legacy);

  assert.equal(diagnosis.ok, true);
  assert.equal(diagnosis.kind, 'legacy_full_project');
  assert.ok(diagnosis.warnings.some((item) => item.code === 'legacy_package_contract'));
  assert.deepEqual(diagnosis.normalized.exclusionReasons, ['population', 'intervention']);
});

test('accepts every historical project release marker written by the public workspace', () => {
  const releaseMarkers = [
    '1.1',
    '1.4',
    '2.1-shell',
    '2.2-audit-shell',
    '2.3-prisma-traice-release',
    '2.5-dual-review-release',
  ];

  releaseMarkers.forEach((version) => {
    const diagnosis = ProjectPackageEngine.diagnoseProjectPackage(makeCurrentProject({
      packageType: undefined,
      packageSchema: undefined,
      producer: undefined,
      producerVersion: undefined,
      version,
    }));
    assert.equal(diagnosis.ok, true, `${version} should remain restorable`);
  });
});

test('normalizes the legacy collaborative project id alias', () => {
  const diagnosis = ProjectPackageEngine.diagnoseProjectPackage(makeCurrentProject({
    packageType: undefined,
    packageSchema: undefined,
    producer: undefined,
    producerVersion: undefined,
    version: '1.1',
    projectId: undefined,
    id: 'legacy-collaboration-project',
    projectManifest: {
      projectId: 'legacy-collaboration-project',
      appVersion: 'v2.5',
    },
  }));

  assert.equal(diagnosis.ok, true);
  assert.equal(diagnosis.normalized.projectId, 'legacy-collaboration-project');
});

test('infers dual review for legacy projects without a reviewMode field', () => {
  const diagnosis = ProjectPackageEngine.diagnoseProjectPackage(makeCurrentProject({
    packageType: undefined,
    packageSchema: undefined,
    producer: undefined,
    producerVersion: undefined,
    reviewMode: undefined,
    dualReviewResults: {
      A: { 0: { decision: 'include' } },
      B: { 0: { decision: 'exclude' } },
      final: {},
    },
  }));

  assert.equal(diagnosis.ok, true);
  assert.equal(diagnosis.normalized.reviewMode, 'dual');
  assert.equal(diagnosis.reviewModeSource, 'inferred');

  const collaboration = ProjectPackageEngine.diagnoseProjectPackage(makeCurrentProject({
    packageType: undefined,
    packageSchema: undefined,
    producer: undefined,
    producerVersion: undefined,
    version: '1.1',
    reviewMode: undefined,
    dualReviewResults: undefined,
    reviewers: { 'reviewer-a': { username: 'A' } },
  }));
  assert.equal(collaboration.normalized.reviewMode, 'dual');
  assert.equal(collaboration.reviewModeSource, 'inferred');
});

test('rejects malformed workflow state before restoration can mutate the workspace', () => {
  const malformedResults = ProjectPackageEngine.diagnoseProjectPackage(makeCurrentProject({
    screeningResults: {},
    currentStep: 4,
  }));
  const wrongArrayTypes = ProjectPackageEngine.diagnoseProjectPackage(makeCurrentProject({
    uploadedData: {},
  }));
  const malformedLedger = ProjectPackageEngine.diagnoseProjectPackage(makeCurrentProject({
    columnMapping: [],
    auditEvents: {},
  }));

  assert.equal(malformedResults.ok, false);
  assert.ok(malformedResults.errors.some((item) => item.code === 'invalid_screening_results'));
  assert.equal(wrongArrayTypes.ok, false);
  assert.ok(wrongArrayTypes.errors.some((item) => item.code === 'invalid_uploaded_data'));
  assert.equal(malformedLedger.ok, false);
  assert.ok(malformedLedger.errors.some((item) => item.code === 'invalid_column_mapping'));
  assert.ok(malformedLedger.errors.some((item) => item.code === 'invalid_auditEvents'));
});

test('rejects unrelated JSON and unsupported release markers', () => {
  const unrelated = ProjectPackageEngine.diagnoseProjectPackage({ version: 'anything' });
  const unsupported = ProjectPackageEngine.diagnoseProjectPackage(makeCurrentProject({
    version: '9.0-future',
    producerVersion: '9.0-future',
  }));

  assert.equal(unrelated.ok, false);
  assert.ok(unrelated.errors.some((item) => item.code === 'unsupported_release'));
  assert.ok(unrelated.errors.some((item) => item.code === 'missing_project_state'));
  assert.equal(unsupported.ok, false);
  assert.ok(unsupported.errors.some((item) => item.code === 'unsupported_release'));
});

test('routes reviewer files away from the full-project restore path', () => {
  const seed = ProjectPackageEngine.diagnoseProjectPackage({
    schemaVersion: 'reviewer_bundle.v1.local',
    bundleType: 'collaboration_seed',
    version: '2.5-dual-review-release',
    projectId: 'project-current',
    uploadedData: [],
  });
  const decisions = ProjectPackageEngine.diagnoseProjectPackage({
    schemaVersion: 'reviewer_bundle.v1.local',
    bundleType: 'reviewer_decision_bundle',
    reviewer: { reviewerId: 'reviewer-a' },
    screeningDecisions: [],
  });

  assert.equal(seed.ok, false);
  assert.equal(seed.kind, 'reviewer_bundle');
  assert.ok(seed.errors.some((item) => item.code === 'use_reviewer_bundle_flow'));
  assert.equal(decisions.ok, false);
  assert.equal(decisions.kind, 'reviewer_bundle');
});

test('rejects project and manifest identity mismatch before normalization', () => {
  const diagnosis = ProjectPackageEngine.diagnoseProjectPackage(makeCurrentProject({
    projectManifest: {
      projectId: 'another-project',
      appVersion: 'v2.5',
      schemaVersion: 'audit.v1',
    },
  }));

  assert.equal(diagnosis.ok, false);
  assert.ok(diagnosis.errors.some((item) => item.code === 'project_identity_mismatch'));
});

test('parses project text with diagnostics instead of throwing', () => {
  const malformed = ProjectPackageEngine.parseProjectPackageText('{bad-json');
  const scalar = ProjectPackageEngine.parseProjectPackageText('42');

  assert.equal(malformed.ok, false);
  assert.equal(malformed.kind, 'invalid_json');
  assert.ok(malformed.errors.some((item) => item.code === 'invalid_json'));
  assert.equal(scalar.ok, false);
  assert.ok(scalar.errors.some((item) => item.code === 'invalid_package_shape'));
});

test('diagnoses snapshot and autosave recovery candidates with identity and age checks', () => {
  const project = makeCurrentProject();
  const current = ProjectPackageEngine.diagnoseRecoveryCandidate(JSON.stringify(project), {
    source: 'project_snapshot',
    storageProjectId: 'project-current',
    now: Date.parse('2026-07-14T10:00:00.000Z'),
  });
  const staleAutosave = ProjectPackageEngine.diagnoseRecoveryCandidate(JSON.stringify(project), {
    source: 'autosave',
    storageProjectId: 'project-current',
    now: Date.parse('2026-08-14T10:00:00.000Z'),
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  });
  const mismatch = ProjectPackageEngine.diagnoseRecoveryCandidate(JSON.stringify(project), {
    source: 'project_snapshot',
    storageProjectId: 'wrong-project',
    now: Date.parse('2026-07-14T10:00:00.000Z'),
  });

  assert.equal(current.ok, true);
  assert.equal(current.projectId, 'project-current');
  assert.equal(staleAutosave.ok, false);
  assert.ok(staleAutosave.errors.some((item) => item.code === 'stale_recovery_candidate'));
  assert.equal(mismatch.ok, false);
  assert.ok(mismatch.errors.some((item) => item.code === 'storage_identity_mismatch'));
});

test('parses only the M3 start and review modes, including the legacy dual alias', () => {
  assert.deepEqual(ProjectPackageEngine.parseStartIntent('https://local.test/app/?start=demo&review=dual'), {
    startMode: 'demo',
    reviewMode: 'dual',
    warnings: [],
  });
  assert.equal(ProjectPackageEngine.parseStartIntent('https://local.test/app/?mode=dual').reviewMode, 'dual');

  const invalid = ProjectPackageEngine.parseStartIntent('https://local.test/app/?start=export&review=resolver');
  assert.equal(invalid.startMode, 'none');
  assert.equal(invalid.reviewMode, 'single');
  assert.equal(invalid.warnings.length, 2);
});

test('classifies browser storage failures for user-facing save diagnostics', () => {
  const quota = new Error('quota full');
  quota.name = 'QuotaExceededError';
  const unavailable = new Error('blocked');
  unavailable.name = 'SecurityError';

  assert.equal(ProjectPackageEngine.classifyStorageError(quota), 'quota_exceeded');
  assert.equal(ProjectPackageEngine.classifyStorageError(unavailable), 'storage_unavailable');
  assert.equal(ProjectPackageEngine.classifyStorageError(new Error('unknown')), 'storage_write_failed');
});
