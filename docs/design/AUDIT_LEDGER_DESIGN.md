# Audit Ledger Design

Last updated: 2026-04-28

## 1. 设计目标

Audit ledger 的目标是让系统综述筛选过程可以被复核、重算和导出，而不是只依赖页面当前统计。

它需要回答：

- 一条记录从哪个来源进入项目？
- 字段如何被标准化？
- 是否被判定为硬重复或候选重复？
- 在标题/摘要、全文、质量评价阶段发生了什么？
- 最终纳入或排除的人工决定是什么？
- 排除理由、审稿人、冲突状态是否可追溯？
- 如果未来使用 AI，AI 在哪里参与、输出什么、是否被人工采纳？
- 最终 PRISMA counts 是否能从 durable data 重算？

## 2. 当前实现基线

V2.2 已新增：

- `literature-screening-v2.2/audit-engine.js`
- `ProjectManifest`
- `AuditEvent`
- `ScreeningDecision`
- IndexedDB audit stores
- workflow event hooks
- audit package export

当前审计包包括：

- `project_manifest.json`
- `events.jsonl`
- `screening_decisions.csv`
- `exclusion_reasons.csv`
- `prisma_counts.json`
- `audit_summary.md`

本文档定义下一步要稳定的字段和边界。

## 3. 核心实体

### 3.1 ProjectManifest

项目级 manifest 保存审计包的上下文。

| 字段 | 类型 | 说明 |
|---|---|---|
| `project_id` | string | 本地项目 ID |
| `project_name` | string | 用户可读项目名 |
| `created_at` | ISO datetime | 项目创建时间 |
| `updated_at` | ISO datetime | 最近更新时间 |
| `app_version` | string | 应用版本，如 `v2.2` |
| `audit_schema_version` | string | 审计 schema 版本 |
| `prisma_version` | string | PRISMA 标准版本，默认 `PRISMA 2020` |
| `ai_mode` | string | `off | assistive | experimental`，当前默认 `off` |
| `data_residency` | string | 默认 `local_browser` |
| `export_generated_at` | ISO datetime | 审计包生成时间 |

### 3.2 AuditEvent

事件日志记录“发生过什么”。

| 字段 | 类型 | 说明 |
|---|---|---|
| `event_id` | string | 事件 ID |
| `project_id` | string | 项目 ID |
| `record_id` | string/null | 关联记录 ID |
| `event_type` | string | 事件类型 |
| `stage` | string | `import | dedup | title_abstract | full_text | quality | export | ai` |
| `timestamp` | ISO datetime | 事件发生时间 |
| `actor_id` | string | 用户、系统或未来 reviewer ID |
| `source_file` | string/null | 来源文件名 |
| `source_database` | string/null | 来源数据库 |
| `payload` | object | 事件详情 |
| `previous_value` | object/null | 可选，变更前值 |
| `new_value` | object/null | 可选，变更后值 |

事件类型最小集合：

| `event_type` | 阶段 | 说明 |
|---|---|---|
| `record_imported` | import | 单条或批量导入记录 |
| `field_normalized` | import | 字段映射或归一化 |
| `hard_duplicate_removed` | dedup | 硬重复自动移除 |
| `candidate_duplicate_flagged` | dedup | 候选重复进入人工复核 |
| `rule_screening_decision` | title_abstract | 规则筛选结果 |
| `manual_screening_decision` | title_abstract/full_text | 人工纳入、排除、不确定 |
| `exclusion_reason_changed` | full_text | 排除理由设置或修改 |
| `review_conflict_detected` | full_text | 双人复核冲突 |
| `review_conflict_resolved` | full_text | 冲突最终解决 |
| `quality_appraisal_started` | quality | 进入质量评价队列 |
| `quality_appraisal_updated` | quality | 质量评价字段更新 |
| `export_generated` | export | 生成 PRISMA、报告或审计包 |
| `ai_suggestion_created` | ai | 未来 AI 建议事件 |
| `ai_suggestion_reviewed` | ai | 未来 AI 建议人工处理事件 |

### 3.3 ScreeningDecision

Decision ledger 记录“当前可重算的筛选决定”。

