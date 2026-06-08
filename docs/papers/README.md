# Paper Skeleton

This directory is the current repository-local paper skeleton entry for PRISMA Workbench.

It is not a full manuscript draft. It is the current manuscript structure and evidence map for future software or methods submissions.

## Recommended starting venue

Recommended starting venue: JOSS.

Why JOSS first:

- the project already has clear open-source software scope
- the repository now has demo dataset, benchmark package, tests, and reproducible workflow evidence
- JOSS is the smallest credible first paper target before broader methods or user-study submissions

## Alternate venue directions

- JMIR AI: for AI-assisted systematic review transparency and auditability positioning
- Systematic Reviews: if future user studies or workflow validation are added
- BMC Medical Research Methodology: if future methodological evaluation becomes strong enough

## Statement of need outline

- systematic review tooling often emphasizes diagram output over replayable workflow evidence
- Chinese-source compatibility and local-first auditability remain under-served in common review tools
- conservative AI assistance needs transparent human-confirmed boundaries rather than black-box automation

## Current core contribution buckets

- local-first import, screening, and export workflow in the browser
- audit-ready event and decision ledger for replayable PRISMA counts
- conservative dedup design with hard/candidate split and benchmark evidence
- Chinese-source compatibility work for CNKI / Wanfang / VIP / SinoMed reliability hardening
- conservative AI transparency with advisory-only suggestions and human confirmation

## Current evidence-backed repo sources

- public product and scope summary: `README.md`
- English public product summary: `README_EN.md`
- roadmap and phase status: `docs/ROADMAP_2026.md`
- public demo dataset slice: `literature-screening-v2.2/sample-data.json`
- benchmark package entry: `docs/benchmarks/README.md`
- current dedup benchmark report: `docs/benchmarks/dedup/post-implementation-benchmark-report.md`
- Chinese-source compatibility design: `docs/design/CHINESE_SOURCE_COMPATIBILITY.md`
- conservative AI design: `docs/design/CONSERVATIVE_AI_DESIGN.md`
- audit ledger design: `docs/design/AUDIT_LEDGER_DESIGN.md`
- regression entry: `tests/run-all-regressions.js`

## Suggested manuscript skeleton

1. Title
2. Abstract
3. Statement of need
4. System overview and workflow boundaries
5. Audit-ready data model and export contract
6. Conservative dedup and benchmark evidence
7. Chinese-source compatibility and reliability hardening
8. Conservative AI transparency boundary
9. Limitations and future work
10. Availability and reproducibility

## Current manuscript gaps

- no full submission-ready draft yet
- no citation metadata file yet
- no consolidated installation / usage / citation block specifically for paper submission
- no user study or formal workflow validation for JMIR AI / Systematic Reviews level claims
- benchmark package currently starts from dedup assets rather than every product module

## Current boundary

- This is a repository-local paper skeleton.
- It is not a submission-ready paper.
- It should stay evidence-backed and conservative until stronger validation assets are added.
