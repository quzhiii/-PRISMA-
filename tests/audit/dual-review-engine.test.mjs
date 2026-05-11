import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const DualReviewEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/dual-review-engine.js'));

test('keeps reviewer A and reviewer B full-text decisions isolated', () => {
  const decisions = [
    DualReviewEngine.createReviewerDecision({
      recordId: 'record-1',
      stage: 'full_text',
      reviewerId: 'reviewer_A',
      selection: '',
      updatedAt: '2026-05-11T01:00:00.000Z',
    }),
    DualReviewEngine.createReviewerDecision({
      recordId: 'record-1',
      stage: 'full_text',
      reviewerId: 'reviewer_B',
      selection: 'wrong_population',
      updatedAt: '2026-05-11T01:01:00.000Z',
    }),
  ];

  const latest = DualReviewEngine.getLatestScreeningDecisions(decisions);

  assert.equal(latest.length, 2);
  assert.equal(latest.find((decision) => decision.reviewerId === 'reviewer_A').decision, 'include');
  assert.equal(latest.find((decision) => decision.reviewerId === 'reviewer_B').decision, 'exclude');
});

test('builds screening conflict queue and resolver audit event', () => {
  const decisions = [
    DualReviewEngine.createReviewerDecision({
      recordId: 'record-1',
      stage: 'full_text',
      reviewerId: 'reviewer_A',
      selection: '',
    }),
    DualReviewEngine.createReviewerDecision({
      recordId: 'record-1',
      stage: 'full_text',
      reviewerId: 'reviewer_B',
      selection: 'wrong_population',
    }),
  ];
  const conflicts = DualReviewEngine.buildScreeningConflictQueue(decisions, [{ id: 'record-1', title: 'Trial' }]);

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].status, 'pending');
  assert.equal(conflicts[0].reviewerA.decision, 'include');
  assert.equal(conflicts[0].reviewerB.exclusionReason, 'wrong_population');

  const finalDecision = DualReviewEngine.createResolverScreeningDecision(conflicts[0], {
    projectId: 'project-1',
    selection: 'wrong_population',
    resolverId: 'resolver_1',
    notes: 'Consensus after discussion.',
  });
  const event = DualReviewEngine.createResolverAuditEvent(conflicts[0], finalDecision);
  const resolvedConflicts = DualReviewEngine.buildScreeningConflictQueue([...decisions, finalDecision], [{ id: 'record-1' }]);

  assert.equal(finalDecision.decision, 'exclude');
  assert.equal(finalDecision.conflictStatus, 'resolved');
  assert.equal(finalDecision.metadata.resolverAction, true);
  assert.equal(event.eventType, 'review_conflict_resolved');
  assert.equal(event.after.finalDecision, 'exclude');
  assert.equal(resolvedConflicts[0].status, 'resolved');
});

test('calculates percent agreement and Cohen kappa for reviewer decisions', () => {
  const metrics = DualReviewEngine.calculateAgreementMetrics(
    [
      { decision: 'include' },
      { decision: 'exclude', exclusionReason: 'wrong_population' },
      { decision: 'uncertain' },
      { decision: 'include' },
    ],
    [
      { decision: 'include' },
      { decision: 'exclude', exclusionReason: 'wrong_population' },
      { decision: 'include' },
      { decision: 'exclude', exclusionReason: 'wrong_outcome' },
    ]
  );

  assert.equal(metrics.sampleSize, 4);
  assert.equal(metrics.agreementCount, 2);
  assert.equal(metrics.disagreementCount, 2);
  assert.equal(metrics.percentAgreement, 0.5);
  assert.equal(typeof metrics.kappa, 'number');
  assert.ok(metrics.categories.includes('include'));
});

test('detects minimal quality appraisal conflicts across overall, status, and domains', () => {
  const conflicts = DualReviewEngine.buildQualityConflictQueue([
    {
      assessment_id: 'qa-a',
      record_id: 'record-quality',
      reviewer_id: 'reviewer_A',
      overall_judgement: 'low_risk',
      status: 'complete',
      domain_scores: [{ domain_id: 'randomization', judgement: 'low_risk' }],
      updated_at: '2026-05-11T02:00:00.000Z',
    },
    {
      assessment_id: 'qa-b',
      record_id: 'record-quality',
      reviewer_id: 'reviewer_B',
      overall_judgement: 'some_concerns',
      status: 'in_progress',
      domain_scores: [{ domain_id: 'randomization', judgement: 'high_risk' }],
      updated_at: '2026-05-11T02:01:00.000Z',
    },
  ]);

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].status, 'pending');
  assert.deepEqual(
    conflicts[0].differences.map((difference) => difference.field).sort(),
    ['domain:randomization', 'overall_judgement', 'status']
  );
});

test('summarizes export gate warnings for unresolved conflicts', () => {
  const gate = DualReviewEngine.buildExportGateStatus({
    screeningConflicts: [{ status: 'pending' }, { status: 'resolved' }],
    qualityConflicts: [{ status: 'pending' }],
  });

  assert.equal(gate.status, 'warning');
  assert.equal(gate.hasUnresolvedConflicts, true);
  assert.equal(gate.unresolvedConflictCount, 2);
  assert.equal(gate.unresolvedScreeningConflictCount, 1);
  assert.equal(gate.unresolvedQualityConflictCount, 1);
  assert.equal(gate.warnings.length, 2);
});
