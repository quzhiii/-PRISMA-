# V2.1 Implementation Plan

**Goal:** Deliver a pragmatic V2.1 upgrade for `literature-screening-v2.0/` that adds a real `质量评价 / 证据等级` workflow and replaces pseudo-streaming import with a true background parsing pipeline.

**Architecture:** Keep the current browser-local workspace, add explicit `quality assessment` and `import job` models, extract pure logic into testable engines, and ship in vertical slices instead of a V3 rewrite.

**Tech Stack:** Static HTML, vanilla JavaScript, Web Workers, IndexedDB/localStorage, Node 22 `node --test`, markdown fixtures and benchmark assets already present in `tests/` and `docs/benchmarks/`.

---

## Assumptions To Lock Before Coding

- The implementation target remains `literature-screening-v2.0/`; do not start a parallel `V3` directory.
- `质量评价` is a first-class workflow step, not an export-only appendix.
- `证据等级` is included in V2.1 scope and is computed from explicit rules plus reviewer override, not from one keyword heuristic.
- V2.1.0 covers `Tier 1` designs first, while keeping the schema extensible for `ROBINS-I lite` and broader study types later.
- The first streaming-import milestone must eliminate whole-file synchronous parsing on the main thread for `CSV/TSV/RIS/NBIB/ENW`.
- Existing workers in [db-worker.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/db-worker.js) and [parser-worker.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/parser-worker.js) remain the runtime foundation, but their protocol can change.
- Selective commits still apply: do not mix V2.1 planning or implementation changes with unrelated dirty working-tree files.

---

## Release Slices

### V2.1.0

Ship the first usable `质量评价` workflow plus streaming-import MVP for the most common formats.

Scope:

- `Step 5: 质量评价`
- `Step 6: 导出`
- `Tier 1` quality tools:
  - `RCT -> RoB 2 lite`
  - `Systematic review / meta-analysis -> AMSTAR 2 lite`
  - `Cohort / case-control / cross-sectional -> JBI/NOS-lite`
  - `Case report / case series -> light profile + explicit very-low evidence handling`
- evidence-level engine with manual override
- import jobs with real stage/progress reporting
- true streaming for `CSV/TSV/RIS/NBIB/ENW`

### V2.1.1

Extend coverage without reopening the V2.1.0 architecture.

Scope:

- `Non-randomized intervention -> ROBINS-I lite`
- BibTeX streaming parser
- richer project-level evidence summary exports
- better recovery flows for cancelled/failed imports

### V2.1.2

Finish the broader compatibility pass.

Scope:

- RDF/XML large-file handling without full-DOM dependency for normal cases
- expanded study-type mapping and advanced export tables
- quality-summary UX polish and reviewer productivity improvements

---

## Key Decisions

### Decision 1: Keep V2.0 as the product line

Reason:

- the user already has a working V2.0 workflow
- the current gap is capability depth, not product direction
- a V3 rewrite would delay both evidence evaluation and import stability

### Decision 2: Make `质量评价` a formal step

Reason:

- researchers need quality and evidence judgments before final export
- study-level quality state must be persistent and revisitable
- evidence tables should reflect in-app decisions, not export-time guesses

### Decision 3: Use an explainable evidence engine

Reason:

- evidence grading is review-sensitive and must stay auditable
- a baseline-plus-adjustment model is easier to test and easier to defend
- reviewer override is required for edge cases and protocol nuance

### Decision 4: Model import as an explicit job

Reason:

- progress, cancellation, retry, and recovery all become easier
- the current spinner-based flow hides which stage is actually slow
- job state gives the UI something real to display and persist

---

## Target Architecture

### Quality Assessment Flow

```text
record
  -> study design classifier
  -> tool-family selection
  -> domain checklist answers
  -> overall bias / quality result
  -> evidence initial level
  -> downgrade or caution adjustments
  -> final evidence level
  -> reviewer notes and override
```

### Streaming Import Flow

```text
File/Blob
  -> chunk reader in app thread
  -> parser worker incremental state machine
  -> normalized record batches
  -> IndexedDB write queue / db worker
  -> import job progress bus
  -> dedup pre-processing + import summary
```

### Persistence Additions

Add two persisted entities:

```text
quality_assessments
  id
  project_id
  record_id
  reviewer_id
  study_design
  tool_family
  domain_scores_json
  overall_risk
  evidence_initial
  evidence_adjustments_json
  evidence_final
  override_reason
  notes
  status
  updated_at

import_jobs
  id
  project_id
  file_name
  file_size
  format
  stage
  bytes_read
  records_parsed
  records_written
  checkpoint_json
  error
  started_at
  updated_at
```

---

