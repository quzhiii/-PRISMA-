import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const AuditEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/audit-engine.js'));
const AiProviderEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/ai-provider-engine.js'));

function extractFunctionBlock(source, functionName) {
  const marker = `function ${functionName}(`;
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`Function not found: ${functionName}`);
  }

  let parenDepth = 0;
  let signatureEnd = start;
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

async function loadAiReviewHarness() {
  const source = await fs.readFile(path.join(repoRoot, 'literature-screening-v2.2/app.js'), 'utf8');
  const code = [
    `
const AUDIT_ENGINE = globalThis.AuditEngine;
const AI_PROVIDER_ENGINE = globalThis.AiProviderEngine;
const WORKFLOW_STEP_COUNT = 6;
let uploadedData = [
  {
    record_id: 'record-include',
    title: 'Randomized trial of an eligible intervention',
    abstract: 'A cohort randomized study with relevant outcomes.',
    _sourceFile: 'fixture.csv',
    _source: 'FixtureDB',
  },
  {
    record_id: 'record-exclude',
    title: 'Editorial commentary outside the target population',
    abstract: 'Not an empirical intervention study.',
    _sourceFile: 'fixture.csv',
    _source: 'FixtureDB',
  },
  {
    record_id: 'record-uncertain',
    title: 'Sparse abstract with limited eligibility signals',
    abstract: '',
    _sourceFile: 'fixture.csv',
    _source: 'FixtureDB',
  },
];
let uploadedFiles = [{ source: 'FixtureDB', name: 'fixture.csv' }];
let currentProjectId = 'project-ai-review-flow';
let projectManifest = null;
let auditEvents = [];
let screeningDecisions = [];
let aiSuggestionEvents = [];
let currentUserSession = { username: 'reviewer_1', role: 'reviewer' };
let runtimeSession = null;
let isDualReviewMode = false;
let currentReviewer = 'A';
let persistedSnapshots = 0;
let renderedPanels = 0;
let toastLog = [];
const localStorage = {
  store: new Map(),
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  },
  setItem(key, value) {
    this.store.set(key, String(value));
  },
};
function showToast(message, type) {
  toastLog.push({ message, type });
}
function renderAiSuggestionPanel() {
  renderedPanels += 1;
}
function persistCurrentProjectState() {
  persistedSnapshots += 1;
  persistAuditState();
}
`,
    extractFunctionBlock(source, 'getAuditActorContext'),
    extractFunctionBlock(source, 'getRecordAuditId'),
    extractFunctionBlock(source, 'normalizeAuditExclusionReason'),
    extractFunctionBlock(source, 'ensureProjectManifest'),
    extractFunctionBlock(source, 'updateProjectManifestSafe'),
    extractFunctionBlock(source, 'upsertAiUsageRegistrySafe'),
    extractFunctionBlock(source, 'appendAiSuggestionEventsSafe'),
    extractFunctionBlock(source, 'updateAiSuggestionEventSafe'),
    extractFunctionBlock(source, 'getDefaultAiProviderConfig'),
    extractFunctionBlock(source, 'normalizeAiProviderConfigSafe'),
    extractFunctionBlock(source, 'getCurrentAiProviderConfig'),
    extractFunctionBlock(source, 'buildAiUsageRegistryEntrySafe'),
    extractFunctionBlock(source, 'buildAiSuggestionTraceSafe'),
    extractFunctionBlock(source, 'ensureDefaultAiUsageRegistry'),
    extractFunctionBlock(source, 'setAiModeSafe'),
    extractFunctionBlock(source, 'buildMockAiSuggestionForRecord'),
    extractFunctionBlock(source, 'getAiSuggestionIdentity'),
    extractFunctionBlock(source, 'hasAiSuggestionForIdentity'),
    extractFunctionBlock(source, 'generateMockAiSuggestions'),
    extractFunctionBlock(source, 'getAiSuggestionById'),
    extractFunctionBlock(source, 'normalizeAiHumanDecision'),
    extractFunctionBlock(source, 'buildHumanConfirmedDecisionFromSuggestion'),
    extractFunctionBlock(source, 'acceptAiSuggestion'),
    extractFunctionBlock(source, 'rejectAiSuggestion'),
    extractFunctionBlock(source, 'editAiSuggestion'),
    extractFunctionBlock(source, 'persistAuditState'),
    extractFunctionBlock(source, 'appendAuditEventsSafe'),
    extractFunctionBlock(source, 'upsertScreeningDecisionSafe'),
    extractFunctionBlock(source, 'generateProjectId'),
    extractFunctionBlock(source, 'getProjectStorageKey'),
    extractFunctionBlock(source, 'ensureProjectId'),
    `
function getState() {
  return {
    projectManifest,
    auditEvents,
    screeningDecisions,
    aiSuggestionEvents,
    persistedSnapshots,
    renderedPanels,
    toastLog,
  };
}
this.__exports = {
  generateMockAiSuggestions,
  acceptAiSuggestion,
  rejectAiSuggestion,
  editAiSuggestion,
  getState,
};
`,
  ].join('\n\n');

  const context = { AuditEngine, AiProviderEngine, console };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.__exports;
}

