# PRISMA 文献筛选助手：项目评估、迭代目标与商业化路线图

> 版本：2026-04-27  
> 对象仓库：https://github.com/quzhiii/-PRISMA-  
> 当前判断：该项目已经从“PRISMA 流程图生成器”推进到“系统综述文献筛选工作台”的早期可用阶段。下一阶段的关键不是继续堆功能，而是把它升级为 **local-first + audit-ready + Chinese-source compatible + conservative AI-assisted systematic review workspace**。

---

## 1. 一句话定位

### 当前定位

面向系统综述、Meta 分析与证据整合项目的端到端文献筛选工作台，覆盖文献导入、去重、规则筛选、人工复核、质量评价 / 证据等级、PRISMA 2020 导出。

### 建议升级定位

**一个本地优先、可审计、适配中文数据库的 AI 辅助系统综述工作台。**

英文可表述为：

> A local-first, audit-ready, Chinese-source compatible workspace for conservative AI-assisted systematic reviews.

---

## 2. 外部趋势校对

### 2.1 PRISMA 2020 仍是基本盘

PRISMA 2020 的核心不是“画图”，而是完整报告系统综述为什么做、如何做、筛选了什么、排除了什么、最终纳入了什么。PRISMA 官方说明中，PRISMA 2020 包括 statement paper、checklist、expanded checklist、abstract checklist 和 flow diagram templates。

**对项目的要求：**

- 不能只输出 PRISMA flow diagram。
- 必须把筛选过程中的每一个数量、排除理由、阶段状态与审计记录绑定。
- 导出物应从“图”扩展为“PRISMA reporting package”。

### 2.2 PRISMA-trAIce 把 AI 透明报告变成新增变量

2025 年 JMIR AI 的 PRISMA-trAIce checklist 明确强调，当 AI 被用于系统综述时，需要记录 AI 工具、AI 参与环节、人机交互、性能评估、局限性和透明性。其核心不是鼓励 AI 自动替代研究者，而是让 AI 介入过程可以被报告、被复核、被评价。

**对项目的要求：**

- 每一次 AI 建议都应被记录：模型、时间、输入摘要、输出建议、置信度、使用者是否采纳、最终人工决定。
- AI 不应默认自动排除文献。
- 应单独导出 `AI_USE_LOG.md` 或 `PRISMA_TRAICE_REPORT.md`。
- 应提供“未使用 AI”与“使用 AI 辅助”两种导出模式。

### 2.3 GenAI + PRISMA 的主流风险：幻觉、不可复现、偏差放大

2026 年 L-PRISMA 相关研究指出，GenAI 可以提高筛选和提取效率，但会挑战 PRISMA 的透明性、可复现性和可审计性；其缓解路径是 human-led synthesis + deterministic / statistical pre-screening。

**对项目的要求：**

- 项目应坚持“Conservative AI”：AI 只建议，不做最终裁决。
- 系统应把规则筛选、统计预筛、LLM 建议和人工决策区分存储。
- 所有 LLM 输出必须有可追溯来源，不允许生成未提供的摘要、引文或结论。
- 对中文数据库导出中已经截断的摘要，只能标记，不应补全或伪造。

### 2.4 ASReview 的启发：active learning 是重要方向，但不是你现在的第一优先级

ASReview LAB 是开源 AI-assisted systematic review 的核心参照，重点是 active learning，通过人工标注少量记录后让模型优先推送更可能相关的记录。它适合大规模 title/abstract screening。

**对项目的启发：**

- 后续可加入 active learning / prioritization，但不应在当前阶段过早追求“自动化率”。
- 更适合先建立 “audit-ready data model + conservative review workflow”。
- active learning 应被设计成 `prioritization`，而不是 `auto-exclusion`。

### 2.5 prismAId 的启发：开源系统综述 AI 工具可以发表软件论文

prismAId 于 2025 年发表 JOSS 软件论文，定位是 open-source / open-science AI for information extraction in systematic reviews。它证明了系统综述 AI 工具可以走 JOSS、JMIR AI 或方法学期刊路线。

**对项目的启发：**

