# Conservative AI Design

Last updated: 2026-04-28

## 1. 设计目标

Conservative AI 的目标不是让 AI 替研究者完成系统综述，而是在不破坏 local-first、audit-ready 和人工最终判断的前提下，提供可关闭、可复核、可报告的辅助层。

核心原则：

- AI 默认关闭。
- AI 不静默排除文献。
- AI 不覆盖人工决定。
- AI 输出必须能被人工接受、拒绝或改写。
- AI 使用必须写入 audit ledger。
- AI 使用必须能导出 PRISMA-trAIce 透明报告。

## 2. 模式定义

| 模式 | 输入 | 输出 | 是否改变最终筛选结果 | 是否需要人工确认 | 是否写入 audit ledger |
|---|---|---|---|---|---|
| Manual only | 文献字段、规则、人工操作 | 人工决定 | 是，由人类直接决定 | 已由人工完成 | 是 |
| AI suggest only | title、abstract、criteria、可选上下文 | include/exclude/uncertain 建议、理由、confidence | 否 | 是 | 是 |
| AI prioritise + human decide | 文献字段、已有人工标签、规则 | 排序分数、优先处理列表 | 否 | 是 | 是 |
| AI uncertainty flagging | 文献字段、规则、已做决定 | 边界样本、冲突样本、低质量摘要提示 | 否 | 是 | 是 |
| AI audit report helper | audit events、decisions、usage registry | 方法附录草稿、使用说明、限制说明 | 否 | 是 | 是 |

## 3. Manual only

当前默认模式。

| 项 | 设计 |
|---|---|
| 输入 | 导入记录、筛选规则、人工复核操作 |
| 输出 | `ScreeningDecision` 和 `AuditEvent` |
| 数据边界 | 全部本地 |
| 最终结果 | 人工决定直接形成最终状态 |
| 报告 | PRISMA audit summary 中标注 `ai_mode = off` |

验收：

- No AI 模式必须覆盖完整工作流。
- 未使用 AI 时仍能导出明确的 No-AI statement。

## 4. AI suggest only

AI 对单条或一批记录给出建议，但不会改变最终 decision。

输入：

- 标题
- 摘要
- 年份、期刊、作者、DOI/PMID/CNKI ID
- 纳入/排除标准
- 可选：已归一化 study design

输出：

- `suggested_decision`: `include | exclude | uncertain`
- `rationale`
- `confidence`
- `criteria_matches`
- `risk_flags`

人工处理：

- 用户可接受、拒绝或改写。
- 接受建议时，系统写入新的人工 `ScreeningDecision`。
- 原始 AI 建议保留在 `AISuggestionEvent`。

## 5. AI prioritise + human decide

AI 只改变“处理顺序”，不改变最终结果。

输入：

- 记录字段
- 初筛规则
- 已有人类标注样本
- 去重和导入元数据

输出：

- `priority_score`
- `priority_reason`
- `recommended_queue`: likely relevant、uncertain、low priority

约束：

- 不能按低分自动排除。
- 排序依据必须导出。
- 用户可以关闭排序并回到原始导入顺序。

## 6. AI uncertainty flagging

AI 标记更需要人工关注的记录。

可标记：

- 摘要过短或疑似截断
- 中英文标题不一致
- 规则匹配冲突
- 研究设计不清
- 与人工规则相反的潜在纳入样本
- 去重候选但题名差异较大

输出：

- `flag_type`
- `flag_reason`
- `reviewer_action_required`

约束：

- flag 不能直接改变 include/exclude。
- flag 应进入 audit summary 的 unresolved risks。

## 7. AI audit report helper

AI 可以帮助整理方法附录或 PRISMA-trAIce 报告草稿，但只基于审计数据和用户批准的字段。

输入：

- project manifest
- event counts
- decision counts
- AI usage registry
- exclusion reason summary

输出：

- 方法说明草稿
- AI 使用范围说明
- 局限性说明
- 人工复核说明

约束：

- 不生成不存在的操作。
- 不补全缺失摘要。
- 不伪造模型性能。
- 报告草稿必须让用户确认。

## 8. 数据结构

### 8.1 AIUsageRegistry

| 字段 | 说明 |
|---|---|
| `usage_id` | 使用配置 ID |
| `project_id` | 项目 ID |
| `ai_mode` | `off | assistive | experimental` |
| `provider_type` | `none | local | user_provided_endpoint | hosted` |
| `provider_name` | 模型或服务名称 |
| `model_name` | 模型名 |
| `enabled_at` | 启用时间 |
| `disabled_at` | 关闭时间 |
| `allowed_stages` | 可用阶段 |
| `data_boundary` | local-only、hash-only、cloud-submitted 等 |
| `user_acknowledged` | 用户是否确认边界 |

### 8.2 AISuggestionEvent

| 字段 | 说明 |
|---|---|
| `suggestion_id` | 建议 ID |
| `project_id` | 项目 ID |
| `record_id` | 记录 ID |
| `stage` | 使用阶段 |
| `mode` | 建议模式 |
| `model_name` | 模型名 |
| `prompt_hash` | 提示词 hash |
| `input_hash` | 输入 hash |
| `input_summary` | 输入摘要，不保存敏感全文 |
| `suggested_decision` | AI 建议 |
| `rationale` | 理由 |
| `confidence` | 置信度 |
| `human_action` | `accepted | rejected | edited | ignored` |
| `linked_decision_id` | 人工确认后的 decision ID |
| `created_at` | 时间 |

## 9. Local model / cloud model 数据边界

| Provider | 默认状态 | 数据边界 |
|---|---|---|
| none | 默认 | 不调用模型 |
| local model | 未来可选 | 数据留在本机模型环境，仍记录模型名和版本 |
| user provided endpoint | 未来可选 | 用户显式配置 endpoint，manifest 记录边界 |
| hosted service | 后置 | 需要账号、隐私、费用和机构合规设计后再考虑 |

当前版本禁止默认启用云模型。

## 10. PRISMA-trAIce 报告内容

V2.3 报告应至少包含：

- 是否使用 AI
- 使用哪些工具和模型
- AI 用于哪些环节
- 输入给 AI 的信息类型
- AI 输出如何被人工复核
- AI 建议数量
- AI 建议采纳率
- AI 与人工最终决定冲突率
- 未使用 AI 的环节
- 局限性和责任说明

## 11. 不做事项

当前不做：

- 真实 AI API 默认接入
- 默认上传记录或摘要
- 自动排除低分记录
- 自动替代双人复核
- 自动生成最终纳入/排除结论
- 伪造缺失摘要或全文信息
