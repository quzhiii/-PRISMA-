# PRISMA Audit-ready Workspace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不重写现有 V2.1 静态前端的前提下，把项目升级为 local-first、audit-ready、Chinese-source compatible、conservative AI-assisted 的系统综述工作台。

**Architecture:** 保留 GitHub Pages 既有 `literature-screening-v2.0/` 路径和当前六步工作流。先用独立纯 JS 模块建立审计、决策和导出数据模型，再逐步挂接到 `app.js` 的导入、去重、规则筛选、全文复核、质量评价和导出节点。IndexedDB 继续由 `db-worker.js` 负责，本地状态继续由项目级 localStorage 快照兜底。

**Tech Stack:** 静态 HTML/CSS/JavaScript、Web Worker、IndexedDB、UMD-style browser/Node 双用模块、Node.js `node:test` 回归测试。

---

## 0. 当前基线

### 已确认事实

- 主体工作区位于 `literature-screening-v2.0/`，公开路径必须保留。
- 根目录仍保留旧入口和共享 `dedup-engine.js`，不要在第一轮删除或迁移。
- 当前没有 `package.json`，测试直接通过 Node 运行。
- 现有测试入口是 `tests/run-all-regressions.js`。
- 沙箱内运行 Node test 会触发 `spawn EPERM`，沙箱外运行通过。
- 当前测试基线：`node tests\run-all-regressions.js`，50 tests passed。
- `docs/plans/2026-04-25-v2-2-prioritized-roadmap.md` 原本建议先做导入稳定性；今天两份新文档把战略优先级明确调整为审计优先。

### 总体原则

- 不推倒重写。
- 不破坏 `literature-screening-v2.0/` 的 GitHub Pages 路径。
- AI 只做建议，不自动排除文献。
- 不伪造摘要、引用、DOI、全文信息或缺失字段。
- 不把疑似重复静默删除。
- 不只做 UI，必须同步数据模型、导出和测试。
- 所有 PRISMA 数字最终必须能从 decision/audit 数据重算。

---

## 1. 推荐版本节奏

| 版本 | 时间 | 目标 | 主要交付 |
|---|---:|---|---|
| V2.2-audit-0 | 0.5-1 天 | 当前仓库体检 | `docs/agent-audit/current-state-audit.md` |
| V2.2-alpha | 3-5 天 | 审计核心模型 | `audit-engine.js`、IndexedDB stores、纯函数测试 |
| V2.2-beta | 3-5 天 | 审计挂接工作流 | 导入、去重、规则筛选、全文复核、质量评价、导出事件 |
| V2.2 | 2-3 天 | 审计包导出 | manifest、events.jsonl、decisions CSV、counts、summary |
| V2.3-alpha | 3-5 天 | PRISMA-trAIce 数据模型 | AI mode、AI registry、AI suggestion log、mock pathway |
| V2.3 | 3-5 天 | PRISMA-trAIce 报告 | `PRISMA_TRAICE_REPORT.md`、No AI/Assistive AI 测试 |
| V2.4 | 2-3 周 | 质量评价与证据表正式化 | 模板、evidence table、CSV 导出 |
| V2.5 | 2-3 周 | 双人复核闭环 | reviewer decision isolation、conflict queue、kappa/export |
| V2.6 | 3-4 周 | Conservative AI screening | provider abstraction、prompt registry、建议和排序 |
| V3.0 | 6-12 个月 | 发布、商业化、论文准备 | landing、demo、benchmark、JOSS skeleton |

---

## 2. Milestone 0: 当前仓库体检

**Files:**
- Create: `docs/agent-audit/current-state-audit.md`
- Read: `README.md`
- Read: `README_EN.md`
- Read: `literature-screening-v2.0/workspace.html`
- Read: `literature-screening-v2.0/app.js`
- Read: `literature-screening-v2.0/db-worker.js`
- Read: `literature-screening-v2.0/parser-worker.js`
- Read: `literature-screening-v2.0/streaming-parser.js`
- Read: `literature-screening-v2.0/quality-engine.js`
- Read: `literature-screening-v2.0/import-job-runtime.js`
- Read: `dedup-engine.js`
- Read: `tests/run-all-regressions.js`

