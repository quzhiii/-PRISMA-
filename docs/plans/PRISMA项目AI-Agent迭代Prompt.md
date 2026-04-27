# 给 AI Agent 的完整执行 Prompt：迭代 PRISMA 文献筛选助手

你将接手 GitHub 仓库：

https://github.com/quzhiii/-PRISMA-

你的任务不是重写项目，而是在现有 V2.1 基础上，按阶段把它升级为：

> 一个本地优先、可审计、适配中文数据库、支持保守 AI 辅助的系统综述工作台。

英文定位：

> A local-first, audit-ready, Chinese-source compatible workspace for conservative AI-assisted systematic reviews.

---

## 0. 总原则

### 0.1 不要做的事

- 不要推倒重写。
- 不要破坏现有 GitHub Pages 路径。
- 不要让 AI 自动排除文献。
- 不要伪造摘要、引用、DOI 或全文信息。
- 不要为了加入 AI 功能牺牲本地优先和可审计性。
- 不要把疑似重复静默删除。
- 不要只做 UI 改动而不补数据模型和测试。

### 0.2 必须坚持的原则

- local-first：默认浏览器本地运行。
- audit-ready：关键操作必须有日志。
- conservative AI：AI 只建议，人类最终决定。
- Chinese-source compatibility：重点照顾 CNKI / 万方 / 维普 / NBIB / RIS / RDF 等真实导出问题。
- PRISMA 2020 compatible：导出结果必须能支持 PRISMA 2020 flow diagram。
- PRISMA-trAIce-ready：如果使用 AI，必须能说明 AI 在哪里被使用、如何被人工复核、有什么局限。

---

## 1. 先做仓库体检

请先完成以下检查，并输出 `docs/agent-audit/current-state-audit.md`：

1. 读取 README.md、README_EN.md。
2. 梳理当前页面入口、版本目录、核心 JS 文件和测试目录。
3. 找出当前数据结构：文献记录、去重结果、复核状态、质量评价状态、导出结构。
4. 运行现有测试。
5. 如果测试不可运行，记录原因，不要直接跳过。
6. 检查 GitHub Pages 路径是否依赖 `literature-screening-v2.0/`。
7. 梳理当前 V2.1 已实现能力与缺口。
8. 输出风险清单。

验收标准：

- `docs/agent-audit/current-state-audit.md` 存在。
- 文档必须包含：文件结构、功能路径、数据结构、测试状态、风险点、下一步建议。
- 不修改生产代码，除非只是修正文档路径或明显拼写问题。

---

## 2. 第一阶段：V2.2 Audit-ready 基础层

### 2.1 目标

建立项目级审计数据模型，让导入、去重、规则筛选、人工复核、排除理由、质量评价和导出都能留下可追溯记录。

### 2.2 新增数据结构

请设计并实现以下结构：

#### ProjectManifest

字段建议：

```js
{
  projectId,
  projectName,
  createdAt,
  updatedAt,
  reviewType,
  prismaVersion,
  aiMode,
  dataSources,
  reviewers,
  settings,
  schemaVersion
}
```

#### AuditEvent

字段建议：

```js
{
  eventId,
  timestamp,
  actorId,
  actorRole,
  eventType,
  recordId,
  before,
  after,
  reason,
  source,
  metadata
}
```

#### ScreeningDecision

字段建议：

```js
{
  recordId,
  stage,
  decision,
  exclusionReason,
  reviewerId,
  decidedAt,
  source,
  notes
}
```

### 2.3 实现任务

- [ ] 新增 `src` 或当前架构下合适的 `audit` 模块。
- [ ] 实现 `createAuditEvent()`。
- [ ] 实现 `appendAuditEvent()`。
- [ ] 实现 `getAuditTrail(recordId)`。
- [ ] 实现 `exportAuditLog()`.
- [ ] 导入文献时写入 audit event。
- [ ] 去重时写入 audit event。
- [ ] 规则筛选时写入 audit event。
- [ ] 人工复核时写入 audit event。
- [ ] 修改排除理由时写入 audit event。
- [ ] 导出 PRISMA 图时写入 audit event。
- [ ] 刷新页面后 audit event 不丢失。

### 2.4 排除理由体系

实现标准 exclusion reason taxonomy：

```js
const EXCLUSION_REASONS = [
  "wrong_population",
  "wrong_intervention_or_exposure",
  "wrong_comparator",
  "wrong_outcome",
  "wrong_study_design",
  "non_empirical",
  "duplicate",
  "not_full_text_available",
  "non_target_language",
  "outside_year_range",
  "protocol_only",
  "review_article",
  "conference_abstract_only",
  "other"
]
```

