# Dedup Benchmark Package

This directory contains the evaluation package for deciding whether the current deduplication logic is good enough for real systematic review workflows.

The package is intentionally separated from implementation work. Its job is to answer one question first:

`Does the current dedup engine need no change, a small patch, a moderate redesign, or a full upgrade?`

## Package Contents

- `README.md`
  - benchmark purpose, process, and folder layout
- `adjudication-rubric.md`
  - labeling rules for `hard_duplicate`, `likely_duplicate`, `not_duplicate`, and `needs_human_judgment`
- `current-state-baseline-audit.md`
  - code-level audit of the current dedup logic and known risks
- `scoring-template.csv`
  - worksheet for recording benchmark results by dataset

Related fixture files live under:

- `tests/fixtures/dedup/`

## Evaluation Layers

The benchmark uses two separate layers because "safe automatic deletion" and "good candidate discovery" are not the same problem.

### Layer A: Auto-delete safety

This measures records that the product would remove automatically.

Required pass condition:

- `false positives = 0`
- `precision = 1.000`

If Layer A fails, the product must not broaden auto-delete logic.

### Layer B: Candidate duplicate discovery

This measures whether the product can surface duplicates for user review.

Target thresholds:

- `recall >= 0.95`
- `specificity >= 0.99`
- `F1 >= 0.95`

These are decision thresholds for planning, not release thresholds for code changes.

## Benchmark Procedure

1. Freeze the evaluation target.
2. Copy or export benchmark datasets into `tests/fixtures/dedup/`.
3. Label the gold set using `adjudication-rubric.md`.
4. Run the current dedup logic against each dataset.
5. Record metrics in `scoring-template.csv`.
6. Summarize results in an evaluation report.
7. Apply the decision rubric from the main plan:
   - Keep as-is
   - Patch only
   - Moderate redesign
   - Full upgrade

## Required Dataset Groups

The benchmark suite should include all of the following:

1. Exact DOI duplicates
2. DOI variants
3. Title punctuation and case variation
4. Author abbreviation variation
5. Page range variation
6. Journal abbreviation variation
7. Missing DOI in one source only
8. Conference abstract vs. final article
9. Protocol vs. final article
10. Chinese and English mixed metadata
11. Lookalike records that must remain distinct

## Data Source Mix

Each benchmark run should mix:

- real exported records from actual review workflows
- synthetic edge cases for hard-to-find metadata patterns
- a manually adjudicated gold set

Do not use only one user's mismatch with Rayyan as the sole benchmark.

## Output Expectations

At the end of a benchmark cycle, this package should produce:

- a scored worksheet
- a short evaluation report
- a recommendation memo with one verdict:
  - `State A: Keep as-is`
  - `State B: Patch only`
  - `State C: Moderate redesign`
  - `State D: Full dedup engine upgrade`

## Folder Layout

```text
docs/benchmarks/dedup/
  README.md
  adjudication-rubric.md
  current-state-baseline-audit.md
  scoring-template.csv

tests/fixtures/dedup/
  README.md
  benchmark-manifest.csv
  gold-label-template.csv
```
