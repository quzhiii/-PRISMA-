# V2.6 Conservative AI Queue Review-State Filter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Step 3 conservative AI queue review-state filter so reviewers can focus on all, pending, or already reviewed advisory suggestions.

**Architecture:** Keep the filter as a presentation-only derived view inside the existing queue panel. Store only an in-memory `conservativeAiQueueReviewStateFilter`, apply it after the bucket filter and before priority sorting, and never mutate `aiSuggestionEvents`, `AISuggestionEvent` metadata, `ScreeningDecision`, PRISMA counts, or exports.

**Tech Stack:** Static browser app, vanilla JavaScript, existing V2.6 conservative AI queue metadata, Node test runner.

---

## Scope

In scope:
- `conservativeAiQueueReviewStateFilter` state with `all`, `pending`, and `reviewed` modes.
- `setConservativeAiQueueReviewStateFilter(filter)` UI action.
- `matchesConservativeAiQueueReviewState(entry, filter)` helper.
- Step 3 queue review-state filter buttons.
- Tests proving pending/reviewed filtering affects display only.

Out of scope:
- Persisting filter preference.
- New review actions.
- Changing AI suggestion review semantics.
- Changing screening decisions, PRISMA counts, or exports.

## Acceptance Criteria

- Step 3 queue panel exposes `All review states`, `Pending`, and `Reviewed` controls.
- Default rendering shows all advisory suggestions.
- Pending filter shows entries with missing/`pending` human action.
- Reviewed filter shows entries with non-pending human action.
- Review-state filtering composes with existing bucket filtering and priority sorting.
- Filtering does not mutate source `aiSuggestionEvents` order or metadata.

## Task 1: Add RED Tests For Review-State Filtering

**Files:**
- Modify: `tests/ai/ai-suggestion-panel-ui.test.mjs`
- Modify: `tests/ai/conservative-ai-queue-actions.test.mjs`

**Step 1: Write the failing tests**

Add assertions that:
- `app.js` defines `conservativeAiQueueReviewStateFilter`.
- `app.js` defines `setConservativeAiQueueReviewStateFilter()`.
- `app.js` defines `matchesConservativeAiQueueReviewState()`.
- Step 3 markup includes `All review states`, `Pending`, and `Reviewed`.
- Runtime harness pending filter hides reviewed entries.
- Runtime harness reviewed filter hides pending entries.
- Runtime harness can combine `likely_relevant` bucket filter with `reviewed` review-state filter.
- Runtime harness source `aiSuggestionEvents` order remains unchanged.

**Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests/ai/ai-suggestion-panel-ui.test.mjs tests/ai/conservative-ai-queue-actions.test.mjs
```

Expected: FAIL because review-state filter state, helper, and UI controls do not exist yet.

## Task 2: Implement Minimal Review-State Filter

**Files:**
- Modify: `literature-screening-v2.2/app.js`

**Step 1: Add state and setter**

Add:

```js
let conservativeAiQueueReviewStateFilter = 'all';

function setConservativeAiQueueReviewStateFilter(filter = 'all') {
  const normalized = String(filter || '').trim();
  conservativeAiQueueReviewStateFilter = ['pending', 'reviewed'].includes(normalized) ? normalized : 'all';
  renderConservativeAiQueuePanel();
  return conservativeAiQueueReviewStateFilter;
}
```

**Step 2: Add matcher helper**

Add:

```js
function matchesConservativeAiQueueReviewState(entry, filter = conservativeAiQueueReviewStateFilter) {
  const normalizedFilter = String(filter || '').trim();
  if (normalizedFilter === 'all') return true;
  const action = String(entry?.humanAction || entry?.human_action || 'pending').trim();
  const isPending = !action || action === 'pending';
  return normalizedFilter === 'pending' ? isPending : !isPending;
}
```

**Step 3: Use review-state filter in queue rendering**

In `renderConservativeAiQueuePanel()`:
- Keep summary counts based on all original entries.
- Apply review-state filter to entries for display.
- Apply priority sorting after filtering.
- Render review-state buttons near existing filter/sort controls.

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
git add docs/plans/2026-06-05-v2-6-queue-review-state-filter.md literature-screening-v2.2/app.js tests/ai/ai-suggestion-panel-ui.test.mjs tests/ai/conservative-ai-queue-actions.test.mjs
git commit -m "feat: filter v2.6 ai queue by review state"
```
