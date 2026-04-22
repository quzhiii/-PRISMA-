# Post-Implementation Dedup Benchmark Report

## Metadata

- benchmark rerun date: 2026-03-28
- evaluator: Codex
- baseline target: `root-app`
- current target: `dedup-vnext`
- benchmark command:
  - `node --test --test-concurrency=1 tests/dedup/benchmark-smoke.test.mjs tests/dedup/benchmark-regression.test.mjs tests/dedup/record-normalization.test.mjs tests/dedup/dedup-engine.test.mjs tests/dedup/app-integration.test.mjs tests/dedup/legacy-paths.test.mjs tests/dedup/candidate-output.test.mjs`
  - `node scripts/dedup/run-benchmark.mjs --target root-app`
  - `node scripts/dedup/run-benchmark.mjs --target dedup-vnext`
- validation status:
  - all 34 dedup tests passed on the rerun
  - manual page check for the candidate-review panel passed in both root and `literature-screening-v2.0`

## 1. Executive Verdict

**Current verdict:** `State C: Moderate redesign`, now implemented to a usable benchmarked baseline.

Interpretation:

- the two-layer dedup architecture is justified by measured gains, not only by design preference
- the current build is materially closer to research workflow expectations than the frozen baseline
- one recall gap remains before the benchmark reaches the `0.95` duplicate-like recall target

## 2. Comparison Summary

| Slice | Engine | Auto precision | Hard recall | Duplicate-like recall | Candidate specificity | Candidate F1 | Review load / 1,000 |
|------|--------|----------------|-------------|-----------------------|-----------------------|--------------|---------------------|
| Synthetic suite | `root-app` | 1.000 | 0.714 | 0.625 | 1.000 | 0.769 | 0.000 |
| Synthetic suite | `dedup-vnext` | 1.000 | 0.714 | 0.875 | 1.000 | 0.933 | 90.909 |
| Real RDF provisional | `root-app` | 1.000 | 0.667 | 0.500 | 1.000 | 0.667 | 0.000 |
| Real RDF provisional | `dedup-vnext` | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 6.993 |
| Combined provisional | `root-app` | 1.000 | 0.700 | 0.583 | 1.000 | 0.737 | 0.000 |
| Combined provisional | `dedup-vnext` | 1.000 | 0.800 | 0.917 | 1.000 | 0.957 | 18.182 |

## 3. Key Case Deltas

| Dataset | Baseline | Current | Result |
|---------|----------|---------|--------|
| `dedup-case-002` | 0 findings | 1 hard duplicate | fixed DOI URL normalization gap |
| `dedup-case-007` | 0 findings | 1 candidate duplicate | now surfaced safely for review |
| `real-rdf-001` | 2 hard duplicates, 0 candidates | 3 hard duplicates, 1 candidate | recovered CNKI DOI normalization, PMC URL normalization, and one likely-duplicate cluster |
| `dedup-case-008` | preserved | preserved | no false merge |
| `dedup-case-009` | preserved | preserved | no false merge |
| `dedup-case-011` | preserved | preserved | no false merge |

## 4. What Improved

### 4.1 Safe normalization improved without introducing false positives

The current engine now correctly normalizes and auto-resolves:

- DOI URL vs. raw DOI forms
- CNKI DOI URLs carrying the same DOI payload
- PMC article URLs carrying the same PMCID payload

No new false auto-removals were observed on the protected synthetic cases.

### 4.2 Candidate review materially improved duplicate-like recall

The major gain came from separating:

- `hard duplicates` for safe auto-resolution
- `candidate duplicates` for human review

That pushed duplicate-like recall from `0.583` to `0.917` on the combined provisional benchmark while keeping auto precision at `1.000`.

### 4.3 The real RDF dataset now matches the intended workflow model

`real-rdf-001` now produces:

- `3` hard duplicate groups recovered safely
- `1` likely duplicate surfaced for manual review

This is the first benchmark evidence in the repo that the implementation matches the product principle of “strict auto-delete, broader review surfacing” on a real exported dataset.

## 5. Remaining Gaps

### 5.1 Cross-language candidate matching is still missing

`dedup-case-010` remains undetected.

Meaning:

- the current engine still misses one plausible translated-title duplicate scenario
- this is the main reason duplicate-like recall remains below the `0.95` target

### 5.2 Some former hard-duplicate fixtures are now deliberately downgraded to candidates

`dedup-case-005` and `dedup-case-007` are both discovered, but only as candidate duplicates.

This is a deliberate conservative choice:

- recall is preserved for human review
- silent auto-delete remains strict
- benchmark reporting should treat this as a tradeoff, not as an accidental regression

## 6. Manual Page Check

The result-page candidate review panel was manually checked with the production render function and the `dedup-case-007` scenario (`0` hard duplicates, `1` candidate duplicate, `2` retained records).

Confirmed in both root and `literature-screening-v2.0` layouts:

- the summary panel renders in both the main and final results sections
- helper copy states that candidates are not auto-removed
- the export button is enabled when candidates exist
- the export button is disabled when candidate count is `0`

## 7. Recommendation

The current build is ready for practical use as a conservative vNext dedup baseline.

Recommended next optimization target:

1. Improve cross-language / translated-title candidate surfacing for cases like `dedup-case-010`.
2. Revisit whether some current candidate-only cases should be promoted to hard duplicates after stronger evidence rules are added.
3. Add at least one more real exported dataset before declaring the benchmark fully closed.
