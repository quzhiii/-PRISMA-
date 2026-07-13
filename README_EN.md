# PRISMA Screening & Audit Workbench

A local-first workspace for systematic reviews, meta-analyses, and evidence synthesis. The current public line is **V2.5 dual-review closeout**, covering mixed-source import, conservative deduplication, dual review, quality appraisal, history rollback, PRISMA 2020-oriented output, and traceable evidence exports.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-V2.5%20Dual%20Review-brightgreen.svg)](https://quzhiii.github.io/-PRISMA-/)
[![Audit trail](https://img.shields.io/badge/Audit%20trail-events%20%2B%20decision%20ledger-0969da.svg)](./app/)
[![Local first](https://img.shields.io/badge/Local%20first-browser--based-2ea44f.svg)](https://quzhiii.github.io/-PRISMA-/)

English | [简体中文](./README.md)

[Live site](https://quzhiii.github.io/-PRISMA-/) · [Workspace](./app/) · [Dual-review guide](./dual-review/) · [Resources](./resources/) · [Issues](https://github.com/quzhiii/-PRISMA-/issues)

> Independent-project notice: this is an independent open-source project. It is not affiliated with, authorized by, or endorsed by the PRISMA Statement. The PRISMA name describes the intended workflow context; researchers must still verify reporting requirements against official materials.

## Current public release line

| Release line | Canonical route | Status |
|---|---|---|
| V2.5 dual-review closeout | `/app/` | Current public line with A/B decision isolation, conflict queues, resolver workflow, agreement metrics, and an unresolved-conflict export gate. |
| V2.5.1 project history rollback | `/app/` | Current patch-line capability with local history snapshots, restore entry, and source-file add/remove records. |

The old `literature-screening-v2.2/` HTML locations remain compatibility paths and no longer present a separate public release identity. See [`/legacy/`](./legacy/) for historical-route notes.

## Why use it

The hard part of a systematic review is whether the process can be checked later: which records arrived, which duplicates were removed, why records were excluded, how dual-review conflicts were resolved, and which human decisions support final counts. The workspace preserves exportable events and decisions behind those answers instead of only drawing a final diagram.

| Review problem | Current handling |
|---|---|
| Mixed database export formats | Supports `CSV / TSV / RIS / ENW / BibTeX / RDF / TXT / NBIB` and mixed-source imports |
| Automatic deduplication may remove valid records | Hard duplicates are removed; candidate duplicates remain for human review |
| PRISMA counts are difficult to verify | Counts can be recalculated from `AuditEvent` and `ScreeningDecision` data |
| Full-text reasons are scattered | Uses an exclusion-reason taxonomy and exports decisions and reason summaries |
| Reviewer decisions conflict | Keeps A/B decisions separate, routes conflicts to a resolver, and blocks final exports while conflicts remain |
| Project changes are hard to undo | Browser-local snapshots and source-file history support restoration |
| AI assistance has unclear authority | Real providers are disabled by default; local suggestions remain advisory and humans make final decisions |

## Workflow

```text
Import records -> Conservative deduplication -> Screening rules -> Title/abstract screening -> Full-text review -> Quality assessment -> PRISMA and audit exports
```

| Stage | Main output |
|---|---|
| Import | Normalized records, source-file metadata, import events |
| Deduplication | Hard-duplicate removals, candidate duplicates, deduplication evidence |
| Screening | Human title/abstract and full-text decisions, reasons, and notes |
| Dual review | Reviewer A/B decisions, conflicts, agreement metrics, and resolver values |
| Quality appraisal | Item-level appraisal, evidence table, and GRADE summary scaffold |
| Export | PRISMA SVG, result tables, reports, event logs, decision tables, and review evidence |

## Dual-review boundary

The workspace does not provide accounts, online project lookup, or real-time sync. Collaboration relies on browser-local state and file handoff:

- `Collaboration Seed`: a collaboration starting-point description exported by the owner from an existing project.
- `Reviewer Decision Bundle`: reviewer-scoped values exported by Reviewer A or B.
- `merge import`: the owner merges a decision file into the existing project and refreshes conflicts and the export gate.
- Full-project save/load remains a separate backup path.
- There is no dedicated Seed import wizard yet. Before cross-device review starts, the recipient still needs the same project context through the separate full-project backup path.

## Data and network boundary

- Imported project records are processed and stored in the browser by default. The application does not automatically upload project records.
- The page may still request the third-party `js-yaml` asset. Record-level translation sends selected text to an external translation service only after the user invokes that feature.
- Opening the workspace through `file://` is a degraded mode. Browser restrictions may limit Workers and larger files; static HTTP serving is recommended.
- Export files may contain research data and reviewer identifiers. Researchers should inspect and redact them before sharing.

## Main exports

| File | Purpose |
|---|---|
| `project_manifest.json` | Project metadata, PRISMA version, AI mode, and app version |
| `events.jsonl` | Import, deduplication, screening, review, quality, and export events |
| `screening_decisions.csv` | Durable human screening-decision ledger |
| `exclusion_reasons.csv` | Exclusion taxonomy and counts |
| `prisma_counts.json` | PRISMA counts recalculated from decisions and events |
| `audit_summary.md` | Human-readable audit summary and boundary notes |
| `DEFENSE_AUDIT_PACK.md` | Methods appendix / review evidence package combining counts, dual review, quality, source warnings, and AI boundaries; researcher verification is required |
| `quality_appraisal.csv` | Study- and domain-level quality appraisal records |
| `evidence_table.csv` | PICOS, effect, quality, and evidence-certainty organization |
| `grade_summary.csv` | GRADE summary scaffold; final certainty and downgrade reasons remain human-confirmed |
| `dual_review_conflicts.csv` | Screening and quality conflict evidence |
| `dual_review_agreement.json` | Percent agreement, Cohen's kappa, and conflict-gate state |

## Resources

- [Public demo guide](./docs/demo/README.md)
- [Reproducibility benchmark guide](./docs/benchmarks/README.md)
- [Review Starter Kits](./docs/templates/README.md)
- [Search Strategy Assistant boundary](./docs/design/SEARCH_STRATEGY_ASSISTANT.md)

The Search Strategy Assistant generates and records search strategies only. It does not fetch databases, handle institutional credentials, or make automatic include/exclude decisions.

## Technical layout

```text
index.html                          -> Current V2.5 homepage
app/index.html                      -> Canonical workspace
dual-review/index.html              -> Dual-review and file-handoff boundary
resources/index.html                -> Public resources hub
literature-screening-v2.2/app.js   -> Workflow, review, export, and state management
literature-screening-v2.2/audit-engine.js
                                    -> Audit models, serializers, and report builders
literature-screening-v2.2/reviewer-bundle-engine.js
                                    -> Reviewer Bundle protocol helpers
scripts/build-public-site.mjs       -> Explicit-allowlist static build
```

## Tests and build

```powershell
node --test tests\public\public-site-alignment.test.mjs
node tests\run-all-regressions.js
node scripts\build-public-site.mjs
```

Current full regression entry: `node tests\run-all-regressions.js`.

`dist/` is an ignored build artifact. Public deployment should upload that directory only, not the repository root.

## License

[MIT License](./LICENSE)
