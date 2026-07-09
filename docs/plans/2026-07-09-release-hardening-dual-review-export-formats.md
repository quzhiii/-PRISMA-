# Release Hardening: Dual Review and Export Formats Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the current V2.5 / P6 packaging line by proving the dual-review path works end-to-end and making result-table exports selectable by format.

**Architecture:** Keep this as a release-hardening slice before commercial validation. Restore and test UI controls that `app.js` already depends on, then wrap result-table exports behind small selector helpers that reuse the existing `downloadFile(type)` export registry instead of creating a parallel export system.

**Tech Stack:** Browser-only HTML/CSS/JavaScript, Node test runner, local-first static assets under `literature-screening-v2.2/`.

---

### Task 1: Restore Dual-review Controls

**Files:**
- Modify: `literature-screening-v2.2/workspace.html`
- Test: `tests/audit/audit-workflow.test.mjs`

**Step 1: Write the failing test**

Add a regression test that checks `workspace.html` provides every DOM id used by `setReviewMode()` and `switchReviewer()`:

```js
test('workspace exposes dual-review mode controls required by app.js', async () => {
  const [source, workspaceHtml] = await Promise.all([
    readV22App(),
    readV22File('workspace.html'),
  ]);

  ['single-mode-btn', 'dual-mode-btn', 'dual-review-setup', 'reviewer-a-btn', 'reviewer-b-btn'].forEach((id) => {
    assert.match(source, new RegExp(`getElementById\\('${id}'\\)`), `app.js expects #${id}`);
    assert.match(workspaceHtml, new RegExp(`id="${id}"`), `workspace.html should provide #${id}`);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/audit/audit-workflow.test.mjs`

Expected: FAIL because `workspace.html` does not provide the expected dual-review controls.

**Step 3: Restore minimal UI**

Add a Step 4 review-mode panel with:

- `single-mode-btn`
- `dual-mode-btn`
- `dual-review-setup`
- `reviewer-a-name`
- `reviewer-b-name`
- `reviewer-a-btn`
- `reviewer-b-btn`

Wire buttons to existing `setReviewMode('single')`, `setReviewMode('dual')`, `switchReviewer('A')`, and `switchReviewer('B')`.

**Step 4: Run test to verify it passes**

Run: `node --test tests/audit/audit-workflow.test.mjs`

Expected: PASS.

---

### Task 2: Add Selectable Result-table Export Formats

**Files:**
- Modify: `literature-screening-v2.2/workspace.html`
- Modify: `literature-screening-v2.2/app.js`
- Test: `tests/audit/audit-export.test.mjs`

**Step 1: Write the failing test**

Add a regression test that proves Step 6 exposes selectable formats and app.js maps selector values to existing export types:

```js
test('v2.2 app exposes result-table export format selectors', async () => {
  const [source, workspaceHtml] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'literature-screening-v2.2/app.js'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'literature-screening-v2.2/workspace.html'), 'utf8'),
  ]);

  assert.match(source, /function downloadResultTableExport\(kind\)/);
  assert.match(source, /function getResultTableExportType\(kind, format\)/);
  assert.match(workspaceHtml, /id="included-export-format"/);
  assert.match(workspaceHtml, /id="excluded-export-format"/);
  assert.match(workspaceHtml, /onclick="downloadResultTableExport\('included'\)"/);
  assert.match(workspaceHtml, /onclick="downloadResultTableExport\('excluded'\)"/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/audit/audit-export.test.mjs`

Expected: FAIL because the selector helper and UI selectors do not exist yet.

**Step 3: Implement selector wrapper**

Add small helpers in `app.js`:

```js
function getResultTableExportType(kind, format) {
  const normalizedKind = kind === 'excluded' ? 'excluded' : 'included';
  const normalizedFormat = format === 'ris' ? 'ris' : 'csv';
  return normalizedFormat === 'ris' ? `${normalizedKind}_ris` : normalizedKind;
}

function downloadResultTableExport(kind) {
  const normalizedKind = kind === 'excluded' ? 'excluded' : 'included';
  const formatSelect = document.getElementById(`${normalizedKind}-export-format`);
  const exportType = getResultTableExportType(normalizedKind, formatSelect ? formatSelect.value : 'csv');
  downloadFile(exportType);
}
```

Update Step 6 result-table controls to use `included-export-format` and `excluded-export-format` selectors with `CSV` and `RIS` options.

**Step 4: Run test to verify it passes**

Run: `node --test tests/audit/audit-export.test.mjs`

Expected: PASS.

---

### Task 3: Full Verification

**Files:**
- Verify only; no new files.

**Step 1: Run targeted tests**

Run: `node --test tests/audit/audit-workflow.test.mjs tests/audit/audit-export.test.mjs`

Expected: PASS.

**Step 2: Run full regression**

Run: `node tests/run-all-regressions.js`

Expected: PASS.

**Step 3: Run diff check**

Run: `git diff --check`

Expected: no diff errors; CRLF warnings are acceptable on Windows.

---

### Task 4: Commit and Push

**Files:**
- Commit all files touched in this hardening slice.

**Step 1: Inspect status and diff**

Run: `git status --short`

Run: `git diff -- literature-screening-v2.2/app.js literature-screening-v2.2/workspace.html tests/audit/audit-workflow.test.mjs tests/audit/audit-export.test.mjs docs/plans/2026-07-09-release-hardening-dual-review-export-formats.md`

**Step 2: Commit**

Run: `git add -- literature-screening-v2.2/app.js literature-screening-v2.2/workspace.html tests/audit/audit-workflow.test.mjs tests/audit/audit-export.test.mjs docs/plans/2026-07-09-release-hardening-dual-review-export-formats.md`

Run: `git commit -m "fix: harden dual review flow and export format selection"`

**Step 3: Push**

Run: `git push`

Expected: push uses configured SSH push remote.
