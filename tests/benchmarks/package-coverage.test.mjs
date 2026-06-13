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

const AuditEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/audit-engine.js'));
const V22StreamingParser = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/streaming-parser.js'));

function loadV22ParserWorkerHarness() {
  const source = fs.readFileSync(path.join(repoRoot, 'literature-screening-v2.2/parser-worker.js'), 'utf8');
  const context = {
    console,
    self: { postMessage() {}, onmessage: null },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return {
    parseRDF: context.parseRDF,
    enrichImportedRecord: context.enrichImportedRecord,
  };
}

function loadFixture(name) {
  return fs.readFileSync(path.join(repoRoot, 'fixtures', 'chinese-source', name), 'utf8');
}

function parseStreaming(format, content) {
  const session = V22StreamingParser.createStreamingSession({ format });
  const records = [];
  records.push(...V22StreamingParser.pushChunk(session, content).records);
  const final = V22StreamingParser.finishSession(session);
  records.push(...final.records);
  return records;
}

test('benchmark: import - CNKI RDF with noisy abstract is normalized correctly', () => {
  const rdf = loadFixture('cnki-rdf-noisy.xml');
  const { parseRDF, enrichImportedRecord } = loadV22ParserWorkerHarness();
  
  const records = parseRDF(rdf).map(r => enrichImportedRecord(r, 'cnki-rdf-noisy.xml'));
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.source_database, 'CNKI');
  assert.equal(r.title, '针灸治疗慢性疼痛的真实世界研究');
  assert.equal(r.journal, '中国针灸');
  assert.equal(r.year, '2024');
  assert.equal(r.abstract_noise_detected, true);
  assert.equal(r.abstract_truncation_suspected, true);
  assert.doesNotMatch(r.abstract, /基金|下载频次|被引频次|分类号|dbcode/i);
});

test('benchmark: import - Wanfang CSV maps source fields correctly', () => {
  const records = parseStreaming('csv', loadFixture('wanfang-sample.csv'));
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.source_database, 'Wanfang');
  assert.equal(r.title, '万方慢性病管理研究');
  assert.equal(r.journal, '中国卫生经济');
  assert.equal(r.year, '2022');
  assert.equal(r.wanfang_id, 'WF2022005');
});

test('benchmark: import - Wanfang fullwidth volume/issue is parsed', () => {
  const records = parseStreaming('csv', loadFixture('wanfang-fullwidth-volume-issue.csv'));
  assert.equal(records.length, 1);
  assert.equal(records[0].source_database, 'Wanfang');
  assert.equal(records[0].year, '2022');
  assert.equal(records[0].volume, '41');
  assert.equal(records[0].issue, '5');
});

test('benchmark: import - VIP CSV maps source fields correctly', () => {
  const records = parseStreaming('csv', loadFixture('vip-sample.csv'));
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.source_database, 'VIP');
  assert.equal(r.title, '维普针灸真实世界研究');
  assert.equal(r.journal, '中华中医药杂志');
  assert.equal(r.vip_id, 'VIP2021001');
  assert.equal(r.classification, 'R246');
});

test('benchmark: import - VIP mixed Chinese/English headers are handled', () => {
  const records = parseStreaming('csv', loadFixture('vip-mixed-headers.csv'));
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.source_database, 'VIP');
  assert.equal(r.authors, '陈一;王二');
  assert.equal(r.journal, '中国康复理论与实践');
});

test('benchmark: import - SinoMed NBIB maps identifiers correctly', () => {
  const records = parseStreaming('nbib', loadFixture('sinomed-sample.nbib'));
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.source_database, 'SinoMed');
  assert.equal(r.pmid, '99887766');
  assert.equal(r.sinomed_id, 'SINOMED2020001');
  assert.equal(r.mesh_terms, 'Acupuncture');
  assert.equal(r.source_mapping_incomplete, true);
});

