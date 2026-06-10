# PRISMA Workbench 产品定位说明

Last updated: 2026-06-07

## 1. 项目一句话定位

PRISMA Workbench 是一个面向系统综述、Meta 分析与证据整合项目的本地优先、可审计、保守型 AI 增强文献筛选工作台。

英文定位：

> PRISMA Workbench is a local-first, audit-ready evidence screening workstation for systematic reviews, meta-analyses, and evidence synthesis, designed for conservative AI assistance rather than black-box automation.

## 2. 项目不是什么

PRISMA Workbench 当前不定位为：

- 通用 AI 文献综述生成器
- 一键自动完成系统综述的平台
- 替代双人复核或方法学判断的 AI 工具
- 云端协作、账号、支付和机构权限系统
- 只负责画 PRISMA 流程图的小工具

项目的核心价值不是“自动替研究者做决定”，而是把导入、去重、规则筛选、人工复核、质量评价、PRISMA 2020 导出和审计证据链放在一个本地浏览器工作流中。

## 3. 核心用户

| 用户 | 典型需求 |
|---|---|
| 医学、护理、公卫、管理学研究生 | 低成本完成系统综述或 Meta 分析的文献筛选和 PRISMA 输出 |
| 医院、科研团队、课题组 | 在本地处理多数据库导出，并保留筛选过程证据 |
| 循证医学和卫生政策研究者 | 需要保守去重、排除理由、质量评价和可复核导出 |
| 中文数据库使用者 | 处理 CNKI、万方、维普、SinoMed、PubMed、RIS、RDF 等混合来源 |
| 方法学或软件论文作者 | 需要测试、benchmark、audit-ready 数据结构和可解释的开源工具链 |

## 4. 核心场景

1. 研究者从 PubMed、Web of Science、Embase、CNKI、万方、维普、SinoMed 或 Zotero 导出文献记录。
2. 工具在浏览器本地完成字段识别、格式归一、保守去重和候选重复提示。
3. 研究者配置纳入、排除和保护规则，生成标题/摘要阶段初筛结果。
4. 研究者人工完成全文复核，记录排除理由和备注。
5. 纳入研究进入质量评价队列，形成研究设计和证据等级基线。
6. 工具导出 PRISMA 2020 图、结果表、筛选报告、V2.5 审计包、双审冲突证据和本地历史回溯数据。
7. V2.6 Conservative AI foundation 已完成本地建议、排序、不确定样本提示和报告辅助基础层；AI 仍只提供 advisory 辅助，最终决定仍由人类确认。

## 5. 核心差异化

### 5.1 Local-first

默认运行在静态网页和浏览器本地存储中。研究数据不需要默认上传到服务器，适合处理尚未公开或不方便进入云端的课题资料。

### 5.2 Audit-ready

V2.2 开始把筛选过程建模为 `ProjectManifest`、`AuditEvent` 和 `ScreeningDecision`。PRISMA counts 不只来自界面统计，还应能从决策和事件数据重算。

### 5.3 Quality appraisal

质量评价不是尾部附加项，而是六步工作流中的正式阶段。V2.4 已完成质量评价模板、条目级质量表单、`quality_appraisal.csv`、`evidence_table.csv` 和 `grade_summary.csv`，最终质量判断仍由人工控制。

### 5.4 Chinese-source compatibility

项目明确把中文数据库、多源脏数据和双语字段归一作为产品特色，而不是只服务英文数据库导出。近期重点是 CNKI RDF、万方、维普、SinoMed 字段映射和中文摘要异常识别。

### 5.5 Conservative AI

AI 默认关闭。V2.6 foundation 完成后，AI 仍只作为建议层、排序层、不确定样本提示层和报告辅助层，不静默排除文献，不覆盖人工决定，并且必须进入审计日志和 PRISMA-trAIce 报告。

## 6. 与现有工具的差异

