# V2.1 Iteration Roadmap

## Related Docs

- Design: [2026-04-22-quality-evaluation-and-streaming-import-design.md](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/docs/plans/2026-04-22-quality-evaluation-and-streaming-import-design.md)
- Implementation plan: [2026-04-22-v2-1-implementation-plan.md](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/docs/plans/2026-04-22-v2-1-implementation-plan.md)

## Objective

Turn `literature-screening-v2.0/` from a stable screening workspace into a more complete evidence-synthesis workstation.

V2.1 focuses on two product gaps:

1. `质量评价 / 证据等级评估` is not yet a formal workflow
2. current import is more resilient than before, but still not a true streaming/background pipeline

This roadmap assumes:

- V2.0 remains the main product line
- work continues in-browser with local-first processing
- V2.1 should ship in vertical slices, not as one large rewrite

## Current Baseline

What V2.0 already has:

- multi-format import
- conservative two-layer dedup
- single/dual review workflow
- local persistence and export
- benchmarked dedup assets now included in the repo

What V2.0 still lacks:

- no explicit `quality assessment` step in the workflow
- no formal evidence-level model
- no structured bias-domain capture per included study
- no true chunk-boundary parser state machine
- no `reader -> parser worker -> writer queue` streaming pipeline

## Approach Options

### Option A: Quality-first, import later

Build `质量评价` first, keep import architecture mostly unchanged for now.

Pros:

- faster user-visible feature gain
- easier to demo to researchers

Cons:

- import bottlenecks remain
- architecture debt survives into the quality step
- large-file UX still looks fragile

### Option B: Foundation + vertical delivery

First establish shared runtime foundations for import jobs and quality data, then ship user-facing slices on top.

Pros:

- lower rework
- enables both major V2.1 themes
- best fit for iterative delivery

Cons:

- first milestone is more infrastructure-heavy

### Option C: Separate V3 workspace

Move V2.1 concepts into a new product directory.

Pros:

- cleanest architecture

Cons:

- migration cost too high now
- duplicates UI and persistence work
- slows real delivery

## Recommendation

Recommend `Option B`.

Reason:

- V2.1 needs both a new evaluation workflow and a new runtime pipeline
- these two tracks touch shared state, persistence, export, and job progress
- doing them incrementally on top of V2.0 is cheaper than starting a new V3

Recommended V2.1 framing:

- `Track A`: quality evaluation + evidence-level engine
- `Track B`: true streaming import runtime
- `Shared`: data model, progress bus, export extensions, test harness

## V2.1 Product Scope

### Track A: Quality Evaluation / Evidence Level

Insert a new step after full-text review:

```text
Step 1 导入
Step 2 标准
Step 3 初筛
Step 4 全文复核
Step 5 质量评价
Step 6 导出
```

Each included study should support:

- `study_design`
- `risk_of_bias.tool_family`
- `risk_of_bias.domain_scores`
- `risk_of_bias.overall`
- `evidence_level.initial`
- `evidence_level.adjustments`
- `evidence_level.final`
- `reviewer_notes`

### Recommended first-release coverage

#### Tier 1

- RCT: `RoB 2 lite`
- Systematic review / meta-analysis: `AMSTAR 2 lite`
- Cohort / case-control / cross-sectional: `JBI/NOS-lite`

#### Tier 2

- Non-randomized intervention: `ROBINS-I lite`
- Case report / case series: explicit low-evidence handling

Why tiered coverage:

- it avoids blocking V2.1 on every study type
- it still covers the most common evidence-synthesis scenarios
- it keeps scoring explainable

### Evidence-Level Engine

Do not infer evidence level from one keyword or one study-design label alone.

Use a two-stage model:

```text
Initial evidence level
  determined by study design family

Adjusted evidence level
  modified by:
    - risk of bias
    - inconsistency
    - indirectness
    - imprecision
    - publication bias / reviewer caution

Final evidence level
  = adjusted level + reviewer override if needed
```

Initial mapping:

- systematic review / meta-analysis of strong trials -> `high`
- RCT -> `high`
- cohort / case-control -> `low`
- cross-sectional -> `low`
- case series / case report -> `very low`

Downgrade rules should be explicit and auditable.

### User Experience

Step 5 UI should have three panes:

- left: included-study queue and completion status
- center: domain checklist form
- right: evidence summary card with rationale

User actions:

- accept or correct auto-detected study design
- complete bias-domain questions
- accept or override suggested evidence level
- mark assessment complete

### Export Scope

V2.1 exports should add:

- per-study quality table
- evidence summary table
- CSV appendix
- manuscript-friendly summary sheet

