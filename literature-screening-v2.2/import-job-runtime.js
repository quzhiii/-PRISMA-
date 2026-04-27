(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === 'object') {
    root.ImportJobRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const IMPORT_JOB_STAGES = Object.freeze({
    QUEUED: 'queued',
    READING: 'reading',
    PARSING: 'parsing',
    NORMALIZING: 'normalizing',
    WRITING: 'writing',
    DEDUP_PREP: 'dedup_prep',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
  });

  const TERMINAL_STAGES = new Set([
    IMPORT_JOB_STAGES.COMPLETED,
    IMPORT_JOB_STAGES.FAILED,
    IMPORT_JOB_STAGES.CANCELLED,
  ]);
  const INCREMENTAL_WORKER_EXTENSIONS = Object.freeze(['.csv', '.tsv', '.ris', '.nbib', '.enw']);

  function createImportJob(input) {
    const payload = input || {};
    const now = payload.timestamp || new Date().toISOString();

    return {
      id: payload.id || buildImportJobId(payload.fileName),
      project_id: payload.projectId || null,
      file_name: payload.fileName || 'unknown',
      file_size: Number.isFinite(payload.fileSize) ? payload.fileSize : 0,
      format: payload.format || 'unknown',
      stage: isKnownStage(payload.stage) ? payload.stage : IMPORT_JOB_STAGES.QUEUED,
      bytes_read: Number.isFinite(payload.bytesRead) ? payload.bytesRead : 0,
      records_parsed: Number.isFinite(payload.recordsParsed) ? payload.recordsParsed : 0,
      records_written: Number.isFinite(payload.recordsWritten) ? payload.recordsWritten : 0,
      checkpoint_json: payload.checkpoint || null,
      error: payload.error || '',
      started_at: payload.startedAt || now,
      updated_at: now,
    };
  }

  function patchImportJob(existing, patch) {
    const current = existing || createImportJob();
    const next = patch || {};

    return {
      ...current,
      project_id: next.projectId !== undefined ? next.projectId : current.project_id,
      file_name: next.fileName !== undefined ? next.fileName : current.file_name,
      file_size: Number.isFinite(next.fileSize) ? next.fileSize : current.file_size,
      format: next.format !== undefined ? next.format : current.format,
      stage: isKnownStage(next.stage) ? next.stage : current.stage,
      bytes_read: Number.isFinite(next.bytesRead) ? next.bytesRead : current.bytes_read,
      records_parsed: Number.isFinite(next.recordsParsed) ? next.recordsParsed : current.records_parsed,
      records_written: Number.isFinite(next.recordsWritten) ? next.recordsWritten : current.records_written,
      checkpoint_json: next.checkpoint !== undefined ? next.checkpoint : current.checkpoint_json,
      error: next.error !== undefined ? next.error : current.error,
      updated_at: next.updatedAt || new Date().toISOString(),
    };
  }

  function summarizeImportJobs(jobs) {
    const list = Array.isArray(jobs) ? jobs : [];
    const byStage = {};
    let activeCount = 0;
    let completedCount = 0;
    let failedCount = 0;

    list.forEach((job) => {
      const stage = job && isKnownStage(job.stage) ? job.stage : IMPORT_JOB_STAGES.QUEUED;
      byStage[stage] = (byStage[stage] || 0) + 1;

      if (stage === IMPORT_JOB_STAGES.COMPLETED) {
        completedCount += 1;
      } else if (stage === IMPORT_JOB_STAGES.FAILED) {
        failedCount += 1;
      } else if (!TERMINAL_STAGES.has(stage)) {
        activeCount += 1;
      }
    });

    return {
      totalJobs: list.length,
      activeCount,
      completedCount,
      failedCount,
      byStage,
      latestJob: list.length > 0 ? list[list.length - 1] : null,
    };
  }

  function isKnownStage(stage) {
    return Object.values(IMPORT_JOB_STAGES).includes(stage);
  }

  function normalizeImportExtension(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return '';

    if (normalized.startsWith('.')) {
      return normalized;
    }

    const dotIndex = normalized.lastIndexOf('.');
    return dotIndex >= 0 ? normalized.slice(dotIndex) : `.${normalized}`;
  }

  function supportsIncrementalWorkerExt(value) {
    return INCREMENTAL_WORKER_EXTENSIONS.includes(normalizeImportExtension(value));
  }

  function shouldAllowWholeFileParseFallback(value) {
    return !supportsIncrementalWorkerExt(value);
  }

  function toImportError(error, fallbackMessage) {
    if (error instanceof Error) return error;
    return new Error(String(error || fallbackMessage || 'Import failed'));
  }

  async function finalizeImportLifecycle(result, effects) {
    const payload = result || {};
    const hooks = effects || {};
    const finalState = {
      status: payload.outcome === 'success' ? IMPORT_JOB_STAGES.COMPLETED : IMPORT_JOB_STAGES.FAILED,
      error: null,
      finalizationFailed: false,
      errorShown: false,
      cleanupErrors: [],
    };

    const callHook = async (name, args = []) => {
      if (typeof hooks[name] === 'function') {
        return hooks[name](...args);
      }
      return undefined;
    };

    const captureHookError = async (name, args = []) => {
      try {
        await callHook(name, args);
      } catch (hookError) {
        finalState.cleanupErrors.push(toImportError(hookError, `${name} failed`));
      }
    };

    const reportFailure = async (error, context) => {
      await captureHookError('failImportJobs', [error, context]);
      try {
        await callHook('showError', [error, context]);
        finalState.errorShown = true;
      } catch (showErrorFailure) {
        finalState.cleanupErrors.push(toImportError(showErrorFailure, 'showError failed'));
      }
    };

    try {
      if (payload.outcome === 'success') {
        const delayMs = Number.isFinite(payload.delayMs) ? payload.delayMs : 0;
        if (delayMs > 0) {
          if (typeof hooks.delay === 'function') {
            await hooks.delay(delayMs);
          } else {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
        await callHook('completeSuccess', [payload]);
      } else {
        const error = toImportError(payload.error, 'Import failed');
        finalState.error = error;
        await reportFailure(error, { ...payload, finalizationFailed: false });
      }
    } catch (error) {
      finalState.status = IMPORT_JOB_STAGES.FAILED;
      finalState.error = toImportError(error, 'Import finalization failed');
      finalState.finalizationFailed = true;
      await reportFailure(finalState.error, {
        ...payload,
        outcome: 'failure',
        finalizationFailed: true,
      });
    } finally {
      await captureHookError('hideProgress');
      await captureHookError('hideLoading');
      await captureHookError('persist');
    }

    return finalState;
  }

  function buildImportJobId(fileName) {
    const safeName = String(fileName || 'file')
      .trim()
      .replace(/[^a-z0-9._-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'file';

    return `import-${safeName}-${Date.now()}`;
  }

  return {
    IMPORT_JOB_STAGES,
    TERMINAL_STAGES,
    INCREMENTAL_WORKER_EXTENSIONS,
    createImportJob,
    patchImportJob,
    summarizeImportJobs,
    isKnownStage,
    normalizeImportExtension,
    supportsIncrementalWorkerExt,
    shouldAllowWholeFileParseFallback,
    finalizeImportLifecycle,
  };
});
