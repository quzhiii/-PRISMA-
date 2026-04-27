# Dedup vNext Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the vNext two-layer deduplication engine so the PRISMA tool preserves strict auto-delete safety while materially improving duplicate discovery in real systematic review workflows.

**Architecture:** Introduce one shared browser-and-Node-compatible dedup engine module, keep hard-duplicate auto-resolution strict, add a separate candidate-duplicate layer, and make every active code path call the same policy. Use Node's built-in test runner plus the benchmark fixture package to validate behavior before any rollout.

**Tech Stack:** Static HTML, vanilla JavaScript, Web Workers, Node 22 `node --test`, markdown benchmark assets, CSV/RDF fixture files.

---

## Assumptions To Lock Before Coding

- The implementation target is the current working-tree logic on branch `main`, but execution should freeze to a clean snapshot before changing behavior.
- There is no existing project-wide automated JS test harness in the repo, so the plan uses Node's built-in test runner.
- The first release should prioritize correctness, explainability, and auditability over maximum fuzzy-match recall.
- The first release should not introduce a black-box similarity engine.

---

### Task 1: Freeze the benchmark target and add execution scaffolding

**Files:**
- Create: `docs/benchmarks/dedup/frozen-target-2026-03-27.md`
- Create: `scripts/dedup/run-benchmark.mjs`
- Create: `scripts/dedup/load-records.mjs`
- Create: `tests/dedup/benchmark-smoke.test.mjs`
- Inspect: `docs/benchmarks/dedup/2026-03-27-interim-evaluation-report.md`
- Inspect: `tests/fixtures/dedup/benchmark-manifest.csv`

**Step 1: Write the failing benchmark smoke test**

Create `tests/dedup/benchmark-smoke.test.mjs` with assertions that:

- synthetic fixtures load successfully
- `real-rdf-001` is present in the manifest
- the benchmark runner exits non-zero if the target cannot be resolved

**Step 2: Run the smoke test to verify it fails**

Run:

```powershell
node --test tests/dedup/benchmark-smoke.test.mjs
```

Expected:

- FAIL because the benchmark runner and loader do not exist yet

**Step 3: Implement the fixture loader and benchmark runner**

`load-records.mjs` should:

- read CSV fixtures from `tests/fixtures/dedup/synthetic/`
- read RDF fixtures from `tests/fixtures/dedup/real/`
- return normalized plain objects without applying dedup logic

`run-benchmark.mjs` should:

- accept a `--target` argument such as `root-app`
- load the chosen engine module
- run fixtures through the engine
- print a structured JSON summary

**Step 4: Freeze the benchmark target in a document**

Write `docs/benchmarks/dedup/frozen-target-2026-03-27.md` with:

- branch name
- commit SHA
- working-tree status
- exact engine entrypoint to evaluate first

**Step 5: Re-run the smoke test**

Run:

```powershell
node --test tests/dedup/benchmark-smoke.test.mjs
```

Expected:

- PASS

**Step 6: Commit**

```powershell
git add docs/benchmarks/dedup/frozen-target-2026-03-27.md scripts/dedup/run-benchmark.mjs scripts/dedup/load-records.mjs tests/dedup/benchmark-smoke.test.mjs
git commit -m "test: add dedup benchmark scaffolding"
```

---

### Task 2: Preserve the metadata needed for research-grade dedup

**Files:**
- Modify: `app.js` in `parseRDFItem()` and related record mapping flow
- Modify: `literature-screening-v2.0/app.js` in `parseRDFItem()` and related record mapping flow
- Modify: `parser-worker.js` RDF parse and normalization path
- Modify: `literature-screening-v2.0/parser-worker.js` RDF parse and normalization path
- Create: `tests/dedup/record-normalization.test.mjs`

**Step 1: Write the failing normalization test**

Create tests that assert parsed records preserve:

- raw identifier value
- canonicalizable identifier value
- publication type
- language
- raw title
- normalized title

Include an RDF fixture assertion for `real-rdf-001`-style URL identifiers.

**Step 2: Run the test to verify it fails**

Run:

```powershell
node --test tests/dedup/record-normalization.test.mjs
```

Expected:

- FAIL because the current parsers collapse `dc:identifier` directly into `doi`
- FAIL because publication type and normalization metadata are incomplete

**Step 3: Modify parsing paths to preserve raw and normalized fields**

Update the parsing layer so each record can retain fields like:

```javascript
{
  identifier_raw: "https://link.cnki.net/doi/10.14055/...",
  doi: "https://link.cnki.net/doi/10.14055/...",
  publication_type: "journalArticle",
  language: "zh-CN",
  title: "中医优势病种按疗效价值付费改革效果分析",
  _normalized_title: "中医优势病种按疗效价值付费改革效果分析"
}
```

Do not remove existing fields yet; add what the engine needs.

**Step 4: Re-run the test**

Run:

```powershell
node --test tests/dedup/record-normalization.test.mjs
```

Expected:

- PASS

**Step 5: Commit**

