'use strict';

/**
 * V2.0 Exporter — reporting and export foundation.
 *
 * All functions are pure: they read from snapshots and canonical record arrays
 * and return plain JavaScript objects.  No DOM, cloud, or mutation allowed.
 *
 * Upstream inputs:
 *   snapshot  — output of createDecisionSnapshot() from src/decisions/index.js
 *   records   — canonical record array (output of normalizer / dedup pipeline)
 *
 * Downstream consumers:
 *   Task 19  — PRISMA diagram UI
 *   Task 23  — legacy bridge
 */

const { EXPORT_SCHEMA_VERSION } = require('./export-schema');

// ─── internal helpers ────────────────────────────────────────────────────────

/**
 * Coerce to non-null string; absent/null/undefined → ''
 * @param {*} value
 * @returns {string}
 */
function str(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * Coerce to integer; absent/null/NaN → 0
 * @param {*} value
 * @returns {number}
 */
function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

/**
 * Coerce to array; absent/non-array → []
 * @param {*} value
 * @returns {Array}
 */
function arr(value) {
  return Array.isArray(value) ? [...value] : [];
}

/**
 * Year field: integer or null — never 0, never empty string.
 * @param {*} value
 * @returns {number|null}
 */
function year(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

/**
 * Build a lookup map from recordId → decision entry from the snapshot.
 * @param {{ decisions: Array }} snapshot
 * @returns {Map<string, object>}
 */
function buildDecisionMap(snapshot) {
  const map = new Map();
  for (const entry of arr(snapshot && snapshot.decisions)) {
    if (entry && str(entry.recordId)) {
      map.set(str(entry.recordId), entry);
    }
  }
  return map;
}

/**
 * Project a canonical record into an included-study shape.
 * @param {object} record
 * @returns {object}
 */
function shapeIncludedStudyRecord(record) {
  return {
    id: str(record.id),
    title: str(record.title),
    abstract: str(record.abstract),
    authors: arr(record.authors),
    year: year(record.year),
    journal: str(record.journal),
    doi: str(record.doi),
    keywords: arr(record.keywords),
    language: str(record.language),
    source: str(record.source),
    source_file: str(record.source_file)
  };
}

/**
 * Project a canonical record into an excluded-study shape.
 * @param {object} record
 * @param {string} stage    — 'screening' | 'fulltext'
 * @param {string} reason
 * @param {string} decidedBy
 * @param {string} decidedAt
 * @returns {object}
 */
function shapeExcludedStudyRecord(record, stage, reason, decidedBy, decidedAt) {
  return {
    id: str(record.id),
    title: str(record.title),
    abstract: str(record.abstract),
    authors: arr(record.authors),
    year: year(record.year),
    journal: str(record.journal),
    doi: str(record.doi),
    keywords: arr(record.keywords),
    language: str(record.language),
    source: str(record.source),
    source_file: str(record.source_file),
    stage: str(stage),
    reason: str(reason),
    decidedBy: str(decidedBy),
    decidedAt: str(decidedAt)
  };
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Shape the list of included studies.
 *
 * A record is "included" when it has a fulltext decision with verdict 'include'.
 * Falls back to screening-include if no fulltext decision exists.
 *
 * @param {{ decisions: Array }} snapshot
 * @param {object[]} records  canonical record array
 * @returns {object[]}  array of included-study shapes, stable order by record id
 */
function shapeIncludedStudies(snapshot, records) {
  if (!snapshot || !Array.isArray(records)) return [];

  const decisionMap = buildDecisionMap(snapshot);
  const result = [];

  for (const record of records) {
    const id = str(record && record.id);
    if (!id) continue;

    // Skip duplicates
    if (record._duplicate_of) continue;

    const entry = decisionMap.get(id);
    if (!entry) continue;

    const stages = entry.stages || {};
    const fulltextDecision = stages.fulltext;
    const screeningDecision = stages.screening;

    // Included = fulltext include, or (no fulltext decision and screening include)
    const isIncluded =
      (fulltextDecision && fulltextDecision.verdict === 'include') ||
      (!fulltextDecision && screeningDecision && screeningDecision.verdict === 'include');

    if (isIncluded) {
      result.push(shapeIncludedStudyRecord(record));
    }
  }

  return result.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Shape the list of excluded studies.
 *
 * A record is "excluded" when it has any stage decision with verdict 'exclude'.
 * If both stages have decisions, fulltext exclusion takes precedence for the shape.
 * Excluded duplicates are omitted (their canonical winner carries the decision).
 *
 * @param {{ decisions: Array }} snapshot
 * @param {object[]} records  canonical record array
 * @returns {object[]}  array of excluded-study shapes, stable order by record id
 */
function shapeExcludedStudies(snapshot, records) {
  if (!snapshot || !Array.isArray(records)) return [];

  const decisionMap = buildDecisionMap(snapshot);
  const result = [];

  for (const record of records) {
    const id = str(record && record.id);
    if (!id) continue;

    // Skip duplicates
    if (record._duplicate_of) continue;

    const entry = decisionMap.get(id);
    if (!entry) continue;

    const stages = entry.stages || {};
    const fulltextDecision = stages.fulltext;
    const screeningDecision = stages.screening;

    // Determine if excluded and at which stage
    let excludedDecision = null;
    let excludedStage = '';

    if (fulltextDecision && fulltextDecision.verdict === 'exclude') {
      excludedDecision = fulltextDecision;
      excludedStage = 'fulltext';
    } else if (screeningDecision && screeningDecision.verdict === 'exclude') {
      // Only include as excluded-screening if not later included at fulltext
      if (!fulltextDecision || fulltextDecision.verdict !== 'include') {
        excludedDecision = screeningDecision;
        excludedStage = 'screening';
      }
    }

    if (excludedDecision) {
      result.push(
        shapeExcludedStudyRecord(
          record,
          excludedStage,
          str(excludedDecision.reason),
          str(excludedDecision.actor),
          str(excludedDecision.at)
        )
      );
    }
  }

  return result.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Shape the decision log from the snapshot audit history.
 *
 * Entries are returned in ascending sequence order. All fields are normalized;
 * absent optional fields are present as empty string.
 *
 * @param {{ audit: { history: Array } }} snapshot
 * @returns {object[]}  ordered array of decision log entry shapes
 */
function shapeDecisionLog(snapshot) {
  if (!snapshot || !snapshot.audit) return [];

  const history = arr(snapshot.audit.history);

  return history
    .map((entry) => ({
      sequence: num(entry.sequence),
      kind: str(entry.kind),
      actor: str(entry.actor),
      at: str(entry.at),
      note: str(entry.note),
      source: str(entry.source),
      action: str(entry.action),
      // decision-specific fields
      recordId: str(entry.recordId),
      stage: str(entry.stage),
      verdict: str(entry.verdict),
      reason: str(entry.reason),
      comment: str(entry.comment),
      workflowState: str(entry.workflowState),
      // workflow-transition-specific fields
      fromState: str(entry.fromState),
      toState: str(entry.toState)
    }))
    .sort((a, b) => a.sequence - b.sequence);
}

/**
 * Shape the project summary block with PRISMA-compatible counts.
 *
 * PRISMA count derivation:
 *   totalIdentified        = all records (including duplicates)
 *   totalDuplicatesRemoved = records with _duplicate_of set
 *   totalScreened          = non-duplicate records that have a screening decision
 *   totalExcludedScreening = screening-excluded records (screening.verdict === 'exclude')
 *   totalFulltextReviewed  = non-duplicate records with a fulltext decision
 *   totalExcludedFulltext  = fulltext-excluded records
 *   totalIncluded          = records with final include verdict
 *   exclusionReasonCounts  = { [reason]: count } from all excluded records across both stages
 *
 * @param {{ decisions: Array, summary: object }} snapshot
 * @param {object[]} records  canonical record array
 * @param {{ id?: string, title?: string, createdAt?: string }} projectMeta
 * @returns {object}  project summary shape
 */
function shapeProjectSummary(snapshot, records, projectMeta) {
  if (!Array.isArray(records)) {
    return {
      totalIdentified: 0,
      totalDuplicatesRemoved: 0,
      totalScreened: 0,
      totalExcludedScreening: 0,
      totalFulltextReviewed: 0,
      totalExcludedFulltext: 0,
      totalIncluded: 0,
      exclusionReasonCounts: {}
    };
  }

  const decisionMap = buildDecisionMap(snapshot || {});

  let totalIdentified = 0;
  let totalDuplicatesRemoved = 0;
  let totalScreened = 0;
  let totalExcludedScreening = 0;
  let totalFulltextReviewed = 0;
  let totalExcludedFulltext = 0;
  let totalIncluded = 0;
  const exclusionReasonCounts = {};

  for (const record of records) {
    totalIdentified += 1;

    if (record._duplicate_of) {
      totalDuplicatesRemoved += 1;
      continue;
    }

    const id = str(record.id);
    const entry = id ? decisionMap.get(id) : null;
    const stages = (entry && entry.stages) || {};
    const screeningDecision = stages.screening;
    const fulltextDecision = stages.fulltext;

    if (screeningDecision) {
      totalScreened += 1;

      if (screeningDecision.verdict === 'exclude') {
        // Only count as screening-excluded if not advanced to fulltext
        if (!fulltextDecision) {
          totalExcludedScreening += 1;
          const reason = str(screeningDecision.reason) || '(unspecified)';
          exclusionReasonCounts[reason] = (exclusionReasonCounts[reason] || 0) + 1;
        }
      }
    }

    if (fulltextDecision) {
      totalFulltextReviewed += 1;

      if (fulltextDecision.verdict === 'exclude') {
        totalExcludedFulltext += 1;
        const reason = str(fulltextDecision.reason) || '(unspecified)';
        exclusionReasonCounts[reason] = (exclusionReasonCounts[reason] || 0) + 1;
      } else if (fulltextDecision.verdict === 'include') {
        totalIncluded += 1;
      }
    } else if (screeningDecision && screeningDecision.verdict === 'include') {
      // Included at screening with no fulltext stage
      totalIncluded += 1;
    }
  }

  return {
    totalIdentified,
    totalDuplicatesRemoved,
    totalScreened,
    totalExcludedScreening,
    totalFulltextReviewed,
    totalExcludedFulltext,
    totalIncluded,
    exclusionReasonCounts
  };
}

/**
 * Shape the top-level export artifact container.
 *
 * This is the canonical output object that Task 19 (PRISMA UI) and
 * Task 23 (legacy bridge) consume.  It is fully self-contained and
 * presentation-agnostic.
 *
 * @param {{ decisions: Array, audit: object, summary: object, workflow: object }} snapshot
 * @param {object[]} records       canonical record array
 * @param {{ id?: string, title?: string, createdAt?: string }} projectMeta
 * @returns {object}  complete export artifact
 */
function shapeExportArtifact(snapshot, records, projectMeta) {
  const exportedAt = new Date().toISOString();
  const meta = projectMeta || {};

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt,
    project: {
      id: str(meta.id),
      title: str(meta.title),
      createdAt: str(meta.createdAt),
      exportedAt
    },
    summary: shapeProjectSummary(snapshot, records, meta),
    includedStudies: shapeIncludedStudies(snapshot, records),
    excludedStudies: shapeExcludedStudies(snapshot, records),
    decisionLog: shapeDecisionLog(snapshot)
  };
}

module.exports = {
  shapeIncludedStudies,
  shapeExcludedStudies,
  shapeDecisionLog,
  shapeProjectSummary,
  shapeExportArtifact
};