- 你的项目可以准备 JOSS-style 软件论文。
- 需要补齐：statement of need、installation、usage example、sample dataset、tests、citation、license、contribution guide。
- 如果要投 JMIR AI 或 Systematic Reviews，需要补用户研究或方法学验证。

### 2.6 商业竞品方向：Rayyan / Covidence / DistillerSR 都在做一体化

Rayyan 已提供 AI-powered systematic review management、PRISMA diagram、PICO extraction 等功能。Covidence 强在团队协作、数据提取、质量评价和机构订阅。DistillerSR 强在企业级 evidence synthesis、表单、AI 排序和复用。

**对项目的影响：**

| 竞品 | 强项 | 你的可避开正面竞争的位置 |
|---|---|---|
| Rayyan | 轻量、协作、PRISMA、AI 辅助筛选 | 中文源兼容、本地优先、开源透明 |
| Covidence | 机构级协作、数据提取、质量评价 | 面向个人/小团队/中文医学科研的低成本工作流 |
| DistillerSR | 企业级 evidence platform | 不做重企业平台，先做 local-first + audit-ready |
| ASReview | Active learning 筛选 | 不急于比模型，先比审计、中文源、导出完整性 |
| prismAId | AI 信息抽取、开源软件论文 | 你可强调端到端 screening + PRISMA-trAIce audit |

---

## 3. 当前仓库进度评估

### 3.1 已经完成的有效进展

从当前 README 和代码结构看，项目已具备以下基础：

1. **工作流已成型**  
   从导入、去重、规则筛选、人工复核，到质量评价 / 证据等级，再到 PRISMA 2020 导出，已经形成 6 步工作流。

2. **本地优先定位明确**  
   默认在浏览器本地运行，数据不离开当前设备。这对医学、政策、毕业论文、未发表研究尤其重要。

3. **多格式导入具备实用性**  
   已支持 `CSV / TSV / RIS / ENW / BibTeX / RDF / TXT / NBIB`，并对部分格式采用 Worker 增量解析。

4. **保守去重路线正确**  
   当前双层去重模型区分“硬重复自动移除”和“疑似重复人工复核”，符合系统综述中的审慎原则。

5. **已有 benchmark 意识**  
   去重 benchmark 显示，当前 dedup-vnext 在 combined provisional benchmark 中 duplicate-like recall 从 0.583 提升到 0.917，Candidate F1 从 0.737 提升到 0.957，且 auto precision 保持 1.000。

6. **中文数据库问题已有初步处理**  
   对 CNKI RDF 摘要尾部噪音和截断摘要做了标记与清理，这正是海外竞品不容易覆盖的场景。

7. **质量评价 / 证据等级进入主流程**  
   虽然还处于 baseline 层面，但方向正确，说明项目正在从“筛文献”走向“证据综合工作台”。

### 3.2 当前主要短板

| 短板 | 严重性 | 影响 |
|---|---:|---|
| PRISMA-trAIce 尚未成为显式模块 | 高 | 无法形成 AI-assisted systematic review 的差异化 |
| AI 使用日志 / 人机决策链缺失 | 高 | 后续若接 AI，无法解释、无法发表、无法合规 |
| 质量评价仍偏“建议入口” | 高 | 还不能替代正式 RoB / NOS / AMSTAR / GRADE 表单 |
| 数据提取模块不足 | 中高 | 与 Covidence / DistillerSR 的正式 review workflow 仍有差距 |
| 双人复核缺少冲突解决闭环 | 中高 | 难以进入正式团队综述 |
| active learning / ranking 暂未形成 | 中 | 大规模筛选效率提升仍有限 |
| benchmark 数据集数量不足 | 中 | 论文与商业宣传证据不够 |
| README / landing page 仍偏工程说明 | 中 | 小红书和科研用户转化效率有限 |
| 项目名 `-PRISMA-` 不利于长期品牌 | 中 | GitHub URL 和品牌传播都不够稳定 |

---

## 4. 项目后续总目标

### 4.1 6 个月产品目标

把项目从“PRISMA 文献筛选助手 V2.1”升级为：

> **PrismaTrace / EvidenceFlow：一个适配中文数据库的可审计系统综述工作台。**

核心交付：