```powershell
git add app.js literature-screening-v2.0/app.js parser-worker.js literature-screening-v2.0/parser-worker.js tests/dedup/record-normalization.test.mjs
git commit -m "feat: preserve raw metadata for dedup normalization"
```

---

### Task 3: Create the shared two-layer dedup engine module

**Files:**
- Create: `dedup-engine.js`
- Create: `tests/dedup/dedup-engine.test.mjs`
- Inspect: `docs/plans/2026-03-27-dedup-vnext-design.md`
- Inspect: `docs/benchmarks/dedup/adjudication-rubric.md`

**Step 1: Write the failing engine tests**

Create `tests/dedup/dedup-engine.test.mjs` to assert all of the following:

- DOI URL and raw DOI normalize to the same canonical identifier
- `link.cnki.net/doi/...` and `doi.org/...` collapse to the same canonical DOI payload when possible
- hard duplicates are auto-resolved only for safe cases
- likely duplicates are surfaced as candidates, not auto-deleted
- protocol vs. final article remains distinct
- conference abstract vs. final article remains distinct

**Step 2: Run the tests to verify they fail**

Run:

```powershell
node --test tests/dedup/dedup-engine.test.mjs
```

Expected:

- FAIL because `dedup-engine.js` does not exist yet

**Step 3: Implement the shared engine with a stable API**

`dedup-engine.js` should be usable from:

- browser pages via `window.DedupEngine`
- workers via `self.DedupEngine`
- Node benchmark scripts via `module.exports`

The minimal API should look like:

```javascript
const result = DedupEngine.run(records, {
  mode: 'default'
});

result = {
  retainedRecords,
  hardDuplicates,
  candidateDuplicates,
  stats,
  reasons
};
```

Include helpers for:

- `canonicalizeIdentifier()`
- `normalizeTitle()`
- `normalizePages()`
- `normalizePublicationType()`
- `computeHardDuplicateDecision()`
- `computeCandidateDecision()`

**Step 4: Re-run engine tests**

Run:

```powershell
node --test tests/dedup/dedup-engine.test.mjs
```

Expected:

- PASS

**Step 5: Commit**

```powershell
git add dedup-engine.js tests/dedup/dedup-engine.test.mjs
git commit -m "feat: add shared two-layer dedup engine"
```

---

### Task 4: Replace root and v2 app hard-dedup logic with the shared engine

**Files:**
- Modify: `index.html`
- Modify: `literature-screening-v2.0/workspace.html`
- Modify: `app.js` dedup block around the current `performScreening` flow
- Modify: `literature-screening-v2.0/app.js` dedup block around the current `performScreening` flow
- Create: `tests/dedup/app-integration.test.mjs`

**Step 1: Write the failing integration test**

Create tests that feed fixture records into the app-facing dedup wrapper and assert:

- hard duplicate counts are separated from candidate duplicate counts
- retained record counts match the engine output
- `real-rdf-001` duplicate count improves for the normalization cases already documented

**Step 2: Run the integration test to verify it fails**

Run:

```powershell
node --test tests/dedup/app-integration.test.mjs
```

Expected:

- FAIL because the app still runs inline dedup logic

**Step 3: Load the shared engine before app scripts**

Update both HTML entrypoints to load `dedup-engine.js` before `app.js`.

**Step 4: Replace inline dedup with `DedupEngine.run()`**

In both `app.js` files:

- remove the duplicated DOI/title-only inlined logic
- call the shared engine instead
- map engine results back into the existing screening result shape
- keep PRISMA counts backward-compatible where possible

**Step 5: Re-run the integration test**

Run:

```powershell
node --test tests/dedup/app-integration.test.mjs
```

Expected:

- PASS

**Step 6: Commit**

```powershell
git add index.html literature-screening-v2.0/workspace.html app.js literature-screening-v2.0/app.js tests/dedup/app-integration.test.mjs
git commit -m "feat: route app dedup through shared engine"
```

---

### Task 5: Unify quick-stats, export-only dedup, and worker fallback behavior

**Files:**
- Modify: `v1.7-core-patch.js`
- Modify: `literature-screening-v2.0/v1.7-core-patch.js`
- Modify: `parser-worker.js`
- Modify: `literature-screening-v2.0/parser-worker.js`
- Create: `tests/dedup/legacy-paths.test.mjs`

**Step 1: Write the failing legacy-path test**

Create tests that assert:

- quick dedup stats use the same normalization rules as the shared engine
- export-only dedup returns the same retained records as the shared engine hard-duplicate layer
- worker-side `DEDUP` behavior either matches the shared engine or is explicitly removed from active use

**Step 2: Run the test to verify it fails**

Run:

```powershell
node --test tests/dedup/legacy-paths.test.mjs
```

Expected:

- FAIL because quick/export paths and worker fallback paths still use custom logic

**Step 3: Replace duplicated legacy logic**

In both patch files:

- replace local DOI/title dedup loops with calls into the shared engine
- keep UI text and button behavior stable
- surface counts for `hardDuplicates` and `candidateDuplicates` where supported

In both worker files:

