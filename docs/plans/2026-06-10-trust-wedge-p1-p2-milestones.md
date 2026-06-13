# Trust Wedge P1 P2 Milestones Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Execute the next roadmap phase by starting with P1 `Defense-ready audit pack` and then deepening P2 `Chinese-source trust depth`, while keeping the product local-first, audit-ready, and free of backend, account, billing, or automatic-final-decision scope.

**Architecture:** Reuse the existing `literature-screening-v2.2/` compatibility path and treat P1 as a new export-layer slice, not a new workflow. The first milestone adds one new defense-ready Markdown export that composes existing audit, dual-review, quality, AI-boundary, and source-reliability evidence into a single appendix-friendly package. P2 then strengthens the underlying evidence inputs through fixture-backed Chinese-source hardening, richer reliability summaries, and conservative warning presentation.

**Tech Stack:** Browser-side JavaScript, existing `audit-engine.js`, `dual-review-engine.js`, `app.js`, `workspace.html`, Node `node:test` regression suite, Markdown docs, fixture-backed parser tests.

---

## Milestone Overview

### Milestone 1: Defense-ready Audit Pack

Deliver one new local export file, `DEFENSE_AUDIT_PACK.md`, that combines:

- project / PRISMA / audit metadata
- dual-review conflict and agreement summary
- quality appraisal and evidence-export status summary
- AI transparency boundary summary
- Chinese-source reliability warning summary
- appendix-friendly narrative blocks suitable for reviewer response / thesis defense / methods appendix reuse
- page version-label normalization so in-page modules stop presenting `V2.4` / `V2.6` as current release labels and instead follow the public `V2.5` release line plus capability-slice wording

### Milestone 2: Chinese-source Trust Depth

Deepen the evidence layer that feeds Milestone 1 by adding:

- stronger fixture coverage for CNKI / Wanfang / VIP / SinoMed variants
- richer import-reliability summary output
- clearer conservative wording in UI / export surfaces
- no automatic decision changes from source-quality warnings

---

## Milestone 1 Scope Contract

Milestone 1 does **not** add:

- backend sync
- cloud collaboration
- account system
- payment code
- AI-generated final screening decisions
- manuscript auto-writing beyond evidence summary packaging

Milestone 1 **does** add one defense-facing evidence export built entirely from already local data.

---

### Task 1: Freeze P1 Export Contract In Tests

**Files:**
- Modify: `tests/audit/audit-export.test.mjs`
- Modify: `tests/audit/audit-workflow.test.mjs`
- Read for context: `literature-screening-v2.2/audit-engine.js`
- Read for context: `literature-screening-v2.2/app.js`
- Read for context: `literature-screening-v2.2/workspace.html`

**Step 1: Write failing engine-level tests for a defense-ready Markdown pack**

Add a new test in `tests/audit/audit-export.test.mjs` that requires a new audit-engine export builder, for example:

```js
test('builds defense-ready audit pack markdown with dual-review and source-reliability summary', () => {
  const pack = AuditEngine.buildDefenseReadyAuditPackMarkdown(...);
  assert.match(pack, /DEFENSE_AUDIT_PACK/);
  assert.match(pack, /Defense-ready audit pack/);
  assert.match(pack, /Dual-review resolution summary/);
  assert.match(pack, /Chinese-source reliability summary/);
  assert.match(pack, /These warnings do not automatically change screening decisions/);
});
```

Cover at least:

- pack title and local-first wording
- appendix / defense / reviewer-response usage wording
- unresolved conflict counts and agreement metrics
- audit summary / PRISMA count references
- source-quality warning counts
- AI boundary wording that keeps human decision authority explicit

**Step 2: Write failing app/UI contract tests**

In `tests/audit/audit-export.test.mjs` and/or `tests/audit/audit-workflow.test.mjs`, require:

- a new export type key such as `defense_audit_pack`
- `downloadFile('defense_audit_pack')`
- filename `DEFENSE_AUDIT_PACK.md`
- export button label in `workspace.html`
- version-label normalization across `literature-screening-v2.2/index.html`, `workspace.html`, and `landing.html`
- no in-page module heading or export explainer should present `V2.4` / `V2.6` as the current version label for a section-level capability
- capability names such as `Quality appraisal`, `Reviewer Bundle protocol`, `Conservative AI foundation`, `PRISMA-trAIce`, and `Chinese-source reliability` may remain when framed as capability slices instead of current-version badges

**Step 3: Run targeted tests to verify RED**

Run:

```powershell
node --test tests/audit/audit-export.test.mjs tests/audit/audit-workflow.test.mjs
```

Expected: FAIL because the new pack builder / app export wiring does not exist yet.

---

### Task 2: Implement Defense-ready Pack In The Audit Layer

**Files:**
- Modify: `literature-screening-v2.2/audit-engine.js`
- Test: `tests/audit/audit-export.test.mjs`

**Step 1: Add minimal helper functions in `audit-engine.js`**

Add pure helpers for:

- summarizing source-quality warnings from exported records / summary input
- summarizing dual-review agreement / conflict gate input
- formatting appendix-friendly sections in Markdown

Keep the logic in `audit-engine.js`, not `app.js`.

**Step 2: Add `buildDefenseReadyAuditPackMarkdown(...)`**

Implement one builder that accepts structured inputs such as:

- `manifestInput`
- `events`
- `decisions`
- `dualReviewSummary`
- `sourceReliabilitySummary`
- `qualitySummary`
- `aiSuggestionEvents`
- `options`

The output should include sections like:

- `# Defense-ready Audit Pack`
- project / schema / PRISMA metadata
- `## Executive Summary`
- `## PRISMA Counts`
- `## Dual-review Resolution Summary`
- `## Quality Appraisal And Evidence Exports`
- `## Chinese-source Reliability Summary`
- `## AI Boundary Summary`
- `## Appendix-ready Notes`

Keep wording conservative and evidence-facing.

**Step 3: Export the new builder from `audit-engine.js`**

Make sure the returned module object exposes `buildDefenseReadyAuditPackMarkdown`.

**Step 4: Run targeted tests to verify GREEN**

Run:

```powershell
node --test tests/audit/audit-export.test.mjs
```

Expected: PASS for the new engine-level pack tests.

---

### Task 3: Wire The New Export Into The Workspace

**Files:**
- Modify: `literature-screening-v2.2/app.js`
- Modify: `literature-screening-v2.2/workspace.html`
- Test: `tests/audit/audit-export.test.mjs`

**Step 1: Add a new export type**

Extend the export wiring with a new type:

- `defense_audit_pack`

It should be treated as a local evidence export, not a final-decision generator.

**Step 2: Build a minimal composition layer in `app.js`**

Add one helper that composes data for the audit-engine builder using current in-memory state:

- `projectManifest`
- `auditEvents`
- `screeningDecisions`
- `aiSuggestionEvents`
- `dualReviewConflictState`
- reliability summary derived from `uploadedData`
- quality summary derived from `qualityAssessments`

Do not move business logic into `app.js`; just gather inputs and call the engine.

**Step 3: Add download wiring**

Add:

- `buildAuditExportContent('defense_audit_pack')`
- `filename = 'DEFENSE_AUDIT_PACK.md'`
- audit event emission such as `defense_audit_pack_export_generated`

**Step 4: Add UI entry in `workspace.html`**

Add one button in the audit package section with bilingual label, for example:

- `Defense-ready Audit Pack`
- `答辩 / 附录审计包`

At the same time, normalize in-page version wording so:

- the current public release line remains `V2.5`
- section cards and module panels use capability labels instead of `V2.4` / `V2.6` version badges
- any retained `V2.6` reference is limited to public roadmap context outside the page shell or converted to capability wording such as `Conservative AI foundation` / `PRISMA-trAIce transparency`

**Step 5: Run targeted tests to verify GREEN**

Run:

```powershell
node --test tests/audit/audit-export.test.mjs tests/audit/audit-workflow.test.mjs
```

Expected: PASS.

---

