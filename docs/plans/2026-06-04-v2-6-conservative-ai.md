# V2.6 Conservative AI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the first V2.6 Conservative AI foundation so the workspace can generate local advisory screening suggestions, prioritisation metadata, uncertainty flags, and prompt trace records without dispatching real provider requests or changing final human decisions.

**Architecture:** Keep V2.6 as a local-first advisory layer on top of the existing V2.3 PRISMA-trAIce and V2.5 audit workflow. Add a small pure `conservative-ai-engine.js` module for deterministic local triage metadata, then wire it into existing AI suggestion events and the Step 6 transparency panel. Final PRISMA counts continue to come only from human `ScreeningDecision` records.

**Tech Stack:** Static browser app, vanilla JavaScript UMD modules, existing `audit-engine.js` / `ai-provider-engine.js`, Node test runner.

---

## Scope

This plan implements a V2.6 foundation slice, not a full production AI service.

In scope:
- Local conservative AI prompt registry records.
- Deterministic local advisory suggestions for title/abstract screening.
- Prioritisation metadata: `priorityScore`, `recommendedQueue`, `priorityReason`.
- Uncertainty metadata: `uncertaintyFlags`, `riskFlags`, `criteriaMatches`.
- Existing `ai_suggestions.jsonl` continues to carry the audit trace.
- Step 6 UI explains that suggestions are advisory-only and shows priority/uncertainty hints.
- Regression assertions prevent real provider dispatch and automatic PRISMA-count changes.

Out of scope:
- Real OpenAI-compatible dispatch.
- API key input or storage.
- Backend, accounts, cloud sync, queues, billing, or institution permissions.
- Automatic exclusion or automatic final included/excluded decisions.
- Changing existing audit export file names, CSV schemas, or `ScreeningDecision` schema names.

## Acceptance Criteria

- `conservative-ai-engine.js` exports pure functions and can be tested without DOM.
- Local conservative suggestions include prompt hashes, input hashes, priority metadata, uncertainty flags, and provider boundary metadata.
- Running V2.6 suggestions creates only `AISuggestionEvent` entries with `humanAction: 'pending'`.
- No new `ScreeningDecision` is created until a human accepts or edits an AI suggestion.
- The UI keeps real provider dispatch disabled and does not expose an API key field.
- Public docs say V2.6 is the next conservative AI layer, not one-click automation.
- `node --test tests/ai/conservative-ai-engine.test.mjs` passes.
- `node --test tests/ai/conservative-ai-app-integration.test.mjs` passes.
- `node --test tests/audit/audit-workflow.test.mjs` passes.
- `node tests/run-all-regressions.js` passes.

## Task 1: Add Pure Conservative AI Engine

**Files:**
- Create: `literature-screening-v2.2/conservative-ai-engine.js`
- Create: `tests/ai/conservative-ai-engine.test.mjs`
- Modify: `tests/run-all-regressions.js`

**Step 1: Write the failing test**

Create `tests/ai/conservative-ai-engine.test.mjs`:

```js
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
```

**Step 2: Run test to verify RED**

Run: `node --test tests/ai/conservative-ai-engine.test.mjs`

Expected: FAIL because `conservative-ai-engine.js` does not exist.

**Step 3: Implement the minimal pure module**

Create a UMD-style `literature-screening-v2.2/conservative-ai-engine.js` with:
- `CONSERVATIVE_AI_SCHEMA_VERSION = 'conservative_ai.v2.6'`
- `stableHash(value)` using the same local FNV-style hash as `ai-provider-engine.js`
- `buildConservativePromptRecord(input)`
- `buildConservativeSuggestionForRecord(record, options)`
- `buildConservativeSuggestionBatch(records, options)`

Suggested behavior:
- `protocol`, `commentary`, `editorial`, `review only`, `会议摘要` add exclusion risk and suggest `exclude` with moderate confidence.
- `trial`, `random`, `cohort`, `systematic`, `meta`, `随机`, `队列`, `干预` add relevance criteria and suggest `include`.
- Empty or very short abstracts add `missing_or_short_abstract` and suggest `uncertain` unless strong exclusion risk exists.
- All outputs must include `humanAction: 'pending'`, `metadata.advisoryOnly: true`, `metadata.realProviderConnected: false`, `metadata.rawPayloadIncluded: false`.

**Step 4: Run test to verify GREEN**

Run: `node --test tests/ai/conservative-ai-engine.test.mjs`

Expected: PASS.

**Step 5: Add to full regression runner**

Modify `tests/run-all-regressions.js` and add `tests/ai/conservative-ai-engine.test.mjs` near the other AI tests.

**Step 6: Run AI regression subset**

Run: `node --test tests/ai/ai-provider-engine.test.mjs tests/ai/conservative-ai-engine.test.mjs`

Expected: PASS.

## Task 2: Wire V2.6 Local Suggestions Into the Workspace

**Files:**
- Modify: `literature-screening-v2.2/workspace.html`
- Modify: `literature-screening-v2.2/app.js`
- Create: `tests/ai/conservative-ai-app-integration.test.mjs`
- Modify: `tests/ai/ai-suggestion-panel-ui.test.mjs`
- Modify: `tests/run-all-regressions.js`

**Step 1: Write failing integration tests**

Create `tests/ai/conservative-ai-app-integration.test.mjs` with a small VM harness based on `tests/ai/ai-suggestion-review-flow.test.mjs`.