**Step 1: 创建审计目录**

Run:

```powershell
New-Item -ItemType Directory -Force -Path docs\agent-audit
```

Expected: `docs/agent-audit` exists.

**Step 2: 梳理仓库结构**

记录以下内容：

- 根目录入口和历史版本目录。
- `literature-screening-v2.0/` 的页面、样式、业务 JS、worker 和引擎模块。
- `tests/` 下 dedup、import、quality 三类测试。
- `docs/benchmarks/` 与 `docs/plans/` 下既有文档。

**Step 3: 梳理当前工作流**

写入 `current-state-audit.md`：

```md
## 2. Current Product Workflow

Step 1 Import
Step 2 Criteria
Step 3 Screening
Step 4 Full-text Review
Step 5 Quality Assessment
Step 6 Export
```

**Step 4: 梳理当前数据结构**

至少覆盖：

- 文献记录：`uploadedData`、IndexedDB `records` store。
- 去重结果：`screeningResults.duplicates`、`screeningResults.candidateDuplicates`。
- 筛选结果：`screeningResults.included/excluded/counts`。
- 人工复核：`record.fulltextDecision`、`record.exclusionReason`、`dualReviewResults`。
- 质量评价：`qualityAssessments`、IndexedDB `quality_assessments` store。
- 导入任务：`importJobs`、IndexedDB `import_jobs` store。
- 导出：`downloadFile()`、`downloadAllFiles()`、`generateReport()`、`generatePRISMASVG()`。

**Step 5: 运行现有测试**

Run:

```powershell
node tests\run-all-regressions.js
```

Expected: `# pass 50` when allowed to run outside the sandbox.

**Step 6: 输出风险清单**

必须列出：

- `app.js` 职责过重。
- 审计日志缺失。
- PRISMA counts 目前依赖运行态结果，不是从持久化 decisions 重算。
- 双人复核已有基础，但 reviewer final decision 和冲突解决仍不够正式。
- 质量评价有入口，但缺正式模板和 evidence table。
- AI 没有 usage registry 和 suggestion log。

**Step 7: Commit**

```powershell
git add docs\agent-audit\current-state-audit.md
git commit -m "docs(audit): add current state repository audit"
```

---

## 3. Milestone 1: V2.2 审计核心模型

**Files:**
- Create: `literature-screening-v2.0/audit-engine.js`
- Modify: `literature-screening-v2.0/workspace.html`
- Modify: `literature-screening-v2.0/db-worker.js`
- Create: `tests/audit/audit-engine.test.mjs`

### Task 1: 新增纯 JS audit engine

**Step 1: 写失败测试**

Create `tests/audit/audit-engine.test.mjs` with tests for:

- `createProjectManifest()`
- `createAuditEvent()`
- `appendAuditEvent()`
- `getAuditTrail(recordId)`
- `createScreeningDecision()`
- `calculatePrismaCountsFromDecisions()`
- `serializeEventsJsonl()`

Run:

```powershell
node --test tests\audit\audit-engine.test.mjs
```

Expected: FAIL because module does not exist.

**Step 2: 实现 `audit-engine.js`**

Use UMD pattern matching `quality-engine.js` and `import-job-runtime.js`.

Required public API:

```js
{
  AUDIT_SCHEMA_VERSION,
  EXCLUSION_REASONS,
  createProjectManifest,
  createAuditEvent,
  appendAuditEvent,
  getAuditTrail,
  createScreeningDecision,
  updateScreeningDecision,
  calculatePrismaCountsFromDecisions,
  summarizeAuditEvents,
  serializeEventsJsonl,
  serializeScreeningDecisionsCsv,
  serializeExclusionReasonsCsv,
  buildAuditSummaryMarkdown
}
```

Required taxonomy:

```js
const EXCLUSION_REASONS = Object.freeze([
  'wrong_population',
  'wrong_intervention_or_exposure',
  'wrong_comparator',
  'wrong_outcome',
  'wrong_study_design',
  'non_empirical',
  'duplicate',
  'not_full_text_available',
  'non_target_language',
  'outside_year_range',
  'protocol_only',
  'review_article',
  'conference_abstract_only',
  'other'
]);
```

**Step 3: 运行测试**

Run:

```powershell
node --test tests\audit\audit-engine.test.mjs
```

Expected: PASS.

### Task 2: 加载 audit engine

**Step 1: 修改 workspace script**

Modify `literature-screening-v2.0/workspace.html` near existing scripts:

```html
<script src="audit-engine.js?v=20260427-v22-audit"></script>
```

Place it before `app.js`.

**Step 2: 加 smoke test**

Update or create a test that confirms `workspace.html` references `audit-engine.js`.

Run:

```powershell
node --test tests\audit\audit-engine.test.mjs
```

Expected: PASS.

### Task 3: IndexedDB stores

**Step 1: 修改 `db-worker.js` schema**

Modify:

- `VERSION` from `2` to `3`.
- Add stores:
  - `project_manifest`
  - `audit_events`
  - `screening_decisions`

Indexes:

- `audit_events`: `projectId`, `recordId`, `eventType`, `timestamp`
- `screening_decisions`: `projectId`, `recordId`, `stage`, `reviewerId`

**Step 2: Add worker messages**

Add message handlers:

- `UPSERT_PROJECT_MANIFEST`
- `GET_PROJECT_MANIFEST`
- `APPEND_AUDIT_EVENTS`
- `GET_AUDIT_TRAIL`
- `GET_ALL_AUDIT_EVENTS`
- `UPSERT_SCREENING_DECISIONS`
- `GET_SCREENING_DECISIONS`
- `CLEAR_AUDIT_DATA`

**Step 3: Add tests**

If IndexedDB is not available in Node, keep `db-worker.js` integration covered by browser smoke later and unit-test the pure builders now. Do not add a fragile Node fake IndexedDB dependency unless the repo introduces dependency management.

**Step 4: Commit**

```powershell
git add literature-screening-v2.0\audit-engine.js literature-screening-v2.0\workspace.html literature-screening-v2.0\db-worker.js tests\audit\audit-engine.test.mjs
git commit -m "feat(audit): add audit model and persistence stores"
```

---

## 4. Milestone 2: V2.2 工作流审计挂接

**Files:**
- Modify: `literature-screening-v2.0/app.js`
- Modify: `tests/audit/audit-engine.test.mjs`
- Create: `tests/audit/audit-workflow.test.mjs`

### Task 1: 初始化 manifest

**Step 1: 在 `app.js` 接入 engine**

Near current constants:

```js
const AUDIT_ENGINE = typeof globalThis !== 'undefined' ? globalThis.AuditEngine || null : null;
```

Add in-memory state:

```js
let projectManifest = null;
let auditEvents = [];
let screeningDecisions = [];
```

**Step 2: 在 project lifecycle 初始化**

Touch:

- `generateProjectId()`
- `ensureProjectId()`
- `startNewProjectSession()`
- `persistCurrentProjectState()`
- `restoreProjectState(snapshot)`
- `loadCurrentProjectStateFromLocalStorage()`

Manifest default:

```js
{
  projectId: currentProjectId,
  projectName: 'Untitled systematic review',
  reviewType: 'systematic_review',
  prismaVersion: 'PRISMA_2020',
  aiMode: 'off',
  dataSources: [],
  reviewers: [],
  settings: {},
  schemaVersion: 'audit.v1'
}
```

**Step 3: Add helper wrappers**

Add these thin wrappers in `app.js`:

- `appendAuditEventSafe(eventInput)`
- `appendAuditEventsSafe(eventInputs)`
- `upsertScreeningDecisionSafe(decisionInput)`
- `persistAuditState()`
- `restoreAuditState(snapshot)`

These wrappers must not throw into user workflows. They should log warning and allow current V2.1 behavior to continue.

### Task 2: 导入事件

**Step 1: Hook import success**

Touch:

- `handleImportFiles(files)`
- `finalizeImportOutcome(...)`

