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
const QualityEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/quality-engine.js'));

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
  assert.equal(rctAssessment.tool_family, QualityEngine.TOOL_FAMILIES.ROB2);
  assert.equal(rctAssessment.template_id, 'rct_rob2_v24_alpha');
  assert.equal(rctAssessment.domain_scores.length, 6);
  assert.equal(rctAssessment.evidence_initial, QualityEngine.EVIDENCE_LEVELS.HIGH);
  assert.equal(reviewAssessment.study_design, QualityEngine.STUDY_DESIGN_FAMILIES.SYSTEMATIC_REVIEW);
  assert.equal(reviewAssessment.tool_family, QualityEngine.TOOL_FAMILIES.AMSTAR_2);
  assert.equal(reviewAssessment.template_id, 'systematic_review_amstar2_robis_v24_alpha');
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
  assert.equal(assessment.tool_family, QualityEngine.TOOL_FAMILIES.AMSTAR_2);
  assert.equal(assessment.evidence_initial, QualityEngine.EVIDENCE_LEVELS.HIGH);
});

test('quality engine serializes quality_appraisal.csv with domain rows and escaping', () => {
  const assessment = QualityEngine.createQualityAssessment(
    {
      id: 'record-rct',
      title: 'Randomized trial, with quote "marker"',
      abstract: 'A randomized controlled trial with blinded outcome assessment.',
    },
    {
      domainScores: [
        {
          domain_id: 'randomization',
          judgement: 'low_risk',
          supporting_quote: 'Random sequence generation described.',
          reviewer_note: 'Checked protocol.',
        },
      ],
      overallJudgement: 'some_concerns',
      status: QualityEngine.ASSESSMENT_STATUS.IN_PROGRESS,
      updatedAt: '2026-05-11T00:00:00.000Z',
    }
  );

  const csv = QualityEngine.serializeQualityAppraisalCsv([assessment]);
  const lines = csv.split('\n');

  assert.equal(
    lines[0],
    'assessment_id,record_id,title,study_type,tool_family,template_id,domain,judgement,supporting_quote,reviewer_note,overall_judgement,status,updated_at'
  );
  assert.equal(lines.length, 7);
  assert.match(csv, /qa-record-rct,record-rct,"Randomized trial, with quote ""marker""",rct,rob2,rct_rob2_v24_alpha,randomization,low_risk/);
  assert.match(csv, /allocation_concealment,not_assessed/);
  assert.match(csv, /some_concerns,in_progress,2026-05-11T00:00:00.000Z/);
});

test('quality engine serializes evidence_table.csv from included records and quality assessments', () => {
  const record = {
    id: 'record-evidence',
    title: 'Cohort study of hospital payment reform',
    authors: 'Chen A; Li B',
    year: '2024',
    abstract: 'A cohort study evaluated policy exposure and patient outcomes.',
    population: 'Tertiary hospital patients',
    exposure: 'Payment reform',
    comparator: 'Usual payment',
    primary_outcome: 'Length of stay',
    effect_measure: 'mean difference',
    effect_estimate: '-1.2 days',
  };
  const assessment = QualityEngine.createQualityAssessment(record, {
    recordId: 'record-evidence',
    overallJudgement: 'some_concerns',
    evidenceFinal: QualityEngine.EVIDENCE_LEVELS.LOW,
    notes: 'Needs manual GRADE confirmation.',
    updatedAt: '2026-05-11T00:00:00.000Z',
  });

  const csv = QualityEngine.serializeEvidenceTableCsv([record], [assessment]);
  const lines = csv.split('\n');

  assert.equal(
    lines[0],
    'record_id,title,authors,year,study_design,population,intervention,comparison,outcome,effect_measure,effect_estimate,quality_judgement,certainty_of_evidence,notes'
  );
  assert.equal(lines.length, 2);
  assert.match(csv, /record-evidence,Cohort study of hospital payment reform,Chen A; Li B,2024,cohort,Tertiary hospital patients,Payment reform,Usual payment,Length of stay,mean difference,-1\.2 days,some_concerns,low,Needs manual GRADE confirmation\./);
});
