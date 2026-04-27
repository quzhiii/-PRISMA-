# Current State Audit

Date: 2026-04-27

Target iteration: V2.2 audit-ready foundation

## 1. Repository Structure

The repository is a static browser application with historical version folders and shared root-level assets.

Important paths:

- `README.md` and `README_EN.md`: bilingual public positioning for the current V2.1 release.
- `index.html`, `login.html`, `app.js`, `parser-worker.js`, `db-worker.js`, `style.css`: root-level legacy/current shared entry files.
- `dedup-engine.js`: shared conservative deduplication engine used by root and versioned workspaces.
- `literature-screening-v2.0/`: current V2.1 workspace implementation and GitHub Pages-compatible version path.
- `literature-screening-v2.2/`: newly created V2.2 iteration folder copied from `literature-screening-v2.0/`.
- `tests/`: Node `node:test` regression coverage for deduplication, import hardening, streaming parser behavior, and quality baseline behavior.
- `docs/benchmarks/dedup/`: dedup benchmark evidence and reports.
- `docs/plans/`: implementation plans and roadmap documents.

The current V2.2 iteration should modify `literature-screening-v2.2/` first and leave `literature-screening-v2.0/` intact until a release cutover is intentional.

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

Main gap: there is no first-class `ProjectManifest`, `AuditEvent`, or `ScreeningDecision` model yet.

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

Main gap: dedup outcomes are not recorded as audit events, so a final record state cannot yet be traced back through each dedup decision.

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

- reviewer decisions are not formal `ScreeningDecision` records.
- conflict resolution is present, but not yet a strict final-export gate.
- exclusion reason changes are not logged with before/after values.

## 7. Current Export Workflow

Export functions:

- `downloadFile(type)`
- `downloadAllFiles()`
- `generateExcel(data, type)`
- `generateExcelUTF8BOM(data, type)`
- `generateReport(results)`
- `generatePRISMASVG(counts, theme, mode)`

Current exports focus on PRISMA diagram, result tables, candidate duplicate details and screening report.

Main gap: there is no audit package export yet:

- `project_manifest.json`
- `events.jsonl`
- `screening_decisions.csv`
- `exclusion_reasons.csv`
- `prisma_counts.json`
- `audit_summary.md`

## 8. Current Tests and Benchmark

Current regression entry:

```powershell
node tests\run-all-regressions.js
```

Sandbox behavior:

- In the current Codex sandbox, Node test subprocesses fail with `spawn EPERM`.
- Running the same command outside the sandbox is required for this environment.

Latest verified result:

- 50 tests passed.
- 0 tests failed.

Existing test areas:

- `tests/dedup/`: dedup engine, candidate output, benchmark regression, app integration and legacy paths.
- `tests/import/`: import hardening, import job state and parser chunk boundaries.
- `tests/quality/`: evidence engine and study-design classifier.

Benchmark evidence:

- `docs/benchmarks/dedup/post-implementation-benchmark-report.md` records the current dedup-vnext benchmark narrative.

## 9. Main Risks

1. `app.js` owns too many responsibilities: import, parsing orchestration, screening, review, quality, collaboration, export and UI state.
2. Audit log is missing, so final decisions cannot yet be replayed record-by-record.
3. PRISMA counts currently depend on runtime `screeningResults`, not a durable decision ledger.
4. Exclusion reason taxonomy exists as UI/default state, but is not a formal auditable taxonomy export.
5. Quality assessment exists as a baseline queue, but not formal tool-specific appraisal forms.
6. Dual-review support exists, but reviewer isolation, conflict gates and final resolver records need formalization.
7. AI usage registry and AI suggestion log do not exist. Real AI should not be added before audit foundations are stable.
8. RDF/BibTeX/TXT import fallback behavior remains a future stability concern for large files.

## 10. Recommended First Patch

Start V2.2 with a small audit foundation patch in the new version folder:

1. Add `literature-screening-v2.2/audit-engine.js` as a pure UMD-style module.
2. Add `tests/audit/audit-engine.test.mjs`.
3. Add `audit-engine.js` to `literature-screening-v2.2/workspace.html`.
4. Extend `literature-screening-v2.2/db-worker.js` with audit-related stores and message handlers.
5. Keep workflow event hooks in `app.js` for the next patch after the pure audit model is verified.

The first implementation patch should not add real AI UI and should not modify `literature-screening-v2.0/`.
