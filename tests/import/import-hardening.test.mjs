import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const ImportJobRuntime = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.0/import-job-runtime.js'));
const V22StreamingParser = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/streaming-parser.js'));
const appSource = fs.readFileSync(path.join(repoRoot, 'literature-screening-v2.0/app.js'), 'utf8');
const v22AppSource = fs.readFileSync(path.join(repoRoot, 'literature-screening-v2.2/app.js'), 'utf8');
const v22WorkspaceSource = fs.readFileSync(path.join(repoRoot, 'literature-screening-v2.2/workspace.html'), 'utf8');
const chineseSourceFixtureDir = path.join(repoRoot, 'fixtures', 'chinese-source');

function loadV22ParserWorkerHarness() {
  const source = fs.readFileSync(path.join(repoRoot, 'literature-screening-v2.2/parser-worker.js'), 'utf8');
  const context = {
    console,
    self: {
      postMessage() {},
      onmessage: null,
    },
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  return {
    parseRDF: context.parseRDF,
    enrichImportedRecord: context.enrichImportedRecord,
  };
}

function parseStreamingFixture(format, content) {
  const session = V22StreamingParser.createStreamingSession({ format });
  const firstCut = Math.ceil(content.length / 2);
  const records = [];
  records.push(...V22StreamingParser.pushChunk(session, content.slice(0, firstCut)).records);
  records.push(...V22StreamingParser.pushChunk(session, content.slice(firstCut)).records);
  const finalResult = V22StreamingParser.finishSession(session);
  records.push(...finalResult.records);
  return records;
}

test('incremental worker formats do not allow whole-file parse fallback', () => {
  ['.csv', '.tsv', '.ris', '.nbib', '.enw'].forEach((ext) => {
    assert.equal(ImportJobRuntime.supportsIncrementalWorkerExt(ext), true, `${ext} should use streaming worker`);
    assert.equal(ImportJobRuntime.shouldAllowWholeFileParseFallback(ext), false, `${ext} must not fallback`);
  });

  ['.bib', '.bibtex', '.rdf', '.txt'].forEach((ext) => {
    assert.equal(ImportJobRuntime.shouldAllowWholeFileParseFallback(ext), true, `${ext} still uses explicit whole-file path`);
  });
});

test('parseFileInChunks throws on incremental worker failure instead of silently parsing whole file', () => {
  assert.match(
    appSource,
    /if \(supportsIncrementalWorkerFormat\(ext\)\) \{[\s\S]*?catch \(workerError\) \{\s*throw createIncrementalWorkerFailureError\(file, ext, workerError\);/m
  );
  assert.match(
    appSource,
    /catch \(workerError\) \{\s*if \(!shouldAllowWholeFileParseFallback\(ext\)\) \{\s*throw createIncrementalWorkerFailureError\(file, ext, workerError\);/m
  );
  assert.doesNotMatch(appSource, /Incremental worker parsing failed, falling back to whole-file parser/);
});

test('v2.2 local file mode has a bounded parser fallback when workers are blocked', () => {
  assert.match(v22AppSource, /const LOCAL_FILE_WORKER_FALLBACK_MAX_BYTES = 20 \* 1024 \* 1024;/);
  assert.match(
    v22AppSource,
    /function isLocalFilePageContext\(\) \{[\s\S]*?window\.location\.protocol === 'file:';[\s\S]*?\}/m
  );
  assert.match(
    v22AppSource,
    /function shouldAllowLocalFileWorkerFallback\(file, ext\) \{[\s\S]*?!isLocalFilePageContext\(\) \|\| !supportsIncrementalWorkerFormat\(ext\)[\s\S]*?fileSize <= LOCAL_FILE_WORKER_FALLBACK_MAX_BYTES;[\s\S]*?\}/m
  );
  assert.match(
    v22AppSource,
    /catch \(workerError\) \{\s*if \(shouldAllowLocalFileWorkerFallback\(file, ext\)\) \{[\s\S]*?return parseFileWithLocalFileFallback\(file, ext, onProgress\);[\s\S]*?\}\s*throw createIncrementalWorkerFailureError\(file, ext, workerError\);/m
  );
  assert.match(v22WorkspaceSource, /const isLocalFileMode = window\.location\.protocol === 'file:';/);
  assert.match(v22WorkspaceSource, /const dbWorker = isLocalFileMode \? null : new Worker\('db-worker\.js\?v=20260427-v22-audit'\);/);
  assert.match(v22WorkspaceSource, /const parserWorker = isLocalFileMode \? null : new Worker\('parser-worker\.js\?v=20260422-streaming-v2'\);/);
});

test('finalize import lifecycle cleans loading and progress when success UI finalization throws', async () => {
  const calls = [];
  const result = await ImportJobRuntime.finalizeImportLifecycle({ outcome: 'success' }, {
    completeSuccess: () => {
      calls.push('completeSuccess');
      throw new Error('detectColumns failed');
    },
    failImportJobs: (error) => {
      calls.push(`fail:${error.message}`);
    },
    showError: (_error, context) => {
      calls.push(`showError:${context.finalizationFailed}`);
    },
    hideProgress: () => {
      calls.push('hideProgress');
    },
    hideLoading: () => {
      calls.push('hideLoading');
    },
    persist: () => {
      calls.push('persist');
    },
  });

  assert.equal(result.status, ImportJobRuntime.IMPORT_JOB_STAGES.FAILED);
  assert.equal(result.finalizationFailed, true);
  assert.equal(result.errorShown, true);
  assert.deepEqual(calls, [
    'completeSuccess',
    'fail:detectColumns failed',
    'showError:true',
    'hideProgress',
    'hideLoading',
    'persist',
  ]);
});

test('legacy multi-file entries are compatibility wrappers for the single orchestrator', () => {
  const legacyWrapper = appSource.match(/function handleMultipleFiles\(files\) \{[\s\S]*?\n\}/m)?.[0] || '';

  assert.match(
    appSource,
    /function handleMultipleFiles\(files\) \{\s*return handleImportFiles\(files\);\s*\}/m
  );
  assert.match(
    appSource,
    /async function handleMultipleFilesV15\(files\) \{\s*return handleImportFiles\(files\);\s*\}/m
  );
  assert.match(appSource, /if \(files\.length > 0\) handleImportFiles\(files\);/);
  assert.doesNotMatch(legacyWrapper, /parseFileContent|FileReader|showLoading|hideLoading/);
});

test('v2.7 CNKI RDF import preserves core fields while flagging noisy truncated abstracts', () => {
  const { parseRDF, enrichImportedRecord } = loadV22ParserWorkerHarness();
  const rdf = `<?xml version="1.0" encoding="UTF-8"?>
    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
      xmlns:bib="http://purl.org/net/biblio#"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:dcterms="http://purl.org/dc/terms/">
      <bib:Journal rdf:about="journal-1">
        <dc:title>中国针灸</dc:title>
      </bib:Journal>
      <bib:Article rdf:about="https://doi.org/10.1234/cnki.2024.001">
        <dc:title>针灸治疗慢性疼痛的真实世界研究</dc:title>
        <dc:creator>张三</dc:creator>
        <dcterms:issued>2024-03-01</dcterms:issued>
        <dcterms:isPartOf rdf:resource="journal-1" />
        <dc:identifier><rdf:value>https://doi.org/10.1234/cnki.2024.001</rdf:value></dc:identifier>
        <dcterms:abstract><![CDATA[摘要：目的：评价针灸治疗慢性疼痛的临床疗效。结果显示治疗组疼痛评分下降。基金：国家自然科学基金；下载频次：42；被引频次：7；分类号：R246；dbcode:CJFD；余略]]></dcterms:abstract>
      </bib:Article>
    </rdf:RDF>`;

  const records = parseRDF(rdf).map((record) => enrichImportedRecord(record, 'cnki-rdf-noisy.xml'));
  assert.equal(records.length, 1);

  const record = records[0];
  assert.equal(record.source_database, 'CNKI');
  assert.equal(record.title, '针灸治疗慢性疼痛的真实世界研究');
  assert.match(record.abstract, /目的：评价针灸治疗慢性疼痛/);
  assert.doesNotMatch(record.abstract, /基金|下载频次|被引频次|分类号|dbcode/i);
  assert.equal(record.journal, '中国针灸');
  assert.equal(record.year, '2024');
  assert.equal(record.identifier_raw, 'https://doi.org/10.1234/cnki.2024.001');
  assert.equal(record._normalized_identifier, '10.1234/cnki.2024.001');
  assert.equal(record.abstract_noise_detected, true);
  assert.equal(record.abstract_truncation_suspected, true);
  assert.equal(record.abstract_quality_note, 'CNKI abstract contains source metadata noise.');
});

test('v2.7 Chinese-source fixtures normalize CNKI, Wanfang, VIP, and SinoMed source fields', () => {
  const { parseRDF, enrichImportedRecord } = loadV22ParserWorkerHarness();
  const cnkiRecords = parseRDF(fs.readFileSync(path.join(chineseSourceFixtureDir, 'cnki-rdf-noisy.xml'), 'utf8'))
    .map((record) => enrichImportedRecord(record, 'cnki-rdf-noisy.xml'));
  const wanfangRecords = parseStreamingFixture('csv', fs.readFileSync(path.join(chineseSourceFixtureDir, 'wanfang-sample.csv'), 'utf8'));
  const vipRecords = parseStreamingFixture('csv', fs.readFileSync(path.join(chineseSourceFixtureDir, 'vip-sample.csv'), 'utf8'));
  const sinomedRecords = parseStreamingFixture('nbib', fs.readFileSync(path.join(chineseSourceFixtureDir, 'sinomed-sample.nbib'), 'utf8'));

  assert.equal(cnkiRecords.length, 1);
  assert.equal(cnkiRecords[0].source_database, 'CNKI');
  assert.equal(cnkiRecords[0].title, '针灸治疗慢性疼痛的真实世界研究');
  assert.equal(cnkiRecords[0].journal, '中国针灸');
  assert.equal(cnkiRecords[0].year, '2024');
  assert.equal(cnkiRecords[0].abstract_noise_detected, true);
  assert.equal(cnkiRecords[0].abstract_truncation_suspected, true);
  assert.doesNotMatch(cnkiRecords[0].abstract, /基金|下载频次|被引频次|分类号|dbcode/i);

  assert.equal(wanfangRecords.length, 1);
  assert.equal(wanfangRecords[0].source_database, 'Wanfang');
  assert.equal(wanfangRecords[0].title, '万方慢性病管理研究');
  assert.equal(wanfangRecords[0].journal, '中国卫生经济');
  assert.equal(wanfangRecords[0].year, '2022');
  assert.equal(wanfangRecords[0].wanfang_id, 'WF2022005');

  assert.equal(vipRecords.length, 1);
  assert.equal(vipRecords[0].source_database, 'VIP');
  assert.equal(vipRecords[0].title, '维普针灸真实世界研究');
  assert.equal(vipRecords[0].journal, '中华中医药杂志');
  assert.equal(vipRecords[0].vip_id, 'VIP2021001');
  assert.equal(vipRecords[0].classification, 'R246');

  assert.equal(sinomedRecords.length, 1);
  assert.equal(sinomedRecords[0].source_database, 'SinoMed');
  assert.equal(sinomedRecords[0].pmid, '99887766');
  assert.equal(sinomedRecords[0].sinomed_id, 'SINOMED2020001');
  assert.equal(sinomedRecords[0].mesh_terms, 'Acupuncture');
  assert.equal(sinomedRecords[0].source_mapping_incomplete, true);
});
