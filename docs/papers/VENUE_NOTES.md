# Venue Notes

These notes compare the current repository state against conservative venue directions.

They are not submission advice. They are a repo-local planning aid.

## Current Recommendation Order

1. JOSS
2. JMIR AI
3. Systematic Reviews
4. BMC Medical Research Methodology

## Venue Fit Snapshot

| Venue | Current fit | What the repo already supports | Main blocker now | Recommendation |
|---|---|---|---|---|
| JOSS | Strongest current fit | Open-source software scope, reproducible tests, benchmark package, demo dataset, paper skeleton, clear software boundaries | Still needs full manuscript, citation metadata, and final release/submission preparation | Start here first |
| JMIR AI | Partial future fit | Conservative AI boundary, transparency reporting, auditability, local-first workflow story | No user study, no real-provider evaluation, no broader AI workflow validation | Revisit after stronger validation |
| Systematic Reviews | Weak current fit | Review workflow framing, PRISMA replayability, dual-review and audit story | No formal methods validation or domain study | Not yet |
| BMC Medical Research Methodology | Weak-to-partial current fit | Methods-oriented narrative around auditability and workflow structure | No external methodological evaluation yet | Revisit later |

## JOSS-specific Notes

Current JOSS-friendly assets already in the repo:

- public product summary in `README.md` and `README_EN.md`
- reproducible demo onboarding assets in `docs/demo/README.md`
- reproducible benchmark assets in `docs/benchmarks/README.md`
- current manuscript structure and evidence map in `docs/papers/`
- regression entry in `tests/run-all-regressions.js`

Current JOSS blockers still visible in the repo:

- no full manuscript text yet
- no `CITATION.cff` yet
- no paper-specific archival / citation / release checklist yet

## Venue Expansion Boundary

Do not stretch the paper narrative past what the repository can support.

Current safe boundary:

- software workflow contribution
- auditability and replayability contribution
- conservative AI boundary contribution
- Chinese-source compatibility contribution

Current unsafe boundary:

- validated productivity gains
- validated review-quality gains
- validated AI effectiveness with real providers
- broad comparative superiority claims against external tools
