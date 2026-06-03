# Current State Audit

Date: 2026-06-02

Target iteration: V2.5 dual-review closeout

## 1. Repository Structure

The repository is a static browser application with historical version folders and shared root-level assets.

Important paths:

- `README.md` and `README_EN.md`: bilingual public positioning for the current V2.4 stable line and V2.5 closeout line.
- `index.html`, `login.html`, `app.js`, `parser-worker.js`, `db-worker.js`, `style.css`: root-level legacy/current shared entry files.
- `dedup-engine.js`: shared conservative deduplication engine used by root and versioned workspaces.
- `literature-screening-v2.0/`: current V2.1 workspace implementation and GitHub Pages-compatible version path.
- `literature-screening-v2.2/`: current compatibility workspace. It carries V2.3 PRISMA-trAIce readiness, V2.4 quality appraisal, and the V2.5 dual-review closeout slices.
- `tests/`: Node `node:test` regression coverage for deduplication, import hardening, streaming parser behavior, and quality baseline behavior.
- `docs/benchmarks/dedup/`: dedup benchmark evidence and reports.
- `docs/plans/`: implementation plans and roadmap documents.

The current iteration should continue modifying `literature-screening-v2.2/` first and leave `literature-screening-v2.0/` intact until a release cutover is intentional.

## 2. Current Product Workflow

The active workspace flow has six steps:

1. Import records.
2. Configure screening criteria.
3. Run automatic/rule screening and preview PRISMA counts.
4. Complete full-text review and record exclusion reasons.
5. Prepare quality assessment/evidence baseline entries.
6. Export PRISMA diagram, result tables, and screening report.

The workflow is driven mainly by `app.js`, with page structure in `workspace.html`.

## 3. Current Data Model

The current data model is mostly runtime state plus local persistence.

Runtime state in `app.js`:

- `uploadedData`: parsed imported records.
- `screeningResults`: deduplicated and screened results, including included/excluded records and counts.
- `qualityAssessments`: quality queue and baseline assessment records.
- `importJobs`: import lifecycle status and progress.
- `dualReviewResults`: reviewer A/B decisions and final disagreement resolutions.
- `currentProjectId`: local project identity used for project snapshots.

IndexedDB stores in `db-worker.js`:

- `records`: imported records.
- `dedup_index`: dedup index entries.
- `quality_assessments`: quality assessment records.
- `import_jobs`: import job records.

Project persistence:

- `persistCurrentProjectState()` stores project snapshots.
- `restoreProjectState(snapshot)` rehydrates runtime state.
- `localStorage` keys include collaboration state, current project id, import progress and user session.

Historical baseline: older releases did not have a first-class `ProjectManifest`, `AuditEvent`, or `ScreeningDecision` model.

V2.3 checkpoint update:

- `ProjectManifest`, `AuditEvent`, and `ScreeningDecision` now exist in `literature-screening-v2.2/audit-engine.js`.
- AI audit state now includes AI mode, AI usage registry entries, and `AISuggestionEvent` records.
- AI suggestions remain advisory until a human accept/edit action creates a linked `ScreeningDecision`.

V2.4-alpha checkpoint update:

- `quality-engine.js` now defines `QUALITY_APPRAISAL_SCHEMA_VERSION`, `QUALITY_APPRAISAL_TEMPLATES`, priority study-design templates, judgement options, and CSV export columns.
- Priority templates cover RCT, cohort, case-control, cross-sectional, diagnostic accuracy, and systematic review records.
- Quality assessment records now carry template id, template version, schema version, domain rows, overall judgement, reviewer id, and status fields.
- `quality_appraisal.csv` is available as a V2.4-alpha export without adding it to the frozen V2.3 audit export trio.
- `quality_export_generated` records the quality-appraisal export boundary in audit events.

V2.4-beta checkpoint update:

- `evidence_table.csv` is available as a V2.4-beta export without adding it to the frozen V2.3 audit export trio.
- Evidence table rows combine included studies with quality assessments and expose PICOS, effect measure, effect estimate, quality judgement, certainty of evidence, and notes fields.
- `evidence_table_export_generated` records the evidence table export boundary in audit events.

V2.4 checkpoint update:

- `grade_summary.csv` is available as a V2.4 export without adding it to the frozen V2.3 audit export trio.
- GRADE summary rows group included evidence by outcome / PICOS and expose study count, record ids, study designs, effect summary, quality judgement summary, and baseline certainty.
- Final GRADE certainty, downgrade reasons, and confirmation status remain human-controlled.
- `grade_summary_export_generated` records the GRADE summary export boundary in audit events.
- Step 5 includes single-review, reviewer-editable item-level quality forms for domain judgement, supporting quote/page, reviewer note, overall judgement, status, and assessment notes.
- Saving quality form edits updates `qualityAssessments`, persists local project state, and records a human-sourced `quality_appraisal_updated` audit event with before/after snapshots.
- `quality_appraisal.csv` reflects the saved human-entered item-level quality fields.

