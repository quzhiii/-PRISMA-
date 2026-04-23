import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const StreamingParser = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.0/streaming-parser.js'));

function parseInChunks(format, chunks) {
  const session = StreamingParser.createStreamingSession({ format });
  const records = [];

  chunks.forEach((chunk) => {
    const result = StreamingParser.pushChunk(session, chunk);
    records.push(...result.records);
  });

  const finalResult = StreamingParser.finishSession(session);
  records.push(...finalResult.records);

  return {
    records,
    parsedCount: finalResult.parsedCount,
  };
}

test('streaming parser keeps quoted CSV fields intact across chunk boundaries', () => {
  const { records, parsedCount } = parseInChunks('csv', [
    'title,abstract,year\r\n"Alpha","Line one',
    '\nLine two, sti',
    'll quoted",2024\r\n"Be',
    'ta","Tail field",2023\r\n',
  ]);

  assert.equal(parsedCount, 2);
  assert.equal(records.length, 2);
  assert.deepEqual(records[0], {
    title: 'Alpha',
    abstract: 'Line one\nLine two, still quoted',
    year: '2024',
  });
  assert.deepEqual(records[1], {
    title: 'Beta',
    abstract: 'Tail field',
    year: '2023',
  });
});

test('streaming parser keeps NBIB records intact when tags and continuations cross chunks', () => {
  const { records, parsedCount } = parseInChunks('nbib', [
    'PMID- 12345678\r\nTI  - First title part\r\n      continues here\r\nAB  - First abstract sent',
    'ence\r\n      continued abstract\r\nDP  - 2021 Jan\r\nAID - 10.1000/test-doi [doi]\r\nFAU - Smith, John\r\nFAU - Doe, Jane\r\nER  -\r\n\r\nPMID- 87654321\r\nTI  - Second ',
    'record title\r\nDP  - 2019\r\nER  -\r\n',
  ]);

  assert.equal(parsedCount, 2);
  assert.equal(records.length, 2);
  assert.equal(records[0].pmid, '12345678');
  assert.equal(records[0].title, 'First title part continues here');
  assert.equal(records[0].abstract, 'First abstract sentence continued abstract');
  assert.equal(records[0].year, '2021');
  assert.equal(records[0].doi, '10.1000/test-doi');
  assert.equal(records[0].identifier_raw, '12345678');
  assert.equal(records[0].authors, 'Smith, John; Doe, Jane');
  assert.equal(records[1].pmid, '87654321');
  assert.equal(records[1].title, 'Second record title');
  assert.equal(records[1].year, '2019');
});

test('streaming parser preserves ENW continuation lines and identifier capture across chunks', () => {
  const { records, parsedCount } = parseInChunks('enw', [
    '%0 Journal Article\r\n%A Zhang, Wei\r\n%T CNKI title first li',
    'ne\r\ncontinued title line\r\n%X Abstract first line\r\ncontinued abstract\r\n%R 10.1234/cnki.2024.001\r\n\r\n%0 Journal Article\r\n%T Second title\r\n%U https://doi.org/10.',
    '5555/abc\r\n',
  ]);

  assert.equal(parsedCount, 2);
  assert.equal(records.length, 2);
  assert.equal(records[0].type, 'Journal Article');
  assert.equal(records[0].title, 'CNKI title first line continued title line');
  assert.equal(records[0].abstract, 'Abstract first line continued abstract');
  assert.equal(records[0].doi, '10.1234/cnki.2024.001');
  assert.equal(records[0].identifier_raw, '10.1234/cnki.2024.001');
  assert.equal(records[1].title, 'Second title');
  assert.equal(records[1].url, 'https://doi.org/10.5555/abc');
  assert.equal(records[1].doi, 'https://doi.org/10.5555/abc');
  assert.equal(records[1].identifier_raw, 'https://doi.org/10.5555/abc');
});
