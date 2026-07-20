# 公开 Demo 样例交付指南

本指南说明如何使用公开模拟数据生成和核验一套 `PRISMA 项目体检 / 迁移 / 审计包` 样例交付包。该样例只用于说明交付结构、证据边界和复核流程，不含真实客户数据，也不代表真实客户案例或真实项目效果。

## 标准生成方式

Public Demo 已有可重复生成脚本。标准命令为：

```text
node scripts/generate-public-demo-delivery.mjs <output-directory>
```

生成要求：

- `<output-directory>` 必须位于仓库之外。
- 旧版本交付包为只读，不得覆盖、删除或在其子目录下生成新包。
- 生成脚本会在写入正式输出前运行 preflight 测试。
- 生成脚本使用 sibling staging 目录，校验通过后再发布到最终目录。
- `09_OUTPUT_MANIFEST.md` 和 `GENERATION_RECORD.json` 会记录实际文件大小、SHA256、输入哈希、生成器哈希和测试状态。
- 该脚本只用于公开模拟 Demo，不是通用客户项目处理器。
- 真实项目不得直接复用 Demo 的筛选规则、数字、判断、截图或方法附录。

## 公开资产来源

样例只能基于以下公开资产，不得混入真实客户资料：

- `literature-screening-v2.2/sample-data.json`
- `docs/demo/README.md`
- `docs/templates/audit-appendix-template.md`
- `docs/templates/database-export/README.md`
- `dedup-engine.js`
- `literature-screening-v2.2/audit-engine.js`
- `literature-screening-v2.2/dual-review-engine.js`
- `tests/demo/public-demo-consistency.test.mjs`
- `tests/demo/public-demo-generator.test.mjs`
- `tests/audit/audit-export.test.mjs`

其中 `sample-data.json` 是公开模拟数据；`docs/demo/README.md` 说明数据来源、推荐筛选规则和演示路径；本地 engine 与测试文件提供可复核的生成证据。

## 样例交付目录

生成后的样例交付包采用以下结构：

```text
public-demo-v2.x/
- 00_README.md
- 00_INPUT_MANIFEST.md
- 01_PROJECT_HEALTH_CHECK.md
- 02_IMPORT_QUALITY_SUMMARY.md
- 03_DEDUP_REVIEW.md
- 04_PRISMA_COUNTS.md
- 05_DUAL_REVIEW_SUMMARY.md
- 06_DEFENSE_AUDIT_PACK.md
- 07_METHODS_APPENDIX_DRAFT.md
- 08_HANDOFF_NOTES.md
- 09_OUTPUT_MANIFEST.md
- 10_LIMITATIONS.md
- 11_CUSTOMER_ACCEPTANCE.md
- GENERATION_RECORD.json
- evidence/
```

所有文件顶部必须标注：

```text
本样例使用 PRISMA Workbench 公开模拟数据生成，不含真实客户数据，不代表真实客户案例或真实项目效果。
```

## 每个文件解决什么客户问题