The test should assert:
- `workspace.html` loads `conservative-ai-engine.js` before `app.js`.
- `app.js` declares `const CONSERVATIVE_AI_ENGINE = ...`.
- `generateConservativeAiSuggestions()` exists.
- Calling it with fixture records appends pending AI suggestion events.
- `screeningDecisions.length` remains `0` immediately after generation.
- Generated suggestion metadata includes `priorityScore`, `recommendedQueue`, `uncertaintyFlags`, and `advisoryOnly: true`.

Add or update `tests/ai/ai-suggestion-panel-ui.test.mjs` assertions:
- Step 6 mentions `V2.6 Conservative AI`.
- The action button calls `generateConservativeAiSuggestions()`.
- The panel renders priority score, recommended queue, and uncertainty flags.
- No API key input exists.

**Step 2: Run tests to verify RED**

Run: `node --test tests/ai/conservative-ai-app-integration.test.mjs tests/ai/ai-suggestion-panel-ui.test.mjs`

Expected: FAIL because app/workspace wiring and UI strings are missing.

**Step 3: Minimal implementation**

In `workspace.html`:
- Add `<script src="conservative-ai-engine.js"></script>` before `app.js`.
- Update the AI transparency panel heading from V2.3-only to `V2.6 Conservative AI / PRISMA-trAIce`.
- Add a button calling `generateConservativeAiSuggestions()`.
- Keep the existing mock button only if needed for backward compatibility.
- Keep provider boundary copy explicit: real API dispatch remains disabled.

In `app.js`:
- Add `const CONSERVATIVE_AI_ENGINE = typeof globalThis !== 'undefined' ? globalThis.ConservativeAiEngine || null : null;` near other engines.
- Add `buildConservativeAiSuggestionForRecord(record, stage)` that uses the engine if available and falls back to existing mock behavior.
- Add `generateConservativeAiSuggestions(limit = 5)` that sets `assistive`, ensures registry, appends only pending suggestion events, writes `ai_suggestion_generated`, persists state, renders the panel, and returns the suggestions.
- Enhance `renderAiSuggestionPanel()` to display priority score, recommended queue, and uncertainty flags when present in `entry.metadata`.
- Do not create `ScreeningDecision` inside generation.

**Step 4: Run tests to verify GREEN**

Run: `node --test tests/ai/conservative-ai-app-integration.test.mjs tests/ai/ai-suggestion-panel-ui.test.mjs`

Expected: PASS.

**Step 5: Run existing AI review flow tests**

Run: `node --test tests/ai/ai-suggestion-review-flow.test.mjs tests/audit/prisma-traice-export-trio.test.mjs`

Expected: PASS.

## Task 3: Update Docs and Public Roadmap Without Claiming Full V2.6 Release

**Files:**
- Modify: `docs/ROADMAP_2026.md`
- Modify: `docs/design/CONSERVATIVE_AI_DESIGN.md`
- Modify: `docs/PRODUCT_POSITIONING_2026.md`
- Modify: `README.md`
- Modify: `README_EN.md`
- Modify: `tests/audit/audit-workflow.test.mjs`

**Step 1: Write failing public state assertions**

In `tests/audit/audit-workflow.test.mjs`, add assertions that:
- Roadmap says V2.6 first slice is `in progress` or `foundation slice` rather than current public release.
- README/README_EN still describe V2.5 as current public release line.
- Docs mention local advisory suggestions, prioritisation, uncertainty flags, prompt registry, provider boundary disabled.
- Docs do not say AI automatically completes screening or system reviews.

**Step 2: Run test to verify RED**

Run: `node --test tests/audit/audit-workflow.test.mjs`

Expected: FAIL because docs are not updated.

**Step 3: Update docs minimally**

Keep wording conservative:
- V2.6 is not current public release.
- V2.6 foundation adds local advisory suggestions and trace metadata.
- Final decisions and PRISMA counts remain human-controlled.
- Real provider dispatch remains disabled by default.

Update regression count only after the full suite confirms the final number.

**Step 4: Run test to verify GREEN**

Run: `node --test tests/audit/audit-workflow.test.mjs`

Expected: PASS.

## Task 4: Full Verification and Commit

**Files:**
- All modified files from Tasks 1-3.

**Step 1: Run targeted tests**

Run:

```powershell
node --test tests/ai/conservative-ai-engine.test.mjs
node --test tests/ai/conservative-ai-app-integration.test.mjs
node --test tests/ai/ai-suggestion-panel-ui.test.mjs
node --test tests/ai/ai-suggestion-review-flow.test.mjs
node --test tests/audit/audit-workflow.test.mjs
```

Expected: PASS.

**Step 2: Run full regression**

Run: `node tests/run-all-regressions.js`

Expected: PASS. Record final test count in README/README_EN if it changed.

**Step 3: Inspect diff**

Run:

```powershell
git status --short
git diff --stat
git diff
```

Expected: only V2.6 conservative AI foundation files and docs changed.

**Step 4: Commit**

Run:

```powershell
git add literature-screening-v2.2/conservative-ai-engine.js literature-screening-v2.2/workspace.html literature-screening-v2.2/app.js tests/run-all-regressions.js tests/ai/conservative-ai-engine.test.mjs tests/ai/conservative-ai-app-integration.test.mjs tests/ai/ai-suggestion-panel-ui.test.mjs tests/audit/audit-workflow.test.mjs docs/ROADMAP_2026.md docs/design/CONSERVATIVE_AI_DESIGN.md docs/PRODUCT_POSITIONING_2026.md README.md README_EN.md
git commit -m "feat: add v2.6 conservative ai foundation"
```

Expected: commit succeeds on `feature/v2-6-conservative-ai`.
