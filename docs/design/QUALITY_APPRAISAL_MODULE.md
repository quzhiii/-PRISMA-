# Quality Appraisal Module Design

Last updated: 2026-04-28

## 1. 设计目标

质量评价模块的目标是把纳入研究从“筛选完成”推进到“可进入正式证据整理”的状态。它不应默认自动判断质量高低，而应提供模板、字段、判断选项、备注和导出结构。

原则：

- 质量评价是主流程的一部分，不是尾部附加说明。
- AI 可以辅助解释条目，但不能默认给最终质量评级。
- 质量评价结果应能进入最终报告、CSV 和 evidence table。
- 所有质量评价创建、修改、完成动作应写入 audit event。

## 2. 当前实现基线

V2.2 已有：

- Step 5 质量评价入口。
- `quality-engine.js`。
- 质量评价队列。
- 研究设计建议。
- 工具族建议。
- 证据等级基线。
- 质量评价相关 audit event hooks。

当前不足：

- 缺正式模板 schema。
- 缺每类研究设计的条目级字段。
- 缺正式 `quality_appraisal.csv`。
- 缺 evidence table。
- 缺 GRADE summary。

## 3. 模板 schema

每个模板至少包含：

| 字段 | 说明 |
|---|---|
| `template_id` | 模板 ID |
| `study_type` | 研究类型 |
| `recommended_tool_family` | 推荐工具族 |
| `required_fields` | 必填字段 |
| `judgement_options` | 判断选项 |
| `domains` | 评价维度 |
| `notes` | 使用说明 |
| `export_format` | 导出列定义 |
| `version` | 模板版本 |

推荐判断选项：

```text
low_risk
some_concerns
high_risk
unclear
not_applicable
not_assessed
```

## 4. 优先模板

### 4.1 RCT

| 项 | 设计 |
|---|---|
| `study_type` | `rct` |
| `recommended_tool_family` | RoB 2 |
| `required_fields` | randomization、allocation concealment、blinding、missing data、outcome measurement、selective reporting |
| `judgement_options` | low_risk、some_concerns、high_risk、unclear、not_applicable |
| `notes` | 不根据摘要自动判定，允许标记“需要全文确认” |
| `export_format` | per-domain judgement、overall judgement、supporting quote、reviewer note |

### 4.2 Cohort study

| 项 | 设计 |
|---|---|
| `study_type` | `cohort` |
| `recommended_tool_family` | ROBINS-I / Newcastle-Ottawa Scale |
| `required_fields` | cohort selection、exposure measurement、comparability、outcome assessment、follow-up adequacy |
| `judgement_options` | low_risk、some_concerns、high_risk、unclear、not_applicable |
| `notes` | 允许记录 prospective / retrospective |
| `export_format` | domain scores、overall judgement、confounding notes |

### 4.3 Case-control study

| 项 | 设计 |
|---|---|
| `study_type` | `case_control` |
| `recommended_tool_family` | Newcastle-Ottawa Scale / JBI |
| `required_fields` | case definition、control selection、exposure ascertainment、matching、non-response |
| `judgement_options` | low_risk、some_concerns、high_risk、unclear、not_applicable |
| `notes` | 重点记录病例和对照来源 |
| `export_format` | domain judgement、overall judgement、selection notes |

### 4.4 Cross-sectional study

| 项 | 设计 |
|---|---|
| `study_type` | `cross_sectional` |
| `recommended_tool_family` | JBI checklist / AXIS |
| `required_fields` | sampling frame、sample size、measurement validity、confounders、response rate |
| `judgement_options` | low_risk、some_concerns、high_risk、unclear、not_applicable |
| `notes` | 适合调查、患病率、横断面相关性研究 |
| `export_format` | item judgement、overall judgement、measurement notes |

### 4.5 Diagnostic accuracy study

