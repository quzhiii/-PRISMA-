import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const DedupEngine = requireFromRepo(path.join(repoRoot, 'dedup-engine.js'));

const samplePath = path.join(repoRoot, 'literature-screening-v2.2', 'sample-data.json');
const guidePath = path.join(repoRoot, 'docs', 'demo', 'README.md');

function loadSampleRecords() {
  const parsed = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
  assert.equal(Array.isArray(parsed.data), true, 'sample-data.json must contain a data array');
  return parsed.data.map((record, index) => ({
    ...record,
    record_id: `demo-record-${String(index + 1).padStart(3, '0')}`,
    id: `demo-record-${String(index + 1).padStart(3, '0')}`,
    identifier_raw: record.doi || record.pmid || record.wanfang_id || record.vip_id || record.sinomed_id || '',
    publication_type: 'journal_article',
  }));
}

function countByDatabase(records) {
  return records.reduce((acc, record) => {
    acc[record.database] = (acc[record.database] || 0) + 1;
    return acc;
  }, {});
}

test('public demo data and guide stay aligned with DedupEngine output', () => {
  const records = loadSampleRecords();
  assert.equal(records.length, 21);
  assert.deepEqual(countByDatabase(records), {
    CNKI: 11,
    Wanfang: 2,
    VIP: 3,
    SinoMed: 2,
    PubMed: 3,
  });

  const dedup = DedupEngine.run(records, { mode: 'public-demo-consistency' });
  assert.equal(dedup.stats.inputRecords, 21);
  assert.equal(dedup.stats.retainedRecords, 20);
  assert.equal(dedup.stats.hardDuplicateCount, 1);
  assert.equal(dedup.stats.candidateDuplicateCount, 1);

  const [hardDuplicate] = dedup.hardDuplicates;
  assert.equal(hardDuplicate.reason.code, 'canonical_identifier_exact');
  assert.equal(hardDuplicate.reason.evidence.identifierType, 'doi');
  assert.equal(hardDuplicate.reason.evidence.identifier, '10.1234/tcm.2023.001');
  assert.equal(hardDuplicate.keptRecord.title, '中医药治疗原发性高血压的Meta分析');
  assert.equal(hardDuplicate.duplicateRecord.title, '中医药治疗原发性高血压的Meta分析');

  const [candidateDuplicate] = dedup.candidateDuplicates;
  assert.equal(candidateDuplicate.leftRecord.title, '针刺治疗高血压的临床研究');
  assert.equal(candidateDuplicate.rightRecord.title, '针刺治疗高血压的临床研究');
  assert.equal(candidateDuplicate.reason.code, 'title_year_author_overlap');
  assert.equal(candidateDuplicate.reason.evidence.title, DedupEngine.normalizeTitle('针刺治疗高血压的临床研究'));
  assert.equal(candidateDuplicate.reason.evidence.year, '2022');

  const hardDuplicateRecordIds = new Set(dedup.hardDuplicates.map((entry) => entry.duplicateRecord.record_id));
  assert.equal(hardDuplicateRecordIds.has(candidateDuplicate.leftRecord.record_id), false);
  assert.equal(hardDuplicateRecordIds.has(candidateDuplicate.rightRecord.record_id), false);
  assert.equal(
    dedup.retainedRecords.filter((record) => record.title === '针刺治疗高血压的临床研究').length,
    2,
    'candidate duplicate records must remain retained for human review',
  );

  const guide = fs.readFileSync(guidePath, 'utf8');
  assert.doesNotMatch(guide, /22 records imported/);
  assert.doesNotMatch(guide, /The demo dataset contains 22 records/);
  assert.doesNotMatch(guide, /\| CNKI \| 10 \|/);
  assert.doesNotMatch(guide, /\| Wanfang \| 3 \|/);
  assert.doesNotMatch(guide, /\| SinoMed \| 3 \|/);
  assert.match(guide, /The demo dataset contains 21 records/);
  assert.match(guide, /\| CNKI \| 11 \|/);
  assert.match(guide, /\| Wanfang \| 2 \|/);
  assert.match(guide, /\| SinoMed \| 2 \|/);
  assert.match(guide, /1 title candidate duplicate identified by the current `DedupEngine\.run` output/);
  assert.match(guide, /must be confirmed by a human reviewer and are not automatically removed/);
});
