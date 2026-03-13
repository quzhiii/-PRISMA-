## 2026-03-13 Task: initialization

Recording patterns, conventions, and successful approaches from the Prisma dual-track implementation.

## 2026-03-13 Task 6: Feature Rationale
- High-value commercial focus: Commercial literature screening value is concentrated in three areas: (1) Trustworthy deduplication, (2) Screening speed, and (3) Auditability/Export quality.
- User Pain Point: Users often distrust automated deduplication. Providing a review "workbench" for borderline cases increases perceived and actual trustworthiness.
- Workflow Efficiency: In systematic reviews, the bottleneck is often the "Title/Abstract" screening phase. Keyboard-first navigation (J/K/Y/N) provides the most significant speed boost for power users.
- PRISMA Compliance: Accurate source tracking from Step 1 (importer) is critical for generating compliant PRISMA 2020 diagrams without manual count corrections.

## 2026-03-13 Task: v1.7.x repro learnings

- Keep support matrix single-sourced: when docs/tutorial mention an extension (`.nbib`), keep UI `accept` and runtime `validExts` generated from the same source to prevent drift.
- Add parser/load smoke checks to CI for browser-loaded patches: `node --check v1.7-core-patch.js` would have caught the current parse blocker before release.
- Session contract must be bidirectional: if login writes `prisma_user_session`, app bootstrap must read/validate it once and initialize explicit mode state.
- Use declaration guards in large legacy files: undeclared globals (`currentUserSession`, `isDualReviewMode`) can stay latent until late-step flows and appear as "post-upload" failures.
- Repro artifacts are more maintainable when scripted and machine-readable (JSON + stderr snapshots):
  - `fixtures/repro/repro-nbib-rejection.mjs`
  - `fixtures/repro/repro-mode-confusion.mjs`
  - `fixtures/repro/repro-post-upload-progression.mjs`

## 2026-03-13 Task 7 Prep: .nbib Fixture & Contract
- Created `fixtures/pubmed-sample.nbib` with 3 diverse PubMed records (TCM hypertension meta-analysis, Acupuncture RCT, Chinese herbal formula network meta-analysis)
- Created `tests/NBIB-IMPORTER-CONTRACT.md` with complete field mapping specification
- Contract includes: 10 regression test cases, encoding expectations (UTF-8), field value formats, parser robustness requirements
- index.html already instructs users to export .nbib from PubMed (line 927: "下载.nbib文件")
- app.js currently EXCLUDES .nbib from validExts (lines 365, 713, 858) - ready for Task 7 implementation
- Strategy: .nbib is RIS-compatible; parser can reuse existing parseRISContent() logic with extended fieldMap

## 2026-03-13 Task 8 Spec Promotion
- Extracted Task 8 runtime mode contract from decisions.md and promoted to standalone spec: `docs/contracts/runtime-mode-contract.md`
- Spec contains complete mode detection algorithm, per-mode UI gating rules, fallback behavior, and implementation checklist
- Source of truth now: `runtime-mode-contract.md` (not embedded in decisions)
- Removes ambiguity for Task 8 implementation: concrete list of DOM IDs to hide, session field requirements, console warning patterns

## 2026-03-13 Task 10 Learnings
- Keeping importer output intentionally raw (source metadata only) made normalization tests smaller and clearer; source-specific mapping belongs in normalizer field maps.
- A family-registry contract (`resolveSourceFamilyByExtension`) is an effective guardrail against accidental scope creep into unsupported formats.
- Deterministic IDs are easiest to reason about when seeded from importer metadata (`_source_family`, `_source_file`, `_source_record_index`) rather than mutable text fields.
- Lightweight `node:test` contract tests are enough to lock V2 interfaces before parser/dedup/state modules are implemented.

## 2026-03-13 Task 8 Learnings

- In legacy single-file apps, runtime mode should be derived once and cached at bootstrap; re-reading session storage in deep UI handlers creates drift and inconsistent gating.
- UI gating must be paired with action-level guards (`saveProjectFile`, disagreement resolution) to prevent bypass via console/manual invocation.
- Project scoping should prioritize authenticated session `projectId` before local fallback IDs to avoid cross-project contamination when users switch between direct and login entry paths.

## 2026-03-13 Task 14 Learnings

- Deterministic dedup remains explainable when every auto-merge is emitted as a structured link record (`winner_id`, `duplicate_id`, `reason`), not implicit mutation.
- For trustworthy title-based dedup, requiring year equality and skipping title-only collisions sharply reduces false-positive merges in protocol-heavy datasets.
- Metadata completeness is a practical default tie-breaker that is stable, auditable, and independent of import order.
- Reason `hook` strings decouple core dedup logic from presentation language and let future UI layers localize explanations cleanly.

## 2026-03-13 Task 18 Learnings

- A flat `buildDecisionMap(snapshot)` keyed by `recordId` is the correct bridge between the decisions module (record-centric) and the exporter (presentation-centric); avoids O(n²) lookup without coupling.
- Separating "missing field defaults" into a pure helper layer (`str()`, `num()`, `arr()`, `year()`) eliminates scattered null-guard code and makes the policy testable in isolation.
- `year=0` must be coerced to `null` at the exporter boundary — callers expect either a valid integer year or null, never 0, because "0" is meaningless in a bibliographic context.
- Contract tests written with `node:test` + `assert.deepStrictEqual` catch key-set drift (extra or missing keys) effectively without requiring a schema library.
- The `no-mutation` test (passing frozen records and asserting the original array is unchanged after `shapeExportArtifact`) is worth adding explicitly — mapping operations on arrays look safe but easy to introduce accidental side-effects.
- Duplicate records (`_duplicate_of` set) must be filtered out at every shaping function boundary, not only once at the artifact level, to keep each shaped list independently correct.
- Keeping `exporter/index.js` as pure functions (no class, no state) means tests require zero setup/teardown and run in ~90ms for 28 tests.