- PRISMA 2020 flow diagram + details export；
- PRISMA-trAIce AI usage report；
- 双人筛选 + 冲突解决；
- exclusion reason taxonomy；
- quality appraisal templates；
- local-first project package；
- sample dataset + benchmark；
- 小红书 / GitHub landing page；
- JOSS-ready paper skeleton。

### 4.2 12 个月商业目标

形成 freemium / open-core 商业路径：

| 层级 | 功能 | 收费方式 |
|---|---|---|
| Free OSS | 本地筛选、导入、去重、PRISMA 图、基础导出 | 免费，GitHub 获客 |
| Pro Local | 高级导出、质量评价模板、AI 使用日志、项目包、批量导入 | 一次性买断或订阅 |
| Team / Lab | 双人/多人协作、冲突解决、共享项目、审计报告 | 按项目或按席位 |
| Institution / Service | 中文数据库适配、私有部署、培训、模板定制 | 项目制 / 机构授权 |

### 4.3 12 个月学术目标

准备至少一篇软件论文或方法论文：

候选题目：

> PrismaTrace: A Local-first and Audit-ready Workflow for Conservative AI-assisted Systematic Reviews with Chinese Literature Compatibility

目标场景：

- JOSS：软件论文；
- JMIR AI：AI-assisted systematic review transparency；
- Systematic Reviews / BMC Medical Research Methodology：如果能补用户研究；
- 中文医学信息学 / 循证医学 / 卫生政策方法类期刊：作为国内落地版本。

---

## 5. 功能迭代路线图

## V2.2：Audit-ready 基础层

### 目标

建立项目级审计数据模型，让每一次导入、去重、筛选、复核、排除、修改、导出都有可追踪记录。

### 功能列表

#### 1. Project Manifest

新增 `project_manifest.json`：

```json
{
  "project_id": "uuid",
  "project_name": "",
  "created_at": "",
  "updated_at": "",
  "review_type": "systematic_review | scoping_review | meta_analysis | evidence_map",
  "prisma_version": "PRISMA_2020",
  "ai_mode": "off | assistive",
  "data_sources": [],
  "reviewers": [],
  "settings": {}
}
```

#### 2. Event Log

新增 `events.jsonl`：

每一行记录一个事件：

```json
{
  "event_id": "uuid",
  "timestamp": "",
  "actor": "reviewer_1",
  "event_type": "import | dedup | rule_screen | title_abstract_decision | full_text_decision | qa_decision | export",
  "record_id": "",
  "before": {},
  "after": {},
  "reason": "",
  "source": "human | rule | ai | system"
}
```

#### 3. Exclusion Reason Taxonomy

建立标准排除理由体系：

- wrong_population；
- wrong_intervention；
- wrong_comparator；
- wrong_outcome；
- wrong_study_design；
- non_empirical；
- duplicate；
- not_full_text_available；
- non_target_language；
- outside_year_range；
- protocol_only；
- review_article；
- other。

#### 4. Audit Export

新增导出：

- `project_manifest.json`
- `events.jsonl`
- `screening_decisions.csv`
- `exclusion_reasons.csv`
- `prisma_counts.json`
- `audit_summary.md`

### 验收标准

- 任意一条文献的纳入/排除路径可以从导入追踪到最终导出。
- 删除、重跑规则、修改排除理由都能在 event log 中留下记录。
- PRISMA 图中的数字可以由事件日志重新计算得到。
- 本地刷新后审计日志不丢失。

---

## V2.3：PRISMA-trAIce 支持层

### 目标

显式支持 AI-assisted systematic review 的透明报告。

### 功能列表

#### 1. AI Usage Registry

新增 `ai_usage_registry.json`：

```json
{
  "ai_tools": [
    {
      "tool_id": "uuid",
      "name": "OpenAI GPT / Claude / Gemini / local model",
      "version": "",
      "provider": "",
      "purpose": "translation | screening_suggestion | extraction | quality_appraisal_suggestion",
      "human_review_required": true
    }
  ]
}
```

#### 2. AI Suggestion Log

每一次 AI 建议都写入：

```json
{
  "suggestion_id": "uuid",
  "record_id": "",
  "task": "screening_suggestion",
  "model": "",
  "prompt_hash": "",
  "input_hash": "",
  "output": {
    "recommendation": "include | exclude | uncertain",
    "reason": "",
    "confidence": 0.0
  },
  "human_final_decision": "",
  "accepted": true,
  "timestamp": ""
}
```

