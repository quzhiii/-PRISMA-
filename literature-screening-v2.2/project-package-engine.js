(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === 'object') {
    root.ProjectPackageEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const PACKAGE_TYPE = 'full_project';
  const PACKAGE_SCHEMA = 'project_package.v1.local';
  const PRODUCER = 'PRISMA Workbench';
  const CURRENT_RELEASE = '2.5-dual-review-release';
  const SUPPORTED_RELEASES = new Set([
    CURRENT_RELEASE,
    '2.3-prisma-traice-release',
    '2.2-audit-shell',
    '2.1-shell',
    '1.4',
    '1.1',
  ]);
  const START_MODES = new Set(['demo', 'new-import', 'resume']);
  const REVIEW_MODES = new Set(['single', 'dual']);
  const PROJECT_FIELDS = [
    'uploadedData',
    'uploadedFiles',
    'screeningResults',
    'columnMapping',
    'fileFormat',
    'formatSource',
    'currentStep',
    'exclusionReasons',
    'filterRules',
    'qualityAssessments',
    'importJobs',
    'projectManifest',
    'auditEvents',
    'screeningDecisions',
    'aiSuggestionEvents',
    'projectHistory',
    'dualReviewResults',
    'dualReviewConflictState',
  ];
  const ARRAY_STATE_FIELDS = [
    'qualityAssessments',
    'importJobs',
    'auditEvents',
    'screeningDecisions',
    'aiSuggestionEvents',
    'projectHistory',
  ];

  function clonePlain(value, fallback) {
    if (value === undefined) return fallback;
    if (value === null) return null;
    if (Array.isArray(value)) return value.map((entry) => clonePlain(entry, entry));
    if (typeof value === 'object') {
      return Object.keys(value).reduce((result, key) => {
        result[key] = clonePlain(value[key], value[key]);
        return result;
      }, {});
    }
    return value;
  }

  function normalizeString(value) {
    return String(value === undefined || value === null ? '' : value).trim();
  }

  function issue(code, message) {
    return { code, message };
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function normalizeExclusionReasons(value) {
    if (Array.isArray(value)) return value.map((entry) => String(entry || '').trim()).filter(Boolean);
    if (isPlainObject(value)) return Object.keys(value).map((entry) => entry.trim()).filter(Boolean);
    return [];
  }

  function hasObjectEntries(value) {
    return isPlainObject(value) && Object.keys(value).length > 0;
  }

  function inferReviewMode(source) {
    if (REVIEW_MODES.has(source.reviewMode)) {
      return { mode: source.reviewMode, source: 'explicit' };
    }
    const manifestMode = source.projectManifest && (
      source.projectManifest.reviewMode || source.projectManifest.settings?.reviewMode
    );
    if (REVIEW_MODES.has(manifestMode)) {
      return { mode: manifestMode, source: 'manifest' };
    }
    const dualResults = source.dualReviewResults;
    const conflictState = source.dualReviewConflictState;
    const hasDualResults = isPlainObject(dualResults) && (
      hasObjectEntries(dualResults.A) ||
      hasObjectEntries(dualResults.B) ||
      hasObjectEntries(dualResults.final)
    );
    const hasDualConflicts = isPlainObject(conflictState) && (
      (Array.isArray(conflictState.screeningPairs) && conflictState.screeningPairs.length > 0) ||
      (Array.isArray(conflictState.screeningConflicts) && conflictState.screeningConflicts.length > 0) ||
      (Array.isArray(conflictState.qualityConflicts) && conflictState.qualityConflicts.length > 0)
    );
    const hasReviewerDecisions = Array.isArray(source.screeningDecisions) && source.screeningDecisions.some((entry) => (
      /^(?:reviewer[_-]?[ab]|resolver)/i.test(normalizeString(entry?.reviewerId || entry?.reviewer_id))
    ));
    const hasLegacyCollaboration = hasObjectEntries(source.reviewers) || hasObjectEntries(source.reviewDecisions);
    if (hasDualResults || hasDualConflicts || hasReviewerDecisions || hasLegacyCollaboration) {
      return { mode: 'dual', source: 'inferred' };
    }
    return { mode: 'single', source: 'default' };
  }

  function normalizeProjectPackage(value) {
    const source = isPlainObject(value) ? value : {};
    const reviewMode = inferReviewMode(source);
    const normalized = {
      packageType: normalizeString(source.packageType) || undefined,
      packageSchema: normalizeString(source.packageSchema) || undefined,
      producer: normalizeString(source.producer) || undefined,
      producerVersion: normalizeString(source.producerVersion) || undefined,
      version: normalizeString(source.version),
      timestamp: normalizeString(source.timestamp),
      projectId: normalizeString(source.projectId || source.currentProjectId || source.id),
      reviewMode: reviewMode.mode,
    };

    PROJECT_FIELDS.forEach((field) => {
      if (field === 'exclusionReasons') {
        normalized.exclusionReasons = normalizeExclusionReasons(source.exclusionReasons);
        return;
      }
      normalized[field] = clonePlain(source[field], source[field]);
    });

    normalized.uploadedData = Array.isArray(normalized.uploadedData) ? normalized.uploadedData : [];
    normalized.uploadedFiles = Array.isArray(normalized.uploadedFiles) ? normalized.uploadedFiles : [];
    normalized.columnMapping = isPlainObject(normalized.columnMapping) ? normalized.columnMapping : {};
    normalized.currentStep = Number.isInteger(normalized.currentStep) ? normalized.currentStep : 1;
    normalized.qualityAssessments = Array.isArray(normalized.qualityAssessments) ? normalized.qualityAssessments : [];
    normalized.importJobs = Array.isArray(normalized.importJobs) ? normalized.importJobs : [];
    normalized.auditEvents = Array.isArray(normalized.auditEvents) ? normalized.auditEvents : [];
    normalized.screeningDecisions = Array.isArray(normalized.screeningDecisions) ? normalized.screeningDecisions : [];
    normalized.aiSuggestionEvents = Array.isArray(normalized.aiSuggestionEvents) ? normalized.aiSuggestionEvents : [];
    normalized.projectHistory = Array.isArray(normalized.projectHistory) ? normalized.projectHistory : [];
    normalized.dualReviewResults = isPlainObject(normalized.dualReviewResults)
      ? normalized.dualReviewResults
      : { A: {}, B: {}, final: {} };
    normalized.dualReviewConflictState = isPlainObject(normalized.dualReviewConflictState)
      ? normalized.dualReviewConflictState
      : {};
    normalized.fileFormat = normalizeString(normalized.fileFormat) || 'unknown';
    normalized.formatSource = normalizeString(normalized.formatSource) || 'Unknown';
    normalized.screeningResults = isPlainObject(normalized.screeningResults) ? normalized.screeningResults : null;
    normalized.filterRules = isPlainObject(normalized.filterRules) ? normalized.filterRules : null;
    normalized.projectManifest = isPlainObject(normalized.projectManifest) ? normalized.projectManifest : null;
    return normalized;
  }

  function buildProjectPackage(state, options = {}) {
    const normalized = normalizeProjectPackage(state);
    return {
      ...normalized,
      packageType: PACKAGE_TYPE,
      packageSchema: PACKAGE_SCHEMA,
      producer: PRODUCER,
      producerVersion: CURRENT_RELEASE,
      version: CURRENT_RELEASE,
      timestamp: normalizeString(options.timestamp) || normalized.timestamp || new Date().toISOString(),
    };
  }

  function diagnoseProjectPackage(value) {
    const errors = [];
    const warnings = [];

    if (!isPlainObject(value)) {
      return {
        ok: false,
        kind: 'invalid_package',
        errors: [issue('invalid_package_shape', 'Project package must be a JSON object.')],
        warnings,
        normalized: null,
      };
    }

    if (value.bundleType || value.schemaVersion === 'reviewer_bundle.v1.local') {
      return {
        ok: false,
        kind: 'reviewer_bundle',
        errors: [issue('use_reviewer_bundle_flow', 'This is a Reviewer Bundle, not a full-project backup.')],
        warnings,
        normalized: null,
      };
    }

    const version = normalizeString(value.version);
    const hasCurrentContract = value.packageType === PACKAGE_TYPE || value.packageSchema === PACKAGE_SCHEMA;
    const hasProjectState = Array.isArray(value.uploadedData) ||
      Array.isArray(value.uploadedFiles) ||
      isPlainObject(value.screeningResults) ||
      isPlainObject(value.projectManifest);
    const kind = hasCurrentContract ? 'full_project' : 'legacy_full_project';

    if (!SUPPORTED_RELEASES.has(version)) {
      errors.push(issue('unsupported_release', `Unsupported project release marker: ${version || 'missing'}.`));
    }
    if (!hasProjectState) {
      errors.push(issue('missing_project_state', 'The file does not contain recognizable project state.'));
    }
    if (value.uploadedData !== undefined && !Array.isArray(value.uploadedData)) {
      errors.push(issue('invalid_uploaded_data', 'Project records must be stored as an array.'));
    } else if (Array.isArray(value.uploadedData) && value.uploadedData.some((entry) => !isPlainObject(entry))) {
      errors.push(issue('invalid_uploaded_record', 'Every project record must be a JSON object.'));
    }
    if (value.uploadedFiles !== undefined && !Array.isArray(value.uploadedFiles)) {
      errors.push(issue('invalid_uploaded_files', 'Project source files must be stored as an array.'));
    } else if (Array.isArray(value.uploadedFiles) && value.uploadedFiles.some((entry) => !isPlainObject(entry))) {
      errors.push(issue('invalid_uploaded_file', 'Every project source file must be a JSON object.'));
    }
    if (value.screeningResults !== undefined && value.screeningResults !== null) {
      const results = value.screeningResults;
      if (
        !isPlainObject(results) ||
        !isPlainObject(results.counts) ||
        !Array.isArray(results.included) ||
        !Array.isArray(results.excluded) ||
        results.included.some((entry) => !isPlainObject(entry)) ||
        results.excluded.some((entry) => !isPlainObject(entry))
      ) {
        errors.push(issue('invalid_screening_results', 'Screening results must contain counts, included records, and excluded records.'));
      }
    }
    if (value.columnMapping !== undefined && !isPlainObject(value.columnMapping)) {
      errors.push(issue('invalid_column_mapping', 'Column mapping must be a JSON object.'));
    }
    if (value.filterRules !== undefined && value.filterRules !== null && !isPlainObject(value.filterRules)) {
      errors.push(issue('invalid_filter_rules', 'Screening rules must be a JSON object or null.'));
    }
    ARRAY_STATE_FIELDS.forEach((field) => {
      if (value[field] !== undefined && !Array.isArray(value[field])) {
        errors.push(issue(`invalid_${field}`, `${field} must be stored as an array.`));
      }
    });
    if (value.dualReviewResults !== undefined && !isPlainObject(value.dualReviewResults)) {
      errors.push(issue('invalid_dual_review_results', 'Dual-review results must be a JSON object.'));
    }
    if (value.dualReviewConflictState !== undefined && !isPlainObject(value.dualReviewConflictState)) {
      errors.push(issue('invalid_dual_review_conflict_state', 'Dual-review conflict state must be a JSON object.'));
    }
    if (value.projectManifest !== undefined && value.projectManifest !== null && !isPlainObject(value.projectManifest)) {
      errors.push(issue('invalid_project_manifest', 'Project manifest must be a JSON object or null.'));
    }
    if (hasCurrentContract) {
      if (value.packageType !== PACKAGE_TYPE) {
        errors.push(issue('unsupported_package_type', 'The package type is not a full project.'));
      }
      if (value.packageSchema !== PACKAGE_SCHEMA) {
        errors.push(issue('unsupported_package_schema', 'The project package schema is not supported.'));
      }
      if (value.producer && value.producer !== PRODUCER) {
        errors.push(issue('unsupported_producer', 'The project package producer is not supported.'));
      }
    } else if (SUPPORTED_RELEASES.has(version) && hasProjectState) {
      warnings.push(issue('legacy_package_contract', 'Legacy project file accepted without the M3 package metadata.'));
    }

    const projectId = normalizeString(value.projectId || value.currentProjectId || value.id);
    const manifestProjectId = normalizeString(value.projectManifest && (value.projectManifest.projectId || value.projectManifest.project_id));
    if (projectId && manifestProjectId && projectId !== manifestProjectId) {
      errors.push(issue('project_identity_mismatch', 'The project ID does not match the manifest project ID.'));
    }
    if (value.currentStep !== undefined && (!Number.isInteger(value.currentStep) || value.currentStep < 1 || value.currentStep > 6)) {
      errors.push(issue('invalid_project_stage', 'The saved workflow step is outside the supported range.'));
    }
    if (!isPlainObject(value.projectManifest)) {
      warnings.push(issue('missing_project_manifest', 'The project manifest is missing; restore will use legacy-compatible defaults.'));
    }

    const reviewMode = inferReviewMode(value);
    const normalized = errors.length === 0 ? normalizeProjectPackage(value) : null;
    return {
      ok: errors.length === 0,
      kind,
      errors,
      warnings,
      normalized,
      reviewModeSource: reviewMode.source,
    };
  }

  function parseProjectPackageText(text) {
    let value;
    try {
      value = JSON.parse(String(text || ''));
    } catch (_error) {
      return {
        ok: false,
        kind: 'invalid_json',
        errors: [issue('invalid_json', 'The selected file is not valid JSON.')],
        warnings: [],
        normalized: null,
      };
    }
    return diagnoseProjectPackage(value);
  }

  function diagnoseRecoveryCandidate(raw, options = {}) {
    const diagnosis = typeof raw === 'string' ? parseProjectPackageText(raw) : diagnoseProjectPackage(raw);
    const result = {
      ...diagnosis,
      source: normalizeString(options.source) || 'unknown',
      projectId: diagnosis.normalized ? diagnosis.normalized.projectId : '',
      ageMs: null,
    };
    if (!diagnosis.ok) return result;

    const storageProjectId = normalizeString(options.storageProjectId);
    if (storageProjectId && diagnosis.normalized.projectId && storageProjectId !== diagnosis.normalized.projectId) {
      result.errors = result.errors.concat(issue('storage_identity_mismatch', 'The storage key and project payload identify different projects.'));
    }

    const timestampMs = Date.parse(diagnosis.normalized.timestamp);
    if (Number.isFinite(timestampMs) && Number.isFinite(options.now)) {
      result.ageMs = Math.max(0, options.now - timestampMs);
      const maxAgeMs = Number.isFinite(options.maxAgeMs)
        ? options.maxAgeMs
        : (result.source === 'autosave' ? 7 * 24 * 60 * 60 * 1000 : Infinity);
      if (result.ageMs > maxAgeMs) {
        result.errors = result.errors.concat(issue('stale_recovery_candidate', 'The recovery candidate is older than the allowed recovery window.'));
      }
    } else if (result.source === 'autosave') {
      result.errors = result.errors.concat(issue('invalid_recovery_timestamp', 'The autosave timestamp is missing or invalid.'));
    }

    result.ok = result.errors.length === 0;
    return result;
  }

  function parseStartIntent(urlInput) {
    let url;
    try {
      url = new URL(urlInput, 'https://local.invalid/');
    } catch (_error) {
      url = new URL('https://local.invalid/');
    }
    const warnings = [];
    const requestedStart = normalizeString(url.searchParams.get('start'));
    const requestedReview = normalizeString(url.searchParams.get('review'));
    const legacyMode = normalizeString(url.searchParams.get('mode'));
    let startMode = 'none';
    let reviewMode = 'single';

    if (requestedStart) {
      if (START_MODES.has(requestedStart)) startMode = requestedStart;
      else warnings.push(issue('invalid_start_mode', `Unknown start mode: ${requestedStart}.`));
    }
    if (requestedReview) {
      if (REVIEW_MODES.has(requestedReview)) reviewMode = requestedReview;
      else warnings.push(issue('invalid_review_mode', `Unknown review mode: ${requestedReview}.`));
    } else if (legacyMode === 'dual') {
      reviewMode = 'dual';
    }

    return { startMode, reviewMode, warnings };
  }

  function classifyStorageError(error) {
    const name = normalizeString(error && error.name);
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') return 'quota_exceeded';
    if (name === 'SecurityError' || name === 'InvalidStateError') return 'storage_unavailable';
    return 'storage_write_failed';
  }

  return {
    PACKAGE_TYPE,
    PACKAGE_SCHEMA,
    PRODUCER,
    CURRENT_RELEASE,
    buildProjectPackage,
    diagnoseProjectPackage,
    parseProjectPackageText,
    diagnoseRecoveryCandidate,
    parseStartIntent,
    classifyStorageError,
  };
});
