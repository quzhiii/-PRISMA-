# V2.6 Conservative AI Foundation Closeout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close V2.6 as a completed local conservative AI foundation slice while preserving the V2.5 public release boundary and advisory-only AI constraints.

**Architecture:** Treat this as a docs-and-guard closeout slice. Update public docs and design notes from `in progress` to `completed foundation slice`, keep V2.5 marked as the current public release line, and extend audit workflow tests so future wording cannot drift into automatic AI screening, real provider enablement, or V2.6-as-current-public-release claims.

**Tech Stack:** Markdown docs, static PRISMA Workbench docs, Node test runner with `node:test` assertions.

---

## Scope

In scope:
- Update `README.md`, `README_EN.md`, `docs/ROADMAP_2026.md`, `docs/PRODUCT_POSITIONING_2026.md`, and `docs/design/CONSERVATIVE_AI_DESIGN.md`.
- Mark V2.6 Conservative AI as a completed foundation slice, not a full automatic screening product.
- Keep V2.5 as the current public release line.
- Record latest full regression evidence as `151/151` passed.
- Add regression guards for completed V2.6 wording and conservative boundaries.

Out of scope:
- New app functionality.
- Real provider dispatch, backend accounts, cloud sync, or API key input.
- Automatic final `ScreeningDecision` creation.
- PRISMA count behavior changes.
- Merging the branch or creating a PR.

## Acceptance Criteria

- Public docs say V2.6 is a completed local conservative AI foundation slice.
- Public docs still say V2.5 is the current public release line.
- Public docs mention local advisory suggestions, prioritisation, uncertainty flags, prompt registry trace, Step 3 queue controls, and audit summary/PRISMA-trAIce queue summaries.
- Public docs do not claim automatic AI screening, real provider dispatch, or V2.6 as the current public release line.
- Tests fail before the docs update and pass afterward.
- Full regression passes before commit.

## Task 1: Add RED Guards For V2.6 Closeout

**Files:**
- Modify: `tests/audit/audit-workflow.test.mjs`

**Step 1: Write the failing tests**

Change the existing V2.6 public docs test to assert:

```js
assert.match(readme, /V2\.6 \| 已完成：本地保守 AI foundation slice/);
assert.match(readmeEn, /V2\.6 \| Completed: local conservative AI foundation slice/);
assert.match(roadmap, /Current status: V2\.6 local conservative AI foundation slice is completed/);
assert.match(positioning, /V2\.6 Conservative AI \| 已完成 foundation slice/);
assert.match(conservativeAiDesign, /Last updated: 2026-06-07/);
assert.match(conservativeAiDesign, /V2\.6 foundation slice completed implementation/);
```

Also add negative guards:

```js
assert.doesNotMatch(readme, /V2\.6.*当前公开版本线/);
assert.doesNotMatch(readmeEn, /V2\.6.*Current public release line/);
assert.doesNotMatch(readme, /自动 AI screening/);
assert.doesNotMatch(readmeEn, /automatic AI screening/);
assert.doesNotMatch(roadmap, /real provider dispatch enabled by default/i);
```

**Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests/audit/audit-workflow.test.mjs
```

Expected: FAIL because docs still describe V2.6 as in progress.

## Task 2: Update Public Docs For Completed Foundation Slice

**Files:**
- Modify: `README.md`
- Modify: `README_EN.md`
- Modify: `docs/ROADMAP_2026.md`
- Modify: `docs/PRODUCT_POSITIONING_2026.md`
- Modify: `docs/design/CONSERVATIVE_AI_DESIGN.md`

**Step 1: Update README status tables**

Change V2.6 rows from `进行中` / `In progress` to `已完成` / `Completed` foundation slice wording. Include:
- local advisory suggestions
- prioritisation
- uncertainty flags
- prompt registry trace
- Step 3 advisory queue controls
- PRISMA-trAIce / audit summary queue summaries
- disabled real provider dispatch
- human-confirmed final decisions

**Step 2: Update regression evidence**

Change latest regression result lines from V2.5.1 `134/134` to V2.6 foundation `151/151`.

**Step 3: Update roadmap and positioning**

Mark V2.6 foundation tasks as completed while preserving constraints:
- no default cloud API
- no silent exclusions
- no human-decision override
- all AI outputs exportable

**Step 4: Update design note**

Change `Last updated` to `2026-06-07` and `current implementation` to `completed implementation`.

## Task 3: Verify And Commit

**Files:**
- Files from Task 1 and Task 2.

**Step 1: Run targeted guard test**

Run:

```powershell
node --test tests/audit/audit-workflow.test.mjs
```

Expected: PASS.

**Step 2: Run full regression**

Run:

```powershell
node tests/run-all-regressions.js
```

Expected: all tests pass.

**Step 3: Commit**

```powershell
git add docs/plans/2026-06-07-v2-6-foundation-closeout.md README.md README_EN.md docs/ROADMAP_2026.md docs/PRODUCT_POSITIONING_2026.md docs/design/CONSERVATIVE_AI_DESIGN.md tests/audit/audit-workflow.test.mjs
git commit -m "docs: close out v2.6 conservative ai foundation"
```