For each imported record, append an event:

```js
{
  eventType: 'record_imported',
  recordId,
  source: 'system',
  after: {
    title,
    identifier,
    sourceFile,
    sourceDatabase,
    parserFormat
  },
  metadata: {
    fileName,
    parserMode,
    sourceAbstractTruncated
  }
}
```

Batch append in chunks of 500 for large imports.

**Step 2: Add test**

In `tests/audit/audit-workflow.test.mjs`, simulate three parsed records and assert:

- three `record_imported` events exist.
- `getAuditTrail(recordId)` returns the import event.

### Task 3: 去重事件

**Step 1: Hook dedup**

Touch:

- `runDedupForScreening(data)`
- `flattenCandidateDuplicatesForExport(candidateDuplicates)`

Events:

- hard duplicate auto-removal: `dedup_auto_removed`
- candidate duplicate surfaced: `dedup_candidate_flagged`
- user duplicate resolution later: `dedup_candidate_resolved`

Reason must include dedup evidence:

```js
{
  reason: 'duplicate',
  metadata: {
    reasonCode,
    similarity,
    leftRecordId,
    rightRecordId,
    autoResolved
  }
}
```

### Task 4: 规则筛选事件和 decisions

**Step 1: Hook rule screening**

Touch:

- `startScreening()`
- `performScreening(data, rules)`

For every retained/excluded record, upsert a `ScreeningDecision`:

```js
{
  recordId,
  stage: 'title_abstract',
  decision: 'include' | 'exclude',
  exclusionReason,
  reviewerId: 'system_rule',
  source: 'rule',
  notes
}
```

Append `rule_screen_decision` events with before/after.

**Step 2: Test PRISMA counts**

Add tests for `calculatePrismaCountsFromDecisions(decisions)`:

- imported count
- duplicate removed count
- title/abstract excluded count
- full-text assessed count
- full-text excluded count
- included count

### Task 5: 人工复核与排除理由事件

**Step 1: Hook draft/full-text decision changes**

Touch:

- `setManualReviewDraftDecision(idx, decision)`
- `finalizeFulltextReview()`
- `setDefaultExclusion(reason)`
- `batchExclude()`
- `addExclusionReason(reasonName, description)`
- `setExclusionReasonsTemplate(...)`

Events:

- `manual_review_decision_changed`
- `full_text_decision_finalized`
- `exclusion_reason_changed`
- `exclusion_taxonomy_changed`

ScreeningDecision stage:

- `full_text`

### Task 6: 质量评价事件

**Step 1: Hook quality queue**

Touch:

- `prepareQualityAssessmentShell(options)`
- `autoIdentifyStudyDesigns()`

Events:

- `quality_queue_prepared`
- `study_design_suggested`
- `quality_assessment_changed`

Important: study-design suggestions are rule/system suggestions, not final human decisions.

### Task 7: 导出事件

**Step 1: Hook exports**

Touch:

- `downloadFile(type)`
- `downloadAllFiles()`
- `generateReport(results)`
- `generatePRISMASVG(counts, theme, mode)`

Events:

- `export_generated`

Metadata:

```js
{
  exportType,
  prismaMode,
  countSource: 'screening_decisions' | 'legacy_screening_results',
  includedCount,
  excludedCount
}
```

### Task 8: Full regression

Run:

```powershell
node tests\run-all-regressions.js
node --test tests\audit\audit-engine.test.mjs tests\audit\audit-workflow.test.mjs
```

Expected: all tests PASS.

### Task 9: Commit

```powershell
git add literature-screening-v2.0\app.js tests\audit
git commit -m "feat(audit): record workflow decisions and event trails"
```

---

## 5. Milestone 3: V2.2 审计导出包

**Files:**
- Modify: `literature-screening-v2.0/app.js`
- Modify: `literature-screening-v2.0/audit-engine.js`
- Modify: `literature-screening-v2.0/workspace.html`
- Create: `tests/audit/audit-export.test.mjs`

### Task 1: Export builders

Add or finalize pure builders in `audit-engine.js`:

