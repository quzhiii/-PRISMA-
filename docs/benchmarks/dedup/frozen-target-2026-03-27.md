# Frozen Benchmark Target (2026-03-27)

## Snapshot

- freeze date: 2026-03-27
- branch: `main`
- HEAD snapshot: `a932ec54cd39911f662b1239ed3b37302669727b`
- benchmark intent: freeze the first executable benchmark target before any vNext dedup behavior changes land

## Working Tree Status

The working tree is **dirty** at freeze time. Existing uncommitted changes were already present in the repo and are part of the context for this implementation wave.

Observed status at freeze time:

- modified: `.gitignore`
- modified: `README.md`
- modified: `README_EN.md`
- modified: `app.js`
- modified: `index.html`
- modified: `parser-worker.js`
- modified: `v1.7-core-patch.js`
- untracked: `docs/`
- untracked: `literature-screening-v1.7/`
- untracked: `literature-screening-v2.0/`
- untracked: `tests/`
- untracked: `nul`

This freeze document records the comparison target, not a clean-room release state.

## First Benchmark Target

The first benchmark target to evaluate is the current **root app inline dedup path** in `app.js`.

Target definition:

- file: `app.js`
- runtime path: the dedup block inside the screening flow that normalizes records, then applies:
  - exact DOI equality first
  - exact normalized-title equality second
- helper alignment: `normalizeTitle()` in `app.js`
- benchmark label: `root-app`

This target is intentionally frozen before any shared dedup engine exists, so future benchmark results can compare against the currently shipped behavior rather than a moving implementation target.

## Scope Boundaries

This freeze applies only to benchmark evaluation for dedup behavior. It does not assert that the working tree is release-ready, and it does not supersede later task-specific verification artifacts.
