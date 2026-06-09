# PRISMA 系统综述筛选与审计工作台

面向系统综述、Meta 分析与证据整合项目的本地优先研究级工作台。支持多来源文献导入、保守去重、双人复核、离线 reviewer bundle 交接、质量评价、历史回溯、PRISMA 2020 导出和审计证据包。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-V2.5%20Dual%20Review-brightgreen.svg)](https://quzhiii.github.io/-PRISMA-/)
[![Current demo](https://img.shields.io/badge/Current%20demo-V2.5-orange.svg)](https://quzhiii.github.io/-PRISMA-/)
[![History rollback](https://img.shields.io/badge/History%20rollback-V2.5.1-blueviolet.svg)](./docs/plans/2026-06-03-v2-5-history-rollback.md)
[![Audit trail](https://img.shields.io/badge/Audit%20trail-events%20%2B%20decision%20ledger-0969da.svg)](./literature-screening-v2.2/)
[![Local first](https://img.shields.io/badge/Local%20first-browser--based-2ea44f.svg)](https://quzhiii.github.io/-PRISMA-/)
[![Scale](https://img.shields.io/badge/Scale-30%2C000%2B-purple.svg)](https://quzhiii.github.io/-PRISMA-/)

[English](./README_EN.md) | 简体中文

[在线使用](https://quzhiii.github.io/-PRISMA-/) · [提交问题](https://github.com/quzhiii/-PRISMA-/issues) · [版本历史](#版本历史)

如果你需要的不只是“画一张 PRISMA 图”，而是一套能经得起复查的筛选流程，这个项目重点解决四件事：

- 数据默认留在本地浏览器，适合还不方便上传到云端的研究资料。
- 导入、去重、筛选、全文复核、质量评价和导出都有可追溯记录。
- 双人复核冲突、来源文件调整和误操作可以被发现、阻断或回滚。
- 最终不仅能导出图和结果表，还能导出适合复核、答辩和方法学附录的审计证据。

## 为什么选择这个工作台

系统综述真正难的不是最后的图，而是过程是否经得起复查：哪些文献进来了，哪些被去重，哪些被规则筛掉，全文阶段为什么排除，双人复核冲突如何解决，调整来源文件后能不能回到上一版。这个项目围绕这些真实问题设计，尽量让筛选过程留下可复核的证据，而不是只留下一个最终数字。

| 研究工作中的问题 | 这个工作台的处理方式 |
|---|---|
| 中文数据库、PubMed、Web of Science 等来源格式混杂 | 支持 `CSV / TSV / RIS / ENW / BibTeX / RDF / TXT / NBIB`，可混合导入 |
| 自动去重容易误删 | 分成硬重复和疑似重复，硬重复才自动移除，疑似重复交给人工复核 |
| 大文件导入时页面像是卡住 | 常用格式使用 Worker 增量解析，并记录导入阶段、字节进度和记录数 |
| PRISMA 图里的数字难以追溯 | V2.2 增加 `AuditEvent` 和 `ScreeningDecision`，计数可从审计数据重算 |
| 全文排除理由分散在表格或备注里 | 内置标准 exclusion reason taxonomy，并导出排除理由汇总 |
| 质量评价经常脱离筛选流程 | 纳入研究可以进入条目级质量评价表单，并导出质量评价表、证据表和 GRADE 摘要 |
| 双人复核冲突影响最终导出可信度 | V2.5 已把筛选和质量评价分歧纳入 resolver workflow、agreement metrics 和 unresolved conflict gate |
| 两位审稿人不在同一台机器上工作 | Reviewer Bundle protocol 支持 collaboration seed package、reviewer decision bundle 和 merge import，形成 file-based local-first collaboration；完整项目保存/加载仍是单独的备份路径 |
| 上传错文件或调整来源后很难回退 | V2.5.1 已加入本地项目快照、历史恢复和来源文件增减记录 |
| 使用 AI 辅助时担心不可解释 | AI 默认关闭；示例 AI 建议必须经过人工确认，并写入审计日志 |

## 适合谁

| 用户 | 适合的使用场景 |
|---|---|
| 医学、护理、公卫、管理学研究生 | 完成系统综述或 Meta 分析的文献筛选和 PRISMA 输出 |
| 医院、科研团队和课题组 | 在本地整理多来源数据库导出，保留筛选过程证据 |
| 循证医学和卫生政策研究者 | 需要保守去重、双人复核、质量评价和审计记录的项目 |
| 中文数据库使用者 | 处理 CNKI / 万方 / 维普 / PubMed / RIS / RDF 等真实导出问题 |
| 方法学或软件论文准备者 | 需要可复现测试、benchmark 和 audit-ready 输出的开源工具链 |

## 一眼看懂工作流

```mermaid
flowchart LR
  A["导入文献"] --> B["保守去重"]
  B --> C["配置筛选规则"]
  C --> D["标题/摘要筛选"]
  D --> E["全文复核"]
  E --> F["质量评价"]
  F --> G["PRISMA 与审计包导出"]
```

| 阶段 | 关键产物 |
|---|---|
| 导入 | 标准化文献记录、来源文件信息、导入事件 |
| 去重 | 硬重复移除列表、疑似重复候选列表、去重证据 |
| 规则筛选 | 标题/摘要阶段的纳入、排除和不确定记录 |
| 人工复核 | 全文阶段最终判断、排除理由、复核备注 |
| 质量评价 | 研究设计建议、工具族建议、条目级质量评价、证据等级基线 |
| 导出 | PRISMA SVG、结果表、筛选报告、审计包、质量评价表、证据表、GRADE 摘要、双审冲突证据 |

## 当前版本状态

| 版本线 | 路径 | 状态 |
|---|---|---|
| V2.5 dual-review closeout | `literature-screening-v2.2/` | 当前公开版本线。把双人全文复核和质量评价分歧纳入 reviewer isolation、conflict queue、resolver workflow、agreement metrics、冲突证据导出和 unresolved conflict gate；页面 shell、项目快照版本和 manifest 默认版本已统一到 V2.5。 |
| Reviewer Bundle protocol | `literature-screening-v2.2/` | 已完成本地交接切片。项目 owner 可导出 collaboration seed package，Reviewer A/B 可各自导出 reviewer decision bundle，owner 可用 merge import 合并回现有项目并刷新冲突队列、一致性指标和 export gate。完整项目保存/加载仍是单独的备份路径；不新增后端、账号或付费层。 |
| V2.5.1 project history rollback | `literature-screening-v2.2/` | 已完成。增加本地历史快照、版本恢复、来源文件增减后的可恢复状态，并在导入、筛选重跑、全文复核完成、质量保存、冲突解决和导出前生成恢复点。 |
| V2.4 quality appraisal | `literature-screening-v2.2/` | 已完成稳定能力。保留 V2.3 的 PRISMA-trAIce 透明审计能力，并加入质量评价模板、条目级质量表单、`quality_appraisal.csv`、`evidence_table.csv` 和 `grade_summary.csv`。真实 AI provider 仍不默认接入，`v2.2` 目录继续作为兼容发布路径。 |
| V2.6 | `literature-screening-v2.2/` | 已完成：本地保守 AI foundation slice。已覆盖 local advisory suggestions、prioritisation、uncertainty flags、prompt registry trace、Step 3 advisory queue controls、queue summary、priority sorting、review-state filters、empty-state clarity、PRISMA-trAIce queue summary 和 audit summary queue summary；真实 AI provider 仍默认关闭，最终决定仍由人工确认。 |
| V2.7 Chinese-source reliability | `literature-screening-v2.2/` | 下一阶段：fixture-backed CNKI、万方、维普和 SinoMed 可靠性增强，显示 `abstract_truncation_suspected`、`abstract_noise_detected` 和 `source_mapping_incomplete` 导入提示；不引入后端、真实 AI dispatch 或自动最终筛选决定。 |
| V2.3 PRISMA-trAIce readiness | `literature-screening-v2.2/` | 已完成 AI 使用登记、provider 边界、AI 建议日志、人工确认闭环和透明报告；不默认发送真实 AI 请求。 |
| V2.2 audit-ready | `literature-screening-v2.2/` | 已完成审计基础层，包括审计模型、工作流事件和审计包导出 |
| V2.1 stable | `literature-screening-v2.0/` | 历史稳定路径，保留 6 步工作流和早期质量评价入口 |
| v1.7.x | 根目录旧入口 | 历史维护版本，保留早期 PRISMA 工具能力 |

V2.5 closeout 的重点是让双人复核从“可用入口”变成可审计、可阻断风险的正式流程。V2.5 已作为当前公开版本线保留在同一个 `literature-screening-v2.2/` 兼容路径中，并保持真实 AI provider 默认禁用。V2.5.1 已补上本地历史记录和回溯，避免用户上传错文件、调整来源或想回看上一版筛选结果时只能重来。当前重点导出包括：

| 文件 | 用途 |
|---|---|
| `project_manifest.json` | 项目基本信息、PRISMA 版本、AI 模式、设置 |
| `events.jsonl` | 导入、去重、筛选、复核、质量评价和导出的事件日志 |
| `screening_decisions.csv` | 可持久化的筛选决策表 |
| `exclusion_reasons.csv` | 排除理由 taxonomy 和计数 |
| `prisma_counts.json` | 从决策和事件重算的 PRISMA 计数 |
| `audit_summary.md` | 可读的审计摘要和注意事项 |
| `ai_usage_registry.json` | AI 模式、provider 边界、允许阶段和用户确认记录 |
| `ai_suggestions.jsonl` | AI 建议、hash、人工复核动作、关联 decision、review trace 字段和 PRISMA 计数边界 |
| `PRISMA_TRAICE_REPORT.md` | No-AI 或 assistive-AI 透明报告，用于 PRISMA-trAIce readiness |
| `quality_appraisal.csv` | 逐研究、逐领域的质量评价记录，包含人工填写的 judgement、支持性原文 / 页码、审稿备注和总体判断 |
| `evidence_table.csv` | 面向证据整理的 PICOS、效果量、质量判断和证据等级表 |
| `grade_summary.csv` | 按结局和 PICOS 分组的 GRADE 摘要脚手架，最终 certainty 和降级理由保留人工确认 |
| `dual_review_conflicts.csv` | V2.5 双审冲突证据，包含筛选和质量评价分歧、A/B 审稿值、resolver/final 值和状态 |
| `dual_review_agreement.json` | V2.5 一致性指标，包含配对决策、percent agreement、Cohen's kappa 和冲突门禁状态 |

## 核心能力

| 能力 | 当前状态 |
|---|---|
| 多格式文献导入 | 支持 `CSV / TSV / RIS / ENW / BibTeX / RDF / TXT / NBIB` |
| 常用格式增量解析 | `CSV / TSV / RIS / NBIB / ENW` 走 Worker 分块解析 |
| 保守去重 | 硬重复自动移除，疑似重复进入人工复核 |
| 规则筛选 | 支持语言、年份、关键词、标题、作者、期刊等条件 |
| 全文复核 | 支持快捷键、排除理由、备注和单篇翻译入口 |
| 双人复核 | V2.5 closeout 已支持 A/B 决策隔离、冲突队列、resolver workflow、agreement metrics 和 unresolved conflict gate |
| 本地文件协作 | Reviewer Bundle protocol 已支持 collaboration seed package、reviewer decision bundle 和 merge import，跨机器交接后复用现有 conflict queue 和 resolver workflow |
| 历史记录回溯 | V2.5.1 已支持本地项目快照、版本恢复、来源文件增减记录，以及关键流程节点的恢复点 |
| 质量评价 | V2.4 已支持模板族、条目级质量表单、人工 judgement、支持性原文 / 页码和审稿备注；V2.5 增加质量评价分歧处理 |
| 证据整理 | 已支持 `quality_appraisal.csv`、`evidence_table.csv` 和 `grade_summary.csv` |
| PRISMA 2020 导出 | 支持多主题 SVG、纳入/排除表和筛选报告 |
| 审计导出 | 已支持 manifest、event log、decision ledger、counts、summary、质量评价 audit trace 和双审冲突 gate event |
| PRISMA-trAIce readiness | 已加入 AI mode、AI usage registry、mock suggestion log、人工复核 trace 字段和透明报告；当前不接真实 AI provider |

## 性能与基准

| 操作 | 数据量 | 结果 | 说明 |
|---|---:|---:|---|
| IndexedDB 写入 | 30,000 条 | 约 3-5s | 500 条一批写入 |
| 分页查询 | 100 条 | 约 213ms | 使用索引查询 |
| 虚拟列表渲染 | 30,000 条 | 约 16ms/帧 | 只渲染可见区域 |
| 自动删除精确率 | benchmark | `1.000` | 保守策略下避免误删 |
| 综合 Candidate F1 | benchmark | `0.957` | 疑似重复候选输出更稳定 |

基准数据来自 [`docs/benchmarks/dedup/post-implementation-benchmark-report.md`](./docs/benchmarks/dedup/post-implementation-benchmark-report.md)。不同设备上的导入速度会有差异，README 中只保留已经有仓库证据支撑的数字。

## 技术架构

```text
workspace.html              -> 工作台页面与步骤结构
app.js                      -> 主流程、规则筛选、复核、导出和状态管理
audit-engine.js             -> 审计模型、PRISMA-trAIce 数据结构、决策序列化和审计包构建
dual-review-engine.js       -> V2.5 双人复核冲突、resolver、agreement metrics 和导出逻辑
reviewer-bundle-engine.js   -> Reviewer Bundle protocol、seed package、reviewer bundle 和 merge import 纯协议逻辑
project-history-engine.js   -> V2.5.1 本地历史快照、状态克隆和回溯元数据
db-worker.js                -> IndexedDB 数据层
parser-worker.js            -> 多格式解析和后台消息编排
streaming-parser.js         -> 常用格式增量解析状态机
quality-engine.js           -> 质量评价模板、研究设计、证据等级、evidence table 和 GRADE summary
import-job-runtime.js       -> 导入任务阶段、进度和项目状态
dedup-engine.js             -> 保守去重引擎
virtual-list.js             -> 大规模列表渲染
```

## 测试

当前回归入口：

```powershell
node tests\run-all-regressions.js
```

当前覆盖范围包括：

- audit model、workflow hooks、audit package export
- AI suggestion panel、human review flow、PRISMA-trAIce report、AI suggestion JSONL trace fields
- dual-review conflict queue、resolver workflow、agreement metrics、unresolved conflict gate
- reviewer bundle seed export、reviewer-scoped decision bundle、merge import 和 conflict gate round-trip
- project history snapshots、rollback flow、source-file add/remove recovery
- dedup engine、candidate duplicate export、benchmark smoke/regression
- import job state、parser chunk boundaries、import hardening
- quality engine、study-design classifier、quality appraisal CSV、evidence table、GRADE summary

最近一次 V2.6 foundation 回归结果：`151/151` 通过。

## 路线图

| 阶段 | 目标 |
|---|---|
| V2.2 | 审计基础层、事件日志、可重算 PRISMA counts、审计包导出 |
| V2.3 | PRISMA-trAIce 数据模型、AI usage registry、AI suggestion log、透明报告 |
| V2.4 | 已完成：质量评价模板、条目级质量表单、evidence table、GRADE summary |
| V2.5 | 当前公开版本线：双人复核隔离、冲突队列、resolver workflow、agreement metrics、unresolved conflict gate |
| Reviewer Bundle protocol | 已完成：通过 collaboration seed package、reviewer decision bundle 和 merge import 支持 offline cross-machine handoff；这是 file-based local-first collaboration，不替代完整项目备份 |
| V2.5.1 | 已完成：本地历史记录、项目快照、来源文件增减回溯、关键流程恢复点 |
| V2.6 | 已完成：本地保守 AI foundation slice，覆盖 advisory suggestions、ranking、prompt registry、provider abstraction 边界、Step 3 advisory queue controls、PRISMA-trAIce queue summary 和 audit summary queue summary |
| V2.7 | 下一阶段：Chinese-source reliability，fixture-backed CNKI / Wanfang / VIP / SinoMed hardening、摘要截断 / 噪音 / 映射不完整导入提示，不改变最终决定语义 |
| V3.0 | 先从 public demo dataset 开始，再推进 benchmark、paper skeleton、release page refresh 和 commercial validation |

当前 P6 / V3.0 的第一刀是 `public demo dataset`：用一个小型、可公开、可本地加载的演示数据集帮助新用户完成 onboarding、流程 walkthrough 和字段映射检查，而不是把它当成 benchmark 包或生产数据集。下一刀是 `benchmark package`：从现有 dedup runner、manifest 和报告开始，整理 repo 内可复现的 import / dedup / audit replay 基准入口。再下一刀是 `paper skeleton`：先建立 repository-local paper skeleton、statement of need、evidence source map 和 JOSS / JMIR AI / Systematic Reviews 的保守投稿方向，而不是直接声称已有完整投稿稿件。再下一刀是 `commercial validation`：先冻结 commercial validation contract、open-core / free-vs-paid 边界、interview / trial evidence record 结构，并坚持 validation before monetization implementation，不写支付代码、账号系统或产品锁。

## 版本历史

<details>
<summary><b>Reviewer Bundle protocol（已完成本地文件协作切片，2026-06）</b></summary>

- 新增 `reviewer-bundle-engine.js`，把 seed、bundle 和 merge import 的协议逻辑从 `app.js` 中独立出来
- 项目 owner 可以导出不包含 reviewer decisions 的 collaboration seed package
- Reviewer A/B 可以分别导出只包含自己 full-text decisions 和 reviewer-scoped quality values 的 reviewer decision bundle
- owner 可以将 reviewer decision bundle merge import 回现有项目；导入后刷新 dual-review conflicts、agreement metrics 和 unresolved conflict gate
- 该能力是 file-based local-first collaboration；完整项目保存/加载仍是单独的备份路径
- 不引入后端、账号、权限、付费系统或在线同步服务

</details>

<details>
<summary><b>V2.6 Conservative AI foundation（已完成 foundation slice，2026-06）</b></summary>

- 新增本地 conservative AI engine，只生成 advisory `AISuggestionEvent`，不直接生成最终 `ScreeningDecision`
- 新增 `priorityScore`、`priorityReason`、`recommendedQueue`、`uncertaintyFlags`、`riskFlags` 和 prompt/input hash trace
- 新增 Step 3 advisory queue controls：queue labels、queue summary、priority sorting、review-state filters 和 empty-state clarity
- 新增 Step 4 queue context handoff / hygiene，帮助人工复核时保留来源队列上下文
- PRISMA-trAIce report 和 audit summary 增加 V2.6 queue controls summary
- 真实 AI provider dispatch 仍默认关闭，不提供 API key 输入，不引入后端、账号或云同步
- AI 建议仍必须由人工接受或改写后才会形成可计数的人类 `ScreeningDecision`
- 完整回归 `151/151` 通过

</details>

<details>
<summary><b>V2.5.1 project history rollback（已完成，2026-06）</b></summary>

- 新增 `project-history-engine.js`，用于创建有界本地项目历史快照
- 新增历史记录面板和恢复入口，支持恢复到较早筛选状态
- 在 `before_import`、`after_import`、`screening_rerun`、`fulltext_finalized`、`quality_saved`、`conflict_resolved` 和 `before_export` 等节点生成恢复点
- 新增来源文件 add/remove 历史，移除来源文件前自动保留可恢复状态
- 恢复旧快照时保留当前完整历史时间线，避免回滚后丢失后续恢复点
- 为缺少稳定标识的记录保留 fallback audit id，避免来源文件移除后误删幸存记录的决策、AI 建议或质量评价状态
- 示例数据加载会写入 `_source` 和 `_sourceFile`，来源文件移除同样适用于内置示例数据
- 完整回归 `133/133` 通过

</details>

<details>
<summary><b>V2.5 dual-review closeout（当前公开版本线，2026-06）</b></summary>

- Reviewer A/B full-text decisions are isolated as durable `ScreeningDecision` records
- Screening conflicts generate a conflict queue across include / exclude / uncertain disagreements
- Resolver actions write final human decisions and `review_conflict_resolved` audit events
- Quality conflicts are detected across overall judgement, status, and domain judgements
- Quality resolver actions write final quality values and `quality_conflict_resolved` audit events
- Added `dual_review_conflicts.csv` and `dual_review_agreement.json`
- Final result exports are blocked while unresolved dual-review conflicts remain; conflict evidence exports remain available
- V2.5 closeout regression passed `121/121`; headless Chrome smoke passed with 0 console errors and 0 runtime exceptions

</details>

<details>
<summary><b>V2.4 quality appraisal（已完成稳定能力，2026-05）</b></summary>

- 保留 `literature-screening-v2.2/` 作为兼容发布路径
- 新增质量评价模板 schema，覆盖 RCT、cohort、case-control、cross-sectional、diagnostic accuracy 和 systematic review
- 新增 reviewer-editable item-level quality forms，支持领域判断、支持性原文 / 页码、审稿备注、总体判断、评价状态和评价备注
- 新增 `quality_appraisal.csv`
- 新增 `evidence_table.csv`
- 新增 `grade_summary.csv`，最终 GRADE certainty 和 downgrade reasons 仍由人工确认
- 质量评价修改写入 `quality_appraisal_updated` audit event，保留 before / after
- 不默认连接真实 AI provider，不保存或导出 API key
- 完整回归 `115/115` 通过

</details>

<details>
<summary><b>V2.3 PRISMA-trAIce readiness（已完成，2026-05）</b></summary>

- 新增 `off`、`assistive`、`experimental` AI mode
- 新增 provider abstraction，为未来 OpenAI-compatible endpoint 做边界准备，但默认禁用真实请求
- 导出 `ai_usage_registry.json`
- 导出 `ai_suggestions.jsonl`，包含 human action、linked decision、`reviewed_at`、human edit fields 和 `prisma_count_boundary`
- 导出 `PRISMA_TRAICE_REPORT.md`，支持 No-AI 和 assistive-AI 透明说明
- mock AI suggestion 只有在人工 accept/edit 后才会形成 `ScreeningDecision`
- rejected suggestion 不进入 PRISMA counts
- 不发送真实 AI provider 请求，不导出 API key 材料
- release-readiness gate 见 [`docs/checklists/V2.3_PRISMA_TRAICE_READINESS_CHECKLIST.md`](docs/checklists/V2.3_PRISMA_TRAICE_READINESS_CHECKLIST.md)

</details>

<details>
<summary><b>V2.2 audit-ready (completed foundation, 2026-04)</b></summary>

- 新增 `literature-screening-v2.2/` 独立工作区
- 新增 `audit-engine.js`
- 新增 `ProjectManifest`、`AuditEvent`、`ScreeningDecision`
- 导入、去重、规则筛选、全文复核、质量评价和导出节点写入审计事件
- 审计事件类型规范化：自动映射旧名称到 `AUDIT_LEDGER_DESIGN.md` 设计文档标准名称，保证旧数据兼容
- 审计导出采用稳定的 `snake_case` 字段命名（`project_id`、`screening_stage`、`human_decision` 等）
- 新增审计包导出：manifest、events、decisions、exclusion reasons、counts、summary
- AI 模式默认保持 `off`

</details>

<details>
<summary><b>V2.1 stable（历史 GitHub Pages 路径，2026-04）</b></summary>

- 工作流升级为 6 步，新增质量评价 / 证据等级步骤
- 常用格式 `CSV / TSV / RIS / NBIB / ENW` 改为 Worker 增量解析
- 新增 `quality-engine.js`、`import-job-runtime.js`、`streaming-parser.js`
- 导入任务状态支持项目级持久化与阶段化显示
- 保留 `literature-screening-v2.0/` 访问路径以兼容既有链接

</details>

<details>
<summary><b>V2.0（上一代主版本，2026-03）</b></summary>

- 新增独立首页 / 登录页 / 工作台结构
- 新增独立 `dedup-engine.js` 去重引擎
- 去重改为“硬重复自动移除 + 疑似重复人工复核”
- 修复 CSV / TSV 跨行摘要解析
- 全文复核弹窗新增单篇翻译入口
- 修复上传展示、页面滚动、步骤衔接和双人复核共享状态问题

</details>

<details>
<summary><b>v1.7.x（稳定维护版，2026-03）</b></summary>

- 补全 PubMed `.nbib` 导入支持
- 修复单人 / 双人模式 session 接线问题
- 修复去重后无法继续进入后续步骤的问题

</details>

## 参与贡献

欢迎提交 Issue 和 Pull Request。

```bash
git checkout -b feature/your-feature
git commit -m "feat: 描述你的改动"
git push origin feature/your-feature
```

## 许可证

[MIT License](./LICENSE)

如果这个工具对你的研究有帮助，欢迎点一个 Star。
