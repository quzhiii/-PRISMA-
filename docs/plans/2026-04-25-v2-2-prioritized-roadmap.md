# V2.2 Prioritized Roadmap

## Context

`V2.1` has now shipped on top of `literature-screening-v2.0/` with:

- a formal `Step 5: 质量评价`
- a first `quality-engine.js`
- `import-job-runtime.js`
- incremental worker parsing for common formats
- regression coverage for quality and parser chunk boundaries

Current code hotspots:

- import entry: [literature-screening-v2.0/app.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/app.js#L1649)
- parse orchestration: [literature-screening-v2.0/app.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/app.js#L1432)
- quality queue shell: [literature-screening-v2.0/app.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/app.js#L431)
- quality engine: [literature-screening-v2.0/quality-engine.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/quality-engine.js#L93)

What is already true on current `main`:

- the README benchmark-link problem is effectively closed
- the main UI is wired to `handleMultipleFilesV15`, not the older `handleMultipleFiles`
- common formats (`csv / tsv / ris / nbib / enw`) do use incremental worker parsing first

What is still strategically incomplete:

- import still has fallback paths that can return to whole-file parsing on worker failure
- `bib / bibtex / rdf` are not yet on the same incremental path
- `app.js` remains too large and owns too many concerns
- quality evaluation is usable, but still shallow relative to a full review workflow

---

## Recommendation

Recommend a `stability-first V2.1.1 -> modular V2.2` path.

Do **not** jump straight into broader quality-evaluation scope first.

Reason:

1. import remains the highest operational risk and the easiest way to recreate the user complaint of "一直卡住"
2. quality evaluation already exists as a visible workflow step, so the bigger product risk is now trust and reliability, not feature absence
3. the next feature wave will be cheaper if shared record normalization and controller boundaries are fixed first

Alternatives considered:

### Option A: Quality-depth first

Pros:

- more visible new features
- stronger academic value proposition

Cons:

- keeps the biggest runtime risk in place
- increases complexity inside an already oversized `app.js`

### Option B: Stability first, then depth

Pros:

- reduces real user pain first
- creates cleaner foundations for V2.2
- lowers regression risk for later quality/export work

Cons:

- first milestone looks less flashy

### Option C: Rewrite around a new workspace

Pros:

- cleanest architecture

Cons:

- high migration cost
- duplicates workflow and persistence logic
- not justified yet

Recommended option: `Option B`.

---

## Priority Order

### P0: Import Hardening Release (`V2.1.1`)

This is the next most necessary work.

#### Goals

- no user-visible "stuck" state during import
- no silent regression from incremental parsing back to whole-file main-thread parsing for supported formats
- explicit failure modes for unsupported or degraded paths

#### TODO

- retire or redirect the older `handleMultipleFiles` path so only one import orchestrator remains active
- centralize import cleanup in one finalizer so `loading/progress/job state` are always closed consistently
- for supported incremental formats, treat worker failure as an error or controlled retry path instead of silently falling back to `parseFileContent(...)` on the main thread
- widen incremental coverage from `csv / tsv / ris / nbib / enw` to `bib / bibtex`
- define `rdf/xml` strategy explicitly:
  - small file: current fallback acceptable
  - large file: warn and use a dedicated streaming path or block with a clear message
- add import-stage smoke tests for:
  - worker failure
  - malformed chunk boundary
  - cancel/retry
  - finalize-UI error handling

#### Files Most Likely Touched

- [literature-screening-v2.0/app.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/app.js#L1432)
- [literature-screening-v2.0/parser-worker.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/parser-worker.js)
- [literature-screening-v2.0/streaming-parser.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/streaming-parser.js)
- [literature-screening-v2.0/import-job-runtime.js](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/literature-screening-v2.0/import-job-runtime.js#L30)
- [tests/import/parser-chunk-boundary.test.mjs](/E:/BaiduSyncdisk/koni电脑/创业/easy-paper/comet/tests/import/parser-chunk-boundary.test.mjs)

#### Exit Criteria

- supported incremental formats never block the main thread with whole-file parse fallback
- import overlay always closes correctly on success and failure
- staged progress remains accurate when parser or UI finalization fails

### P1: Shared Record-Normalization Layer

The alias bug fixed in `quality-engine.js` is a symptom of duplicated normalization logic.

#### Goals

- one canonical way to read `title / abstract / keywords / type / doi / authors`
- shared behavior across import, screening, quality, export, and detail modal

#### TODO

- extract a small pure module such as `record-normalizer.js`
- move field-alias resolution out of `app.js`
- make `quality-engine.js`, worker normalization, export, and UI detail views all use the same resolver
- add fixtures covering `TI/T1`, `AB/N2`, `KW/OT`, `TY/PT/z:itemType`, `DO/DOI`

#### Why This Matters Now

- prevents another class of "queue looks wrong but data is actually present" bugs
- reduces the cost of adding more study-design and export rules

### P1: `app.js` Controller Split

`app.js` is now roughly the operational center for import, screening, review, quality, export, and session logic.

#### TODO

- split import orchestration into `import-controller.js`
- split quality queue and form rendering into `quality-controller.js`
- split export builders into `export-controller.js` or `export-quality.js`
- keep DOM wiring in one thin composition layer

#### Rule

Do not do a broad rewrite. Extract by workflow boundary and keep behavior stable.

### P2: Quality Evaluation Depth (`V2.2`)

After import hardening and normalization cleanup, expand the actual quality workflow.

#### TODO

- move from shell-level tool suggestion to tool-specific domain forms
- make evidence adjustment explicit for:
  - risk of bias
  - inconsistency
  - indirectness
  - imprecision
  - publication bias / reviewer caution
- persist rationale strings per downgrade
- add project-level summary views:
  - by study design
  - by tool family
  - by final evidence level
- add richer exports:
  - per-study quality table
  - evidence summary appendix
  - manuscript-friendly summary text

#### Recommended First Coverage

- complete Tier 1 depth before broadening more families
- after that, add:
  - non-randomized intervention
  - case report / case series handling improvements

### P3: Reviewer Productivity

This becomes valuable after the data model stabilizes.

#### TODO

- queue filters: incomplete / overridden / high-risk / by tool family
- keyboard shortcuts for quality completion
- unresolved-item badges before export
- dual-review visibility for quality disagreements
- quick summary cards for manuscript drafting

---

## Target Delivery Sequence

### Milestone 1: `V2.1.1 Import Hardening`

Ship:

- single import entry path
- stronger cleanup guarantees
- no silent main-thread fallback for supported formats
- extra import regression tests

### Milestone 2: `V2.1.2 Normalization + Controller Extraction`

Ship:

- shared record normalizer
- slimmer import and quality boundaries
- lower coupling inside `app.js`

### Milestone 3: `V2.2 Quality Depth`

Ship:

- tool-specific quality forms
- explicit evidence downgrade model
- richer quality exports

### Milestone 4: `V2.2 Reviewer Productivity`

Ship:

- queue filters
- completion dashboards
- disagreement and override workflows

---

## Architecture Direction

Keep the current browser-local model.

Recommended shape:

```text
File input
  -> import-controller
  -> parser worker / streaming parser
  -> shared record normalizer
  -> IndexedDB writer / import job runtime
  -> screening + review state
  -> quality-controller
  -> export-controller
```

Key architectural rule:

`quality`, `import`, and `export` should share normalized record access, but should not share each other's UI state.

---

## Risks And Mitigations

### Risk: Another partial streaming implementation

Mitigation:

- define which formats are truly incremental
- fail loudly when a supported worker path breaks
- do not market unsupported formats as equivalent

### Risk: New quality features reintroduce field-alias bugs

Mitigation:

- shared record normalizer
- fixture-driven tests using real alias variants

### Risk: `app.js` keeps absorbing new code

Mitigation:

- require new workflow code to land in extracted controller/module files first

---

## Concrete Next Action

If only one thing is started next, it should be:

`V2.1.1 import hardening`

That is the highest-value next iteration because it reduces current runtime risk, aligns with the earlier user feedback about the page appearing stuck, and makes later V2.2 quality work safer to ship.
