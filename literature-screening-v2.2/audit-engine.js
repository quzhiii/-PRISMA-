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
  const VALID_DECISIONS = new Set(['include', 'exclude', 'uncertain', 'pending']);
  const VALID_CONFLICT_STATUSES = new Set(['none', 'pending', 'resolved']);
  const VALID_QUALITY_APPRAISAL_STATUSES = new Set(['not_started', 'queued', 'in_progress', 'complete']);
  const VALID_FINAL_EXPORT_STATUSES = new Set(['not_exported', 'included', 'excluded', 'warning']);
  const EVENT_TYPE_ALIASES = Object.freeze({
    dedup_auto_removed: 'hard_duplicate_removed',
    dedup_candidate_flagged: 'candidate_duplicate_flagged',
    rule_screen_decision: 'rule_screening_decision',
    full_text_decision_finalized: 'manual_screening_decision',
    quality_queue_prepared: 'quality_appraisal_started',
    study_design_suggested: 'quality_appraisal_updated',
  });

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
      appVersion: normalizeString(payload.appVersion || payload.app_version, 'v2.2'),
      dataResidency: normalizeString(payload.dataResidency || payload.data_residency, 'local_browser'),
      exportGeneratedAt: normalizeString(payload.exportGeneratedAt || payload.export_generated_at, timestamp),
      dataSources: normalizeArray(payload.dataSources || payload.data_sources),
      reviewers: normalizeArray(payload.reviewers),
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
    const latestDecisions = getLatestDecisions(decisions);
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

  function buildPrismaCountsJson(decisions, events) {
    return {
      schemaVersion: AUDIT_SCHEMA_VERSION,
      generatedAt: nowIso(),
      source: 'screening_decisions_and_audit_events',
      counts: calculatePrismaCountsFromDecisions(decisions, events),
    };
  }

  function buildAuditSummaryMarkdown(manifestInput, events, decisions) {
    const manifest = createProjectManifest(manifestInput);
    const eventSummary = summarizeAuditEvents(events);
    const counts = calculatePrismaCountsFromDecisions(decisions, events);
    const eventTypeRows = Object.keys(eventSummary.byType)
      .sort()
      .map((eventType) => `| ${eventType} | ${eventSummary.byType[eventType]} |`)
      .join('\n') || '| none | 0 |';
    const countRows = Object.keys(counts)
      .map((key) => `| ${key} | ${counts[key]} |`)
      .join('\n');

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
    createProjectManifest,
    createAuditEvent,
    appendAuditEvent,
    getAuditTrail,
    createScreeningDecision,
    updateScreeningDecision,
    calculatePrismaCountsFromDecisions,
    summarizeAuditEvents,
    buildProjectManifestExport,
    serializeEventsJsonl,
    serializeScreeningDecisionsCsv,
    serializeExclusionReasonsCsv,
    buildPrismaCountsJson,
    buildAuditSummaryMarkdown,
  };
});
