# V2.4-beta Evidence Table Implementation Plan

**Goal:** Add the V2.4-beta `evidence_table.csv` export as the next quality-appraisal deliverable after `quality_appraisal.csv`.

**Architecture:** Extend `quality-engine.js` with a small evidence-table schema and serializer that combines included study records with existing quality assessments. Wire the export through `app.js` and `workspace.html` without changing the frozen V2.3 audit package surface.

**Constraints:** Keep local-first behavior, do not connect a real AI provider, do not save/export API keys, and keep GRADE certainty human-controlled.

## Tasks

1. Add `EVIDENCE_TABLE_COLUMNS`, row flattening, and `serializeEvidenceTableCsv()` to `literature-screening-v2.2/quality-engine.js`.
2. Build `evidence_table.csv` from `screeningResults.included` and `qualityAssessments` in `literature-screening-v2.2/app.js`.
3. Add a Step 6 export button and file description in `literature-screening-v2.2/workspace.html`.
4. Add tests for evidence-table serialization, app export wiring, audit boundary, and frozen V2.3 audit package separation.
5. Update V2.4 docs/checklist to mark V2.4-beta evidence-table export as implemented and leave GRADE summary for V2.4 final.
6. Run focused quality/audit tests and `node tests\run-all-regressions.js`.