V2.5 checkpoint update:

- `dual-review-engine.js` now owns `dual_review.v2.5-alpha` conflict and agreement helpers for screening and quality appraisal.
- Full-text reviewer A/B decisions are isolated as durable `ScreeningDecision` records; resolver decisions write a final human decision plus `review_conflict_resolved`.
- PRISMA count replay excludes unresolved A/B conflicts and counts resolver/final human decisions when present.
- Quality conflicts are detected across `overall_judgement`, `status`, and domain judgements.
- Step 5 now has a minimal main-reviewer quality conflict resolver that writes resolver/final quality values and a `quality_conflict_resolved` audit event.
- V2.5 exports `dual_review_conflicts.csv` and `dual_review_agreement.json` outside the frozen V2.3 audit export type list.
- Final result exports are blocked with `export_conflict_blocked` while unresolved dual-review conflicts remain; audit and dual-review evidence exports remain available with `export_conflict_warning`.

## 4. Current Import / Parsing Pipeline

Import entry points:

- `handleMultipleFiles(files)`
- `handleMultipleFilesV15(files)`
- `handleImportFiles(files)`

Parsing paths:

- `parser-worker.js`: worker orchestration and format parsing.
- `streaming-parser.js`: incremental parsing for common formats.
- `parseFileIncrementallyWithWorker(file, ext, onProgress)`: incremental worker path.
- `parseFileContent(text, ext)`: whole-file fallback for supported fallback formats.

Current common incremental formats are defined in `import-job-runtime.js`:

- `.csv`
- `.tsv`
- `.ris`
- `.nbib`
- `.enw`

RDF/BibTeX/TXT still use fallback paths. The project already has import hardening tests that ensure supported incremental formats do not silently fall back to whole-file parsing.

## 5. Current Dedup Pipeline

The conservative deduplication workflow is centered on `dedup-engine.js` and `runDedupForScreening(data)`.

The model separates:

- hard duplicates: safe auto-removal cases.
- candidate duplicates: likely duplicates surfaced for manual review.

Export helpers include `flattenCandidateDuplicatesForExport(candidateDuplicates)` and candidate duplicate export coverage exists in tests.

Checkpoint update: dedup outcomes now write normalized audit event types for hard duplicate removal and candidate duplicate flagging. Candidate duplicate adjudication still has room for deeper reviewer isolation and conflict gating.

## 6. Current Review Workflow

Manual/full-text review is handled mainly by:

- `displayFulltextReviewUI()`
- `setManualReviewDraftDecision(idx, decision)`
- `finalizeFulltextReview()`
- `setDefaultExclusion(reason)`
- `batchExclude()`

Dual-review support exists through:

- `dualReviewResults`
- `calculateKappa(decisions1, decisions2)`
- `calculateReliabilityStats(...)`
- `showDisagreements()`
- `applyFinalDecisions()`

Main gaps:

- reviewer decisions are increasingly represented through durable `ScreeningDecision` records for rule/manual/AI-confirmed paths, and the minimal V2.5 resolver workflow is now formalized for full-text and quality conflicts.
- conflict resolution is present, and final result exports now use a strict unresolved-conflict blocker while evidence exports remain warning-only.
- exclusion reason changes are not logged with before/after values.

## 7. Current Export Workflow

Export functions:

- `downloadFile(type)`
- `downloadAllFiles()`
- `generateExcel(data, type)`
- `generateExcelUTF8BOM(data, type)`
- `generateReport(results)`
- `generatePRISMASVG(counts, theme, mode)`

Current exports include PRISMA diagram, result tables, candidate duplicate details, screening report, audit package files, PRISMA-trAIce readiness files, the V2.4 `quality_appraisal.csv`, the V2.4 `evidence_table.csv`, and the V2.4 `grade_summary.csv`.

V2.5 final-result export gate:

- unresolved screening or quality conflicts block final result exports such as included/excluded tables, PRISMA SVG, screening report, quality appraisal, evidence table, GRADE summary, PRISMA counts, and audit summary.
- audit evidence and dual-review evidence exports remain available with warning-only behavior.

Current audit package exports:

- `project_manifest.json`
- `events.jsonl`
- `screening_decisions.csv`
- `exclusion_reasons.csv`
- `prisma_counts.json`
- `audit_summary.md`
- `ai_usage_registry.json`
- `ai_suggestions.jsonl`
- `PRISMA_TRAICE_REPORT.md`

V2.4-alpha quality export:

- `quality_appraisal.csv`, including human-entered domain judgement, supporting quote/page, reviewer note, overall judgement, status, and updated timestamp.

V2.4-beta evidence export:

- `evidence_table.csv`

