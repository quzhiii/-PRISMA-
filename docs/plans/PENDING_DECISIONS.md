# Pending Decisions

Date: 2026-07-13

These decisions must be resolved before the corresponding release-train work proceeds. Until then, preserve compatibility and avoid irreversible migrations.

## Product and brand

| Decision | Current default | Needed before |
|---|---|---|
| Public product name | Keep PRISMA Workbench as the current name and legacy alias | formal rename or domain change |
| Current public version | V2.5 dual-review closeout | any V3.0 release claim |
| Candidate future name | Test EvidenceDock, SiftTrail, and ReviewTrail | repository/domain/schema producer rename |
| PRISMA independence statement | Add a clear independent-project disclaimer | public alignment closeout |

## Routes and compatibility

| Decision | Current default | Needed before |
|---|---|---|
| Canonical static routes | Evaluate `/app/`, `/start/`, `/dual-review/`, `/resources/`, `/methods/`, `/legacy/` | M1 route implementation |
| Legacy alias duration | Preserve `literature-screening-v2.2/` until migration evidence exists | route cleanup |
| Root entry behavior | Keep current static root until route smoke tests are ready | M1 closeout |
| `login.html` compatibility | Retain path but change semantics to dual-review setup | M4 closeout |

## Repository hygiene

| Decision | Current default | Needed before |
|---|---|---|
| June planning drafts | Keep untracked and untouched | archive/delete action |
| July 11 planning drafts | Keep untracked pending supersession review | archive/delete action |
| `.omo/` | Local-only, not committed | `.gitignore` update |
| `docs/strategy/` | Local-only pending publication review | commit/archive action |
| `skillhub/` | Out of scope for product repository cleanup | split/ignore/commit action |

## Product boundaries

| Decision | Current default | Needed before |
|---|---|---|
| CLI timing | Defer until RT-1 is stable | M9 implementation |
| Community extension scope | No template market; evaluate adapter/registry contribution model | M11 implementation |
| Methods language | Prefer Chinese-first with an aligned English version | M5 implementation |
| Search Strategy Assistant | Design-only; no database crawling or institutional credentials | any implementation |
| AI behavior | Advisory only; human decisions remain authoritative | all future AI work |

## Deployment

| Decision | Current default | Needed before |
|---|---|---|
| Remote push | Do not push until local user verification | every push |
| Public deployment | Do not deploy the new version yet | explicit user approval |
| RT-0 execution branch | Use a dedicated worktree/branch | M0 start |
