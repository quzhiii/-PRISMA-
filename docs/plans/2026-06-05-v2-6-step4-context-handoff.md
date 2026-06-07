# V2.6 Conservative AI Step 4 Context Handoff Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a top-of-Step-4 advisory banner that preserves the conservative AI queue context for the record a reviewer just jumped into.

**Architecture:** Keep the queue handoff local and advisory-only. When a reviewer opens a record from the Step 3 conservative AI queue, capture the queue metadata in a small in-memory context object and render it as a top banner inside `displayFulltextReviewUI()`. Do not change screening decisions, review decisions, or export behavior.

**Tech Stack:** Static browser app, vanilla JavaScript, existing conservative AI queue surface, Node test runner.

---

## Scope

In scope:
- Capture queue context when jumping from Step 3 into Step 4.
- Render a top banner in Step 4 showing queue bucket, priority score, and uncertainty flags.
- Keep the banner advisory-only and local-only.

Out of scope:
- Any automatic decision changes.
- New persistence format or export schema.
- Highlighting rows or changing the Step 4 table layout.

## Acceptance Criteria

- Opening a record from the conservative AI queue stores a Step 4 context payload.
- Step 4 renders a banner at the top of the review area.
- The banner shows the queue bucket, priority score, and uncertainty flags.
- The banner does not create or mutate `ScreeningDecision` records.
- Full regression suite still passes.

## Task 1: Add RED Tests For The Step 4 Banner

**Files:**
- Modify: `tests/ai/conservative-ai-queue-actions.test.mjs`
- Modify: `tests/ai/conservative-ai-app-integration.test.mjs`

**Step 1: Write the failing test**

Add assertions that:
- `app.js` defines a Step 4 banner helper for the conservative AI queue context.
- `displayFulltextReviewUI()` includes the banner helper output near the top of the Step 4 layout.
- Calling `openConservativeAiQueueRecord('record-2')` captures queue context for that record.
- The banner HTML includes the queue bucket, priority score, and uncertainty flags.

**Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests/ai/conservative-ai-queue-actions.test.mjs tests/ai/conservative-ai-app-integration.test.mjs
```

Expected: FAIL because the Step 4 handoff banner does not exist yet.

## Task 2: Implement Minimal Banner Context

**Files:**
- Modify: `literature-screening-v2.2/app.js`

**Step 1: Write minimal implementation**

- Add a small `currentConservativeAiQueueContext` in-memory state.
- Add a helper that captures queue metadata from the matching advisory suggestion when `openConservativeAiQueueRecord(recordId)` runs.
- Add a helper that renders a top Step 4 banner from the captured context.
- Insert that banner near the top of `displayFulltextReviewUI()` before the review guidance section.
- Keep the logic advisory-only; do not touch `screeningDecisions`.

**Step 2: Run test to verify it passes**

Run:

```powershell
node --test tests/ai/conservative-ai-queue-actions.test.mjs tests/ai/conservative-ai-app-integration.test.mjs
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
git add docs/plans/2026-06-05-v2-6-step4-context-handoff.md literature-screening-v2.2/app.js tests/ai/conservative-ai-queue-actions.test.mjs tests/ai/conservative-ai-app-integration.test.mjs
git commit -m "feat: add v2.6 step 4 context handoff"
```
