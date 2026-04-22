# Real RDF Readout: 初稿.rdf

## Scope

This note captures a first-pass dedup readout for the user-provided real dataset `初稿.rdf`.

This is a Phase 1 benchmark input, not the final Gate 2 verdict.

## Dataset Metadata

- dataset id: `real-rdf-001`
- source file: `tests/fixtures/dedup/real/初稿.rdf`
- format: Zotero RDF
- records parsed as `bib:Article`: `143`
- branch at intake: `main`
- HEAD snapshot at intake: `a932ec54cd39911f662b1239ed3b37302669727b`

## Parsing Notes

The root app RDF parser maps `dc:identifier` into the `doi` field.

For this dataset, that field is not consistently a true DOI field. It contains a mix of:

- DOI-like values
- DOI URLs
- CNKI article URLs
- PMC article URLs

That means the current dedup engine is not operating on a clean identifier layer in this file. It is often deduplicating on a URL-like surrogate field rather than a normalized scholarly identifier.

## Current-Logic Baseline

Using the current root `app.js` dedup behavior exactly as implemented:

- total records: `143`
- deduped count: `141`
- duplicate count: `2`
- duplicate rate: `1.4%`

Identifier mix in the parsed `doi` field:

- empty: `2`
- DOI-like: `58`
- URL-like: `83`
- other: `0`

Year availability:

- with year: `129`
- missing year: `14`

## Exact Duplicate Groups Found by Title Review

Even before full adjudication, the parsed dataset contains `4` title-exact duplicate groups:

1. `中医优势病种按疗效价值付费改革效果分析`
2. `Advances in difference-in-differences methods for policy evaluation research`
3. `中医优势病种支付方式改革关键问题及对策`
4. `An introduction to propensity score methods for reducing the effects of confounding in observational studies`

Current logic detects only `2` of those groups.

## Important Missed Groups

### Missed Group A

Title: `中医优势病种按疗效价值付费改革效果分析`

Observed pair:

- `https://doi.org/10.14055/j.cnki.33-1056/f.2025.04.018`
- `https://link.cnki.net/doi/10.14055/j.cnki.33-1056/f.2025.04.018`

Same title, same year, same pages, same underlying DOI payload.

Current result:

- not detected as duplicate

Interpretation:

- direct evidence that DOI normalization is insufficient for real Chinese workflow exports

### Missed Group B

Title: `中医优势病种支付方式改革关键问题及对策`

Observed pair:

- `https://kns.cnki.net/KCMS/detail/detail.aspx?...`
- `https://link.cnki.net/urlid/23.1042.F.20241226.1644.002`

Same title, same year, same pages.

Current result:

- not detected as duplicate

Interpretation:

- direct evidence that the current DOI-first short-circuit misses likely duplicates when identifier strings differ across platforms

## Detected Groups

### Detected Group A

Title: `Advances in difference-in-differences methods for policy evaluation research`

Reason detected:

- exact same URL-like identifier in both records

### Detected Group B

Title: `An introduction to propensity score methods for reducing the effects of confounding in observational studies`

Reason detected:

- exact same DOI URL in both records

## Preliminary Assessment

This real dataset supports the same direction suggested by the synthetic readout:

- current logic is conservative
- current logic is explainable
- current logic misses real duplicate cases when identifier representations differ
- Chinese workflow exports are a meaningful stress case for normalization quality

## What This Means for Phase 1

This dataset does not prove the final redesign level by itself, but it does provide concrete real-world evidence for at least two benchmark concerns:

1. DOI normalization gaps are not theoretical; they are already present in real user data.
2. The current DOI-first short-circuit is too rigid for real mixed-source scholarly exports.

## Recommended Next Step

Add manual gold labels for the repeated-title groups in this dataset, then score this real dataset alongside the synthetic suite in the evaluation report.

## Improvement Delta on This Real Dataset

To estimate how much of the gap is caused by small normalization fixes versus structural dedup redesign, the same dataset was re-scored with two simplified hypothetical variants.

### Variant A: Identifier normalization only

Changes simulated:

- normalize `doi.org/...` to raw DOI
- normalize `link.cnki.net/doi/...` to raw DOI
- keep the current DOI-first short-circuit

Result:

- current duplicates: `2`
- Variant A duplicates: `3`

Interpretation:

- identifier normalization alone recovers one real duplicate group in this dataset
- this is worth doing, but it does not solve the broader recall gap

### Variant B: Identifier normalization plus title-level candidate handling

Changes simulated:

- same normalization as Variant A
- allow title-level duplicate capture even when identifier representations differ

Result:

- current duplicates: `2`
- Variant B duplicates: `4`

Interpretation:

- a two-layer or candidate-aware dedup approach recovers the full set of exact-title duplicate groups visible in this real file
- this suggests the current short-circuit design is part of the problem, not only identifier normalization
