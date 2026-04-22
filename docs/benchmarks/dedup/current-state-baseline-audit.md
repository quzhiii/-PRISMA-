# Current-State Dedup Baseline Audit

This audit describes the deduplication behavior that exists in the repository before any benchmark run or redesign work.

## Evaluation Target Note

This repository currently contains more than one active code path and also has local uncommitted changes in the working tree. Before scoring, choose one frozen target:

- root app baseline
- `literature-screening-v2.0` baseline

Do not benchmark against a moving target.

## Code Paths Reviewed

- `app.js`
- `v1.7-core-patch.js`
- `parser-worker.js`
- `literature-screening-v2.0/app.js`
- `literature-screening-v2.0/v1.7-core-patch.js`
- `literature-screening-v2.0/parser-worker.js`

## Baseline Findings

### 1. Primary dedup behavior is conservative and exact-match heavy

In the primary app flow, the current logic deduplicates by:

- exact DOI equality
- exact equality of normalized title

Relevant locations:

- `app.js:2355`
- `app.js:2373`
- `app.js:2387`
- `literature-screening-v2.0/app.js:2546`
- `literature-screening-v2.0/app.js:2564`
- `literature-screening-v2.0/app.js:2578`

Impact:

- high explainability
- low implementation complexity
- likely lower recall on noisy cross-database metadata

### 2. The code comments overstate the actual matching logic

The main app file comments mention "Jaccard similarity for fuzzy matching", but the implementation is a direct set membership check on normalized title strings.

Relevant locations:

- `app.js:2387`
- `literature-screening-v2.0/app.js:2578`

Impact:

- product behavior is stricter than the comments imply
- users may assume more flexible matching than the code actually performs

### 3. DOI normalization exists elsewhere but is not applied to main dedup

There is a `normalizeDoi()` helper used for outbound full-text links, but the primary dedup path uses raw lowercase trimmed DOI strings.

Relevant locations:

- `app.js:2375`
- `app.js:4100`
- `literature-screening-v2.0/app.js:2566`
- `literature-screening-v2.0/app.js:4324`

Impact:

- `10.xxxx/...` vs. `https://doi.org/10.xxxx/...` can diverge in dedup behavior
- this is a likely source of missed duplicates

### 4. Quick/export dedup duplicates the logic in a separate implementation

The v1.7 patch implements its own quick-stats and export-only dedup flow using the same high-level rules, but as a separate code path.

Relevant locations:

- `v1.7-core-patch.js:338`
- `v1.7-core-patch.js:385`
- `literature-screening-v2.0/v1.7-core-patch.js:379`
- `literature-screening-v2.0/v1.7-core-patch.js:426`

Impact:

- logic drift risk
- fixes may need to be repeated in multiple files
- benchmark results can become ambiguous if these paths diverge further

### 5. Worker fallback logic does not match the primary app logic

`parser-worker.js` defines a different fallback dedupe key:

- exact normalized DOI if present
- else `year + first author + first 20 chars of normalized title`
- else `title prefix`

Relevant locations:

- `parser-worker.js:179`
- `parser-worker.js:184`
- `parser-worker.js:192`
- `parser-worker.js:204`
- `parser-worker.js:211`
- same mirrored structure in `literature-screening-v2.0/parser-worker.js`

Impact:

- internal inconsistency
- possible mismatch between large-file worker assumptions and app-level dedup results
- benchmark scope must explicitly choose which path counts as the scored engine

### 6. Current logic does not model publication type as a safety boundary

The current dedup paths do not use publication type or a structured ambiguity layer when deciding whether similar records should be removed.

Impact:

- risk of over-merging edge cases such as protocol vs. final article or abstract vs. final article when title similarity is high
- no native candidate-review queue for ambiguous duplicates

## Baseline Assessment

The current state is best described as:

- conservative for exact duplicates
- underpowered for near-duplicate discovery
- internally inconsistent across code paths
- easy to explain, but not yet research-grade as a full dedup workflow

## Pre-Benchmark Recommendation

Before scoring:

1. choose one code path as the official benchmark target
2. freeze it
3. document the exact commit or snapshot
4. evaluate auto-delete safety and candidate recall separately

Do not use a mixed root/v2 result as the benchmark baseline.
