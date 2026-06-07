# PRISMA Workbench 2026 Roadmap

Last updated: 2026-06-03

## Roadmap 原则

- 先做清楚的本地工作流，再做协作和 AI。
- 先让每个筛选决定可追溯，再让 AI 参与建议。
- 先补产品定位、设计文档和导出边界，再扩展功能。
- 不把当前免费本地能力提前锁到账号、支付或云端系统后面。
- 所有新增能力默认遵守 local-first 和 audit-ready 原则。

## 当前状态

| 版本线 | 状态 | 关键路径 |
|---|---|---|
| v1.7.x | 历史维护版 | 根目录旧入口 |
| V2.1 stable | 历史稳定路径 | `literature-screening-v2.0/` |
| V2.3 PRISMA-trAIce readiness | completed | `literature-screening-v2.2/` compatibility path |
| V2.2 audit-ready | completed foundation | `literature-screening-v2.2/` |
| V2.4 quality appraisal | completed stable capability | `literature-screening-v2.2/` compatibility path |
| V2.5 dual-review closeout | current public release line | `literature-screening-v2.2/` compatibility path |
| V2.5.1 project history rollback | next patch-line plan | `literature-screening-v2.2/` compatibility path |

V2.2 已完成的工程基础：

- `ProjectManifest`
- `AuditEvent`
- `ScreeningDecision`
- 审计 stores
- 工作流事件 hooks
- PRISMA counts 从 decisions/events 重算
- 审计包导出：manifest、events JSONL、decisions CSV、exclusion reasons、counts、summary

## P0：近期必须做

目标：让产品定位、公开表达和 V2.2 audit-ready 主线对齐。

| 任务 | 产物 | 状态 |
|---|---|---|
| README 结构重写 | `README.md`、`README_EN.md` | 已完成初版 |
| landing page 信息架构调整 | `literature-screening-v2.2/index.html` | 本阶段推进 |
| 产品定位说明 | `docs/PRODUCT_POSITIONING_2026.md` | 本阶段新增 |
| 2026 roadmap | `docs/ROADMAP_2026.md` | 本阶段新增 |
| 商业化边界说明 | `docs/COMMERCIALIZATION_NOTES.md` | 本阶段新增 |
| 命名策略 | `docs/NAME_STRATEGY.md` | 本阶段新增 |
| audit ledger 设计 | `docs/design/AUDIT_LEDGER_DESIGN.md` | 本阶段新增 |
| conservative AI 设计 | `docs/design/CONSERVATIVE_AI_DESIGN.md` | 本阶段新增 |
| 中文源兼容设计 | `docs/design/CHINESE_SOURCE_COMPATIBILITY.md` | 本阶段新增 |
| 质量评价模块设计 | `docs/design/QUALITY_APPRAISAL_MODULE.md` | 本阶段新增 |

验收标准：

- 公开文案统一使用 PRISMA Workbench、local-first、audit-ready、quality appraisal、Chinese-source compatibility、conservative AI。
- 不宣传 AI 一键完成系统综述。
- landing page 不再只强调“专业工具”，而是明确解释差异化和版本边界。
- 文档能指导 V2.3/V2.4 的实现，不只是营销文案。

## P1：V2.2 audit-ready 增强

目标：把审计能力从“已能导出”推进到“可解释、可测试、可复核”。

| 任务 | 说明 |
|---|---|
| 审计事件类型稳定化 | 明确 import、dedup、screening、review、quality、export 的事件字段 |
| Decision ledger 字段冻结 | 确认 CSV/JSON 字段命名、stage、decision、reason、reviewer |
| Exclusion reason taxonomy | 标准化排除理由字典，支持计数和导出 |
| PRISMA count replay | 增加更多从 ledger 重算 counts 的测试样例 |
| 审计包 UI 说明 | 在导出页说明每个审计文件的用途 |
| 本地数据边界说明 | 对外说明审计包在浏览器本地生成 |

不做事项：

- 不接真实 AI API。
- 不引入后端。
- 不把审计导出做成付费门槛。

## P2：V2.3 PRISMA-trAIce readiness

目标：即使暂时不使用真实模型，也先让 AI 使用记录、建议记录和透明报告有数据结构。

Current status: V2.3 readiness is release-ready in `literature-screening-v2.2/` as a local mock/audit layer. Real AI provider dispatch remains disabled.

