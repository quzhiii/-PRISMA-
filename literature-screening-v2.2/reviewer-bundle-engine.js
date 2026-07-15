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
  const BUNDLE_CONTRACT_VERSION = 'm4.v1';
  const INTEGRITY_ALGORITHM = 'SHA-256';
  const PRODUCER = 'PRISMA Workbench';
  const PRODUCER_VERSION = '2.5-dual-review-release';
  const BUNDLE_TYPES = new Set(['collaboration_seed', 'reviewer_decision_bundle']);

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

  function utf8Bytes(value) {
    const text = String(value || '');
    if (typeof TextEncoder === 'function') return Array.from(new TextEncoder().encode(text));
    const encoded = unescape(encodeURIComponent(text));
    return Array.from(encoded, (character) => character.charCodeAt(0));
  }

  function sha256Hex(value) {
    const bytes = utf8Bytes(value);
    const bitLength = bytes.length * 8;
    const paddedLength = ((bytes.length + 9 + 63) >> 6) << 6;
    const buffer = new Uint8Array(paddedLength);
    buffer.set(bytes);
    buffer[bytes.length] = 0x80;
    const view = new DataView(buffer.buffer);
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
    view.setUint32(paddedLength - 4, bitLength >>> 0);

    const constants = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    let hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const words = new Uint32Array(64);
    const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));

    for (let offset = 0; offset < paddedLength; offset += 64) {
      for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4);
      for (let index = 16; index < 64; index += 1) {
        const s0 = rightRotate(words[index - 15], 7) ^ rightRotate(words[index - 15], 18) ^ (words[index - 15] >>> 3);
        const s1 = rightRotate(words[index - 2], 17) ^ rightRotate(words[index - 2], 19) ^ (words[index - 2] >>> 10);
        words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
      }

      let [a, b, c, d, e, f, g, h] = hash;
      for (let index = 0; index < 64; index += 1) {
        const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
        const choose = (e & f) ^ (~e & g);
        const temp1 = (h + s1 + choose + constants[index] + words[index]) >>> 0;
        const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
        const majority = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (s0 + majority) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }
      hash = hash.map((value, index) => (value + [a, b, c, d, e, f, g, h][index]) >>> 0);
    }

    return hash.map((value) => value.toString(16).padStart(8, '0')).join('');
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
      currentStep: Number.isInteger(state.currentStep) ? state.currentStep : 1,
    };
  }

  function buildSourceManifestPayload(projectState) {
    const state = projectState || {};
    return {
      projectId: getProjectId(state),
      manifestVersion: normalizeString(state.projectManifest && (state.projectManifest.version || state.projectManifest.app_version || state.projectManifest.appVersion), ''),
      records: clonePlain(Array.isArray(state.uploadedData) ? state.uploadedData : [], []),
      uploadedFiles: (Array.isArray(state.uploadedFiles) ? state.uploadedFiles : []).map((file) => ({
        name: normalizeString(file && (file.name || file.file_name || file.fileName), ''),
        size: Number(file && (file.size || file.file_size || file.fileSize)) || 0,
        recordCount: Number(file && (file.recordCount || file.record_count || file.records)) || 0,
      })),
      columnMapping: clonePlain(state.columnMapping || {}, {}),
      fileFormat: normalizeString(state.fileFormat, ''),
      formatSource: normalizeString(state.formatSource, ''),
      filterRules: clonePlain(state.filterRules || null, null),
    };
  }

  function buildSourceManifestHash(projectState) {
    return `sha256:${sha256Hex(stableStringify(buildSourceManifestPayload(projectState)))}`;
  }

  function buildRecordsHash(projectState) {
    const records = Array.isArray(projectState?.uploadedData) ? projectState.uploadedData : [];
    return `sha256:${sha256Hex(stableStringify(records))}`;
  }

  function getDecisionPayload(screeningDecisions, qualityReviewerAssessments) {
    const decisions = (Array.isArray(screeningDecisions) ? screeningDecisions : [])
      .map((decision) => clonePlain(decision, {}))
      .sort((left, right) => getDecisionKey(left).localeCompare(getDecisionKey(right)) || compareDecisionFreshness(left, right));
    return {
      screeningDecisions: decisions,
      qualityReviewerAssessments: clonePlain(qualityReviewerAssessments || {}, {}),
    };
  }

  function buildDecisionsHash(screeningDecisions, qualityReviewerAssessments) {
    return `sha256:${sha256Hex(stableStringify(getDecisionPayload(screeningDecisions, qualityReviewerAssessments)))}`;
  }

  function buildBundleId(bundleType, projectId, reviewerId, sourceManifestHash, decisionsHash) {
    return `rb-${sha256Hex(stableStringify({ bundleType, projectId, reviewerId, sourceManifestHash, decisionsHash }))}`;
  }

  function normalizeAppliedBundleIds(value) {
    return Array.from(new Set(
      (Array.isArray(value) ? value : []).map((id) => normalizeString(id, '')).filter(Boolean)
    ));
  }

  function bundleError(message, diagnosis) {
    const error = new Error(message);
    error.code = 'invalid_reviewer_bundle';
    error.diagnosis = diagnosis;
    return error;
  }

  function getBundleProjectId(bundle) {
    return normalizeString(bundle && (bundle.projectId || (bundle.project && bundle.project.projectId) || bundle.currentProjectId), '');
  }

  function getBundleReviewerId(bundle) {
    return normalizeString(bundle && bundle.reviewer && (bundle.reviewer.reviewerId || bundle.reviewer.reviewer_id), '');
  }

  function getAppliedBundleIds(projectState, options = {}) {
    const ids = new Set(Array.isArray(options.appliedBundleIds) ? options.appliedBundleIds.map((id) => normalizeString(id, '')) : []);
    const state = projectState || {};
    (Array.isArray(state.auditEvents) ? state.auditEvents : []).forEach((event) => {
      if (event?.eventType !== 'reviewer_decision_bundle_imported') return;
      const bundleId = normalizeString(event.after?.bundleId || event.metadata?.bundleId, '');
      if (bundleId) ids.add(bundleId);
    });
    return ids;
  }

  function diagnoseReviewerBundle(bundle, options = {}) {
    const errors = [];
    const warnings = [];
    const value = bundle && typeof bundle === 'object' && !Array.isArray(bundle) ? bundle : null;
    if (!value) {
      return { ok: false, errors: [{ code: 'invalid_bundle_shape', message: 'Reviewer Bundle must be a JSON object.' }], warnings, normalized: null };
    }

    if (value.schemaVersion !== REVIEWER_BUNDLE_SCHEMA_VERSION) {
      errors.push({ code: 'unsupported_bundle_schema', message: 'Reviewer Bundle schema is not supported.' });
    }
    if (!BUNDLE_TYPES.has(value.bundleType)) {
      errors.push({ code: 'invalid_bundle_type', message: 'Reviewer Bundle type is not supported.' });
    }
    if (value.contractVersion && value.contractVersion !== BUNDLE_CONTRACT_VERSION) {
      errors.push({ code: 'unsupported_contract_version', message: 'Reviewer Bundle contract version is not supported.' });
    } else if (!value.contractVersion) {
      warnings.push({ code: 'legacy_bundle_contract', message: 'Bundle uses the compatible pre-M4 contract; cryptographic fields cannot be verified.' });
    }
    if (value.producer && value.producer !== PRODUCER) {
      errors.push({ code: 'unsupported_producer', message: 'Reviewer Bundle producer is not supported.' });
    }
    if (value.integrity?.algorithm && value.integrity.algorithm !== INTEGRITY_ALGORITHM) {
      errors.push({ code: 'unsupported_integrity_algorithm', message: 'Reviewer Bundle integrity algorithm is not supported.' });
    }

    const projectId = getBundleProjectId(value);
    if (!projectId) errors.push({ code: 'missing_project_id', message: 'Reviewer Bundle project ID is missing.' });
    if (value.project?.projectId && normalizeString(value.project.projectId, '') !== projectId) {
      errors.push({ code: 'project_identity_mismatch', message: 'Bundle project ID does not match its project metadata.' });
    }
    if (options.projectId && projectId !== normalizeString(options.projectId, '')) {
      errors.push({ code: 'project_identity_mismatch', message: 'Reviewer Bundle does not match the current project.' });
    }

    const reviewerId = getBundleReviewerId(value);
    if (value.bundleType === 'reviewer_decision_bundle' && !reviewerId) {
      errors.push({ code: 'missing_reviewer_id', message: 'Reviewer Decision Bundle reviewer ID is missing.' });
    }
    if (options.reviewerId && reviewerId && reviewerId !== normalizeString(options.reviewerId, '')) {
      errors.push({ code: 'reviewer_identity_mismatch', message: 'Reviewer Bundle does not match the expected reviewer.' });
    }

    const uploadedData = Array.isArray(value.uploadedData) ? value.uploadedData : [];
    const uploadedFiles = Array.isArray(value.uploadedFiles) ? value.uploadedFiles : [];
    if (value.bundleType === 'collaboration_seed') {
      if (value.screeningDecisions !== undefined || value.qualityReviewerAssessments !== undefined) {
        errors.push({ code: 'seed_contains_reviewer_decisions', message: 'Collaboration Seed must not contain reviewer decisions.' });
      }
      if (value.recordCount !== undefined && value.recordCount !== uploadedData.length) {
        errors.push({ code: 'record_count_mismatch', message: 'Seed record count does not match the bundled records.' });
      }
      if (value.recordsHash && value.recordsHash !== buildRecordsHash(value)) {
        errors.push({ code: 'records_hash_mismatch', message: 'Seed records hash cannot be verified.' });
      }
      if (value.sourceManifestHash && value.sourceManifestHash !== buildSourceManifestHash(value)) {
        errors.push({ code: 'source_manifest_hash_mismatch', message: 'Seed source manifest hash cannot be verified.' });
      }
    }

    const qualityReviewerAssessments = value.qualityReviewerAssessments || {};
    const screeningDecisions = Array.isArray(value.screeningDecisions) ? value.screeningDecisions : [];
    if (value.bundleType === 'reviewer_decision_bundle') {
      if (!Array.isArray(value.screeningDecisions)) {
        errors.push({ code: 'invalid_screening_decisions', message: 'Reviewer decisions must be an array.' });
      }
      screeningDecisions.forEach((decision) => {
        if (getDecisionReviewerId(decision) !== reviewerId) {
          errors.push({ code: 'reviewer_scope_mismatch', message: 'Decision Bundle contains a decision from another reviewer.' });
        }
        if (getDecisionStage(decision) !== 'full_text') {
          errors.push({ code: 'invalid_decision_stage', message: 'Reviewer Decision Bundle may contain full-text decisions only.' });
        }
      });
      if (!qualityReviewerAssessments || typeof qualityReviewerAssessments !== 'object' || Array.isArray(qualityReviewerAssessments)) {
        errors.push({ code: 'invalid_quality_assessments', message: 'Quality reviewer assessments must be an object keyed by record ID.' });
      }
      Object.entries(qualityReviewerAssessments).forEach(([recordId, reviewers]) => {
        if (!reviewers || typeof reviewers !== 'object' || Array.isArray(reviewers) || Object.keys(reviewers).some((id) => id !== reviewerId)) {
          errors.push({ code: 'quality_reviewer_scope_mismatch', message: `Quality assessment scope is invalid for record ${recordId}.` });
        }
      });
      if (value.decisionsHash && value.decisionsHash !== buildDecisionsHash(screeningDecisions, qualityReviewerAssessments)) {
        errors.push({ code: 'decisions_hash_mismatch', message: 'Reviewer decisions hash cannot be verified.' });
      }
    }

    if (value.bundleId) {
      const expectedBundleId = buildBundleId(value.bundleType, projectId, reviewerId, value.sourceManifestHash || '', value.decisionsHash || '');
      if (value.bundleId !== expectedBundleId) {
        errors.push({ code: 'bundle_id_mismatch', message: 'Reviewer Bundle ID cannot be verified.' });
      }
    }

    const state = options.projectState;
    if (state) {
      const stateProjectId = getProjectId(state);
      if (projectId !== stateProjectId) {
        errors.push({ code: 'project_identity_mismatch', message: 'Reviewer Bundle does not match the target project.' });
      }
      const expectedBaseFingerprint = buildProjectBaseFingerprint(state);
      if (value.baseFingerprint && value.baseFingerprint !== expectedBaseFingerprint) {
        errors.push({ code: 'base_fingerprint_mismatch', message: 'Reviewer Bundle base fingerprint does not match the target project.' });
      }
      const expectedSourceManifestHash = buildSourceManifestHash(state);
      const expectedRecordsHash = buildRecordsHash(state);
      if (value.sourceManifestHash && value.sourceManifestHash !== expectedSourceManifestHash) {
        errors.push({ code: 'source_manifest_hash_mismatch', message: 'Reviewer Bundle source manifest does not match the target project.' });
      }
      if (value.recordsHash && value.recordsHash !== expectedRecordsHash) {
        errors.push({ code: 'records_hash_mismatch', message: 'Reviewer Bundle records do not match the target project.' });
      }
      if (value.recordCount !== undefined && value.recordCount !== (Array.isArray(state.uploadedData) ? state.uploadedData.length : 0)) {
        errors.push({ code: 'record_count_mismatch', message: 'Reviewer Bundle record count does not match the target project.' });
      }
      if (value.bundleType === 'reviewer_decision_bundle' && value.bundleId && getAppliedBundleIds(state, options).has(value.bundleId)) {
        errors.push({ code: 'duplicate_bundle', message: 'This Reviewer Decision Bundle has already been applied.' });
      }
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      normalized: value,
      projectId,
      reviewerId,
      bundleType: value.bundleType,
    };
  }

  function validateReviewerBundle(bundle, options = {}) {
    const diagnosis = diagnoseReviewerBundle(bundle, options);
    if (!diagnosis.ok) throw bundleError(diagnosis.errors[0]?.message || 'Reviewer Bundle is invalid.', diagnosis);
    return diagnosis;
  }

  function createCollaborationSeedPackage(projectState, options = {}) {
    const state = projectState || {};
    const projectId = getProjectId(state);
    const sourceManifestHash = buildSourceManifestHash(state);
    const decisionsHash = buildDecisionsHash([], {});
    const reviewerId = normalizeString(options.reviewerId || options.reviewer_id, '');
    return {
      schemaVersion: REVIEWER_BUNDLE_SCHEMA_VERSION,
      contractVersion: BUNDLE_CONTRACT_VERSION,
      bundleType: 'collaboration_seed',
      exportedAt: normalizeString(options.exportedAt, '') || nowIso(),
      baseFingerprint: buildProjectBaseFingerprint(state),
      sourceManifestHash,
      recordsHash: buildRecordsHash(state),
      recordCount: Array.isArray(state.uploadedData) ? state.uploadedData.length : 0,
      decisionsHash,
      integrity: { algorithm: INTEGRITY_ALGORITHM, sourceManifestHash, recordsHash: buildRecordsHash(state), decisionsHash },
      producer: PRODUCER,
      producerVersion: PRODUCER_VERSION,
      projectId,
      bundleId: buildBundleId('collaboration_seed', projectId, reviewerId, sourceManifestHash, decisionsHash),
      project: {
        projectId,
        appVersion: normalizeString(state.projectManifest && (state.projectManifest.version || state.projectManifest.app_version), ''),
      },
      ...(reviewerId ? {
        reviewer: {
          reviewerId,
          reviewerLabel: normalizeString(options.reviewerLabel || options.reviewer_label, reviewerId),
        },
      } : {}),
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
    const projectId = getProjectId(state);
    const sourceManifestHash = buildSourceManifestHash(state);
    const recordsHash = buildRecordsHash(state);
    const decisionsHash = buildDecisionsHash(screeningDecisions, collectQualityReviewerAssessments(state.qualityAssessments, reviewerId));

    return {
      schemaVersion: REVIEWER_BUNDLE_SCHEMA_VERSION,
      contractVersion: BUNDLE_CONTRACT_VERSION,
      bundleType: 'reviewer_decision_bundle',
      exportedAt: normalizeString(options.exportedAt, '') || nowIso(),
      baseFingerprint: buildProjectBaseFingerprint(state),
      sourceManifestHash,
      recordsHash,
      recordCount: Array.isArray(state.uploadedData) ? state.uploadedData.length : 0,
      decisionsHash,
      integrity: { algorithm: INTEGRITY_ALGORITHM, sourceManifestHash, recordsHash, decisionsHash },
      producer: PRODUCER,
      producerVersion: PRODUCER_VERSION,
      projectId,
      bundleId: buildBundleId('reviewer_decision_bundle', projectId, reviewerId, sourceManifestHash, decisionsHash),
      project: {
        projectId,
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
    validateReviewerBundle(incoming, {
      projectState: state,
      projectId: getProjectId(state),
      appliedBundleIds: state.appliedReviewerBundleIds,
    });

    const nextAppliedBundleIds = normalizeAppliedBundleIds([
      ...(Array.isArray(state.appliedReviewerBundleIds) ? state.appliedReviewerBundleIds : []),
      incoming.bundleId,
    ]);
    return {
      ...clonePlain(state, {}),
      screeningDecisions: mergeScreeningDecisions(state.screeningDecisions, incoming.screeningDecisions),
      qualityAssessments: mergeQualityReviewerAssessments(state.qualityAssessments, incoming.qualityReviewerAssessments),
      appliedReviewerBundleIds: nextAppliedBundleIds,
    };
  }

  function applyCollaborationSeedPackage(projectState, bundle) {
    const state = projectState || {};
    const hasTargetProject = !!(state.currentProjectId || state.projectId || state.project_id || state.projectManifest);
    validateReviewerBundle(bundle, hasTargetProject ? { projectId: getBundleProjectId(state) } : {});
    if (bundle.bundleType !== 'collaboration_seed') {
      throw bundleError('Expected a collaboration seed package.', {
        ok: false,
        errors: [{ code: 'invalid_bundle_type', message: 'Expected a collaboration seed package.' }],
        warnings: [],
        normalized: bundle,
      });
    }
    return {
      ...clonePlain(bundle, {}),
      screeningDecisions: [],
      qualityAssessments: [],
      projectHistory: [],
      auditEvents: [],
    };
  }

  return {
    REVIEWER_BUNDLE_SCHEMA_VERSION,
    BUNDLE_CONTRACT_VERSION,
    INTEGRITY_ALGORITHM,
    buildProjectBaseFingerprint,
    buildSourceManifestHash,
    buildRecordsHash,
    buildDecisionsHash,
    diagnoseReviewerBundle,
    validateReviewerBundle,
    createCollaborationSeedPackage,
    createReviewerDecisionBundle,
    applyCollaborationSeedPackage,
    applyReviewerDecisionBundle,
  };
});
