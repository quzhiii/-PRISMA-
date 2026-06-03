const ProjectHistoryEngine = (() => {
  const PROJECT_HISTORY_SCHEMA_VERSION = 'project_history.v2.5.1';
  const DEFAULT_HISTORY_LIMIT = 20;

  function clonePlain(value, fallback) {
    try {
      return JSON.parse(JSON.stringify(value === undefined ? fallback : value));
    } catch (_) {
      return fallback;
    }
  }

  function makeSnapshotId(createdAt) {
    return `snapshot-${String(createdAt || new Date().toISOString()).replace(/[^0-9A-Za-z]/g, '')}`;
  }

  function summarizeSourceFiles(state) {
    return (Array.isArray(state?.uploadedFiles) ? state.uploadedFiles : [])
      .map((file) => String(file?.name || file?.fileName || file?.source || '').trim())
      .filter(Boolean);
  }

  function getRecordCount(state) {
    return Array.isArray(state?.uploadedData) ? state.uploadedData.length : 0;
  }

  function getCountsSummary(state) {
    return clonePlain(state?.screeningResults?.counts || {}, {});
  }

  function addProjectSnapshot(history, state, options = {}) {
    const createdAt = options.createdAt || new Date().toISOString();
    const snapshot = {
      snapshot_id: options.snapshotId || makeSnapshotId(createdAt),
      schema_version: PROJECT_HISTORY_SCHEMA_VERSION,
      created_at: createdAt,
      label: String(options.label || 'Project snapshot'),
      reason: String(options.reason || 'manual_snapshot'),
      step: Number(state?.currentStep || 1),
      source_files: summarizeSourceFiles(state),
      record_count: getRecordCount(state),
      rule_hash: String(options.ruleHash || ''),
      counts_summary: getCountsSummary(state),
      state: clonePlain(state, {}),
    };
    const limit = Number.isFinite(options.limit) ? options.limit : DEFAULT_HISTORY_LIMIT;
    return [snapshot, ...(Array.isArray(history) ? history : [])].slice(0, Math.max(1, limit));
  }

  return {
    PROJECT_HISTORY_SCHEMA_VERSION,
    DEFAULT_HISTORY_LIMIT,
    addProjectSnapshot,
  };
})();

if (typeof globalThis !== 'undefined') {
  globalThis.ProjectHistoryEngine = ProjectHistoryEngine;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProjectHistoryEngine;
}