| 工具类型 | 常见优势 | PRISMA Workbench 的不同侧重点 |
|---|---|---|
| Rayyan / Covidence / DistillerSR | 协作、机构采购、完整项目管理 | 更强调本地优先、低部署、开源透明和中文源适配 |
| ASReview 等 active learning 工具 | AI 排序和主动学习 | 先建立审计数据模型和保守人工工作流，再引入 AI |
| 通用 AI 综述工具 | 生成速度快、交互自然 | 不承诺黑盒自动裁决，强调 AI 使用可报告、可复核 |
| PRISMA 图生成器 | 快速生成流程图 | 覆盖从导入到质量评价和审计包导出的完整证据链 |
| 表格/笔记手工流程 | 灵活、无工具门槛 | 提供统一字段、排除理由、决策日志和可重算 counts |

## 7. 当前版本边界

### 7.1 当前公开版本线

| 线 | 当前边界 |
|---|---|
| V2.5 dual-review closeout | 当前公开版本线：双人复核隔离、冲突队列、resolver workflow、agreement metrics、冲突证据导出和 unresolved conflict gate 已完成 |
| V2.5.1 project history rollback | 当前 patch line：本地历史快照、版本恢复、来源文件增减后的可恢复状态已合并到 `main` |

### 7.2 已完成能力切片

| 切片 | 当前边界 |
|---|---|
| Reviewer Bundle protocol | 已完成本地文件协作切片：collaboration seed package、reviewer decision bundle 和 merge import 已在 `literature-screening-v2.2/` 落地，不引入后端、账号或付费层 |
| V2.6 Conservative AI | 已完成 foundation slice：本地 advisory suggestions、prioritisation、uncertainty flags 和 prompt registry trace，Step 3 advisory queue、queue summary、priority sorting、review-state filters 和 empty-state clarity，以及 PRISMA-trAIce 和 audit summary queue summary；真实 AI provider 不默认启用 |
| V2.4 quality appraisal | 已完成稳定能力：质量评价模板、条目级质量表单、evidence table、GRADE summary；最终评级仍由人工控制 |
| V2.3 PRISMA-trAIce readiness | release-ready in `literature-screening-v2.2/` with AI mode, AI usage registry, AI suggestion log, human review trace fields, and `PRISMA_TRAICE_REPORT.md`; local mock pathway only, no real AI provider dispatch |
| V2.2 audit-ready | 已在 `literature-screening-v2.2/` 建立审计模型、事件 hooks、decision ledger 和审计包导出 |

### 7.3 下一阶段切片

| 切片 | 当前边界 |
|---|---|
| V2.7 Chinese-source reliability | 下一阶段 reliability slice：fixture-backed CNKI / Wanfang / VIP / SinoMed 字段映射、摘要截断 / 噪音 / 映射不完整提示；中文源可靠性是数据质量可见性层，不是自动筛选决策层 |

当前版本不包含真实 AI API、云端账号、支付系统、机构权限和默认上传。

## 8. 下一阶段产品判断

1. 公开表达优先统一为 PRISMA Workbench / local-first evidence screening workstation。
2. 当前公开基准以 `README.md` / `README_EN.md` 和 V2.5 工作台为准；V2.5.1 是当前 patch-line 能力，Reviewer Bundle protocol 与 V2.6 Conservative AI foundation 属于已完成能力切片。
3. V2.6 Conservative AI foundation 已完成：本地 advisory suggestions、prioritisation、uncertainty flags 和 prompt registry trace，Step 3 advisory queue controls，以及 PRISMA-trAIce 和 audit summary queue summary 已可审计；更远期 provider abstraction 扩展仍需单独规划，真实 AI provider 不默认启用。
4. V2.7 Chinese-source reliability 是下一阶段切片：中文源可靠性是数据质量可见性层，不是自动筛选决策层。
5. 商业化可以规划 open-core，但当前核心本地工作流继续保持免费和低门槛。

## 9. 可直接使用的公开文案

中文版：

> PRISMA Workbench 是一个面向系统综述、Meta 分析与证据整合场景的本地优先文献筛选工作台。它覆盖导入、去重、规则筛选、人工复核、质量评价与结果导出，并强调可审计、可解释和保守型 AI 辅助，而不是黑盒自动裁决。

English:

> PRISMA Workbench is a local-first evidence screening workstation for systematic reviews, meta-analyses, and evidence synthesis. It covers import, deduplication, screening, human review, quality appraisal, and export, with an emphasis on auditability, interpretability, and conservative AI assistance rather than black-box automation.
