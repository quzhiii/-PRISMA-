# V2.6 Conservative AI Step 4 Context Hygiene Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure the Step 4 conservative AI handoff banner appears only for queue-driven entry and is cleared on normal Step 4 navigation.

**Architecture:** Keep the existing in-memory `currentConservativeAiQueueContext` state, but tighten entry semantics. Normal `goToStep4()` should clear stale advisory context by default, while `openConservativeAiQueueRecord()` should opt into preserving the queue context for that navigation only.

**Tech Stack:** Static browser app, vanilla JavaScript, existing Step 3 queue handoff helpers, Node test runner.

---

## Scope

In scope:
- Clear stale Step 4 queue context on normal Step 4 entry.
- Preserve queue context only for Step 3 queue-driven handoff.
- Regression coverage for both behaviors.

Out of scope:
- New Step 4 UI surfaces.
- Persistence changes.
- Decision or export logic changes.

## Acceptance Criteria

- `goToStep4()` clears stale conservative AI handoff context by default.
- `openConservativeAiQueueRecord()` preserves queue context for the queue-driven handoff.
- Step 4 banner no longer lingers after a later normal entry.
- Full regression suite still passes.

## Task 1: Add RED Tests For Context Hygiene

**Files:**
- Modify: `tests/ai/conservative-ai-queue-actions.test.mjs`
- Modify: `tests/ai/conservative-ai-app-integration.test.mjs`

**Step 1: Write the failing test**

Add assertions that:
- `goToStep4()` supports clearing or preserving queue context intentionally.
- A normal Step 4 entry clears existing `currentConservativeAiQueueContext` and empties the banner.
- A queue-driven entry still preserves the advisory context.

**Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests/ai/conservative-ai-queue-actions.test.mjs tests/ai/conservative-ai-app-integration.test.mjs
```

Expected: FAIL because normal Step 4 entry currently keeps stale queue context.

## Task 2: Implement Minimal Context Hygiene

**Files:**
- Modify: `literature-screening-v2.2/app.js`

**Step 1: Write minimal implementation**

- Add a tiny helper that clears the in-memory Step 4 queue context and re-renders the banner.
- Update `goToStep4()` so normal entry clears queue context unless explicitly told to preserve it.
- Update `openConservativeAiQueueRecord()` to preserve the context for queue-driven handoff.

**Step 2: Run tests to verify GREEN**

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
git add docs/plans/2026-06-05-v2-6-step4-context-hygiene.md literature-screening-v2.2/app.js tests/ai/conservative-ai-queue-actions.test.mjs tests/ai/conservative-ai-app-integration.test.mjs
git commit -m "fix: harden v2.6 step 4 context hygiene"
```