| 字段 | 类型 | 说明 |
|---|---|---|
| `decision_id` | string | 决策 ID |
| `project_id` | string | 项目 ID |
| `record_id` | string | 记录 ID |
| `source_file` | string | 来源文件 |
| `source_database` | string | 来源数据库 |
| `screening_stage` | string | `title_abstract | full_text | quality | final` |
| `human_decision` | string | `include | exclude | uncertain | not_started` |
| `exclusion_reason` | string/null | 标准排除理由 |
| `reviewer_id` | string | 主审、副审或 resolver |
| `conflict_status` | string | `none | pending | resolved` |
| `quality_appraisal_status` | string | `not_started | queued | in_progress | complete` |
| `ai_assistance_used` | boolean | 是否使用 AI 辅助 |
| `ai_model` | string/null | AI 模型名，默认空 |
| `ai_prompt_hash` | string/null | 提示词 hash |
| `ai_output_summary` | string/null | AI 输出摘要，不保存敏感全文 |
| `final_export_status` | string | `not_exported | included | excluded | warning` |
| `updated_at` | ISO datetime | 最近更新时间 |

## 4. 字段归一和来源信息

每条记录应尽量保留以下来源上下文：

| 字段 | 说明 |
|---|---|
| `record_id` | 应用内部稳定 ID |
| `source_file` | 导入文件名 |
| `source_database` | PubMed、CNKI、Wanfang、VIP、SinoMed、WoS、Zotero 等 |
| `source_format` | CSV、TSV、RIS、ENW、BibTeX、RDF、TXT、NBIB |
| `import_time` | 导入时间 |
| `normalized_fields` | title、abstract、authors、year、journal、doi、pmid、cnki_id 等字段映射结果 |
| `raw_field_keys` | 原始字段名列表，可用于 debug |

原则：

- 不在 audit event 中复制完整大段全文。
- 可以保存字段 hash、长度、来源和归一化结果。
- 导出 CSV 时字段保持扁平；导出 JSON/JSONL 时允许嵌套 payload。

## 5. PRISMA counts 重算规则

PRISMA counts 应优先从 `ScreeningDecision` 和关键 `AuditEvent` 重算。

| Count | 数据来源 |
|---|---|
| records_identified | import events 或 imported records |
| duplicates_removed | hard duplicate events |
| records_screened | title/abstract decision records |
| records_excluded | title/abstract exclude decisions |
| reports_sought | full-text stage candidate records |
| reports_not_retrieved | full-text exclusion reason `not_full_text_available` |
| reports_assessed | full-text reviewed records |
| reports_excluded | full-text exclude decisions |
| studies_included | final include decisions |

风险：

- 如果历史项目缺失 decision ledger，只能从 runtime snapshot 回填。
- 双人复核冲突未解决时，不应生成无警告的最终 counts。

## 6. 导出格式

### 6.1 JSONL event log

`events.jsonl` 每行一个 `AuditEvent`。适合重放、diff 和外部审计。

### 6.2 CSV decision ledger

`screening_decisions.csv` 使用扁平列，便于 Excel、R、Python 和人工查看。

推荐列顺序：

```text
decision_id,project_id,record_id,source_file,source_database,screening_stage,human_decision,exclusion_reason,reviewer_id,conflict_status,quality_appraisal_status,ai_assistance_used,ai_model,ai_prompt_hash,ai_output_summary,final_export_status,updated_at
```

### 6.3 Markdown summary

`audit_summary.md` 面向研究者和审稿人，说明：

- 项目信息
- 审计 schema
- 事件数量
- 决策数量
- PRISMA counts
- unresolved risks
- AI mode
- 导出时间

## 7. 数据边界

- 默认全部在浏览器本地生成。
- 不要求后端。
- 不默认上传审计包。
- AI 相关字段默认为空。
- 未来云端或模型调用必须在 manifest 中显式记录。

## 8. 下一步实现建议

1. 冻结 V2.2 `screening_decisions.csv` 最小列。
2. 为每个 `event_type` 增加测试样例。
3. 增加旧项目 snapshot 到 decision ledger 的 best-effort backfill。
4. 在 Step 6 UI 说明审计包文件用途。
5. V2.3 新增 AI usage registry 时只扩展字段，不破坏 V2.2 导出。
