# PRISMA Workbench 产品定位说明

Last updated: 2026-04-28

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
6. 工具导出 PRISMA 2020 图、结果表、筛选报告和 V2.2 审计包。
7. 未来如启用 AI，AI 只提供建议、排序、不确定样本提示和报告辅助，最终决定仍由人类确认。

## 5. 核心差异化

### 5.1 Local-first

默认运行在静态网页和浏览器本地存储中。研究数据不需要默认上传到服务器，适合处理尚未公开或不方便进入云端的课题资料。

### 5.2 Audit-ready

V2.2 开始把筛选过程建模为 `ProjectManifest`、`AuditEvent` 和 `ScreeningDecision`。PRISMA counts 不只来自界面统计，还应能从决策和事件数据重算。

### 5.3 Quality appraisal

质量评价不是尾部附加项，而是六步工作流中的正式阶段。当前已提供质量评价队列、研究设计建议、工具族建议和证据等级基线，后续补模板和 evidence table。

### 5.4 Chinese-source compatibility

项目明确把中文数据库、多源脏数据和双语字段归一作为产品特色，而不是只服务英文数据库导出。近期重点是 CNKI RDF、万方、维普、SinoMed 字段映射和中文摘要异常识别。

### 5.5 Conservative AI

AI 默认关闭。未来 AI 只作为建议层、排序层、不确定样本提示层和报告辅助层，不静默排除文献，不覆盖人工决定，并且必须进入审计日志和 PRISMA-trAIce 报告。

## 6. 与现有工具的差异

| 工具类型 | 常见优势 | PRISMA Workbench 的不同侧重点 |
|---|---|---|
| Rayyan / Covidence / DistillerSR | 协作、机构采购、完整项目管理 | 更强调本地优先、低部署、开源透明和中文源适配 |
| ASReview 等 active learning 工具 | AI 排序和主动学习 | 先建立审计数据模型和保守人工工作流，再引入 AI |
| 通用 AI 综述工具 | 生成速度快、交互自然 | 不承诺黑盒自动裁决，强调 AI 使用可报告、可复核 |
| PRISMA 图生成器 | 快速生成流程图 | 覆盖从导入到质量评价和审计包导出的完整证据链 |
| 表格/笔记手工流程 | 灵活、无工具门槛 | 提供统一字段、排除理由、决策日志和可重算 counts |

## 7. 当前版本边界

| 版本线 | 当前边界 |
|---|---|
| V2.2 audit-ready | 已在 `literature-screening-v2.2/` 建立审计模型、事件 hooks、decision ledger 和审计包导出 |
| V2.3 计划 | PRISMA-trAIce 数据模型、AI usage registry、AI suggestion log、透明报告 |
| V2.4 计划 | 质量评价模板、evidence table、GRADE summary |
| V2.5 计划 | 双人复核隔离、冲突队列、resolver workflow、agreement metrics |
| V2.6 计划 | Conservative AI screening、ranking、prompt registry、provider abstraction |

当前版本不包含真实 AI API、云端账号、支付系统、机构权限和默认上传。

## 8. 下一阶段产品判断

1. 公开表达优先统一为 PRISMA Workbench / local-first evidence screening workstation。
2. V2.2 工程主线继续围绕 audit-ready，而不是提前进入真实 AI 功能。
3. V2.3 先做 PRISMA-trAIce 数据模型和报告，不接默认云模型。
4. V2.4 把质量评价从“建议入口”推进到模板化表单和 evidence table。
5. 中文源兼容需要独立设计、样例和测试，不应只放在导入说明里。
6. 商业化可以规划 open-core，但当前核心本地工作流继续保持免费和低门槛。

## 9. 可直接使用的公开文案

中文版：

> PRISMA Workbench 是一个面向系统综述、Meta 分析与证据整合场景的本地优先文献筛选工作台。它覆盖导入、去重、规则筛选、人工复核、质量评价与结果导出，并强调可审计、可解释和保守型 AI 辅助，而不是黑盒自动裁决。

English:

> PRISMA Workbench is a local-first evidence screening workstation for systematic reviews, meta-analyses, and evidence synthesis. It covers import, deduplication, screening, human review, quality appraisal, and export, with an emphasis on auditability, interpretability, and conservative AI assistance rather than black-box automation.
