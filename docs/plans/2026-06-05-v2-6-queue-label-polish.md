# V2.6 Conservative AI Queue Label Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace raw internal conservative AI queue keys with reviewer-facing localized labels in Step 3, Step 4, and the AI suggestion panel.

**Architecture:** Introduce one tiny shared label map for conservative AI queue buckets and reuse it wherever reviewer-facing copy currently prints `recommendedQueue` directly. Keep the stored metadata unchanged; only presentation should change.

**Tech Stack:** Static browser app, vanilla JavaScript, existing conservative AI queue metadata, Node test runner.

---

## Scope

In scope:
- Shared localized labels for `likely_relevant`, `needs_human_attention`, and `needs_human_exclusion_check`.
- Step 3 queue cards use shared labels.
- Step 4 handoff banner uses shared labels.
- AI suggestion panel uses shared labels.

Out of scope:
- Metadata schema changes.
- New queue buckets.
- Export format changes.

## Acceptance Criteria

- Reviewer-facing UI no longer shows raw queue keys in Step 4 and AI suggestion panel.
- Step 3 and Step 4 use the same queue label source.
- Internal `recommendedQueue` values remain unchanged in data and tests still pass.

## Task 1: Add RED Tests For Localized Queue Labels

**Files:**
- Modify: `tests/ai/ai-suggestion-panel-ui.test.mjs`
- Modify: `tests/ai/conservative-ai-queue-actions.test.mjs`

**Step 1: Write the failing test**

Add assertions that:
- `app.js` defines a shared queue label map/helper.
- The Step 4 banner renders reviewer-facing labels instead of raw queue keys.
- The AI suggestion panel uses the shared queue label helper for `recommendedQueue`.

**Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests/ai/ai-suggestion-panel-ui.test.mjs tests/ai/conservative-ai-queue-actions.test.mjs
```

Expected: FAIL because Step 4 and AI suggestion panel still print raw queue keys.

## Task 2: Implement Minimal Shared Label Helper

**Files:**
- Modify: `literature-screening-v2.2/app.js`

**Step 1: Write minimal implementation**

- Add a small shared queue label map.
- Add a helper that returns a localized reviewer-facing label from `recommendedQueue`.
- Use it in Step 3 queue cards, Step 4 handoff banner, and AI suggestion panel.

**Step 2: Run tests to verify GREEN**

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
git add docs/plans/2026-06-05-v2-6-queue-label-polish.md literature-screening-v2.2/app.js tests/ai/ai-suggestion-panel-ui.test.mjs tests/ai/conservative-ai-queue-actions.test.mjs
git commit -m "feat: polish v2.6 queue labels"
```
