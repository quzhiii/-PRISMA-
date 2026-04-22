import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const DedupEngine = requireFromRepo(path.join(repoRoot, 'dedup-engine.js'));

function extractFunctionBlock(source, functionName) {
  const marker = `function ${functionName}(`;
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`Function not found: ${functionName}`);
  }

  const braceStart = source.indexOf('{', start);
  let depth = 0;
  let index = braceStart;

  for (; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        index += 1;
        break;
      }
    }
  }

  return source.slice(start, index);
}

async function loadAppDedupHarness(relativePath) {
  const source = await fs.readFile(path.join(repoRoot, relativePath), 'utf8');
  const code = [
    'let columnMapping = { title: "title", abstract: "abstract", keywords: "keywords", doi: "doi", year: "year", pages: "pages", journal: "journal", authors: "authors", publication_type: "publication_type" };',
    extractFunctionBlock(source, 'getValue'),
    extractFunctionBlock(source, 'normalizeTitle'),
    extractFunctionBlock(source, 'detectLanguage'),
    extractFunctionBlock(source, 'runDedupForScreening'),
    'this.__exports = { runDedupForScreening };',
  ].join('\n\n');

  const context = { console, DedupEngine };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.__exports;
}

async function loadDataset(datasetId) {
  const loader = await import(pathToFileURL(path.join(repoRoot, 'scripts/dedup/load-records.mjs')).href);
  return loader.loadDataset(datasetId, { repoRoot });
}

async function assertAppWrapperMatchesEngine(relativePath, datasetId) {
  const [{ runDedupForScreening }, dataset] = await Promise.all([
    loadAppDedupHarness(relativePath),
    loadDataset(datasetId),
  ]);

  const engineResult = DedupEngine.run(dataset.records);
  const appResult = runDedupForScreening(dataset.records);

  assert.equal(appResult.deduped.length, engineResult.retainedRecords.length);
  assert.equal(appResult.duplicates.length, engineResult.hardDuplicates.length);
  assert.equal(appResult.candidateDuplicates.length, engineResult.candidateDuplicates.length);
  assert.equal(appResult.counts.duplicates, engineResult.hardDuplicates.length);
  assert.equal(appResult.counts.after_dupes, engineResult.retainedRecords.length);
  assert.equal(appResult.counts.candidate_duplicates, engineResult.candidateDuplicates.length);
}

test('root app dedup wrapper separates hard duplicates from candidate duplicates', async () => {
  await assertAppWrapperMatchesEngine('app.js', 'dedup-case-007');
});

test('v2 app dedup wrapper separates hard duplicates from candidate duplicates', async () => {
  await assertAppWrapperMatchesEngine('literature-screening-v2.0/app.js', 'dedup-case-007');
});

test('root app real-rdf dedup exposes the additional normalization-driven duplicate-like case', async () => {
  const [{ runDedupForScreening }, dataset] = await Promise.all([
    loadAppDedupHarness('app.js'),
    loadDataset('real-rdf-001'),
  ]);

  const result = runDedupForScreening(dataset.records);

  assert.equal(result.counts.duplicates, 4);
  assert.ok(result.counts.candidate_duplicates >= 0, 'expected candidate duplicate count to be reported');
  assert.ok(result.counts.duplicates + result.counts.candidate_duplicates >= 4, 'expected duplicate-like findings to improve beyond the baseline of 2');
});

test('v2 app real-rdf dedup exposes the additional normalization-driven duplicate-like case', async () => {
  const [{ runDedupForScreening }, dataset] = await Promise.all([
    loadAppDedupHarness('literature-screening-v2.0/app.js'),
    loadDataset('real-rdf-001'),
  ]);

  const result = runDedupForScreening(dataset.records);

  assert.equal(result.counts.duplicates, 4);
  assert.ok(result.counts.candidate_duplicates >= 0, 'expected candidate duplicate count to be reported');
  assert.ok(result.counts.duplicates + result.counts.candidate_duplicates >= 4, 'expected duplicate-like findings to improve beyond the baseline of 2');
});

