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

async function readV22Workspace() {
  return fs.readFile(path.join(repoRoot, 'literature-screening-v2.2/workspace.html'), 'utf8');
}

function extractSimpleFunctionBlock(source, functionName) {
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

async function loadToggleHarness() {
  const source = await readV22App();
  const elements = new Map();
  const code = [
    `
const document = {
  getElementById(id) {
    return globalThis.__elements.get(id) || null;
  },
};
`,
    extractSimpleFunctionBlock(source, 'getAiSuggestionControlId'),
    extractSimpleFunctionBlock(source, 'toggleAiSuggestionEditReason'),
    `
function putElement(id, patch = {}) {
  const element = Object.assign({
    id,
    value: '',
    hidden: false,
    disabled: false,
  }, patch);
  globalThis.__elements.set(id, element);
  return element;
}
this.__exports = {
  getAiSuggestionControlId,
  toggleAiSuggestionEditReason,
  putElement,
};
`,
  ].join('\n\n');

  const context = { __elements: elements };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.__exports;
}

test('Step 6 workspace exposes PRISMA-trAIce controls and the AI suggestion panel mount', async () => {
  const workspace = await readV22Workspace();

  assert.match(workspace, /V2\.6 Conservative AI/);
  assert.match(workspace, /PRISMA-trAIce/);
  assert.match(workspace, /name="aiMode" value="off"/);
  assert.match(workspace, /name="aiMode" value="assistive"/);
  assert.match(workspace, /name="aiMode" value="experimental"/);
  assert.match(workspace, /onclick="generateConservativeAiSuggestions\(\)"/);
  assert.match(workspace, /onclick="generateMockAiSuggestions\(\)"/);
  assert.match(workspace, /id="aiSuggestionPanel"/);
  assert.match(workspace, /ai-provider-engine\.js/);
  assert.match(workspace, /conservative-ai-engine\.js/);
  assert.match(workspace, /Provider boundary/);
  assert.match(workspace, /real API dispatch remains disabled/);
  assert.match(workspace, /id="aiProviderConfigPanel"/);
});

test('Step 3 workspace exposes the conservative AI queue surface', async () => {
  const workspace = await readV22Workspace();

  assert.match(workspace, /STEP 03/);
  assert.match(workspace, /id="conservativeAiQueuePanel"/);
  assert.match(workspace, /generateConservativeAiSuggestions\(\)/);
});

test('AI provider configuration shell is boundary-only and does not expose API key input', async () => {
  const source = await readV22App();

  assert.match(source, /function renderAiProviderConfigPanel/);
  assert.match(source, /function saveAiProviderConfig/);
  assert.match(source, /aiProviderType/);
  assert.match(source, /aiProviderEndpoint/);
  assert.match(source, /requestPolicy is fixed to disabled/);
  assert.match(source, /apiKeyPresent: false/);
  assert.doesNotMatch(source, /id="aiProviderApiKey"/);
  assert.doesNotMatch(source, /type="password"/);
});

test('AI suggestion panel renders explicit rewrite selectors for pending suggestions', async () => {
  const source = await readV22App();

  assert.match(source, /function renderAiSuggestionPanel/);
  assert.match(source, /AUDIT_ENGINE\.summarizeAiSuggestions\(aiSuggestionEvents\)/);
  assert.match(source, /const summaryHtml = `/);
  assert.match(source, /Total suggestions/);
  assert.match(source, /Pending/);
  assert.match(source, /Reviewed/);
  assert.match(source, /Linked human decisions/);
  assert.match(source, /Advisory-only reviews/);
  assert.match(source, /do not enter PRISMA counts directly/);
  assert.match(source, /const ui = panelLang === 'zh'/);
  assert.match(source, /\$\{escapeHTML\(ui\.summaryNote\)\}/);
  assert.match(source, /const isPending = entry\.humanAction === 'pending'/);
  assert.match(source, /Human rewrite decision/);
  assert.match(source, /Priority score/);
  assert.match(source, /Recommended queue/);
  assert.match(source, /Uncertainty flags/);
  assert.match(source, /function getConservativeAiQueueLabel/);
  assert.match(source, /getConservativeAiQueueLabel\(metadata\.recommendedQueue\)/);
  assert.match(source, /AI_SUGGESTION_DECISION_LABELS/);
  assert.match(source, /getAiSuggestionDecisionLabel\(decision\)/);
  assert.match(source, /const decisionOptions = \['include', 'exclude', 'uncertain'\]/);
  assert.match(source, /<option value="\$\{decision\}">/);
  assert.match(source, /Exclusion reason/);
  assert.match(source, /const chooseReasonText = panelLang === 'zh'/);
  assert.match(source, /Choose a reason/);
  assert.match(source, /reasonOptions/);
  assert.match(source, /editAiSuggestion\('\$\{suggestionId\}', document\.getElementById\('\$\{editDecisionId\}'\)\?\.value, document\.getElementById\('\$\{editReasonId\}'\)\?\.value\)/);
});

test('conservative AI queue panel renders workflow-facing recommendation buckets', async () => {
  const source = await readV22App();

  assert.match(source, /function renderConservativeAiQueuePanel/);
  assert.match(source, /CONSERVATIVE_AI_QUEUE_LABELS/);
  assert.match(source, /function setConservativeAiQueueFilter/);
  assert.match(source, /function openConservativeAiQueueRecord/);
  assert.match(source, /likely_relevant/);
  assert.match(source, /needs_human_attention/);
  assert.match(source, /needs_human_exclusion_check/);
  assert.match(source, /getConservativeAiQueueLabel\(context\.recommendedQueue\)/);
  assert.match(source, /uncertaintyFlags/);
  assert.match(source, /Go to full-text review/);
});

test('AI suggestion panel disables accept edit and reject actions after review', async () => {
  const source = await readV22App();

  assert.match(source, /\$\{!isPending \? 'disabled' : ''\}/);
  assert.match(source, /Linked decision/);
  assert.match(source, /entry\.linkedDecisionId/);
  assert.match(source, /const editControls = isPending/);
  assert.match(source, /: '';/);
});

test('exclude selection toggles the reason selector on and off', async () => {
  const harness = await loadToggleHarness();
  const suggestionId = 'suggestion-1';
  const decisionId = harness.getAiSuggestionControlId(suggestionId, 'edit-decision');
  const wrapperId = harness.getAiSuggestionControlId(suggestionId, 'edit-reason-wrapper');
  const reasonId = harness.getAiSuggestionControlId(suggestionId, 'edit-reason');
  const decisionSelect = harness.putElement(decisionId, { value: 'include' });
  const reasonWrapper = harness.putElement(wrapperId, { hidden: false });
  const reasonSelect = harness.putElement(reasonId, { disabled: false });

  harness.toggleAiSuggestionEditReason(suggestionId);
  assert.equal(reasonWrapper.hidden, true);
  assert.equal(reasonSelect.disabled, true);

  decisionSelect.value = 'exclude';
  harness.toggleAiSuggestionEditReason(suggestionId);
  assert.equal(reasonWrapper.hidden, false);
  assert.equal(reasonSelect.disabled, false);
});