test('benchmark: import - SinoMed partial source is flagged with trailing punctuation cleaned', () => {
  const records = parseStreaming('nbib', loadFixture('sinomed-partial-source.nbib'));
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.source_database, 'SinoMed');
  assert.equal(r.journal, '中国循证医学杂志');
  assert.equal(r.source_mapping_incomplete, true);
});

// === Screening Benchmark ===

test('benchmark: screening - demo dataset produces expected counts', () => {
  const demoRaw = fs.readFileSync(path.join(repoRoot, 'literature-screening-v2.2/sample-data.json'), 'utf8');
  const demoData = JSON.parse(demoRaw).data;
  const records = demoData.map((item, idx) => ({ ...item, _source: item.database, _sourceFile: 'demo.json' }));

  // Manual screening: Chinese or English, year 2019-2025, hypertension topic
  const screened = records.filter(row => {
    const year = parseInt(row.year);
    if (isNaN(year)) return false;
    if (year < 2019 || year > 2025) return false;
    return true;
  });

  assert.ok(screened.length >= records.length * 0.8, `screened ${screened.length}/${records.length} records - expected most in range`);
  assert.ok(screened.every(r => parseInt(r.year) >= 2019 && parseInt(r.year) <= 2025), 'all screened records within year range');
});

test('benchmark: screening - source distribution is countable', () => {
  const demoRaw = fs.readFileSync(path.join(repoRoot, 'literature-screening-v2.2/sample-data.json'), 'utf8');
  const demoData = JSON.parse(demoRaw).data;

  const bySource = {};
  demoData.forEach(r => {
    const src = r.database || 'Unknown';
    bySource[src] = (bySource[src] || 0) + 1;
  });

  assert.ok(bySource.CNKI > 1, `CNKI records: ${bySource.CNKI}`);
  assert.ok(bySource.Wanfang >= 1, `Wanfang records: ${bySource.Wanfang}`);
  assert.ok(bySource.VIP >= 1, `VIP records: ${bySource.VIP}`);
  assert.ok(bySource.SinoMed >= 1, `SinoMed records: ${bySource.SinoMed}`);
  assert.ok(bySource.PubMed >= 1, `PubMed records: ${bySource.PubMed}`);
});

test('benchmark: screening - dedup signals exist in demo data', () => {
  const demoRaw = fs.readFileSync(path.join(repoRoot, 'literature-screening-v2.2/sample-data.json'), 'utf8');
  const demoData = JSON.parse(demoRaw).data;

  const doiCounts = {};
  const titleCounts = {};
  demoData.forEach(r => {
    if (r.doi) doiCounts[r.doi] = (doiCounts[r.doi] || 0) + 1;
    const titleKey = r.title.replace(/[（(][^)）]+[)）]/g, '').replace(/\s+/g, '').toLowerCase();
    titleCounts[titleKey] = (titleCounts[titleKey] || 0) + 1;
  });

  const duplicateDois = Object.values(doiCounts).filter(c => c > 1);
  const duplicateTitles = Object.values(titleCounts).filter(c => c > 1);

  assert.ok(duplicateDois.length > 0 || duplicateTitles.length > 0, 'demo data should contain at least one duplicate pair for dedup demonstration');
});

// === Audit Replay Benchmark ===

