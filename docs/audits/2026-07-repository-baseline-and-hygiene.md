# Repository Baseline and Hygiene Audit

Date: 2026-07-13

## Purpose

This audit freezes the repository state before RT-0 Public Alignment. It classifies current tracked work, local planning drafts, and protected directories so later agents can work from a clean baseline without deleting or accidentally publishing unfinished material.

## Current baseline

- Current branch: `main`
- Current public release line: V2.5 dual-review closeout
- Current compatibility workspace: `literature-screening-v2.2/`
- Architecture boundary: static-first and local-first
- Remote status: no push or deployment was performed during this cleanup
- Required regression command: `node tests/run-all-regressions.js`

## Recently tracked productization work

The current local commit stack contains focused changes for:

- official website information architecture;
- workspace onboarding paths;
- review starter kits;
- Search Strategy Assistant design boundaries;
- public copy and Chinese resources localization;
- the post-V2.5 iteration roadmap and visual direction.

These changes are intentional baseline work for P6 release preparation. They do not rename the public product to V3.0 and do not add backend sync, accounts, payments, license checks, default cloud upload, or database crawling.

## Untracked local material

The following paths remain untracked and were intentionally not modified or committed:

| Path group | Classification | Current action |
|---|---|---|
| `.omo/` | local agent/tool state | keep local; do not commit without explicit approval |
| `docs/plans/2026-06-08-*` | historical planning drafts | preserve; decide archive or delete separately |
| `docs/plans/2026-06-09-*` | historical planning drafts | preserve; decide archive or delete separately |
| `docs/plans/2026-07-11-*` | implementation/evolution drafts | preserve; compare with the 2026-07-13 consolidated plan before archiving |
| `docs/strategy/` | local strategy drafts | keep local until scope and publication status are reviewed |
| `skillhub/` | separate experimental/tooling material | keep outside product cleanup unless explicitly requested |

## Hygiene rules for the next phase

1. Do not use broad staging commands such as `git add .` while protected untracked paths exist.
2. Stage files by explicit path only.
3. Do not delete, move, or rewrite protected drafts without a user decision.
4. Run RT-0 in a dedicated branch or worktree after this baseline is committed.
5. Keep public product changes separate from planning-document changes.
6. Keep V2.5 as the public release line until naming and migration decisions are approved.
7. Do not push or deploy without explicit user approval after local verification.

## Recommended worktree setup

After this audit is committed, create a dedicated worktree from the current local baseline, for example:

```powershell
git worktree add ..\comet-rt0 -b chore/rt0-public-alignment
```

Before creating it, confirm the sibling directory does not already exist. The worktree should begin with M0 public-surface auditing, not M1 implementation.

## Next cleanup decisions

- Decide whether the June planning drafts should be archived under `docs/plans/archive/` or remain local-only.
- Decide whether the two July 11 plans are superseded by the July 13 consolidated plan.
- Decide whether `.omo/`, `docs/strategy/`, and `skillhub/` require `.gitignore` entries or separate repositories.
- Decide whether `main` should remain the local integration branch while RT-0 uses a dedicated branch.

## Exit criteria

- Tracked worktree has no modified or staged files.
- Only explicitly protected local drafts remain untracked.
- Audit and full regression tests pass.
- A dedicated RT-0 worktree can be created from the frozen local commit stack.
