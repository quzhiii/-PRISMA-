(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === 'object') {
    root.DualReviewEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DUAL_REVIEW_SCHEMA_VERSION = 'dual_review.v2.5-alpha';
  const VALID_SCREENING_DECISIONS = new Set(['include', 'exclude', 'uncertain', 'pending']);
  const RESOLVER_REVIEWER_IDS = new Set(['resolver', 'resolver_1', 'resolver-1', 'consensus', 'final', 'final_decision']);
  const QUALITY_CONFLICT_FIELDS = Object.freeze(['overall_judgement', 'status']);
  const DUAL_REVIEW_CONFLICT_EXPORT_COLUMNS = Object.freeze([
    'schema_version',
    'conflict_id',
    'conflict_type',
    'status',
    'stage',
    'record_id',
    'title',
    'field',
    'reviewer_a_id',
    'reviewer_a_decision',
    'reviewer_a_reason',
    'reviewer_b_id',
    'reviewer_b_decision',
    'reviewer_b_reason',
    'resolver_id',
    'final_decision',
    'final_reason',
    'differences',
    'updated_at',
  ]);

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    const safePrefix = normalizeString(prefix, 'id').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'id';

    if (typeof crypto !== 'undefined' && crypto && typeof crypto.randomUUID === 'function') {
      return `${safePrefix}-${crypto.randomUUID()}`;
    }

    return `${safePrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeString(value, fallback) {
    const normalized = String(value === undefined || value === null ? '' : value).trim();
    return normalized || fallback || '';
  }

  function normalizeText(value) {
    return normalizeString(value, '').toLowerCase();
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

  function normalizeObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return clonePlain(value, {});
  }

  function normalizeReviewerId(value, fallback) {
    return normalizeString(value, fallback || 'reviewer_1');
  }

  function getReviewerSlot(reviewerId) {
    const normalized = normalizeText(reviewerId).replace(/[^a-z0-9]/g, '');
    if (['reviewera', 'reviewer1', 'a', 'primary', 'main', 'reviewermain'].includes(normalized)) return 'A';
    if (['reviewerb', 'reviewer2', 'b', 'secondary', 'deputy', 'reviewersecondary'].includes(normalized)) return 'B';
    if (RESOLVER_REVIEWER_IDS.has(normalizeText(reviewerId))) return 'resolver';
    if (normalized.includes('resolver') || normalized.includes('consensus') || normalized.includes('final')) return 'resolver';
    return '';
  }

  function normalizeScreeningDecision(value, options = {}) {
    const normalized = normalizeText(value);
    const emptyAs = VALID_SCREENING_DECISIONS.has(options.emptyAs) ? options.emptyAs : 'pending';

    if (!normalized) return emptyAs;
    if (normalized === '__uncertain__' || normalized === 'unclear' || normalized === 'maybe') return 'uncertain';
    if (normalized === '__include__' || normalized === 'keep' || normalized === 'retain') return 'include';
    if (VALID_SCREENING_DECISIONS.has(normalized)) return normalized;

    return options.treatUnknownAsExclude === false ? emptyAs : 'exclude';
  }

  function normalizeReviewSelection(value) {
    const rawValue = normalizeString(value, '');
    const decision = normalizeScreeningDecision(rawValue, {
      emptyAs: 'include',
      treatUnknownAsExclude: true,
    });

    return {
      decision,
      exclusionReason: decision === 'exclude' ? rawValue : '',
      originalValue: rawValue,
    };
  }

  function normalizeScreeningDecisionRecord(input) {
    const payload = input || {};
    const selection = payload.selection !== undefined
      ? normalizeReviewSelection(payload.selection)
      : null;
    const metadata = normalizeObject(payload.metadata);
    const decision = normalizeScreeningDecision(
      payload.decision || payload.human_decision || (selection && selection.decision),
      { emptyAs: selection ? selection.decision : 'pending', treatUnknownAsExclude: false }
    );
    const timestamp = normalizeString(payload.updatedAt || payload.updated_at || payload.decidedAt || payload.decided_at, '') || nowIso();
    const reviewerId = normalizeReviewerId(payload.reviewerId || payload.reviewer_id, 'reviewer_1');
    const exclusionReason = decision === 'exclude'
      ? normalizeString(payload.exclusionReason || payload.exclusion_reason || (selection && selection.exclusionReason), 'other')
      : '';

    return {
      decisionId: normalizeString(payload.decisionId || payload.decision_id, makeId('decision')),
      projectId: normalizeString(payload.projectId || payload.project_id, ''),
      recordId: normalizeString(payload.recordId || payload.record_id, ''),
      stage: normalizeString(payload.stage || payload.screening_stage, 'full_text'),
      reviewerId,
      reviewerSlot: normalizeString(payload.reviewerSlot || payload.reviewer_slot || metadata.reviewerSlot || metadata.reviewer_slot, getReviewerSlot(reviewerId)),
      decision,
      exclusionReason,
      conflictStatus: normalizeString(payload.conflictStatus || payload.conflict_status, 'none'),
      finalExportStatus: normalizeString(payload.finalExportStatus || payload.final_export_status, 'not_exported'),
      source: normalizeString(payload.source, 'human'),
      notes: normalizeString(payload.notes, ''),
      decidedAt: normalizeString(payload.decidedAt || payload.decided_at, timestamp),
      updatedAt: timestamp,
      metadata,
      schemaVersion: normalizeString(payload.schemaVersion || payload.schema_version, DUAL_REVIEW_SCHEMA_VERSION),
    };
  }

  function createReviewerDecision(input) {
    return normalizeScreeningDecisionRecord(input);
  }

  function decisionSignature(decisionInput) {
    const decision = normalizeScreeningDecisionRecord(decisionInput);
    return decision.decision === 'exclude'
      ? `${decision.decision}:${decision.exclusionReason || 'other'}`
      : decision.decision;
  }

  function compareDecisionTime(left, right) {
    const leftTime = normalizeString(left && (left.updatedAt || left.decidedAt), '');
    const rightTime = normalizeString(right && (right.updatedAt || right.decidedAt), '');

    if (leftTime !== rightTime) {
      return leftTime.localeCompare(rightTime);
    }

    return normalizeString(left && left.decisionId, '').localeCompare(normalizeString(right && right.decisionId, ''));
  }

  function getLatestScreeningDecisions(decisions) {
    const byKey = new Map();
    (Array.isArray(decisions) ? decisions : []).forEach((entry) => {
      const decision = normalizeScreeningDecisionRecord(entry);
      const key = `${decision.recordId}::${decision.stage}::${decision.reviewerId}`;
      const existing = byKey.get(key);
      if (!existing || compareDecisionTime(existing, decision) <= 0) {
        byKey.set(key, decision);
      }
    });

    return Array.from(byKey.values());
  }

  function isResolverDecision(decisionInput) {
    const decision = normalizeScreeningDecisionRecord(decisionInput);
    const metadata = normalizeObject(decision.metadata);
    const reviewerId = normalizeText(decision.reviewerId);

    return getReviewerSlot(reviewerId) === 'resolver'
      || RESOLVER_REVIEWER_IDS.has(reviewerId)
      || metadata.resolverAction === true
      || metadata.resolver_action === true
      || metadata.finalDecision === true
      || metadata.final_decision === true
      || metadata.resolutionSource === 'resolver'
      || metadata.resolution_source === 'resolver';
  }

  function groupDecisionsByRecordStage(decisions) {
    const groups = new Map();
    getLatestScreeningDecisions(decisions).forEach((decision) => {
      const key = `${decision.recordId}::${decision.stage}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(decision);
    });

    return groups;
  }

  function findLatestResolverDecision(group) {
    return (Array.isArray(group) ? group : [])
      .filter(isResolverDecision)
      .sort(compareDecisionTime)
      .pop() || null;
  }

  function pickReviewerDecision(group, slot, fallbackReviewerId) {
    const normalizedFallback = normalizeReviewerId(fallbackReviewerId, '');
    const matches = (Array.isArray(group) ? group : []).filter((decision) => {
      if (isResolverDecision(decision)) return false;
      if (normalizedFallback && decision.reviewerId === normalizedFallback) return true;
      return getReviewerSlot(decision.reviewerId) === slot;
    });

    return matches.sort(compareDecisionTime).pop() || null;
  }

  function buildScreeningConflictQueue(decisions, records, options = {}) {
    const recordMap = buildRecordMap(records);
    const groups = groupDecisionsByRecordStage(decisions);
    const conflicts = [];

    groups.forEach((group) => {
      const reviewerA = pickReviewerDecision(group, 'A', options.reviewerAId);
      const reviewerB = pickReviewerDecision(group, 'B', options.reviewerBId);

      if (!reviewerA || !reviewerB) return;
      if (reviewerA.decision === 'pending' || reviewerB.decision === 'pending') return;
      if (decisionSignature(reviewerA) === decisionSignature(reviewerB)) return;

      const resolverDecision = findLatestResolverDecision(group);
      const recordId = reviewerA.recordId || reviewerB.recordId;
      const stage = reviewerA.stage || reviewerB.stage;
      const conflictId = `conflict-${stage}-${String(recordId).replace(/[^a-z0-9_-]/gi, '_')}`;

      // P1 fix: Invalidate resolver if either reviewer edited after resolution
      const resolverTime = resolverDecision ? normalizeString(resolverDecision.updatedAt || resolverDecision.decidedAt, '') : '';
      const reviewerATime = normalizeString(reviewerA.updatedAt || reviewerA.decidedAt, '');
      const reviewerBTime = normalizeString(reviewerB.updatedAt || reviewerB.decidedAt, '');
      const resolverStillValid = resolverDecision
        && resolverTime
        && reviewerATime
        && reviewerBTime
        && compareDecisionTime(resolverDecision, reviewerA) >= 0
        && compareDecisionTime(resolverDecision, reviewerB) >= 0;
      const effectiveResolver = resolverStillValid ? resolverDecision : null;

      conflicts.push({
        conflictId,
        conflictType: 'screening',
        schemaVersion: DUAL_REVIEW_SCHEMA_VERSION,
        recordId,
        stage,
        record: recordMap.get(recordId) || null,
        reviewerA,
        reviewerB,
        resolverDecision: effectiveResolver,
        status: effectiveResolver ? 'resolved' : 'pending',
        field: 'human_decision',
        signatures: {
          reviewerA: decisionSignature(reviewerA),
          reviewerB: decisionSignature(reviewerB),
        },
        createdAt: normalizeString(reviewerA.updatedAt || reviewerA.decidedAt, '') || normalizeString(reviewerB.updatedAt || reviewerB.decidedAt, ''),
        updatedAt: resolverDecision ? resolverDecision.updatedAt : (normalizeString(reviewerB.updatedAt, '') || normalizeString(reviewerA.updatedAt, '')),
      });
    });

    return conflicts.sort((left, right) => {
      const stageCompare = normalizeString(left.stage, '').localeCompare(normalizeString(right.stage, ''));
      if (stageCompare !== 0) return stageCompare;
      return normalizeString(left.recordId, '').localeCompare(normalizeString(right.recordId, ''));
    });
  }

  function buildScreeningAgreementPairs(decisions, records, options = {}) {
    const recordMap = buildRecordMap(records);
    const groups = groupDecisionsByRecordStage(decisions);
    const pairs = [];

    groups.forEach((group) => {
      const reviewerA = pickReviewerDecision(group, 'A', options.reviewerAId);
      const reviewerB = pickReviewerDecision(group, 'B', options.reviewerBId);

      if (!reviewerA || !reviewerB) return;
      if (reviewerA.decision === 'pending' || reviewerB.decision === 'pending') return;

      const resolverDecision = findLatestResolverDecision(group);
      const recordId = reviewerA.recordId || reviewerB.recordId;
      const stage = reviewerA.stage || reviewerB.stage;
      const reviewerASignature = decisionSignature(reviewerA);
      const reviewerBSignature = decisionSignature(reviewerB);
      const agreement = reviewerASignature === reviewerBSignature;
      const pairId = `pair-${stage}-${String(recordId).replace(/[^a-z0-9_-]/gi, '_')}`;

      pairs.push({
        pairId,
        schemaVersion: DUAL_REVIEW_SCHEMA_VERSION,
        recordId,
        stage,
        record: recordMap.get(recordId) || null,
        reviewerA,
        reviewerB,
        resolverDecision,
        agreement,
        status: agreement ? 'agreement' : 'disagreement',
        conflictStatus: agreement ? 'none' : resolverDecision ? 'resolved' : 'pending',
        signatures: {
          reviewerA: reviewerASignature,
          reviewerB: reviewerBSignature,
        },
        updatedAt: resolverDecision ? resolverDecision.updatedAt : (normalizeString(reviewerB.updatedAt, '') || normalizeString(reviewerA.updatedAt, '')),
      });
    });

    return pairs.sort((left, right) => {
      const stageCompare = normalizeString(left.stage, '').localeCompare(normalizeString(right.stage, ''));
      if (stageCompare !== 0) return stageCompare;
      return normalizeString(left.recordId, '').localeCompare(normalizeString(right.recordId, ''));
    });
  }

  function calculateScreeningAgreementMetrics(decisions, records, options = {}) {
    const pairs = buildScreeningAgreementPairs(decisions, records, options);
    const metrics = calculateAgreementMetrics(
      pairs.map((pair) => pair.reviewerA),
      pairs.map((pair) => pair.reviewerB)
    );
    const disagreementPairs = pairs.filter((pair) => !pair.agreement);
    const resolvedDisagreements = disagreementPairs.filter((pair) => pair.conflictStatus === 'resolved');

    return {
      ...metrics,
      scope: 'screening',
      pairCount: pairs.length,
      disagreementPairCount: disagreementPairs.length,
      resolvedDisagreementCount: resolvedDisagreements.length,
      pendingDisagreementCount: disagreementPairs.length - resolvedDisagreements.length,
    };
  }

  function buildRecordMap(records) {
    const map = new Map();
    (Array.isArray(records) ? records : []).forEach((record, index) => {
      const recordId = getRecordId(record, index);
      if (recordId) map.set(recordId, record);
    });
    return map;
  }

  function getRecordId(record, index) {
    const source = record && typeof record === 'object' ? record : {};
    return normalizeString(
      source.record_id || source.recordId || source.id || source._engine_record_id || source.doi || source.DOI || source.DO || source.title || source.TI || source.T1,
      `record-${index + 1}`
    );
  }

  function createResolverScreeningDecision(conflictInput, input = {}) {
    const conflict = conflictInput || {};
    const selection = normalizeReviewSelection(input.selection !== undefined ? input.selection : input.finalDecision);
    const finalDecision = normalizeScreeningDecision(input.decision || selection.decision, {
      emptyAs: selection.decision,
      treatUnknownAsExclude: false,
    });
    const exclusionReason = finalDecision === 'exclude'
      ? normalizeString(input.exclusionReason || selection.exclusionReason, 'other')
      : '';
    const timestamp = normalizeString(input.resolvedAt || input.updatedAt, '') || nowIso();
    const recordId = normalizeString(input.recordId || conflict.recordId, '');
    const stage = normalizeString(input.stage || conflict.stage, 'full_text');

    return {
      decisionId: normalizeString(input.decisionId, makeId('resolution')),
      projectId: normalizeString(input.projectId, ''),
      recordId,
      stage,
      decision: finalDecision,
      exclusionReason,
      reviewerId: normalizeReviewerId(input.resolverId || input.reviewerId, 'resolver_1'),
      conflictStatus: 'resolved',
      finalExportStatus: finalDecision === 'include' ? 'included' : finalDecision === 'exclude' ? 'excluded' : 'warning',
      source: 'human',
      notes: normalizeString(input.notes || input.discussion, ''),
      decidedAt: timestamp,
      updatedAt: timestamp,
      metadata: {
        ...normalizeObject(input.metadata),
        resolverAction: true,
        finalDecision: true,
        conflictId: normalizeString(conflict.conflictId, ''),
        reviewerA: conflict.reviewerA ? summarizeDecision(conflict.reviewerA) : null,
        reviewerB: conflict.reviewerB ? summarizeDecision(conflict.reviewerB) : null,
        resolutionSource: 'resolver',
        schemaVersion: DUAL_REVIEW_SCHEMA_VERSION,
      },
    };
  }

  function summarizeDecision(decisionInput) {
    const decision = normalizeScreeningDecisionRecord(decisionInput);
    return {
      reviewerId: decision.reviewerId,
      decision: decision.decision,
      exclusionReason: decision.exclusionReason,
      updatedAt: decision.updatedAt,
    };
  }

  function createResolverAuditEvent(conflictInput, resolverDecisionInput, input = {}) {
    const conflict = conflictInput || {};
    const resolverDecision = normalizeScreeningDecisionRecord(resolverDecisionInput || {});

    return {
      eventType: 'review_conflict_resolved',
      recordId: resolverDecision.recordId || conflict.recordId || '',
      stage: resolverDecision.stage || conflict.stage || 'full_text',
      before: {
        conflictId: normalizeString(conflict.conflictId, ''),
        status: normalizeString(conflict.status, 'pending'),
        reviewerA: conflict.reviewerA ? summarizeDecision(conflict.reviewerA) : null,
        reviewerB: conflict.reviewerB ? summarizeDecision(conflict.reviewerB) : null,
      },
      after: {
        conflictId: normalizeString(conflict.conflictId, ''),
        status: 'resolved',
        finalDecision: resolverDecision.decision,
        exclusionReason: resolverDecision.exclusionReason,
        resolverId: resolverDecision.reviewerId,
      },
      reason: normalizeString(input.reason || resolverDecision.exclusionReason, ''),
      source: 'human',
      metadata: {
        ...normalizeObject(input.metadata),
        resolverAction: true,
        resolutionNote: normalizeString(input.notes || input.discussion || resolverDecision.notes, ''),
        schemaVersion: DUAL_REVIEW_SCHEMA_VERSION,
      },
    };
  }

  function createResolverQualityAssessment(conflictInput, input = {}) {
    const conflict = conflictInput || {};
    const timestamp = normalizeString(input.resolvedAt || input.updatedAt || input.updated_at, '') || nowIso();
    const recordId = normalizeString(input.recordId || input.record_id || conflict.recordId || conflict.record_id, '');
    const reviewerId = normalizeReviewerId(input.resolverId || input.resolver_id || input.reviewerId || input.reviewer_id, 'resolver_1');
    const domainJudgements = normalizeQualityDomainJudgements(
      input.domainJudgements || input.domain_judgements || input.domainScores || input.domain_scores || input.domains,
      conflict
    );
    const domainRows = Object.keys(domainJudgements).sort().map((domainId) => ({
      domain_id: domainId,
      judgement: domainJudgements[domainId],
    }));

    return {
      assessment_id: normalizeString(input.assessmentId || input.assessment_id, `quality-resolution-${recordId || makeId('record')}`),
      project_id: normalizeString(input.projectId || input.project_id, ''),
      record_id: recordId,
      reviewer_id: reviewerId,
      reviewer_slot: 'resolver',
      overall_judgement: normalizeString(input.overallJudgement || input.overall_judgement, 'not_assessed'),
      status: normalizeString(input.status, 'complete'),
      domain_scores: domainRows,
      domains: domainRows,
      notes: normalizeString(input.notes || input.discussion, ''),
      updated_at: timestamp,
      metadata: {
        ...normalizeObject(input.metadata),
        resolverAction: true,
        finalDecision: true,
        conflictId: normalizeString(conflict.conflictId || conflict.conflict_id, ''),
        reviewerA: conflict.reviewerA ? summarizeQualityAssessment(conflict.reviewerA) : null,
        reviewerB: conflict.reviewerB ? summarizeQualityAssessment(conflict.reviewerB) : null,
        resolutionSource: 'resolver',
        schemaVersion: DUAL_REVIEW_SCHEMA_VERSION,
      },
      schema_version: DUAL_REVIEW_SCHEMA_VERSION,
    };
  }

  function normalizeQualityDomainJudgements(input, conflictInput) {
    const judgements = {};
    const source = input || {};

    if (Array.isArray(source)) {
      source.forEach((row) => {
        const domainId = normalizeString(row && (row.domain_id || row.domain || row.id || row.label), '');
        if (!domainId) return;
        judgements[domainId] = normalizeString(row && (row.judgement || row.score || row.value), 'not_assessed');
      });
    } else if (source && typeof source === 'object') {
      Object.keys(source).forEach((domainId) => {
        const value = source[domainId];
        judgements[domainId] = normalizeString(
          value && typeof value === 'object' ? (value.judgement || value.score || value.value) : value,
          'not_assessed'
        );
      });
    }

    const conflict = conflictInput || {};
    const domainIds = new Set();
    [conflict.reviewerA, conflict.reviewerB].forEach((assessment) => {
      Object.keys((assessment && assessment.domainJudgements) || {}).forEach((domainId) => domainIds.add(domainId));
    });
    (Array.isArray(conflict.differences) ? conflict.differences : []).forEach((difference) => {
      const field = normalizeString(difference && difference.field, '');
      if (field.startsWith('domain:')) domainIds.add(field.slice('domain:'.length));
    });

    domainIds.forEach((domainId) => {
      if (Object.prototype.hasOwnProperty.call(judgements, domainId)) return;
      const reviewerAValue = conflict.reviewerA && conflict.reviewerA.domainJudgements
        ? conflict.reviewerA.domainJudgements[domainId]
        : '';
      const reviewerBValue = conflict.reviewerB && conflict.reviewerB.domainJudgements
        ? conflict.reviewerB.domainJudgements[domainId]
        : '';
      judgements[domainId] = normalizeString(reviewerAValue || reviewerBValue, 'not_assessed');
    });

    return judgements;
  }

  function summarizeQualityAssessment(assessmentInput) {
    const assessment = assessmentInput && assessmentInput.recordId
      ? assessmentInput
      : normalizeQualityAssessment(assessmentInput || {});

    return {
      reviewerId: normalizeString(assessment.reviewerId || assessment.reviewer_id, ''),
      overallJudgement: normalizeString(assessment.overallJudgement || assessment.overall_judgement, 'not_assessed'),
      status: normalizeString(assessment.status, 'not_started'),
      domainJudgements: clonePlain(assessment.domainJudgements || assessment.domain_judgements || {}, {}),
      updatedAt: normalizeString(assessment.updatedAt || assessment.updated_at, ''),
    };
  }

  function createQualityConflictResolvedAuditEvent(conflictInput, resolverAssessmentInput, input = {}) {
    const conflict = conflictInput || {};
    const resolverAssessment = normalizeQualityAssessment(resolverAssessmentInput || {});
    const conflictId = normalizeString(conflict.conflictId || conflict.conflict_id, '');

    return {
      eventType: 'quality_conflict_resolved',
      recordId: resolverAssessment.recordId || conflict.recordId || '',
      stage: 'quality',
      before: {
        conflictId,
        status: normalizeString(conflict.status, 'pending'),
        reviewerA: conflict.reviewerA ? summarizeQualityAssessment(conflict.reviewerA) : null,
        reviewerB: conflict.reviewerB ? summarizeQualityAssessment(conflict.reviewerB) : null,
        differences: clonePlain(conflict.differences || [], []),
      },
      after: {
        conflictId,
        status: 'resolved',
        finalValues: {
          overallJudgement: resolverAssessment.overallJudgement,
          status: resolverAssessment.status,
          domainJudgements: clonePlain(resolverAssessment.domainJudgements || {}, {}),
        },
        resolverId: resolverAssessment.reviewerId,
      },
      reason: normalizeString(input.reason || input.notes || resolverAssessment.raw?.notes, ''),
      source: 'human',
      metadata: {
        ...normalizeObject(input.metadata),
        resolverAction: true,
        resolutionNote: normalizeString(input.notes || input.discussion || resolverAssessment.raw?.notes, ''),
        schemaVersion: DUAL_REVIEW_SCHEMA_VERSION,
        conflictId,
      },
    };
  }

  function getDomainJudgementMap(assessment) {
    const rows = Array.isArray(assessment && assessment.domain_scores)
      ? assessment.domain_scores
      : Array.isArray(assessment && assessment.domains)
        ? assessment.domains
        : [];
    const map = {};

    rows.forEach((row) => {
      const domainId = normalizeString(row && (row.domain_id || row.domain || row.id || row.label), '');
      if (!domainId) return;
      map[domainId] = normalizeString(row && (row.judgement || row.score || row.value), 'not_assessed');
    });

    return map;
  }

  function normalizeQualityAssessment(input) {
    const payload = input || {};
    const metadata = normalizeObject(payload.metadata);
    const reviewerId = normalizeReviewerId(payload.reviewer_id || payload.reviewerId, '');
    const recordId = normalizeString(payload.record_id || payload.recordId, '');
    const metadataResolver = metadata.resolverAction === true
      || metadata.resolver_action === true
      || metadata.finalDecision === true
      || metadata.final_decision === true
      || metadata.resolutionSource === 'resolver'
      || metadata.resolution_source === 'resolver';

    return {
      assessmentId: normalizeString(payload.assessment_id || payload.assessmentId || payload.id, `qa-${recordId || makeId('record')}`),
      recordId,
      reviewerId,
      reviewerSlot: normalizeString(payload.reviewerSlot || payload.reviewer_slot || metadata.reviewerSlot || metadata.reviewer_slot, metadataResolver ? 'resolver' : getReviewerSlot(reviewerId)),
      overallJudgement: normalizeString(payload.overall_judgement || payload.overallJudgement || payload.overall_risk || payload.overallRisk, 'not_assessed'),
      status: normalizeString(payload.status, 'not_started'),
      domainJudgements: getDomainJudgementMap(payload),
      updatedAt: normalizeString(payload.updated_at || payload.updatedAt, ''),
      raw: payload,
    };
  }

  function buildQualityConflictQueue(assessments, options = {}) {
    const latestByRecordReviewer = new Map();
    (Array.isArray(assessments) ? assessments : []).forEach((entry) => {
      const assessment = normalizeQualityAssessment(entry);
      if (!assessment.recordId || !assessment.reviewerId) return;
      const key = `${assessment.recordId}::${assessment.reviewerId}`;
      const existing = latestByRecordReviewer.get(key);
      if (!existing || compareAssessmentTime(existing, assessment) <= 0) {
        latestByRecordReviewer.set(key, assessment);
      }
    });

    const byRecord = new Map();
    latestByRecordReviewer.forEach((assessment) => {
      if (!byRecord.has(assessment.recordId)) byRecord.set(assessment.recordId, []);
      byRecord.get(assessment.recordId).push(assessment);
    });

    const conflicts = [];
    byRecord.forEach((group, recordId) => {
      const resolver = group.filter((assessment) => assessment.reviewerSlot === 'resolver').sort(compareAssessmentTime).pop() || null;
      const reviewerA = group.find((assessment) => assessment.reviewerSlot === 'A' || assessment.reviewerId === options.reviewerAId);
      const reviewerB = group.find((assessment) => assessment.reviewerSlot === 'B' || assessment.reviewerId === options.reviewerBId);

      if (!reviewerA || !reviewerB) return;

      const differences = getQualityDifferences(reviewerA, reviewerB);
      if (differences.length === 0) return;

      // P1 fix: Invalidate resolver if either reviewer edited after resolution
      const resolverStillValid = resolver
        && resolver.updatedAt
        && reviewerA.updatedAt
        && reviewerB.updatedAt
        && compareAssessmentTime(resolver, reviewerA) >= 0
        && compareAssessmentTime(resolver, reviewerB) >= 0;
      const effectiveResolver = resolverStillValid ? resolver : null;

      conflicts.push({
        conflictId: `quality-conflict-${String(recordId).replace(/[^a-z0-9_-]/gi, '_')}`,
        conflictType: 'quality',
        schemaVersion: DUAL_REVIEW_SCHEMA_VERSION,
        recordId,
        stage: 'quality',
        reviewerA,
        reviewerB,
        resolverDecision: effectiveResolver,
        status: effectiveResolver ? 'resolved' : 'pending',
        differences,
        updatedAt: effectiveResolver ? effectiveResolver.updatedAt : (reviewerB.updatedAt || reviewerA.updatedAt),
      });
    });

    return conflicts.sort((left, right) => normalizeString(left.recordId, '').localeCompare(normalizeString(right.recordId, '')));
  }

  function compareAssessmentTime(left, right) {
    const leftTime = normalizeString(left && left.updatedAt, '');
    const rightTime = normalizeString(right && right.updatedAt, '');

    if (leftTime !== rightTime) {
      return leftTime.localeCompare(rightTime);
    }

    return normalizeString(left && left.assessmentId, '').localeCompare(normalizeString(right && right.assessmentId, ''));
  }

  function getQualityDifferences(reviewerA, reviewerB) {
    const differences = [];

    QUALITY_CONFLICT_FIELDS.forEach((field) => {
      const left = normalizeString(reviewerA && reviewerA[field === 'overall_judgement' ? 'overallJudgement' : field], '');
      const right = normalizeString(reviewerB && reviewerB[field === 'overall_judgement' ? 'overallJudgement' : field], '');
      if (left !== right) {
        differences.push({ field, reviewerA: left, reviewerB: right });
      }
    });

    const domains = new Set([
      ...Object.keys((reviewerA && reviewerA.domainJudgements) || {}),
      ...Object.keys((reviewerB && reviewerB.domainJudgements) || {}),
    ]);
    domains.forEach((domainId) => {
      const left = normalizeString(reviewerA.domainJudgements[domainId], 'not_assessed');
      const right = normalizeString(reviewerB.domainJudgements[domainId], 'not_assessed');
      if (left !== right) {
        differences.push({ field: `domain:${domainId}`, reviewerA: left, reviewerB: right });
      }
    });

    return differences;
  }

  function calculateAgreementMetrics(reviewerAValues, reviewerBValues) {
    const aList = Array.isArray(reviewerAValues) ? reviewerAValues : [];
    const bList = Array.isArray(reviewerBValues) ? reviewerBValues : [];
    const sampleSize = Math.min(aList.length, bList.length);
    const aLabels = [];
    const bLabels = [];

    for (let index = 0; index < sampleSize; index += 1) {
      aLabels.push(toAgreementLabel(aList[index]));
      bLabels.push(toAgreementLabel(bList[index]));
    }

    let agreementCount = 0;
    for (let index = 0; index < sampleSize; index += 1) {
      if (aLabels[index] === bLabels[index]) agreementCount += 1;
    }

    const percentAgreement = sampleSize > 0 ? agreementCount / sampleSize : 0;
    const kappaStats = calculateCohensKappa(aLabels, bLabels);

    return {
      schemaVersion: DUAL_REVIEW_SCHEMA_VERSION,
      sampleSize,
      agreementCount,
      disagreementCount: sampleSize - agreementCount,
      percentAgreement,
      percentAgreementRounded: Math.round(percentAgreement * 1000) / 1000,
      percentAgreementPercent: Math.round(percentAgreement * 1000) / 10,
      kappa: kappaStats.kappa,
      observedAgreement: kappaStats.observedAgreement,
      expectedAgreement: kappaStats.expectedAgreement,
      categories: kappaStats.categories,
      confusionMatrix: kappaStats.confusionMatrix,
    };
  }

  function toAgreementLabel(value) {
    if (value && typeof value === 'object') {
      if (value.decision || value.human_decision || value.selection !== undefined) {
        return decisionSignature(value);
      }
      if (value.overall_judgement || value.overallJudgement || value.status) {
        return [
          normalizeString(value.overall_judgement || value.overallJudgement, 'not_assessed'),
          normalizeString(value.status, 'not_started'),
        ].join(':');
      }
    }

    return decisionSignature({ selection: value });
  }

  function calculateCohensKappa(labelsA, labelsB) {
    const aList = Array.isArray(labelsA) ? labelsA : [];
    const bList = Array.isArray(labelsB) ? labelsB : [];
    if (aList.length !== bList.length) {
      throw new Error('Reviewer decision arrays must have equal length.');
    }

    const sampleSize = aList.length;
    if (sampleSize === 0) {
      return {
        kappa: 0,
        observedAgreement: 0,
        expectedAgreement: 0,
        categories: [],
        confusionMatrix: {},
      };
    }

    const categories = Array.from(new Set([...aList, ...bList])).sort();
    const confusionMatrix = {};
    categories.forEach((left) => {
      confusionMatrix[left] = {};
      categories.forEach((right) => {
        confusionMatrix[left][right] = 0;
      });
    });

    for (let index = 0; index < sampleSize; index += 1) {
      confusionMatrix[aList[index]][bList[index]] += 1;
    }

    let observedMatches = 0;
    categories.forEach((category) => {
      observedMatches += confusionMatrix[category][category] || 0;
    });
    const observedAgreement = observedMatches / sampleSize;

    let expectedAgreement = 0;
    categories.forEach((category) => {
      const rowSum = categories.reduce((sum, col) => sum + (confusionMatrix[category][col] || 0), 0);
      const colSum = categories.reduce((sum, row) => sum + (confusionMatrix[row][category] || 0), 0);
      expectedAgreement += (rowSum * colSum) / (sampleSize * sampleSize);
    });

    const kappa = expectedAgreement === 1
      ? (observedAgreement === 1 ? 1 : 0)
      : (observedAgreement - expectedAgreement) / (1 - expectedAgreement);

    return {
      kappa: Math.round(kappa * 1000) / 1000,
      observedAgreement: Math.round(observedAgreement * 1000) / 1000,
      expectedAgreement: Math.round(expectedAgreement * 1000) / 1000,
      categories,
      confusionMatrix,
    };
  }

  function buildExportGateStatus(input = {}) {
    const screeningConflicts = Array.isArray(input.screeningConflicts) ? input.screeningConflicts : [];
    const qualityConflicts = Array.isArray(input.qualityConflicts) ? input.qualityConflicts : [];
    const unresolvedScreening = screeningConflicts.filter((conflict) => conflict && conflict.status !== 'resolved');
    const unresolvedQuality = qualityConflicts.filter((conflict) => conflict && conflict.status !== 'resolved');
    const unresolvedConflictCount = unresolvedScreening.length + unresolvedQuality.length;
    const warnings = [];

    if (unresolvedScreening.length > 0) {
      warnings.push(`${unresolvedScreening.length} unresolved screening conflict(s) remain.`);
    }

    if (unresolvedQuality.length > 0) {
      warnings.push(`${unresolvedQuality.length} unresolved quality appraisal conflict(s) remain.`);
    }

    return {
      schemaVersion: DUAL_REVIEW_SCHEMA_VERSION,
      status: unresolvedConflictCount > 0 ? 'warning' : 'clear',
      hasUnresolvedConflicts: unresolvedConflictCount > 0,
      unresolvedConflictCount,
      unresolvedScreeningConflictCount: unresolvedScreening.length,
      unresolvedQualityConflictCount: unresolvedQuality.length,
      warnings,
    };
  }

  function buildDualReviewAgreementExport(input = {}) {
    const screeningDecisions = Array.isArray(input.screeningDecisions)
      ? input.screeningDecisions
      : Array.isArray(input.decisions)
        ? input.decisions
        : [];
    const records = Array.isArray(input.records) ? input.records : [];
    const screeningPairs = Array.isArray(input.screeningPairs)
      ? input.screeningPairs
      : buildScreeningAgreementPairs(screeningDecisions, records, input.options || {});
    const screeningConflicts = Array.isArray(input.screeningConflicts)
      ? input.screeningConflicts
      : buildScreeningConflictQueue(screeningDecisions, records, input.options || {});
    const qualityConflicts = Array.isArray(input.qualityConflicts)
      ? input.qualityConflicts
      : buildQualityConflictQueue(input.qualityAssessments || [], input.options || {});
    const screeningMetrics = input.screeningAgreementMetrics
      || calculateAgreementMetrics(
        screeningPairs.map((pair) => pair.reviewerA),
        screeningPairs.map((pair) => pair.reviewerB)
      );
    const exportGate = input.exportGate || buildExportGateStatus({ screeningConflicts, qualityConflicts });

    return {
      schemaVersion: DUAL_REVIEW_SCHEMA_VERSION,
      exportType: 'dual_review_agreement',
      generatedAt: normalizeString(input.generatedAt, '') || nowIso(),
      screening: {
        metrics: {
          ...screeningMetrics,
          scope: 'screening',
          pairCount: screeningPairs.length,
          disagreementPairCount: screeningPairs.filter((pair) => !pair.agreement).length,
          resolvedDisagreementCount: screeningPairs.filter((pair) => !pair.agreement && pair.conflictStatus === 'resolved').length,
          pendingDisagreementCount: screeningPairs.filter((pair) => !pair.agreement && pair.conflictStatus !== 'resolved').length,
        },
        pairs: screeningPairs.map(summarizeAgreementPair),
      },
      conflicts: {
        screening: summarizeConflicts(screeningConflicts),
        quality: summarizeConflicts(qualityConflicts),
      },
      exportGate,
    };
  }

  function serializeDualReviewAgreementJson(input = {}) {
    return `${JSON.stringify(buildDualReviewAgreementExport(input), null, 2)}\n`;
  }

  function serializeDualReviewConflictsCsv(input = {}, qualityInput) {
    const screeningConflicts = Array.isArray(input)
      ? input
      : Array.isArray(input.screeningConflicts)
        ? input.screeningConflicts
        : [];
    const qualityConflicts = Array.isArray(qualityInput)
      ? qualityInput
      : Array.isArray(input.qualityConflicts)
        ? input.qualityConflicts
        : [];
    const rows = screeningConflicts
      .map((conflict) => conflictToExportRow(conflict))
      .concat(qualityConflicts.map((conflict) => conflictToExportRow(conflict)));
    const header = DUAL_REVIEW_CONFLICT_EXPORT_COLUMNS.join(',');
    const body = rows.map((row) => DUAL_REVIEW_CONFLICT_EXPORT_COLUMNS.map((column) => csvCell(row[column])).join(','));

    return [header, ...body].join('\n') + '\n';
  }

  function summarizeAgreementPair(pairInput) {
    const pair = pairInput || {};

    return {
      pairId: normalizeString(pair.pairId || pair.pair_id, ''),
      recordId: normalizeString(pair.recordId || pair.record_id, ''),
      stage: normalizeString(pair.stage, ''),
      title: getRecordTitle(pair.record),
      status: normalizeString(pair.status, ''),
      conflictStatus: normalizeString(pair.conflictStatus || pair.conflict_status, ''),
      reviewerA: pair.reviewerA ? summarizeDecision(pair.reviewerA) : null,
      reviewerB: pair.reviewerB ? summarizeDecision(pair.reviewerB) : null,
      signatures: {
        reviewerA: normalizeString(pair.signatures && pair.signatures.reviewerA, ''),
        reviewerB: normalizeString(pair.signatures && pair.signatures.reviewerB, ''),
      },
      resolverDecision: pair.resolverDecision ? summarizeDecision(pair.resolverDecision) : null,
      updatedAt: normalizeString(pair.updatedAt || pair.updated_at, ''),
    };
  }

  function conflictToExportRow(conflictInput) {
    const conflict = conflictInput || {};
    const isQuality = normalizeString(conflict.conflictType || conflict.conflict_type, '') === 'quality';
    const reviewerA = conflict.reviewerA || {};
    const reviewerB = conflict.reviewerB || {};
    const resolver = conflict.resolverDecision || null;
    const differences = Array.isArray(conflict.differences)
      ? conflict.differences
      : conflict.signatures
        ? [{ field: normalizeString(conflict.field, 'human_decision'), reviewerA: conflict.signatures.reviewerA, reviewerB: conflict.signatures.reviewerB }]
        : [];

    return {
      schema_version: normalizeString(conflict.schemaVersion || conflict.schema_version, DUAL_REVIEW_SCHEMA_VERSION),
      conflict_id: normalizeString(conflict.conflictId || conflict.conflict_id, ''),
      conflict_type: normalizeString(conflict.conflictType || conflict.conflict_type, 'screening'),
      status: normalizeString(conflict.status, 'pending'),
      stage: normalizeString(conflict.stage, isQuality ? 'quality' : ''),
      record_id: normalizeString(conflict.recordId || conflict.record_id, ''),
      title: getRecordTitle(conflict.record || reviewerA.raw || reviewerB.raw),
      field: isQuality
        ? differences.map((difference) => normalizeString(difference.field, '')).filter(Boolean).join(';')
        : normalizeString(conflict.field, 'human_decision'),
      reviewer_a_id: normalizeString(reviewerA.reviewerId || reviewerA.reviewer_id, ''),
      reviewer_a_decision: isQuality ? summarizeQualityAssessmentForExport(reviewerA) : decisionSignature(reviewerA),
      reviewer_a_reason: isQuality ? '' : normalizeString(reviewerA.exclusionReason || reviewerA.exclusion_reason, ''),
      reviewer_b_id: normalizeString(reviewerB.reviewerId || reviewerB.reviewer_id, ''),
      reviewer_b_decision: isQuality ? summarizeQualityAssessmentForExport(reviewerB) : decisionSignature(reviewerB),
      reviewer_b_reason: isQuality ? '' : normalizeString(reviewerB.exclusionReason || reviewerB.exclusion_reason, ''),
      resolver_id: resolver ? normalizeString(resolver.reviewerId || resolver.reviewer_id, '') : '',
      final_decision: resolver ? (isQuality ? summarizeQualityAssessmentForExport(resolver) : decisionSignature(resolver)) : '',
      final_reason: resolver && !isQuality ? normalizeString(resolver.exclusionReason || resolver.exclusion_reason, '') : '',
      differences: JSON.stringify(differences),
      updated_at: normalizeString(conflict.updatedAt || conflict.updated_at, ''),
    };
  }

  function summarizeQualityAssessmentForExport(assessmentInput) {
    const assessment = assessmentInput && assessmentInput.raw
      ? assessmentInput
      : normalizeQualityAssessment(assessmentInput || {});
    const domains = assessment.domainJudgements && typeof assessment.domainJudgements === 'object'
      ? Object.keys(assessment.domainJudgements)
        .sort()
        .map((domainId) => `${domainId}:${assessment.domainJudgements[domainId]}`)
        .join(';')
      : '';

    return [
      `overall:${normalizeString(assessment.overallJudgement || assessment.overall_judgement, 'not_assessed')}`,
      `status:${normalizeString(assessment.status, 'not_started')}`,
      domains ? `domains:${domains}` : '',
    ].filter(Boolean).join('|');
  }

  function getRecordTitle(record) {
    const source = record && typeof record === 'object' ? record : {};
    return normalizeString(source.title || source.TI || source.T1 || source.name || '', '');
  }

  function summarizeConflicts(conflicts) {
    const summary = {
      total: 0,
      pending: 0,
      resolved: 0,
      byType: {},
      byStage: {},
    };

    (Array.isArray(conflicts) ? conflicts : []).forEach((conflict) => {
      const status = conflict && conflict.status === 'resolved' ? 'resolved' : 'pending';
      summary.total += 1;
      summary[status] += 1;
      increment(summary.byType, normalizeString(conflict && conflict.conflictType, 'unknown'));
      increment(summary.byStage, normalizeString(conflict && conflict.stage, 'unknown'));
    });

    return summary;
  }

  function increment(target, key) {
    target[key] = (target[key] || 0) + 1;
  }

  function csvCell(value) {
    if (value === null || value === undefined) {
      return '';
    }

    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  }

  return {
    DUAL_REVIEW_SCHEMA_VERSION,
    DUAL_REVIEW_CONFLICT_EXPORT_COLUMNS,
    normalizeReviewSelection,
    normalizeScreeningDecision,
    normalizeScreeningDecisionRecord,
    createReviewerDecision,
    createResolverScreeningDecision,
    createResolverAuditEvent,
    createResolverQualityAssessment,
    createQualityConflictResolvedAuditEvent,
    getLatestScreeningDecisions,
    buildScreeningConflictQueue,
    buildScreeningAgreementPairs,
    buildQualityConflictQueue,
    buildExportGateStatus,
    buildDualReviewAgreementExport,
    summarizeConflicts,
    calculateAgreementMetrics,
    calculateScreeningAgreementMetrics,
    calculateCohensKappa,
    serializeDualReviewAgreementJson,
    serializeDualReviewConflictsCsv,
    isResolverDecision,
    decisionSignature,
    getReviewerSlot,
  };
});