- `buildProjectManifestExport(manifest)`
- `serializeEventsJsonl(events)`
- `serializeScreeningDecisionsCsv(decisions)`
- `serializeExclusionReasonsCsv(decisions, taxonomy)`
- `buildPrismaCountsJson(decisions, events)`
- `buildAuditSummaryMarkdown(manifest, events, decisions)`

### Task 2: UI export buttons

In Step 6 of `workspace.html`, add an audit export section:

- `project_manifest.json`
- `events.jsonl`
- `screening_decisions.csv`
- `exclusion_reasons.csv`
- `prisma_counts.json`
- `audit_summary.md`

Avoid redesign. Keep it as a plain export group.

### Task 3: Download integration

Modify `downloadFile(type)` to support:

- `audit_manifest`
- `audit_events`
- `screening_decisions`
- `exclusion_reasons`
- `prisma_counts`
- `audit_summary`

Modify `downloadAllFiles()` so audit exports are included after existing PRISMA/report outputs.

### Task 4: Tests

Create `tests/audit/audit-export.test.mjs`:

- JSONL has one JSON object per line.
- CSV escaping handles commas, quotes, Chinese text and blank values.
- `prisma_counts.json` can be rebuilt from decisions.
- `audit_summary.md` includes schema version, event counts and unresolved risks.

Run:

```powershell
node --test tests\audit\audit-export.test.mjs
node tests\run-all-regressions.js
```

Expected: PASS.

### Task 5: Docs

Modify:

- `README.md`
- `README_EN.md`

Add V2.2 notes:

- local-first audit log.
- PRISMA counts can be recomputed.
- AI remains off by default.
- audit exports are generated locally.

### Task 6: Commit

```powershell
git add literature-screening-v2.0\app.js literature-screening-v2.0\audit-engine.js literature-screening-v2.0\workspace.html tests\audit README.md README_EN.md
git commit -m "feat(audit): export audit-ready PRISMA package"
```

---

## 6. Milestone 4: V2.3 PRISMA-trAIce 支持

**Files:**
- Create: `literature-screening-v2.0/ai-usage-engine.js`
- Modify: `literature-screening-v2.0/audit-engine.js`
- Modify: `literature-screening-v2.0/app.js`
- Modify: `literature-screening-v2.0/workspace.html`
- Modify: `literature-screening-v2.0/db-worker.js`
- Create: `tests/ai/ai-usage-engine.test.mjs`
- Create: `tests/ai/prisma-traice-report.test.mjs`

### Scope

This milestone does not connect real AI providers.

Implement:

- `aiMode`: `off | assistive | experimental`
- default `off`
- `AIUsageRegistry`
- `AISuggestionEvent`
- mock suggestion pathway
- human confirmation required
- `PRISMA_TRAICE_REPORT.md`

### Required rules

- AI suggestions never write final `ScreeningDecision` directly.
- AI suggestion acceptance creates a human decision event.
- No AI mode must run every existing workflow and export a report that states AI was not used.
- AI output must record input hash and prompt hash, not raw sensitive full text by default.

### Tests

Run:

```powershell
node --test tests\ai\ai-usage-engine.test.mjs tests\ai\prisma-traice-report.test.mjs
node tests\run-all-regressions.js
```

Expected: PASS.

---

## 7. Milestone 5: V2.4 质量评价与证据表正式化

**Files:**
- Modify: `literature-screening-v2.0/quality-engine.js`
- Modify: `literature-screening-v2.0/app.js`
- Modify: `literature-screening-v2.0/workspace.html`
- Create: `literature-screening-v2.0/quality-templates.js`
- Create: `literature-screening-v2.0/evidence-table-engine.js`
- Create: `tests/quality/quality-templates.test.mjs`
- Create: `tests/quality/evidence-table.test.mjs`

### Scope

Deliver formal baseline forms before adding more UI polish.

Implement:

- manual confirmed `studyDesign`
- RoB 2 baseline
- ROBINS-I baseline
- NOS baseline
- AMSTAR 2 baseline
- GRADE baseline
- evidence table editor data model
- exports:
  - `quality_appraisal.csv`
  - `evidence_table.csv`
  - `grade_summary.csv`