## Workstreams

### Workstream A: Shared Quality Engine

Purpose:

- keep study-design classification, tool selection, and evidence grading out of the large UI file
- make the logic unit-testable and reusable across app and export code

Recommended module:

- Create `literature-screening-v2.0/quality-engine.js`

Responsibilities:

- classify study-design family from title, publication type, abstract, keywords, and existing metadata
- map family to tool profile
- compute `initial -> adjusted -> final` evidence levels
- keep downgrade reasons explicit
- enforce reviewer override rules

### Workstream B: Workflow / UI Shell

Purpose:

- insert a real `Step 5` and move export to `Step 6`
- expose progress and completion state to the user

Primary files:

- [workspace.html](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/workspace.html)
- [app.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/app.js)
- [style.css](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/style.css)

Responsibilities:

- add the step navigation and shell panels
- show queue, form, and summary panes
- show assessment completeness and unresolved override states
- replace generic import overlay with structured job modal

### Workstream C: Import Runtime

Purpose:

- replace pseudo-streaming with true incremental background parsing

Primary files:

- [app.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/app.js)
- [parser-worker.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/parser-worker.js)
- [db-worker.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/db-worker.js)

Responsibilities:

- chunk reading
- parser-worker protocol
- normalized record batching
- backpressure-aware write queue
- cancel/retry/resume state

### Workstream D: Export

Purpose:

- make quality and evidence judgments usable outside the UI

Primary files:

- [app.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/app.js)
- optional extraction target: `literature-screening-v2.0/export-quality.js`

Responsibilities:

- per-study quality table
- evidence summary table
- CSV appendix
- manuscript-ready summary sheet

### Workstream E: Test Harness

Purpose:

- prove correctness before UI polish

Primary files:

- [tests/run-all-regressions.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/tests/run-all-regressions.js)
- new `tests/quality/`
- new `tests/import/`
- existing `tests/fixtures/dedup/` and `docs/benchmarks/dedup/` as pattern references

---

## Milestone Plan

### Milestone 0: Freeze the V2.1 baseline and add test scaffolding

**Goal:** establish the regression harness before changing workflow or runtime behavior.

**Files:**

- Create: `tests/quality/evidence-engine.test.mjs`
- Create: `tests/quality/study-design-classifier.test.mjs`
- Create: `tests/import/import-job-state.test.mjs`
- Create: `tests/import/parser-chunk-boundary.test.mjs`
- Create: `tests/fixtures/quality/`
- Modify: [tests/run-all-regressions.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/tests/run-all-regressions.js)
- Inspect: [docs/benchmarks/dedup/post-implementation-benchmark-report.md](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/docs/benchmarks/dedup/post-implementation-benchmark-report.md)

**Steps:**

1. Write failing tests for evidence grading, study-design detection, import-job transitions, and chunk-boundary parsing.
2. Add representative fixtures for `RCT`, `systematic review`, `cohort`, `cross-sectional`, and `case report`.
3. Extend the regression runner so V2.1 suites can be run with one command.

**Definition of done:**

- the new test suites exist and fail for the missing behavior
- the repo has a stable place for V2.1 fixtures
- the team can run one command to verify both dedup and V2.1 regressions

### Milestone 1: Add workflow shell and persisted schema

**Goal:** create the empty but real V2.1 surfaces first, so later logic has a stable home.

**Files:**

- Modify: [workspace.html](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/workspace.html)
- Modify: [app.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/app.js)
- Modify: [db-worker.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/db-worker.js)
- Create: `literature-screening-v2.0/quality-engine.js`

**Steps:**

1. Move current export UI from `Step 5` to `Step 6`.
2. Add the `质量评价` step container and completion counters.
3. Add persistence helpers for `quality_assessments` and `import_jobs`.
4. Add feature flags such as `ENABLE_QUALITY_ASSESSMENT` and `ENABLE_STREAMING_IMPORT_V21` for staged rollout.

**Definition of done:**

- users can navigate to an empty Step 5 without breaking Step 6 export
- projects can store quality and import-job data
- the app can be rolled back to old behavior with a narrow flag if needed

### Milestone 2: Implement the shared quality engine

**Goal:** finish the pure rules engine before building the full form UX.

**Files:**

- Create: `literature-screening-v2.0/quality-engine.js`
- Modify: [app.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/app.js)
- Modify: `tests/quality/evidence-engine.test.mjs`
- Modify: `tests/quality/study-design-classifier.test.mjs`

**Steps:**

1. Define study-design families and tool-profile mapping.
2. Implement baseline evidence levels by family.
3. Add downgrade or caution dimensions:
   - risk of bias
   - inconsistency
   - indirectness
   - imprecision
   - publication-bias or reviewer caution
