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

async function loadDataset(datasetId) {
  const loader = await import(pathToFileURL(path.join(repoRoot, 'scripts/dedup/load-records.mjs')).href);
  return loader.loadDataset(datasetId, { repoRoot });
}

async function loadCandidateHarness(relativePath) {
  const source = await fs.readFile(path.join(repoRoot, relativePath), 'utf8');
  const containers = {
    dedupReviewSummary: { innerHTML: '', style: {} },
    dedupReviewSummaryFinal: { innerHTML: '', style: {} },
  };

  const code = [
    'let columnMapping = { title: "title", abstract: "abstract", keywords: "keywords", doi: "doi", year: "year", pages: "pages", journal: "journal", authors: "authors", publication_type: "publication_type" };',
    extractFunctionBlock(source, 'getValue'),
    extractFunctionBlock(source, 'normalizeTitle'),
    extractFunctionBlock(source, 'detectLanguage'),
    extractFunctionBlock(source, 'runDedupForScreening'),
    extractFunctionBlock(source, 'getCandidateReasonLabel'),
    extractFunctionBlock(source, 'flattenCandidateDuplicatesForExport'),
    extractFunctionBlock(source, 'renderDedupReviewSummary'),
    extractFunctionBlock(source, 'generateExcelUTF8BOM'),
    'this.__exports = { runDedupForScreening, getCandidateReasonLabel, flattenCandidateDuplicatesForExport, renderDedupReviewSummary, generateExcelUTF8BOM };',
  ].join('\n\n');

  const context = {
    console,
    DedupEngine,
    document: {
      getElementById(id) {
        return containers[id] || null;
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(code, context);
  return { ...context.__exports, containers };
}

async function assertCandidateCountsSeparate(relativePath) {
  const [{ runDedupForScreening }, dataset] = await Promise.all([
    loadCandidateHarness(relativePath),
    loadDataset('dedup-case-007'),
  ]);

  const result = runDedupForScreening(dataset.records);

  assert.equal(result.counts.duplicates, 0);
  assert.equal(result.counts.candidate_duplicates, 1);
  assert.equal(result.deduped.length, 2);
}

async function assertCandidateExportRows(relativePath) {
  const [{ runDedupForScreening, flattenCandidateDuplicatesForExport, generateExcelUTF8BOM }, dataset] = await Promise.all([
    loadCandidateHarness(relativePath),
    loadDataset('dedup-case-007'),
  ]);

  const result = runDedupForScreening(dataset.records);
  const rows = flattenCandidateDuplicatesForExport(result.candidateDuplicates);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].reason_code, 'title_year_pages_overlap');
  assert.equal(rows[0].reason_label, 'needs_review_identifier_mismatch');
  assert.equal(rows[0].review_decision, 'needs_review');

  const csv = generateExcelUTF8BOM(rows, 'candidate_duplicates');
  assert.match(csv, /needs_review_identifier_mismatch/);
  assert.match(csv, /needs_review/);
}

async function assertNotDuplicateLabelPreserved(relativePath) {
  const [{ runDedupForScreening, flattenCandidateDuplicatesForExport }, dataset] = await Promise.all([
    loadCandidateHarness(relativePath),
    loadDataset('dedup-case-007'),
  ]);

  const result = runDedupForScreening(dataset.records);
  const taggedRows = flattenCandidateDuplicatesForExport([
    {
      ...result.candidateDuplicates[0],
      review_decision: 'not_duplicate',
    },
  ]);

  assert.equal(taggedRows[0].review_decision, 'not_duplicate');
  assert.equal(result.deduped.length, 2);
}

async function assertCandidateSummaryUI(relativePath, htmlRelativePath) {
  const [{ runDedupForScreening, renderDedupReviewSummary, containers }, dataset, html] = await Promise.all([
    loadCandidateHarness(relativePath),
    loadDataset('dedup-case-007'),
    fs.readFile(path.join(repoRoot, htmlRelativePath), 'utf8'),
  ]);

  const result = runDedupForScreening(dataset.records);
  renderDedupReviewSummary(result);

  assert.match(html, /dedupReviewSummary/);
  assert.match(html, /dedupReviewSummaryFinal/);
  assert.match(containers.dedupReviewSummary.innerHTML, /candidate-duplicates/);
  assert.match(containers.dedupReviewSummary.innerHTML, /1/);
}

test('root candidate duplicates are counted separately from hard duplicates', async () => {
  await assertCandidateCountsSeparate('app.js');
});

test('v2 candidate duplicates are counted separately from hard duplicates', async () => {
  await assertCandidateCountsSeparate('literature-screening-v2.0/app.js');
});

test('root candidate duplicates can be exported with reason labels', async () => {
  await assertCandidateExportRows('app.js');
});

test('v2 candidate duplicates can be exported with reason labels', async () => {
  await assertCandidateExportRows('literature-screening-v2.0/app.js');
});

test('root keeps not-duplicate review labels without auto-removing records', async () => {
  await assertNotDuplicateLabelPreserved('app.js');
});

test('v2 keeps not-duplicate review labels without auto-removing records', async () => {
  await assertNotDuplicateLabelPreserved('literature-screening-v2.0/app.js');
});

test('root candidate summary renders export controls into the results UI', async () => {
  await assertCandidateSummaryUI('app.js', 'index.html');
});

test('v2 candidate summary renders export controls into the results UI', async () => {
  await assertCandidateSummaryUI('literature-screening-v2.0/app.js', 'literature-screening-v2.0/workspace.html');
});
