# Manuscript Outline

This outline is the current JOSS-first manuscript scaffold for PRISMA Workbench.

It is designed to keep claims conservative and tied to repository evidence.

## Candidate Title Directions

1. `PRISMA Workbench: A Local-first and Audit-ready Workflow for Systematic Review Screening`
2. `PRISMA Workbench: Conservative, Audit-ready Literature Screening with Chinese-source Compatibility`
3. `PRISMA Workbench: Replayable PRISMA Counts and Local-first Review Evidence in the Browser`

## JOSS-first Abstract Scaffold

Use this as a constraint, not as a finished abstract:

1. Problem: systematic review tooling often emphasizes final diagrams more than replayable workflow evidence.
2. Need: local-first handling, audit-ready exports, and Chinese-source compatibility remain under-served in common review workflows.
3. Approach: PRISMA Workbench keeps import, conservative deduplication, screening, dual review, quality appraisal, and export in one browser-based local workflow.
4. Distinguishing features: replayable PRISMA counts, conservative dedup split, Chinese-source reliability warnings, advisory-only AI boundary, and defense-ready audit export.
5. Evidence base: demo dataset, benchmark package, regression suite, and design docs are all repo-local and reproducible.
6. Boundary: no claim of clinical effectiveness, user-study validation, or real AI provider performance.

## Recommended Section Order

| Section | What to say | Primary evidence | Do not overclaim |
|---|---|---|---|
| Summary | Present the software as a local-first, audit-ready screening workspace | `README.md`, `README_EN.md` | Do not call it a validated review platform |
| Statement of need | Emphasize replayable workflow evidence, Chinese-source compatibility, and conservative AI boundaries | `docs/ROADMAP_2026.md`, `docs/design/AUDIT_LEDGER_DESIGN.md`, `docs/design/CHINESE_SOURCE_COMPATIBILITY.md`, `docs/design/CONSERVATIVE_AI_DESIGN.md` | Do not claim all competing tools lack these features unless independently sourced |
| Software overview | Describe import, dedup, screening, dual review, quality appraisal, audit export, reviewer bundles, and history rollback | `README.md`, `literature-screening-v2.2/`, `tests/run-all-regressions.js` | Do not describe future or planned features as shipped |
| Audit-ready data model | Explain `AuditEvent`, `ScreeningDecision`, replayable counts, and defense-ready export | `literature-screening-v2.2/audit-engine.js`, `docs/design/AUDIT_LEDGER_DESIGN.md`, `tests/audit/*.test.mjs` | Do not claim external peer validation of the audit model |
| Conservative dedup and benchmarks | Explain hard-duplicate vs candidate-duplicate split and benchmark package evidence | `docs/benchmarks/README.md`, `docs/benchmarks/dedup/post-implementation-benchmark-report.md`, `tests/dedup/*.test.mjs`, `tests/benchmarks/package-coverage.test.mjs` | Do not say the benchmark suite covers every module |
| Chinese-source compatibility | Describe CNKI / Wanfang / VIP / SinoMed hardening and import-facing warnings | `docs/design/CHINESE_SOURCE_COMPATIBILITY.md`, `tests/import/import-hardening.test.mjs`, `tests/import/parser-chunk-boundary.test.mjs` | Do not claim coverage of every export variant |
| Conservative AI boundary | Present advisory-only suggestions, prompt trace, and human confirmation boundary | `docs/design/CONSERVATIVE_AI_DESIGN.md`, `tests/ai/*.test.mjs` | Do not claim model performance or autonomous review quality |
| Availability and reproducibility | Point to local demo dataset, benchmark package, and regression entry | `docs/demo/README.md`, `docs/benchmarks/README.md`, `tests/run-all-regressions.js` | Do not imply archival release metadata exists if it does not |
| Limitations | Be explicit about missing user study, missing citation metadata, partial benchmark coverage, and no backend collaboration | `docs/papers/EVIDENCE_MAP.md`, `docs/papers/VENUE_NOTES.md` | Do not hide validation gaps |

## JOSS-first Writing Boundary

The current safest paper posture is:

- software paper first
- reproducible workflow and evidence package first
- conservative claim language
- no outcome-improvement or time-savings claims without new studies

## What Still Needs To Exist Before Submission

- a full manuscript draft
- citation metadata such as `CITATION.cff`
- a paper-specific installation / availability / archival release checklist
- a final pass over title, author list, and repository citation wording
