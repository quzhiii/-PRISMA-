import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const AiProviderEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/ai-provider-engine.js'));

test('normalizes provider configuration without leaking API keys', () => {
  const config = AiProviderEngine.normalizeProviderConfig({
    providerType: 'user_provided_endpoint',
    providerName: 'OpenAI-compatible test endpoint',
    modelName: 'screening-model',
    endpointUrl: 'https://api.example.test/v1/chat/completions?api_key=secret-value',
    apiKey: 'secret-value',
    allowedStages: ['title_abstract', 'unknown_stage', 'full_text'],
    dataBoundary: 'cloud_submitted',
    requestPolicy: 'manual_dispatch',
  });

  assert.equal(config.providerType, 'user_provided_endpoint');
  assert.equal(config.endpointUrl, 'https://api.example.test/v1/chat/completions');
  assert.equal(config.endpointOrigin, 'https://api.example.test');
  assert.equal(config.apiKeyPresent, true);
  assert.equal(config.apiKeyStorage, 'session_only');
  assert.deepEqual(config.allowedStages, ['title_abstract', 'full_text']);
  assert.equal(config.realProviderConnected, true);

  const redacted = AiProviderEngine.redactSecrets({
    headers: {
      Authorization: 'Bearer secret-value',
      'x-api-key': 'secret-value',
    },
    body: {
      prompt: 'keep this',
    },
  });

  assert.equal(redacted.headers.Authorization, '[redacted]');
  assert.equal(redacted.headers['x-api-key'], '[redacted]');
  assert.equal(redacted.body.prompt, 'keep this');
  assert.doesNotMatch(JSON.stringify(redacted), /secret-value/);
});

test('creates provider request drafts without dispatching real API calls', () => {
  const draft = AiProviderEngine.createProviderRequestDraft({
    providerConfig: {
      providerType: 'user_provided_endpoint',
      providerName: 'OpenAI-compatible test endpoint',
      modelName: 'screening-model',
      endpointUrl: 'https://api.example.test/v1/chat/completions',
      apiKeyPresent: true,
      allowedStages: ['title_abstract'],
      requestPolicy: 'manual_dispatch',
      dataBoundary: 'cloud_submitted',
    },
    stage: 'title_abstract',
    prompt: {
      promptId: 'title-abstract-screening',
      promptVersion: 'v1',
      template: 'Decide include/exclude/uncertain.',
    },
    input: {
      recordId: 'record-1',
      title: 'A randomized trial of a relevant intervention',
      abstract: 'Eligible population and outcome.',
    },
  });

  assert.equal(draft.status, 'not_dispatched');
  assert.equal(draft.canDispatch, false);
  assert.equal(draft.reason, 'real_provider_dispatch_disabled');
  assert.equal(draft.rawPayloadIncluded, false);
  assert.match(draft.promptHash, /^local-hash-v1-/);
  assert.match(draft.inputHash, /^local-hash-v1-/);
  assert.equal(draft.provider.apiKeyPresent, true);
  assert.equal(draft.provider.endpointUrl, 'https://api.example.test/v1/chat/completions');
});

test('builds audit registry entries with redacted provider metadata', () => {
  const entry = AiProviderEngine.buildAuditRegistryEntry({
    providerType: 'user_provided_endpoint',
    providerName: 'Team endpoint',
    modelName: 'screening-model',
    endpointUrl: 'https://user:pass@api.example.test/v1/responses?key=secret',
    apiKey: 'secret',
    allowedStages: ['title_abstract'],
    dataBoundary: 'hash_only',
  }, {
    projectId: 'project-1',
    aiMode: 'experimental',
    userAcknowledged: true,
  });

  assert.equal(entry.projectId, 'project-1');
  assert.equal(entry.aiMode, 'experimental');
  assert.equal(entry.providerType, 'user_provided_endpoint');
  assert.equal(entry.providerName, 'Team endpoint');
  assert.equal(entry.modelName, 'screening-model');
  assert.equal(entry.dataBoundary, 'hash_only');
  assert.equal(entry.userAcknowledged, true);
  assert.equal(entry.metadata.providerConfig.endpointUrl, 'https://api.example.test/v1/responses');
  assert.equal(entry.metadata.providerConfig.apiKeyPresent, true);
  assert.equal(entry.metadata.realProviderConnected, false);
  assert.doesNotMatch(JSON.stringify(entry), /secret|user:pass/);
});

test('builds suggestion trace metadata for local mock suggestions', () => {
  const trace = AiProviderEngine.buildSuggestionTrace({
    providerConfig: {
      providerType: 'local',
      providerName: 'local_mock_provider',
      modelName: 'mock-screening-assistant',
      allowedStages: ['title_abstract'],
      dataBoundary: 'local_only',
    },
    stage: 'title_abstract',
    prompt: {
      promptId: 'mock-title-abstract-screening',
      promptVersion: 'v1',
      template: 'Local mock relevance heuristic.',
    },
    input: {
      recordId: 'record-1',
      title: 'A randomized trial',
      abstract: 'Eligible outcome.',
    },
  });

  assert.equal(trace.modelName, 'mock-screening-assistant');
  assert.match(trace.promptHash, /^local-hash-v1-/);
  assert.match(trace.inputHash, /^local-hash-v1-/);
  assert.equal(trace.metadata.requestStatus, 'not_dispatched');
  assert.equal(trace.metadata.requestReason, 'real_provider_dispatch_disabled');
  assert.equal(trace.metadata.realProviderConnected, false);
  assert.equal(trace.metadata.providerConfig.dataBoundary, 'local_only');
});