| 任务 | 产物 | 状态 |
|---|---|---|
| AI mode | `off | assistive | experimental` | 已完成 |
| AI usage registry | 记录工具、用途、数据边界、启用时间 | 已完成，导出 `ai_usage_registry.json` |
| AI suggestion log | 记录建议、理由、置信度、输入/提示 hash、人工处理结果 | 已完成，导出 `ai_suggestions.jsonl` |
| Mock AI suggestion pathway | 用本地 mock 数据验证 AI 建议必须人工确认 | 已完成，含重复 suggestion 去重 |
| Human review trace | `reviewed_at`、人工改写字段、`linked_decision_id`、`prisma_count_boundary` | 已完成 |
| PRISMA-trAIce report | `PRISMA_TRAICE_REPORT.md` | 已完成，含 No-AI / assistive 透明说明 |
| No-AI report | 未使用 AI 时也能导出透明声明 | 已完成 |

验收标准：

- No AI 模式完整可用。
- AI 建议不会直接写入最终 `ScreeningDecision`。
- 接受 AI 建议时生成的是人工确认事件。
- 报告能说明 AI 在哪里使用、如何复核、有哪些限制。

## P3：V2.4 质量评价与 evidence table

目标：把质量评价从“队列和建议”推进到可正式导出的结构化模块。

Current status: V2.4 is a completed stable capability inside the V2.5 public release line. It adds item-level quality forms, `quality_appraisal.csv`, `evidence_table.csv`, and `grade_summary.csv`, while keeping final GRADE certainty and downgrade reasons human-controlled.

| 任务 | 说明 | 状态 |
|---|---|---|
| Template schema | RCT、cohort、case-control、cross-sectional、diagnostic accuracy、systematic review | 已完成 |
| Tool family mapping | RoB 2、ROBINS-I、NOS、JBI、QUADAS-2、AMSTAR 2 等 | 已完成 |
| Item-level quality forms | domain judgement、supporting quote/page、reviewer note、overall judgement、status | 已完成 |
| Evidence table | PICOS、效果量、结局、风险偏倚、证据等级 | 已完成 |
| Quality export | `quality_appraisal.csv`、`evidence_table.csv`、`grade_summary.csv` | 已完成 |
| Audit integration | 质量评价创建、修改、完成都写入 audit event | 已完成 |

不做事项：

- 不让 AI 默认给最终质量评级。
- 不提前实现复杂图形输出。

## P4：V2.5 双人复核与冲突解决

目标：让双人复核从“可用入口”变成可审计的正式流程，并让公开页面、项目快照和 manifest 版本号统一到 V2.5。

Current status: V2.5 is the current public release line on the compatibility path. Node regression and headless Chrome smoke pass; page shell labels, project snapshot version, and manifest default version are synchronized to V2.5.

| 任务 | 说明 | 状态 |
|---|---|---|
| Reviewer isolation | 主审、副审决策隔离存储为 durable `ScreeningDecision` | 已完成 |
| Conflict queue | 纳入/排除/不确定/质量评价冲突集中处理 | 已完成 |
| Resolver workflow | 第三方或主审确认最终筛选决定和质量评价值 | 已完成 |
| Agreement metrics | Kappa、percent agreement、配对决策、一致/分歧统计 | 已完成 |
| Conflict evidence exports | `dual_review_conflicts.csv`、`dual_review_agreement.json` | 已完成 |
| Export gate | 未解决冲突时阻止最终结果导出，保留冲突证据导出 | 已完成 |
| Version label sync | `index.html`、`workspace.html`、`landing.html`、project snapshot、manifest 默认版本统一到 V2.5 | 已完成 |

V2.5 readiness gate:

- `node tests\run-all-regressions.js` 必须通过。
- README、README_EN、roadmap、V2.5 checklist 必须同步当前状态。
- 未解决双审冲突时，最终结果导出必须被阻断；冲突证据和审计证据导出仍可下载。
- Headless Chrome smoke 已覆盖 Reviewer A/B 分歧、screening resolver、quality resolver、dual-review exports 和 blocked final export。

## P4.1：V2.5.1 本地历史记录与回溯

目标：在不引入后端和账号系统的前提下，为用户提供本地项目历史、版本回溯和来源文件增减后的恢复路径。

Current status: planned in [`docs/plans/2026-06-03-v2-5-history-rollback.md`](plans/2026-06-03-v2-5-history-rollback.md). This is a V2.5 patch-line feature, not a V2.6 AI feature.

