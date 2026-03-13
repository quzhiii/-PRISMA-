# exporter

Responsibility: convert decision snapshots and canonical record arrays into structured output artifacts.

Rules: read-only against upstream pipeline outputs. No mutation of domain state.

---

## Overview

The exporter module provides five pure functions for shaping V2 pipeline outputs into
presentation-independent data structures. It has no DOM, network, or backend dependencies.

All functions are deterministic: given the same inputs, they always return the same output.

---

## Public API

### `shapeIncludedStudies(snapshot, records)`

Returns an array of included-study objects for studies that passed the fulltext review stage,
or (if no fulltext stage decisions exist) the title/abstract screening stage.

Duplicate records (`_duplicate_of` is set) are excluded.

**Parameters:**
- `snapshot` — output of `createDecisionSnapshot(store)` from `src/decisions`
- `records` — array of canonical records from `src/normalizer`

**Returns:** `Array<IncludedStudy>`

```js
{
  id, title, abstract, authors, year,   // year is null if missing/zero
  journal, doi, keywords, language,
  source, source_file
}
```

---

### `shapeExcludedStudies(snapshot, records)`

Returns an array of excluded-study objects covering both screening and fulltext exclusions,
with the decision metadata attached.

Duplicate records are excluded.

**Parameters:** same as `shapeIncludedStudies`

**Returns:** `Array<ExcludedStudy>`

```js
{
  id, title, abstract, authors, year,
  journal, doi, keywords, language, source, source_file,
  stage,      // 'screening' | 'fulltext'
  reason,     // exclusion reason string
  decidedBy,  // actor string
  decidedAt   // ISO timestamp string
}
```

---

### `shapeDecisionLog(snapshot)`

Returns the full audit history as a flat array of log entry objects, sorted ascending by sequence number.

**Parameters:**
- `snapshot` — output of `createDecisionSnapshot(store)`

**Returns:** `Array<DecisionLogEntry>`

```js
{
  sequence, kind, actor, at, note, source, action,
  recordId, stage, verdict, reason, comment,
  workflowState, fromState, toState
}
```

Fields absent in the original audit event default to `''` (strings) or `0` (sequence).

---

### `shapeProjectSummary(snapshot, records)`

Returns PRISMA-style counts and an exclusion reason breakdown.

**Parameters:** same as `shapeIncludedStudies`

**Returns:** `ProjectSummary`

```js
{
  totalIdentified,          // total records
  totalDuplicatesRemoved,   // records with _duplicate_of set
  totalScreened,            // totalIdentified - totalDuplicatesRemoved
  totalExcludedScreening,   // screening-stage exclusions
  totalFulltextReviewed,    // fulltext-stage decisions (any verdict)
  totalExcludedFulltext,    // fulltext-stage exclusions
  totalIncluded,            // snapshot.summary.fulltext.include count
  exclusionReasonCounts     // { [reason: string]: count }
}
```

---

### `shapeExportArtifact(snapshot, records, projectMeta?)`

Assembles the complete export artifact by calling all four shaping functions and wrapping the
results with schema version, export timestamp, and project metadata.

**Parameters:**
- `snapshot` — output of `createDecisionSnapshot(store)`
- `records` — array of canonical records
- `projectMeta` — optional `{ id, title, createdAt }` object

**Returns:** `ExportArtifact`

```js
{
  schemaVersion,   // '2.0.0'
  exportedAt,      // ISO timestamp at call time
  project: { id, title, createdAt, exportedAt },
  summary,         // ProjectSummary
  includedStudies, // IncludedStudy[]
  excludedStudies, // ExcludedStudy[]
  decisionLog      // DecisionLogEntry[]
}
```

---

## Missing Field Policy

All shaping functions apply the following defaults for absent or invalid values:

| Field type | Missing value → default |
|---|---|
| String fields | `null` / `undefined` → `''` |
| Numeric fields | `null` / `NaN` → `0` |
| Array fields | non-array → `[]` |
| `year` field | `null` / `0` / non-integer → `null` |

---

## Schema Constants

`export-schema.js` exports:

- `EXPORT_SCHEMA_VERSION` — `'2.0.0'`
- `EXPORT_ARTIFACT_KEYS` — top-level artifact keys
- `INCLUDED_STUDY_KEYS` — field list for included studies
- `EXCLUDED_STUDY_KEYS` — field list for excluded studies (superset of included)
- `DECISION_LOG_ENTRY_KEYS` — field list for log entries
- `PROJECT_META_KEYS` — project metadata keys
- `SUMMARY_KEYS` — summary block keys
- `MISSING_FIELD_DEFAULTS` — default values by type

---

## Contract Tests

`exporter.contract.test.js` — 28 tests covering all five public functions:

```
node --test src/exporter/exporter.contract.test.js
```

Evidence: `.sisyphus/evidence/task-18-export-integrity.txt`
