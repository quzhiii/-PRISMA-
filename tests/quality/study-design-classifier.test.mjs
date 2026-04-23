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
