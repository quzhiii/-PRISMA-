# PRISMA Workbench 2026 Roadmap

Last updated: 2026-04-28

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
| V2.1 stable | 当前稳定演示路径 | `literature-screening-v2.0/` |
| V2.2 audit-ready | 当前开发主线 | `literature-screening-v2.2/` |

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

| 任务 | 产物 |
|---|---|
| AI mode | `off | assistive | experimental` |
| AI usage registry | 记录工具、用途、数据边界、启用时间 |
| AI suggestion log | 记录建议、理由、置信度、输入/提示 hash、人工处理结果 |
| Mock AI suggestion pathway | 用本地 mock 数据验证 AI 建议必须人工确认 |
| PRISMA-trAIce report | `PRISMA_TRAICE_REPORT.md` |
| No-AI report | 未使用 AI 时也能导出透明声明 |

验收标准：

- No AI 模式完整可用。
- AI 建议不会直接写入最终 `ScreeningDecision`。
- 接受 AI 建议时生成的是人工确认事件。
- 报告能说明 AI 在哪里使用、如何复核、有哪些限制。

## P3：V2.4 质量评价与 evidence table

目标：把质量评价从“队列和建议”推进到可正式导出的结构化模块。

| 任务 | 说明 |
|---|---|
| Template schema | RCT、cohort、case-control、cross-sectional、diagnostic accuracy、systematic review |
| Tool family mapping | RoB 2、ROBINS-I、NOS、JBI、QUADAS-2、AMSTAR 2 等 |
| Evidence table | PICOS、效果量、结局、风险偏倚、证据等级 |
| Quality export | `quality_appraisal.csv`、`evidence_table.csv` |
| Audit integration | 质量评价创建、修改、完成都写入 audit event |

不做事项：

- 不让 AI 默认给最终质量评级。
- 不提前实现复杂图形输出。

## P4：V2.5 双人复核与冲突解决

目标：让双人复核从“可用入口”变成可审计的正式流程。

| 任务 | 说明 |
|---|---|
| Reviewer isolation | 主审、副审决策隔离存储 |
| Conflict queue | 纳入/排除/不确定/质量评价冲突集中处理 |
| Resolver workflow | 第三方或主审确认最终决定 |
| Agreement metrics | Kappa、percent agreement、分阶段一致性 |
| Export gate | 未解决冲突时提示风险或阻止最终导出 |

## P5：V2.6 Conservative AI screening

目标：引入 AI 建议和排序，但保持人类最终决定。

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