### 2.5 导出

新增导出：

- `project_manifest.json`
- `events.jsonl`
- `screening_decisions.csv`
- `exclusion_reasons.csv`
- `prisma_counts.json`
- `audit_summary.md`

### 2.6 测试

新增测试：

- 创建 audit event。
- 页面刷新后日志存在。
- 同一 record 的完整路径可回放。
- PRISMA counts 可从 decisions 反算。
- 修改排除理由后 before / after 正确记录。

### 2.7 V2.2 验收标准

- 任意文献的最终状态都能追溯到导入和筛选历史。
- 所有导出数字都可从决策数据和 event log 重算。
- 不影响现有 V2.1 基本功能。
- 所有新增测试通过。
- 更新 README 中的 V2.2 说明。

---

## 3. 第二阶段：V2.3 PRISMA-trAIce 支持

### 3.1 目标

支持 AI 使用透明报告。即使暂时不接真实模型，也要先设计 AI usage data model 和导出报告。

### 3.2 新增结构

#### AIUsageRegistry

```js
{
  tools: [
    {
      toolId,
      name,
      provider,
      version,
      purpose,
      enabled,
      humanReviewRequired
    }
  ]
}
```

#### AISuggestionEvent

```js
{
  suggestionId,
  recordId,
  task,
  model,
  provider,
  promptHash,
  inputHash,
  output,
  confidence,
  humanFinalDecision,
  accepted,
  timestamp,
  limitations
}
```

### 3.3 实现任务

- [ ] 增加 AI mode：`off | assistive | experimental`。
- [ ] 默认 `off`。
- [ ] 增加 AI usage registry UI 或配置入口。
- [ ] 增加 AI suggestion log 数据结构。
- [ ] 增加 mock AI suggestion pathway，用于测试。
- [ ] AI 建议必须进入人工确认。
- [ ] AI 建议不允许直接写入最终 decision。
- [ ] 新增 `PRISMA_TRAICE_REPORT.md` 导出。

### 3.4 PRISMA-trAIce 报告内容

报告至少包含：

- 本项目是否使用 AI。
- 使用了哪些 AI 工具。
- AI 用于哪些环节。
- 输入给 AI 的信息类型。
- 是否涉及全文或个人敏感信息。
- AI 输出如何被人工复核。
- AI 建议数量。
- AI 建议采纳率。
- AI 与人工最终决定冲突率。
- 已知局限。
- 未使用 AI 的环节。

### 3.5 测试

- No AI 模式可以完整运行。
- Assistive AI 模式下建议不会自动决策。
- PRISMA-trAIce 报告可以导出。
- AI suggestion log 与 audit log 关联正确。

---

## 4. 第三阶段：V2.4 质量评价与证据表正式化

### 4.1 目标

把当前质量评价队列升级为可正式使用的质量评价和证据提取模块。

### 4.2 任务

- [ ] 增加 study design 字段。
- [ ] 支持手动确认 study design。
- [ ] 增加 RoB 2 baseline template。
- [ ] 增加 ROBINS-I baseline template。
- [ ] 增加 NOS baseline template。
- [ ] 增加 AMSTAR 2 baseline template。
- [ ] 增加 GRADE baseline fields。
- [ ] 增加 evidence table editor。
- [ ] 支持导出 `quality_appraisal.csv`。
- [ ] 支持导出 `evidence_table.csv`。
- [ ] 支持导出 `grade_summary.csv`。

### 4.3 Evidence Table 字段

```js
{
  recordId,
  author,
  year,
  country,
  studyDesign,
  population,
  sampleSize,
  interventionOrExposure,
  comparator,
  outcomes,
  effectMeasure,
  keyFindings,
  riskOfBias,
  certaintyOfEvidence,
  notes
}
```

### 4.4 验收标准

- 纳入研究可以进入质量评价队列。
- 用户可以选择研究设计和对应评价模板。
- 数据提取表可以导出 CSV。
- 质量评价结果写入 audit log。

---

## 5. 第四阶段：V2.5 双人复核与冲突解决

### 5.1 目标

把双人模式升级为正式团队复核流程。

### 5.2 任务

- [ ] 明确 reviewer role：owner / reviewer_1 / reviewer_2 / resolver / viewer。
- [ ] 为 reviewer_1 和 reviewer_2 分别保存 decision。
- [ ] 增加 conflict detection。
- [ ] 增加 conflict queue。
- [ ] 增加 resolver final decision。
- [ ] 增加 resolution reason。
- [ ] 增加 Cohen’s kappa。
- [ ] 增加 percent agreement。
- [ ] 增加 conflict export。

