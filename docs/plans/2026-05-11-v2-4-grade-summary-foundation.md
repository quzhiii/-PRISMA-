# V2.4 GRADE Summary Foundation Plan

**Goal:** Add the V2.4 `grade_summary.csv` export as the final quality-appraisal foundation after `quality_appraisal.csv` and `evidence_table.csv`.

**Architecture:** Extend `quality-engine.js` with a small GRADE summary schema and serializer that groups included evidence rows by outcome / PICOS. Wire the export through `app.js` and `workspace.html` without changing the frozen V2.3 audit package surface.

**Constraints:** Keep local-first behavior, do not connect a real AI provider, do not save/export API keys, and keep final GRADE certainty and downgrade reasons human-controlled.

## Tasks

1. Add `GRADE_SUMMARY_COLUMNS`, row grouping, and `serializeGradeSummaryCsv()` to `literature-screening-v2.2/quality-engine.js`.
2. Build `grade_summary.csv` from `screeningResults.included` and `qualityAssessments` in `literature-screening-v2.2/app.js`.
3. Add a Step 6 export button and file description in `literature-screening-v2.2/workspace.html`.
4. Add tests for GRADE summary serialization, app export wiring, audit boundary, and frozen V2.3 audit package separation.
5. Update V2.4 docs/checklist to mark GRADE summary foundation as implemented and leave reviewer-editable item-level forms for the next decision.
6. Run focused quality/audit tests and `node tests\run-all-regressions.js`.
