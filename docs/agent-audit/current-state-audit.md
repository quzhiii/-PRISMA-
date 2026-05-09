# Current State Audit

Date: 2026-05-09

Target iteration: V2.3 PRISMA-trAIce release-ready checkpoint

## 1. Repository Structure

The repository is a static browser application with historical version folders and shared root-level assets.

Important paths:

- `README.md` and `README_EN.md`: bilingual public positioning for the current V2.3 release-ready line.
- `index.html`, `login.html`, `app.js`, `parser-worker.js`, `db-worker.js`, `style.css`: root-level legacy/current shared entry files.
- `dedup-engine.js`: shared conservative deduplication engine used by root and versioned workspaces.
- `literature-screening-v2.0/`: current V2.1 workspace implementation and GitHub Pages-compatible version path.
- `literature-screening-v2.2/`: current audit-ready and PRISMA-trAIce readiness workspace.
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

- reviewer decisions are increasingly represented through durable `ScreeningDecision` records for rule/manual/AI-confirmed paths, but dual-review resolver records still need formalization.
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

Current exports include PRISMA diagram, result tables, candidate duplicate details, screening report, audit package files, and PRISMA-trAIce readiness files.

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

- 104 tests passed.
- 0 tests failed.

Existing test areas:

- `tests/dedup/`: dedup engine, candidate output, benchmark regression, app integration and legacy paths.
- `tests/import/`: import hardening, import job state and parser chunk boundaries.
- `tests/quality/`: evidence engine and study-design classifier.
- `tests/audit/`: audit model, PRISMA count replay, audit export, PRISMA-trAIce report, and workflow source checks.
- `tests/ai/`: AI suggestion panel, mock suggestion generation, human accept/reject/edit review flow, and JSONL trace boundaries.

Benchmark evidence:

- `docs/benchmarks/dedup/post-implementation-benchmark-report.md` records the current dedup-vnext benchmark narrative.

## 9. Main Risks

1. `app.js` owns too many responsibilities: import, parsing orchestration, screening, review, quality, collaboration, export and UI state.
2. `app.js` audit hooks are now present, but the file still mixes UI, workflow, persistence, and export responsibilities.
3. PRISMA counts can be replayed from decisions/events, but reviewer conflict gates are not yet strict final-export blockers.
4. Exclusion reason taxonomy exports exist, but before/after changes to reason choices still need deeper audit events.
5. Quality assessment exists as a baseline queue, but not formal tool-specific appraisal forms.
6. Dual-review support exists, but reviewer isolation, conflict gates and final resolver records need formalization.
7. AI usage registry, provider abstraction, and AI suggestion log now exist for V2.3 readiness. Real AI provider dispatch remains disabled until the audit/reporting boundaries and API-key handling are release-stable.
8. RDF/BibTeX/TXT import fallback behavior remains a future stability concern for large files.

## 10. Recommended Next Patch

V2.3 release-readiness is now satisfied and tracked in `docs/checklists/V2.3_PRISMA_TRAICE_READINESS_CHECKLIST.md`.

Start the next pass with provider-integration hardening or V2.4 preparation:

1. Keep V2.3 as a mock/local audit layer; provider request drafts may exist, but no real provider dispatch should occur yet.
2. Use the V2.3 checklist as the export and behavior freeze for PRISMA-trAIce readiness.
3. For AI, add the OpenAI-compatible configuration UI only after API key storage warnings, redacted export checks, and manual-dispatch gates are in place.
4. For V2.4, move to quality appraisal structure: template schema, `quality_appraisal.csv`, and evidence table planning.
5. Preserve the current full regression gate before each slice.
