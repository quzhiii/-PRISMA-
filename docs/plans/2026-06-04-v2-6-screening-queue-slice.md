# V2.6 Conservative AI Screening Queue Slice Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the V2.6 conservative AI foundation from the Step 6 transparency area into the actual screening workflow by adding a Step 3 advisory queue surface for title/abstract triage.

**Architecture:** Reuse the existing local `conservative-ai-engine.js` and `AISuggestionEvent` audit trail. Add a small Step 3 UI panel that groups advisory suggestions into workflow-facing buckets (`likely_relevant`, `needs_human_attention`, `needs_human_exclusion_check`) and renders uncertainty flags without creating final human decisions.

**Tech Stack:** Static browser app, vanilla JavaScript, existing `audit-engine.js`, `conservative-ai-engine.js`, Node test runner.

---

## Scope

In scope:
- Step 3 queue panel for V2.6 conservative AI suggestions.
- Button to generate conservative suggestions from the screening summary step.
- Bucketed display for recommended queues and uncertainty flags.
- Re-rendering the queue when suggestions change.
- Regression coverage for Step 3 queue wiring.

Out of scope:
- Real provider dispatch.
- Automatic transition to Step 4.
- Automatic screening decision creation.
- New export schema changes.

## Acceptance Criteria

- Step 3 contains a visible V2.6 conservative AI queue panel.
- Step 3 can generate advisory suggestions without moving to Step 6.
- Suggestions are grouped by `recommendedQueue` and show uncertainty flags.
- `displayResults()` re-renders the conservative AI queue surface.
- The queue continues to use advisory-only `AISuggestionEvent` records.
- Full regression suite still passes.

## Task 1: Add Step 3 Queue Surface

**Files:**
- Modify: `literature-screening-v2.2/workspace.html`
- Modify: `literature-screening-v2.2/app.js`
- Modify: `tests/ai/conservative-ai-app-integration.test.mjs`
- Modify: `tests/ai/ai-suggestion-panel-ui.test.mjs`

**Step 1: Write the failing test**

Add assertions that:
- `workspace.html` contains `id="conservativeAiQueuePanel"` in Step 3.
- Step 3 exposes `generateConservativeAiSuggestions()` as a workflow action.
- `app.js` defines `renderConservativeAiQueuePanel()`.
- `displayResults()` calls `renderConservativeAiQueuePanel()`.
- The queue render code references `likely_relevant`, `needs_human_attention`, and `needs_human_exclusion_check`.
- The queue render code shows `uncertaintyFlags`.

**Step 2: Run test to verify RED**

Run:

```powershell
node --test tests/ai/conservative-ai-app-integration.test.mjs tests/ai/ai-suggestion-panel-ui.test.mjs
```

Expected: FAIL because Step 3 queue elements do not exist yet.

**Step 3: Write minimal implementation**

In `workspace.html`:
- Add a Step 3 info panel with a conservative AI heading.
- Add a generate button for conservative suggestions in Step 3.
- Add `<div id="conservativeAiQueuePanel"></div>`.

In `app.js`:
- Add `renderConservativeAiQueuePanel()`.
- Filter `aiSuggestionEvents` to title/abstract-stage advisory suggestions.
- Group them by `entry.metadata.recommendedQueue`.
- Show counts and per-record titles / uncertainty flags.
- Call the render function from `displayResults()`, `generateConservativeAiSuggestions()`, `generateMockAiSuggestions()`, and `restoreProjectState()`.

**Step 4: Run test to verify GREEN**

Run:

```powershell
node --test tests/ai/conservative-ai-app-integration.test.mjs tests/ai/ai-suggestion-panel-ui.test.mjs
```

Expected: PASS.

## Task 2: Verify and Commit

**Files:**
- Files from Task 1.

**Step 1: Run targeted verification**

Run:

```powershell
node --test tests/ai/conservative-ai-engine.test.mjs
node --test tests/ai/conservative-ai-app-integration.test.mjs
node --test tests/ai/ai-suggestion-panel-ui.test.mjs
node --test tests/ai/ai-suggestion-review-flow.test.mjs
```

**Step 2: Run full regression**

Run:

```powershell
node tests/run-all-regressions.js
```

**Step 3: Commit**

```powershell
git add docs/plans/2026-06-04-v2-6-screening-queue-slice.md literature-screening-v2.2/workspace.html literature-screening-v2.2/app.js tests/ai/conservative-ai-app-integration.test.mjs tests/ai/ai-suggestion-panel-ui.test.mjs
git commit -m "feat: add v2.6 screening queue surface"
```
