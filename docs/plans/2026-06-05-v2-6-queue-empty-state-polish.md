# V2.6 Conservative AI Queue Empty-State Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace bare `0` queue bucket placeholders with clear empty-state copy when Step 3 conservative AI filters produce no visible advisory suggestions.

**Architecture:** Keep this as a presentation-only helper used by `renderConservativeAiQueuePanel()`. Empty copy depends only on the current filter state and does not change `aiSuggestionEvents`, `AISuggestionEvent` metadata, `ScreeningDecision`, PRISMA counts, or exports.

**Tech Stack:** Static browser app, vanilla JavaScript, existing V2.6 conservative AI queue metadata, Node test runner.

---

## Scope

In scope:
- `getConservativeAiQueueEmptyStateText()` helper.
- Replacing bucket row fallback `<li class="muted-text">0</li>` with reviewer-facing empty-state copy.
- Tests proving filtered empty buckets are understandable.

Out of scope:
- Changing summary counts.
- Changing filtering/sorting logic.
- Persisting UI state.
- Changing AI suggestions, screening decisions, PRISMA counts, or exports.

## Acceptance Criteria

- Empty queue buckets no longer render only `0`.
- Empty bucket copy says `No advisory suggestions match these filters` in English mode.
- Copy remains advisory and does not imply records were excluded or deleted.
- Existing bucket filtering, review-state filtering, priority sorting, and Step 4 handoff behavior remain unchanged.

## Task 1: Add RED Tests For Queue Empty States

**Files:**
- Modify: `tests/ai/ai-suggestion-panel-ui.test.mjs`
- Modify: `tests/ai/conservative-ai-queue-actions.test.mjs`

**Step 1: Write the failing tests**

Add assertions that:
- `app.js` defines `getConservativeAiQueueEmptyStateText()`.
- `app.js` contains `No advisory suggestions match these filters`.
- Runtime harness pending/reviewed filtering shows empty-state copy for buckets without visible entries.
- Runtime harness does not render bare `>0<` or a standalone ` | 0 | ` empty placeholder for filtered buckets.

**Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests/ai/ai-suggestion-panel-ui.test.mjs tests/ai/conservative-ai-queue-actions.test.mjs
```

Expected: FAIL because empty-state helper and copy do not exist yet.

## Task 2: Implement Minimal Empty-State Copy

**Files:**
- Modify: `literature-screening-v2.2/app.js`

**Step 1: Add helper**

Add:

```js
function getConservativeAiQueueEmptyStateText() {
  return getAiSuggestionPanelLang() === 'en'
    ? 'No advisory suggestions match these filters.'
    : '当前筛选条件下没有匹配的 advisory suggestions。';
}
```

**Step 2: Use helper in bucket fallback**

In `renderConservativeAiQueuePanel()` replace:

```js
': '<li class="muted-text">0</li>'
```

with helper copy:

```js
`: `<li class="muted-text">${escapeHTML(getConservativeAiQueueEmptyStateText())}</li>`;
```

**Step 3: Run tests to verify GREEN**

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
git add docs/plans/2026-06-05-v2-6-queue-empty-state-polish.md literature-screening-v2.2/app.js tests/ai/ai-suggestion-panel-ui.test.mjs tests/ai/conservative-ai-queue-actions.test.mjs
git commit -m "feat: clarify v2.6 ai queue empty states"
```
