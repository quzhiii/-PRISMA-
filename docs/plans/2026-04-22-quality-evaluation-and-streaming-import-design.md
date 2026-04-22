# Quality Evaluation And Streaming Import Design

## Goal

Define the next V2.0 upgrade after the current stability fixes:

1. add a formal `质量评价 / 证据等级评估` workflow instead of only heuristic exclusion hints
2. replace pseudo-streaming import with a true chunked/background import pipeline

This design assumes `literature-screening-v2.0/` remains the main product line.

## Recommended Approach

Recommended path: `two-track upgrade inside one workspace`.

- Track A: add a structured quality-evaluation layer after initial screening and before final export
- Track B: rebuild import as `chunk reader -> parser worker -> normalized record stream -> IndexedDB batch writer`

Why this is the recommended option:

- it preserves the current user journey instead of forcing a full V3 rewrite
- it lets us ship quality evaluation independently from the import engine rewrite
- it keeps the current strengths of V2.0: browser-local processing, explainable dedup, and step-based workflow

Alternatives considered:

- Full rewrite in a separate `V3` directory: cleaner, but too much migration cost now
- Add quality evaluation only as export-time metadata: cheap, but not useful during review decisions
- Keep current import and only move parsing to worker: useful as a short-term patch, but still not true streaming

## Product Scope

### A. Quality Evaluation / Evidence Level

Introduce a new step between full-text review and export:

- `Step 5: 质量评价`
- `Step 6: 导出`

Each included study gets:

- study design classification
- risk-of-bias assessment
- evidence-level label
- reviewer notes
- confidence summary

Suggested first-release coverage:

- `RCT`: RoB 2 lite profile
- `Non-randomized intervention`: ROBINS-I lite profile
- `Systematic review / meta-analysis`: AMSTAR 2 lite profile
- `Observational cohort / case-control / cross-sectional`: JBI or NOS-lite profile
- `Case report / case series`: explicit low-evidence label, optional exclusion

Evidence level should not be inferred from one keyword alone. It should be computed from:

- study design
- risk-of-bias outcome
- directness
- consistency
- precision
- reviewer override

Output model:

```text
record
  -> study_design
  -> risk_of_bias.domain_scores[]
  -> risk_of_bias.overall
  -> evidence_level.initial
  -> evidence_level.adjusted
  -> evidence_level.final
  -> evidence_notes
```

### B. True Streaming Import

Target architecture:

```text
File/Blob
  -> chunk reader
  -> parser worker incremental state machine
  -> normalized record batches
  -> IndexedDB writer worker
  -> UI progress bus
```

Required properties:

- no full-file synchronous parse on the main thread
- no requirement to concatenate the whole file before parsing
- parse progress based on bytes and records, not only fake percentage
- recoverable checkpoints for large imports
- cancel/retry support per file

Parser strategy:

- `CSV/TSV/TXT`: line-buffer parser with quote-aware carry-over
- `RIS/NBIB/ENW`: record-buffer parser keyed by tag delimiters
- `BibTeX`: entry accumulator with brace-depth tracking
- `RDF/XML`: streaming SAX-style parser or chunk-safe tag collector

## UI / Workflow Changes

### Quality Evaluation

Add a dedicated panel after full-text review:

- left: study list and progress
- center: tool-specific domain checklist
- right: auto-generated rationale and final evidence level summary

User actions:

- mark domain judgments
- accept or override auto-suggested study design
- accept or override final evidence level
- export evidence table with PRISMA results

Exports should include:

- per-study quality table
- evidence summary table
- downloadable CSV
- optional manuscript-ready appendix sheet

### Import Experience

Replace the current generic overlay with a structured progress modal:

- reading file bytes
- parsing records
- normalizing fields
- writing batches
- dedup pre-processing

For large files, show:

- current file name
- bytes read
- records parsed
- batches written
- estimated remaining time

## Data Model

New persisted entities:

```text
quality_assessments
  id
  project_id
  record_id
  reviewer_id
  tool_family
  domain_scores_json
  overall_risk
  evidence_initial
  evidence_final
  notes
  updated_at

project_quality_summary
  project_id
  evidence_profile_json
  updated_at
```

## Testing Strategy

### Quality Evaluation

- deterministic unit tests for evidence-level downgrade rules
- fixtures for RCT, cohort, case-control, systematic review, case report
- export snapshot tests for evidence tables
- reviewer override tests

### Streaming Import

- chunk-boundary regression tests for each format
- malformed-file recovery tests
- 30k+ record smoke tests
- cancellation/resume tests
- UI progress state tests

## Delivery Order

1. stabilize current import flow with worker-backed parsing and guaranteed overlay cleanup
2. land chunk-boundary parser tests and a streaming parser protocol
3. add `质量评价` data model and persistence
4. add tool-specific quality forms and evidence-level engine
5. extend export with evidence tables and appendix outputs

## Open Assumptions

- the main target remains browser-local processing, not a server backend
- the first evidence engine release should be `lite`, explainable, and override-friendly
- quality evaluation is project-scoped and can be completed incrementally by reviewer