| 项 | 设计 |
|---|---|
| `study_type` | `diagnostic_accuracy` |
| `recommended_tool_family` | QUADAS-2 |
| `required_fields` | patient selection、index test、reference standard、flow and timing |
| `judgement_options` | low_risk、some_concerns、high_risk、unclear、not_applicable |
| `notes` | 区分 risk of bias 和 applicability concerns |
| `export_format` | bias domains、applicability domains、overall judgement |

### 4.6 Systematic review

| 项 | 设计 |
|---|---|
| `study_type` | `systematic_review` |
| `recommended_tool_family` | AMSTAR 2 / ROBIS |
| `required_fields` | protocol、search strategy、study selection、data extraction、risk of bias、synthesis method、publication bias |
| `judgement_options` | low_risk、some_concerns、high_risk、unclear、not_applicable |
| `notes` | 适合 umbrella review 或方法学引用质量判断 |
| `export_format` | critical domains、overall confidence、reviewer note |

## 5. QualityAssessmentRecord

| 字段 | 说明 |
|---|---|
| `assessment_id` | 评价记录 ID |
| `project_id` | 项目 ID |
| `record_id` | 文献记录 ID |
| `study_type` | 研究类型 |
| `template_id` | 模板 ID |
| `tool_family` | 工具族 |
| `domains` | 条目级评价 |
| `overall_judgement` | 总体判断 |
| `supporting_quotes` | 支持性原文或页码 |
| `reviewer_id` | 评价者 |
| `status` | `queued | in_progress | complete | needs_full_text` |
| `notes` | 备注 |
| `updated_at` | 更新时间 |

## 6. Workflow

1. 全文复核后，最终纳入记录进入质量评价队列。
2. 系统根据字段和关键词给出 study type suggestion。
3. 用户选择或确认 study type。
4. 系统推荐 tool family 和 template。
5. 用户逐域填写 judgement、supporting quote 和 notes。
6. 完成后生成 `QualityAssessmentRecord`。
7. 导出 `quality_appraisal.csv` 和后续 evidence table。
8. 每次创建、修改、完成都写入 audit event。

## 7. Export design

### 7.1 quality_appraisal.csv

推荐列：

```text
assessment_id,record_id,title,study_type,tool_family,template_id,domain,judgement,supporting_quote,reviewer_note,overall_judgement,status,updated_at
```

### 7.2 evidence_table.csv

推荐列：

```text
record_id,title,authors,year,study_design,population,intervention,comparison,outcome,effect_measure,effect_estimate,quality_judgement,certainty_of_evidence,notes
```

### 7.3 report summary

报告中应包含：

- 纳入研究数量。
- 已完成质量评价数量。
- 未完成数量。
- 各 study type 数量。
- 各 overall judgement 数量。
- 需要人工补全文信息的记录。

## 8. AI 边界

AI 可做：

- 解释质量评价条目的含义。
- 根据摘要建议可能的 study type。
- 提示缺失字段。
- 草拟 reviewer note。

AI 不可做：

- 默认给最终质量评级。
- 在没有全文的情况下假定随机化、盲法或随访质量。
- 覆盖人工 judgement。
- 隐藏或删除人工备注。

## 9. Audit integration

事件类型：

| event_type | 触发点 |
|---|---|
| `quality_appraisal_queued` | 纳入记录进入质量队列 |
| `quality_template_selected` | 用户选择模板 |
| `quality_domain_updated` | 条目级 judgement 修改 |
| `quality_overall_judgement_updated` | 总体判断修改 |
| `quality_appraisal_completed` | 完成评价 |
| `quality_export_generated` | 导出质量评价结果 |

## 10. 后续版本建议

| 版本 | 建议 |
|---|---|
| V2.4-alpha | 实现模板 schema 和 `quality_appraisal.csv` |
| V2.4-beta | 实现 evidence table |
| V2.4 | 增加 GRADE summary |
| V2.5 | 双人质量评价冲突处理 |
| V2.6 | AI 解释和缺失字段提示，不做自动评级 |
