import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const enginePath = path.join(repoRoot, 'literature-screening-v2.2/reviewer-bundle-engine.js');
const dualReviewEnginePath = path.join(repoRoot, 'literature-screening-v2.2/dual-review-engine.js');

function loadReviewerBundleEngine() {
  assert.equal(fs.existsSync(enginePath), true, 'reviewer-bundle-engine.js should exist');
  return requireFromRepo(enginePath);
}

function loadDualReviewEngine() {
  assert.equal(fs.existsSync(dualReviewEnginePath), true, 'dual-review-engine.js should exist');
  return requireFromRepo(dualReviewEnginePath);
}

function createBaseProjectState(overrides = {}) {
  return {
    currentProjectId: 'project-local-1',
    projectManifest: {
      project_id: 'project-local-1',
      version: '2.5-dual-review-release',
      created_at: '2026-06-09T00:00:00.000Z',
    },
    uploadedData: [
      { id: 'record-1', title: 'Trial 1', abstract: 'A study' },
      { id: 'record-2', title: 'Trial 2', abstract: 'Another study' },
    ],
    uploadedFiles: [{ name: 'source.ris', size: 1200, recordCount: 2 }],
    columnMapping: { title: 'title', abstract: 'abstract' },
    fileFormat: 'ris',
    formatSource: 'RIS',
    screeningResults: {
      included: [{ id: 'record-1', title: 'Trial 1' }],
      excluded: [{ id: 'record-2', title: 'Trial 2', _exclude_stage: 'title_abstract' }],
    },
    screeningDecisions: [
      {
        decisionId: 'ta-1',
        recordId: 'record-2',
        stage: 'title_abstract',
        reviewerId: 'reviewer_1',
        decision: 'exclude',
        exclusionReason: 'not relevant',
        updatedAt: '2026-06-09T01:00:00.000Z',
      },
      {
        decisionId: 'ft-a-1',
        recordId: 'record-1',
        stage: 'full_text',
        reviewerId: 'reviewer_A',
        decision: 'include',
        updatedAt: '2026-06-09T02:00:00.000Z',
      },
      {
        decisionId: 'ft-b-1',
        recordId: 'record-1',
        stage: 'full_text',
        reviewerId: 'reviewer_B',
        decision: 'exclude',
        exclusionReason: 'wrong population',
        updatedAt: '2026-06-09T02:01:00.000Z',
      },
    ],
    qualityAssessments: [
      {
        id: 'qa-record-1',
        record_id: 'record-1',
        reviewer_id: '',
        reviewer_assessments: {
          reviewer_A: {
            reviewer_id: 'reviewer_A',
            overall_judgement: 'low_risk',
            status: 'complete',
            updated_at: '2026-06-09T03:00:00.000Z',
          },
          reviewer_B: {
            reviewer_id: 'reviewer_B',
            overall_judgement: 'high_risk',
            status: 'complete',
            updated_at: '2026-06-09T03:01:00.000Z',
          },
        },
      },
    ],
    projectHistory: [{ id: 'history-1', reason: 'before_import' }],
    auditEvents: [{ eventType: 'record_imported', recordId: 'record-1' }],
    ...overrides,
  };
}

test('builds a collaboration seed package without reviewer decisions', () => {
  const ReviewerBundleEngine = loadReviewerBundleEngine();
  const projectState = createBaseProjectState();

  const seed = ReviewerBundleEngine.createCollaborationSeedPackage(projectState, {
    exportedAt: '2026-06-09T04:00:00.000Z',
  });

  assert.equal(seed.bundleType, 'collaboration_seed');
  assert.equal(seed.baseFingerprint, ReviewerBundleEngine.buildProjectBaseFingerprint(projectState));
  assert.deepEqual(seed.uploadedData, projectState.uploadedData);
  assert.deepEqual(seed.projectManifest, projectState.projectManifest);
  assert.equal(Array.isArray(seed.screeningDecisions), false);
  assert.equal(Array.isArray(seed.qualityAssessments), false);
  assert.equal(JSON.stringify(seed).includes('reviewer_A'), false);
  assert.equal(JSON.stringify(seed).includes('reviewer_B'), false);
});

