(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === 'object') {
    root.ReviewerBundleEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const REVIEWER_BUNDLE_SCHEMA_VERSION = 'reviewer_bundle.v1.local';

  function nowIso() {
    return new Date().toISOString();
  }

  function clonePlain(value, fallback) {
    if (value === undefined) return fallback;
    if (value === null) return null;
    if (Array.isArray(value)) return value.map((entry) => clonePlain(entry, entry));
    if (typeof value === 'object') {
      return Object.keys(value).reduce((acc, key) => {
        acc[key] = clonePlain(value[key], value[key]);
        return acc;
      }, {});
    }
    return value;
  }

  function normalizeString(value, fallback) {
    const normalized = String(value === undefined || value === null ? '' : value).trim();
    return normalized || fallback || '';
  }

  function stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  function fingerprintHash(text) {
    let hash = 2166136261;
    const input = String(text || '');
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function getProjectId(projectState) {
    const state = projectState || {};
    const manifest = state.projectManifest || {};
    return normalizeString(
      state.currentProjectId || state.projectId || state.project_id || manifest.project_id || manifest.projectId || manifest.id,
      'local-project'
    );
  }

  function getRecordBase(record, index) {
    const source = record && typeof record === 'object' ? record : {};
    return {
      index,
      id: normalizeString(source.id || source.record_id || source.recordId || source.doi || source.DOI || source.title || source.TI || source.T1, `record-${index + 1}`),
      title: normalizeString(source.title || source.TI || source.T1, ''),
      doi: normalizeString(source.doi || source.DOI || source.DO, ''),
      year: normalizeString(source.year || source.PY || source.Y1, ''),
    };
  }

  function buildProjectBaseFingerprint(projectState) {
    const state = projectState || {};
    const manifest = state.projectManifest || {};
    const uploadedData = Array.isArray(state.uploadedData) ? state.uploadedData : [];
    const uploadedFiles = Array.isArray(state.uploadedFiles) ? state.uploadedFiles : [];
    const fingerprintBase = {
      projectId: getProjectId(state),
      manifestVersion: normalizeString(manifest.version || manifest.app_version || manifest.appVersion, ''),
      records: uploadedData.map(getRecordBase),
      uploadedFiles: uploadedFiles.map((file) => ({
        name: normalizeString(file && (file.name || file.file_name || file.fileName), ''),
        size: Number(file && (file.size || file.file_size || file.fileSize)) || 0,
        recordCount: Number(file && (file.recordCount || file.record_count || file.records)) || 0,
      })),
      columnMapping: clonePlain(state.columnMapping || {}, {}),
      fileFormat: normalizeString(state.fileFormat, ''),
      formatSource: normalizeString(state.formatSource, ''),
      filterRules: clonePlain(state.filterRules || null, null),
    };

    return `rbp:${fingerprintHash(stableStringify(fingerprintBase))}`;
  }

  function getBaseStatePayload(projectState) {
    const state = projectState || {};
    const projectId = getProjectId(state);
    return {
      version: normalizeString(state.version || (state.projectManifest && (state.projectManifest.version || state.projectManifest.app_version)), ''),
      timestamp: normalizeString(state.timestamp, '') || nowIso(),
      projectId,
      projectManifest: clonePlain(state.projectManifest || null, null),
      currentProjectId: projectId,
      uploadedData: clonePlain(Array.isArray(state.uploadedData) ? state.uploadedData : [], []),
      uploadedFiles: clonePlain(Array.isArray(state.uploadedFiles) ? state.uploadedFiles : [], []),
      columnMapping: clonePlain(state.columnMapping || {}, {}),
      screeningResults: clonePlain(state.screeningResults || null, null),
      fileFormat: normalizeString(state.fileFormat, ''),
      formatSource: normalizeString(state.formatSource, ''),
      filterRules: clonePlain(state.filterRules || null, null),
      exclusionReasons: clonePlain(Array.isArray(state.exclusionReasons) ? state.exclusionReasons : [], []),
    };
  }

  function createCollaborationSeedPackage(projectState, options = {}) {
    const state = projectState || {};
    return {
      schemaVersion: REVIEWER_BUNDLE_SCHEMA_VERSION,
      bundleType: 'collaboration_seed',
      exportedAt: normalizeString(options.exportedAt, '') || nowIso(),
      baseFingerprint: buildProjectBaseFingerprint(state),
      project: {
        projectId: getProjectId(state),
        appVersion: normalizeString(state.projectManifest && (state.projectManifest.version || state.projectManifest.app_version), ''),
      },
      ...getBaseStatePayload(state),
    };
  }

  function getDecisionReviewerId(decision) {
    return normalizeString(decision && (decision.reviewerId || decision.reviewer_id), '');
  }

  function getDecisionStage(decision) {
    return normalizeString(decision && (decision.stage || decision.screening_stage), '');
  }

  function getDecisionRecordId(decision) {
    return normalizeString(decision && (decision.recordId || decision.record_id), '');
  }

  function getDecisionUpdatedAt(decision) {
    return normalizeString(decision && (decision.updatedAt || decision.updated_at || decision.decidedAt || decision.decided_at), '');
  }

  function createReviewerDecisionBundle(projectState, options = {}) {
    const state = projectState || {};
    const reviewerId = normalizeString(options.reviewerId || options.reviewer_id, '');
    if (!reviewerId) {
      throw new Error('reviewerId is required to create a reviewer decision bundle.');
    }

    const screeningDecisions = (Array.isArray(state.screeningDecisions) ? state.screeningDecisions : [])
      .filter((decision) => getDecisionReviewerId(decision) === reviewerId)
      .filter((decision) => getDecisionStage(decision) === 'full_text')
      .map((decision) => clonePlain(decision, {}));

    return {
      schemaVersion: REVIEWER_BUNDLE_SCHEMA_VERSION,
      bundleType: 'reviewer_decision_bundle',
      exportedAt: normalizeString(options.exportedAt, '') || nowIso(),
      baseFingerprint: buildProjectBaseFingerprint(state),
      project: {
        projectId: getProjectId(state),
      },
      reviewer: {
        reviewerId,
        reviewerLabel: normalizeString(options.reviewerLabel || options.reviewer_label, reviewerId),
      },
      screeningDecisions,
      qualityReviewerAssessments: collectQualityReviewerAssessments(state.qualityAssessments, reviewerId),
    };
  }

  function getQualityRecordId(assessment, index) {
    return normalizeString(
      assessment && (assessment.record_id || assessment.recordId || assessment.id || assessment.assessment_id || assessment.assessmentId),
      `record-${index + 1}`
    );
  }

  function collectQualityReviewerAssessments(qualityAssessments, reviewerId) {
    return (Array.isArray(qualityAssessments) ? qualityAssessments : []).reduce((acc, assessment, index) => {
      if (!assessment || typeof assessment !== 'object') return acc;
      const recordId = getQualityRecordId(assessment, index);
      const reviewerAssessments = assessment.reviewer_assessments && typeof assessment.reviewer_assessments === 'object'
        ? assessment.reviewer_assessments
        : {};
      const scoped = reviewerAssessments[reviewerId]
        || (getDecisionReviewerId(assessment) === reviewerId ? assessment : null);
      if (!scoped) return acc;
      acc[recordId] = { [reviewerId]: clonePlain(scoped, {}) };
      return acc;
    }, {});
  }

  function getDecisionKey(decision) {
    return [
      getDecisionRecordId(decision),
      getDecisionStage(decision),
      getDecisionReviewerId(decision),
    ].join('::');
  }

  function compareDecisionFreshness(left, right) {
    const leftTime = getDecisionUpdatedAt(left);
    const rightTime = getDecisionUpdatedAt(right);
    if (leftTime !== rightTime) return leftTime.localeCompare(rightTime);
    return normalizeString(left && (left.decisionId || left.decision_id), '').localeCompare(
      normalizeString(right && (right.decisionId || right.decision_id), '')
    );
  }

  function mergeScreeningDecisions(existingDecisions, incomingDecisions) {
    const byKey = new Map();
    (Array.isArray(existingDecisions) ? existingDecisions : []).forEach((decision) => {
      const cloned = clonePlain(decision, {});
      const key = getDecisionKey(cloned);
      if (key.replace(/:/g, '')) byKey.set(key, cloned);
    });
    (Array.isArray(incomingDecisions) ? incomingDecisions : []).forEach((decision) => {
      const cloned = clonePlain(decision, {});
      const key = getDecisionKey(cloned);
      if (!key.replace(/:/g, '')) return;
      const existing = byKey.get(key);
      if (!existing || compareDecisionFreshness(existing, cloned) <= 0) {
        byKey.set(key, cloned);
      }
    });
    return Array.from(byKey.values());
  }

  function getQualityAssessmentKey(assessment, index) {
    return normalizeString(assessment && (assessment.record_id || assessment.recordId), '') || getQualityRecordId(assessment, index);
  }

  function mergeQualityReviewerAssessments(qualityAssessments, incomingByRecord) {
    const sourceAssessments = Array.isArray(qualityAssessments) ? qualityAssessments : [];
    const merged = sourceAssessments.map((assessment) => clonePlain(assessment, {}));
    const indexByRecord = new Map();
    merged.forEach((assessment, index) => {
      indexByRecord.set(getQualityAssessmentKey(assessment, index), index);
    });

    Object.keys(incomingByRecord || {}).forEach((recordId) => {
      const incomingReviewers = incomingByRecord[recordId];
      if (!incomingReviewers || typeof incomingReviewers !== 'object') return;
      const existingIndex = indexByRecord.get(recordId);
      const target = existingIndex >= 0
        ? merged[existingIndex]
        : { id: `qa-${recordId}`, record_id: recordId, reviewer_assessments: {} };
      const currentReviewerAssessments = target.reviewer_assessments && typeof target.reviewer_assessments === 'object'
        ? target.reviewer_assessments
        : {};
      target.reviewer_assessments = {
        ...clonePlain(currentReviewerAssessments, {}),
        ...clonePlain(incomingReviewers, {}),
      };
      if (existingIndex >= 0) {
        merged[existingIndex] = target;
      } else {
        indexByRecord.set(recordId, merged.length);
        merged.push(target);
      }
    });

    return merged;
  }

  function applyReviewerDecisionBundle(projectState, bundle) {
    const state = projectState || {};
    const incoming = bundle || {};
    if (incoming.bundleType !== 'reviewer_decision_bundle') {
      throw new Error('Expected a reviewer decision bundle.');
    }
    const localFingerprint = buildProjectBaseFingerprint(state);
    if (incoming.baseFingerprint !== localFingerprint) {
      throw new Error('Reviewer decision bundle does not match this project base fingerprint.');
    }

    return {
      ...clonePlain(state, {}),
      screeningDecisions: mergeScreeningDecisions(state.screeningDecisions, incoming.screeningDecisions),
      qualityAssessments: mergeQualityReviewerAssessments(state.qualityAssessments, incoming.qualityReviewerAssessments),
    };
  }

  return {
    REVIEWER_BUNDLE_SCHEMA_VERSION,
    buildProjectBaseFingerprint,
    createCollaborationSeedPackage,
    createReviewerDecisionBundle,
    applyReviewerDecisionBundle,
  };
});