#### 3. PRISMA-trAIce Report

导出 `PRISMA_TRAICE_REPORT.md`，包含：

- AI 工具名称与版本；
- 使用环节；
- 输入数据类型；
- 是否涉及全文；
- 是否涉及隐私数据；
- 人类如何复核；
- AI 建议被采纳比例；
- AI 建议与人工最终决策冲突比例；
- 已知局限；
- 未使用 AI 的环节。

#### 4. AI Mode Switch

提供三种模式：

| 模式 | 含义 |
|---|---|
| `No AI` | 完全不使用 AI，仅规则和人工 |
| `Assistive AI` | AI 提供建议，人类最终决定 |
| `Experimental AI` | 开发者/实验模式，不建议正式研究直接使用 |

### 验收标准

- 即使 AI 接口不可用，也可以完整运行 No AI 模式。
- AI 建议不会自动排除记录。
- 每一次 AI 输出都能追踪到输入摘要、模型、时间与人工最终决定。
- 可一键导出 PRISMA-trAIce 报告。

---

## V2.4：质量评价与数据提取正式化

### 目标

把当前“质量评价队列 + 工具族建议”升级为正式质量评价表单与数据提取模块。

### 功能列表

#### 1. Study Design Classifier

支持人工确认研究设计：

- RCT；
- cohort；
- case-control；
- cross-sectional；
- qualitative；
- diagnostic accuracy；
- economic evaluation；
- mixed methods；
- systematic review；
- guideline / consensus。

#### 2. Quality Appraisal Templates

第一批模板：

| 研究类型 | 模板 |
|---|---|
| RCT | RoB 2 baseline fields |
| 非随机干预 / 队列 | ROBINS-I baseline fields |
| 观察性研究 | NOS baseline fields |
| 系统综述 | AMSTAR 2 baseline fields |
| 定性研究 | CASP baseline fields |
| 诊断准确性 | QUADAS-2 baseline fields |
| 证据等级 | GRADE baseline fields |

#### 3. Evidence Table

新增 evidence table：

字段包括：

- author；
- year；
- country；
- study design；
- population；
- sample size；
- intervention / exposure；
- comparator；
- outcomes；
- effect measure；
- key findings；
- risk of bias；
- evidence certainty；
- notes。

#### 4. Export

支持导出：

- `quality_appraisal.csv`
- `evidence_table.csv`
- `grade_summary.csv`
- `review_package.zip`

### 验收标准

- 纳入研究可以进入质量评价队列。
- 每个纳入研究可以选择一种质量评价模板。
- 质量评价结果可以与 evidence table 联动。
- 导出表格可直接进入论文写作或 RevMan / R / Stata 前处理。

---

## V2.5：双人复核与团队协作闭环

### 目标

将双人模式从“角色分离”升级为正式 review collaboration workflow。

### 功能列表

#### 1. Reviewer Role Model

角色：

- owner；
- reviewer_1；
- reviewer_2；
- resolver；
- viewer。

#### 2. Conflict Detection

识别冲突：

- reviewer_1 include，reviewer_2 exclude；
- 排除理由不一致；
- full-text 决策不一致；
- quality appraisal 不一致。

#### 3. Conflict Resolution Queue

新增冲突解决页面：

- 显示两位 reviewer 的原始判断；
- 显示摘要和全文备注；
- resolver 选择最终决定；
- 记录 resolution reason；
- 写入 event log。

#### 4. Agreement Metrics

输出：

- percent agreement；
- Cohen’s kappa；
- conflict count；
- conflict by reason；
- reviewer workload。

### 验收标准

- 双人复核结果不能被静默覆盖。
- 所有冲突必须进入 resolution queue。
- resolution 之后才允许生成最终 PRISMA 图。
- agreement metrics 可导出。

---

## V2.6：Conservative AI Screening / Ranking

### 目标

引入 AI 辅助，但保持保守，不做静默自动排除。

### 功能列表

#### 1. AI Screening Suggestion

AI 输出：

