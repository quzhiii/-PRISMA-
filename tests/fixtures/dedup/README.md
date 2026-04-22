# Dedup Benchmark Fixtures

This directory stores the fixture package for deduplication benchmarking.

The benchmark should contain both:

- real export files from review workflows
- synthetic edge-case files for repeatable regression testing

## Required Files

- `benchmark-manifest.csv`
  - inventory of every dataset used in a benchmark run
- `gold-label-template.csv`
  - cluster and record-level gold labels for adjudication

Recommended future additions:

- `real/`
  - anonymized or permission-approved user export sets
- `synthetic/`
  - crafted cases for DOI variants, title variants, publication-type edge cases

## Fixture Rules

- Keep original source files immutable after intake.
- Add normalized copies only as derived artifacts, not replacements.
- Do not overwrite a benchmark dataset after adjudication begins.
- Record source provenance in `benchmark-manifest.csv`.
- For real data, remove personal or sensitive project labels if they are not needed for adjudication.

## Suggested Layout

```text
tests/fixtures/dedup/
  README.md
  benchmark-manifest.csv
  gold-label-template.csv
  real/
  synthetic/
```

## Benchmark Intake Process

1. Add the raw source file.
2. Register it in `benchmark-manifest.csv`.
3. Assign a dataset id.
4. Record file type and source system.
5. Create or update the gold labels in `gold-label-template.csv`.
6. Do not start scoring until labeling is complete.
