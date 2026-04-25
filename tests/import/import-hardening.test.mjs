import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const ImportJobRuntime = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.0/import-job-runtime.js'));
const appSource = fs.readFileSync(path.join(repoRoot, 'literature-screening-v2.0/app.js'), 'utf8');

test('incremental worker formats do not allow whole-file parse fallback', () => {
  ['.csv', '.tsv', '.ris', '.nbib', '.enw'].forEach((ext) => {
    assert.equal(ImportJobRuntime.supportsIncrementalWorkerExt(ext), true, `${ext} should use streaming worker`);
    assert.equal(ImportJobRuntime.shouldAllowWholeFileParseFallback(ext), false, `${ext} must not fallback`);
  });

  ['.bib', '.bibtex', '.rdf', '.txt'].forEach((ext) => {
    assert.equal(ImportJobRuntime.shouldAllowWholeFileParseFallback(ext), true, `${ext} still uses explicit whole-file path`);
  });
});

test('parseFileInChunks throws on incremental worker failure instead of silently parsing whole file', () => {
  assert.match(
    appSource,
    /if \(supportsIncrementalWorkerFormat\(ext\)\) \{[\s\S]*?catch \(workerError\) \{\s*throw createIncrementalWorkerFailureError\(file, ext, workerError\);/m
  );
  assert.match(
    appSource,
    /catch \(workerError\) \{\s*if \(!shouldAllowWholeFileParseFallback\(ext\)\) \{\s*throw createIncrementalWorkerFailureError\(file, ext, workerError\);/m
  );
  assert.doesNotMatch(appSource, /Incremental worker parsing failed, falling back to whole-file parser/);
});

test('finalize import lifecycle cleans loading and progress when success UI finalization throws', async () => {
  const calls = [];
  const result = await ImportJobRuntime.finalizeImportLifecycle({ outcome: 'success' }, {
    completeSuccess: () => {
      calls.push('completeSuccess');
      throw new Error('detectColumns failed');
    },
    failImportJobs: (error) => {
      calls.push(`fail:${error.message}`);
    },
    showError: (_error, context) => {
      calls.push(`showError:${context.finalizationFailed}`);
    },
    hideProgress: () => {
      calls.push('hideProgress');
    },
    hideLoading: () => {
      calls.push('hideLoading');
    },
    persist: () => {
      calls.push('persist');
    },
  });

  assert.equal(result.status, ImportJobRuntime.IMPORT_JOB_STAGES.FAILED);
  assert.equal(result.finalizationFailed, true);
  assert.equal(result.errorShown, true);
  assert.deepEqual(calls, [
    'completeSuccess',
    'fail:detectColumns failed',
    'showError:true',
    'hideProgress',
    'hideLoading',
    'persist',
  ]);
});

test('legacy multi-file entries are compatibility wrappers for the single orchestrator', () => {
  const legacyWrapper = appSource.match(/function handleMultipleFiles\(files\) \{[\s\S]*?\n\}/m)?.[0] || '';

  assert.match(
    appSource,
    /function handleMultipleFiles\(files\) \{\s*return handleImportFiles\(files\);\s*\}/m
  );
  assert.match(
    appSource,
    /async function handleMultipleFilesV15\(files\) \{\s*return handleImportFiles\(files\);\s*\}/m
  );
  assert.match(appSource, /if \(files\.length > 0\) handleImportFiles\(files\);/);
  assert.doesNotMatch(legacyWrapper, /parseFileContent|FileReader|showLoading|hideLoading/);
});