| 任务 | 说明 | 状态 |
|---|---|---|
| Snapshot schema | 在项目状态中增加 `projectHistory`，每个 snapshot 包含 id、label、reason、created_at、step、source_files、rule_hash、counts 和 state payload | 计划 |
| Snapshot triggers | import 成功、来源文件增减、规则筛选运行、全文复核完成、质量评价保存、冲突解决、导出前自动创建快照 | 计划 |
| Restore workflow | 新增历史面板，支持预览上一版筛选规则/PRISMA counts/来源文件，再确认调用 `restoreProjectState(snapshot)` | 计划 |
| Source file add/remove | 上传错文件时可从项目源列表移除文件并生成 `source_file_removed` audit event；追加新文件生成 `source_file_added` 和新快照 | 计划 |
| Audit events | 快照创建写 `project_snapshot_created`；恢复写 `project_snapshot_restored`；来源调整写 `source_file_added` / `source_file_removed` | 计划 |
| Export boundary | 历史快照只留在本地项目文件和可选 history export 中，不改变 V2.3/V2.4/V2.5 既有审计导出字段 | 计划 |

V2.5.1 验收标准：

- 用户上传错文件后，可以回到导入前或上一轮筛选后的状态，不需要清空整个项目重来。
- 用户追加或移除来源文件后，历史中能看见来源变化、记录数变化和对应 audit event。
- 用户可以回看上一版筛选规则、筛选统计和 PRISMA counts，并确认后恢复。
- 恢复历史状态不会绕过 unresolved conflict gate；恢复后仍按当前 V2.5 gate 重新计算冲突状态。
- 历史记录继续遵守 local-first，不引入后端、账号、云同步或真实 AI provider。

## P5：V2.6 Conservative AI screening

目标：引入 AI 建议和排序，但保持人类最终决定。

Current status: V2.6 local conservative AI foundation slice is completed on the `literature-screening-v2.2/` compatibility path. AI suggestions stay advisory-only until a human accepts or edits them into a final decision.

Completed queue state: Step 3 advisory queue controls are completed with queue labels, queue summary, priority sorting, review-state filters, and empty-state clarification. PRISMA-trAIce and audit summary queue summaries report the derived advisory queue metadata. These controls only help reviewers triage and focus attention; they do not turn V2.6 into a one-click or auto-final-decision workflow.

| 任务 | 说明 | 状态 |
|---|---|---|
| Local advisory suggestions | 基于本地规则和启发式生成 include/exclude/uncertain 建议，写入 `AISuggestionEvent`，不直接改写 `ScreeningDecision` | 已完成 foundation |
| AI prioritisation foundation | 为记录生成 `priorityScore`、`priorityReason`、`recommendedQueue`，只改变人工处理顺序建议 | 已完成 foundation |
| Uncertainty flagging foundation | 为低信息量、边界样本和潜在冲突样本生成 `uncertaintyFlags` 和 `riskFlags` | 已完成 foundation |
| Prompt registry foundation | 为本地 conservative AI 建议生成 prompt trace、criteria hash 和 input hash | 已完成 foundation |
| Provider boundary remains disabled by default | 继续保留 provider abstraction，但默认不发真实请求、不接 API key 输入 | 已完成边界 |
| PRISMA-trAIce and audit summary queue summaries | 在透明报告和审计摘要中汇总 V2.6 advisory queue total、pending/reviewed 和 bucket counts，不伪造控件点击使用 | 已完成 foundation |

| 模式 | 作用 |
|---|---|
| AI suggest only | 给出纳入/排除/不确定建议和理由 |
| AI prioritisation | 优先展示更可能相关或更需要人工处理的记录 |
| Uncertainty flagging | 标记边界样本、冲突样本、低质量摘要 |
| Prompt registry | 管理提示词版本、用途和 hash |
| Provider abstraction | 支持本地模型或用户自带 OpenAI-compatible endpoint |

约束：

- 默认不配置云 API。
- 不静默排除记录。
- 不覆盖人工决定。
- 所有 AI 输出必须可导出。

## P6：V3.0 发布、论文与商业化准备

目标：形成更清晰的公开产品、demo、benchmark 和论文材料。

| 任务 | 产物 |
|---|---|
| Demo dataset | 可公开的演示数据和导入说明 |
| Benchmark package | 导入、去重、筛选、审计 replay 的可复现测试 |
| Paper skeleton | JOSS / JMIR AI / Systematic Reviews 候选材料 |
| Release page | 面向科研用户的 landing page 和使用路径 |
| Commercial validation | 访谈、试用、模板包、机构部署意向验证 |

## 风险与控制

| 风险 | 控制方式 |
|---|---|
| `app.js` 继续膨胀 | 只在必要节点挂接，纯函数放独立模块 |
| AI 宣传过度 | 公开文案坚持 conservative AI 和 human decision |
| 中文源支持被过度承诺 | 明确“已支持、部分支持、计划支持”和测试样例 |
| 商业化过早影响信任 | 保留本地免费核心能力，先验证付费层 |
| 审计字段不稳定 | 先冻结最小字段，再做扩展字段 |
