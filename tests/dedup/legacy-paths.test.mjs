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

async function loadDataset(datasetId) {
  const loader = await import(pathToFileURL(path.join(repoRoot, 'scripts/dedup/load-records.mjs')).href);
  return loader.loadDataset(datasetId, { repoRoot });
}

async function loadPatchContext(relativePath, uploadedData) {
  const source = await fs.readFile(path.join(repoRoot, relativePath), 'utf8');
  const downloads = [];
  const context = {
    console,
    DedupEngine,
    uploadedData,
    window: {},
    document: {
      getElementById() { return null; },
      querySelectorAll() { return []; },
      querySelector() { return null; },
    },
    setTimeout(fn) { fn(); return 0; },
    showLoading() {},
    hideLoading() {},
    showToast() {},
    setStep() {},
    updateStepIndicator() {},
    downloadFile(...args) { downloads.push(args); },
    getValue(row, field) { return String(row?.[field] ?? ''); },
    normalizeTitle: DedupEngine.normalizeTitle,
    convertToCSV(records) {
      return buildCsv(records);
    },
    buildCSVFromRecords(records) {
      return buildCsv(records);
    },
  };

  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, downloads };
}

async function loadWorkerContext(relativePath) {
  const source = await fs.readFile(path.join(repoRoot, relativePath), 'utf8');
  const messages = [];
  const context = {
    console,
    DedupEngine,
    importScripts() {
      context.DedupEngine = DedupEngine;
      context.self.DedupEngine = DedupEngine;
    },
    self: {
      postMessage(message) { messages.push(message); },
      onmessage: null,
      DedupEngine,
    },
  };

  vm.createContext(context);
  vm.runInContext(source, context);
  messages.length = 0;
  return { context, messages };
}

function buildCsv(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return '';
  }

  const headers = [...new Set(records.flatMap((row) => Object.keys(row || {})))];
  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  records.forEach((row) => {
    lines.push(headers.map((header) => escapeCell(row[header])).join(','));
  });
  return lines.join('\n');
}

function countCsvRows(csvText) {
  if (!csvText) return 0;
  return csvText.split(/\r?\n/).filter((line) => line.trim()).length - 1;
}

test('root quick dedup stats align with the shared engine hard/candidate split', async () => {
  const dataset = await loadDataset('dedup-case-007');
  const engineResult = DedupEngine.run(dataset.records);
  const { context } = await loadPatchContext('v1.7-core-patch.js', dataset.records);
  const quickStats = context.runQuickDedupStats();

  assert.equal(quickStats.unique, engineResult.retainedRecords.length);
  assert.equal(quickStats.duplicates, engineResult.hardDuplicates.length);
  assert.equal(quickStats.candidateDuplicates, engineResult.candidateDuplicates.length);
});

test('v2 quick dedup stats align with the shared engine hard/candidate split', async () => {
  const dataset = await loadDataset('dedup-case-007');
  const engineResult = DedupEngine.run(dataset.records);
  const { context } = await loadPatchContext('literature-screening-v2.0/v1.7-core-patch.js', dataset.records);
  const quickStats = context.runQuickDedupStats();

  assert.equal(quickStats.unique, engineResult.retainedRecords.length);
  assert.equal(quickStats.duplicates, engineResult.hardDuplicates.length);
  assert.equal(quickStats.candidateDuplicates, engineResult.candidateDuplicates.length);
});

test('root export-only dedup exports the same retained rows as the shared engine hard layer', async () => {
  const dataset = await loadDataset('dedup-case-007');
  const engineResult = DedupEngine.run(dataset.records);
  const { context, downloads } = await loadPatchContext('v1.7-core-patch.js', dataset.records);

  context.exportDedupedData();

  assert.equal(downloads.length, 1, 'expected one CSV download');
  assert.equal(countCsvRows(downloads[0][0]), engineResult.retainedRecords.length);
});

test('v2 export-only dedup exports the same retained rows as the shared engine hard layer', async () => {
  const dataset = await loadDataset('dedup-case-007');
  const engineResult = DedupEngine.run(dataset.records);
  const { context, downloads } = await loadPatchContext('literature-screening-v2.0/v1.7-core-patch.js', dataset.records);

  context.exportDedupedData();

  assert.equal(downloads.length, 1, 'expected one CSV download');
  assert.equal(countCsvRows(downloads[0][0]), engineResult.retainedRecords.length);
});

test('root worker DEDUP matches the shared engine hard-duplicate layer', async () => {
  const dataset = await loadDataset('dedup-case-002');
  const engineResult = DedupEngine.run(dataset.records);
  const { context, messages } = await loadWorkerContext('parser-worker.js');

  context.self.onmessage({ data: { type: 'DEDUP', data: { recordsToDedup: dataset.records } } });
  const completion = messages.find((message) => message.type === 'DEDUP_COMPLETE');

  assert.ok(completion, 'expected DEDUP_COMPLETE message');
  assert.equal(completion.records.length, engineResult.retainedRecords.length);
  assert.equal(completion.duplicateCount, engineResult.hardDuplicates.length);
});

test('v2 worker DEDUP matches the shared engine hard-duplicate layer', async () => {
  const dataset = await loadDataset('dedup-case-002');
  const engineResult = DedupEngine.run(dataset.records);
  const { context, messages } = await loadWorkerContext('literature-screening-v2.0/parser-worker.js');

  context.self.onmessage({ data: { type: 'DEDUP', data: { recordsToDedup: dataset.records } } });
  const completion = messages.find((message) => message.type === 'DEDUP_COMPLETE');

  assert.ok(completion, 'expected DEDUP_COMPLETE message');
  assert.equal(completion.records.length, engineResult.retainedRecords.length);
  assert.equal(completion.duplicateCount, engineResult.hardDuplicates.length);
});
