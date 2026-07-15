# Pending Decisions

Date: 2026-07-13

These decisions must be resolved before the corresponding release-train work proceeds. Until then, preserve compatibility and avoid irreversible migrations.

## Product and brand

| Decision | Current default | Needed before |
|---|---|---|
| Public product name | Keep PRISMA Workbench as the current display name during M0-M2; legacy-alias status remains undecided | formal rename or domain change |
| Current public version | V2.5 dual-review closeout | any V3.0 release claim |
| Next functional release version | Undecided; completed V2.6/V2.7 capability-slice labels do not settle the next public release number | any post-V2.5 public release claim |
| Candidate future name | Test EvidenceDock, SiftTrail, and ReviewTrail; no candidate has been selected | repository/domain/schema producer rename |
| M2 naming research | The test kit and blank scorecard are prepared at `docs/naming/2026-07-name-test-kit.md` and `docs/naming/2026-07-name-test-scorecard.csv`; 5-8 real user sessions have not yet run | naming recommendation |
| Rename approval gate | Require completed 5-8 user sessions, name-risk checks, migration review, and explicit maintainer approval | any formal rename |
| PRISMA independence statement | Add a clear independent-project disclaimer | public alignment closeout |
| Rename scope | Do not change repository, domain, schema producer, bundle producer, or internal IDs during M2 naming tests | any approved display-name migration |
| Repository name | Keep the current repository name until naming tests and inbound-link migration are approved | repository rename |
| Public domain and canonical origin | Keep the current host unchanged; do not declare a new canonical origin until hosting and redirects are reproducible | canonical metadata or domain migration |
| Legacy product alias | Undecided; retaining PRISMA Workbench as a legacy alias is a recommendation only and has not been approved | formal brand migration |
| Migration impact state | Repository and inbound links, domain, canonical metadata, package/app identity, schema producer, bundle producer, export manifest, CLI, storage keys, download names, and legacy alias are documented but not approved/executed | formal brand migration |

## Routes and compatibility

| Decision | Current default | Needed before |
|---|---|---|
| Canonical static routes | Evaluate `/app/`, `/start/`, `/dual-review/`, `/resources/`, `/methods/`, `/legacy/` | M1 route implementation |
| Legacy alias duration | Preserve `literature-screening-v2.2/` until migration evidence exists | route cleanup |
| Static route form | Undecided; choose directory `index.html` routes or HTML-file compatibility routes after confirming selected-host behavior | M1 route implementation |
| Root entry behavior | Do not change in M0; for M1 choose a direct V2.5 homepage or a minimal V2.5 compatibility entry, with query/hash and rollback tests | M1 implementation |
| Canonical and trailing-slash policy | Undecided; define one origin, one canonical page per role, and one slash policy | route smoke and canonical metadata |
| `login.html` compatibility | Retain as a legacy alias, but replace login/join/sync semantics with local Reviewer Bundle setup | M4 closeout |
| `landing.html` role | Treat as an orphan pending merge, redirect, or a documented navigational role | M1 closeout |
| Historical route exposure | Keep source history, but decide which URLs redirect, show a legacy banner, or leave the deploy artifact | deployment cleanup |
| Deployment artifact scope | Prefer an explicit allowlist that excludes test pages, state-mutating tools, and large test fixtures | any public preview or deployment |

## Repository hygiene

| Decision | Current default | Needed before |
|---|---|---|
| June planning drafts | Not present in this RT-0 worktree; if present in another worktree, keep untracked and untouched | archive/delete action |
| July 11 planning drafts | Not present in this RT-0 worktree; if present in another worktree, preserve pending supersession review | archive/delete action |
| `.omo/` | Not present in this RT-0 worktree; if present elsewhere, keep local-only and uncommitted | `.gitignore` update |
| `docs/strategy/` | Not present in this RT-0 worktree; if present elsewhere, keep local-only pending publication review | commit/archive action |
| `skillhub/` | Not present in this RT-0 worktree; if present elsewhere, keep outside product-repository cleanup | split/ignore/commit action |

## Product boundaries

| Decision | Current default | Needed before |
|---|---|---|
| CLI timing | Undecided whether the CLI enters the near-term roadmap; if approved, defer implementation until RT-1 is stable | any M9 implementation |
| Community extension scope | Undecided whether initial community contributions are limited to adapters and benchmark datasets; no template marketplace is in the current scope | M11 implementation |
| Methods language | Undecided whether Chinese and English Methods pages launch together; if staged, use Chinese-first with an aligned English follow-up | M5 implementation |
| Search Strategy Assistant | Design-only; no database crawling or institutional credentials | any implementation |
| AI behavior | Advisory only; human decisions remain authoritative | all future AI work |
| Translation and external links | Treat translation and full-text links as explicit third-party egress, separate from default local project processing | M1 privacy copy and M5 Methods |
| Core remote assets | Do not claim complete offline operation while core pages load CDN or font assets; decide whether to vendor them | M1 closeout |

## Runtime contracts

| Decision | Current default | Needed before |
|---|---|---|
| Project schema identity | Treat `2.5-dual-review-release` only as an application release marker; do not define it as a project schema | M3 package diagnostics |
| Project compatibility policy | Preserve current files; require explicit supported schema/producer diagnostics before rejecting or migrating packages | M3 restore implementation |
| Project state version | Undecided; define separately from app release, audit schema, history schema, and database version | M7 implementation |
| Autosave recovery | Do not promise recovery from `prisma_autosave` until a project-keyed reader, age check, and diagnostics exist | M3 closeout |
| Authoritative persistence | Undecided between full-state localStorage and IndexedDB ledger roles; do not add a third authority | M7 implementation |
| Reviewer Bundle schema | Preserve `reviewer_bundle.v1.local` compatibility for current code and in-memory tests; no persisted Reviewer Bundle fixtures currently exist. Design any incompatible M4 contract as an explicit version transition | M4 implementation |
| Bundle field naming | Preserve existing camelCase fields for `reviewer_bundle.v1.local`; add the additive `m4.v1` contract fields in camelCase to avoid breaking current in-memory consumers | M4 contract freeze |
| Bundle integrity hash | Keep `rbp:` as the legacy base-fingerprint compatibility field; use deterministic SHA-256 fields for source manifest, records, decisions, integrity metadata, and bundle ID | M4 implementation |
| Duplicate bundle policy | Reject an already applied Decision Bundle by its deterministic `bundleId`; a newer replacement policy remains deferred until an explicit replacement contract exists | M4 implementation |
| History model | Preserve current snapshots until a migration exists; do not call them replayable or hash-verified checkpoints | M7 implementation |
| Export manifest scope | Current manifest is project metadata; decide archive/artifact list, hashes, producer, and Export Snapshot binding | M5 evidence contract |
| Import checkpoint semantics | Treat current prompt as restart, not resume; define file identity, adapter version, checkpoint schema, and legal stage transitions | M7 implementation |
| AI provenance invariant | Keep UI advisory-only; require package/export validation before claiming that all countable decisions have human provenance | M5 closeout |

## Deployment

| Decision | Current default | Needed before |
|---|---|---|
| Remote push | Do not push until local user verification | every push |
| Public deployment | Do not deploy the new version yet | explicit user approval |
| RT-0 execution branch | Use a dedicated worktree/branch | M0 start |
| Hosting source and build | Current repository does not define a reproducible Pages/Vercel artifact; choose and document one allowlisted build path | any public preview |
| Test-page exposure | Exclude `create-test.html`, performance pages, and large test data from public artifacts | any public preview |
