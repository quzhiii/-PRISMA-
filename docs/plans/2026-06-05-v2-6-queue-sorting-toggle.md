# V2.6 Conservative AI Queue Sorting Toggle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Step 3 conservative AI queue sorting toggle so reviewers can switch between original event order and priority-score order without changing any data or decisions.

**Architecture:** Keep sorting as a presentation-only derived view inside the existing queue panel. Store only an in-memory `conservativeAiQueueSortMode`, default it to original order, and sort copied arrays before rendering bucket rows; never mutate `aiSuggestionEvents`, `AISuggestionEvent` metadata, `ScreeningDecision`, PRISMA counts, or exports.

**Tech Stack:** Static browser app, vanilla JavaScript, existing V2.6 conservative AI queue metadata, Node test runner.

---

## Scope

In scope:
- `conservativeAiQueueSortMode` state with `original` and `priority` modes.
- `setConservativeAiQueueSortMode(mode)` UI action.
- `getSortedConservativeAiQueueEntries(entries)` pure-ish helper that returns a copied, sorted list.
- Step 3 queue sorting buttons.
- Tests proving sorting affects display only.

Out of scope:
- Persisting sort preference.
- New queue buckets.
- Changing recommendation logic.
- Changing AI suggestions, screening decisions, PRISMA counts, or exports.

## Acceptance Criteria

- Step 3 queue panel exposes `Original order` and `Priority score` controls.
- Default rendering preserves original event order.
- Priority sorting orders displayed records by descending `metadata.priorityScore`.
- Sorting works together with existing bucket filters.
- Sorting does not mutate the source `aiSuggestionEvents` order.

## Task 1: Add RED Tests For Queue Sorting

**Files:**
- Modify: `tests/ai/ai-suggestion-panel-ui.test.mjs`
- Modify: `tests/ai/conservative-ai-queue-actions.test.mjs`

**Step 1: Write the failing tests**

Add assertions that:
- `app.js` defines `conservativeAiQueueSortMode`.
- `app.js` defines `setConservativeAiQueueSortMode()`.
- `app.js` defines `getSortedConservativeAiQueueEntries()`.
- Step 3 markup includes `Original order` and `Priority score`.
- Runtime harness default order follows event order.
- Runtime harness priority mode sorts rows by descending priority score.
- Runtime harness source `aiSuggestionEvents` order remains unchanged after priority sorting.

**Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests/ai/ai-suggestion-panel-ui.test.mjs tests/ai/conservative-ai-queue-actions.test.mjs
```

Expected: FAIL because sorting state, helper, and UI controls do not exist yet.

## Task 2: Implement Minimal Sorting Toggle

**Files:**
- Modify: `literature-screening-v2.2/app.js`

**Step 1: Add state and setter**

Add:

```js
let conservativeAiQueueSortMode = 'original';

function setConservativeAiQueueSortMode(mode) {
  conservativeAiQueueSortMode = mode === 'priority' ? 'priority' : 'original';
  renderConservativeAiQueuePanel();
  return conservativeAiQueueSortMode;
}
```

**Step 2: Add sorting helper**

Add:

```js
function getSortedConservativeAiQueueEntries(entries) {
  const list = Array.isArray(entries) ? [...entries] : [];
  if (conservativeAiQueueSortMode !== 'priority') return list;
  return list.sort((left, right) => {
    const leftScore = Number(left?.metadata?.priorityScore ?? -Infinity);
    const rightScore = Number(right?.metadata?.priorityScore ?? -Infinity);
    return rightScore - leftScore;
  });
}
```

**Step 3: Use sorted entries in queue rendering**

In `renderConservativeAiQueuePanel()`:
- Keep summary counts based on all original entries.
- Use `getSortedConservativeAiQueueEntries(entries)` before filtering bucket row lists.
- Render sort buttons near existing filter buttons.

**Step 4: Run tests to verify GREEN**

Run:

```powershell
node --test tests/ai/ai-suggestion-panel-ui.test.mjs tests/ai/conservative-ai-queue-actions.test.mjs
```

Expected: PASS.

## Task 3: Verify And Commit

**Files:**
- Files from Task 1 and Task 2.

**Step 1: Run adjacent workflow tests**

Run:

```powershell
node --test tests/ai/conservative-ai-engine.test.mjs tests/ai/conservative-ai-queue-actions.test.mjs tests/ai/conservative-ai-app-integration.test.mjs tests/ai/ai-suggestion-panel-ui.test.mjs tests/ai/ai-suggestion-review-flow.test.mjs tests/audit/project-history-runtime.test.mjs
```

**Step 2: Run full regression**

Run:

```powershell
node tests/run-all-regressions.js
```

**Step 3: Commit**

```powershell
git add docs/plans/2026-06-05-v2-6-queue-sorting-toggle.md literature-screening-v2.2/app.js tests/ai/ai-suggestion-panel-ui.test.mjs tests/ai/conservative-ai-queue-actions.test.mjs
git commit -m "feat: sort v2.6 ai queue by priority"
```