- either delegate `DEDUP` to the shared engine via `importScripts('dedup-engine.js')` or explicitly downgrade the worker to parse-only and document that decision
- remove silent rule drift

**Step 4: Re-run the test**

Run:

```powershell
node --test tests/dedup/legacy-paths.test.mjs
```

Expected:

- PASS

**Step 5: Commit**

```powershell
git add v1.7-core-patch.js literature-screening-v2.0/v1.7-core-patch.js parser-worker.js literature-screening-v2.0/parser-worker.js tests/dedup/legacy-paths.test.mjs
git commit -m "refactor: unify dedup behavior across legacy paths"
```

---

### Task 6: Add minimal candidate-duplicate output and export

**Files:**
- Modify: `index.html`
- Modify: `literature-screening-v2.0/workspace.html`
- Modify: `app.js`
- Modify: `literature-screening-v2.0/app.js`
- Create: `tests/dedup/candidate-output.test.mjs`

**Step 1: Write the failing candidate-output test**

Create tests that assert:

- candidate duplicates are counted separately from hard duplicates
- candidate duplicates can be exported to CSV
- records labeled `not duplicate` are not auto-removed
- duplicate reason labels are present in the exported candidate rows

**Step 2: Run the test to verify it fails**

Run:

```powershell
node --test tests/dedup/candidate-output.test.mjs
```

Expected:

- FAIL because the current UI exposes only one merged duplicate count

**Step 3: Add minimal user-facing output**

Implement only the minimum required output:

- a hard-duplicate count
- a candidate-duplicate count
- a candidate export button
- reason labels such as `canonical_doi_match`, `title_year_pages_match`, `needs_review_identifier_mismatch`

Do not build a full duplicate-review UI in this task.

**Step 4: Re-run the test**

Run:

```powershell
node --test tests/dedup/candidate-output.test.mjs
```

Expected:

- PASS

**Step 5: Manual browser verification**

Run:

```powershell
python -m http.server 8000
```

Then verify in the browser:

- root entry flow still loads
- v2 workspace still loads
- duplicate counts split correctly
- candidate export downloads successfully

**Step 6: Commit**

```powershell
git add index.html literature-screening-v2.0/workspace.html app.js literature-screening-v2.0/app.js tests/dedup/candidate-output.test.mjs
git commit -m "feat: expose candidate duplicate outputs"
```

---

### Task 7: Re-run the benchmark suite and update evaluation artifacts

**Files:**
- Modify: `docs/benchmarks/dedup/scoring-template.csv`
- Modify: `docs/benchmarks/dedup/evaluation-report-template.md`
- Modify: `docs/benchmarks/dedup/2026-03-27-interim-evaluation-report.md`
- Create: `docs/benchmarks/dedup/post-implementation-benchmark-report.md`
- Create: `tests/dedup/benchmark-regression.test.mjs`

**Step 1: Write the failing benchmark regression test**

Create a test that asserts the vNext engine improves at least these benchmark cases:

- `dedup-case-002`
- `dedup-case-007`
- `real-rdf-001` missed DOI normalization group

while preserving no false positives for:

- `dedup-case-008`
- `dedup-case-009`
- `dedup-case-011`

**Step 2: Run the regression test to verify current failures**

Run:

```powershell
node --test tests/dedup/benchmark-regression.test.mjs
```

Expected:

- FAIL before the prior tasks are complete
- PASS after the engine and UI integration are complete

**Step 3: Run the benchmark runner against the full fixture set**

Run:

```powershell
node scripts/dedup/run-benchmark.mjs --target root-app
```

Expected:

- structured output with hard duplicates, candidate duplicates, and retained records

**Step 4: Update the benchmark artifacts**

- record the new numbers in `scoring-template.csv`
- write the final results to `post-implementation-benchmark-report.md`
- update the evaluation template or final evaluation report with actual measured values

**Step 5: Commit**

```powershell
git add docs/benchmarks/dedup/scoring-template.csv docs/benchmarks/dedup/evaluation-report-template.md docs/benchmarks/dedup/2026-03-27-interim-evaluation-report.md docs/benchmarks/dedup/post-implementation-benchmark-report.md tests/dedup/benchmark-regression.test.mjs scripts/dedup/run-benchmark.mjs
git commit -m "test: rerun dedup benchmark and capture vNext results"
```

---

## Final Acceptance Checklist

- [ ] One shared dedup engine powers all active paths
- [ ] Hard duplicates and candidate duplicates are split cleanly
- [ ] Auto-delete remains conservative
- [ ] Real RDF identifier normalization cases improve
- [ ] Candidate export exists
- [ ] Benchmark runner is repeatable
- [ ] Synthetic benchmark regressions pass
- [ ] Real dataset benchmark rerun is documented

---

## Execution Notes

- Do not start by editing UI copy. Start by making the engine benchmarkable.
- Do not broaden auto-delete before the benchmark regression tests are in place.
- Do not leave `parser-worker.js` on a different dedup policy than `app.js`.
- If the benchmark shows new false positives after candidate logic is added, tighten the hard-duplicate layer before proceeding.