4. Require notes for manual override of suggested evidence level.
5. Keep every adjustment auditable as structured data.

**Definition of done:**

- Tier 1 families can be classified with reviewer confirmation
- evidence level is reproducible from structured inputs
- unit tests cover downgrade and override cases

### Milestone 3: Ship Step 5 quality-evaluation MVP

**Goal:** let researchers actually complete assessments inside the app.

**Files:**

- Modify: [workspace.html](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/workspace.html)
- Modify: [style.css](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/style.css)
- Modify: [app.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/app.js)
- Create: `tests/quality/quality-workflow-ui.test.mjs`

**Steps:**

1. Build the three-pane layout:
   - left: included-study queue and completion state
   - center: tool-specific checklist form
   - right: evidence summary card and rationale
2. Prefill study-design suggestion and tool-family recommendation.
3. Allow users to mark an assessment complete only when required fields are filled.
4. Surface unresolved overrides or missing notes clearly.

**Definition of done:**

- a user can assess included studies one by one
- Step 5 progress is visible and persistent
- the evidence-level card is explainable, not opaque

### Milestone 4: Extend export to quality and evidence outputs

**Goal:** make the new evaluation step useful in downstream review work.

**Files:**

- Modify: [app.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/app.js)
- Create: `tests/quality/export-quality-snapshot.test.mjs`

**Steps:**

1. Add study-level quality and evidence columns to export pipelines.
2. Generate a project-level evidence summary table.
3. Add a CSV appendix that preserves raw domain judgments, overall risk, evidence level, and notes.
4. Keep existing export outputs backward-compatible where fields are absent.

**Definition of done:**

- export contains both study-level and summary-level quality outputs
- blank projects still export cleanly
- snapshot tests lock the output shape

### Milestone 5: Add import-job model and structured progress UX

**Goal:** stop treating import as one opaque spinner.

**Files:**

- Modify: [workspace.html](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/workspace.html)
- Modify: [style.css](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/style.css)
- Modify: [app.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/app.js)
- Modify: [db-worker.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/db-worker.js)
- Modify: `tests/import/import-job-state.test.mjs`

**Steps:**

1. Represent each file import as a job with explicit stages:
   - `queued`
   - `reading`
   - `parsing`
   - `normalizing`
   - `writing`
   - `dedup_prep`
   - `completed`
   - `failed`
   - `cancelled`
2. Replace the generic loading overlay with a structured progress modal.
3. Show per-file and overall progress for multi-file imports.
4. Persist enough checkpoint data to recover or retry.

**Definition of done:**

- the UI shows real stage and count progress
- import failures no longer look like generic hanging
- users can cancel or retry without reloading the whole app

### Milestone 6: Implement true streaming parser MVP

**Goal:** remove whole-file string concatenation for the common text formats.

**Files:**

- Modify: [app.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/app.js)
- Modify: [parser-worker.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/parser-worker.js)
- Create: `tests/import/text-format-streaming.test.mjs`
- Modify: `tests/import/parser-chunk-boundary.test.mjs`

**Steps:**

1. Replace `allText` accumulation with chunk messages from app thread to parser worker.
2. Implement chunk-safe state machines for:
   - `CSV/TSV` with quote-aware row carry-over
   - `RIS/NBIB/ENW` with tag-based record carry-over
3. Emit normalized batches instead of one final monolithic record list.
4. Keep main-thread fallback only as an explicit emergency path behind a flag, not the default success path.

**Definition of done:**

- `CSV/TSV/RIS/NBIB/ENW` imports remain responsive on large files
- chunk boundaries do not corrupt records
- parser worker can report bytes read, records parsed, and batch count

### Milestone 7: Add batch writing, backpressure, and recovery

**Goal:** make streaming imports safe under large volumes instead of only fast on the parse side.

**Files:**

- Modify: [app.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/app.js)
- Modify: [db-worker.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/db-worker.js)
- Modify: [parser-worker.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/parser-worker.js)
- Create: `tests/import/import-cancel-resume.test.mjs`
- Create: `tests/import/import-backpressure.test.mjs`

**Steps:**

1. Write normalized batches to IndexedDB through a queue with explicit acknowledgements.
2. Pause parser emission when the write queue reaches a threshold.
3. Save checkpoints often enough to resume from the last safe boundary.
4. On failure, show actionable retry or partial-success messaging.

**Definition of done:**

- parser speed cannot outrun persistent writes indefinitely
- cancellation leaves the app in a recoverable state
- partial successes are visible and auditable

### Milestone 8: Coverage expansion and hardening

**Goal:** extend V2.1 without reopening core architecture choices.

