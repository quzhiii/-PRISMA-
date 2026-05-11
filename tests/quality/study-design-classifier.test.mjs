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

test('study-design classifier covers Tier 1 fixture records', async () => {
  const fixtures = await loadFixtures();

  fixtures.forEach((entry) => {
    const detected = QualityEngine.detectStudyDesignFamily(entry.record);
    assert.equal(detected, entry.studyType, `expected ${entry.id} to classify as ${entry.studyType}`);
  });
});

test('study-design classifier keeps unrecognized text in the generic bucket', () => {
  const detected = QualityEngine.detectStudyDesignFamily({
    title: 'Editorial note on the future of evidence synthesis',
    abstract: 'This editorial discusses future directions in evidence synthesis.',
  });

  assert.equal(detected, QualityEngine.STUDY_DESIGN_FAMILIES.OTHER);
});

test('study-design classifier reads title and abstract aliases from imported records', () => {
  const detected = QualityEngine.detectStudyDesignFamily({
    T1: 'Randomized controlled trial of acupuncture for migraine',
    N2: 'This randomized controlled trial evaluates acupuncture for migraine prevention.',
    PT: 'journalArticle',
  });

  assert.equal(detected, QualityEngine.STUDY_DESIGN_FAMILIES.RCT);
});

test('study-design classifier detects diagnostic accuracy records', () => {
  const detected = QualityEngine.detectStudyDesignFamily({
    title: 'Diagnostic accuracy of ultrasound for appendicitis',
    abstract: 'The index test sensitivity and specificity were compared with a reference standard.',
    publication_type: 'journalArticle',
  });

  assert.equal(detected, QualityEngine.STUDY_DESIGN_FAMILIES.DIAGNOSTIC_ACCURACY);
});

test('V2.4-alpha quality template schema covers priority study families', () => {
  const expectedStudyTypes = [
    QualityEngine.STUDY_DESIGN_FAMILIES.RCT,
    QualityEngine.STUDY_DESIGN_FAMILIES.COHORT,
    QualityEngine.STUDY_DESIGN_FAMILIES.CASE_CONTROL,
    QualityEngine.STUDY_DESIGN_FAMILIES.CROSS_SECTIONAL,
    QualityEngine.STUDY_DESIGN_FAMILIES.DIAGNOSTIC_ACCURACY,
    QualityEngine.STUDY_DESIGN_FAMILIES.SYSTEMATIC_REVIEW,
  ];
  const templates = QualityEngine.listQualityTemplates();

  assert.equal(templates.length, expectedStudyTypes.length);
  expectedStudyTypes.forEach((studyType) => {
    const template = QualityEngine.getQualityTemplate(studyType);
    assert.equal(template.study_type, studyType);
    assert.equal(template.schema_version, QualityEngine.QUALITY_APPRAISAL_SCHEMA_VERSION);
    assert.equal(template.version, QualityEngine.QUALITY_TEMPLATE_VERSION);
    assert.deepEqual(template.judgement_options, [
      'low_risk',
      'some_concerns',
      'high_risk',
      'unclear',
      'not_applicable',
      'not_assessed',
    ]);
    assert.ok(template.template_id.endsWith('_v24_alpha'));
    assert.ok(template.recommended_tool_family);
    assert.ok(template.required_fields.length > 0);
    assert.ok(template.domains.length > 0);
    assert.deepEqual(template.export_format, QualityEngine.QUALITY_EXPORT_COLUMNS);
  });
});