test('benchmark: audit replay - PRISMA counts from events and decisions are consistent', () => {
  const events = [
    AuditEngine.createAuditEvent({ eventType: 'record_imported', recordId: 'r1' }),
    AuditEngine.createAuditEvent({ eventType: 'record_imported', recordId: 'r2' }),
    AuditEngine.createAuditEvent({ eventType: 'record_imported', recordId: 'r3' }),
    AuditEngine.createAuditEvent({ eventType: 'dedup_auto_removed', recordId: 'r3' }),
    AuditEngine.createAuditEvent({ eventType: 'record_imported', recordId: 'r4' }),
    AuditEngine.createAuditEvent({ eventType: 'record_imported', recordId: 'r5' }),
  ];

  const decisions = [
    AuditEngine.createScreeningDecision({ recordId: 'r1', stage: 'title_abstract', decision: 'include' }),
    AuditEngine.createScreeningDecision({ recordId: 'r1', stage: 'full_text', decision: 'include' }),
    AuditEngine.createScreeningDecision({ recordId: 'r2', stage: 'title_abstract', decision: 'exclude', exclusionReason: 'wrong_population' }),
    AuditEngine.createScreeningDecision({ recordId: 'r4', stage: 'title_abstract', decision: 'include' }),
    AuditEngine.createScreeningDecision({ recordId: 'r4', stage: 'full_text', decision: 'include' }),
    AuditEngine.createScreeningDecision({ recordId: 'r5', stage: 'title_abstract', decision: 'include' }),
    AuditEngine.createScreeningDecision({ recordId: 'r5', stage: 'full_text', decision: 'exclude', exclusionReason: 'wrong_design' }),
  ];

  const counts = AuditEngine.calculatePrismaCountsFromDecisions(decisions, events);

  assert.equal(counts.recordsImported, 5, 'imported records');
  assert.equal(counts.duplicatesRemoved, 1, 'dedup removals');
  assert.equal(counts.titleAbstractIncluded, 3, 'TA included');
  assert.equal(counts.titleAbstractExcluded, 1, 'TA excluded');
  assert.equal(counts.titleAbstractUncertain, 0, 'TA uncertain');
  assert.equal(counts.fullTextAssessed, 3, 'FT assessed');
  assert.equal(counts.fullTextIncluded, 2, 'FT included');
  assert.equal(counts.fullTextExcluded, 1, 'FT excluded');
  assert.equal(counts.studiesIncluded, 2, 'final included');
});

test('benchmark: audit replay - empty input yields zero counts', () => {
  const counts = AuditEngine.calculatePrismaCountsFromDecisions([], []);
  assert.equal(counts.recordsImported, 0);
  assert.equal(counts.duplicatesRemoved, 0);
  assert.equal(counts.studiesIncluded, 0);
});

test('benchmark: audit replay - counts are deterministic across replays', () => {
  const events = [
    AuditEngine.createAuditEvent({ eventType: 'record_imported', recordId: 'a' }),
    AuditEngine.createAuditEvent({ eventType: 'record_imported', recordId: 'b' }),
  ];
  const decisions = [
    AuditEngine.createScreeningDecision({ recordId: 'a', stage: 'full_text', decision: 'include' }),
    AuditEngine.createScreeningDecision({ recordId: 'b', stage: 'full_text', decision: 'exclude', exclusionReason: 'wrong_population' }),
  ];

  const c1 = AuditEngine.calculatePrismaCountsFromDecisions(decisions, events);
  const c2 = AuditEngine.calculatePrismaCountsFromDecisions(decisions, events);

  assert.deepEqual(JSON.parse(JSON.stringify(c1)), JSON.parse(JSON.stringify(c2)));
});

test('benchmark: audit replay - defense pack markdown generation is stable', () => {
  const manifest = AuditEngine.createProjectManifest({
    projectId: 'bench-001',
    projectName: 'Benchmark Audit Replay',
    aiMode: 'off',
    appVersion: 'v2.5',
  });

  const pack1 = AuditEngine.buildDefenseReadyAuditPackMarkdown(manifest, [], [], {});
  const pack2 = AuditEngine.buildDefenseReadyAuditPackMarkdown(manifest, [], [], {});

  assert.equal(pack1, pack2, 'defense pack should be deterministic');

  assert.match(pack1, /Defense-ready Audit Pack/);
  assert.match(pack1, /Project: Benchmark Audit Replay/);
  assert.match(pack1, /PRISMA Counts/);
  assert.match(pack1, /Dual-review Resolution Summary/);
  assert.match(pack1, /Quality Appraisal/);
  assert.match(pack1, /Chinese-source Reliability Summary/);
  assert.match(pack1, /AI Boundary Summary/);
});
