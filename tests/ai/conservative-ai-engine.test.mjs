import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const ConservativeAiEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/conservative-ai-engine.js'));

test('builds conservative prompt records with stable hashes and no raw payload', () => {
  const prompt = ConservativeAiEngine.buildConservativePromptRecord({
    promptId: 'v26-title-abstract-conservative-screening',
    promptVersion: 'v1',
    criteria: { include: ['randomized trial'], exclude: ['protocol'] },
  });

  assert.equal(prompt.schemaVersion, 'conservative_ai.v2.6');
  assert.match(prompt.promptHash, /^local-hash-v1-/);
  assert.match(prompt.criteriaHash, /^local-hash-v1-/);
  assert.equal(prompt.rawPayloadIncluded, false);
});

test('creates advisory local suggestions with priority and uncertainty metadata', () => {
  const suggestions = ConservativeAiEngine.buildConservativeSuggestionBatch([
    { record_id: 'r1', title: 'Randomized trial of acupuncture', abstract: 'Eligible intervention and outcome.' },
    { record_id: 'r2', title: 'Study protocol only', abstract: 'Protocol without results.' },
    { record_id: 'r3', title: 'Sparse record', abstract: '' },
  ], {
    projectId: 'project-v26',
    criteria: { include: ['trial'], exclude: ['protocol'] },
  });

  assert.equal(suggestions.length, 3);
  assert.equal(suggestions[0].mode, 'suggest_only');
  assert.equal(suggestions[0].suggestedDecision, 'include');
  assert.equal(suggestions[0].humanAction, 'pending');
  assert.equal(suggestions[0].metadata.advisoryOnly, true);
  assert.equal(suggestions[0].metadata.realProviderConnected, false);
  assert.equal(typeof suggestions[0].metadata.priorityScore, 'number');
  assert.equal(suggestions[1].suggestedDecision, 'exclude');
  assert.ok(suggestions[1].metadata.riskFlags.includes('protocol_or_non_result_record'));
  assert.equal(suggestions[2].suggestedDecision, 'uncertain');
  assert.ok(suggestions[2].metadata.uncertaintyFlags.includes('missing_or_short_abstract'));
  assert.doesNotMatch(JSON.stringify(suggestions), /api[_-]?key|authorization|bearer/i);
});

test('reuses audit-style bibliographic identifiers for conservative suggestion record IDs', () => {
  const [doiSuggestion, titleSuggestion, aliasSuggestion] = ConservativeAiEngine.buildConservativeSuggestionBatch([
    { doi: '10.1000/example-doi', title: 'Record without explicit record_id', abstract: 'Eligible intervention and outcome.' },
    { title: 'Unique bibliographic title', abstract: 'Sparse but still title-identified.' },
    { TI: 'Alias title field', abstract: 'Uses bibliographic aliases for audit identity.' },
  ], {
    projectId: 'project-v26',
    criteria: { include: ['eligible'] },
  });

  assert.equal(doiSuggestion.recordId, '10.1000/example-doi');
  assert.equal(titleSuggestion.recordId, 'Unique bibliographic title');
  assert.equal(aliasSuggestion.recordId, 'Alias title field');
});
