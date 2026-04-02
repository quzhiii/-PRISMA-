<div align="center">

# PRISMA Literature Screening Assistant

**A practical end-to-end literature screening workspace for systematic reviews, meta-analyses, and evidence synthesis**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-V2.0-brightgreen.svg)](https://quzhiii.github.io/-PRISMA-/)
[![GitHub Pages](https://img.shields.io/badge/Demo-Live-orange.svg)](https://quzhiii.github.io/-PRISMA-/)
[![Scale](https://img.shields.io/badge/Scale-30%2C000%2B-purple.svg)](https://quzhiii.github.io/-PRISMA-/)

English | [简体中文](./README.md)

[Live Demo](https://quzhiii.github.io/-PRISMA-/) · [Issues](https://github.com/quzhiii/-PRISMA-/issues) · [Version History](#version-history)

> From literature import and deduplication to rule-based screening, manual review,  
> and PRISMA 2020 export, **the workflow runs locally in the browser by default**.

</div>

---

## Why V2.0

`V2.0` is not just a patch set on top of the old single-page tool. It reorganizes the product into a more realistic research workspace:

- clearer entry structure with a homepage, dual-review login, and workspace
- a more conservative deduplication model with automatic hard removal plus human-review candidates
- support for both single-review and formal dual-review workflows
- retained `30,000+` record handling capacity for practical project use

The default online entry now opens `V2.0`. The old `v1.7` page remains available only as a historical version.

---

## What This Tool Solves

| Common problem | What V2.0 does |
|------|------|
| Large libraries slow down or break browser-based tools | Retains the IndexedDB + Web Worker + virtual list architecture for large-scale handling |
| Automatic deduplication feels risky and opaque | Uses a two-layer model: `hard duplicates` for safe auto-removal, `candidate duplicates` for human review |
| Dual-review collaboration can overwrite or conflict | Stabilizes reviewer roles and shared project state |
| Full-text review shows incomplete abstracts and English content still needs manual translation | `V2.0` now handles multiline abstract parsing more robustly and adds `Translate this record` in the review modal |
| Upload succeeds but the workspace does not show the loaded content | Fixes upload display, step progression, scrolling, and page visibility issues |
| English entry paths are inconsistent | Fixes English homepage, dual-review routing, and visibility behavior |
| Final reporting still needs PRISMA artifacts | Supports PRISMA 2020 SVG export and result export for reporting |

---

## V2.0 Highlights

### 1. Closer to real review work, not just a single-page demo

- dedicated homepage, login page, and workspace
- clearer split between single-review and dual-review access
- better fit for an end-to-end screening flow from import to export

### 2. More conservative and explainable deduplication

`V2.0` extracts deduplication into a standalone [`dedup-engine.js`](./dedup-engine.js) module and uses a two-layer output:

```text
Layer 1: Hard duplicates
Removed automatically under stricter evidence rules

Layer 2: Candidate duplicates
Surfaced for human review instead of silent auto-removal
```

This means the goal is not "delete as much as possible automatically." The goal is a safer workflow for research use.

### 3. Large-scale capacity is preserved while usability improves

- still supports `30,000+` records
- upload display and page scrolling are more stable
- sample import, real-file upload, and step progression are now connected correctly
- dual-review project initialization and logout cleanup are fixed

### 4. Bilingual paths are now cleaner

- GitHub Pages root opens `V2.0` by default
- English homepage dual-review entry now goes to the English login page
- mixed-language rendering and visibility bugs on English pages are fixed

---

## Core Capabilities

### Multi-format import

Supports `CSV / TSV / RIS / ENW / BibTeX / RDF / TXT / NBIB`, including mixed-source uploads in the same workflow.

### Two-layer deduplication

- hard duplicates can be auto-removed
- likely duplicates are routed to a manual-review queue
- better aligned with a conservative research workflow

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
- full-text review modal supports full abstract viewing and `Translate this record`

### PRISMA 2020 export

- PRISMA 2020 flow diagram export
- result export for downstream reporting
- better suited for documentation and submission preparation

---

## Standard Workflow

```text
Step 1  Import literature
        Multi-file, multi-format import with automatic cross-source deduplication

Step 2  Configure screening rules
        Language / year / keywords / journal filters, reusable via YAML

Step 3  Automatic screening results
        Review included records and rerun after rule updates

Step 4  Manual review
        Use shortcuts 1-6 for exclusion reasons, with auto-saved progress

Step 5  Export
        PRISMA 2020 flow diagram (SVG) + detailed Excel report
```

---

## Performance Benchmarks

| Operation | Data volume | Time | Notes |
|------|------|------|------|
| Import to IndexedDB | 30,000 records | ~3-5s | Batch insert, 500 per batch |
| Paginated query | 100 records | ~213ms | Indexed query |
| Virtual list render | 30,000 records | ~16ms/frame | Stable 60fps |
| Deduplication (V2.0) | Full set | Background execution | Web Worker, no UI blocking |

---

## V2.0 vs v1.7

| Dimension | v1.7 | V2.0 |
|------|------|------|
| Default entry | Root opens the old single-page workspace | GitHub Pages opens the `V2.0` homepage |
| Page structure | Mostly a single-page tool | Separate homepage, login, and workspace |
| Dedup architecture | Inline page logic | Standalone `dedup-engine.js` module |
| Dedup output | Mostly one direct dedup result | Hard duplicate auto-removal + candidate review |
| Dual review | Functional but brittle in routing/state | More stable entry, language, and shared-state flow |
| English path | Mixed-language and routing issues existed | Language routing and visibility fixed |
| Current role | Historical stable version | Current practical version for use |

---

## Benchmarks and Objective Change

The numbers below come from [`docs/benchmarks/dedup/post-implementation-benchmark-report.md`](./docs/benchmarks/dedup/post-implementation-benchmark-report.md).

| Metric | v1.7 | V2.0 | Meaning |
|------|------|------|------|
| Auto-delete precision | `1.000` | `1.000` | Keeps the conservative zero-false-auto-delete policy |
| Combined duplicate-like recall | `0.583` | `0.917` | Better discovery of true duplicates and near-duplicates |
| Combined Candidate F1 | `0.737` | `0.957` | Higher quality candidate-review output |
| Real RDF hard recall | `0.667` | `1.000` | Recovers more duplicate groups on real exported data |
| Real RDF candidate pairs | `0` | `1` | Explicitly surfaces one more case for manual review |

### Performance vs efficiency

- There is no separate evidence yet that `V2.0` is materially faster than `v1.7` in pure import throughput
- The gain in this round is mainly correctness, stability, explainability, and real workflow efficiency
- In practice, the bigger improvement is that `V2.0` is more usable for actual review work, not simply that it runs faster

---

## Technical Architecture

```text
┌─────────────────────────────────┐
│  index.html / workspace.html    │  ← UI layer (step wizard + virtual list)
└────────────────┬────────────────┘
                 │
        ┌────────▼────────┐
        │     app.js      │  ← Logic layer (rule engine + flow control)
        └────┬───────┬────┘
             │       │
     ┌───────▼──┐ ┌──▼──────────┐
     │ db-worker│ │parser-worker│  ← Web Worker layer (background threads)
     └───────┬──┘ └──┬──────────┘
             │       │
        ┌────▼───────▼────┐
        │   IndexedDB     │  ← Data layer (local storage for 30,000+ records)
        └─────────────────┘
             ↑
        dedup-engine.js    ← V2.0 standalone dedup engine (two-layer output)
```

### Core Modules

| Module | Responsibility |
|------|------|
| `dedup-engine.js` | Standalone V2.0 dedup engine for hard and candidate duplicate output |
| `db-worker.js` | IndexedDB CRUD, batch insert, paginated query, transaction handling |
| `parser-worker.js` | 8-format parsing, DOI / title normalization, streaming file processing |
| `virtual-list.js` | Virtual scrolling component rendering only the visible 100 records |
| `app.js` | Main flow control, rule engine, export, and state management |

---

## V2.0 Dedup Benchmarks (vs v1.7)

| Metric | v1.7 | V2.0 | Change |
|------|------|------|------|
| Auto-delete precision | `1.000` | `1.000` | Zero false auto-delete maintained |
| Combined duplicate-like recall | `0.583` | `0.917` | +57% |
| Combined Candidate F1 | `0.737` | `0.957` | +30% |
| Real RDF hard recall | `0.667` | `1.000` | Full recovery |
| Explicit candidate surfacing | `✗` | `✓` | Manual-review queue added |

---

## Quick Start

### Online

[Open GitHub Pages](https://quzhiii.github.io/-PRISMA-/)

### Local

```bash
git clone https://github.com/quzhiii/-PRISMA-.git
cd -PRISMA-
python -m http.server 5175
```

Then open `http://localhost:5175` in your browser.

---

## Current Entry Points

- Homepage: `literature-screening-v2.0/index.html`
- Dual-review login: `literature-screening-v2.0/login.html`
- Main workspace: `literature-screening-v2.0/workspace.html`

---

## Version History

<details>
<summary><b>V2.0 (current main version, 2026-03)</b></summary>

- added dedicated homepage / login / workspace structure
- added standalone `dedup-engine.js`
- changed deduplication to hard auto-removal plus candidate review output
- improved CSV / TSV multiline abstract parsing so full abstracts are less likely to be cut at the first sentence
- added `Translate this record` in the full-text review modal for title + abstract translation
- fixed upload-success-but-no-content display issues, scrolling issues, and broken step progression
- fixed shared-state conflicts and logout cleanup in dual review
- fixed English entry, routing, and visibility behavior
- switched GitHub Pages default entry to `V2.0`

</details>

<details>
<summary><b>v1.7.x (stable maintenance version, 2026-03)</b></summary>

- completed PubMed `.nbib` import support
- fixed single / dual review session wiring
- fixed post-dedup progression into later steps
- regression verification passed: `tests/run-all-regressions.js` `5/5 PASS`

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
# After forking the repo
git checkout -b feature/your-feature
git commit -m "feat: describe your change"
git push origin feature/your-feature
# Then open a Pull Request
```

---

## License

[MIT License](./LICENSE)

---

## Abstract And Review Modal Updates

- The full-text review modal now prefers inline translation for a single record, and automatically falls back to a new-tab translation flow if inline translation is unavailable
- The modal layout was tightened so long abstracts and long translations remain scrollable while the close button and action area stay visible
- Clicking the empty overlay outside the modal now closes the modal directly
- CNKI RDF abstract tail noise such as `AbstractFilter(...)`, `More`, and `Reset` is cleaned during display/parsing
- When the upstream data source already provides a truncated abstract, the list view and modal now show an explicit `Source abstract may be truncated` hint
- These truncated abstracts are treated as source limitations from the database/export itself; the tool marks them, but does not fabricate missing abstract text
---

<div align="center">

If this tool helps your research, a Star is welcome.

</div>
