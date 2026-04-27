<div align="center">

# PRISMA Literature Screening Assistant

**A practical end-to-end literature screening workspace for systematic reviews, meta-analyses, and evidence synthesis**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-V2.1-brightgreen.svg)](https://quzhiii.github.io/-PRISMA-/)
[![GitHub Pages](https://img.shields.io/badge/Demo-Live-orange.svg)](https://quzhiii.github.io/-PRISMA-/)
[![Scale](https://img.shields.io/badge/Scale-30%2C000%2B-purple.svg)](https://quzhiii.github.io/-PRISMA-/)

English | [简体中文](./README.md)

[Live Demo](https://quzhiii.github.io/-PRISMA-/) · [Issues](https://github.com/quzhiii/-PRISMA-/issues) · [Version History](#version-history)

> From literature import and deduplication to rule-based screening, manual review,
> and PRISMA 2020 export, the workflow runs locally in the browser by default.

</div>

---

## Why V2.1

`V2.1` is not a ground-up rewrite. It is the formal next release on top of the stable `V2.0` homepage / login / workspace architecture, and it closes two gaps that were already visible in real use: quality assessment / evidence grading and true incremental parsing for common formats.

- the workflow expands from 5 steps to 6, with quality assessment before final export
- `CSV / TSV / RIS / NBIB / ENW` move to Worker-based incremental parsing to reduce the “large import feels frozen” problem
- a quality queue now carries study-design suggestions, tool-family suggestions, and evidence-level baselines
- the published GitHub Pages path remains `literature-screening-v2.0/` so existing links and bookmarks do not break

GitHub Pages now publishes `V2.1` by default. The old `v1.7` page remains available only as a historical version.

`V2.2` is now progressing in the isolated `literature-screening-v2.2/` workspace, without replacing the published `V2.1` path. This iteration adds a local audit log, project manifest, durable screening decisions, and audit-package exports. PRISMA counts can be recalculated from `ScreeningDecision` and `AuditEvent` data. AI mode remains `off` by default, and all audit exports are generated locally in the browser.

---

## What This Tool Solves

| Common problem | What V2.1 does |
|------|------|
| Large libraries slow down or appear stuck | Enables Worker-based incremental parsing for `CSV / TSV / RIS / NBIB / ENW` to reduce long main-thread stalls |
| Automatic deduplication feels risky and opaque | Uses a two-layer model: `hard duplicates` for safe auto-removal, `candidate duplicates` for human review |
| Dual-review collaboration can overwrite or conflict | Stabilizes reviewer roles, shared project state, and logout cleanup |
| Included studies still need a separate quality/evidence workflow | Adds a quality queue with study-design, tool-family, and baseline evidence tracking |
| Full-text review shows incomplete abstracts and English content still needs manual translation | Improves multiline abstract parsing and adds `Translate this record` in the review modal |
| Upload succeeds but the workspace does not show the loaded content | Fixes upload display, scrolling, step progression, and page visibility issues |
| English entry paths are inconsistent | Fixes English homepage, dual-review routing, and page visibility behavior |
| Final reporting still needs PRISMA artifacts | Supports PRISMA 2020 SVG export and detailed result export |

---

## V2.1 Release Highlights

### 1. The full six-step workflow is now explicit

- dedicated homepage, login page, and workspace
- clearer split between single-review and dual-review access
- `Step 5` is now quality assessment / evidence setup
- `Step 6` is the final export stage

### 2. Common-format import is now genuinely incremental in the background

- `CSV / TSV / RIS / NBIB / ENW` are parsed chunk-by-chunk in a Worker
- import jobs now expose stage, byte progress, and parsed-record counts
- `BibTeX / RDF / TXT` still use the fallback whole-file path for now

### 3. Quality assessment and evidence grading enter the main workflow

- included studies can be turned into a quality queue inside the workspace
- the app now seeds study-design suggestions, tool-family suggestions, and evidence baselines
- project-level persistence is already wired so domain-level forms can extend real records later

### 4. Conservative and explainable deduplication remains intact

`V2.1` keeps the standalone [`dedup-engine.js`](./dedup-engine.js) model and does not reframe this release as a more aggressive dedup pass:

```text
Layer 1: Hard duplicates
Removed automatically under stricter evidence rules

Layer 2: Candidate duplicates
Surfaced for human review instead of silent auto-removal
```

The goal is not "delete as much as possible automatically." The goal is a safer workflow for research use.

### 5. Large-scale capacity is preserved while usability improves

- still supports `30,000+` records
- upload display and page scrolling are more stable
- sample import, real-file upload, and step progression are connected correctly
- dual-review initialization and logout cleanup are fixed

### 6. Public docs and bilingual entry paths are now aligned

- GitHub Pages root opens `V2.1` by default
- the English homepage now routes dual-review users to the English login page
- README, workflow steps, and benchmark references now use one consistent release story

---

## Abstract And Review Modal Updates (2026-04)

- The full-text review modal now prefers inline translation for a single record, and automatically falls back to a new-tab translation flow if inline translation is unavailable
- The modal layout was tightened so long abstracts and long translations remain scrollable while the close button and action area stay visible
- Clicking the empty overlay outside the modal now closes the modal directly
- CNKI RDF abstract tail noise such as `AbstractFilter(...)`, `More`, and `Reset` is cleaned during display and parsing
- When the upstream data source already provides a truncated abstract, the list view and modal now show an explicit `Source abstract may be truncated` hint
- These truncated abstracts are treated as source limitations from the database or export itself; the tool marks them, but does not fabricate missing abstract text

---

## Core Capabilities

### Multi-format import

Supports `CSV / TSV / RIS / ENW / BibTeX / RDF / TXT / NBIB`, including mixed-source uploads in the same workflow.

### Two-layer deduplication

- hard duplicates can be auto-removed
- likely duplicates are routed to a manual-review queue
- better aligned with conservative research workflows

### Rule-based screening

- language filters
- publication year range
- inclusion / exclusion keywords
- title / author / journal conditions
- rule reruns connected to later review steps

### Single-review and dual-review workflows

- supports solo screening
- supports main-reviewer / secondary-reviewer collaboration
- shared project state is more stable
- the full-text review modal supports full abstract viewing and `Translate this record`

### Quality assessment / evidence grading

- seeds a quality queue for included studies
- suggests study design and tool family
- records baseline evidence levels before final export

### PRISMA 2020 export

- PRISMA 2020 flow diagram export
- detailed result export
- better suited for documentation and submission preparation

---

## Standard Workflow

```text
Step 1  Import literature
        Multi-file, multi-format import with automatic cross-source deduplication

Step 2  Configure screening rules
        Language / year / keywords / journal filters

Step 3  Automatic screening
        Review included records and rerun after rule updates

Step 4  Manual review
        Use shortcuts 1-6 for exclusion reasons, with auto-saved progress

Step 5  Quality assessment
        Prepare the quality queue and confirm study design, tool family, and evidence baseline

Step 6  Export
        PRISMA 2020 flow diagram and detailed report
```

---

## Performance Benchmarks

| Operation | Data volume | Time | Notes |
|------|------|------|------|
| Import to IndexedDB | 30,000 records | ~3-5s | Batch insert, 500 per batch |
| Paginated query | 100 records | ~213ms | Indexed query |
| Virtual list render | 30,000 records | ~16ms/frame | Stable scrolling |
| Common-format import (V2.1) | CSV / TSV / RIS / NBIB / ENW | Incremental background parsing | Worker chunks reduce long UI stalls |
| Deduplication (V2.1) | Full set | Background execution | Web Worker, no UI blocking |

---

## V2.1 vs V2.0

| Dimension | V2.0 | V2.1 |
|------|------|------|
| Workflow | 5 steps ending at export | 6 steps with quality assessment before export |
| Import parsing | Smart import still behaved like whole-file parsing | Common formats use true Worker-based incremental parsing |
| Quality / evidence | Outside the main workflow | Built into the main workflow as a seeded queue |
| Import observability | Mostly “upload finished” feedback | Explicit job stage, byte progress, and parsed counts |
| Public docs | README and repo evidence links could drift | README, workflow, and benchmark references are aligned |
| Current role | Previous main release | Current formal release |

---

## Existing Benchmarks and Objective Change

The numbers below come from [`docs/benchmarks/dedup/post-implementation-benchmark-report.md`](./docs/benchmarks/dedup/post-implementation-benchmark-report.md) and mainly cover the `V2.0` dedup baseline. `V2.1` keeps that conservative dedup strategy and layers the new workflow/import changes on top.

| Metric | v1.7 | V2.0 | Meaning |
|------|------|------|------|
| Auto-delete precision | `1.000` | `1.000` | Preserves the conservative zero-false-auto-delete policy |
| Combined duplicate-like recall | `0.583` | `0.917` | Better discovery of true duplicates and near-duplicates |
| Combined Candidate F1 | `0.737` | `0.957` | Higher quality candidate-review output |
| Real RDF hard recall | `0.667` | `1.000` | Recovers more duplicate groups on real exported data |
| Real RDF candidate pairs | `0` | `1` | Explicitly surfaces one more manual-review case |

### Performance vs efficiency

- `V2.1` now adds true incremental parsing on the common import path, but there is not yet a cross-device benchmark number that should be overclaimed
- The gain in this round is still mainly correctness, stability, explainability, and workflow completeness
- In practice, the bigger improvement is that the formal review flow is more complete, not just faster

---

## Technical Architecture

```text
index.html / workspace.html   -> UI layer
app.js                        -> Logic layer
db-worker.js                  -> IndexedDB data layer
parser-worker.js              -> Multi-format parsing and background message layer
streaming-parser.js           -> Incremental parsing state machines
quality-engine.js             -> Quality / evidence baseline engine
import-job-runtime.js         -> Import job lifecycle and persistence
dedup-engine.js               -> Conservative dedup engine
virtual-list.js               -> Large-list rendering
```

### Core Modules

| Module | Responsibility |
|------|------|
| `dedup-engine.js` | Standalone dedup engine for hard and candidate duplicate output |
| `db-worker.js` | IndexedDB CRUD, batch insert, paginated query, transaction handling |
| `parser-worker.js` | Multi-format parsing, DOI / title normalization, and background orchestration |
| `streaming-parser.js` | Incremental parsing for `CSV / TSV / RIS / NBIB / ENW` |
| `quality-engine.js` | Study-design suggestion, tool-family suggestion, and evidence baselines |
| `import-job-runtime.js` | Import-job stage tracking, progress, and project persistence |
| `virtual-list.js` | Virtual scrolling that renders only the visible area |
| `app.js` | Main flow control, rule engine, export, and state management |

---

## Version History

<details>
<summary><b>V2.1 (current formal release, 2026-04)</b></summary>

- expands the workflow to 6 steps with quality assessment before export
- moves `CSV / TSV / RIS / NBIB / ENW` to Worker-based incremental parsing
- adds `quality-engine.js`, `import-job-runtime.js`, and `streaming-parser.js`
- persists import-job state and the quality queue at project level
- aligns README, workflow messaging, and benchmark references with the shipped repo state
- keeps the `literature-screening-v2.0/` path for GitHub Pages compatibility

</details>

<details>
<summary><b>V2.0 (previous main release, 2026-03)</b></summary>

- added a dedicated homepage, login page, and workspace structure
- added the standalone `dedup-engine.js` deduplication engine
- changed deduplication to `hard duplicate auto-removal + candidate duplicate review`
- fixed CSV / TSV multiline abstract parsing to reduce "only the first sentence is shown"
- added `Translate this record` in the full-text review modal for title and abstract translation
- fixed uploads that succeeded but did not display loaded results, scrolling failures, and broken step progression
- fixed dual-review shared-state conflicts and logout cleanup
- fixed English entry paths, language routing, and page visibility issues
- switched the GitHub Pages default entry to `V2.0`

</details>

<details>
<summary><b>v1.7.x (stable maintenance version, 2026-03)</b></summary>

- completed PubMed `.nbib` import support
- fixed single / dual review session wiring
- fixed post-dedup progression into later steps
- regression entry remains: `tests/run-all-regressions.js`

</details>

<details>
<summary><b>v1.5-v1.6 (large-scale processing foundation)</b></summary>

- IndexedDB data layer
- Web Worker background processing
- virtual scrolling
- large-scale literature handling pipeline

</details>

---

## Contributing

Issues and Pull Requests are welcome.

```bash
git checkout -b feature/your-feature
git commit -m "feat: describe your change"
git push origin feature/your-feature
```

---

## License

[MIT License](./LICENSE)

---

<div align="center">

If this tool helps your research, a Star is welcome.

</div>