- include；
- exclude；
- uncertain；
- reason；
- matched inclusion criteria；
- matched exclusion criteria；
- confidence；
- warning flags。

#### 2. Ranking / Prioritization

优先排序：

- high-likelihood include；
- uncertain；
- likely exclude；

但默认仍需要人工确认。

#### 3. Prompt Template Registry

内置 prompt 模板：

- title/abstract screening；
- PICO extraction；
- exclusion reason suggestion；
- study design suggestion；
- data extraction draft；
- quality appraisal suggestion。

#### 4. Model Provider Abstraction

支持：

- OpenAI-compatible API；
- Claude-compatible API；
- Gemini-compatible API；
- local model placeholder；
- no-AI fallback。

### 验收标准

- AI 建议不影响最终 PRISMA counts，除非人工确认。
- 所有 prompt 和输出都有 hash 或日志记录。
- 用户可以关闭 AI 并保持完整功能。
- 可比较 AI 建议与人工最终决定的一致性。

---

## V3.0：商业化与论文准备版本

### 目标

形成可以展示、收费、发表的稳定版本。

### 产品交付

1. Web landing page；
2. GitHub README 重写；
3. demo dataset；
4. tutorial；
5. benchmark report；
6. PRISMA-trAIce export demo；
7. JOSS paper draft；
8. pricing / commercial boundary；
9. contribution guide；
10. license and data privacy statement。

### 商业版本候选功能

| 功能 | Free | Pro | Team |
|---|---:|---:|---:|
| 本地导入与筛选 | ✓ | ✓ | ✓ |
| PRISMA 2020 导出 | ✓ | ✓ | ✓ |
| 基础去重 | ✓ | ✓ | ✓ |
| 高级审计包导出 | - | ✓ | ✓ |
| PRISMA-trAIce 报告 | - | ✓ | ✓ |
| 质量评价模板库 | 部分 | ✓ | ✓ |
| AI 建议 | - | ✓ | ✓ |
| 双人冲突解决 | - | - | ✓ |
| 团队协作 | - | - | ✓ |
| 机构模板定制 | - | - | 定制 |

---

## 6. 详细 TODO List

## 6.1 产品与信息架构

- [ ] 重写 README 首页定位：从“流程图工具”改为“系统综述工作台”
- [ ] 新增 `docs/product-positioning.md`
- [ ] 新增 `docs/roadmap.md`
- [ ] 新增 `docs/what-this-is-not.md`
- [ ] 新增 `docs/privacy-and-local-first.md`
- [ ] 新增 `docs/prisma-traice-support.md`
- [ ] 新增 `docs/comparison.md`，对比 Rayyan / Covidence / DistillerSR / ASReview / prismAId
- [ ] 制作 1 个英文 landing page
- [ ] 制作 1 个中文 landing page
- [ ] 补充 3 个使用场景：医学系统综述、公卫政策综述、中医药 / 医院管理综述

## 6.2 数据模型

- [ ] 设计 `ProjectManifest`
- [ ] 设计 `ReviewRecord`
- [ ] 设计 `ScreeningDecision`
- [ ] 设计 `DedupDecision`
- [ ] 设计 `QualityAppraisal`
- [ ] 设计 `EvidenceExtraction`
- [ ] 设计 `AuditEvent`
- [ ] 设计 `AIUsageEvent`
- [ ] 设计 migration 方案，保证旧项目可升级

## 6.3 审计日志

- [ ] 所有导入事件写入 log
- [ ] 所有去重事件写入 log
- [ ] 所有规则筛选事件写入 log
- [ ] 所有人工判断写入 log
- [ ] 所有排除理由修改写入 log
- [ ] 所有质量评价判断写入 log
- [ ] 所有导出事件写入 log
- [ ] 支持 audit summary 导出
- [ ] 支持从 audit log 反算 PRISMA counts

## 6.4 PRISMA-trAIce

- [ ] 梳理 checklist 字段
- [ ] 建立 AI tool registry
- [ ] 建立 AI suggestion log
- [ ] 建立 human override log
- [ ] 建立 AI adoption / conflict metrics
- [ ] 新增 `PRISMA_TRAICE_REPORT.md` 导出
- [ ] 在 UI 中标注 AI 使用状态
- [ ] 增加 No AI / Assistive AI 模式切换

