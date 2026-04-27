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
      eventType: normalizeString(payload.eventType || payload.event_type, 'unknown_event'),
      recordId: normalizeString(payload.recordId || payload.record_id, ''),
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
      stage: normalizeString(payload.stage, 'title_abstract'),
      decision: normalizeDecision(payload.decision),
      exclusionReason: normalizeExclusionReason(payload.exclusionReason || payload.exclusion_reason),
      reviewerId: normalizeString(payload.reviewerId || payload.reviewer_id, 'system'),
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
      stage: normalizeString(next.stage, base.stage),
      decision: next.decision === undefined ? base.decision : normalizeDecision(next.decision),
      exclusionReason: next.exclusionReason === undefined && next.exclusion_reason === undefined
        ? base.exclusionReason
        : normalizeExclusionReason(next.exclusionReason || next.exclusion_reason),
      reviewerId: normalizeString(next.reviewerId || next.reviewer_id, base.reviewerId),
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
      duplicatesRemoved: countUniqueEvents(eventList, 'dedup_auto_removed'),
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

      if (event.eventType !== eventType) {
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

    return `${list.map((event) => JSON.stringify(createAuditEvent(event))).join('\n')}\n`;
  }

  function serializeScreeningDecisionsCsv(decisions) {
    const fields = [
      'decisionId',
      'projectId',
      'recordId',
      'stage',
      'decision',
      'exclusionReason',
      'reviewerId',
      'decidedAt',
      'updatedAt',
      'source',
      'notes',
    ];

    const rows = (Array.isArray(decisions) ? decisions : []).map((decision) => {
      const normalized = createScreeningDecision(decision);
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
    serializeEventsJsonl,
    serializeScreeningDecisionsCsv,
    serializeExclusionReasonsCsv,
    buildAuditSummaryMarkdown,
  };
});
