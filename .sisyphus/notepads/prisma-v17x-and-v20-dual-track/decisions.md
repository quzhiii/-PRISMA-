## 2026-03-13 Task: initialization

Recording architectural choices and rationales for the dual-version implementation strategy.

## 2026-03-13 Task 4: V2.0 architecture contract and skeleton

- Established isolated `V2.0/` boundary with explicit contract in `V2.0/ARCHITECTURE_CONTRACT.md`.
- Locked deterministic pipeline direction: importer -> normalizer -> dedup -> decisions -> exporter.
- Separated orchestration and domain logic by defining `src/ui-shell` as orchestration-only.
- Reserved `src/locales` as data-only and `src/fixtures` as test/demo data-only to avoid runtime coupling.
- Added explicit guardrail: no dependency on legacy root runtime files (including `app.js`, `db-worker.js`).

## 2026-03-13 Task 6: V2 Feature Scope and Workflow Boundaries
- Focused V2.0 on "Clean Local-First MVP" to ensure privacy and performance.
- Decided to defer Cloud Sync and AI-Assisted Screening to maintain a predictable development timeline and prioritize core reliability.
- Established mandatory "Deduplication Workbench" as a separate UI step to address user anxiety regarding "silent" record loss.
- Defined explicit MVP stop conditions centered on large-scale handling (10k+ records) and keyboard-driven efficiency.

## 2026-03-13 Task 9: V2.0 Contract Hardening for Dual-Track Isolation
- Reconfirmed `V2.0/` as an isolated runtime boundary and kept all module contracts inside the worktree-local V2 tree.
- Locked pipeline contract as `importer -> normalizer -> dedup -> decisions -> exporter` and documented it as one-way dependency flow.
- Formalized UI-agnostic screening core (`importer`, `normalizer`, `dedup`, `decisions`) with explicit state-machine decisions and deterministic contracts.
- Kept `ui-shell` orchestration-only, preventing domain logic leakage from core modules into UI.
- Retained hard guardrail that V2 runtime must not import legacy root runtime files (`app.js`, `db-worker.js`, legacy version folders).

## 2026-03-13 Task 7: .nbib Importer Implementation Decision
- Decision: Add .nbib support to importer (Task 7)
- Rationale: index.html already teaches users to export .nbib from PubMed; gap between user expectation and capability
- Technical approach: Extend existing RIS parser with PubMed-specific fieldMap entries (PMID, EDAT, MH, PHST, etc.)
- Existing fixture: `fixtures/pubmed-sample.nbib` (3 records, UTF-8 encoded)
- Existing contract: `tests/NBIB-IMPORTER-CONTRACT.md` (10 regression tests, field mapping spec)
- Implementation scope: Add `.nbib` to validExts array in app.js, extend parseRISContent() fieldMap

## 2026-03-13 Task 8: Runtime Mode Contract — `single`, `dual-main`, `dual-secondary`

### Context

This contract defines how the three runtime modes are detected, what UI is shown or hidden per mode,
and what fallback behavior applies. It directly unblocks Task 8 implementation.

The current state (v1.7 codebase): `login.html` writes a session to `sessionStorage`, but `app.js`
reads it **nowhere**. Every user — regardless of whether they logged in or entered directly — sees
the same Step 4 UI, including the hardcoded dual-review collaboration panel
(`#collaboration-status`, `#reviewer-a-status`, etc.). This contract specifies what Task 8 must
implement to gate that UI correctly.

---

### Mode Detection Algorithm

Read `sessionStorage` at app init (document ready / `init()` entry). Do not re-read during session.

```js
function detectRuntimeMode() {
  const raw = sessionStorage.getItem('prisma_user_session');
  if (!raw) return 'single';
  let session;
  try {
    session = JSON.parse(raw);
  } catch (e) {
    console.warn('[mode] prisma_user_session is not valid JSON — falling back to single', e);
    return 'single';
  }
  if (
    typeof session.role !== 'string' ||
    typeof session.isMainReviewer !== 'boolean'
  ) {
    console.warn('[mode] prisma_user_session missing required fields — falling back to single', session);
    return 'single';
  }
  return session.isMainReviewer ? 'dual-main' : 'dual-secondary';
}
```

