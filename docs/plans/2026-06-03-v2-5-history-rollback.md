# V2.5.1 Project History and Rollback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add local project history snapshots so reviewers can recover from wrong uploads, add or remove source files, and review or restore earlier screening states.

**Architecture:** Keep history local-first inside the existing `literature-screening-v2.2/` project state model. Add a small pure history boundary to create snapshot metadata and restore payloads, then wire it through `persistCurrentProjectState()` and `restoreProjectState(snapshot)` without changing frozen V2.3/V2.4/V2.5 audit export schemas.

**Tech Stack:** Static browser app, vanilla JavaScript, localStorage project snapshots, optional IndexedDB worker persistence, Node test runner.

---

## Requirements

- Users can see a local history list with snapshot label, reason, step, source files, counts, and timestamp.
- Users can restore a previous project snapshot after confirming the action.
- Users can remove a wrongly uploaded source file from the current project without resetting everything.
- Users can add new source files and preserve a before/after history record.
- History events are audit-visible through `project_snapshot_created`, `project_snapshot_restored`, `source_file_added`, and `source_file_removed`.
- Restoring history must re-run current V2.5 conflict state calculation and must not bypass unresolved conflict gates.
- History stays local. No backend, account, cloud sync, or real AI provider dispatch.

## Data Model

Add `projectHistory` to the existing project snapshot object:

```js
{
  projectHistory: [
    {
      snapshot_id: 'snapshot-...',
      schema_version: 'project_history.v2.5.1',
      created_at: '2026-06-03T00:00:00.000Z',
      label: 'After rule screening',
      reason: 'screening_rerun',
      step: 3,
      source_files: ['pubmed.nbib', 'cnki.enw'],
      record_count: 128,
      rule_hash: '...',
      counts_summary: { included: 42, excluded: 86 },
      state: {
        uploadedData: [],
        uploadedFiles: [],
        screeningResults: null,
        columnMapping: {},
        fileFormat: 'unknown',
        formatSource: 'Unknown',
        currentStep: 1,
        filterRules: null,
        exclusionReasons: [],
        qualityAssessments: [],
        importJobs: [],
        projectManifest: null,
        auditEvents: [],
        screeningDecisions: [],
        aiSuggestionEvents: [],
        dualReviewResults: { A: {}, B: {}, final: {} },
        dualReviewConflictState: null
      }
    }
  ]
}
```

Keep a bounded history length, initially `20`, to avoid localStorage bloat on large projects. Each snapshot should include enough state to call `restoreProjectState(snapshot.state)` and refresh the UI.

## Task 1: Add Pure History Engine

**Files:**
- Create: `literature-screening-v2.2/project-history-engine.js`
- Test: `tests/audit/project-history-engine.test.mjs`
- Modify: `tests/run-all-regressions.js`

**Step 1: Write the failing test**

```js
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
```

**Step 2: Run test to verify it fails**

Run: `node --test tests\audit\project-history-engine.test.mjs`

Expected: FAIL because `project-history-engine.js` does not exist.

**Step 3: Write minimal implementation**

Create a module with:

```js
const PROJECT_HISTORY_SCHEMA_VERSION = 'project_history.v2.5.1';
const DEFAULT_HISTORY_LIMIT = 20;

function clonePlain(value, fallback) {
  try {
    return JSON.parse(JSON.stringify(value === undefined ? fallback : value));
  } catch (_) {
    return fallback;
  }
}

function makeSnapshotId(createdAt) {
  return `snapshot-${String(createdAt || new Date().toISOString()).replace(/[^0-9A-Za-z]/g, '')}`;
}

function summarizeSourceFiles(state) {
  return (Array.isArray(state?.uploadedFiles) ? state.uploadedFiles : [])
    .map((file) => String(file?.name || file?.fileName || file?.source || '').trim())
    .filter(Boolean);
}

function getRecordCount(state) {
  return Array.isArray(state?.uploadedData) ? state.uploadedData.length : 0;
}

function getCountsSummary(state) {
  return clonePlain(state?.screeningResults?.counts || {}, {});
}

function addProjectSnapshot(history, state, options = {}) {
  const createdAt = options.createdAt || new Date().toISOString();
  const snapshot = {
    snapshot_id: options.snapshotId || makeSnapshotId(createdAt),
    schema_version: PROJECT_HISTORY_SCHEMA_VERSION,
    created_at: createdAt,
    label: String(options.label || 'Project snapshot'),
    reason: String(options.reason || 'manual_snapshot'),
    step: Number(state?.currentStep || 1),
    source_files: summarizeSourceFiles(state),
    record_count: getRecordCount(state),
    rule_hash: String(options.ruleHash || ''),
    counts_summary: getCountsSummary(state),
    state: clonePlain(state, {}),
  };
  const limit = Number.isFinite(options.limit) ? options.limit : DEFAULT_HISTORY_LIMIT;
  return [snapshot, ...(Array.isArray(history) ? history : [])].slice(0, Math.max(1, limit));
}

module.exports = {
  PROJECT_HISTORY_SCHEMA_VERSION,
  DEFAULT_HISTORY_LIMIT,
  addProjectSnapshot,
};
```

