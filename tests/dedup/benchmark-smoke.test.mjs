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

test('synthetic fixtures load successfully', async () => {
  const { loadAllDatasets } = await importFromRepo('scripts/dedup/load-records.mjs');
  const result = await loadAllDatasets({ repoRoot });
  const syntheticDatasets = result.datasets.filter((dataset) => dataset.sourceType === 'synthetic');

  assert.ok(syntheticDatasets.length > 0, 'expected at least one synthetic dataset');
  assert.ok(
    syntheticDatasets.every((dataset) => Array.isArray(dataset.records) && dataset.records.length > 0),
    'expected every synthetic dataset to provide records',
  );
});

test('manifest includes real-rdf-001', async () => {
  const { loadManifest } = await importFromRepo('scripts/dedup/load-records.mjs');
  const manifest = await loadManifest({ repoRoot });

  assert.ok(
    manifest.some((dataset) => dataset.datasetId === 'real-rdf-001'),
    'expected benchmark manifest to include real-rdf-001',
  );
});

test('benchmark runner rejects an unknown target', async () => {
  const { main } = await importFromRepo('scripts/dedup/run-benchmark.mjs');
  const capturedErrors = [];

  const exitCode = await main(['--target', 'does-not-exist'], {
    repoRoot,
    stdout: { write() {} },
    stderr: { write(chunk) { capturedErrors.push(String(chunk)); } },
  });

  assert.notEqual(exitCode, 0, 'expected unknown benchmark target to exit non-zero');
  assert.match(capturedErrors.join(''), /unknown target/i);
});