## Track B: True Streaming Import

### Target Runtime

```text
File input
  -> chunk reader
  -> parser worker incremental state
  -> normalized record batches
  -> IndexedDB write queue
  -> dedup pre-processing / import summary
  -> UI progress bus
```

Key constraints:

- no full-file synchronous parsing on main thread
- chunk boundaries must not corrupt multi-line records
- progress must reflect real bytes and record counts
- import must support cancel and recover

### Parser Strategy

#### CSV / TSV

- quote-aware line buffer
- chunk carry-over for incomplete rows

#### RIS / NBIB / ENW

- tag-based record accumulator
- chunk carry-over for incomplete record delimiter

#### BibTeX

- brace-depth entry accumulator
- do not finalize an entry until braces are balanced

#### RDF / XML

- prefer SAX-style or token-stream parsing
- avoid building a full DOM for large exports

### Import Job Model

Represent import as an explicit job:

```text
import_job
  id
  project_id
  file_name
  file_size
  format
  stage
  bytes_read
  records_parsed
  records_written
  error
  started_at
  updated_at
```

Stages:

- `queued`
- `reading`
- `parsing`
- `normalizing`
- `writing`
- `dedup_prep`
- `completed`
- `failed`
- `cancelled`

### UX Changes

Replace the generic loading overlay with a job modal showing:

- current file
- stage
- bytes read
- records parsed
- records written
- estimated remaining time
- cancel / retry actions

For multi-file imports, show:

- per-file progress
- overall progress
- partial-success summary

## Shared Data Model

Add two persisted entities:

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

import_jobs
  id
  project_id
  file_name
  format
  stage
  bytes_read
  records_parsed
  records_written
  error
  updated_at
```

## Delivery Plan

### Iteration 1: Runtime Foundation

Goal:

- introduce import job state
- move parsing protocol fully behind worker messages
- add progress bus and structured import stages

Definition of done:

- import UI no longer relies on a single generic spinner
- worker protocol can report stage + byte progress
- regression tests cover chunk-boundary parsing basics

### Iteration 2: Quality Data Foundation

Goal:

- add quality-assessment persistence
- add study-design classification service
- add evidence-level engine skeleton

Definition of done:

- records can store quality state
- UI can render a placeholder Step 5
- export layer can consume evidence metadata even before the full form ships

### Iteration 3: Quality Evaluation MVP

Goal:

- ship Step 5 for Tier 1 study types
- enable evidence-level suggestion + manual override

Definition of done:

- researchers can complete quality assessment inside the app
- export includes quality/evidence tables
- unit tests cover downgrade/override logic

### Iteration 4: True Streaming Import MVP

Goal:

- replace whole-text parse path for at least CSV/TSV/RIS/NBIB/ENW
- add cancel/retry and partial recovery

Definition of done:

- 30k+ import stays responsive
- progress tracks real bytes/records
- malformed files fail gracefully with actionable errors

### Iteration 5: Coverage Expansion

Goal:

- extend quality tools to Tier 2 studies
- extend true streaming to BibTeX and RDF

Definition of done:

- non-randomized interventions and case reports are covered
- XML/RDF imports no longer depend on full-DOM parsing for large files

## Acceptance Criteria

### Quality Evaluation

- each included study can be assessed and marked complete
- final evidence level is explainable and exportable
- reviewer can override machine suggestion with notes
- export contains both study-level and summary-level outputs

### Streaming Import

- importing a large file does not freeze the main thread
- chunk boundaries do not corrupt parsed records
- progress is accurate enough for user trust
- failed imports provide resumable or retryable recovery paths

## Test Strategy

### Must-have tests

- chunk-boundary parser tests for every supported format
- import job lifecycle tests
- evidence downgrade/upgrade rule tests
- study-design classification tests
- export snapshot tests for quality tables

### Performance gates

- 30k synthetic import smoke
- real exported fixture import smoke
- UI responsiveness check during long import

## Non-Goals For V2.1

- no cloud backend
- no multi-project remote sync
- no fully automated GRADE narrative generation
- no full-text PDF extraction and auto-quality scoring

## Suggested Naming

User-facing naming should stay simple:

- `质量评价`
- `证据等级`
- `导入任务`
- `后台处理中`

Avoid exposing internal terms like `ROBINS-I lite` unless the user opens advanced details.

## Recommended Next Step

If implementation starts immediately, begin with:

1. import job state and worker protocol cleanup
2. Step 5 placeholder and quality-assessment schema
3. chunk-boundary parser tests

This gives V2.1 a stable foundation before adding more UI and export surface area.