## 6.5 中文数据库兼容

- [ ] 补 CNKI RDF 样例数据
- [ ] 补万方导出样例数据
- [ ] 补维普导出样例数据
- [ ] 补 PubMed NBIB 样例数据
- [ ] 补 Web of Science / Scopus RIS 样例
- [ ] 优化中文题名、英文题名、译名的候选重复匹配
- [ ] 对截断摘要做显式 warning
- [ ] 不对缺失摘要做 AI 补全
- [ ] 生成 `docs/chinese-source-compatibility.md`

## 6.6 去重与 benchmark

- [ ] 补 translated-title duplicate case
- [ ] 补 DOI normalization cases
- [ ] 补 CNKI DOI URL cases
- [ ] 补 PMID / PMCID / DOI 跨字段匹配
- [ ] 补中英文标题互译 candidate surfacing
- [ ] 引入至少 3 个真实导出数据集
- [ ] 输出 benchmark markdown
- [ ] 输出 benchmark JSON
- [ ] 在 README 中展示核心指标

## 6.7 质量评价与证据表

- [ ] 实现 study design 确认字段
- [ ] 实现 RoB 2 baseline template
- [ ] 实现 ROBINS-I baseline template
- [ ] 实现 NOS baseline template
- [ ] 实现 AMSTAR 2 baseline template
- [ ] 实现 GRADE baseline template
- [ ] 实现 evidence table editor
- [ ] 实现 CSV 导出
- [ ] 实现 `quality_appraisal_report.md`

## 6.8 双人复核

- [ ] 明确 reviewer 状态隔离
- [ ] 实现 reviewer decision comparison
- [ ] 实现 conflict queue
- [ ] 实现 resolver workflow
- [ ] 实现 Cohen’s kappa
- [ ] 实现 conflict export
- [ ] 在 PRISMA 导出前检查 unresolved conflict

## 6.9 AI 辅助

- [ ] 抽象 model provider
- [ ] 增加 prompt template registry
- [ ] 实现 title/abstract screening suggestion
- [ ] 实现 exclusion reason suggestion
- [ ] 实现 study design suggestion
- [ ] 实现 PICO extraction suggestion
- [ ] 所有 AI 建议写入 log
- [ ] 所有 AI 建议必须人工确认
- [ ] 增加 AI cost / token log
- [ ] 增加 provider key local storage warning

## 6.10 测试与发布

- [ ] 增加 unit tests
- [ ] 增加 parser tests
- [ ] 增加 dedup regression tests
- [ ] 增加 audit log tests
- [ ] 增加 export tests
- [ ] 增加 browser smoke tests
- [ ] 增加 large-file tests
- [ ] GitHub Actions 自动测试
- [ ] release checklist
- [ ] changelog automation

---

## 7. 商业化路径

### 7.1 最适合的首批用户

| 用户 | 痛点 | 可转化点 |
|---|---|---|
| 医学 / 护理 / 公卫研究生 | 系统综述流程复杂、PRISMA 不熟 | 免费工具 + 课程 / 模板 |
| 医院管理 / 卫生政策研究者 | 中文数据库多、导出格式乱 | 中文源兼容 + 审计包 |
| 医生科研团队 | 时间少、需要快速发综述 | 轻量 Web 工具 + 服务 |
| 循证医学团队 | 需要双人复核和质量评价 | Team 版 |
| 高校图书馆 / 方法学中心 | 需要培训和标准化流程 | 机构培训 / 私有部署 |

### 7.2 收费产品设计

#### 低价产品

- PRISMA 系统综述入门模板包；
- 中文数据库导入清理模板；
- 系统综述排除理由 taxonomy；
- 质量评价表单模板；
- 小红书 / 公众号引流。

#### 中价产品

- Pro 本地版；
- PRISMA-trAIce 报告导出；
- 高级质量评价表单；
- AI 辅助筛选；
- 项目包导出。

#### 高价产品

- 医院 / 实验室系统综述项目配置服务；
- 机构培训；
- 私有部署；
- 特定学科模板定制；
- 文献筛选流程审计服务。

### 7.3 商业边界

必须明确：