function getReviewedEvent(state, suggestionId, humanAction) {
  return state.auditEvents.find((event) => (
    event.eventType === 'ai_suggestion_reviewed' &&
    event.after?.suggestionId === suggestionId &&
    event.after?.humanAction === humanAction
  ));
}

test('mock AI suggestions remain separate from final screening decisions until reviewed', async () => {
  const harness = await loadAiReviewHarness();

  const suggestions = harness.generateMockAiSuggestions(2);
  const state = harness.getState();
  const counts = AuditEngine.calculatePrismaCountsFromDecisions(state.screeningDecisions, state.auditEvents);

  assert.equal(suggestions.length, 2);
  assert.equal(state.aiSuggestionEvents.length, 2);
  assert.equal(state.screeningDecisions.length, 0);
  assert.equal(counts.titleAbstractIncluded, 0);
  assert.equal(counts.titleAbstractExcluded, 0);
  assert.equal(state.aiSuggestionEvents.every((entry) => entry.humanAction === 'pending'), true);
  assert.equal(state.aiSuggestionEvents.every((entry) => entry.metadata.requestStatus === 'not_dispatched'), true);
  assert.equal(state.aiSuggestionEvents.every((entry) => entry.metadata.rawPayloadIncluded === false), true);
  assert.equal(state.aiSuggestionEvents.every((entry) => entry.metadata.realProviderConnected === false), true);
  assert.equal(state.aiSuggestionEvents.every((entry) => entry.metadata.providerConfig.providerType === 'local'), true);
  assert.match(state.aiSuggestionEvents[0].promptHash, /^local-hash-v1-/);
  assert.match(state.aiSuggestionEvents[0].inputHash, /^local-hash-v1-/);
});

test('mock AI suggestion generation skips records that already have a suggestion identity', async () => {
  const harness = await loadAiReviewHarness();

  const firstBatch = harness.generateMockAiSuggestions(2);
  const secondBatch = harness.generateMockAiSuggestions(2);
  const state = harness.getState();
  const generatedEvents = state.auditEvents.filter((event) => event.eventType === 'ai_suggestion_generated');

  assert.equal(firstBatch.length, 2);
  assert.equal(secondBatch.length, 0);
  assert.equal(state.aiSuggestionEvents.length, 2);
  assert.equal(generatedEvents.at(-1).after.suggestionCount, 0);
  assert.equal(generatedEvents.at(-1).after.skippedExistingSuggestionCount, 2);
  assert.match(state.toastLog.at(-1).message, /跳过 2 条已有建议/);
  assert.equal(state.toastLog.at(-1).type, 'info');
});

test('accepting an AI suggestion creates a human-confirmed ScreeningDecision', async () => {
  const harness = await loadAiReviewHarness();
  harness.generateMockAiSuggestions(1);
  const [suggestion] = harness.getState().aiSuggestionEvents;

  harness.acceptAiSuggestion(suggestion.suggestionId);
  const state = harness.getState();
  const reviewedSuggestion = state.aiSuggestionEvents.find((entry) => entry.suggestionId === suggestion.suggestionId);
  const decision = state.screeningDecisions.find((entry) => entry.decisionId === reviewedSuggestion.linkedDecisionId);
  const reviewEvent = getReviewedEvent(state, suggestion.suggestionId, 'accepted');
  const counts = AuditEngine.calculatePrismaCountsFromDecisions(state.screeningDecisions, state.auditEvents);

  assert.equal(reviewedSuggestion.humanAction, 'accepted');
  assert.ok(reviewedSuggestion.linkedDecisionId);
  assert.ok(reviewedSuggestion.metadata.reviewedAt);
  assert.match(reviewedSuggestion.metadata.reviewNote, /linked ScreeningDecision/);
  assert.equal(decision.source, 'human_ai_confirmation');
  assert.equal(decision.decision, suggestion.suggestedDecision);
  assert.equal(decision.aiAssistanceUsed, true);
  assert.equal(reviewEvent.after.linkedDecisionId, decision.decisionId);
  assert.equal(reviewEvent.after.reviewedAt, reviewedSuggestion.metadata.reviewedAt);
  assert.equal(counts.titleAbstractIncluded, 1);
});