test('builds a reviewer decision bundle with only one reviewer scope', () => {
  const ReviewerBundleEngine = loadReviewerBundleEngine();
  const projectState = createBaseProjectState();

  const bundle = ReviewerBundleEngine.createReviewerDecisionBundle(projectState, {
    reviewerId: 'reviewer_A',
    reviewerLabel: 'Reviewer A',
    exportedAt: '2026-06-09T04:05:00.000Z',
  });

  assert.equal(bundle.bundleType, 'reviewer_decision_bundle');
  assert.equal(bundle.reviewer.reviewerId, 'reviewer_A');
  assert.equal(bundle.baseFingerprint, ReviewerBundleEngine.buildProjectBaseFingerprint(projectState));
  assert.deepEqual(
    bundle.screeningDecisions.map((decision) => decision.decisionId),
    ['ft-a-1']
  );
  assert.deepEqual(Object.keys(bundle.qualityReviewerAssessments), ['record-1']);
  assert.deepEqual(Object.keys(bundle.qualityReviewerAssessments['record-1']), ['reviewer_A']);
  assert.equal(JSON.stringify(bundle).includes('reviewer_B'), false);
});

test('applies a reviewer decision bundle by merge, not full replacement', () => {
  const ReviewerBundleEngine = loadReviewerBundleEngine();
  const ownerState = createBaseProjectState({
    screeningDecisions: [
      {
        decisionId: 'ft-a-1',
        recordId: 'record-1',
        stage: 'full_text',
        reviewerId: 'reviewer_A',
        decision: 'include',
        updatedAt: '2026-06-09T02:00:00.000Z',
      },
    ],
    qualityAssessments: [
      {
        id: 'qa-record-1',
        record_id: 'record-1',
        reviewer_assessments: {
          reviewer_A: {
            reviewer_id: 'reviewer_A',
            overall_judgement: 'low_risk',
            status: 'complete',
            updated_at: '2026-06-09T03:00:00.000Z',
          },
        },
      },
    ],
  });
  const reviewerBState = createBaseProjectState({
    screeningDecisions: [
      {
        decisionId: 'ft-b-1',
        recordId: 'record-1',
        stage: 'full_text',
        reviewerId: 'reviewer_B',
        decision: 'exclude',
        exclusionReason: 'wrong population',
        updatedAt: '2026-06-09T02:01:00.000Z',
      },
    ],
    qualityAssessments: [
      {
        id: 'qa-record-1',
        record_id: 'record-1',
        reviewer_assessments: {
          reviewer_B: {
            reviewer_id: 'reviewer_B',
            overall_judgement: 'high_risk',
            status: 'complete',
            updated_at: '2026-06-09T03:01:00.000Z',
          },
        },
      },
    ],
  });
  const reviewerBBundle = ReviewerBundleEngine.createReviewerDecisionBundle(reviewerBState, {
    reviewerId: 'reviewer_B',
    exportedAt: '2026-06-09T04:10:00.000Z',
  });

  const merged = ReviewerBundleEngine.applyReviewerDecisionBundle(ownerState, reviewerBBundle);

  assert.deepEqual(merged.uploadedData, ownerState.uploadedData);
  assert.deepEqual(merged.projectManifest, ownerState.projectManifest);
  assert.equal(merged.screeningDecisions.length, 2);
  assert.deepEqual(merged.appliedReviewerBundleIds, [reviewerBBundle.bundleId]);
  assert.deepEqual(
    merged.screeningDecisions.map((decision) => decision.reviewerId).sort(),
    ['reviewer_A', 'reviewer_B']
  );
  assert.deepEqual(Object.keys(merged.qualityAssessments[0].reviewer_assessments).sort(), ['reviewer_A', 'reviewer_B']);
});

