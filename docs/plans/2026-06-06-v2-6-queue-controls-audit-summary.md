# V2.6 Queue Controls Audit Summary Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an audit-ready V2.6 advisory queue controls summary to PRISMA-trAIce and audit summary exports without claiming automatic screening or untracked control usage.

**Architecture:** Derive a conservative queue summary from existing `AISuggestionEvent` metadata only. Count advisory title/abstract suggestions, pending versus reviewed state, and known queue buckets; render the current Step 3 queue controls as available workflow controls, not as user click telemetry.

**Tech Stack:** Static browser app, vanilla JavaScript, existing `audit-engine.js` export builders, Node test runner.

---

## Scope

In scope:
- Add a reusable audit-engine helper that summarizes V2.6 advisory queue metadata from `aiSuggestionEvents`.
- Include queue summary and available Step 3 controls in `PRISMA_TRAICE_REPORT.md`.
- Include the same conservative queue summary in `audit_summary.md` by passing existing `aiSuggestionEvents` into the export builder.
- Keep wording advisory-only and avoid claiming control usage telemetry.

Out of scope:
- New backend, provider, account, cloud sync, or API key fields.
- New persisted UI click events.
- Exporting automatic `ScreeningDecision` records.
- Any change to PRISMA counts or decision replay.

## Acceptance Criteria

- PRISMA-trAIce report lists total advisory queue suggestions, pending, reviewed, and bucket counts.
- Audit summary lists the same derived V2.6 queue summary when suggestions exist.
- Reports explicitly describe available queue controls: queue labels, queue summary, priority sorting, review-state filters, and empty-state clarity.
- Reports state that these are available controls and derived metadata summaries, not tracked control-click usage.
- Existing final decision and PRISMA count behavior remains unchanged.

## Task 1: Add RED Tests For Queue Audit Summary

**Files:**
- Modify: `tests/audit/audit-engine.test.mjs`
- Modify: `tests/audit/audit-export.test.mjs`

**Step 1: Write the failing tests**

Add tests that call `AuditEngine.buildPrismaTraiceReportMarkdown()` and `AuditEngine.buildAuditSummaryMarkdown()` with V2.6 advisory suggestion metadata:

```js
const suggestions = [
  AuditEngine.createAiSuggestionEvent({
    recordId: 'record-1',
    stage: 'title_abstract',
    humanAction: 'pending',
    metadata: { advisoryOnly: true, recommendedQueue: 'likely_relevant' },
  }),
  AuditEngine.createAiSuggestionEvent({
    recordId: 'record-2',
    stage: 'title_abstract',
    humanAction: 'rejected',
    metadata: { advisoryOnly: true, recommendedQueue: 'needs_human_attention' },
  }),
];
```

Assert that both markdown outputs include:
- `V2.6 Advisory Queue Controls Summary`
- total, pending, reviewed counts
- known bucket rows
- `queue labels`, `queue summary`, `priority sorting`, `review-state filters`, `empty-state clarity`
- wording that avoids tracked usage claims

**Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests/audit/audit-engine.test.mjs tests/audit/audit-export.test.mjs
```

Expected: FAIL because the V2.6 queue controls summary section does not exist yet.

## Task 2: Implement Minimal Derived Summary

**Files:**
- Modify: `literature-screening-v2.2/audit-engine.js`
- Modify: `literature-screening-v2.2/app.js`

**Step 1: Add helper in audit engine**

Add `summarizeV26AdvisoryQueue(events)` that returns:

```js
{
  totalSuggestions: 0,
  pendingSuggestions: 0,
  reviewedSuggestions: 0,
  byRecommendedQueue: {
    likely_relevant: 0,
    needs_human_attention: 0,
    needs_human_exclusion_check: 0,
  },
}
```

Rules:
- Count only `stage === 'title_abstract'` suggestions with `metadata.advisoryOnly === true`.
- Treat missing or `pending` human action as pending.
- Treat any other human action as reviewed.
- Increment only known queue bucket keys.
- Do not infer or store any UI control click usage.

**Step 2: Render report sections**

Add an English and Chinese section to PRISMA-trAIce and audit summary markdown:

- Section title: `V2.6 Advisory Queue Controls Summary`
- Count lines for total, pending, reviewed.
- A bucket table for the three known bucket labels.
- A short available-controls line naming queue labels, queue summary, priority sorting, review-state filters, and empty-state clarity.
- A note that these are derived metadata summaries and available controls, not control-click telemetry.

**Step 3: Wire audit summary input**

Update `buildAuditSummaryMarkdown(manifestInput, events, decisions, options = {})` to read `options.aiSuggestionEvents`.

Update `buildAuditExportContent('audit_summary')` in `app.js` to pass the existing `aiSuggestionEvents` array through the options object.

## Task 3: Verify And Commit

**Files:**
- Files from Task 1 and Task 2.

**Step 1: Run targeted audit tests**

Run:

```powershell
node --test tests/audit/audit-engine.test.mjs tests/audit/audit-export.test.mjs tests/audit/prisma-traice-export-trio.test.mjs tests/audit/audit-workflow.test.mjs
```

Expected: PASS.

**Step 2: Run full regression**

Run:

```powershell
node tests/run-all-regressions.js
```

Expected: all tests pass.

**Step 3: Commit**

```powershell
git add docs/plans/2026-06-06-v2-6-queue-controls-audit-summary.md literature-screening-v2.2/audit-engine.js literature-screening-v2.2/app.js tests/audit/audit-engine.test.mjs tests/audit/audit-export.test.mjs
git commit -m "feat: summarize v2.6 queue controls in audit exports"
```