**Step 4: Run test to verify it passes**

Run: `node --test tests\audit\project-history-engine.test.mjs`

Expected: PASS.

**Step 5: Add to regression runner**

Modify `tests/run-all-regressions.js` and add `tests/audit/project-history-engine.test.mjs` near the other audit tests.

**Step 6: Commit**

```powershell
git add literature-screening-v2.2\project-history-engine.js tests\audit\project-history-engine.test.mjs tests\run-all-regressions.js
git commit -m "feat: add project history snapshot engine"
```

## Task 2: Persist Project History in App State

**Files:**
- Modify: `literature-screening-v2.2/workspace.html`
- Modify: `literature-screening-v2.2/app.js`
- Test: `tests/audit/audit-workflow.test.mjs`

**Step 1: Write failing test**

Add assertions to `audit-workflow.test.mjs`:

```js
test('v2.5.1 app persists project history snapshots', async () => {
  const source = await readV22App();
  const workspaceHtml = await readV22File('workspace.html');

  assert.match(workspaceHtml, /project-history-engine\.js/);
  assert.match(source, /let projectHistory = \[\];/);
  assert.match(source, /projectHistory,/);
  assert.match(source, /projectHistory = Array\.isArray\(snapshot\.projectHistory\)/);
  assert.match(source, /function createProjectHistorySnapshot/);
  assert.match(source, /project_snapshot_created/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests\audit\audit-workflow.test.mjs`

Expected: FAIL because app history wiring does not exist.

**Step 3: Add script load**

In `workspace.html`, load `project-history-engine.js` before `app.js`.

**Step 4: Add app globals**

In `app.js`, add:

```js
const PROJECT_HISTORY_ENGINE = typeof globalThis !== 'undefined' ? globalThis.ProjectHistoryEngine || null : null;
let projectHistory = [];
```

**Step 5: Add state capture helper**

Add `buildCurrentProjectHistoryState()` that returns the same fields used by `persistCurrentProjectState()` except `projectHistory` itself, to avoid recursive snapshots.

**Step 6: Add snapshot helper**

Add `createProjectHistorySnapshot(reason, label, options = {})`:

```js
function createProjectHistorySnapshot(reason, label, options = {}) {
  if (!PROJECT_HISTORY_ENGINE || typeof PROJECT_HISTORY_ENGINE.addProjectSnapshot !== 'function') return null;
  const beforeLength = projectHistory.length;
  projectHistory = PROJECT_HISTORY_ENGINE.addProjectSnapshot(projectHistory, buildCurrentProjectHistoryState(), {
    reason,
    label,
    limit: 20,
  });
  const snapshot = projectHistory[0] || null;
  if (snapshot && projectHistory.length !== beforeLength) {
    appendAuditEventsSafe({
      eventType: 'project_snapshot_created',
      recordId: '',
      after: {
        snapshotId: snapshot.snapshot_id,
        reason: snapshot.reason,
        label: snapshot.label,
        step: snapshot.step,
        recordCount: snapshot.record_count,
      },
      source: 'human',
    }, { persist: false });
  }
  return snapshot;
}
```

**Step 7: Persist and restore history**