### Audit requirements

Every quality appraisal save must append:

- `quality_assessment_changed`
- before/after
- reviewerId
- rationale/notes

---

## 8. Milestone 6: V2.5 双人复核与冲突解决

**Files:**
- Modify: `literature-screening-v2.0/app.js`
- Modify: `literature-screening-v2.0/workspace.html`
- Create: `literature-screening-v2.0/review-collaboration-engine.js`
- Create: `tests/review/review-collaboration.test.mjs`

### Scope

Upgrade current dual-review behavior into formal team review workflow.

Implement:

- roles: `owner | reviewer_1 | reviewer_2 | resolver | viewer`
- separate decisions per reviewer
- conflict detection
- conflict queue
- resolver final decision
- resolution reason
- Cohen's kappa
- percent agreement
- conflict export

### Hard gate

Final PRISMA export should warn or block when unresolved conflicts exist, depending on project settings.

---

## 9. Milestone 7: V2.6 Conservative AI Screening

**Files:**
- Modify: `literature-screening-v2.0/ai-usage-engine.js`
- Create: `literature-screening-v2.0/ai-provider-engine.js`
- Create: `literature-screening-v2.0/prompt-template-registry.js`
- Modify: `literature-screening-v2.0/app.js`
- Create: `tests/ai/ai-provider-engine.test.mjs`
- Create: `tests/ai/conservative-screening.test.mjs`

### Scope

Add real provider abstraction only after V2.2 and V2.3 are stable.

Implement:

- OpenAI-compatible config shape.
- Claude/Gemini-compatible placeholders.
- local model placeholder.
- prompt template registry.
- title/abstract screening suggestion.
- exclusion reason suggestion.
- study design suggestion.
- PICO extraction suggestion.
- prioritization/ranking.
- token/cost metadata.

### Non-negotiable

AI output only creates `AISuggestionEvent`. Final PRISMA counts change only after human confirmation writes `ScreeningDecision`.

---

## 10. Cross-cutting Test Matrix

Run before every merge:

```powershell
node tests\run-all-regressions.js
```

Run by changed area:

```powershell
node --test tests\audit\*.mjs
node --test tests\ai\*.mjs
node --test tests\quality\*.mjs
node --test tests\review\*.mjs
node --test tests\import\*.mjs
node --test tests\dedup\*.mjs
```

Manual browser smoke:

1. Open `literature-screening-v2.0/workspace.html`.
2. Load sample data.
3. Import one CSV/RIS/NBIB fixture.
4. Run rule screening.
5. Confirm full-text decisions.
6. Prepare quality queue.
7. Export all deliverables.
8. Confirm audit files are present and non-empty.
9. Refresh page and confirm audit trail persists.

---

## 11. Definition of Done for V2.2

V2.2 is done only when:

- `docs/agent-audit/current-state-audit.md` exists.
- `audit-engine.js` has unit coverage.
- IndexedDB schema includes audit stores.
- `record_imported`, `dedup_*`, `rule_screen_decision`, `full_text_decision_finalized`, `quality_*`, `export_generated` events are recorded.
- `getAuditTrail(recordId)` can trace at least import -> screening -> review/export for a record.
- `project_manifest.json`, `events.jsonl`, `screening_decisions.csv`, `exclusion_reasons.csv`, `prisma_counts.json`, `audit_summary.md` export locally.
- PRISMA counts can be recalculated from decisions/events.
- No existing V2.1 regression test fails.
- README and README_EN mention V2.2 audit-ready behavior.
- GitHub Pages path `literature-screening-v2.0/` remains valid.

---

## 12. Recommended First Patch

Start with Milestone 0, then land Milestone 1 as a small PR.

Do not start with AI UI. The first production-code patch should create the audit model and pure tests only:

```text
docs/agent-audit/current-state-audit.md
literature-screening-v2.0/audit-engine.js
tests/audit/audit-engine.test.mjs
literature-screening-v2.0/workspace.html
```

Only after that should `app.js` workflow hooks be added.
