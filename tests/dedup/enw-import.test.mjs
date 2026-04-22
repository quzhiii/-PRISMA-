import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const sampleEnw = [
  '%0 Journal Article',
  '%A Zhang San',
  '%A Li Si',
  '%T Sample CNKI ENW Title',
  '%J Chinese Journal',
  '%D 2024-03-01',
  '%R 10.1000/cnki.demo',
  '%X First line of abstract',
  'continued abstract line',
  '%K keyword1',
  '%K keyword2',
  '%0 Journal Article',
  '%A Wang Wu',
  '%T Another Record',
  '%B Journal Fallback',
  '%8 2023/02/18',
  '%U https://doi.org/10.2000/example.second',
  '%K keyword3'
].join('\n');

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

async function loadAppENWHarness(relativePath) {
  const source = await fs.readFile(path.join(repoRoot, relativePath), 'utf8');
  const code = [
    extractFunctionBlock(source, 'parseENWRecords'),
    extractFunctionBlock(source, 'parseENWContent'),
    'this.__exports = { parseENWRecords, parseENWContent };',
  ].join('\n\n');

  const context = { console, Set };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.__exports;
}

async function loadWorkerENWHarness(relativePath) {
  const source = await fs.readFile(path.join(repoRoot, relativePath), 'utf8');
  const context = {
    console,
    Set,
    self: {
      postMessage() {},
      onmessage: null,
    },
  };

  vm.createContext(context);
  vm.runInContext(source, context);
  return {
    parseENW: context.parseENW,
  };
}

function normalizeRecords(records) {
  return JSON.parse(JSON.stringify(records));
}

function assertParsedRecords(records) {
  const normalized = normalizeRecords(records);

  assert.equal(normalized.length, 2);

  assert.deepEqual(normalized[0], {
    type: 'Journal Article',
    authors: 'Zhang San; Li Si',
    title: 'Sample CNKI ENW Title',
    journal: 'Chinese Journal',
    year: '2024',
    identifier_raw: '10.1000/cnki.demo',
    doi: '10.1000/cnki.demo',
    abstract: 'First line of abstract continued abstract line',
    keywords: 'keyword1; keyword2',
  });

  assert.deepEqual(normalized[1], {
    type: 'Journal Article',
    authors: 'Wang Wu',
    title: 'Another Record',
    journal: 'Journal Fallback',
    year: '2023',
    url: 'https://doi.org/10.2000/example.second',
    identifier_raw: 'https://doi.org/10.2000/example.second',
    doi: 'https://doi.org/10.2000/example.second',
    keywords: 'keyword3',
  });
}

test('root app ENW content parser supports CNKI/EndNote percent-tag format', async () => {
  const { parseENWContent } = await loadAppENWHarness('app.js');
  assertParsedRecords(parseENWContent(sampleEnw));
});

test('v2 app ENW content parser supports CNKI/EndNote percent-tag format', async () => {
  const { parseENWContent } = await loadAppENWHarness('literature-screening-v2.0/app.js');
  assertParsedRecords(parseENWContent(sampleEnw));
});

test('root worker ENW parser supports CNKI/EndNote percent-tag format', async () => {
  const { parseENW } = await loadWorkerENWHarness('parser-worker.js');
  assertParsedRecords(parseENW(sampleEnw));
});

test('v2 worker ENW parser supports CNKI/EndNote percent-tag format', async () => {
  const { parseENW } = await loadWorkerENWHarness('literature-screening-v2.0/parser-worker.js');
  assertParsedRecords(parseENW(sampleEnw));
});