Add `projectHistory` to `persistCurrentProjectState()`, `saveProject()`, autosave payload, collaboration project payload if applicable, and `restoreProjectState(snapshot)`.

**Step 8: Run test**

Run: `node --test tests\audit\audit-workflow.test.mjs`

Expected: PASS for the new app wiring test.

**Step 9: Commit**

```powershell
git add literature-screening-v2.2\workspace.html literature-screening-v2.2\app.js tests\audit\audit-workflow.test.mjs
git commit -m "feat: persist local project history"
```

## Task 3: Snapshot Workflow Triggers

**Files:**
- Modify: `literature-screening-v2.2/app.js`
- Test: `tests/audit/audit-workflow.test.mjs`

**Step 1: Write failing test**

Assert the trigger reasons are present:

```js
test('v2.5.1 app creates history snapshots at recovery points', async () => {
  const source = await readV22App();

  assert.match(source, /createProjectHistorySnapshot\('before_import'/);
  assert.match(source, /createProjectHistorySnapshot\('after_import'/);
  assert.match(source, /createProjectHistorySnapshot\('screening_rerun'/);
  assert.match(source, /createProjectHistorySnapshot\('fulltext_finalized'/);
  assert.match(source, /createProjectHistorySnapshot\('quality_saved'/);
  assert.match(source, /createProjectHistorySnapshot\('conflict_resolved'/);
  assert.match(source, /createProjectHistorySnapshot\('before_export'/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests\audit\audit-workflow.test.mjs`

Expected: FAIL because trigger calls are missing.

**Step 3: Add trigger points**

Add snapshot calls:

- Before `startNewProjectSession()` in `handleImportFiles(files)`: `before_import`.
- After successful import in `finalizeImportOutcome.completeSuccess`: `after_import`.
- Before overwriting `screeningResults` in `startScreening()`: `screening_rerun`.
- After `finalizeFulltextReview()`: `fulltext_finalized`.
- After `saveQualityAssessmentEdits(recordId)`: `quality_saved`.
- After screening or quality resolver saves: `conflict_resolved`.
- Before final all-file export or gated final export: `before_export`.

**Step 4: Run test**

Run: `node --test tests\audit\audit-workflow.test.mjs`

Expected: PASS.

**Step 5: Commit**

```powershell
git add literature-screening-v2.2\app.js tests\audit\audit-workflow.test.mjs
git commit -m "feat: capture recovery-point snapshots"
```

## Task 4: History Panel and Restore Flow

**Files:**
- Modify: `literature-screening-v2.2/workspace.html`
- Modify: `literature-screening-v2.2/app.js`
- Modify: `literature-screening-v2.2/style.css`
- Test: `tests/audit/audit-workflow.test.mjs`

**Step 1: Write failing test**

```js
test('v2.5.1 workspace exposes history rollback UI and restore flow', async () => {
  const [source, workspaceHtml, styleCss] = await Promise.all([
    readV22App(),
    readV22File('workspace.html'),
    readV22File('style.css'),
  ]);

  assert.match(workspaceHtml, /id="projectHistoryPanel"/);
  assert.match(workspaceHtml, /renderProjectHistoryPanel\(\)/);
  assert.match(source, /function renderProjectHistoryPanel/);
  assert.match(source, /function restoreProjectHistorySnapshot/);
  assert.match(source, /project_snapshot_restored/);
  assert.match(source, /restoreProjectState\(historySnapshot\.state\)/);
  assert.match(source, /refreshDualReviewConflictState/);
  assert.match(styleCss, /\.project-history-panel/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests\audit\audit-workflow.test.mjs`

Expected: FAIL.

**Step 3: Add UI shell**

Add a `projectHistoryPanel` section near the Step 3 project session controls or as a shared info box visible after import.

**Step 4: Render history list**

Implement `renderProjectHistoryPanel()` with snapshot cards showing label, reason, timestamp, step, record count, source files, and counts summary.

**Step 5: Restore flow**

Implement `restoreProjectHistorySnapshot(snapshotId)`:

- Find snapshot by id.
- Ask `confirm()` before restore.
- Call `restoreProjectState(historySnapshot.state)`.
- Preserve the existing `projectHistory` array unless the snapshot state includes a newer valid history.
- Re-render upload info, rules, screening results, quality shell, conflict state, and current step.
- Call `refreshDualReviewConflictState()` after restore if available.
- Write `project_snapshot_restored` audit event with restored snapshot id, reason, step, and record count.
- Persist the restored current state.

**Step 6: Style minimally**

Add CSS for `.project-history-panel`, `.project-history-list`, `.project-history-card`, and `.project-history-meta` using existing panel/button variables.

**Step 7: Run test**

Run: `node --test tests\audit\audit-workflow.test.mjs`

Expected: PASS.

**Step 8: Commit**

```powershell
git add literature-screening-v2.2\workspace.html literature-screening-v2.2\app.js literature-screening-v2.2\style.css tests\audit\audit-workflow.test.mjs
git commit -m "feat: add project history restore UI"
```

## Task 5: Source File Add/Remove Recovery

**Files:**
- Modify: `literature-screening-v2.2/app.js`
- Modify: `literature-screening-v2.2/workspace.html`
- Test: `tests/audit/audit-workflow.test.mjs`

**Step 1: Write failing test**

```js
test('v2.5.1 app records source file add and remove history', async () => {
  const source = await readV22App();
  const workspaceHtml = await readV22File('workspace.html');

  assert.match(workspaceHtml, /id="sourceFileHistoryPanel"/);
  assert.match(source, /function removeSourceFileFromProject/);
  assert.match(source, /source_file_removed/);
  assert.match(source, /source_file_added/);
  assert.match(source, /createProjectHistorySnapshot\('source_file_removed'/);
  assert.match(source, /createProjectHistorySnapshot\('source_file_added'/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests\audit\audit-workflow.test.mjs`

Expected: FAIL.

**Step 3: Add source file panel**

Add `sourceFileHistoryPanel` showing current `uploadedFiles`, record counts, and a remove button for each file.

**Step 4: Add remove handler**

Implement `removeSourceFileFromProject(fileName)`:

- Confirm action.
- Create `source_file_removed` snapshot before mutation.
- Remove matching file from `uploadedFiles`.
- Remove records where `_sourceFile === fileName` or matching fallback name.
- Clear or recompute downstream state safely: set `screeningResults = null`, keep `filterRules`, reset quality/dual-review states that refer to removed records, and return user to Step 2.
- Append `source_file_removed` audit event.
- Create after snapshot and persist.

**Step 5: Add source added event**

In successful import path, compare previous and new source file names. Append `source_file_added` events for newly added sources and create `source_file_added` snapshot.

**Step 6: Run test**

Run: `node --test tests\audit\audit-workflow.test.mjs`

Expected: PASS.

**Step 7: Commit**

```powershell
git add literature-screening-v2.2\app.js literature-screening-v2.2\workspace.html tests\audit\audit-workflow.test.mjs
git commit -m "feat: track source file add remove history"
```

## Task 6: Verification

**Files:**
- Modify only if tests expose missing wiring.

**Step 1: Syntax checks**

Run:

```powershell
node --check literature-screening-v2.2\project-history-engine.js
node --check literature-screening-v2.2\app.js
node --check literature-screening-v2.2\audit-engine.js
```

Expected: no output and exit code 0.

**Step 2: Focused tests**

Run:

```powershell
node --test tests\audit\project-history-engine.test.mjs tests\audit\audit-workflow.test.mjs tests\audit\audit-engine.test.mjs tests\audit\audit-export.test.mjs
```

Expected: all tests pass.

**Step 3: Full regression**

Run:

```powershell
node tests\run-all-regressions.js
```

Expected: all tests pass.

**Step 4: Manual smoke**

Open `literature-screening-v2.2/workspace.html` locally and verify:

- Import sample data creates an `after_import` history entry.
- Running screening creates a `screening_rerun` or after-screening entry.
- Removing a source file prompts confirmation and records a source removal entry.
- Restoring a prior snapshot changes the UI back to the earlier step/counts.
- Final export gate still blocks unresolved V2.5 conflicts after restore.

**Step 5: Commit**

```powershell
git add docs\plans\2026-06-03-v2-5-history-rollback.md
git commit -m "docs: plan project history rollback"
```