Store the result in a module-level constant:

```js
const RUNTIME_MODE = detectRuntimeMode(); // 'single' | 'dual-main' | 'dual-secondary'
```

Session shape written by `login.html` (source of truth):

```js
{
  role: "reviewer-a" | "reviewer-b",   // string, required
  username: string,
  projectId: string,
  loginTime: ISO8601 string,
  isMainReviewer: boolean               // true iff role === "reviewer-a"
}
```

---

### Per-Mode Specification

#### Mode: `single`

**Session input:** `sessionStorage.getItem('prisma_user_session')` returns `null`.

**Entry path:** User navigated directly to `index.html` (bypassing `login.html`), or via the
"单人审查模式" link in `login.html`.

**Step 1–3 UI:** No changes. All existing upload, screening, and results UI is displayed normally.

**Step 4 UI — SHOW:**
- Full-text review table (`#fulltext-review-table` / `displayFulltextReviewUI()` output)
- Exclusion reason dropdowns per record
- "完成全文审查" / `finalizeFulltextReview()` button
- Any single-reviewer statistics panel (currently absent — no change required)

**Step 4 UI — HIDE (`display: none`):**
- `#collaboration-status` — the "👥 多用户协作审查" gradient banner (index.html ~line 1521)
- `#reviewer-a-status` inner block
- `#reviewer-b-status` inner block
- `#kappa-analysis` panel (line ~1547)
- "💾 导出协作项目" button
- "📊 查看详细状态" button (calls `showProjectStatus()`)

**Allowed actions:** All Steps 1–3 actions; all Step 4 single-reviewer review and finalize actions;
all Step 5 export actions.

**Blocked actions:** None — single mode is full-featured for solo use.

---

#### Mode: `dual-main` (主审查员, `isMainReviewer === true`)

**Session input:** `session.role === "reviewer-a"`, `session.isMainReviewer === true`.

**Entry path:** User logged in via `login.html` as Reviewer A.