test('rejecting an AI suggestion logs review but does not change PRISMA counts', async () => {
  const harness = await loadAiReviewHarness();
  harness.generateMockAiSuggestions(1);
  const [suggestion] = harness.getState().aiSuggestionEvents;

  harness.rejectAiSuggestion(suggestion.suggestionId);
  const state = harness.getState();
  const reviewedSuggestion = state.aiSuggestionEvents.find((entry) => entry.suggestionId === suggestion.suggestionId);
  const reviewEvent = getReviewedEvent(state, suggestion.suggestionId, 'rejected');
  const counts = AuditEngine.calculatePrismaCountsFromDecisions(state.screeningDecisions, state.auditEvents);

  assert.equal(reviewedSuggestion.humanAction, 'rejected');
  assert.equal(reviewedSuggestion.linkedDecisionId, '');
  assert.ok(reviewedSuggestion.metadata.reviewedAt);
  assert.match(reviewedSuggestion.metadata.reviewNote, /no ScreeningDecision/);
  assert.equal(state.screeningDecisions.length, 0);
  assert.equal(reviewEvent.after.linkedDecisionId, '');
  assert.equal(reviewEvent.after.reviewedAt, reviewedSuggestion.metadata.reviewedAt);
  assert.equal(counts.titleAbstractIncluded, 0);
  assert.equal(counts.titleAbstractExcluded, 0);
  assert.equal(counts.titleAbstractUncertain, 0);
});

test('editing an AI suggestion to exclude records a chosen decision and exclusion reason', async () => {
  const harness = await loadAiReviewHarness();
  harness.generateMockAiSuggestions(1);
  const [suggestion] = harness.getState().aiSuggestionEvents;
  const uiReason = '\u4eba\u7fa4\u4e0d\u7b26';

  harness.editAiSuggestion(suggestion.suggestionId, 'exclude', uiReason);
  const state = harness.getState();
  const reviewedSuggestion = state.aiSuggestionEvents.find((entry) => entry.suggestionId === suggestion.suggestionId);
  const decision = state.screeningDecisions.find((entry) => entry.decisionId === reviewedSuggestion.linkedDecisionId);
  const reviewEvent = getReviewedEvent(state, suggestion.suggestionId, 'edited');
  const counts = AuditEngine.calculatePrismaCountsFromDecisions(state.screeningDecisions, state.auditEvents);

  assert.equal(reviewedSuggestion.humanAction, 'edited');
  assert.ok(reviewedSuggestion.metadata.reviewedAt);
  assert.equal(reviewedSuggestion.metadata.humanEditedDecision, 'exclude');
  assert.equal(reviewedSuggestion.metadata.humanEditedExclusionReason, 'wrong_population');
  assert.match(reviewedSuggestion.metadata.reviewNote, /linked ScreeningDecision/);
  assert.equal(decision.decision, 'exclude');
  assert.equal(decision.exclusionReason, 'wrong_population');
  assert.equal(decision.metadata.originalExclusionReason, uiReason);
  assert.equal(reviewEvent.after.reviewedAt, reviewedSuggestion.metadata.reviewedAt);
  assert.equal(reviewEvent.after.editedDecision, 'exclude');
  assert.equal(reviewEvent.after.exclusionReason, 'wrong_population');
  assert.equal(counts.titleAbstractExcluded, 1);
});

test('editing an AI suggestion to uncertain creates an auditable human decision without a reason', async () => {
  const harness = await loadAiReviewHarness();
  harness.generateMockAiSuggestions(1);
  const [suggestion] = harness.getState().aiSuggestionEvents;

  harness.editAiSuggestion(suggestion.suggestionId, 'uncertain');
  const state = harness.getState();
  const reviewedSuggestion = state.aiSuggestionEvents.find((entry) => entry.suggestionId === suggestion.suggestionId);
  const decision = state.screeningDecisions.find((entry) => entry.decisionId === reviewedSuggestion.linkedDecisionId);
  const reviewEvent = getReviewedEvent(state, suggestion.suggestionId, 'edited');
  const counts = AuditEngine.calculatePrismaCountsFromDecisions(state.screeningDecisions, state.auditEvents);

  assert.equal(reviewedSuggestion.metadata.humanEditedDecision, 'uncertain');
  assert.equal(decision.decision, 'uncertain');
  assert.equal(decision.exclusionReason, '');
  assert.equal(reviewEvent.after.editedDecision, 'uncertain');
  assert.equal(reviewEvent.after.exclusionReason, '');
  assert.equal(counts.titleAbstractUncertain, 1);
});

test('editing to exclude without a reason is rejected before creating a decision', async () => {
  const harness = await loadAiReviewHarness();
  harness.generateMockAiSuggestions(1);
  const [suggestion] = harness.getState().aiSuggestionEvents;

  harness.editAiSuggestion(suggestion.suggestionId, 'exclude', '');
  const state = harness.getState();
  const reviewedSuggestion = state.aiSuggestionEvents.find((entry) => entry.suggestionId === suggestion.suggestionId);
  const reviewedEvents = state.auditEvents.filter((event) => event.eventType === 'ai_suggestion_reviewed');

  assert.equal(reviewedSuggestion.humanAction, 'pending');
  assert.equal(reviewedSuggestion.linkedDecisionId, '');
  assert.equal(state.screeningDecisions.length, 0);
  assert.equal(reviewedEvents.length, 0);
  assert.equal(state.toastLog.at(-1).type, 'warning');
});
