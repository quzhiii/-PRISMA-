# Repo State Policy

Last updated: 2026-06-09

## Release Lines Vs Capability Slices Vs Planning Drafts

This repository uses three different status layers. They should not be mixed together in public-facing status tables.

### 1. Release line

A `release line` is what users should open as the current public product line.

Current example:

- `V2.5 dual-review closeout`

### 2. Patch-line capability

A `patch-line capability` is a completed addition that belongs to the current public release line, but is described as a patch-level or close-following capability.

Current example:

- `V2.5.1 project history rollback`

### 3. Completed capability slice

A `completed capability slice` is shipped on the compatibility path, but should not be presented as if it replaced the current public release line.

Current examples:

- `Reviewer Bundle protocol`
- `V2.6 Conservative AI foundation`

### 4. Next slice

A `next slice` is planned or in-progress work that should not be presented as already shipped.

Current example:

- `V2.7 Chinese-source reliability`

### 5. Planning draft

A `planning draft` is a repo-local planning or strategy artifact used to shape future work. It is not automatically part of the public release narrative.

Current draft locations include:

- `docs/plans/`
- `docs/strategy/`

Public docs should clearly separate:

- current public release line
- completed capability slices
- next slices
- planning drafts

## Current Local Draft Handling

Current repo-local planning drafts under `docs/plans/` and `docs/strategy/` should be treated conservatively.

- They may exist locally before being curated into tracked repo docs.
- They should not be assumed to be part of the public release narrative.
- They should not be batch-moved, batch-tracked, or batch-deleted without explicit human approval.
- The default policy is: keep them local until they are either promoted to tracked docs, archived intentionally, or discarded intentionally.
