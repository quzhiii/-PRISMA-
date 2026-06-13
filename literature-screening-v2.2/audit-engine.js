(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === 'object') {
    root.AuditEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const AUDIT_SCHEMA_VERSION = 'audit.v1';

  const EXCLUSION_REASONS = Object.freeze([
    'wrong_population',
    'wrong_intervention_or_exposure',
    'wrong_comparator',
    'wrong_outcome',
    'wrong_study_design',
    'non_empirical',
    'duplicate',
    'not_full_text_available',
    'non_target_language',
    'outside_year_range',
    'protocol_only',
    'review_article',
    'conference_abstract_only',
    'other',
  ]);

  const VALID_AI_MODES = new Set(['off', 'assistive', 'experimental']);
  const VALID_AI_PROVIDER_TYPES = new Set(['none', 'local', 'user_provided_endpoint', 'hosted']);
  const VALID_AI_DATA_BOUNDARIES = new Set(['local_only', 'hash_only', 'cloud_submitted']);
  const VALID_AI_SUGGESTION_MODES = new Set(['suggest_only', 'prioritise', 'uncertainty_flagging', 'report_helper']);
  const VALID_AI_HUMAN_ACTIONS = new Set(['accepted', 'rejected', 'edited', 'ignored', 'pending']);
  const VALID_DECISIONS = new Set(['include', 'exclude', 'uncertain', 'pending']);
  const VALID_CONFLICT_STATUSES = new Set(['none', 'pending', 'resolved']);
  const VALID_QUALITY_APPRAISAL_STATUSES = new Set(['not_started', 'queued', 'in_progress', 'complete']);
  const VALID_FINAL_EXPORT_STATUSES = new Set(['not_exported', 'included', 'excluded', 'warning']);
  const RESOLVER_REVIEWER_IDS = new Set(['resolver', 'resolver_1', 'resolver-1', 'consensus', 'final', 'final_decision']);
  const EVENT_TYPE_ALIASES = Object.freeze({
    dedup_auto_removed: 'hard_duplicate_removed',
    dedup_candidate_flagged: 'candidate_duplicate_flagged',
    rule_screen_decision: 'rule_screening_decision',
    full_text_decision_finalized: 'manual_screening_decision',
    quality_queue_prepared: 'quality_appraisal_started',
    study_design_suggested: 'quality_appraisal_updated',
  });
  const V26_ADVISORY_QUEUE_BUCKETS = Object.freeze([
    'likely_relevant',
    'needs_human_attention',
    'needs_human_exclusion_check',
  ]);

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    const safePrefix = String(prefix || 'id').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'id';

    if (typeof crypto !== 'undefined' && crypto && typeof crypto.randomUUID === 'function') {
      return `${safePrefix}-${crypto.randomUUID()}`;
    }

    return `${safePrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function clonePlain(value, fallback) {
    if (value === undefined) {
      return fallback;
    }

    if (value === null) {
      return null;
    }

    if (Array.isArray(value)) {
      return value.map((entry) => clonePlain(entry, entry));
    }

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

  function normalizeArray(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.slice();
  }

  function normalizeObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return clonePlain(value, {});
  }

  function normalizeAiMode(value) {
    const normalized = normalizeString(value, 'off');
    return VALID_AI_MODES.has(normalized) ? normalized : 'off';
  }

  function normalizeDecision(value) {
    const normalized = normalizeString(value, 'pending').toLowerCase();
    return VALID_DECISIONS.has(normalized) ? normalized : 'pending';
  }

  function normalizeEventType(value) {
    const normalized = normalizeString(value, 'unknown_event');
    return EVENT_TYPE_ALIASES[normalized] || normalized;
  }

  function normalizeEnum(value, allowedValues, fallback) {
    const normalized = normalizeString(value, fallback).toLowerCase();
    return allowedValues.has(normalized) ? normalized : fallback;
  }

  function normalizeBoolean(value, fallback) {
    if (value === undefined || value === null || value === '') {
      return Boolean(fallback);
    }

    if (typeof value === 'boolean') {
      return value;
    }

    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }

    return Boolean(fallback);
  }

  function normalizeNumber(value, fallback) {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function normalizeConfidence(value) {
    const numeric = normalizeNumber(value, null);
    if (numeric === null) {
      return null;
    }

    if (numeric < 0) return 0;
    if (numeric > 1) return 1;
    return numeric;
  }

  function normalizeExclusionReason(value) {
    const normalized = normalizeString(value, '');
    if (!normalized) {
      return '';
    }

    return EXCLUSION_REASONS.includes(normalized) ? normalized : 'other';
  }

  function createProjectManifest(input) {
    const payload = input || {};
    const timestamp = normalizeString(payload.timestamp, '') || nowIso();
    const createdAt = normalizeString(payload.createdAt, timestamp);
    const updatedAt = normalizeString(payload.updatedAt, timestamp);

    return {
      projectId: normalizeString(payload.projectId || payload.project_id, makeId('project')),
      projectName: normalizeString(payload.projectName || payload.project_name, 'Untitled systematic review'),
      createdAt,
      updatedAt,
      reviewType: normalizeString(payload.reviewType || payload.review_type, 'systematic_review'),
      prismaVersion: normalizeString(payload.prismaVersion || payload.prisma_version, 'PRISMA_2020'),
      aiMode: normalizeAiMode(payload.aiMode || payload.ai_mode),
      appVersion: normalizeString(payload.appVersion || payload.app_version, 'v2.5'),
      dataResidency: normalizeString(payload.dataResidency || payload.data_residency, 'local_browser'),
      exportGeneratedAt: normalizeString(payload.exportGeneratedAt || payload.export_generated_at, timestamp),
      dataSources: normalizeArray(payload.dataSources || payload.data_sources),
      reviewers: normalizeArray(payload.reviewers),
      aiUsageRegistry: normalizeArray(payload.aiUsageRegistry || payload.ai_usage_registry).map((entry) => createAiUsageRegistryEntry({
        projectId: payload.projectId || payload.project_id,
        ...entry,
      })),
      settings: normalizeObject(payload.settings),
      schemaVersion: normalizeString(payload.schemaVersion || payload.schema_version, AUDIT_SCHEMA_VERSION),
    };
  }

  function createAuditEvent(input) {
    const payload = input || {};

    return {
      eventId: normalizeString(payload.eventId || payload.event_id, makeId('event')),
      projectId: normalizeString(payload.projectId || payload.project_id, ''),
      timestamp: normalizeString(payload.timestamp, '') || nowIso(),
      actorId: normalizeString(payload.actorId || payload.actor_id, 'system'),
      actorRole: normalizeString(payload.actorRole || payload.actor_role, 'system'),
      eventType: normalizeEventType(payload.eventType || payload.event_type),
      recordId: normalizeString(payload.recordId || payload.record_id, ''),
      stage: normalizeString(payload.stage, ''),
      sourceFile: normalizeString(payload.sourceFile || payload.source_file, ''),
      sourceDatabase: normalizeString(payload.sourceDatabase || payload.source_database, ''),
      payload: normalizeObject(payload.payload),
      before: clonePlain(payload.before, null),
      after: clonePlain(payload.after, null),
      reason: normalizeString(payload.reason, ''),
      source: normalizeString(payload.source, 'system'),
      metadata: normalizeObject(payload.metadata),
      schemaVersion: normalizeString(payload.schemaVersion || payload.schema_version, AUDIT_SCHEMA_VERSION),
    };
  }

  function appendAuditEvent(events, eventInput) {
    const list = Array.isArray(events) ? events.slice() : [];

    if (Array.isArray(eventInput)) {
      eventInput.forEach((entry) => {
        list.push(createAuditEvent(entry));
      });
      return list;
    }

    list.push(createAuditEvent(eventInput));
    return list;
  }

  function getAuditTrail(events, recordId) {
    const normalizedRecordId = normalizeString(recordId, '');

    if (!normalizedRecordId || !Array.isArray(events)) {
      return [];
    }

    return events
      .filter((event) => normalizeString(event && (event.recordId || event.record_id), '') === normalizedRecordId)
      .slice()
      .sort(compareAuditEvents);
  }

  function compareAuditEvents(left, right) {
    const leftTime = normalizeString(left && left.timestamp, '');
    const rightTime = normalizeString(right && right.timestamp, '');

    if (leftTime !== rightTime) {
      return leftTime.localeCompare(rightTime);
    }

    return normalizeString(left && left.eventId, '').localeCompare(normalizeString(right && right.eventId, ''));
  }

  function createScreeningDecision(input) {
    const payload = input || {};
    const timestamp = normalizeString(payload.decidedAt || payload.decided_at || payload.timestamp, '') || nowIso();

    return {
      decisionId: normalizeString(payload.decisionId || payload.decision_id, makeId('decision')),
      projectId: normalizeString(payload.projectId || payload.project_id, ''),
      recordId: normalizeString(payload.recordId || payload.record_id, ''),
      sourceFile: normalizeString(payload.sourceFile || payload.source_file, ''),
      sourceDatabase: normalizeString(payload.sourceDatabase || payload.source_database, ''),
      stage: normalizeString(payload.stage || payload.screening_stage, 'title_abstract'),
      decision: normalizeDecision(payload.decision || payload.human_decision),
      exclusionReason: normalizeExclusionReason(payload.exclusionReason || payload.exclusion_reason),
      reviewerId: normalizeString(payload.reviewerId || payload.reviewer_id, 'system'),
      conflictStatus: normalizeEnum(payload.conflictStatus || payload.conflict_status, VALID_CONFLICT_STATUSES, 'none'),
      qualityAppraisalStatus: normalizeEnum(payload.qualityAppraisalStatus || payload.quality_appraisal_status, VALID_QUALITY_APPRAISAL_STATUSES, 'not_started'),
      aiAssistanceUsed: normalizeBoolean(payload.aiAssistanceUsed === undefined ? payload.ai_assistance_used : payload.aiAssistanceUsed, false),
      aiModel: normalizeString(payload.aiModel || payload.ai_model, ''),
      aiPromptHash: normalizeString(payload.aiPromptHash || payload.ai_prompt_hash, ''),
      aiOutputSummary: normalizeString(payload.aiOutputSummary || payload.ai_output_summary, ''),
      finalExportStatus: normalizeEnum(payload.finalExportStatus || payload.final_export_status, VALID_FINAL_EXPORT_STATUSES, 'not_exported'),
      decidedAt: timestamp,
      updatedAt: normalizeString(payload.updatedAt || payload.updated_at, timestamp),
      source: normalizeString(payload.source, 'human'),
      notes: normalizeString(payload.notes, ''),
      metadata: normalizeObject(payload.metadata),
      schemaVersion: normalizeString(payload.schemaVersion || payload.schema_version, AUDIT_SCHEMA_VERSION),
    };
  }

  function createAiUsageRegistryEntry(input) {
    const payload = input || {};
    const enabledAt = normalizeString(payload.enabledAt || payload.enabled_at, '') || nowIso();
    const disabledAt = normalizeString(payload.disabledAt || payload.disabled_at, '');

    return {
      usageId: normalizeString(payload.usageId || payload.usage_id, makeId('aiusage')),
      projectId: normalizeString(payload.projectId || payload.project_id, ''),
      aiMode: normalizeAiMode(payload.aiMode || payload.ai_mode),
      providerType: normalizeEnum(payload.providerType || payload.provider_type, VALID_AI_PROVIDER_TYPES, 'none'),
      providerName: normalizeString(payload.providerName || payload.provider_name, ''),
      modelName: normalizeString(payload.modelName || payload.model_name, ''),
      enabledAt,
      disabledAt,
      allowedStages: normalizeArray(payload.allowedStages || payload.allowed_stages).map((stage) => normalizeString(stage, '')).filter(Boolean),
      dataBoundary: normalizeEnum(payload.dataBoundary || payload.data_boundary, VALID_AI_DATA_BOUNDARIES, 'local_only'),
      userAcknowledged: normalizeBoolean(payload.userAcknowledged === undefined ? payload.user_acknowledged : payload.userAcknowledged, false),
      metadata: normalizeObject(payload.metadata),
    };
  }

  function upsertAiUsageRegistry(registry, entryInput) {
    const list = Array.isArray(registry) ? registry.slice() : [];
    const entry = createAiUsageRegistryEntry(entryInput);
    const existingIndex = list.findIndex((item) => normalizeString(item && (item.usageId || item.usage_id), '') === entry.usageId);

    if (existingIndex >= 0) {
      list[existingIndex] = entry;
    } else {
      list.push(entry);
    }

    return list.sort((left, right) => normalizeString(left.enabledAt, '').localeCompare(normalizeString(right.enabledAt, '')));
  }

  function createAiSuggestionEvent(input) {
    const payload = input || {};
    const createdAt = normalizeString(payload.createdAt || payload.created_at, '') || nowIso();

    return {
      suggestionId: normalizeString(payload.suggestionId || payload.suggestion_id, makeId('aisuggestion')),
      projectId: normalizeString(payload.projectId || payload.project_id, ''),
      recordId: normalizeString(payload.recordId || payload.record_id, ''),
      stage: normalizeString(payload.stage, 'title_abstract'),
      mode: normalizeEnum(payload.mode, VALID_AI_SUGGESTION_MODES, 'suggest_only'),
      modelName: normalizeString(payload.modelName || payload.model_name, ''),
      promptHash: normalizeString(payload.promptHash || payload.prompt_hash, ''),
      inputHash: normalizeString(payload.inputHash || payload.input_hash, ''),
      inputSummary: normalizeString(payload.inputSummary || payload.input_summary, ''),
      suggestedDecision: normalizeDecision(payload.suggestedDecision || payload.suggested_decision),
      rationale: normalizeString(payload.rationale, ''),
      confidence: normalizeConfidence(payload.confidence),
      humanAction: normalizeEnum(payload.humanAction || payload.human_action, VALID_AI_HUMAN_ACTIONS, 'pending'),
      linkedDecisionId: normalizeString(payload.linkedDecisionId || payload.linked_decision_id, ''),
      createdAt,
      metadata: normalizeObject(payload.metadata),
      schemaVersion: normalizeString(payload.schemaVersion || payload.schema_version, AUDIT_SCHEMA_VERSION),
    };
  }

  function appendAiSuggestionEvent(events, eventInput) {
    const list = Array.isArray(events) ? events.slice() : [];

    if (Array.isArray(eventInput)) {
      eventInput.forEach((entry) => {
        list.push(createAiSuggestionEvent(entry));
      });
      return list.sort(compareAiSuggestionEvents);
    }

    list.push(createAiSuggestionEvent(eventInput));
    return list.sort(compareAiSuggestionEvents);
  }

  function compareAiSuggestionEvents(left, right) {
    const leftTime = normalizeString(left && (left.createdAt || left.created_at), '');
    const rightTime = normalizeString(right && (right.createdAt || right.created_at), '');

    if (leftTime !== rightTime) {
      return leftTime.localeCompare(rightTime);
    }

    return normalizeString(left && (left.suggestionId || left.suggestion_id), '').localeCompare(normalizeString(right && (right.suggestionId || right.suggestion_id), ''));
  }

  function updateScreeningDecision(existing, patch) {
    const base = createScreeningDecision(existing || {});
    const next = patch || {};
    const updatedAt = normalizeString(next.updatedAt || next.updated_at, '') || nowIso();

    return {
      ...base,
      projectId: normalizeString(next.projectId || next.project_id, base.projectId),
      recordId: normalizeString(next.recordId || next.record_id, base.recordId),
      sourceFile: normalizeString(next.sourceFile || next.source_file, base.sourceFile),
      sourceDatabase: normalizeString(next.sourceDatabase || next.source_database, base.sourceDatabase),
      stage: normalizeString(next.stage || next.screening_stage, base.stage),
      decision: next.decision === undefined && next.human_decision === undefined ? base.decision : normalizeDecision(next.decision || next.human_decision),
      exclusionReason: next.exclusionReason === undefined && next.exclusion_reason === undefined
        ? base.exclusionReason
        : normalizeExclusionReason(next.exclusionReason || next.exclusion_reason),
      reviewerId: normalizeString(next.reviewerId || next.reviewer_id, base.reviewerId),
      conflictStatus: normalizeEnum(next.conflictStatus || next.conflict_status, VALID_CONFLICT_STATUSES, base.conflictStatus),
      qualityAppraisalStatus: normalizeEnum(next.qualityAppraisalStatus || next.quality_appraisal_status, VALID_QUALITY_APPRAISAL_STATUSES, base.qualityAppraisalStatus),
      aiAssistanceUsed: next.aiAssistanceUsed === undefined && next.ai_assistance_used === undefined
        ? base.aiAssistanceUsed
        : normalizeBoolean(next.aiAssistanceUsed === undefined ? next.ai_assistance_used : next.aiAssistanceUsed, base.aiAssistanceUsed),
      aiModel: normalizeString(next.aiModel || next.ai_model, base.aiModel),
      aiPromptHash: normalizeString(next.aiPromptHash || next.ai_prompt_hash, base.aiPromptHash),
      aiOutputSummary: normalizeString(next.aiOutputSummary || next.ai_output_summary, base.aiOutputSummary),
      finalExportStatus: normalizeEnum(next.finalExportStatus || next.final_export_status, VALID_FINAL_EXPORT_STATUSES, base.finalExportStatus),
      updatedAt,
      source: normalizeString(next.source, base.source),
      notes: next.notes === undefined ? base.notes : normalizeString(next.notes, ''),
      metadata: next.metadata === undefined ? base.metadata : normalizeObject(next.metadata),
      schemaVersion: normalizeString(next.schemaVersion || next.schema_version, base.schemaVersion),
    };
  }

  function calculatePrismaCountsFromDecisions(decisions, events) {
    const latestDecisions = getCountableDecisions(decisions);
    const titleAbstract = latestDecisions.filter((decision) => decision.stage === 'title_abstract');
    const fullText = latestDecisions.filter((decision) => decision.stage === 'full_text');
    const eventList = Array.isArray(events) ? events : [];

    return {
      recordsImported: countUniqueEvents(eventList, 'record_imported'),
      duplicatesRemoved: countUniqueEvents(eventList, 'hard_duplicate_removed'),
      titleAbstractIncluded: countDecisions(titleAbstract, 'include'),
      titleAbstractExcluded: countDecisions(titleAbstract, 'exclude'),
      titleAbstractUncertain: countDecisions(titleAbstract, 'uncertain'),
      fullTextAssessed: fullText.filter((decision) => decision.decision !== 'pending').length,
      fullTextIncluded: countDecisions(fullText, 'include'),
      fullTextExcluded: countDecisions(fullText, 'exclude'),
      studiesIncluded: countDecisions(fullText, 'include'),
    };
  }

  function getLatestDecisions(decisions) {
    const byKey = new Map();
    const list = Array.isArray(decisions) ? decisions : [];

    list.forEach((entry) => {
      const decision = createScreeningDecision(entry);
      const key = `${decision.recordId}::${decision.stage}::${decision.reviewerId}`;
      const existing = byKey.get(key);

      if (!existing || compareDecisionTime(existing, decision) <= 0) {
        byKey.set(key, decision);
      }
    });

    return Array.from(byKey.values());
  }

  function getCountableDecisions(decisions) {
    const latestDecisions = getLatestDecisions(decisions);
    const grouped = new Map();

    latestDecisions.forEach((decision) => {
      const key = `${decision.recordId}::${decision.stage}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(decision);
    });

    const countable = [];
    grouped.forEach((group) => {
      const resolverDecision = group
        .filter(isResolverDecision)
        .sort(compareDecisionTime)
        .pop();

      if (resolverDecision) {
        countable.push(resolverDecision);
        return;
      }

      const humanReviewerDecisions = group.filter((decision) => !isResolverDecision(decision));
      const reviewerA = pickReviewerSlotDecision(humanReviewerDecisions, 'A');
      const reviewerB = pickReviewerSlotDecision(humanReviewerDecisions, 'B');

      if (reviewerA && reviewerB) {
        if (getDecisionSignature(reviewerA) === getDecisionSignature(reviewerB)) {
          countable.push(compareDecisionTime(reviewerA, reviewerB) >= 0 ? reviewerA : reviewerB);
        }
        return;
      }

      const manualDecision = humanReviewerDecisions
        .filter((decision) => !isRuleDecision(decision))
        .sort(compareDecisionTime)
        .pop();
      if (manualDecision) {
        countable.push(manualDecision);
        return;
      }

      const ruleDecision = humanReviewerDecisions
        .filter(isRuleDecision)
        .sort(compareDecisionTime)
        .pop();
      if (ruleDecision) {
        countable.push(ruleDecision);
      }
    });

    return countable;
  }

  function pickReviewerSlotDecision(decisions, slot) {
    return (Array.isArray(decisions) ? decisions : [])
      .filter((decision) => getDecisionReviewerSlot(decision.reviewerId) === slot)
      .sort(compareDecisionTime)
      .pop() || null;
  }

  function getDecisionReviewerSlot(reviewerId) {
    const normalized = normalizeString(reviewerId, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (['reviewera', 'reviewer1', 'a', 'primary', 'main', 'reviewermain'].includes(normalized)) return 'A';
    if (['reviewerb', 'reviewer2', 'b', 'secondary', 'deputy', 'reviewersecondary'].includes(normalized)) return 'B';
    return '';
  }

  function getDecisionSignature(decisionInput) {
    const decision = createScreeningDecision(decisionInput);
    return decision.decision === 'exclude'
      ? `${decision.decision}:${decision.exclusionReason || 'other'}`
      : decision.decision;
  }

  function isRuleDecision(decisionInput) {
    const decision = createScreeningDecision(decisionInput);
    const reviewerId = normalizeString(decision.reviewerId, '').toLowerCase();
    const source = normalizeString(decision.source, '').toLowerCase();
    return source === 'rule' || reviewerId === 'system_rule';
  }

  function isResolverDecision(decisionInput) {
    const decision = createScreeningDecision(decisionInput);
    const metadata = normalizeObject(decision.metadata);
    const reviewerId = normalizeString(decision.reviewerId, '').toLowerCase();

    return RESOLVER_REVIEWER_IDS.has(reviewerId)
      || reviewerId.includes('resolver')
      || reviewerId.includes('consensus')
      || reviewerId.includes('final')
      || metadata.resolverAction === true
      || metadata.resolver_action === true
      || metadata.finalDecision === true
      || metadata.final_decision === true
      || metadata.resolutionSource === 'resolver'
      || metadata.resolution_source === 'resolver';
  }

  function compareDecisionTime(left, right) {
    const leftTime = normalizeString(left.updatedAt || left.decidedAt, '');
    const rightTime = normalizeString(right.updatedAt || right.decidedAt, '');

    if (leftTime !== rightTime) {
      return leftTime.localeCompare(rightTime);
    }

    return normalizeString(left.decisionId, '').localeCompare(normalizeString(right.decisionId, ''));
  }

  function countDecisions(decisions, decisionValue) {
    return decisions.filter((decision) => decision.decision === decisionValue).length;
  }

  function countUniqueEvents(events, eventType) {
    const seen = new Set();
    let anonymousCount = 0;

    events.forEach((entry) => {
      const event = createAuditEvent(entry);

      if (normalizeEventType(event.eventType) !== eventType) {
        return;
      }

      if (!event.recordId) {
        anonymousCount += 1;
        return;
      }

      seen.add(event.recordId);
    });

    return seen.size + anonymousCount;
  }

  function summarizeAuditEvents(events) {
    const summary = {
      totalEvents: 0,
      byType: {},
      bySource: {},
      byActorRole: {},
    };

    (Array.isArray(events) ? events : []).forEach((entry) => {
      const event = createAuditEvent(entry);
      summary.totalEvents += 1;
      increment(summary.byType, event.eventType);
      increment(summary.bySource, event.source);
      increment(summary.byActorRole, event.actorRole);
    });

    return summary;
  }

  function summarizeAiSuggestions(events) {
    const summary = {
      totalSuggestions: 0,
      pendingSuggestions: 0,
      reviewedSuggestions: 0,
      linkedHumanDecisionCount: 0,
      unlinkedReviewedSuggestionCount: 0,
      advisoryOnlyReviewedSuggestionCount: 0,
      acceptedOrEditedWithoutLinkedDecisionCount: 0,
      byMode: {},
      byHumanAction: {},
      bySuggestedDecision: {},
    };

    (Array.isArray(events) ? events : []).forEach((entry) => {
      const event = createAiSuggestionEvent(entry);
      const isPending = event.humanAction === 'pending';
      const hasLinkedDecision = !!event.linkedDecisionId;
      const createsHumanDecision = event.humanAction === 'accepted' || event.humanAction === 'edited';
      const isAdvisoryOnlyReview = event.humanAction === 'rejected' || event.humanAction === 'ignored';

      summary.totalSuggestions += 1;
      if (isPending) {
        summary.pendingSuggestions += 1;
      } else {
        summary.reviewedSuggestions += 1;
      }
      if (hasLinkedDecision) {
        summary.linkedHumanDecisionCount += 1;
      }
      if (!isPending && !hasLinkedDecision) {
        summary.unlinkedReviewedSuggestionCount += 1;
      }
      if (isAdvisoryOnlyReview) {
        summary.advisoryOnlyReviewedSuggestionCount += 1;
      }
      if (createsHumanDecision && !hasLinkedDecision) {
        summary.acceptedOrEditedWithoutLinkedDecisionCount += 1;
      }
      increment(summary.byMode, event.mode);
      increment(summary.byHumanAction, event.humanAction);
      increment(summary.bySuggestedDecision, event.suggestedDecision);
    });

    return summary;
  }

  function summarizeV26AdvisoryQueue(events) {
    const summary = {
      totalSuggestions: 0,
      pendingSuggestions: 0,
      reviewedSuggestions: 0,
      byRecommendedQueue: createV26QueueBucketCounts(),
    };

    (Array.isArray(events) ? events : []).forEach((entry) => {
      const event = createAiSuggestionEvent(entry);
      const metadata = normalizeObject(event.metadata);
      const advisoryOnly = normalizeBoolean(
        metadata.advisoryOnly === undefined ? metadata.advisory_only : metadata.advisoryOnly,
        false
      );

      if (event.stage !== 'title_abstract' || !advisoryOnly) {
        return;
      }

      summary.totalSuggestions += 1;
      if (event.humanAction === 'pending') {
        summary.pendingSuggestions += 1;
      } else {
        summary.reviewedSuggestions += 1;
      }

      const bucketKey = normalizeString(metadata.recommendedQueue || metadata.recommended_queue, '');
      if (Object.prototype.hasOwnProperty.call(summary.byRecommendedQueue, bucketKey)) {
        summary.byRecommendedQueue[bucketKey] += 1;
      }
    });

    return summary;
  }

  function createV26QueueBucketCounts() {
    return V26_ADVISORY_QUEUE_BUCKETS.reduce((counts, bucketKey) => {
      counts[bucketKey] = 0;
      return counts;
    }, {});
  }

  function buildV26AdvisoryQueueSummaryLines(queueSummary, isZh) {
    const summary = queueSummary || summarizeV26AdvisoryQueue([]);
    const bucketRows = V26_ADVISORY_QUEUE_BUCKETS
      .map((bucketKey) => `| ${bucketKey} | ${summary.byRecommendedQueue?.[bucketKey] || 0} |`);

    if (isZh) {
      return [
        '## V2.6 建议队列控件摘要',
        '',
        `建议队列总数：${summary.totalSuggestions}`,
        `待复核建议队列：${summary.pendingSuggestions}`,
        `已复核建议队列：${summary.reviewedSuggestions}`,
        '',
        '| 队列 bucket | 数量 |',
        '|---|---:|',
        ...bucketRows,
        '',
        'Available Step 3 queue controls: queue labels, queue summary, priority sorting, review-state filters, and empty-state clarity.',
        'This section reports available controls and derived metadata summaries, not tracked control-click usage.',
        'V2.6 建议队列仍然只作为人工复核前的 advisory 队列，不会直接改变 `ScreeningDecision` 或 PRISMA 计数。',
        '',
      ];
    }

    return [
      '## V2.6 Advisory Queue Controls Summary',
      '',
      `Total advisory queue suggestions: ${summary.totalSuggestions}`,
      `Pending advisory queue suggestions: ${summary.pendingSuggestions}`,
      `Reviewed advisory queue suggestions: ${summary.reviewedSuggestions}`,
      '',
      '| Queue bucket | Count |',
      '|---|---:|',
      ...bucketRows,
      '',
      'Available Step 3 queue controls: queue labels, queue summary, priority sorting, review-state filters, and empty-state clarity.',
      'This section reports available controls and derived metadata summaries, not tracked control-click usage.',
      'V2.6 queue metadata remains advisory-only and does not change `ScreeningDecision` records or PRISMA counts.',
      '',
    ];
  }

  function increment(target, key) {
    const normalized = normalizeString(key, 'unknown');
    target[normalized] = (target[normalized] || 0) + 1;
  }

  function serializeEventsJsonl(events) {
    const list = Array.isArray(events) ? events : [];
    if (list.length === 0) {
      return '';
    }

    return `${list.map((event) => JSON.stringify(toExportAuditEvent(event))).join('\n')}\n`;
  }

  function serializeScreeningDecisionsCsv(decisions) {
    const fields = [
      'decision_id',
      'project_id',
      'record_id',
      'source_file',
      'source_database',
      'screening_stage',
      'human_decision',
      'exclusion_reason',
      'reviewer_id',
      'conflict_status',
      'quality_appraisal_status',
      'ai_assistance_used',
      'ai_model',
      'ai_prompt_hash',
      'ai_output_summary',
      'final_export_status',
      'updated_at',
    ];

    const rows = (Array.isArray(decisions) ? decisions : []).map((decision) => {
      const normalized = toExportScreeningDecision(decision);
      return fields.map((field) => csvCell(normalized[field])).join(',');
    });

    return [fields.join(','), ...rows].join('\n');
  }

  function serializeExclusionReasonsCsv(decisions, taxonomy) {
    const reasons = Array.isArray(taxonomy) && taxonomy.length > 0 ? taxonomy : EXCLUSION_REASONS;
    const counts = {};

    reasons.forEach((reason) => {
      counts[reason] = 0;
    });

    (Array.isArray(decisions) ? decisions : []).forEach((entry) => {
      const decision = createScreeningDecision(entry);
      if (decision.decision !== 'exclude') {
        return;
      }

      const reason = decision.exclusionReason || 'other';
      counts[reason] = (counts[reason] || 0) + 1;
    });

    const rows = Object.keys(counts).map((reason) => [
      csvCell(reason),
      csvCell(counts[reason]),
    ].join(','));

    return ['exclusionReason,count', ...rows].join('\n');
  }

  function buildProjectManifestExport(manifestInput) {
    return toExportProjectManifest(manifestInput);
  }

  function toExportProjectManifest(manifestInput) {
    const manifest = createProjectManifest(manifestInput);
    return {
      project_id: manifest.projectId,
      project_name: manifest.projectName,
      created_at: manifest.createdAt,
      updated_at: manifest.updatedAt,
      app_version: manifest.appVersion,
      audit_schema_version: manifest.schemaVersion,
      prisma_version: manifest.prismaVersion,
      ai_mode: manifest.aiMode,
      data_residency: manifest.dataResidency,
      export_generated_at: manifest.exportGeneratedAt,
    };
  }

  function buildAiUsageRegistryExport(manifestInput) {
    const manifest = createProjectManifest(manifestInput);
    return {
      schemaVersion: manifest.schemaVersion,
      projectId: manifest.projectId,
      aiMode: manifest.aiMode,
      generatedAt: manifest.exportGeneratedAt,
      registry: manifest.aiUsageRegistry.map((entry) => toExportAiUsageRegistryEntry(entry)),
    };
  }

  function toExportAuditEvent(eventInput) {
    const event = createAuditEvent(eventInput);
    return {
      event_id: event.eventId,
      project_id: event.projectId,
      record_id: event.recordId || null,
      event_type: event.eventType,
      stage: event.stage,
      timestamp: event.timestamp,
      actor_id: event.actorId,
      source_file: event.sourceFile || null,
      source_database: event.sourceDatabase || null,
      payload: event.payload,
      previous_value: event.before,
      new_value: event.after,
      audit_schema_version: event.schemaVersion,
    };
  }

  function toExportScreeningDecision(decisionInput) {
    const decision = createScreeningDecision(decisionInput);
    return {
      decision_id: decision.decisionId,
      project_id: decision.projectId,
      record_id: decision.recordId,
      source_file: decision.sourceFile,
      source_database: decision.sourceDatabase,
      screening_stage: decision.stage,
      human_decision: decision.decision,
      exclusion_reason: decision.exclusionReason,
      reviewer_id: decision.reviewerId,
      conflict_status: decision.conflictStatus,
      quality_appraisal_status: decision.qualityAppraisalStatus,
      ai_assistance_used: decision.aiAssistanceUsed,
      ai_model: decision.aiModel,
      ai_prompt_hash: decision.aiPromptHash,
      ai_output_summary: decision.aiOutputSummary,
      final_export_status: decision.finalExportStatus,
      updated_at: decision.updatedAt,
    };
  }

  function toExportAiUsageRegistryEntry(entryInput) {
    const entry = createAiUsageRegistryEntry(entryInput);
    return {
      usage_id: entry.usageId,
      project_id: entry.projectId,
      ai_mode: entry.aiMode,
      provider_type: entry.providerType,
      provider_name: entry.providerName,
      model_name: entry.modelName,
      enabled_at: entry.enabledAt,
      disabled_at: entry.disabledAt || null,
      allowed_stages: entry.allowedStages,
      data_boundary: entry.dataBoundary,
      user_acknowledged: entry.userAcknowledged,
      metadata: entry.metadata,
    };
  }

  function getAiProviderBoundary(entryInput) {
    const entry = createAiUsageRegistryEntry(entryInput);
    const metadata = normalizeObject(entry.metadata);
    const providerConfig = normalizeObject(metadata.providerConfig || metadata.provider_config);
    const endpointOrigin = normalizeString(providerConfig.endpointOrigin || providerConfig.endpoint_origin, '');
    const requestPolicy = normalizeString(providerConfig.requestPolicy || providerConfig.request_policy, 'disabled');
    const apiKeyStorage = normalizeString(providerConfig.apiKeyStorage || providerConfig.api_key_storage, 'not_configured');
    const realProviderConnected = normalizeBoolean(
      providerConfig.realProviderConnected === undefined ? providerConfig.real_provider_connected : providerConfig.realProviderConnected,
      false
    );
    const apiKeyPresent = normalizeBoolean(
      providerConfig.apiKeyPresent === undefined ? providerConfig.api_key_present : providerConfig.apiKeyPresent,
      false
    );

    return {
      aiMode: entry.aiMode,
      providerType: entry.providerType,
      providerName: entry.providerName || '-',
      modelName: entry.modelName || '-',
      requestPolicy,
      realProviderConnected,
      dataBoundary: normalizeString(providerConfig.dataBoundary || providerConfig.data_boundary, entry.dataBoundary),
      endpointOrigin: endpointOrigin || '-',
      apiKeyPresent,
      apiKeyStorage,
    };
  }

  function toExportAiSuggestionEvent(eventInput) {
    const event = createAiSuggestionEvent(eventInput);
    const metadata = normalizeObject(event.metadata);
    return {
      suggestion_id: event.suggestionId,
      project_id: event.projectId,
      record_id: event.recordId || null,
      stage: event.stage,
      mode: event.mode,
      model_name: event.modelName,
      prompt_hash: event.promptHash,
      input_hash: event.inputHash,
      input_summary: event.inputSummary,
      suggested_decision: event.suggestedDecision,
      rationale: event.rationale,
      confidence: event.confidence,
      human_action: event.humanAction,
      linked_decision_id: event.linkedDecisionId || null,
      reviewed_at: metadata.reviewedAt || metadata.reviewed_at || null,
      human_edited_decision: metadata.humanEditedDecision || metadata.human_edited_decision || null,
      human_edited_exclusion_reason: metadata.humanEditedExclusionReason || metadata.human_edited_exclusion_reason || null,
      human_edited_original_exclusion_reason: metadata.humanEditedOriginalExclusionReason || metadata.human_edited_original_exclusion_reason || null,
      review_note: metadata.reviewNote || metadata.review_note || null,
      prisma_count_boundary: event.linkedDecisionId
        ? 'linked_human_screening_decision_required_for_counts'
        : 'advisory_log_only_not_counted_directly',
      created_at: event.createdAt,
      audit_schema_version: event.schemaVersion,
    };
  }

  function serializeAiSuggestionEventsJsonl(events) {
    const list = Array.isArray(events) ? events : [];
    if (list.length === 0) {
      return '';
    }

    return `${list.map((event) => JSON.stringify(toExportAiSuggestionEvent(event))).join('\n')}\n`;
  }

  function buildPrismaCountsJson(decisions, events) {
    return {
      schemaVersion: AUDIT_SCHEMA_VERSION,
      generatedAt: nowIso(),
      source: 'screening_decisions_and_audit_events',
      counts: calculatePrismaCountsFromDecisions(decisions, events),
    };
  }

  function formatDefensePercent(value) {
    const numeric = normalizeNumber(value, null);
    if (numeric === null) {
      return '0%';
    }

    const percent = numeric <= 1 ? numeric * 100 : numeric;
    const rounded = Math.round(percent * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}%`;
  }

  function summarizeDefenseSourceReliability(summaryInput, events) {
    const summary = normalizeObject(summaryInput);
    const normalizeCountMap = (input) => {
      const map = normalizeObject(input);
      return Object.keys(map).sort().reduce((acc, key) => {
        acc[key] = normalizeNumber(map[key], 0);
        return acc;
      }, {});
    };
    const hasDirectSummary = [
      'totalRecords',
      'warningRecordCount',
      'abstractTruncationCount',
      'abstractNoiseCount',
      'sourceMappingIncompleteCount',
    ].some((key) => summary[key] !== undefined);

    if (hasDirectSummary) {
      return {
        totalRecords: normalizeNumber(summary.totalRecords, 0),
        warningRecordCount: normalizeNumber(summary.warningRecordCount, 0),
        abstractTruncationCount: normalizeNumber(summary.abstractTruncationCount, 0),
        abstractNoiseCount: normalizeNumber(summary.abstractNoiseCount, 0),
        sourceMappingIncompleteCount: normalizeNumber(summary.sourceMappingIncompleteCount, 0),
        bySourceDatabase: normalizeCountMap(summary.bySourceDatabase || summary.by_source_database),
        byWarningType: normalizeCountMap(summary.byWarningType || summary.by_warning_type),
      };
    }

    return (Array.isArray(events) ? events : []).reduce((acc, entry) => {
      const event = createAuditEvent(entry);
      if (event.eventType !== 'source_quality_warning') {
        return acc;
      }

      const next = normalizeObject(event.after);
      acc.warningRecordCount += normalizeNumber(next.warningRecordCount, 0);
      acc.abstractTruncationCount += normalizeNumber(next.abstractTruncationCount, 0);
      acc.abstractNoiseCount += normalizeNumber(next.abstractNoiseCount, 0);
      acc.sourceMappingIncompleteCount += normalizeNumber(next.sourceMappingIncompleteCount, 0);
      return acc;
    }, {
      totalRecords: 0,
      warningRecordCount: 0,
      abstractTruncationCount: 0,
      abstractNoiseCount: 0,
      sourceMappingIncompleteCount: 0,
      bySourceDatabase: {},
      byWarningType: {},
    });
  }

  function summarizeDefenseDualReview(summaryInput) {
    const summary = normalizeObject(summaryInput);
    const agreementMetrics = normalizeObject(summary.agreementMetrics || summary.screeningAgreementMetrics);
    const exportGate = normalizeObject(summary.exportGate);
    const unresolvedConflictCount = normalizeNumber(exportGate.unresolvedConflictCount, 0);

    return {
      pairedDecisionCount: normalizeNumber(
        agreementMetrics.pairedDecisionCount !== undefined ? agreementMetrics.pairedDecisionCount : agreementMetrics.pairCount,
        0
      ),
      percentAgreement: formatDefensePercent(
        agreementMetrics.percentAgreement !== undefined ? agreementMetrics.percentAgreement : agreementMetrics.observedAgreement
      ),
      cohensKappa: normalizeNumber(
        agreementMetrics.cohensKappa !== undefined ? agreementMetrics.cohensKappa : agreementMetrics.kappa,
        0
      ),
      unresolvedConflictCount,
      unresolvedScreeningConflictCount: normalizeNumber(exportGate.unresolvedScreeningConflictCount, 0),
      unresolvedQualityConflictCount: normalizeNumber(exportGate.unresolvedQualityConflictCount, 0),
      hasUnresolvedConflicts: normalizeBoolean(exportGate.hasUnresolvedConflicts, unresolvedConflictCount > 0),
      status: normalizeString(exportGate.status, unresolvedConflictCount > 0 ? 'warning' : 'clear'),
    };
  }

  function summarizeDefenseQuality(summaryInput) {
    const summary = normalizeObject(summaryInput);
    const byStatus = normalizeObject(summary.byStatus);
    return {
      totalAssessments: normalizeNumber(summary.totalAssessments, 0),
      completedAssessments: normalizeNumber(
        summary.completedAssessments,
        normalizeNumber(byStatus.completed, 0) + normalizeNumber(byStatus.complete, 0)
      ),
      inProgressAssessments: normalizeNumber(summary.inProgressAssessments, normalizeNumber(byStatus.in_progress, 0)),
      missingAssessments: normalizeNumber(summary.missingAssessments, 0),
      evidenceTableReadyCount: normalizeNumber(summary.evidenceTableReadyCount, 0),
      gradeSummaryReadyCount: normalizeNumber(summary.gradeSummaryReadyCount, 0),
    };
  }

  function buildDefenseReadyAuditPackMarkdown(manifestInput, events, decisions, options = {}) {
    const manifest = createProjectManifest(manifestInput);
    const eventSummary = summarizeAuditEvents(events);
    const counts = calculatePrismaCountsFromDecisions(decisions, events);
    const language = normalizeString(options.language || options.lang, 'en').toLowerCase() === 'zh' ? 'zh' : 'en';
    const isZh = language === 'zh';
    const dualReviewSummary = summarizeDefenseDualReview(options.dualReviewSummary || options.dual_review_summary);
    const sourceReliabilitySummary = summarizeDefenseSourceReliability(
      options.sourceReliabilitySummary || options.source_reliability_summary,
      events
    );
    const qualitySummary = summarizeDefenseQuality(options.qualitySummary || options.quality_summary);
    const suggestionSummary = summarizeAiSuggestions(options.aiSuggestionEvents || options.ai_suggestion_events || []);
    const countLabelsZh = {
      recordsImported: '导入记录数',
      duplicatesRemoved: '去除重复数',
      titleAbstractScreened: '标题/摘要筛选数',
      titleAbstractIncluded: '标题/摘要纳入数',
      titleAbstractExcluded: '标题/摘要排除数',
      titleAbstractUncertain: '标题/摘要不确定数',
      fullTextAssessed: '全文评估数',
      fullTextIncluded: '全文纳入数',
      fullTextExcluded: '全文排除数',
      studiesIncluded: '最终纳入研究数',
      pendingFullTextReview: '待全文复核数',
    };
    const warningTypeLabelsZh = {
      abstract_truncation_suspected: '摘要疑似截断',
      abstract_noise_detected: '摘要噪音提示',
      source_mapping_incomplete: '来源映射不完整',
    };
    const countRows = Object.keys(counts)
      .map((key) => `| ${isZh ? (countLabelsZh[key] || key) : key} | ${counts[key]} |`)
      .join('\n');
    const bySourceDatabaseLines = Object.keys(sourceReliabilitySummary.bySourceDatabase || {}).length > 0
      ? Object.keys(sourceReliabilitySummary.bySourceDatabase)
          .sort()
          .map((key) => `${key}: ${sourceReliabilitySummary.bySourceDatabase[key]}`)
      : [isZh ? '无: 0' : 'none: 0'];
    const byWarningTypeLines = Object.keys(sourceReliabilitySummary.byWarningType || {}).length > 0
      ? Object.keys(sourceReliabilitySummary.byWarningType)
          .sort()
          .map((key) => `${isZh ? (warningTypeLabelsZh[key] || key) : key}: ${sourceReliabilitySummary.byWarningType[key]}`)
      : [isZh ? '无: 0' : 'none: 0'];

    if (isZh) {
      return [
        '# 答辩审计包',
        '',
        '目标文件：`DEFENSE_AUDIT_PACK.md`',
        '此本地优先证据导出将审计、双人复核、质量评价、来源可靠性与 AI 边界记录整理为可复用于审稿回复、论文答辩或方法学附录的材料。',
        '',
        '## 执行摘要',
        '',
        `项目：${manifest.projectName}`,
        `项目 ID：${manifest.projectId}`,
        `Schema 版本：${manifest.schemaVersion}`,
        `PRISMA 版本：${manifest.prismaVersion}`,
        `生成时间：${manifest.exportGeneratedAt}`,
        `已记录审计事件：${eventSummary.totalEvents}`,
        `已记录筛选决定：${Array.isArray(decisions) ? decisions.length : 0}`,
        '',
        '## PRISMA 计数',
        '',
        '| 指标 | 数值 |',
        '|---|---:|',
        countRows,
        '',
        '## 双人复核解决摘要',
        '',
        `已配对决定：${dualReviewSummary.pairedDecisionCount}`,
        `一致率：${dualReviewSummary.percentAgreement}`,
        `Cohen\'s kappa：${dualReviewSummary.cohensKappa}`,
        `未解决冲突：${dualReviewSummary.unresolvedConflictCount}`,
        `未解决筛选冲突：${dualReviewSummary.unresolvedScreeningConflictCount}`,
        `未解决质量冲突：${dualReviewSummary.unresolvedQualityConflictCount}`,
        dualReviewSummary.hasUnresolvedConflicts
          ? '当前导出门禁状态：此证据包会保留未解决冲突的可见记录。'
          : '当前导出门禁状态：当前没有未解决冲突。',
        '',
        '## 质量评价与证据导出',
        '',
        `质量评价总数：${qualitySummary.totalAssessments}`,
        `已完成评价：${qualitySummary.completedAssessments}`,
        `进行中评价：${qualitySummary.inProgressAssessments}`,
        `缺失评价：${qualitySummary.missingAssessments}`,
        `Evidence table 可导出行数：${qualitySummary.evidenceTableReadyCount}`,
        `GRADE summary 可导出行数：${qualitySummary.gradeSummaryReadyCount}`,
        '',
        '## 中文源可靠性摘要',
        '',
        `带有来源质量提示的记录数：${sourceReliabilitySummary.warningRecordCount}`,
        `摘要疑似截断：${sourceReliabilitySummary.abstractTruncationCount}`,
        `摘要噪音提示：${sourceReliabilitySummary.abstractNoiseCount}`,
        `来源映射不完整：${sourceReliabilitySummary.sourceMappingIncompleteCount}`,
        '按来源数据库统计：',
        ...bySourceDatabaseLines,
        '按警告类型统计：',
        ...byWarningTypeLines,
        '这些提示不会自动改变筛选决定。',
        '这些提示仍属于导入质量信号，不代表最终筛选结论。',
        '',
        '## AI 边界摘要',
        '',
        `AI 建议记录数：${suggestionSummary.totalSuggestions}`,
        `已人工处理的 AI 建议：${suggestionSummary.reviewedSuggestions}`,
        '人工复核者保留最终决定权。',
        '只有在记录了人工 ScreeningDecision 后，AI 建议才会与最终决定建立可追溯关联。',
        '',
        '## 附录复用提示',
        '',
        '- 可将此审计包复用于审稿回复附录、论文答辩附录或方法学补充材料。',
        '- PRISMA 计数始终可追溯到 ScreeningDecision 与 AuditEvent 记录。',
        '- 来源质量提示用于暴露导入可靠性风险，但不会直接改变最终纳入或排除决定。',
        '',
      ].join('\n');
    }

    return [
      '# Defense-ready Audit Pack',
      '',
      'File target: `DEFENSE_AUDIT_PACK.md`',
      'This local-first evidence export packages audit, dual-review, quality, source-reliability, and AI-boundary records for reviewer response, thesis defense, or methods appendix reuse.',
      '',
      '## Executive Summary',
      '',
      `Project: ${manifest.projectName}`,
      `Project ID: ${manifest.projectId}`,
      `Schema version: ${manifest.schemaVersion}`,
      `PRISMA version: ${manifest.prismaVersion}`,
      `Generated at: ${manifest.exportGeneratedAt}`,
      `Audit events logged: ${eventSummary.totalEvents}`,
      `Screening decisions logged: ${Array.isArray(decisions) ? decisions.length : 0}`,
      '',
      '## PRISMA Counts',
      '',
      '| Count | Value |',
      '|---|---:|',
      countRows,
      '',
      '## Dual-review Resolution Summary',
      '',
      `Paired decisions: ${dualReviewSummary.pairedDecisionCount}`,
      `Percent agreement: ${dualReviewSummary.percentAgreement}`,
      `Cohen\'s kappa: ${dualReviewSummary.cohensKappa}`,
      `Unresolved conflicts: ${dualReviewSummary.unresolvedConflictCount}`,
      `Unresolved screening conflicts: ${dualReviewSummary.unresolvedScreeningConflictCount}`,
      `Unresolved quality conflicts: ${dualReviewSummary.unresolvedQualityConflictCount}`,
      dualReviewSummary.hasUnresolvedConflicts
        ? 'Current export gate status: unresolved conflicts remain visible in this evidence pack.'
        : 'Current export gate status: no unresolved conflicts remain.',
      '',
      '## Quality Appraisal And Evidence Exports',
      '',
      `Quality assessments: ${qualitySummary.totalAssessments}`,
      `Completed assessments: ${qualitySummary.completedAssessments}`,
      `In-progress assessments: ${qualitySummary.inProgressAssessments}`,
      `Missing assessments: ${qualitySummary.missingAssessments}`,
      `Evidence table ready rows: ${qualitySummary.evidenceTableReadyCount}`,
      `GRADE summary ready rows: ${qualitySummary.gradeSummaryReadyCount}`,
      '',
      '## Chinese-source Reliability Summary',
      '',
      `${sourceReliabilitySummary.warningRecordCount} records carry source-quality warnings.`,
      `Abstract truncation signals: ${sourceReliabilitySummary.abstractTruncationCount}`,
      `Abstract noise signals: ${sourceReliabilitySummary.abstractNoiseCount}`,
      `Incomplete source mappings: ${sourceReliabilitySummary.sourceMappingIncompleteCount}`,
      'Warnings by source database:',
      ...bySourceDatabaseLines,
      'Warnings by warning type:',
      ...byWarningTypeLines,
      'These warnings do not automatically change screening decisions.',
      'These warnings remain import-quality signals, not final screening decisions.',
      '',
      '## AI Boundary Summary',
      '',
      `AI suggestions logged: ${suggestionSummary.totalSuggestions}`,
      `Reviewed AI suggestions: ${suggestionSummary.reviewedSuggestions}`,
      'Human reviewers remain the final decision authority.',
      'AI suggestions remain advisory unless a human ScreeningDecision is recorded.',
      '',
      '## Appendix-ready Notes',
      '',
      '- Reuse this pack as a reviewer response appendix, thesis defense appendix, or methods supplement.',
      '- PRISMA counts remain traceable to ScreeningDecision and AuditEvent records.',
      '- Source-quality warnings surface import reliability risk without changing final include/exclude decisions.',
      '',
    ].join('\n');
  }

  function buildPrismaTraiceReportMarkdown(manifestInput, aiSuggestionEvents, options = {}) {
    const manifest = createProjectManifest(manifestInput);
    const suggestionSummary = summarizeAiSuggestions(aiSuggestionEvents);
    const queueSummary = summarizeV26AdvisoryQueue(aiSuggestionEvents);
    const language = normalizeString(options.language || options.lang, 'en').toLowerCase() === 'zh' ? 'zh' : 'en';
    const isZh = language === 'zh';
    const zhLabels = {
      off: '关闭',
      assistive: '辅助记录',
      experimental: '完整记录',
      none: '无',
      local: '本地示例服务',
      user_provided_endpoint: '用户自带兼容服务',
      hosted: '托管服务记录',
      local_only: '仅本地',
      hash_only: '仅记录摘要指纹和服务边界',
      cloud_submitted: '云端提交记录',
      disabled: '关闭',
      not_configured: '未配置',
      accepted: '已接受',
      rejected: '已拒绝',
      edited: '已改写',
      ignored: '已忽略',
      pending: '待处理',
      include: '纳入',
      exclude: '排除',
      uncertain: '不确定',
      suggest_only: '仅建议',
      prioritise: '优先级提示',
      uncertainty_flagging: '不确定性提示',
      report_helper: '报告辅助',
      title_abstract: '标题摘要',
      full_text: '全文复核',
      reporting: '报告',
    };
    const label = (value) => {
      const normalized = normalizeString(value, '');
      if (!normalized) return '-';
      return isZh ? (zhLabels[normalized] || normalized) : normalized;
    };
    const yesNo = (value) => (isZh ? (value ? '是' : '否') : (value ? 'yes' : 'no'));
    const stageList = (stages) => {
      const list = Array.isArray(stages) ? stages : [];
      return list.length > 0 ? list.map(label).join(', ') : '-';
    };
    const boundaryRows = manifest.aiUsageRegistry.length > 0
      ? manifest.aiUsageRegistry.map((entry) => {
          const boundary = getAiProviderBoundary(entry);
          return `| ${label(boundary.aiMode)} | ${label(boundary.providerType)} | ${boundary.providerName || '-'} | ${boundary.modelName || '-'} | ${label(boundary.requestPolicy)} | ${yesNo(boundary.realProviderConnected)} | ${label(boundary.dataBoundary)} | ${boundary.endpointOrigin || '-'} | ${yesNo(boundary.apiKeyPresent)} | ${label(boundary.apiKeyStorage)} |`;
        }).join('\n')
      : `| ${label('off')} | ${label('none')} | - | - | ${label('disabled')} | ${yesNo(false)} | ${label('local_only')} | - | ${yesNo(false)} | ${label('not_configured')} |`;
    const usageRows = manifest.aiUsageRegistry.length > 0
      ? manifest.aiUsageRegistry.map((entry) => {
          const normalized = createAiUsageRegistryEntry(entry);
          return `| ${label(normalized.aiMode)} | ${label(normalized.providerType)} | ${normalized.providerName || '-'} | ${normalized.modelName || '-'} | ${stageList(normalized.allowedStages)} | ${label(normalized.dataBoundary)} | ${yesNo(normalized.userAcknowledged)} |`;
        }).join('\n')
      : `| ${label('off')} | ${label('none')} | - | - | - | ${label('local_only')} | ${yesNo(false)} |`;
    const actionRows = Object.keys(suggestionSummary.byHumanAction).length > 0
      ? Object.keys(suggestionSummary.byHumanAction)
          .sort()
          .map((key) => `| ${label(key)} | ${suggestionSummary.byHumanAction[key]} |`)
          .join('\n')
      : `| ${label('none')} | 0 |`;
    const suggestedDecisionRows = Object.keys(suggestionSummary.bySuggestedDecision).length > 0
      ? Object.keys(suggestionSummary.bySuggestedDecision)
          .sort()
          .map((key) => `| ${label(key)} | ${suggestionSummary.bySuggestedDecision[key]} |`)
          .join('\n')
      : `| ${label('none')} | 0 |`;

    if (isZh) {
      const reportLines = [
        '# PRISMA-trAIce 透明报告',
        '',
        `项目：${manifest.projectName}`,
        `项目 ID：${manifest.projectId}`,
        `AI 模式：${label(manifest.aiMode)}`,
        `生成时间：${manifest.exportGeneratedAt}`,
        '',
        '## AI 使用登记',
        '',
        '| AI 模式 | 服务类型 | 服务名称 | 模型 | 允许环节 | 数据边界 | 用户已确认 |',
        '|---|---|---|---|---|---|---|',
        usageRows,
        '',
        '## AI 服务边界',
        '',
        '| AI 模式 | 服务类型 | 服务名称 | 模型 | 请求策略 | 已连接真实服务 | 数据边界 | 服务地址域名 | 是否存在密钥 | 密钥保存方式 |',
        '|---|---|---|---|---|---|---|---|---|---|',
        boundaryRows,
        '',
        '## 导出的 AI 审计文件',
        '',
        '| 文件 | 用途 | 决策边界 |',
        '|---|---|---|',
        '| `ai_usage_registry.json` | 记录 AI 模式、服务、模型、允许使用环节、数据边界和用户确认状态。 | 仅作为配置证据，不是最终筛选决策表。 |',
        '| `ai_suggestions.jsonl` | 记录每条 AI 建议、理由、置信度、输入/提示词指纹、人工处理动作、复核时间、人工改写信息、关联的人类决策和计数边界。 | 仅作为建议日志；接受或改写必须关联人类确认的 `ScreeningDecision`，拒绝的建议不会影响 PRISMA 计数。 |',
        '| `PRISMA_TRAICE_REPORT.md` | 面向方法学附录和团队复核的可读透明报告，说明 AI 使用范围、No-AI 状态、建议处理方式和本地/云端边界。 | 仅作为报告说明；最终计数仍来自 `screening_decisions.csv` 和审计事件。 |',
        '',
      ];

      if (manifest.aiMode === 'off') {
        reportLines.push(
          '## 未使用 AI 声明',
          '',
          '本次项目导出未启用 AI 服务。',
          '没有任何 AI 建议在缺少明确人工确认的情况下改变最终筛选决策。',
          ''
        );
      }

      reportLines.push(
        '## AI 建议处理摘要',
        '',
        `建议总数：${suggestionSummary.totalSuggestions}`,
        `待处理建议：${suggestionSummary.pendingSuggestions}`,
        `已复核建议：${suggestionSummary.reviewedSuggestions}`,
        `已关联人类决策：${suggestionSummary.linkedHumanDecisionCount}`,
        `已复核但未关联人类决策：${suggestionSummary.unlinkedReviewedSuggestionCount}`,
        `仅作为建议日志的复核：${suggestionSummary.advisoryOnlyReviewedSuggestionCount}`,
        `已接受或改写但缺少关联人类决策：${suggestionSummary.acceptedOrEditedWithoutLinkedDecisionCount}`,
        '',
        '| 人工处理动作 | 数量 |',
        '|---|---:|',
        actionRows,
        '',
        '| AI 建议决策 | 数量 |',
        '|---|---:|',
        suggestedDecisionRows,
        '',
        'AI 建议与最终 `ScreeningDecision` 分开记录，只有经过人工确认后才可能影响 PRISMA 计数。',
        '接受或改写建议会创建关联的人类确认 `ScreeningDecision`；拒绝或忽略建议只更新 AI 建议日志。',
        ''
      );

      reportLines.push(
        '## AI 建议复核追踪字段',
        '',
        '| 字段 | 含义 |',
        '|---|---|',
        '| `reviewed_at` | 人工接受、改写、拒绝或忽略建议时的复核时间。 |',
        '| `human_edited_decision` | 建议被改写时，研究者明确选择的人类决策。 |',
        '| `human_edited_exclusion_reason` | 改写为排除时使用的标准化排除理由。 |',
        '| `linked_decision_id` | 接受或改写建议后创建的人类 `ScreeningDecision`。拒绝或待处理建议为空。 |',
        '| `prisma_count_boundary` | 说明该行是否已关联到人类决策并可用于计数，或仍然只是建议日志。 |',
        '',
        '## 透明性说明',
        '',
        '- 默认记录输入和提示词指纹，而不是原始敏感全文。',
        '- AI 建议不会在缺少人类决策记录的情况下成为最终纳入或排除决定。',
        '- `screening_decisions.csv` 仍是 PRISMA 计数回放的最终人工决策表。',
        '- `ai_suggestions.jsonl` 用于解释辅助建议和复核处理方式，但不会被直接计数。',
        '- 本报告说明 AI 使用范围、人工复核要求，以及本地/云端服务边界。',
        ''
      );

      reportLines.push(...buildV26AdvisoryQueueSummaryLines(queueSummary, true));

      return reportLines.join('\n');
    }

    const reportLines = [
      '# PRISMA-trAIce Report',
      '',
      `Project: ${manifest.projectName}`,
      `Project ID: ${manifest.projectId}`,
      `AI mode: ${manifest.aiMode}`,
      `Generated at: ${manifest.exportGeneratedAt}`,
      '',
      '## AI Usage Registry',
      '',
      '| AI mode | Provider type | Provider | Model | Allowed stages | Data boundary | User acknowledged |',
      '|---|---|---|---|---|---|---|',
      usageRows,
      '',
      '## AI Provider Boundary',
      '',
      '| AI mode | Provider type | Provider | Model | Request policy | Real provider connected | Data boundary | Endpoint origin | API key present | API key storage |',
      '|---|---|---|---|---|---|---|---|---|---|',
      boundaryRows,
      '',
      '## Exported AI Audit Files',
      '',
      '| File | Purpose | Decision boundary |',
      '|---|---|---|',
      '| `ai_usage_registry.json` | Records AI mode, provider, model, allowed workflow stages, data boundary, and user acknowledgement. | Configuration evidence only; it is not a screening decision ledger. |',
      '| `ai_suggestions.jsonl` | Records each AI suggestion, rationale, confidence, input/prompt hashes, human action, review timestamp, human edit details, linked human decision, and `prisma_count_boundary`. | Advisory log only; accepted or edited suggestions require a linked human `ScreeningDecision`, while rejected suggestions do not affect PRISMA counts. |',
      '| `PRISMA_TRAICE_REPORT.md` | Human-readable transparency summary for AI usage, No-AI state, suggestion handling, and local/cloud boundary declarations. | Report narrative only; final counts remain derived from `screening_decisions.csv` and audit events. |',
      '',
    ];

    if (manifest.aiMode === 'off') {
      reportLines.push(
        '## No-AI Statement',
        '',
        'No AI provider was enabled for this project export.',
        'No AI suggestion changed final screening decisions without explicit human confirmation.',
        ''
      );
    }

    reportLines.push(
      '## AI Suggestion Summary',
      '',
      `Total suggestions: ${suggestionSummary.totalSuggestions}`,
      `Pending suggestions: ${suggestionSummary.pendingSuggestions}`,
      `Reviewed suggestions: ${suggestionSummary.reviewedSuggestions}`,
      `Linked human decisions: ${suggestionSummary.linkedHumanDecisionCount}`,
      `Reviewed suggestions without linked human decision: ${suggestionSummary.unlinkedReviewedSuggestionCount}`,
      `Advisory-only reviewed suggestions: ${suggestionSummary.advisoryOnlyReviewedSuggestionCount}`,
      `Accepted or edited suggestions without linked human decision: ${suggestionSummary.acceptedOrEditedWithoutLinkedDecisionCount}`,
      '',
      '| Human action | Count |',
      '|---|---:|',
      actionRows,
      '',
      '| Suggested decision | Count |',
      '|---|---:|',
      suggestedDecisionRows,
      '',
      'AI suggestions are logged separately from final ScreeningDecision records and require human confirmation before affecting PRISMA counts.',
      'Accepted or edited suggestions create a linked human-confirmed ScreeningDecision; rejected or ignored suggestions only update the AI suggestion log.',
      ''
    );

    reportLines.push(
      '## AI Suggestion Review Trace Fields',
      '',
      '| Field | Meaning |',
      '|---|---|',
      '| `reviewed_at` | Timestamp of the human review action when a suggestion is accepted, edited, rejected, or ignored. |',
      '| `human_edited_decision` | Explicit human rewrite decision when the suggestion was edited. |',
      '| `human_edited_exclusion_reason` | Normalized exclusion reason used for an edited exclude decision. |',
      '| `linked_decision_id` | Human `ScreeningDecision` created by an accepted or edited suggestion. Empty for rejected or pending suggestions. |',
      '| `prisma_count_boundary` | Declares whether the row is linked to a human decision for counts or remains advisory-only. |',
      '',
      '## Transparency Notes',
      '',
      '- Input and prompt hashes are recorded by default instead of raw sensitive full text.',
      '- AI suggestions never become final included or excluded decisions without a human decision record.',
      '- `screening_decisions.csv` remains the final human decision ledger for PRISMA count replay.',
      '- `ai_suggestions.jsonl` explains assistance and review handling, but it is not counted directly.',
      '- This report describes AI usage scope, review expectations, and local/cloud boundary declarations.',
      ''
    );

    reportLines.push(...buildV26AdvisoryQueueSummaryLines(queueSummary, false));

    return reportLines.join('\n');
  }

  function buildAuditSummaryMarkdown(manifestInput, events, decisions, options = {}) {
    const manifest = createProjectManifest(manifestInput);
    const eventSummary = summarizeAuditEvents(events);
    const counts = calculatePrismaCountsFromDecisions(decisions, events);
    const queueSummary = summarizeV26AdvisoryQueue(options.aiSuggestionEvents || options.ai_suggestion_events || []);
    const language = normalizeString(options.language || options.lang, 'en').toLowerCase() === 'zh' ? 'zh' : 'en';
    const isZh = language === 'zh';
    const eventTypeRows = Object.keys(eventSummary.byType)
      .sort()
      .map((eventType) => `| ${eventType} | ${eventSummary.byType[eventType]} |`)
      .join('\n') || '| none | 0 |';
    const countLabelsZh = {
      recordsImported: '导入记录数',
      duplicatesRemoved: '去除重复数',
      recordsAfterDeduplication: '去重后记录数',
      titleAbstractScreened: '标题/摘要筛选数',
      titleAbstractExcluded: '标题/摘要排除数',
      fullTextAssessed: '全文评估数',
      fullTextExcluded: '全文排除数',
      studiesIncluded: '最终纳入研究数',
      pendingFullTextReview: '待全文复核数',
    };
    const countRows = Object.keys(counts)
      .map((key) => `| ${isZh ? (countLabelsZh[key] || key) : key} | ${counts[key]} |`)
      .join('\n');

    if (isZh) {
      return [
        '# 审计摘要',
        '',
        `项目：${manifest.projectName}`,
        `项目 ID：${manifest.projectId}`,
        `审计 schema 版本：${manifest.schemaVersion}`,
        `PRISMA 版本：${manifest.prismaVersion}`,
        `AI 模式：${manifest.aiMode}`,
        '',
        '## 事件摘要',
        '',
        `事件总数：${eventSummary.totalEvents}`,
        '',
        '| 事件类型 | 数量 |',
        '|---|---:|',
        eventTypeRows,
        '',
        '## PRISMA 计数',
        '',
        '| 指标 | 数值 |',
        '|---|---:|',
        countRows,
        '',
        '## 未解决风险与说明',
        '',
        '- 计数来自持久化的 ScreeningDecision 记录和 AuditEvent 事件。',
        `- 当前 AI 模式为 ${manifest.aiMode}；AI 建议不会在缺少人类决策记录的情况下成为最终筛选决定。`,
        '- 尚未形成最终全文决定的记录不会进入最终纳入研究计数。',
        '',
        ...buildV26AdvisoryQueueSummaryLines(queueSummary, true),
      ].join('\n');
    }

    return [
      '# Audit Summary',
      '',
      `Project: ${manifest.projectName}`,
      `Project ID: ${manifest.projectId}`,
      `Schema version: ${manifest.schemaVersion}`,
      `PRISMA version: ${manifest.prismaVersion}`,
      `AI mode: ${manifest.aiMode}`,
      '',
      '## Event Summary',
      '',
      `Total events: ${eventSummary.totalEvents}`,
      '',
      '| Event type | Count |',
      '|---|---:|',
      eventTypeRows,
      '',
      '## PRISMA Counts',
      '',
      '| Count | Value |',
      '|---|---:|',
      countRows,
      '',
      '## Unresolved Risks And Notes',
      '',
      '- Counts are derived from durable ScreeningDecision records and AuditEvent entries.',
      `- AI mode is ${manifest.aiMode}; AI suggestions are not treated as final decisions unless a human decision is recorded.`,
      '- Records without a final full-text decision remain outside the final included-study count.',
      '',
      ...buildV26AdvisoryQueueSummaryLines(queueSummary, false),
    ].join('\n');
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
    AUDIT_SCHEMA_VERSION,
    EXCLUSION_REASONS,
    createAiUsageRegistryEntry,
    upsertAiUsageRegistry,
    createAiSuggestionEvent,
    appendAiSuggestionEvent,
    createProjectManifest,
    createAuditEvent,
    appendAuditEvent,
    getAuditTrail,
    createScreeningDecision,
    updateScreeningDecision,
    calculatePrismaCountsFromDecisions,
    summarizeAuditEvents,
    summarizeAiSuggestions,
    summarizeV26AdvisoryQueue,
    buildProjectManifestExport,
    buildAiUsageRegistryExport,
    serializeEventsJsonl,
    serializeScreeningDecisionsCsv,
    serializeExclusionReasonsCsv,
    serializeAiSuggestionEventsJsonl,
    buildPrismaCountsJson,
    buildAuditSummaryMarkdown,
    buildDefenseReadyAuditPackMarkdown,
    buildPrismaTraiceReportMarkdown,
  };
});