### 5.3 验收标准

- 两个 reviewer 的判断不会互相覆盖。
- 冲突必须 resolution 后才能生成最终 PRISMA 导出。
- agreement metrics 可导出。
- 所有 resolver 操作写入 audit log。

---

## 6. 第五阶段：V2.6 Conservative AI Screening

### 6.1 目标

引入 AI 筛选建议和排序，但保持人类最终决定。

### 6.2 任务

- [ ] 增加 provider abstraction。
- [ ] 支持 OpenAI-compatible API 配置。
- [ ] 支持 Claude / Gemini-compatible placeholder。
- [ ] 支持 local model placeholder。
- [ ] 建立 prompt template registry。
- [ ] 实现 title/abstract screening suggestion。
- [ ] 实现 exclusion reason suggestion。
- [ ] 实现 study design suggestion。
- [ ] 实现 PICO extraction suggestion。
- [ ] 实现 ranking/prioritization。
- [ ] 记录 token/cost metadata。
- [ ] 所有 AI 输出写入 AI suggestion log。
- [ ] 用户确认后才写入 human decision。

### 6.3 验收标准

- AI 不会自动排除记录。
- 用户可以查看 AI reason 和 confidence。
- 用户可以接受、拒绝或改写 AI 建议。
- 所有 AI 建议可导出并进入 PRISMA-trAIce 报告。
- No AI 模式仍可完整运行。

---

## 7. 第六阶段：V3.0 发布与论文准备

### 7.1 产品发布任务

- [ ] 重写 README。
- [ ] 重写 README_EN。
- [ ] 新增 landing page。
- [ ] 新增 demo dataset。
- [ ] 新增 tutorial。
- [ ] 新增 benchmark report。
- [ ] 新增 screenshots。
- [ ] 新增 GIF demo。
- [ ] 新增 privacy statement。
- [ ] 新增 roadmap。
- [ ] 新增 contribution guide。
- [ ] 新增 citation file。

### 7.2 JOSS 准备任务

- [ ] 新增 `paper/paper.md`。
- [ ] 新增 `paper/paper.bib`。
- [ ] 新增 `CITATION.cff`。
- [ ] 新增 `codemeta.json`。
- [ ] 新增 `docs/statement-of-need.md`。
- [ ] 新增 `docs/usage-example.md`。
- [ ] 确保安装和运行说明可复现。
- [ ] 确保测试可运行。
- [ ] 确保 sample data 可运行完整 demo。

### 7.3 论文主张

项目贡献应写成：

1. A browser-based local-first systematic review screening workspace.
2. A conservative two-layer deduplication workflow.
3. Chinese literature source compatibility.
4. Audit-ready PRISMA 2020 export.
5. PRISMA-trAIce-ready AI usage reporting.
6. Human-in-the-loop conservative AI assistance.

---

## 8. 每次提交要求

每个 PR / commit 必须包含：

1. 修改摘要。
2. 影响范围。
3. 测试结果。
4. 是否影响旧数据。
5. 是否影响 GitHub Pages。
6. 是否影响导出格式。
7. 是否新增 audit event。
8. 是否需要 README 更新。

Commit message 采用：

```text
feat(audit): add project manifest and event log export
fix(dedup): improve cross-language candidate matching
docs(roadmap): add PRISMA-trAIce implementation plan
test(audit): add regression tests for decision replay
```

---

## 9. 优先执行顺序

请严格按以下顺序推进：

1. 仓库体检；
2. Audit-ready 数据模型；
3. Event log；
4. Exclusion reason taxonomy；
5. Audit export；
6. PRISMA counts 可重算；
7. PRISMA-trAIce 数据模型；
8. PRISMA-trAIce 报告导出；
9. 质量评价模板；
10. 双人冲突解决；
11. Conservative AI screening；
12. README / landing page / paper skeleton。

不要先做 AI UI。先做审计数据模型。

---

## 10. 本轮 agent 的第一个任务

请立即执行：

### Task 1：输出当前仓库体检报告

生成文件：

`docs/agent-audit/current-state-audit.md`

内容结构：

```md
# Current State Audit

## 1. Repository Structure

## 2. Current Product Workflow

## 3. Current Data Model

## 4. Current Import / Parsing Pipeline

## 5. Current Dedup Pipeline

## 6. Current Review Workflow

## 7. Current Export Workflow

## 8. Current Tests and Benchmark

## 9. Main Risks

## 10. Recommended First Patch
```

完成后不要直接大改代码。先根据体检报告提出 V2.2 的最小补丁方案。