### Task 4: Document Milestone 1 Boundary And Readiness

**Files:**
- Modify: `docs/ROADMAP_2026.md`
- Modify: `README.md`
- Modify: `README_EN.md`
- Optionally create: `docs/checklists/V2.5_DEFENSE_READY_AUDIT_PACK_CHECKLIST.md`
- Test: `tests/audit/audit-workflow.test.mjs`

**Step 1: Update roadmap wording conservatively**

Clarify that P1 now starts with a local defense-ready pack export slice, not a backend or commercial feature.

**Step 2: Update public docs only if needed**

Add minimal wording that this pack is an evidence packaging enhancement on the current compatibility path.

**Step 3: Add / update checklist if useful**

If a checklist is added, keep it short and focused on:

- export exists
- uses local data only
- does not change final decisions
- full regression passes

**Step 4: Run doc guards**

Run:

```powershell
node --test tests/audit/audit-workflow.test.mjs
```

Expected: PASS.

---

## Milestone 2 Scope Contract

Milestone 2 deepens Chinese-source reliability **after** Milestone 1 is green. It does not change the rule that source-quality warnings are advisory-only.

---

### Task 5: Expand Chinese-source Fixture Coverage

**Files:**
- Modify/Create: `fixtures/chinese-source/*`
- Modify: `tests/import/import-hardening.test.mjs`
- Modify: `tests/import/parser-chunk-boundary.test.mjs`
- Read for context: `docs/design/CHINESE_SOURCE_COMPATIBILITY.md`

**Step 1: Add one failing test per new reliability case**

Examples:

- Wanfang combined year/volume/issue edge case
- VIP mixed Chinese/English headers edge case
- SinoMed partial source mapping edge case
- CNKI abstract noise false-positive guard

**Step 2: Run targeted tests to verify RED**

Run the specific import tests that cover the new fixture.

**Step 3: Add minimal fixture files**

Create only the representative fixtures needed for the failing tests.

**Step 4: Implement minimal parser / normalization changes**

Prefer small changes in parser / normalization code over broad heuristics.

**Step 5: Run targeted tests to verify GREEN**

Run:

```powershell
node --test tests/import/import-hardening.test.mjs tests/import/parser-chunk-boundary.test.mjs
```

---

### Task 6: Feed Richer Reliability Summary Into P1 Pack

**Files:**
- Modify: `literature-screening-v2.2/app.js`
- Modify: `literature-screening-v2.2/audit-engine.js`
- Test: `tests/audit/audit-export.test.mjs`

**Step 1: Write a failing test for richer reliability summary content**

Require the defense pack to mention the refined warning summary from P2 inputs.

**Step 2: Implement the minimal summary enrichment**

Examples:

- counts by source database
- counts by warning type
- conservative note that warnings are import-quality signals, not screening decisions

**Step 3: Run targeted tests to verify GREEN**

---

### Task 7: Final Verification For The Combined Milestone Track

**Files:**
- Verify only

**Step 1: Run milestone-level targeted suites**

```powershell
node --test tests/audit/audit-export.test.mjs tests/audit/audit-workflow.test.mjs tests/import/import-hardening.test.mjs tests/import/parser-chunk-boundary.test.mjs
```

**Step 2: Run full regression**

```powershell
node tests\run-all-regressions.js
```

**Step 3: Run diff hygiene**

```powershell
git diff --check
```

**Step 4: Summarize milestone outcome**

Capture:

- what shipped in Milestone 1
- what shipped in Milestone 2
- what remains for later P1/P2 hardening

---

## Recommended Execution Order

1. Task 1-4 as Milestone 1 (`Defense-ready audit pack`)
2. Task 5-6 as Milestone 2 (`Chinese-source trust depth` feeding the pack)
3. Task 7 full verification

## Natural Milestone Deliverables

- Milestone 1 deliverable: `DEFENSE_AUDIT_PACK.md` export available in workspace
- Milestone 2 deliverable: stronger Chinese-source fixtures + richer reliability summary in that pack
- Verification deliverable: green targeted suites + green full regression
