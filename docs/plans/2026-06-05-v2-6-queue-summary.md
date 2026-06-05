# V2.6 Conservative AI Queue Summary Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a small Step 3 conservative AI queue summary so reviewers can see advisory workload and review state before jumping into full-text review.

**Architecture:** Keep this as a presentation-only summary derived from existing `AISuggestionEvent` entries. Count total advisory queue entries, pending entries, reviewed entries, and bucket sizes from existing metadata; do not add new persisted fields, alter `ScreeningDecision`, or change PRISMA counts.

**Tech Stack:** Static browser app, vanilla JavaScript, existing V2.6 conservative AI queue metadata, Node test runner.

---

## Scope

In scope:
- Step 3 queue summary panel inside `renderConservativeAiQueuePanel()`.
- Derived counts for total suggestions, pending review, reviewed suggestions, and each queue bucket.
- Tests that prove the summary is wired and remains advisory-only.

Out of scope:
- New AI suggestion metadata fields.
- Export schema changes.
- Sorting changes.
- Any automatic screening decision or PRISMA count update.

## Acceptance Criteria

- Step 3 conservative AI queue displays reviewer-facing summary counts.
- Pending/reviewed counts are derived from `humanAction` values.
- Bucket counts reuse existing queue keys and labels.
- Existing queue filtering and Step 4 handoff behavior remain unchanged.

## Task 1: Add RED Tests For Queue Summary

**Files:**
- Modify: `tests/ai/ai-suggestion-panel-ui.test.mjs`
- Modify: `tests/ai/conservative-ai-queue-actions.test.mjs`

**Step 1: Write the failing tests**

Add assertions that:
- `app.js` defines `getConservativeAiQueueSummary()`.
- `renderConservativeAiQueuePanel()` renders `Queue summary`, `Pending review`, and `Reviewed` copy.
- The runtime harness sees total, pending, reviewed, and bucket counts in the Step 3 queue panel.

**Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests/ai/ai-suggestion-panel-ui.test.mjs tests/ai/conservative-ai-queue-actions.test.mjs
```

Expected: FAIL because queue summary helper and summary markup do not exist yet.

## Task 2: Implement Minimal Derived Queue Summary

**Files:**
- Modify: `literature-screening-v2.2/app.js`

**Step 1: Add helper**

Add `getConservativeAiQueueSummary(entries)` that returns:

```js
{
  total: 0,
  pending: 0,
  reviewed: 0,
  buckets: {
    likely_relevant: 0,
    needs_human_attention: 0,
    needs_human_exclusion_check: 0,
  },
}
```

Rules:
- Count only the `entries` passed by `renderConservativeAiQueuePanel()`.
- Treat `humanAction === 'pending'` or missing action as pending.
- Treat any other `humanAction` as reviewed.
- Increment known bucket counts only.

**Step 2: Render summary in Step 3 queue panel**

Place a compact summary before the filter buttons:

- Total suggestions
- Pending review
- Reviewed
- One line for bucket counts using `getConservativeAiQueueLabel()`

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
git add docs/plans/2026-06-05-v2-6-queue-summary.md literature-screening-v2.2/app.js tests/ai/ai-suggestion-panel-ui.test.mjs tests/ai/conservative-ai-queue-actions.test.mjs
git commit -m "feat: summarize v2.6 ai queue"
```
