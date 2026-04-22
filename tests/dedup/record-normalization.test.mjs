import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const realRdfPath = path.join(repoRoot, 'tests', 'fixtures', 'dedup', 'real', '初稿.rdf');

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

function extractOptionalFunctionBlock(source, functionName) {
  return source.includes(`function ${functionName}(`)
    ? extractFunctionBlock(source, functionName)
    : '';
}

async function loadAppHarness(relativePath) {
  const source = await fs.readFile(path.join(repoRoot, relativePath), 'utf8');
  const code = [
    extractFunctionBlock(source, 'getRDFNestedText'),
    extractFunctionBlock(source, 'getRDFChildValue'),
    extractFunctionBlock(source, 'getRDFJournalValue'),
    extractOptionalFunctionBlock(source, 'stripInlineHtmlTags'),
    extractOptionalFunctionBlock(source, 'sanitizeAbstractText'),
    extractFunctionBlock(source, 'enrichParsedRDFRecord'),
    extractFunctionBlock(source, 'parseRDFItem'),
    extractFunctionBlock(source, 'normalizeTitle'),
    extractFunctionBlock(source, 'normalizeIdentifierForDedup'),
    'this.__exports = { parseRDFItem, normalizeTitle, normalizeIdentifierForDedup };',
  ].join('\n\n');

  const context = { console };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.__exports;
}

async function loadWorkerHarness(relativePath) {
  const source = await fs.readFile(path.join(repoRoot, relativePath), 'utf8');
  const context = {
    console,
    self: { postMessage() {}, onmessage: null },
  };

  vm.createContext(context);
  vm.runInContext(source, context);
  return {
    parseRDF: context.parseRDF,
    enrichImportedRecord: context.enrichImportedRecord,
    normalizeIdentifierForDedup: context.normalizeIdentifierForDedup,
  };
}

function createFakeChild(tagName, textContent, selectorMap = {}) {
  return {
    tagName,
    textContent,
    querySelector(selector) {
      return selectorMap[selector] ?? null;
    },
  };
}

function createFakeItem() {
  return {
    children: [
      createFakeChild('z:itemType', 'journalArticle'),
      createFakeChild('dcterms:isPartOf', '中国卫生经济11', {
        'dc\\:title': { textContent: '中国卫生经济' },
      }),
      createFakeChild('dc:title', '中医优势病种的卫生经济学评价'),
      createFakeChild('dcterms:abstract', '摘要内容'),
      createFakeChild('dc:date', '2021-12-28'),
      createFakeChild('z:language', 'zh-CN'),
      createFakeChild('dc:identifier', 'https://doi.org/10.14055/j.cnki.33-1056/f.2021.12.003', {
        'rdf\\:value': { textContent: 'https://doi.org/10.14055/j.cnki.33-1056/f.2021.12.003' },
      }),
      createFakeChild('bib:pages', '16-19'),
      createFakeChild('dc:creator', '石连忠'),
      createFakeChild('dc:creator', '梅彦'),
    ],
    attributes: [
      { name: 'rdf:about', value: 'https://doi.org/10.14055/j.cnki.33-1056/f.2021.12.003' },
    ],
  };
}

test('root app RDF parsing preserves normalization metadata', async () => {
  const { parseRDFItem } = await loadAppHarness('app.js');
  const record = parseRDFItem(createFakeItem());

  assert.equal(record.title, '中医优势病种的卫生经济学评价');
  assert.equal(record.authors, '石连忠; 梅彦');
  assert.equal(record.year, '2021');
  assert.equal(record.publication_type, 'journalArticle');
  assert.equal(record.language, 'zh-CN');
  assert.equal(record.identifier_raw, 'https://doi.org/10.14055/j.cnki.33-1056/f.2021.12.003');
  assert.equal(record._normalized_identifier, '10.14055/j.cnki.33-1056/f.2021.12.003');
  assert.equal(record._normalized_title, '中医优势病种的卫生经济学评价');
});

test('v2 app RDF parsing preserves normalization metadata', async () => {
  const { parseRDFItem } = await loadAppHarness('literature-screening-v2.0/app.js');
  const record = parseRDFItem(createFakeItem());

  assert.equal(record.title, '中医优势病种的卫生经济学评价');
  assert.equal(record.publication_type, 'journalArticle');
  assert.equal(record.language, 'zh-CN');
  assert.equal(record.identifier_raw, 'https://doi.org/10.14055/j.cnki.33-1056/f.2021.12.003');
  assert.equal(record._normalized_identifier, '10.14055/j.cnki.33-1056/f.2021.12.003');
  assert.equal(record._normalized_title, '中医优势病种的卫生经济学评价');
});

test('root worker preserves raw and normalized metadata for real RDF DOI URLs', async () => {
  const { parseRDF, enrichImportedRecord, normalizeIdentifierForDedup } = await loadWorkerHarness('parser-worker.js');
  const rdfContent = await fs.readFile(realRdfPath, 'utf8');
  const records = parseRDF(rdfContent);
  const target = records.find((record) => String(record.identifier_raw || '').includes('10.14055/j.cnki.33-1056/f.2021.12.003'));

  assert.ok(target, 'expected real RDF fixture to yield a DOI URL record');
  const enriched = enrichImportedRecord(target, 'real-rdf-001.rdf');

  assert.equal(enriched.publication_type, 'journalArticle');
  assert.equal(enriched.language, 'zh-CN');
  assert.equal(enriched.identifier_raw, 'https://doi.org/10.14055/j.cnki.33-1056/f.2021.12.003');
  assert.equal(enriched._normalized_identifier, '10.14055/j.cnki.33-1056/f.2021.12.003');
  assert.equal(normalizeIdentifierForDedup('DOI 10.14055/j.cnki.33-1056/f.2021.12.003'), '10.14055/j.cnki.33-1056/f.2021.12.003');
  assert.ok(enriched._normalized_title.length > 0, 'expected normalized title to be populated');
});

test('v2 worker preserves raw and normalized metadata for real RDF DOI URLs', async () => {
  const { parseRDF, enrichImportedRecord } = await loadWorkerHarness('literature-screening-v2.0/parser-worker.js');
  const rdfContent = await fs.readFile(realRdfPath, 'utf8');
  const records = parseRDF(rdfContent);
  const target = records.find((record) => String(record.identifier_raw || '').includes('10.14055/j.cnki.33-1056/f.2021.12.003'));

  assert.ok(target, 'expected real RDF fixture to yield a DOI URL record');
  const enriched = enrichImportedRecord(target, 'real-rdf-001.rdf');

  assert.equal(enriched.publication_type, 'journalArticle');
  assert.equal(enriched.language, 'zh-CN');
  assert.equal(enriched.identifier_raw, 'https://doi.org/10.14055/j.cnki.33-1056/f.2021.12.003');
  assert.equal(enriched._normalized_identifier, '10.14055/j.cnki.33-1056/f.2021.12.003');
  assert.ok(enriched._normalized_title.length > 0, 'expected normalized title to be populated');
});
