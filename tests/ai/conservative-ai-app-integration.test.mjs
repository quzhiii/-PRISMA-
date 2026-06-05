import fs from 'node:fs/promises';
import path from 'node:path';
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

test('workspace loads V2.6 conservative AI before app and exposes advisory action', async () => {
  const workspace = await readV22Workspace();
  const conservativeScript = '<script src="conservative-ai-engine.js?v=20260604-v26-foundation"></script>';
  const appScript = '<script src="app.js?v=20260512-v25-dual-review-exports"></script>';

  assert.match(workspace, /conservative-ai-engine\.js/);
  assert.ok(
    workspace.indexOf(conservativeScript) < workspace.indexOf(appScript),
    'conservative AI engine must load before app.js'
  );
  assert.match(workspace, /V2\.6 Conservative AI/);
  assert.match(workspace, /generateConservativeAiSuggestions\(\)/);
  assert.match(workspace, /id="conservativeAiQueuePanel"/);
  assert.match(workspace, /id="conservativeAiStep4ContextBanner"/);
  assert.match(workspace, /real API dispatch remains disabled/);
  assert.doesNotMatch(workspace, /id="aiProviderApiKey"/);
  assert.doesNotMatch(workspace, /type="password"/);
});

test('app wires V2.6 conservative suggestions as advisory-only events', async () => {
  const source = await readV22App();

  assert.match(source, /const CONSERVATIVE_AI_ENGINE/);
  assert.match(source, /function buildConservativeAiSuggestionForRecord/);
  assert.match(source, /function generateConservativeAiSuggestions/);
  assert.match(source, /function renderConservativeAiQueuePanel/);
  assert.match(source, /function setConservativeAiQueueFilter/);
  assert.match(source, /function setConservativeAiQueueContext/);
  assert.match(source, /function clearConservativeAiQueueContext/);
  assert.match(source, /function renderConservativeAiStep4ContextBanner/);
  assert.match(source, /function focusFulltextReviewRecord/);
  assert.match(source, /function openConservativeAiQueueRecord/);
  assert.match(source, /renderConservativeAiQueuePanel\(\)/);
  assert.match(source, /priorityScore/);
  assert.match(source, /recommendedQueue/);
  assert.match(source, /uncertaintyFlags/);
  assert.match(source, /advisoryOnly/);
  assert.match(source, /likely_relevant/);
  assert.match(source, /needs_human_attention/);
  assert.match(source, /needs_human_exclusion_check/);

  const generator = extractFunctionBlock(source, 'generateConservativeAiSuggestions');
  assert.match(generator, /appendAiSuggestionEventsSafe\(suggestions/);
  assert.doesNotMatch(generator, /upsertScreeningDecisionSafe/);
  assert.doesNotMatch(generator, /buildHumanConfirmedDecisionFromSuggestion/);

  const displayResults = extractFunctionBlock(source, 'displayResults');
  assert.match(displayResults, /renderConservativeAiQueuePanel\(\)/);

  const fulltextUi = extractFunctionBlock(source, 'displayFulltextReviewUI');
  assert.match(fulltextUi, /renderConservativeAiStep4ContextBanner\(\)/);
  assert.match(fulltextUi, /fulltext-review-row-/);
  assert.match(fulltextUi, /data-record-id/);

  const goToStep4 = extractFunctionBlock(source, 'goToStep4');
  assert.match(goToStep4, /preserveQueueContext/);
  assert.match(goToStep4, /clearConservativeAiQueueContext\(\)/);
});
