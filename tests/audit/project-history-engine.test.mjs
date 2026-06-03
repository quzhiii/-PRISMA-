import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const HistoryEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/project-history-engine.js'));

test('creates bounded project history snapshots with metadata and cloned state', () => {
  const state = {
    uploadedData: [{ id: 'r1', title: 'Trial' }],
    uploadedFiles: [{ name: 'pubmed.nbib', recordCount: 1 }],
    currentStep: 3,
    filterRules: { includeKeywords: ['trial'] },
    screeningResults: { counts: { included: 1, excluded: 0 } },
  };

  const next = HistoryEngine.addProjectSnapshot([], state, {
    label: 'After screening',
    reason: 'screening_rerun',
    createdAt: '2026-06-03T00:00:00.000Z',
  });

  assert.equal(next.length, 1);
  assert.equal(next[0].schema_version, 'project_history.v2.5.1');
  assert.equal(next[0].label, 'After screening');
  assert.equal(next[0].reason, 'screening_rerun');
  assert.deepEqual(next[0].source_files, ['pubmed.nbib']);
  assert.equal(next[0].record_count, 1);
  assert.equal(next[0].counts_summary.included, 1);
  assert.notEqual(next[0].state.uploadedData, state.uploadedData);
});