test('round-trips reviewer bundles into an unresolved dual-review conflict gate', () => {
  const ReviewerBundleEngine = loadReviewerBundleEngine();
  const DualReviewEngine = loadDualReviewEngine();
  const ownerState = createBaseProjectState({
    screeningDecisions: [],
    qualityAssessments: [],
  });

  const seed = ReviewerBundleEngine.createCollaborationSeedPackage(ownerState, {
    exportedAt: '2026-06-09T05:00:00.000Z',
  });
  const reviewerAState = {
    ...seed,
    screeningDecisions: [
      DualReviewEngine.createReviewerDecision({
        decisionId: 'bundle-a-include',
        recordId: 'record-1',
        stage: 'full_text',
        reviewerId: 'reviewer_A',
        decision: 'include',
        updatedAt: '2026-06-09T05:10:00.000Z',
      }),
    ],
  };
  const reviewerBState = {
    ...seed,
    screeningDecisions: [
      DualReviewEngine.createReviewerDecision({
        decisionId: 'bundle-b-exclude',
        recordId: 'record-1',
        stage: 'full_text',
        reviewerId: 'reviewer_B',
        decision: 'exclude',
        exclusionReason: 'wrong population',
        updatedAt: '2026-06-09T05:11:00.000Z',
      }),
    ],
  };
  const reviewerABundle = ReviewerBundleEngine.createReviewerDecisionBundle(reviewerAState, {
    reviewerId: 'reviewer_A',
    exportedAt: '2026-06-09T05:20:00.000Z',
  });
  const reviewerBBundle = ReviewerBundleEngine.createReviewerDecisionBundle(reviewerBState, {
    reviewerId: 'reviewer_B',
    exportedAt: '2026-06-09T05:21:00.000Z',
  });

  const afterReviewerA = ReviewerBundleEngine.applyReviewerDecisionBundle(ownerState, reviewerABundle);
  const mergedState = ReviewerBundleEngine.applyReviewerDecisionBundle(afterReviewerA, reviewerBBundle);
  const conflicts = DualReviewEngine.buildScreeningConflictQueue(
    mergedState.screeningDecisions,
    mergedState.screeningResults.included
  );
  const gate = DualReviewEngine.buildExportGateStatus({
    screeningConflicts: conflicts,
    qualityConflicts: [],
  });
  const agreement = DualReviewEngine.calculateScreeningAgreementMetrics(
    mergedState.screeningDecisions,
    mergedState.screeningResults.included
  );

  assert.equal(seed.bundleType, 'collaboration_seed');
  assert.equal(Array.isArray(seed.screeningDecisions), false);
  assert.equal(mergedState.screeningDecisions.length, 2);
  assert.deepEqual(mergedState.uploadedData, ownerState.uploadedData);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].recordId, 'record-1');
  assert.equal(conflicts[0].status, 'pending');
  assert.equal(gate.status, 'warning');
  assert.equal(gate.hasUnresolvedConflicts, true);
  assert.equal(gate.unresolvedConflictCount, 1);
  assert.equal(agreement.sampleSize, 1);
  assert.equal(agreement.disagreementPairCount, 1);
  assert.equal(agreement.pendingDisagreementCount, 1);
});

test('freezes the M4 cryptographic contract across seed and decision bundles', () => {
  const ReviewerBundleEngine = loadReviewerBundleEngine();
  const projectState = createBaseProjectState();
  const seed = ReviewerBundleEngine.createCollaborationSeedPackage(projectState, {
    reviewerId: 'reviewer_A',
    exportedAt: '2026-06-09T06:00:00.000Z',
  });
  const decision = ReviewerBundleEngine.createReviewerDecisionBundle(projectState, {
    reviewerId: 'reviewer_A',
    exportedAt: '2026-06-09T06:01:00.000Z',
  });

  [seed, decision].forEach((bundle) => {
    assert.equal(bundle.schemaVersion, 'reviewer_bundle.v1.local');
    assert.equal(bundle.contractVersion, 'm4.v1');
    assert.equal(bundle.integrity.algorithm, 'SHA-256');
    assert.match(bundle.sourceManifestHash, /^sha256:[0-9a-f]{64}$/);
    assert.match(bundle.recordsHash, /^sha256:[0-9a-f]{64}$/);
    assert.match(bundle.decisionsHash, /^sha256:[0-9a-f]{64}$/);
    assert.match(bundle.bundleId, /^rb-[0-9a-f]{64}$/);
    assert.equal(bundle.producer, 'PRISMA Workbench');
    assert.equal(bundle.producerVersion, '2.5-dual-review-release');
  });

  assert.deepEqual(ReviewerBundleEngine.diagnoseReviewerBundle(seed).errors, []);
  assert.deepEqual(ReviewerBundleEngine.diagnoseReviewerBundle(decision).errors, []);
});

