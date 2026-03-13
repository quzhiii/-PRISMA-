const EXPORT_SCHEMA_VERSION = '2.0.0';

/**
 * Top-level keys of the export artifact object.
 */
const EXPORT_ARTIFACT_KEYS = Object.freeze([
  'schemaVersion',
  'exportedAt',
  'project',
  'summary',
  'includedStudies',
  'excludedStudies',
  'decisionLog'
]);

/**
 * Fields on each included study entry.
 */
const INCLUDED_STUDY_KEYS = Object.freeze([
  'id',
  'title',
  'abstract',
  'authors',
  'year',
  'journal',
  'doi',
  'keywords',
  'language',
  'source',
  'source_file'
]);

/**
 * Fields on each excluded study entry.
 */
const EXCLUDED_STUDY_KEYS = Object.freeze([
  'id',
  'title',
  'abstract',
  'authors',
  'year',
  'journal',
  'doi',
  'keywords',
  'language',
  'source',
  'source_file',
  'stage',
  'reason',
  'decidedBy',
  'decidedAt'
]);

/**
 * Fields on each decision log entry.
 */
const DECISION_LOG_ENTRY_KEYS = Object.freeze([
  'sequence',
  'kind',
  'actor',
  'at',
  'note',
  'source',
  'action',
  'recordId',
  'stage',
  'verdict',
  'reason',
  'comment',
  'workflowState',
  'fromState',
  'toState'
]);

/**
 * Fields on the project metadata block.
 */
const PROJECT_META_KEYS = Object.freeze([
  'id',
  'title',
  'createdAt',
  'exportedAt'
]);

/**
 * Fields on the summary block (PRISMA counts + derived stats).
 */
const SUMMARY_KEYS = Object.freeze([
  'totalIdentified',
  'totalDuplicatesRemoved',
  'totalScreened',
  'totalExcludedScreening',
  'totalFulltextReviewed',
  'totalExcludedFulltext',
  'totalIncluded',
  'exclusionReasonCounts'
]);

/**
 * Missing-field defaults applied consistently by every shaping function.
 *
 * Policy:
 *  - String fields → ''
 *  - Numeric fields → 0
 *  - Array fields → []
 *  - year → null  (unknown publication year is semantically different from 0)
 *  - doi → ''
 */
const MISSING_FIELD_DEFAULTS = Object.freeze({
  STRING: '',
  NUMBER: 0,
  ARRAY: [], // note: callers must create a fresh [] each time, not share this reference
  YEAR: null
});

module.exports = {
  EXPORT_SCHEMA_VERSION,
  EXPORT_ARTIFACT_KEYS,
  INCLUDED_STUDY_KEYS,
  EXCLUDED_STUDY_KEYS,
  DECISION_LOG_ENTRY_KEYS,
  PROJECT_META_KEYS,
  SUMMARY_KEYS,
  MISSING_FIELD_DEFAULTS
};
