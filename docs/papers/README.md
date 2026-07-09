# Paper Skeleton

This directory is the current repository-local paper skeleton package for PRISMA Workbench.

Current status: the P6 paper skeleton slice is now in place as a conservative manuscript-preparation bundle. It organizes the current manuscript outline, claim-to-evidence map, and venue-fit notes for future JOSS / JMIR AI / Systematic Reviews preparation.

It is not a full manuscript draft. It is not a submission-ready paper. It should stay evidence-backed and conservative until stronger validation assets are added.

## Contents

- `MANUSCRIPT_OUTLINE.md`: JOSS-first section outline, title directions, and allowed-claim boundaries
- `EVIDENCE_MAP.md`: claim-to-evidence map for repo-backed paper writing
- `VENUE_NOTES.md`: conservative venue-fit notes and current blockers

## Recommended starting venue

Recommended starting venue: JOSS.

Why JOSS first:

- the project already has clear open-source software scope
- the repository now has a demo dataset, benchmark package, paper skeleton, tests, and reproducible workflow evidence
- JOSS is the smallest credible first paper target before broader methods or user-study submissions

## Alternate venue directions

- JMIR AI: for AI-assisted systematic review transparency and auditability positioning
- Systematic Reviews: if future user studies or workflow validation are added
- BMC Medical Research Methodology: if future methodological evaluation becomes strong enough

## Current contribution envelope

- local-first import, screening, and export workflow in the browser
- audit-ready event and decision ledger for replayable PRISMA counts
- conservative dedup design with hard/candidate split and benchmark evidence
- Chinese-source compatibility work for CNKI / Wanfang / VIP / SinoMed reliability hardening
- conservative AI transparency with advisory-only suggestions and human confirmation
- dual-review conflict handling, reviewer bundle handoff, and local history rollback

## Current evidence-backed repo sources

- public product and scope summary: `README.md`
- English public product summary: `README_EN.md`
- roadmap and phase status: `docs/ROADMAP_2026.md`
- public demo dataset slice: `literature-screening-v2.2/sample-data.json`
- demo walkthrough: `docs/demo/README.md`
- benchmark package entry: `docs/benchmarks/README.md`
- benchmark package coverage test: `tests/benchmarks/package-coverage.test.mjs`
- current dedup benchmark report: `docs/benchmarks/dedup/post-implementation-benchmark-report.md`
- Chinese-source compatibility design: `docs/design/CHINESE_SOURCE_COMPATIBILITY.md`
- conservative AI design: `docs/design/CONSERVATIVE_AI_DESIGN.md`
- audit ledger design: `docs/design/AUDIT_LEDGER_DESIGN.md`
- regression entry: `tests/run-all-regressions.js`
- commercial validation contract for later venue expansion: `docs/commercial/VALIDATION.md`

## Current manuscript gaps

- no full submission-ready draft yet
- no `CITATION.cff` or paper-specific citation metadata block yet
- no consolidated installation / usage / archival release checklist specifically for submission
- no user study or formal workflow validation for JMIR AI / Systematic Reviews level claims
- benchmark package currently starts from dedup assets plus package coverage rather than every product module

## Current boundary

- This is a repository-local paper skeleton.
- It is not a claim that a manuscript is ready for submission.
- It should not claim measured time savings, better review outcomes, or validated user adoption without new evidence.
