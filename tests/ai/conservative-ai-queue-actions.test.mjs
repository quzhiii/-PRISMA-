import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

async function readV22App() {
  return fs.readFile(path.join(repoRoot, 'literature-screening-v2.2/app.js'), 'utf8');
}

function extractFunctionBlock(source, functionName) {
  const marker = `function ${functionName}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Function not found: ${functionName}`);

  let signatureEnd = start;
  let parenDepth = 0;
  for (; signatureEnd < source.length; signatureEnd += 1) {
    const char = source[signatureEnd];
    if (char === '(') parenDepth += 1;
    if (char === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) {
        signatureEnd += 1;
        break;
      }
    }
  }

  const braceStart = source.indexOf('{', signatureEnd);
  let depth = 0;
  let index = braceStart;
  let quote = '';
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;
  let inTemplate = false;

  for (; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === quote) quote = '';
      continue;
    }
    if (inTemplate) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '`') inTemplate = false;
      continue;
    }
    if (char === '/' && next === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '`') {
      inTemplate = true;
      continue;
    }
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

async function loadQueueActionsHarness() {
  const source = await readV22App();
  const code = [
    `
let screeningResults = {
  included: [
    { record_id: 'record-1', title: 'Randomized trial record' },
    { record_id: 'record-2', title: 'Needs attention record' },
    { record_id: 'record-3', title: 'Exclusion check record' },
  ],
};
let aiSuggestionEvents = [
  {
    suggestionId: 'suggestion-1',
    recordId: 'record-1',
    stage: 'title_abstract',
    inputSummary: 'Randomized trial record',
    metadata: {
      advisoryOnly: true,
      recommendedQueue: 'likely_relevant',
      priorityScore: 92,
      uncertaintyFlags: [],
    },
  },
  {
    suggestionId: 'suggestion-2',
    recordId: 'record-2',
    stage: 'title_abstract',
    inputSummary: 'Needs attention record',
    metadata: {
      advisoryOnly: true,
      recommendedQueue: 'needs_human_attention',
      priorityScore: 61,
      uncertaintyFlags: ['missing_population_detail'],
    },
  },
  {
    suggestionId: 'suggestion-3',
    recordId: 'record-3',
    stage: 'title_abstract',
    inputSummary: 'Exclusion check record',
    metadata: {
      advisoryOnly: true,
      recommendedQueue: 'needs_human_exclusion_check',
      priorityScore: 33,
      uncertaintyFlags: ['protocol_or_non_result_record'],
    },
  },
  {
    suggestionId: 'suggestion-4',
    recordId: 'record-1',
    stage: 'title_abstract',
    inputSummary: 'Reviewed randomized trial record',
    humanAction: 'accepted',
    metadata: {
      advisoryOnly: true,
      recommendedQueue: 'likely_relevant',
      priorityScore: 99,
      uncertaintyFlags: [],
    },
  },
];
let conservativeAiQueueFilter = 'all';
let conservativeAiQueueSortMode = 'original';
let currentConservativeAiQueueContext = null;
let step4OpenCount = 0;
let lastGoToStep4Preserve = null;
const CONSERVATIVE_AI_QUEUE_LABELS = Object.freeze({
  likely_relevant: { zh: '优先保留', en: 'Likely relevant' },
  needs_human_attention: { zh: '需要人工关注', en: 'Needs human attention' },
  needs_human_exclusion_check: { zh: '需要重点排除核查', en: 'Needs human exclusion check' },
});
const documentElements = new Map();
const document = {
  documentElement: { lang: 'en' },
  getElementById(id) {
    return documentElements.get(id) || null;
  },
};
function createElement(id, patch = {}) {
  const element = Object.assign({
    id,
    innerHTML: '',
    textContent: '',
    hidden: false,
    dataset: {},
    scrollCalls: 0,
    focusCalls: 0,
    scrollIntoView() {
      this.scrollCalls += 1;
    },
    focus() {
      this.focusCalls += 1;
    },
  }, patch);
  documentElements.set(id, element);
  return element;
}
createElement('conservativeAiQueuePanel');
createElement('conservativeAiStep4ContextBanner');
function clearConservativeAiQueueContext() {
  currentConservativeAiQueueContext = null;
  renderConservativeAiStep4ContextBanner();
  return currentConservativeAiQueueContext;
}
function displayFulltextReviewUI() {
  renderConservativeAiStep4ContextBanner();
}
function goToStep4(options = {}) {
  step4OpenCount += 1;
  const preserveQueueContext = options?.preserveQueueContext === true;
  lastGoToStep4Preserve = preserveQueueContext;
  if (!preserveQueueContext) {
    clearConservativeAiQueueContext();
  }
  displayFulltextReviewUI();
}
function setConservativeAiQueueContext(recordId) {
  const normalizedRecordId = String(recordId || '').trim();
  const matchingEntry = normalizedRecordId
    ? [...aiSuggestionEvents].reverse().find((entry) => {
        const entryRecordId = String(entry?.recordId || entry?.record_id || '').trim();
        const stage = String(entry?.stage || '').trim();
        return entryRecordId === normalizedRecordId && stage === 'title_abstract' && entry?.metadata?.advisoryOnly === true;
      }) || null
    : null;

  currentConservativeAiQueueContext = matchingEntry
    ? {
        recordId: normalizedRecordId,
        title: String(matchingEntry.inputSummary || matchingEntry.recordTitle || matchingEntry.recordId || normalizedRecordId),
        recommendedQueue: String(matchingEntry?.metadata?.recommendedQueue || '').trim(),
        priorityScore: matchingEntry?.metadata?.priorityScore ?? null,
        uncertaintyFlags: Array.isArray(matchingEntry?.metadata?.uncertaintyFlags) ? matchingEntry.metadata.uncertaintyFlags : [],
      }
    : null;

  renderConservativeAiStep4ContextBanner();
  return currentConservativeAiQueueContext;
}
function renderConservativeAiStep4ContextBanner() {
  const container = document.getElementById('conservativeAiStep4ContextBanner');
  if (!container) return;

  if (!currentConservativeAiQueueContext) {
    container.innerHTML = '';
    return;
  }

  const context = currentConservativeAiQueueContext;
  const uncertaintyFlags = Array.isArray(context.uncertaintyFlags) && context.uncertaintyFlags.length > 0
    ? context.uncertaintyFlags.join(', ')
    : '-';

  container.innerHTML = [
    context.recommendedQueue === 'needs_human_attention' ? 'Needs human attention' : (context.recommendedQueue || '-'),
    String(context.priorityScore ?? '-'),
    uncertaintyFlags,
    context.title || context.recordId || '',
  ].join(' | ');
}
function renderConservativeAiQueuePanel() {
  const container = document.getElementById('conservativeAiQueuePanel');
  if (!container) return;
  const entries = aiSuggestionEvents.filter((entry) => (
    entry?.stage === 'title_abstract' && entry?.metadata?.advisoryOnly === true
  ));
  const summary = getConservativeAiQueueSummary(entries);
  const bucketSummary = Object.keys(summary.buckets)
    .map((bucketKey) => getConservativeAiQueueLabel(bucketKey) + ': ' + summary.buckets[bucketKey])
    .join(' | ');
  const filtered = conservativeAiQueueFilter === 'all'
    ? getSortedConservativeAiQueueEntries(entries)
    : getSortedConservativeAiQueueEntries(entries.filter((entry) => entry?.metadata?.recommendedQueue === conservativeAiQueueFilter));
  container.innerHTML = [
    'Queue summary',
    'Total suggestions: ' + summary.total,
    'Pending review: ' + summary.pending,
    'Reviewed: ' + summary.reviewed,
    bucketSummary,
    filtered.map((entry) => entry.inputSummary).join(' | '),
  ].join(' | ');
}
`,
    extractFunctionBlock(source, 'getAiSuggestionPanelLang'),
    extractFunctionBlock(source, 'getAiSuggestionLocalizedLabel'),
    extractFunctionBlock(source, 'getConservativeAiQueueLabel'),
    extractFunctionBlock(source, 'getConservativeAiQueueSummary'),
    extractFunctionBlock(source, 'setConservativeAiQueueSortMode'),
    extractFunctionBlock(source, 'getSortedConservativeAiQueueEntries'),
    extractFunctionBlock(source, 'getRecordAuditId'),
    extractFunctionBlock(source, 'getAuditRecordIndexMap'),
    extractFunctionBlock(source, 'setConservativeAiQueueFilter'),
    extractFunctionBlock(source, 'focusFulltextReviewRecord'),
    extractFunctionBlock(source, 'openConservativeAiQueueRecord'),
    `
function seedFulltextRow(index, recordId) {
  const row = createElement('fulltext-review-row-' + index, { dataset: { recordId } });
  const select = createElement('exclude-' + index);
  return { row, select };
}
function getState() {
  return {
    conservativeAiQueueFilter,
    conservativeAiQueueSortMode,
    sourceOrder: aiSuggestionEvents.map((entry) => entry.inputSummary),
    currentConservativeAiQueueContext,
    step4OpenCount,
    lastGoToStep4Preserve,
    queueHtml: document.getElementById('conservativeAiQueuePanel')?.innerHTML || '',
    bannerHtml: document.getElementById('conservativeAiStep4ContextBanner')?.innerHTML || '',
    row1: document.getElementById('fulltext-review-row-1'),
    select1: document.getElementById('exclude-1'),
  };
}
this.__exports = {
  renderConservativeAiQueuePanel,
  setConservativeAiQueueFilter,
  setConservativeAiQueueSortMode,
  setConservativeAiQueueContext,
  goToStep4,
  focusFulltextReviewRecord,
  openConservativeAiQueueRecord,
  seedFulltextRow,
  getState,
};
`,
  ].join('\n\n');

  const context = { console };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.__exports;
}

