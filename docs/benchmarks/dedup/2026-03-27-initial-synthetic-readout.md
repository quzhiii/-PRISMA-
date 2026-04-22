# Initial Synthetic Dedup Readout

## Scope

This is a pre-benchmark readout against the synthetic fixture suite in `tests/fixtures/dedup/synthetic/`.

It is not the final evaluation verdict because:

- it does not yet include real exported review datasets
- it is based on the current root app dedup logic
- it is intended to identify obvious strengths and failures before the full benchmark cycle

## Engine Target

- branch: `main`
- workspace state: dirty working tree
- logic reviewed from: `app.js`
- core behavior assumed for this readout:
  - exact DOI equality
  - exact normalized title equality when DOI is absent

## Synthetic Result Summary

| Dataset | Gold label expectation | Current outcome | Result |
|--------|-------------------------|-----------------|--------|
| dedup-case-001 | hard duplicate | detected | PASS |
| dedup-case-002 | hard duplicate | missed | FAIL |
| dedup-case-003 | hard duplicate | detected | PASS |
| dedup-case-004 | hard duplicate | detected | PASS |
| dedup-case-005 | hard duplicate | detected | PASS |
| dedup-case-006 | hard duplicate | detected | PASS |
| dedup-case-007 | hard duplicate | missed | FAIL |
| dedup-case-008 | not duplicate | preserved | PASS |
| dedup-case-009 | not duplicate | preserved | PASS |
| dedup-case-010 | likely duplicate | missed as candidate | FAIL |
| dedup-case-011 | not duplicate | preserved | PASS |

## Preliminary Metrics

### Hard-duplicate recall

Hard-duplicate cases in the synthetic suite:

- 7 cases: `001` to `007`

Detected by current logic:

- 5 cases: `001`, `003`, `004`, `005`, `006`

Preliminary hard-duplicate recall:

- `5 / 7 = 0.714`

### Duplicate discovery recall including likely duplicates

Duplicate-like cases in the synthetic suite:

- 8 cases: `001` to `007`, plus `010`

Detected by current logic:

- 5 cases

Preliminary candidate recall:

- `5 / 8 = 0.625`

### False positives on this synthetic suite

Observed false positives in the current synthetic set:

- `0`

Important limitation:

- this synthetic suite is small and curated, so zero false positives here is not enough to clear Gate 2 by itself

## Main Failure Categories

### 1. DOI normalization gap

The current logic misses records where both entries have DOI values but one record stores the DOI as a URL form.

Failed case:

- `dedup-case-002`

### 2. Mixed identifier coverage gap

When one record has DOI and the other does not, the current logic can miss a true duplicate because the DOI branch exits before title-based matching is considered for the DOI-bearing record.

Failed case:

- `dedup-case-007`

### 3. Cross-language or translated-title gap

The current logic does not surface plausible cross-language duplicate candidates when decisive identifiers are absent.

Failed case:

- `dedup-case-010`

## Main Strengths

### 1. Conservative safety on obvious non-duplicates

The current logic keeps protocol vs. final article and conference abstract vs. final article distinct in this synthetic suite.

### 2. Good handling of simple normalized-title duplicates

The current logic performs well when the same study appears without DOI but with nearly identical titles after basic normalization.

## Preliminary Interpretation

This synthetic readout suggests:

- the current logic is reasonably safe for auto-removing exact and near-exact duplicates
- recall is too low for a research-grade dedup workflow
- the most immediate weaknesses are normalization and mixed-metadata handling, not explainability

## Provisional State

If the final benchmark showed the same pattern on real data, the likely result would be:

- `State C: Moderate redesign`

Reason:

- safety appears acceptable in the synthetic suite
- duplicate discovery recall is materially below the planning threshold
- the engine lacks a true candidate-review layer for likely duplicates

## Next Step

To move from this provisional readout to Gate 2:

1. choose and freeze the official benchmark target
2. add real exported datasets into `tests/fixtures/dedup/real/`
3. adjudicate the real datasets
4. score them using `docs/benchmarks/dedup/scoring-template.csv`
5. fill `docs/benchmarks/dedup/evaluation-report-template.md`
