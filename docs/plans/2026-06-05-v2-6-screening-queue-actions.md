# V2.6 Conservative AI Screening Queue Actions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the next V2.6 Step 3 workflow slice so reviewers can filter the conservative AI queue by recommendation bucket and jump directly into the matching Step 4 full-text review record.

**Architecture:** Reuse existing advisory-only `AISuggestionEvent` records and the Step 3 `renderConservativeAiQueuePanel()` surface. Add a small queue UI state for the active bucket filter plus a narrow Step 4 handoff helper that opens full-text review, locates the matching retained record by stable audit record id, and focuses the corresponding review row without creating human screening decisions.

**Tech Stack:** Static browser app, vanilla JavaScript, existing `audit-engine.js`, local conservative AI queue surface, Node test runner.

---

## Scope

In scope:
- Step 3 filter controls for `all`, `likely_relevant`, `needs_human_attention`, and `needs_human_exclusion_check`.
- Queue row action to jump from Step 3 into the matching Step 4 record.
- Stable Step 4 row ids / `data-record-id` attributes so the queue can focus the correct full-text row.
- Regression coverage for queue action wiring.

Out of scope:
- Automatic screening decision creation.
- Automatic Step 4 finalization.
- Real provider dispatch.
- New export formats or audit schema changes.

## Acceptance Criteria

- Step 3 queue shows visible bucket filter controls.
- Reviewers can switch the queue surface between all suggestions and a single recommendation bucket.
- Queue entries expose a direct action to open the matching Step 4 record.
- The Step 4 handoff focuses the matching full-text review row / select for the chosen record.
- The queue remains advisory-only and does not create `ScreeningDecision` records during filter or jump actions.
- Full regression suite still passes.

## Task 1: Add RED Tests For Queue Actions

**Files:**
- Create: `tests/ai/conservative-ai-queue-actions.test.mjs`
- Modify: `tests/ai/ai-suggestion-panel-ui.test.mjs`
- Modify: `tests/ai/conservative-ai-app-integration.test.mjs`
- Modify: `tests/run-all-regressions.js`

**Step 1: Write the failing test**

Add static assertions that:
- `app.js` defines queue action helpers for filter state and record jump.
- `displayFulltextReviewUI()` writes stable row identifiers for retained records.
- The queue panel render code includes explicit filter actions and a Step 4 jump action.

Create a VM harness test that:
- Seeds `screeningResults.included` with retained records.
- Seeds advisory-only `aiSuggestionEvents` across multiple `recommendedQueue` buckets.
- Calls `renderConservativeAiQueuePanel()` and verifies the default render includes all buckets.
- Calls the filter helper and verifies only the selected bucket remains visible.
- Calls the jump helper and verifies it opens Step 4 and focuses the matching full-text row/select.

**Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests/ai/conservative-ai-queue-actions.test.mjs tests/ai/conservative-ai-app-integration.test.mjs tests/ai/ai-suggestion-panel-ui.test.mjs
```

Expected: FAIL because the queue action helpers and Step 4 focus hooks do not exist yet.

## Task 2: Implement Minimal Queue Actions

**Files:**
- Modify: `literature-screening-v2.2/app.js`
- Modify: `literature-screening-v2.2/workspace.html`

**Step 1: Write minimal implementation**

In `app.js`:
- Add a tiny Step 3 queue UI state for the active recommendation bucket.
- Add `setConservativeAiQueueFilter(...)` to update the filter and re-render the queue panel.
- Add `focusFulltextReviewRecord(...)` to find a retained record by stable audit record id, scroll its Step 4 row into view, and focus the exclusion select.
- Add `openConservativeAiQueueRecord(...)` to call `goToStep4()` and then focus the selected record.
- Update `renderConservativeAiQueuePanel()` so each entry shows a Step 4 jump button and the panel exposes filter controls.
- Keep the logic advisory-only: do not call `upsertScreeningDecisionSafe()` here.

In `displayFulltextReviewUI()`:
- Add stable row ids and `data-record-id` attributes using `getRecordAuditId(record, idx)`.
- Add a stable id for the review select or reuse the existing `exclude-${idx}` control.

In `workspace.html`:
- Keep the existing Step 3 queue container.
- Only add small helper copy if needed to explain that the queue can now open matching full-text rows.

**Step 2: Run targeted tests to verify GREEN**

Run:

```powershell
node --test tests/ai/conservative-ai-queue-actions.test.mjs tests/ai/conservative-ai-app-integration.test.mjs tests/ai/ai-suggestion-panel-ui.test.mjs
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
git add docs/plans/2026-06-05-v2-6-screening-queue-actions.md literature-screening-v2.2/app.js literature-screening-v2.2/workspace.html tests/ai/conservative-ai-queue-actions.test.mjs tests/ai/conservative-ai-app-integration.test.mjs tests/ai/ai-suggestion-panel-ui.test.mjs tests/run-all-regressions.js
git commit -m "feat: add v2.6 screening queue actions"
```
