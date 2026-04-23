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
    createImportJob,
    patchImportJob,
    summarizeImportJobs,
    isKnownStage,
  };
});