| 文件 | 客户问题 | 主要来源 | 需要人工确认的边界 |
|---|---|---|---|
| `00_README.md` | 快速理解交付包结构和阅读顺序。 | 生成脚本、公开 demo 说明 | 标注模拟数据、范围和不可外推限制。 |
| `00_INPUT_MANIFEST.md` | 说明样例输入是什么。 | `sample-data.json`、实际文件大小和 SHA256 | 不得列出真实客户文件。 |
| `01_PROJECT_HEALTH_CHECK.md` | 说明公开 demo 的字段、去重、筛选和审计风险。 | demo 数据、导入摘要、筛选状态摘要 | 只解释公开 demo 风险，不得写成真实项目结论。 |
| `02_IMPORT_QUALITY_SUMMARY.md` | 展示数据库导出字段质量边界。 | `sample-data.json`、导入质量提示 | 解释 CNKI、Wanfang、VIP、SinoMed、PubMed 的字段质量提示。 |
| `03_DEDUP_REVIEW.md` | 展示硬重复和候选重复的处理边界。 | 当前 DedupEngine 输出 | 候选重复必须人工确认，不能自动删除。 |
| `04_PRISMA_COUNTS.md` | 解释 PRISMA 图里的数字来源。 | AuditEngine counts、筛选决策和审计事件 | 不得手填或伪造数字；真实项目必须重新生成。 |
| `05_DUAL_REVIEW_SUMMARY.md` | 展示双审 agreement 和 conflict queue 结构。 | DualReviewEngine exports | 当前公开 Demo paired decisions 为 0；不得伪造 reviewer A/B 数据。 |
| `06_DEFENSE_AUDIT_PACK.md` | 展示答辩 / 方法附录可复查证据结构。 | AuditEngine Defense-ready Audit Pack builder | 只使用工具真实输出和明确包装文本，不得改写成客户案例。 |
| `07_METHODS_APPENDIX_DRAFT.md` | 展示方法附录草稿结构。 | `docs/templates/audit-appendix-template.md`、公开 demo counts | 真实项目必须重新填写数据库、日期、规则、限制和确认事项。 |
| `08_HANDOFF_NOTES.md` | 说明下一步需要确认什么。 | 生成脚本整理的风险清单 | 标明候选重复、全文复核、双审和质量评价仍需真实项目生成。 |
| `09_OUTPUT_MANIFEST.md` | 列出交付包包含哪些输出。 | 生成脚本实际扫描输出文件 | 记录每个文件的来源分类、engine_api、大小和 SHA256。 |
| `10_LIMITATIONS.md` | 防止样例被误认为真实客户效果。 | 本指南和公开 demo 边界 | 写清公开模拟数据、未生成全文复核、质量评价和最终纳入。 |
| `11_CUSTOMER_ACCEPTANCE.md` | 展示真实项目验收字段结构。 | 验收字段模板 | 当前公开 Demo 没有客户签收、付款、返工或删除证据。 |
| `GENERATION_RECORD.json` | 记录生成命令、测试状态和关键哈希。 | 生成脚本、Git、本地测试 | 证明样例可重复生成，但不证明真实项目商业效果。 |
| `evidence/` | 保存支撑文件。 | 工具输出、生成脚本汇总、结构示例 | 明确哪些是 engine 包装输出、脚本派生、模板或结构示例。 |

## Manifest、限制说明和验收文件

### 输入 manifest

`00_INPUT_MANIFEST.md` 应列出公开 demo 输入文件，不得列出真实客户文件。关键字段包括：

| 字段 | 说明 |
|---|---|
| input_id | 如 `demo-input-001` |
| 文件别名 | 如 `public-demo-sample-data` |
| 来源路径 | `literature-screening-v2.2/sample-data.json` |
| 数据性质 | 公开模拟数据 |
| 记录数 | 必须来自公开 demo 或重新计算，不得手填猜测 |
| 文件大小 | 生成脚本按实际文件记录 |
| SHA256 | 生成脚本按实际文件记录 |
| 使用范围 | 样例展示，不代表真实客户案例 |

### 输出 manifest

`09_OUTPUT_MANIFEST.md` 应列出样例交付包中的每个输出，说明来源和人工确认边界。关键字段包括：

| 字段 | 说明 |
|---|---|
| 文件名 | 交付包内相对路径 |
| 来源类型 | `engine_output_wrapped` / `generator_derived` / `human_authored_template` / `structure_example` |
| engine_api | 相关本地 engine API；无直接 API 时留空 |
| 文件大小 | 生成脚本按实际输出文件记录 |
| SHA256 | 生成脚本按实际输出文件记录 |
| 是否含模拟数据 | 是 / 否 |
| 是否需要真实项目重新生成 | 是 |
| 客户确认点 | 真实项目中需要客户确认的判断 |

### 限制说明

`10_LIMITATIONS.md` 必须说明：

- 样例使用公开模拟数据，不是客户案例。
- 样例只展示交付结构，不证明真实项目一定可按同样耗时、质量或成本完成。
- 实现和回归测试证据说明当前代码路径有覆盖，不等同方法学有效性、市场验证或真实客户验收。
- PRISMA counts、冲突数、质量评价状态等数字在真实项目中必须重新生成。
- 样例不包含真实付款、客户满意度、转化率或机构认可。

### 客户验收文件

`11_CUSTOMER_ACCEPTANCE.md` 只作为真实项目验收字段示例。当前公开 Demo 不填写真实客户签收、付款、返工或删除证据。

## 内容来自哪些已有工具输出

