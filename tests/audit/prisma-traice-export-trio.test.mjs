import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const AuditEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/audit-engine.js'));

function parseJsonl(jsonl) {
  return jsonl.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

test('PRISMA-trAIce export trio keeps provider boundary and review counts aligned', () => {
  const manifest = AuditEngine.createProjectManifest({
    projectId: 'project-trio',
    projectName: 'PRISMA-trAIce export fixture',
    aiMode: 'assistive',
    aiUsageRegistry: [{
      usageId: 'default-ai-mode',
      projectId: 'project-trio',
      aiMode: 'assistive',
      providerType: 'user_provided_endpoint',
      providerName: 'team_endpoint_record_only',
      modelName: 'screening-model-alpha',
      allowedStages: ['title_abstract', 'reporting'],
      dataBoundary: 'hash_only',
      userAcknowledged: true,
      metadata: {
        providerConfig: {
          endpointOrigin: 'https://api.example.test',
          requestPolicy: 'disabled',
          realProviderConnected: false,
          apiKeyPresent: false,
          apiKeyStorage: 'not_configured',
          dataBoundary: 'hash_only',
        },
      },
    }],
  });
  const suggestions = [
    AuditEngine.createAiSuggestionEvent({
      suggestionId: 'suggestion-accepted',
      projectId: 'project-trio',
      recordId: 'record-1',
      suggestedDecision: 'include',
      humanAction: 'accepted',
      linkedDecisionId: 'decision-1',
      metadata: {
        reviewedAt: '2026-05-08T08:00:00.000Z',
      },
    }),
    AuditEngine.createAiSuggestionEvent({
      suggestionId: 'suggestion-edited',
      projectId: 'project-trio',
      recordId: 'record-2',
      suggestedDecision: 'include',
      humanAction: 'edited',
      linkedDecisionId: 'decision-2',
      metadata: {
        reviewedAt: '2026-05-08T08:01:00.000Z',
        humanEditedDecision: 'exclude',
        humanEditedExclusionReason: 'wrong_population',
      },
    }),
    AuditEngine.createAiSuggestionEvent({
      suggestionId: 'suggestion-rejected',
      projectId: 'project-trio',
      recordId: 'record-3',
      suggestedDecision: 'exclude',
      humanAction: 'rejected',
      metadata: {
        reviewedAt: '2026-05-08T08:02:00.000Z',
      },
    }),
  ];

  const registry = AuditEngine.buildAiUsageRegistryExport(manifest);
  const suggestionRows = parseJsonl(AuditEngine.serializeAiSuggestionEventsJsonl(suggestions));
  const report = AuditEngine.buildPrismaTraiceReportMarkdown(manifest, suggestions);
  const registryEntry = registry.registry[0];
  const providerConfig = registryEntry.metadata.providerConfig;

  assert.equal(registry.aiMode, 'assistive');
  assert.equal(registryEntry.provider_type, 'user_provided_endpoint');
  assert.equal(registryEntry.data_boundary, 'hash_only');
  assert.equal(providerConfig.endpointOrigin, 'https://api.example.test');
  assert.equal(providerConfig.requestPolicy, 'disabled');
  assert.equal(providerConfig.realProviderConnected, false);
  assert.equal(providerConfig.apiKeyPresent, false);

  assert.equal(suggestionRows.length, 3);
  assert.equal(suggestionRows.filter((row) => row.linked_decision_id).length, 2);
  assert.equal(suggestionRows.find((row) => row.suggestion_id === 'suggestion-edited').human_edited_decision, 'exclude');
  assert.equal(suggestionRows.find((row) => row.suggestion_id === 'suggestion-edited').human_edited_exclusion_reason, 'wrong_population');
  assert.equal(suggestionRows.find((row) => row.suggestion_id === 'suggestion-rejected').linked_decision_id, null);
  assert.equal(
    suggestionRows.filter((row) => row.prisma_count_boundary === 'linked_human_screening_decision_required_for_counts').length,
    2
  );
  assert.equal(
    suggestionRows.filter((row) => row.prisma_count_boundary === 'advisory_log_only_not_counted_directly').length,
    1
  );

  assert.match(report, /\| assistive \| user_provided_endpoint \| team_endpoint_record_only \| screening-model-alpha \| title_abstract, reporting \| hash_only \| yes \|/);
  assert.match(report, /\| assistive \| user_provided_endpoint \| team_endpoint_record_only \| screening-model-alpha \| disabled \| no \| hash_only \| https:\/\/api\.example\.test \| no \| not_configured \|/);
  assert.match(report, /Total suggestions: 3/);
  assert.match(report, /Reviewed suggestions: 3/);
  assert.match(report, /Linked human decisions: 2/);
  assert.match(report, /Reviewed suggestions without linked human decision: 1/);
  assert.match(report, /Advisory-only reviewed suggestions: 1/);
  assert.match(report, /Accepted or edited suggestions without linked human decision: 0/);
  assert.match(report, /\| accepted \| 1 \|/);
  assert.match(report, /\| edited \| 1 \|/);
  assert.match(report, /\| rejected \| 1 \|/);
});