- 不代写论文；
- 不伪造文献；
- 不承诺自动完成系统综述；
- 不替代方法学专家；
- 不直接生成未经核验的研究结论；
- AI 只做辅助建议，正式判断由研究者完成。

---

## 8. Paper / 软件论文计划

### 8.1 JOSS 软件论文路线

必须补齐：

- `paper.md`
- `CITATION.cff`
- `codemeta.json`
- `CONTRIBUTING.md`
- `docs/statement-of-need.md`
- `docs/usage-example.md`
- `tests/`
- `sample-data/`
- `docs/benchmarks/`

论文核心贡献：

1. local-first screening workspace；
2. conservative two-layer deduplication；
3. Chinese-source compatibility；
4. audit-ready PRISMA workflow；
5. PRISMA-trAIce-ready AI usage reporting。

### 8.2 方法学论文路线

需要补实证：

- 3–5 个真实系统综述项目；
- 人工 Excel / Rayyan / 本工具的流程时间对比；
- 去重 precision / recall；
- reviewer agreement；
- AI suggestion 与人工最终判断一致性；
- 用户可用性访谈。

### 8.3 可选论文标题

1. `PrismaTrace: A Local-first and Audit-ready Workflow for Conservative AI-assisted Systematic Reviews`
2. `EvidenceFlow: A Browser-based Systematic Review Workspace with Chinese Literature Source Compatibility`
3. `Transparent AI-assisted Screening for Systematic Reviews: A Local-first Workflow Aligned with PRISMA 2020 and PRISMA-trAIce`

---

## 9. 推荐的版本节奏

| 时间 | 版本 | 目标 |
|---|---|---|
| 1–2 周 | V2.2-alpha | audit log + manifest + exclusion taxonomy |
| 3–4 周 | V2.2 | audit export + PRISMA counts 可重算 |
| 5–6 周 | V2.3-alpha | AI usage registry + PRISMA-trAIce report draft |
| 7–8 周 | V2.3 | No AI / Assistive AI 双模式 |
| 9–12 周 | V2.4 | 质量评价模板 + evidence table |
| 13–16 周 | V2.5 | 双人冲突解决 + agreement metrics |
| 17–24 周 | V2.6 | conservative AI screening + ranking |
| 6–12 个月 | V3.0 | 商业化 + paper-ready |

---

## 10. 关键判断点

### 项目不应继续停留在“更好用的 PRISMA 图工具”

这个方向功能轻、竞品多、用户付费意愿有限。

### 项目应升级为“可审计证据综合工作流”

这个方向有三个优势：

1. 更符合 PRISMA-trAIce 和 GenAI 透明报告趋势；
2. 更能利用你对中文科研场景的理解；
3. 更适合商业化和论文发表。

### AI 功能应后置于审计数据模型

先做 audit log，再做 AI。否则 AI 介入后会制造新的不可追溯问题。

### 中文数据库兼容是你的独特切口

CNKI / 万方 / 维普 / 中文题名 / 英文题名 / DOI 混乱 / 摘要截断 / RDF 噪音，是海外系统综述工具普遍不优先解决的问题。

---

## 11. 参考来源

1. PRISMA 2020 Statement and Flow Diagram — https://www.prisma-statement.org/
2. PRISMA 2020 Flow Diagram — https://www.prisma-statement.org/prisma-2020-flow-diagram
3. PRISMA-trAIce Checklist, JMIR AI 2025 — https://ai.jmir.org/2025/1/e80247
4. L-PRISMA: An Extension of PRISMA in the Era of GenAI, arXiv 2026 — https://arxiv.org/abs/2603.19236
5. ASReview LAB — https://asreview.nl/
6. ASReview GitHub — https://github.com/asreview/asreview
7. prismAId, Journal of Open Source Software 2025 — https://joss.theoj.org/papers/10.21105/joss.07616
8. Rayyan — https://www.rayyan.ai/
9. Rayyan PRISMA Help — https://help.rayyan.ai/hc/en-us/articles/22102956646417-How-do-I-Create-a-PRISMA-Diagram
10. Covidence — https://www.covidence.org/
11. DistillerSR — https://www.distillersr.com/
12. Project repository — https://github.com/quzhiii/-PRISMA-