**Files:**

- Modify: `literature-screening-v2.0/quality-engine.js`
- Modify: [parser-worker.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/parser-worker.js)
- Create: `tests/quality/robins-lite.test.mjs`
- Create: `tests/import/bibtex-rdf-streaming.test.mjs`

**Steps:**

1. Add `ROBINS-I lite` support for non-randomized interventions.
2. Add BibTeX brace-depth streaming support.
3. Add RDF/XML large-file handling that avoids full-DOM parsing for common import paths.
4. Improve project-level evidence summaries and export templates.

**Definition of done:**

- Tier 2 quality coverage is available
- BibTeX and RDF/XML have large-file-safe parsing paths
- V2.1 architecture still stays local-first and explainable

---

## Dependencies And Recommended Build Order

Build order:

1. Milestone 0
2. Milestone 1
3. Milestone 2
4. Milestone 5
5. Milestone 3
6. Milestone 4
7. Milestone 6
8. Milestone 7
9. Milestone 8

Why this order:

- test scaffolding must exist before behavior changes
- schema and workflow shell must land before UI and export can rely on them
- import-job protocol should be established before true streaming parser work
- the quality engine can be tested independently while import runtime work proceeds

If two people work in parallel:

- lane 1: Milestones 1 to 4
- lane 2: Milestones 5 to 8

Shared integration points:

- record schema
- persistence layer
- export contract
- regression runner

---

## Acceptance Criteria

### Quality Assessment

- each included study can be marked `not started`, `in progress`, or `completed`
- study design can be accepted or corrected by the reviewer
- each completed study has structured domain judgments and a final evidence level
- final evidence level includes rationale and supports override with notes
- export includes per-study and summary-level outputs

### Streaming Import

- large imports do not freeze the main thread
- parser progress reflects real bytes and record counts
- malformed files fail with actionable, format-specific errors
- cancellation and retry do not corrupt persisted records
- multi-file imports provide both per-file and overall progress

### Release Quality

- existing dedup behavior remains intact
- Step 6 export remains usable for legacy projects
- regression runner covers new V2.1 suites
- rollback flags exist for both quality workflow and streaming import

---

## Test Plan

### Unit Tests

- study-design classifier rules
- evidence downgrade and override logic
- tool-profile required-field validation
- import-job reducer or transition helpers
- parser chunk-boundary state machines

### Integration Tests

- Step 5 completion flow
- Step 6 export with quality metadata
- parser worker plus db worker handshake
- cancel, retry, and partial-success import flows

### Performance Gates

- `30k+` synthetic import smoke
- real export smoke using repo fixtures where possible
- browser responsiveness check during long import
- no regression against the dedup benchmark harness

### Manual QA

- import multiple mixed-format files
- cancel mid-import and retry
- complete Tier 1 assessments for a sample project
- override evidence level and verify export rationale

---

## Risk Register

### Risk 1: The monolithic `app.js` slows delivery

Mitigation:

- extract pure logic into `quality-engine.js`
- keep UI wiring in `app.js` only
- add tests around extracted engines first

### Risk 2: Study-design auto-detection will be noisy

Mitigation:

- keep classifier suggestions editable
- treat auto-detection as a default, not a lock
- require visible confidence or rationale text for ambiguous cases

### Risk 3: Streaming parser complexity varies sharply by format

Mitigation:

- ship text formats first
- keep `BibTeX` and `RDF/XML` in later slices
- gate fallback behavior with explicit config during rollout

### Risk 4: IndexedDB throughput becomes the real bottleneck

Mitigation:

- add write acknowledgements and backpressure thresholds
- measure parser and writer stages separately
- keep batch size configurable

### Risk 5: Export contracts sprawl

Mitigation:

- define one quality export shape early
- snapshot-test the output
- keep legacy exports backward-compatible until V2.1 is stable

---

## Rollback Strategy

- Guard Step 5 UI behind `ENABLE_QUALITY_ASSESSMENT`.
- Guard streaming parser path behind `ENABLE_STREAMING_IMPORT_V21`.
- Keep legacy export path available until V2.1.0 passes real-project QA.
- If streaming parser regresses on a specific format, disable only that format's streaming path rather than reverting the full import system.

---

## Recommended Next Coding Session

Start with the smallest slice that creates leverage for both tracks:

1. Add `tests/quality/` and `tests/import/` scaffolding.
2. Land workflow-shell changes so `Step 5` exists and export moves to `Step 6`.
3. Extract `quality-engine.js` with failing tests first.
4. Add import-job state and progress modal before changing parser internals.

That sequence gives V2.1 a stable frame before the riskier parser rewrite begins.