- 导入与字段质量：来自导入摘要、source database 字段和中文源可靠性 warning。
- 去重风险：来自硬重复、候选重复和对应记录对比。
- PRISMA counts：来自决策和审计事件重算结果。
- 双审摘要：来自 `dual_review_conflicts.csv` 和 `dual_review_agreement.json` 的结构化输出；公开 Demo paired decisions 为 0。
- Defense-ready Audit Pack：来自 AuditEngine 的 Defense-ready Audit Pack builder，并加上公开 demo 边界说明。
- 方法附录草稿：来自 `docs/templates/audit-appendix-template.md` 与公开 demo counts，需要真实项目重新改写。

## 哪些内容需要人工补充

- 研究主题背景和 PICO/PICOS。
- 为什么选择某些纳入、排除和保护规则。
- 候选重复是否合并或保留的解释。
- 双审冲突的 resolver 结论和理由。
- 质量评价 judgement、supporting quote、页码和最终确认。
- 方法附录中的真实数据库、检索日期和流程描述。
- 交接说明中的风险、限制和下一步。

## 哪些数字不能伪造

- 导入记录数。
- 来源数据库分布。
- 硬重复数和候选重复数。
- PRISMA counts。
- 全文排除数和最终纳入数。
- 双审冲突数、未解决冲突数、percent agreement、Cohen's kappa。
- 质量评价完成数、缺失数和 GRADE summary 行数。
- AI 建议数和人工处理状态。

如果 demo 没有实际生成某类数字，必须写成“结构示例”或“待真实项目生成”，不能填入看起来真实的数字。

## 如何标注公开模拟数据

所有样例文件、截图和说明都应包含以下之一：

- “公开模拟数据，不含真实客户资料”。
- “仅用于演示交付结构，不代表真实客户案例”。
- “数字来自公开 demo 或结构示例，真实项目必须重新生成”。

不要使用“客户案例”“真实项目结果”“已验证效果”等表达，除非获得真实客户授权并完成脱敏审查。

## 哪些截图可以私发

可以私发的截图：

- 使用公开 demo 的导入摘要。
- 使用公开 demo 的中文源可靠性提示。
- 使用公开 demo 的去重候选示例。
- 使用公开 demo 的 PRISMA counts 或流程图。
- 使用公开 demo 的 Defense-ready Audit Pack 片段。
- 样例目录结构截图。

截图必须遮挡本地绝对路径、个人用户名、运行环境隐私信息和任何非公开文件名。

## 如何避免样例被误认为真实客户案例

- 文件名和正文都使用 `sample`、`demo`、`公开模拟数据`。
- 不写“某医院”“某课题组”“某客户”等暗示真实客户的描述。
- 不写付款、转化率、客户满意度或真实使用结果。
- 不把公开 demo 数字包装成真实项目表现。
- 私发时说明：这是用于理解交付物结构的样例，不是商业效果证明。

## 真实项目交付时必须重新生成的内容

- 导入质量摘要。
- 去重结果和候选重复清单。
- PRISMA counts。
- screening decisions、exclusion reasons 和 audit events。
- 双审冲突和 agreement 摘要。
- Defense-ready Audit Pack。
- 方法附录草稿。
- handoff notes。
- validation record。

真实项目不得复用 demo 数字、demo 冲突、demo 截图或 demo 方法附录作为客户结果。

## 样例交付建议流程

1. 阅读 `docs/demo/README.md`，确认 demo 数据结构和推荐筛选规则。
2. 运行 `node scripts/generate-public-demo-delivery.mjs <output-directory>`，且输出路径必须位于仓库之外。
3. 核对 `GENERATION_RECORD.json` 中的 preflight 测试状态、输入 SHA256、生成器 SHA256 和 Manifest SHA256。
4. 核对 `09_OUTPUT_MANIFEST.md` 中每个输出文件的来源类型、engine_api、文件大小和 SHA256。
5. 检查 `05_DUAL_REVIEW_SUMMARY.md` 和 `06_DEFENSE_AUDIT_PACK.md` 是否明确说明 paired decisions 为 0，且 export gate clear 不代表双审完成。
6. 确认 `10_LIMITATIONS.md` 没有将公开 demo 描述为真实客户案例或商业效果证明。
7. 只私发必要截图或 PDF/Markdown 片段，不发布为官网案例。