V2.4 GRADE summary export:

- `grade_summary.csv`

V2.5 dual-review evidence exports:

- `dual_review_conflicts.csv`
- `dual_review_agreement.json`

V2.3 checkpoint update: `ai_suggestions.jsonl` includes human action, linked decision id, `reviewed_at`, human edit fields, and `prisma_count_boundary`. Rejected suggestions stay advisory-only and do not change PRISMA counts.

## 8. Current Tests and Benchmark

Current regression entry:

```powershell
node tests\run-all-regressions.js
```

Sandbox behavior:

- In the current Codex sandbox, Node test subprocesses fail with `spawn EPERM`.
- Running the same command outside the sandbox is required for this environment.

Latest verified result:

- 121 tests passed after the V2.5 final export gate hardening.
- 0 tests failed.
- Syntax checks passed for `literature-screening-v2.2\app.js`, `literature-screening-v2.2\dual-review-engine.js`, and `literature-screening-v2.2\audit-engine.js`.
- Focused V2.5 audit tests passed `54/54`.
- Headless Chrome browser smoke passed with 0 console errors and 0 runtime exceptions. It verified workspace load, screening conflict detection, quality conflict detection, resolver workflows, final export blocking, and warning-only evidence exports.

Existing test areas:

- `tests/dedup/`: dedup engine, candidate output, benchmark regression, app integration and legacy paths.
- `tests/import/`: import hardening, import job state and parser chunk boundaries.
- `tests/quality/`: evidence engine, study-design classifier, priority quality-appraisal templates, `quality_appraisal.csv` serialization including reviewer item-level edits, `evidence_table.csv` serialization, and `grade_summary.csv` serialization.
- `tests/audit/`: audit model, PRISMA count replay, audit export, PRISMA-trAIce report, item-level quality form wiring, and workflow source checks.
- `tests/ai/`: AI suggestion panel, mock suggestion generation, human accept/reject/edit review flow, and JSONL trace boundaries.

Benchmark evidence:

- `docs/benchmarks/dedup/post-implementation-benchmark-report.md` records the current dedup-vnext benchmark narrative.

## 9. Main Risks

1. `app.js` owns too many responsibilities: import, parsing orchestration, screening, review, quality, collaboration, export and UI state.
2. `app.js` audit hooks are now present, but the file still mixes UI, workflow, persistence, and export responsibilities.
3. PRISMA counts can be replayed from decisions/events, and final-result exports are now blocked when reviewer conflicts remain; headless Chrome smoke verified the gate in a real browser context.
4. Exclusion reason taxonomy exports exist, but before/after changes to reason choices still need deeper audit events.
5. Quality assessment now has a V2.4 schema, priority templates, reviewer-editable item-level forms, evidence-table export, GRADE summary foundation, and V2.5 quality-conflict resolver coverage. Remaining risk is manual usability on larger real projects.
6. Dual-review support now has reviewer isolation, conflict gates, resolver records, evidence exports, and browser smoke coverage, but edge cases still need monitoring on real review datasets.
7. AI usage registry, provider abstraction, and AI suggestion log now exist for V2.3 readiness. Real AI provider dispatch remains disabled until the audit/reporting boundaries and API-key handling are release-stable.
8. RDF/BibTeX/TXT import fallback behavior remains a future stability concern for large files.

## 10. Recommended Next Patch

V2.3 release-readiness is satisfied and tracked in `docs/checklists/V2.3_PRISMA_TRAICE_READINESS_CHECKLIST.md`.

V2.4 quality-appraisal readiness is tracked in `docs/checklists/V2.4_ALPHA_QUALITY_APPRAISAL_CHECKLIST.md`. V2.4-beta evidence-table export, V2.4 GRADE summary foundation, and reviewer-editable item-level quality forms are now part of the same checklist.

V2.5 readiness is now tracked in `docs/checklists/V2.5_DUAL_REVIEW_READINESS_CHECKLIST.md`.

After this closeout reconciles `origin/main` with the V2.5 branch, the next roadmap pass should prepare V2.6 only at the safety-boundary level:

1. Keep V2.3 as a mock/local audit layer; provider request drafts may exist, but no real provider dispatch should occur yet.
2. Use the V2.3 checklist as the export and behavior freeze for PRISMA-trAIce readiness.
3. For AI, add the OpenAI-compatible configuration UI only after API key storage warnings, redacted export checks, and manual-dispatch gates are in place.
4. Keep final GRADE certainty and downgrade reasons human-controlled.
5. Preserve reviewer isolation, conflict queue, resolver workflow, agreement metrics, and unresolved-conflict export gates as the V2.5 release boundary.
6. Preserve the current full regression gate before each slice.
7. Reconcile `origin/main` and the V2.5 branch before public release so the V2.4 README refresh and V2.5 closeout work are both retained.
