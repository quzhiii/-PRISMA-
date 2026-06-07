# V2.6 Queue Controls Docs Refresh And Guard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refresh public V2.6 wording so it reflects the current Step 3 advisory queue controls while explicitly preserving the conservative AI boundary and preventing any drift toward “automatic AI screening” claims.

**Architecture:** Treat this as a docs-and-regression slice only. Update README, README_EN, roadmap, and positioning copy to mention queue labels, summary, sorting, review-state filters, and empty-state polish as in-progress local advisory controls, then add audit-workflow assertions that keep V2.6 framed as advisory-only and not the current public release.

**Tech Stack:** Markdown docs, Node test runner, existing audit workflow doc-regression tests.

---

## Scope

In scope:
- `README.md`
- `README_EN.md`
- `docs/ROADMAP_2026.md`
- `docs/PRODUCT_POSITIONING_2026.md`
- `tests/audit/audit-workflow.test.mjs`

Out of scope:
- App logic changes.
- New V2.6 workflow functionality.
- Release-line changes.
- Provider or API behavior changes.

## Acceptance Criteria

- Public docs mention current V2.6 Step 3 advisory queue controls.
- Public docs still describe V2.6 as in progress, local, advisory-only, and human-confirmed.
- Regression tests fail if docs later drift toward “automatic AI screening” or “current public release line” language for V2.6.

## Task 1: Add RED Tests For V2.6 Docs Guard

**Files:**
- Modify: `tests/audit/audit-workflow.test.mjs`

**Step 1: Write the failing assertions**

Extend the existing V2.6 public-doc test to assert that docs mention:
- advisory queue controls
- queue summary
- priority sorting
- review-state filters
- empty-state clarity

Also assert docs do not claim:
- automatic AI screening
- auto-final decisions
- current public release line for V2.6

**Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests/audit/audit-workflow.test.mjs
```

Expected: FAIL because docs do not yet describe the newer Step 3 queue controls.

## Task 2: Refresh Public V2.6 Docs

**Files:**
- Modify: `README.md`
- Modify: `README_EN.md`
- Modify: `docs/ROADMAP_2026.md`
- Modify: `docs/PRODUCT_POSITIONING_2026.md`

**Step 1: Update concise public copy**

Add brief wording that V2.6 currently includes:
- Step 3 advisory queue
- queue labels
- queue summary
- priority sorting
- review-state filters
- empty-state polish

Keep wording concise and explicitly advisory-only.

**Step 2: Reconfirm boundary language**

Preserve or strengthen phrases that say:
- real provider dispatch remains disabled by default
- final decisions remain human-confirmed
- V2.6 is not the current public release line
- PRISMA Workbench is not a one-click automatic systematic review tool

**Step 3: Run tests to verify GREEN**

Run:

```powershell
node --test tests/audit/audit-workflow.test.mjs
```

Expected: PASS.

## Task 3: Verify And Commit

**Files:**
- Files from Task 1 and Task 2.

**Step 1: Run full regression**

Run:

```powershell
node tests/run-all-regressions.js
```

**Step 2: Commit**

```powershell
git add docs/plans/2026-06-06-v2-6-docs-refresh-and-guard.md README.md README_EN.md docs/ROADMAP_2026.md docs/PRODUCT_POSITIONING_2026.md tests/audit/audit-workflow.test.mjs
git commit -m "docs: refresh v2.6 queue controls status"
```
