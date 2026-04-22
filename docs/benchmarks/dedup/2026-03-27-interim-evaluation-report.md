# Interim Dedup Evaluation Report

## Update Note

This report remains the pre-implementation decision record for why the project moved into a vNext dedup upgrade.

As of 2026-03-28, the implementation benchmark rerun is documented separately in `docs/benchmarks/dedup/post-implementation-benchmark-report.md`.

Read this file as the baseline rationale, not as the latest measured result.

## Metadata

- evaluation date: 2026-03-27
- evaluator: Codex
- engine target: current root `app.js` dedup behavior in the working tree
- branch: `main`
- HEAD base snapshot: `a932ec54cd39911f662b1239ed3b37302669727b`
- benchmark assets used:
  - synthetic fixture suite
  - `real-rdf-001` provisional readout

## 1. Executive Verdict

**Provisional verdict:** `State C: Moderate redesign`

This is not the final Gate 2 decision yet because the benchmark target is not frozen to a clean snapshot and the real-data adjudication is still partial. But the evidence already cleared the bar for one strong interim conclusion:

- the current dedup logic was too conservative for real review workflows
- the gap was structural, not only cosmetic
- a pure documentation fix was insufficient
- a small normalization patch would help, but would not fully close the recall gap

## 2. Gate Status

### Gate 1: Evaluation readiness

- [x] benchmark corpus structure defined
- [x] synthetic benchmark cases created
- [x] adjudication rubric written
- [x] scoring worksheet created
- [ ] official benchmark target frozen to a clean snapshot
- [ ] real-data gold labels completed

**Status:** Partially complete

### Gate 2: Evaluation verdict

- [x] benchmark results documented for synthetic data
- [x] benchmark results documented for one real RDF dataset
- [x] failure categories grouped
- [x] product risks ranked at a high level
- [ ] full real-data adjudication completed
- [ ] final decision applied to a frozen benchmark target

**Status:** Provisional only

## 3. Evidence Summary

Primary supporting documents:

- `docs/benchmarks/dedup/2026-03-27-initial-synthetic-readout.md`
- `docs/benchmarks/dedup/2026-03-27-real-rdf-readout.md`
- `docs/benchmarks/dedup/current-state-baseline-audit.md`
- `docs/benchmarks/dedup/2026-03-27-interim-scoring.csv`

### Interim score snapshot

| Slice | Hard duplicate recall | Duplicate-like recall | Observed false positives |
|------|------------------------|-----------------------|--------------------------|
| Synthetic suite | 0.714 | 0.625 | 0 |
| Real RDF provisional | 0.667 | 0.500 | 0 |
| Combined provisional | 0.700 | 0.583 | 0 |

## 4. What The Evidence Already Proves

### 4.1 Current logic is safe-looking but under-sensitive

Across the current evidence set, the engine did not show obvious false-positive behavior. That was the good news.

The more important product signal was:

- hard duplicate recall was around `0.70` in the combined provisional set
- duplicate-like recall was around `0.58`

That was far below the benchmark planning threshold for research-grade workflows.

### 4.2 The current engine was over-dependent on raw identifier equality

The current algorithm short-circuited on non-empty identifier fields. In real mixed-source exports, those fields were often:

- DOI URLs
- CNKI URL surfaces
- PMC URLs
- plain DOI strings

That meant two records could clearly describe the same article while still escaping dedup because the identifier strings were formatted differently.

### 4.3 Chinese workflow exports were a real stress case

The real RDF file confirmed that Chinese workflow exports were not a corner case. They exposed a specific weakness:

- `dc:identifier` was often URL-like, not a clean DOI field
- CNKI and related sources could represent the same underlying article in different URL forms
- the current engine had no candidate-review layer to preserve those findings safely

### 4.4 A small patch helped, but did not solve the whole problem

The real RDF readout showed:

- current duplicates detected: `2`
- identifier normalization only: `3`
- normalization plus title-aware candidate handling: `4`

This meant:

- normalization was worth doing
- normalization alone did not fully solve the recall problem
- the short-circuit design itself was part of the issue

## 5. Failure Categories

### Category A: Identifier normalization gap

Evidence:

- DOI URL vs. raw DOI forms
- `link.cnki.net/doi/...` vs. `doi.org/...`

Impact:

- misses true duplicates that should be safe to auto-resolve

Priority:

- high

### Category B: DOI-first short-circuit rigidity

Evidence:

- if a record had a non-empty identifier and that exact string was not repeated, the engine exited before title-based duplicate review could help

Impact:

- misses duplicates when one source has an identifier and another does not
- misses duplicates when identifier strings differ across platforms

Priority:

- high

### Category C: No candidate-review layer for ambiguous duplicates

Evidence:

- likely duplicates were either missed or had to be forced into exact-match logic
- there was no native distinction between auto-delete-safe duplicates and human-review candidates

Impact:

- low recall if rules stayed strict
- unsafe behavior if rules became too aggressive later

Priority:

- high

### Category D: Internal rule-path inconsistency

Evidence:

- `app.js`, `v1.7-core-patch.js`, and `parser-worker.js` were not perfectly aligned in fallback behavior

Impact:

- benchmark ambiguity
- increased maintenance cost
- user confusion if large-file flows diverged from app-level flows

Priority:

- medium

## 6. Why This Was Not State B Yet

A `Patch only` outcome would have required the core design to remain acceptable after a few normalization fixes.

The evidence did not support that conclusion.

Reason:

- a patch-only approach improved one missed case type
- recall still remained low because the engine had no proper duplicate-candidate layer
- real data showed the structural short-circuit was part of the recall failure

So the best fit at that stage was:

- not `State A: Keep as-is`
- not `State B: Patch only`
- but `State C: Moderate redesign`

## 7. What State C Meant Here

It did **not** mean jumping straight into a complex fuzzy matcher.

It meant the next strategy should define a two-layer dedup model:

1. `hard duplicates`
   - very high confidence
   - safe for auto-resolution
2. `candidate duplicates`
   - surfaced for review
   - not silently deleted

That was the smallest structural change that aligned with the evidence.

## 8. Remaining Work Before Final Gate 2

1. Freeze the official benchmark target to a clean snapshot.
2. Complete manual adjudication for the real RDF dataset.
3. Add at least one more real exported dataset if available.
4. Fill the formal evaluation report template with the frozen-target results.
5. Confirm whether the provisional `State C` verdict still holds.

## 9. Interim Recommendation

Proceed to the **pre-strategy boundary**, but do not start implementation.

At the time this report was written, the next acceptable step was:

- prepare a next-version dedup strategy document draft

That recommendation has now been executed. The post-implementation benchmark report should be used for current rollout decisions.
