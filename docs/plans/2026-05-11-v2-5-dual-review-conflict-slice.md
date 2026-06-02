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
- Minimal quality conflict resolver workflow: resolver/final values for overall judgement, status, and domain judgements plus a `quality_conflict_resolved` audit event.
- Hard final-result export gate when unresolved conflicts remain.
- Warning-only evidence export path for audit and dual-review conflict evidence.
- V2.5 export evidence: `dual_review_conflicts.csv` and `dual_review_agreement.json`.

Out of scope for this slice:

- Large UI redesign.
- Large export-system rewrite.
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
- records `quality_conflict_resolved` after resolver confirmation of quality conflicts.
- records `export_conflict_blocked` when final result exports are blocked by unresolved conflicts.
- records `export_conflict_warning` when audit or dual-review evidence exports proceed with unresolved conflicts.
- records `dual_review_export_generated` when V2.5 conflict or agreement exports are downloaded.
- persists `dualReviewResults` and `dualReviewConflictState` in project snapshots and project files.

Quality forms now stamp `reviewer_id` and preserve reviewer-level quality snapshots on save so V2.5 can compare reviewer A/B quality appraisals without changing existing quality export columns. The resolver workflow stores resolver/final quality values in the same reviewer snapshot map and mirrors final values back to the base quality record for existing V2.4 exports.

## Export Evidence

This slice now exposes V2.5 dual-review artifacts outside the frozen V2.3 audit export type list:

- `dual_review_conflicts.csv`: screening and quality conflict rows with reviewer A/B values, resolver/final values when present, conflict status, and a stable `dual_review.v2.5-alpha` schema marker.
- `dual_review_agreement.json`: paired A/B screening decisions, percent agreement, Cohen's kappa, conflict summaries, and the warning-only unresolved-conflict export gate.

The paired agreement calculation includes both agreement and disagreement pairs. This avoids undercounting agreement when a project contains a mix of matching A/B decisions and unresolved conflicts.

Quality conflict rows now show resolver/final values after resolution. This remains outside the frozen V2.3 audit export type list and does not change `quality_appraisal.csv`, `evidence_table.csv`, or `grade_summary.csv` columns.

V2.5 final result exports are now blocked while unresolved conflicts remain. Conflict evidence exports remain available so reviewers can inspect disagreements before resolution.

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
