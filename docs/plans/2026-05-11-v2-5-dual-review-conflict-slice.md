# V2.5 Dual-Review Conflict Slice

Date: 2026-05-11

## Scope

This slice formalizes the smallest reliable dual-review loop in `literature-screening-v2.2/` while keeping the compatibility release path unchanged.

Covered:

- Reviewer A/B decision isolation for full-text review.
- A screening conflict queue for include / exclude / uncertain disagreements.
- Resolver decisions that write a final human `ScreeningDecision` plus a `review_conflict_resolved` audit event.
- Agreement metrics foundation: percent agreement and Cohen's kappa.
- Minimal quality conflict detection for overall judgement, status, and domain judgement.
- Warning-only export gate when unresolved conflicts remain.

Out of scope for this slice:

- Large UI redesign.
- Hard export blocking.
- Changes to the frozen V2.3 audit export CSV headers.
- Changes to `quality_appraisal.csv`, `evidence_table.csv`, or `grade_summary.csv` columns.

## Data Model

`literature-screening-v2.2/dual-review-engine.js` owns the V2.5 pure logic boundary:

- `dual_review.v2.5-alpha`
- reviewer records keyed by `recordId + stage + reviewerId`
- reviewer slots: `A`, `B`, and `resolver`
- screening decisions: `include`, `exclude`, `uncertain`, `pending`
- conflict status: `pending` or `resolved`

Full-text selections are normalized so blank means `include`, `__uncertain__` means `uncertain`, and any exclusion reason means `exclude`.

Resolver actions create a final human decision with `metadata.resolverAction = true` and `metadata.finalDecision = true`.

## Count Boundary

`audit-engine.js` keeps the V2.3 export surface stable, but PRISMA count replay now uses countable decisions:

- single-review records remain countable as before.
- unresolved multi-review records are excluded from final count replay.
- resolved multi-review records count only the resolver/final human decision.

This prevents Reviewer A and Reviewer B from double-counting the same record.

## App Integration

`app.js` integrates the engine without a broad rewrite:

- saves local dual-review decisions into `dualReviewResults` and durable `screeningDecisions`.
- preserves collaborative `projectData.reviewDecisions`.
- records `review_conflict_detected` when pending conflicts are detected.
- records `review_conflict_resolved` after resolver confirmation.
- records `export_conflict_warning` when final exports proceed with unresolved conflicts.
- persists `dualReviewResults` and `dualReviewConflictState` in project snapshots and project files.

Quality forms now stamp `reviewer_id` on save so later V2.5 slices can compare reviewer-level quality appraisals without changing existing quality export columns.

## Verification

Focused tests:

```powershell
node --check literature-screening-v2.2\dual-review-engine.js
node --check literature-screening-v2.2\audit-engine.js
node --check literature-screening-v2.2\app.js
node --test tests\audit\dual-review-engine.test.mjs tests\audit\audit-engine.test.mjs tests\audit\audit-export.test.mjs tests\audit\audit-workflow.test.mjs tests\quality\evidence-engine.test.mjs
```

Full regression remains:

```powershell
node tests\run-all-regressions.js
```
