import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);

function loadEngine() {
  return requireFromRepo(path.join(repoRoot, 'dedup-engine.js'));
}

function buildRecord(overrides = {}) {
  return {
    record_id: overrides.record_id || 'r',
    title: overrides.title || 'Effect of acupuncture on chronic low back pain',
    authors: overrides.authors || 'Smith J; Lee K',
    year: overrides.year || '2023',
    journal: overrides.journal || 'Pain Medicine',
    pages: overrides.pages || '101-110',
    doi: overrides.doi || '',
    identifier_raw: Object.prototype.hasOwnProperty.call(overrides, 'identifier_raw') ? overrides.identifier_raw : (overrides.doi || ''),
    publication_type: overrides.publication_type || 'journal_article',
    abstract: overrides.abstract || 'Randomized trial of acupuncture for chronic low back pain.',
    ...overrides,
  };
}

test('canonicalizeIdentifier collapses raw DOI and DOI URL to the same value', () => {
  const engine = loadEngine();

  assert.equal(
    engine.canonicalizeIdentifier('10.1000/acu.2023.001'),
    '10.1000/acu.2023.001',
  );
  assert.equal(
    engine.canonicalizeIdentifier('https://doi.org/10.1000/acu.2023.001'),
    '10.1000/acu.2023.001',
  );
  assert.equal(
    engine.canonicalizeIdentifier('DOI 10.1000/acu.2023.001'),
    '10.1000/acu.2023.001',
  );
});

test('canonicalizeIdentifier collapses CNKI DOI URLs when they contain a DOI payload', () => {
  const engine = loadEngine();

  assert.equal(
    engine.canonicalizeIdentifier('https://link.cnki.net/doi/10.14055/j.cnki.33-1056/f.2021.12.003'),
    '10.14055/j.cnki.33-1056/f.2021.12.003',
  );
  assert.equal(
    engine.canonicalizeIdentifier('https://doi.org/10.14055/j.cnki.33-1056/f.2021.12.003'),
    '10.14055/j.cnki.33-1056/f.2021.12.003',
  );
});

test('canonicalizeIdentifier collapses PMC article URLs to a shared PMCID value', () => {
  const engine = loadEngine();

  assert.equal(
    engine.canonicalizeIdentifier('https://pmc.ncbi.nlm.nih.gov/articles/PMC11305929/'),
    'pmc11305929',
  );
  assert.equal(
    engine.canonicalizeIdentifier('https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11305929/'),
    'pmc11305929',
  );
  assert.equal(
    engine.canonicalizeIdentifier('https://europepmc.org/articles/PMC11305929?pdf=render'),
    'pmc11305929',
  );
});

test('hard duplicates are auto-resolved only for safe cases', () => {
  const engine = loadEngine();
  const records = [
    buildRecord({ record_id: 'r1', doi: '10.1000/acu.2023.001', identifier_raw: '10.1000/acu.2023.001' }),
    buildRecord({ record_id: 'r2', doi: 'https://doi.org/10.1000/acu.2023.001', identifier_raw: 'https://doi.org/10.1000/acu.2023.001' }),
  ];

  const result = engine.run(records);

  assert.equal(result.retainedRecords.length, 1);
  assert.equal(result.hardDuplicates.length, 1);
  assert.equal(result.candidateDuplicates.length, 0);
  assert.equal(result.hardDuplicates[0].reason.code, 'canonical_identifier_exact');
});

test('likely duplicates are surfaced as candidates, not auto-deleted', () => {
  const engine = loadEngine();
  const records = [
    buildRecord({ record_id: 'r1', doi: '10.1000/acu.2023.001', identifier_raw: '10.1000/acu.2023.001' }),
    buildRecord({ record_id: 'r2', doi: '', identifier_raw: '', source_file: 'cnki.enw' }),
  ];

  const result = engine.run(records);

  assert.equal(result.retainedRecords.length, 2);
  assert.equal(result.hardDuplicates.length, 0);
  assert.equal(result.candidateDuplicates.length, 1);
  assert.equal(result.candidateDuplicates[0].reason.code, 'title_year_pages_overlap');
});

test('protocol and final article remain distinct', () => {
  const engine = loadEngine();
  const records = [
    buildRecord({
      record_id: 'r1',
      title: 'Protocol for a randomized trial of acupuncture for chronic low back pain',
      year: '2022',
      pages: 'e001-e010',
      doi: '10.1000/acu.2022.proto',
      identifier_raw: '10.1000/acu.2022.proto',
      publication_type: 'protocol',
    }),
    buildRecord({
      record_id: 'r2',
      title: 'Effect of acupuncture on chronic low back pain',
      year: '2024',
      pages: '101-110',
      doi: '10.1000/acu.2024.002',
      identifier_raw: '10.1000/acu.2024.002',
      publication_type: 'journal_article',
    }),
  ];

  const result = engine.run(records);

  assert.equal(result.retainedRecords.length, 2);
  assert.equal(result.hardDuplicates.length, 0);
  assert.equal(result.candidateDuplicates.length, 0);
});

test('conference abstract and final article remain distinct', () => {
  const engine = loadEngine();
  const records = [
    buildRecord({
      record_id: 'r1',
      title: 'Effect of acupuncture on chronic low back pain: conference abstract',
      year: '2023',
      journal: 'Pain Congress Abstracts',
      pages: 'A45',
      doi: '',
      identifier_raw: '',
      publication_type: 'conference_abstract',
      abstract: 'Conference abstract reporting preliminary trial results.',
    }),
    buildRecord({
      record_id: 'r2',
      title: 'Effect of acupuncture on chronic low back pain',
      year: '2024',
      journal: 'Pain Medicine',
      pages: '101-110',
      doi: '10.1000/acu.2024.002',
      identifier_raw: '10.1000/acu.2024.002',
      publication_type: 'journal_article',
      abstract: 'Full randomized trial publication with complete outcomes.',
    }),
  ];

  const result = engine.run(records);

  assert.equal(result.retainedRecords.length, 2);
  assert.equal(result.hardDuplicates.length, 0);
  assert.equal(result.candidateDuplicates.length, 0);
});