test('queue action helpers are wired into the Step 3 advisory surface', async () => {
  const source = await readV22App();

  assert.match(source, /function setConservativeAiQueueFilter/);
  assert.match(source, /function setConservativeAiQueueContext/);
  assert.match(source, /function clearConservativeAiQueueContext/);
  assert.match(source, /function renderConservativeAiStep4ContextBanner/);
  assert.match(source, /function focusFulltextReviewRecord/);
  assert.match(source, /function openConservativeAiQueueRecord/);
  assert.match(source, /openConservativeAiQueueRecord\(/);
  assert.match(source, /preserveQueueContext/);
  assert.match(source, /setConservativeAiQueueFilter\('/);
  assert.match(source, /const activeFilter = \['all'/);
  assert.match(source, /const visibleBuckets = activeFilter === 'all'/);
});

test('queue filters can narrow the Step 3 conservative AI buckets', async () => {
  const harness = await loadQueueActionsHarness();

  harness.renderConservativeAiQueuePanel();
  let state = harness.getState();
  assert.match(state.queueHtml, /Randomized trial record/);
  assert.match(state.queueHtml, /Needs attention record/);
  assert.match(state.queueHtml, /Exclusion check record/);

  harness.setConservativeAiQueueFilter('needs_human_attention');
  state = harness.getState();
  assert.equal(state.conservativeAiQueueFilter, 'needs_human_attention');
  assert.match(state.queueHtml, /Needs attention record/);
  assert.doesNotMatch(state.queueHtml, /Randomized trial record/);
  assert.doesNotMatch(state.queueHtml, /Exclusion check record/);
});

test('queue summary shows advisory workload and review state without changing metadata', async () => {
  const harness = await loadQueueActionsHarness();

  harness.renderConservativeAiQueuePanel();
  const state = harness.getState();

  assert.match(state.queueHtml, /Queue summary/);
  assert.match(state.queueHtml, /Total suggestions[^0-9]*4/);
  assert.match(state.queueHtml, /Pending review[^0-9]*3/);
  assert.match(state.queueHtml, /Reviewed[^0-9]*1/);
  assert.match(state.queueHtml, /Likely relevant[^0-9]*2/);
  assert.match(state.queueHtml, /Needs human attention[^0-9]*1/);
  assert.match(state.queueHtml, /Needs human exclusion check[^0-9]*1/);
});

test('queue sorting toggles display order without mutating source events', async () => {
  const harness = await loadQueueActionsHarness();

  harness.setConservativeAiQueueFilter('likely_relevant');
  harness.renderConservativeAiQueuePanel();
  let state = harness.getState();
  assert.equal(state.conservativeAiQueueSortMode, 'original');
  assert.ok(state.queueHtml.indexOf('Randomized trial record') < state.queueHtml.indexOf('Reviewed randomized trial record'));

  harness.setConservativeAiQueueSortMode('priority');
  state = harness.getState();
  assert.equal(state.conservativeAiQueueSortMode, 'priority');
  assert.ok(state.queueHtml.indexOf('Reviewed randomized trial record') < state.queueHtml.indexOf('Randomized trial record'));
  assert.equal(JSON.stringify(state.sourceOrder), JSON.stringify([
    'Randomized trial record',
    'Needs attention record',
    'Exclusion check record',
    'Reviewed randomized trial record',
  ]));

  harness.setConservativeAiQueueSortMode('original');
  state = harness.getState();
  assert.equal(state.conservativeAiQueueSortMode, 'original');
});

test('queue record focus targets the matching Step 4 full-text controls', async () => {
  const harness = await loadQueueActionsHarness();
  harness.seedFulltextRow(1, 'record-2');

  const focused = harness.focusFulltextReviewRecord('record-2');
  const state = harness.getState();

  assert.equal(focused, true);
  assert.equal(state.row1.scrollCalls, 1);
  assert.equal(state.select1.focusCalls, 1);
});

test('opening a queue record hands off into Step 4 before focusing the record', async () => {
  const harness = await loadQueueActionsHarness();
  harness.seedFulltextRow(1, 'record-2');

  const opened = harness.openConservativeAiQueueRecord('record-2');
  const state = harness.getState();

  assert.equal(opened, true);
  assert.equal(state.step4OpenCount, 1);
  assert.equal(state.lastGoToStep4Preserve, true);
  assert.equal(state.row1.scrollCalls, 1);
  assert.equal(state.select1.focusCalls, 1);
});

test('normal Step 4 entry clears stale advisory context', async () => {
  const harness = await loadQueueActionsHarness();

  harness.setConservativeAiQueueContext('record-2');
  harness.goToStep4();
  const state = harness.getState();

  assert.equal(state.lastGoToStep4Preserve, false);
  assert.equal(state.currentConservativeAiQueueContext, null);
  assert.equal(state.bannerHtml, '');
});

test('opening a queue record captures and renders Step 4 advisory context', async () => {
  const harness = await loadQueueActionsHarness();
  harness.seedFulltextRow(1, 'record-2');

  harness.openConservativeAiQueueRecord('record-2');
  const state = harness.getState();

  assert.equal(state.currentConservativeAiQueueContext?.recordId, 'record-2');
  assert.equal(state.currentConservativeAiQueueContext?.recommendedQueue, 'needs_human_attention');
  assert.equal(state.currentConservativeAiQueueContext?.priorityScore, 61);
  assert.match(state.bannerHtml, /Needs human attention/);
  assert.match(state.bannerHtml, /61/);
  assert.match(state.bannerHtml, /missing_population_detail/);
});
