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
const QualityEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.0/quality-engine.js'));

async function loadFixtures() {
  const raw = await fs.readFile(path.join(repoRoot, 'tests/fixtures/quality/tier1-study-designs.json'), 'utf8');
  return JSON.parse(raw);
}

test('quality engine creates Tier 1 baseline assessments', async () => {
  const fixtures = await loadFixtures();
  const rct = fixtures.find((entry) => entry.id === 'fixture-rct');
  const review = fixtures.find((entry) => entry.id === 'fixture-review');

  const rctAssessment = QualityEngine.createQualityAssessment(rct.record);
  const reviewAssessment = QualityEngine.createQualityAssessment(review.record);

  assert.equal(rctAssessment.study_design, QualityEngine.STUDY_DESIGN_FAMILIES.RCT);
  assert.equal(rctAssessment.tool_family, QualityEngine.TOOL_FAMILIES.ROB2_LITE);
  assert.equal(rctAssessment.evidence_initial, QualityEngine.EVIDENCE_LEVELS.HIGH);
  assert.equal(reviewAssessment.study_design, QualityEngine.STUDY_DESIGN_FAMILIES.SYSTEMATIC_REVIEW);
  assert.equal(reviewAssessment.tool_family, QualityEngine.TOOL_FAMILIES.AMSTAR2_LITE);
});

test('quality engine downgrades evidence for high overall risk', () => {
  const assessment = QualityEngine.createQualityAssessment(
    {
      id: 'risk-rct',
      title: 'Randomized trial with major bias concerns',
      abstract: 'This randomized controlled trial had significant allocation concerns.',
    },
    {
      overallRisk: 'high',
      status: QualityEngine.ASSESSMENT_STATUS.IN_PROGRESS,
    }
  );

  assert.equal(assessment.status, QualityEngine.ASSESSMENT_STATUS.IN_PROGRESS);
  assert.equal(assessment.evidence_initial, QualityEngine.EVIDENCE_LEVELS.HIGH);
  assert.equal(assessment.evidence_final, QualityEngine.EVIDENCE_LEVELS.MODERATE);
  assert.deepEqual(
    assessment.evidence_adjustments.map((entry) => entry.reason),
    ['overall_risk_high']
  );
});

test('quality engine hydrates assessment fields from import aliases', () => {
  const assessment = QualityEngine.createQualityAssessment({
    TI: 'Systematic review and meta-analysis of acupuncture for chronic pain',
    AB: 'We conducted a systematic review and meta-analysis of randomized trials.',
    TY: 'review',
    OT: ['acupuncture', 'meta-analysis'],
  });

  assert.equal(
    assessment.record_id,
    'Systematic review and meta-analysis of acupuncture for chronic pain'
  );
  assert.equal(
    assessment.title,
    'Systematic review and meta-analysis of acupuncture for chronic pain'
  );
  assert.equal(
    assessment.abstract,
    'We conducted a systematic review and meta-analysis of randomized trials.'
  );
  assert.equal(assessment.publication_type, 'review');
  assert.equal(
    assessment.study_design,
    QualityEngine.STUDY_DESIGN_FAMILIES.SYSTEMATIC_REVIEW
  );
  assert.equal(assessment.tool_family, QualityEngine.TOOL_FAMILIES.AMSTAR2_LITE);
  assert.equal(assessment.evidence_initial, QualityEngine.EVIDENCE_LEVELS.HIGH);
});
