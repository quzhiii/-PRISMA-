# Evidence Map

This file maps paper-level claims to current repository evidence.

Use it to keep future manuscript writing tied to what the repository can already support.

## Claims Supported Today

| Claim | Current support | Primary repo evidence | Note |
|---|---|---|---|
| The workspace is local-first and browser-based | Strong | `README.md`, `README_EN.md`, `index.html`, `literature-screening-v2.2/workspace.html` | Safe public positioning claim |
| PRISMA counts can be replayed from durable workflow data | Strong | `literature-screening-v2.2/audit-engine.js`, `docs/design/AUDIT_LEDGER_DESIGN.md`, `tests/audit/audit-engine.test.mjs`, `tests/audit/audit-workflow.test.mjs` | Central audit-ready software claim |
| The project supports conservative deduplication with a hard/candidate split | Strong | `literature-screening-v2.2/dedup-engine.js`, `docs/benchmarks/README.md`, `docs/benchmarks/dedup/post-implementation-benchmark-report.md`, `tests/dedup/*.test.mjs` | Safe software-behavior claim |
| The repo contains a reproducible benchmark package entry | Strong | `docs/benchmarks/README.md`, `tests/benchmarks/package-coverage.test.mjs`, `tests/run-all-regressions.js` | Package exists, but coverage is still partial |
| Chinese-source reliability hardening exists for representative exports | Strong | `docs/design/CHINESE_SOURCE_COMPATIBILITY.md`, `tests/import/import-hardening.test.mjs`, `tests/import/parser-chunk-boundary.test.mjs`, `fixtures/chinese-source/` | Safe to name CNKI / Wanfang / VIP / SinoMed specifically |
| Import-facing warnings expose noisy, truncated, or incomplete source records | Strong | `literature-screening-v2.2/app.js`, `literature-screening-v2.2/parser-worker.js`, `literature-screening-v2.2/streaming-parser.js`, `tests/import/import-hardening.test.mjs` | Safe reliability-visibility claim |
| AI assistance stays advisory-only until a human confirms it | Strong | `docs/design/CONSERVATIVE_AI_DESIGN.md`, `tests/ai/conservative-ai-engine.test.mjs`, `tests/ai/ai-suggestion-review-flow.test.mjs`, `tests/audit/prisma-traice-export-trio.test.mjs` | Safe transparency-boundary claim |
| Dual-review conflicts and reviewer handoff are supported locally | Strong | `literature-screening-v2.2/dual-review-engine.js`, `literature-screening-v2.2/reviewer-bundle-engine.js`, `tests/audit/dual-review-engine.test.mjs`, `tests/audit/reviewer-bundle-engine.test.mjs` | Safe workflow claim, not a real-time collaboration claim |
| Local history rollback exists for project snapshots and source-file changes | Strong | `literature-screening-v2.2/project-history-engine.js`, `tests/audit/project-history-engine.test.mjs`, `tests/audit/project-history-runtime.test.mjs` | Safe recoverability claim |
| The repo includes a public walkthrough dataset for onboarding | Strong | `literature-screening-v2.2/sample-data.json`, `docs/demo/README.md` | Safe onboarding claim, not benchmark-certification claim |

## Claims Not Yet Supported

| Claim to avoid | Why it is not supported yet | What would strengthen it |
|---|---|---|
| The software measurably reduces review time | No user study or timing study in the repo | Structured user study or workflow timing evidence |
| The software improves review accuracy or outcome quality | No formal comparative evaluation against human baseline or competing tools | Adjudicated study or prospective evaluation |
| The Chinese-source layer covers all real export variants | Current fixtures are representative, not exhaustive | Larger fixture bank across more export variants |
| The AI layer is effective with real providers | Real provider dispatch remains disabled by default | Evaluated provider-backed workflow with explicit metrics |
| The benchmark package covers the whole product | The current benchmark package starts from dedup assets plus package coverage | More module-level benchmark assets |
| The project is already ready for JMIR AI or Systematic Reviews submission | Missing user-study or workflow-validation evidence | Formal validation or methods evaluation |

## Safest Paper Narrative Today

The safest current paper narrative is:

- a software workflow paper
- focused on local-first auditability, replayability, and conservative boundaries
- supported by tests, demo assets, benchmark assets, and design documentation
- explicit about limits around validation, coverage, and future venue expansion