test('uses the standard SHA-256 vector for deterministic bundle hashing', () => {
  const ReviewerBundleEngine = loadReviewerBundleEngine();
  const emptyPayloadHash = ReviewerBundleEngine.buildDecisionsHash([], {});
  assert.equal(emptyPayloadHash, 'sha256:ce4b4a2702612f1294f92d0ce8338dcfa19d4caeafc73e8cdf30b96c6a2a379d');
});

test('rejects tampered records, decisions, reviewer scope, and duplicate decision bundles', () => {
  const ReviewerBundleEngine = loadReviewerBundleEngine();
  const projectState = createBaseProjectState({ screeningDecisions: [] });
  const reviewerState = createBaseProjectState({
    screeningDecisions: [
      {
        decisionId: 'bundle-a-1',
        recordId: 'record-1',
        stage: 'full_text',
        reviewerId: 'reviewer_A',
        decision: 'include',
        updatedAt: '2026-06-09T06:10:00.000Z',
      },
    ],
  });
  const bundle = ReviewerBundleEngine.createReviewerDecisionBundle(reviewerState, {
    reviewerId: 'reviewer_A',
    exportedAt: '2026-06-09T06:11:00.000Z',
  });

  const seed = ReviewerBundleEngine.createCollaborationSeedPackage(projectState);
  const tamperedRecords = { ...seed, uploadedData: [{ id: 'changed-record' }] };
  assert.ok(ReviewerBundleEngine.diagnoseReviewerBundle(tamperedRecords).errors.some((item) => item.code === 'records_hash_mismatch'));

  const tamperedDecisions = { ...bundle, screeningDecisions: [{ ...bundle.screeningDecisions[0], decision: 'exclude' }] };
  assert.ok(ReviewerBundleEngine.diagnoseReviewerBundle(tamperedDecisions).errors.some((item) => item.code === 'decisions_hash_mismatch'));

  const wrongReviewer = { ...bundle, screeningDecisions: [{ ...bundle.screeningDecisions[0], reviewerId: 'reviewer_B' }] };
  assert.ok(ReviewerBundleEngine.diagnoseReviewerBundle(wrongReviewer).errors.some((item) => item.code === 'reviewer_scope_mismatch'));

  assert.throws(
    () => ReviewerBundleEngine.applyReviewerDecisionBundle({ ...projectState, auditEvents: [{ eventType: 'reviewer_decision_bundle_imported', after: { bundleId: bundle.bundleId } }] }, bundle),
    (error) => error.code === 'invalid_reviewer_bundle' && error.diagnosis.errors.some((item) => item.code === 'duplicate_bundle')
  );
});

test('rejects missing records and mismatched project identities before merge', () => {
  const ReviewerBundleEngine = loadReviewerBundleEngine();
  const projectState = createBaseProjectState({ screeningDecisions: [] });
  const bundle = ReviewerBundleEngine.createReviewerDecisionBundle(projectState, {
    reviewerId: 'reviewer_A',
    exportedAt: '2026-06-09T06:20:00.000Z',
  });

  assert.ok(ReviewerBundleEngine.diagnoseReviewerBundle(bundle, {
    projectState: { ...projectState, uploadedData: projectState.uploadedData.slice(0, 1) },
  }).errors.some((item) => item.code === 'record_count_mismatch'));
  assert.ok(ReviewerBundleEngine.diagnoseReviewerBundle(bundle, { projectId: 'another-project' }).errors.some((item) => item.code === 'project_identity_mismatch'));
  assert.throws(
    () => ReviewerBundleEngine.applyReviewerDecisionBundle({ ...projectState, currentProjectId: 'another-project' }, bundle),
    (error) => error.code === 'invalid_reviewer_bundle'
  );
});

test('imports a collaboration seed as a clean reviewer context', () => {
  const ReviewerBundleEngine = loadReviewerBundleEngine();
  const projectState = createBaseProjectState();
  const seed = ReviewerBundleEngine.createCollaborationSeedPackage(projectState);
  const reviewerContext = ReviewerBundleEngine.applyCollaborationSeedPackage({}, seed);

  assert.deepEqual(reviewerContext.uploadedData, projectState.uploadedData);
  assert.deepEqual(reviewerContext.uploadedFiles, projectState.uploadedFiles);
  assert.deepEqual(reviewerContext.screeningDecisions, []);
  assert.deepEqual(reviewerContext.qualityAssessments, []);
  assert.deepEqual(reviewerContext.auditEvents, []);
});
