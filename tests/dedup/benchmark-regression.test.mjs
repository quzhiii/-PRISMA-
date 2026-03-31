import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

async function importFromRepo(relativePath) {
  const moduleUrl = pathToFileURL(path.join(repoRoot, relativePath)).href;
  return import(moduleUrl);
}

async function runDataset(target, datasetId) {
  const { runBenchmark } = await importFromRepo('scripts/dedup/run-benchmark.mjs');
  const result = await runBenchmark({ target, datasetId, repoRoot });
  return result.datasets[0];
}

test('dedup-vnext improves DOI normalization and missing-identifier benchmark cases', async () => {
  const [baseline002, vnext002, baseline007, vnext007] = await Promise.all([
    runDataset('root-app', 'dedup-case-002'),
    runDataset('dedup-vnext', 'dedup-case-002'),
    runDataset('root-app', 'dedup-case-007'),
    runDataset('dedup-vnext', 'dedup-case-007'),
  ]);

  assert.equal(baseline002.duplicateLikeFindings, 0);
  assert.equal(vnext002.hardDuplicateRecords, 1);
  assert.equal(vnext002.candidateDuplicatePairs, 0);
  assert.ok(vnext002.duplicateLikeFindings > baseline002.duplicateLikeFindings);

  assert.equal(baseline007.duplicateLikeFindings, 0);
  assert.equal(vnext007.hardDuplicateRecords, 0);
  assert.equal(vnext007.candidateDuplicatePairs, 1);
  assert.ok(vnext007.duplicateLikeFindings > baseline007.duplicateLikeFindings);
});

test('dedup-vnext improves real-rdf duplicate-like discovery without broadening protected merges', async () => {
  const [baselineReal, vnextReal, case008, case009, case011] = await Promise.all([
    runDataset('root-app', 'real-rdf-001'),
    runDataset('dedup-vnext', 'real-rdf-001'),
    runDataset('dedup-vnext', 'dedup-case-008'),
    runDataset('dedup-vnext', 'dedup-case-009'),
    runDataset('dedup-vnext', 'dedup-case-011'),
  ]);

  assert.equal(baselineReal.hardDuplicateRecords, 2);
  assert.equal(baselineReal.candidateDuplicatePairs, 0);
  assert.equal(vnextReal.hardDuplicateRecords, 4);
  assert.equal(vnextReal.candidateDuplicatePairs, 0);
  assert.ok(vnextReal.duplicateLikeFindings > baselineReal.duplicateLikeFindings);

  [case008, case009, case011].forEach((dataset) => {
    assert.equal(dataset.hardDuplicateRecords, 0, `expected no hard duplicates for ${dataset.datasetId}`);
    assert.equal(dataset.candidateDuplicatePairs, 0, `expected no candidate duplicates for ${dataset.datasetId}`);
    assert.equal(dataset.retainedRecords, dataset.inputRecords, `expected all records retained for ${dataset.datasetId}`);
  });
});
