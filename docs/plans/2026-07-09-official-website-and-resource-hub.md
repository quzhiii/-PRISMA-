# Official Website and Resource Hub Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split PRISMA Workbench's release-facing website from the working app so users see clear product paths before opening raw resources or the workspace.

**Architecture:** Keep this static-first on GitHub Pages. Add a curated `resources.html` hub under `literature-screening-v2.2/`, keep `workspace.html` focused on review execution, keep `login.html` as the dual-review entry, and update roadmap copy so commercial validation uses the cleaner website structure.

**Tech Stack:** Static HTML/CSS/JavaScript, Node test runner, GitHub Pages-compatible relative links.

---

### Task 1: Add Resource Hub Guard

**Files:**
- Modify: `tests/audit/audit-workflow.test.mjs`

**Step 1: Write the failing test**

Add a test that expects:

- `literature-screening-v2.2/resources.html` exists
- `index.html` and `landing.html` link to it
- the resources page explains `public demo dataset`, `benchmark package`, and `paper skeleton`
- raw files such as `sample-data.json` are linked only from the curated resources page

**Step 2: Run test to verify it fails**

Run: `node --test tests/audit/audit-workflow.test.mjs`

Expected: FAIL because `resources.html` does not exist yet.

---

### Task 2: Create Static Resources Hub

**Files:**
- Create: `literature-screening-v2.2/resources.html`
- Modify: `literature-screening-v2.2/index.html`
- Modify: `literature-screening-v2.2/landing.html`

**Step 1: Implement the page**

Create a static bilingual page with:

- product nav back to `index.html`, `workspace.html`, and `login.html`
- an explanation of V3 release-preparation assets
- cards for public demo dataset, benchmark package, and paper skeleton
- explicit raw links only after explanatory text

**Step 2: Update release-facing links**

Add `resources.html` to the home and overview page action areas. Keep raw JSON / Markdown links out of the home-page hero.

**Step 3: Run targeted test**

Run: `node --test tests/audit/audit-workflow.test.mjs`

Expected: PASS.

---

### Task 3: Roadmap Synchronization

**Files:**
- Modify: `docs/ROADMAP_2026.md`

**Step 1: Add release hardening status**

Document that homepage entry cleanup, dual-review entry visibility, and `CSV / RIS / BibTeX` export selection are complete.

**Step 2: Add formal website direction**

Document the next website split:

- official product website
- app workspace
- dual-review entry
- resources hub
- benchmarks / papers / docs

**Step 3: Keep version boundary unchanged**

Do not rename the current public release line away from V2.5.

---

### Task 4: Verification and Commit

**Files:**
- Verify all changed files.

**Step 1: Run targeted tests**

Run: `node --test tests/audit/audit-workflow.test.mjs`

Expected: PASS.

**Step 2: Run full regression**

Run: `node tests/run-all-regressions.js`

Expected: PASS.

**Step 3: Run diff check**

Run: `git diff --check`

Expected: no errors.

**Step 4: Commit and push**

Run: `git add -- literature-screening-v2.2/resources.html literature-screening-v2.2/index.html literature-screening-v2.2/landing.html docs/ROADMAP_2026.md docs/plans/2026-07-09-official-website-and-resource-hub.md tests/audit/audit-workflow.test.mjs`

Run: `git commit -m "docs: add formal website resource hub plan"`

Run: `git push origin main`