**Step 4 UI — SHOW (all of the above single items PLUS):**
- `#collaboration-status` banner — visible
- `#reviewer-a-status` block — visible, labeled with `session.username`
- `#reviewer-b-status` block — visible (shows Reviewer B's progress or "pending")
- `#kappa-analysis` panel — visible (enabled when both reviewers have completed)
- "💾 导出协作项目" button — visible and enabled
- "📊 查看详细状态" button — visible and enabled (`showProjectStatus()`)

**Allowed actions:**
- All single-mode review actions (dropdowns, finalize)
- Export collaboration project file (`saveProjectFile()`)
- View project status (`showProjectStatus()`)
- View Kappa analysis (when unlocked by both completing review)
- Resolve disagreements (`displayDisagreementResolution()`)

**Blocked actions:** None specific to main reviewer role.

**Note on projectId:** `session.projectId` must be used to scope any localStorage/IndexedDB data
to avoid cross-project contamination. Task 8 must pass `session.projectId` to
`ensureProjectId()` / `getProjectStorageKey()` instead of generating a new one.

---

#### Mode: `dual-secondary` (副审查员, `isMainReviewer === false`)

**Session input:** `session.role === "reviewer-b"`, `session.isMainReviewer === false`.

**Entry path:** User logged in via `login.html` as Reviewer B.

**Step 4 UI — SHOW:**
- `#collaboration-status` banner — visible (read-only header)
- `#reviewer-b-status` block — visible, labeled with `session.username`
- `#reviewer-a-status` block — visible (shows Reviewer A's progress or "pending")
- Full-text review table for secondary reviewer's own decisions

**Step 4 UI — HIDE / DISABLE:**
- `#kappa-analysis` panel — hidden until both reviewers complete (same as dual-main)
- "💾 导出协作项目" button — **hidden** (only main reviewer exports the joint file)
- `displayDisagreementResolution()` panel — **hidden** (only main reviewer resolves disagreements)

**Allowed actions:**
- All single-mode review actions (dropdowns, finalize for own decisions)
- View project status (`showProjectStatus()`)

**Blocked actions:**
- Export collaboration project (`saveProjectFile()`) — hidden, not just disabled
- Resolve disagreements — hidden

---

### Fallback Behavior

| Condition | Behavior |
|---|---|
| `sessionStorage` key absent | Mode = `single`. No warning shown to user. |
| Key present but JSON parse fails | Mode = `single`. `console.warn` logged. No user-visible error. |
| Key present but `role` or `isMainReviewer` missing | Mode = `single`. `console.warn` logged. |
| Key present, role is unrecognized string (not `"reviewer-a"` / `"reviewer-b"`) | Mode = `single`. `console.warn` logged. |
| Key present, `isMainReviewer` type is not boolean | Mode = `single`. `console.warn` logged. |

In all fallback cases the app is fully usable as a single-reviewer tool. No error dialogs.
No blocking. No data loss.

---

### Implementation Checklist for Task 8

The following must be implemented in `app.js` (do not modify `login.html` or `index.html` structure):

1. Add `detectRuntimeMode()` function (pseudocode above).
2. Call it once at `init()` entry and store in `const RUNTIME_MODE`.
3. Add a `applyModeGating(mode)` function that reads `RUNTIME_MODE` and applies
   `element.style.display = 'none'` / `'block'` to the elements listed above.
4. Call `applyModeGating(RUNTIME_MODE)` from `init()` after DOM is ready.
5. Optionally: inject `session.username` into `#reviewer-a-status` / `#reviewer-b-status`
   header labels for personalization (non-blocking if deferred).
6. Wire `session.projectId` into `ensureProjectId()` so collaboration data is scoped per project.

Elements to hide in `single` mode (exact IDs from `index.html`):
- `collaboration-status`
- `kappa-analysis`

Buttons to hide in `single` mode (locate by text / onclick attribute):
- `onclick="saveProjectFile()"` button
- `onclick="showProjectStatus()"` button

Buttons to hide in `dual-secondary` mode (in addition to single-mode hidden items):
- `onclick="saveProjectFile()"` button (already hidden from single)
- Any disagreement resolution trigger

---

### Rationale

- Mode is derived solely from `sessionStorage` to keep the contract stateless and testable in isolation.
- Fallback to `single` is always safe — single mode is the baseline feature set.
- `dual-secondary` hiding the export button is a UX decision: only one file per collaboration should
  exist, owned by the main reviewer, to prevent conflicting exports.
- Kappa analysis is gated on both reviewers completing to avoid presenting misleading statistics
  on partial data.
- No new HTML elements are added by this contract — all gating is CSS `display` toggling on
  existing IDs, keeping the DOM stable for any future tests.

## 2026-03-13 Task 10: V2 Canonical Record + Importer/Normalizer Interfaces

- Chose strict V2-local CommonJS modules under `V2.0/src/importer` and `V2.0/src/normalizer` to keep runtime isolated from legacy root code.
- Defined authoritative source-family registry for current scope only: `ris`, `csv`, `bibtex`, `enw`, `rdf`, `txt`.
- Standardized importer boundary: parser outputs are wrapped as raw records with `_source_family`, `_source_file`, `_source_record_index`, and no domain logic.
- Versioned canonical model at `2.0.0` with fixed required fields and reserved underscore metadata from `ARCHITECTURE_CONTRACT.md`.
- Locked normalization to deterministic field-map contracts per family so parser quirks stay in importer/normalizer boundaries and never leak into UI shell.

## 2026-03-13 Task 8 Implementation: Runtime Mode Gating in `app.js`

- Implemented explicit runtime mode detection from `sessionStorage.prisma_user_session` with strict validation and safe fallback to `single`.
- Applied mode gating at `init()` entry via `applyModeGating(runtimeMode)` to hide/show only contract-specified collaboration UI/actions.
- Added role-based action guardrails so only `dual-main` can export collaboration project and open disagreement resolution.
- Bound project persistence scope to login session by preferring `runtimeSession.projectId` inside `ensureProjectId()` and `startNewProjectSession()`.

## 2026-03-13 Task 14: V2 Explainable Deterministic Dedup Engine

- Added a V2-local dedup contract at `V2.0/src/dedup/index.js` with a single UI-agnostic entrypoint: `deduplicateCanonicalRecords(records, options?)`.
- Locked deterministic rule order to `doi_exact` first, then `normalized_title_year` for DOI-missing records only.
- Enforced ambiguous-title safety boundary: title-only collisions (missing year) and same-title different-year records are not auto-merged.
- Standardized UI-ready reason hooks in `links[]` as `{ reason: { code, hook, summary, evidence } }` so future workbench UI can render explanations without embedding logic.
- Implemented explicit winner tie-break policy per duplicate group: metadata completeness score, optional source priority, lexical source file, lexical id.

## 2026-03-13 Task 11: V2 i18n Infrastructure Implementation

### Deliverables

1. **Locale JSON Files:**
   - Created `V2.0/src/locales/en-US.json`: 80+ keys covering shell UI + framework-agnostic pipeline placeholders
   - Created `V2.0/src/locales/zh-CN.json`: Mirror structure with Simplified Chinese and full-width punctuation (，。！？)
   - Keys include: brand, dashboard, projects, workspace, buttons, validation, status, menu, help, footer

2. **Refactored Locale System (`V2.0/src/locales/index.js`):**
   - **JSON Loader:** Async `loadLocales()` fetches en-US.json and zh-CN.json; fallback to inline defaults if fetch fails
   - **Persistence:** Saves locale preference to `localStorage` with key `comet_locale` (per UX spec 2.1)
   - **Auto-detect:** On first load, detects browser language via `navigator.language`, falls back to `en-US`
   - **Formatting Helpers** (framework-agnostic):
     - `formatDate(date)`: zh-CN → `YYYY-MM-DD`, en-US → `MMM DD, YYYY`
     - `formatNumber(num)`: Both → `10,000` with comma separators
     - `formatCurrency(amount)`: CNY for zh-CN, USD for en-US
     - `pluralize(count, singular, plural)`: Handles English plurals + Chinese classifiers
     - `tInterpolate(key, values)`: Translate with placeholder substitution
   - **Custom Event:** Dispatches `localeChanged` event on `window` for reactive components
   - **Full API:** `setLocale()`, `getLocale()`, `getLocaleFullCode()`, `t()`, `applyLocale()`, `initLocale()`

3. **Documentation:**
   - Created `V2.0/src/locales/KEYS.md`: Complete reference of 80+ keys, usage examples, extension pattern
   - Updated `V2.0/src/locales/README.md`: Structure, API reference, formatting helpers, usage in HTML + JS, extension guide

### Technical Decisions

- **JSON over inline:** Separates data (JSON) from logic (index.js), enabling non-developers to update strings without touching code
- **Async loading:** Graceful fallback if fetch fails; app remains fully functional
- **Short + full codes:** Internal API uses short codes (`en`/`zh`); formatter helpers use full codes (`en-US`/`zh-CN`) for `toLocaleString()` compatibility
- **localStorage key:** `comet_locale` per UX spec section 2.1; shared across all V2 projects on same device
- **Formatting helpers:** Locale-aware but framework-agnostic; integrate with any UI system without dependencies
- **Custom event:** Enables UI components to react to locale changes without polling or callback chains

### Integration with Shell (`V2.0/src/ui-shell/shell.js`)

- Updated `init()` to call `await initLocale()` (async startup)
- Added listener for `localeChanged` event → re-renders dashboard
- Updated `createNewProject()` to use `t('project_created')` instead of string concatenation
- Updated `renderDashboard()` to use `formatDate()` helper for locale-aware date display
- Updated `pluralize()` usage for record counts (en: "5 records", zh: "5条记录")

### Unblocks Tasks

- **Task 15:** Dashboard module can now use all formatting helpers for dates, numbers, status displays
- **Task 16:** Screening module can translate all UI strings + format numbers/dates in results
- **Task 17:** Results export can format dates/numbers per locale + provide localized headers
- **Task 20:** Project collaboration UI can display locale-aware timestamps and user-facing copy

### Constraints Met

✅ Scope: zh-CN and en-US only (no extra locales)  
✅ UX spec 2.1: localStorage key `comet_locale`, browser auto-detect, en-US fallback  
✅ UX spec 2.3: Dates (YYYY-MM-DD vs MMM DD, YYYY), numbers (10,000), full-width Chinese punctuation  
✅ Design system: Typography rules embedded in JSON string descriptors, not CSS (CSS handles via locale-aware font-family)  
✅ Framework-agnostic: Pure ES6 modules, no external dependencies, integrates with any UI stack  
✅ No raw strings in shell components: All UI copy uses `t()` or `data-i18n` attributes  

### Code Quality

- ✅ No TypeScript errors (lsp_diagnostics clean on index.js and shell.js)
- ✅ JSON files validated as proper JSON
- ✅ Backward compatible: Existing `t()`, `getLocale()`, `setLocale()` API unchanged
- ✅ New functions non-breaking: All helpers are new exports, no modifications to existing signatures

## 2026-03-13 Task 15: V2 Screening Decision Store + Explicit Workflow State Machine

- Implemented `V2.0/src/decisions/index.js` as the single source of truth for workflow state and screening decisions.
- Locked deterministic workflow states to explicit domain steps: `import -> dedup_review -> screening -> fulltext_review -> export_ready`.
- Enforced transitions through a static `WORKFLOW_TRANSITIONS` map with typed errors on illegal jumps (no implicit state mutation).
- Required audit metadata (`actor`, `at`) on every transition and every decision write to guarantee traceable decision history.
- Added append-only sequence-numbered audit events (`workflow_transition`, `screening_decision`) for replay/debug/export foundations.
- Added stage-safe decision guards so `screening` decisions are accepted only in screening state and `fulltext` decisions only in fulltext state.
- Added snapshot + summary helpers (`createDecisionSnapshot`, `summarizeDecisions`) so downstream exporter/report modules can consume state without UI coupling.

## 2026-03-13 Task 18: V2 Reporting and Export Foundation

- Created `V2.0/src/exporter/export-schema.js` as the single source of all key/constant definitions for export artifacts; no logic, pure data.
- Created `V2.0/src/exporter/index.js` with five pure, UI-agnostic shaping functions: `shapeIncludedStudies`, `shapeExcludedStudies`, `shapeDecisionLog`, `shapeProjectSummary`, `shapeExportArtifact`.
- Decision: keep exporter functions pure (no class instances, no shared state) so they can be called independently or composed without initialization overhead.
- Decision: `shapeExportArtifact` accepts optional `projectMeta` rather than requiring it, so callers without a project context can still produce valid artifacts.
- Decision: `exclusionReasonCounts` aggregates across both `screening` and `fulltext` stages in a single map; downstream PRISMA UI can split by stage using `shapeExcludedStudies` if needed.
- Decision: `schemaVersion` is a hard-coded constant (`EXPORT_SCHEMA_VERSION = '2.0.0'`) rather than derived at runtime; version bumps are explicit code changes.
- Locked contract with 28 `node:test` tests in `exporter.contract.test.js`; evidence captured to `.sisyphus/evidence/task-18-export-integrity.txt`.
