# PRISMA 系统综述筛选与审计工作台

面向系统综述、Meta 分析与证据整合项目的本地优先工作台。当前公开版本线为 **V2.5 dual-review closeout**，提供多来源导入、保守去重、双人复核、质量评价、历史回溯、PRISMA 2020-oriented 输出和可追溯证据导出。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-V2.5%20Dual%20Review-brightgreen.svg)](https://quzhiii.github.io/-PRISMA-/)
[![Audit trail](https://img.shields.io/badge/Audit%20trail-events%20%2B%20decision%20ledger-0969da.svg)](./app/)
[![Local first](https://img.shields.io/badge/Local%20first-browser--based-2ea44f.svg)](https://quzhiii.github.io/-PRISMA-/)

[English](./README_EN.md) | 简体中文

[在线使用](https://quzhiii.github.io/-PRISMA-/) · [开始或恢复项目](./start/) · [工作台](./app/) · [双人复核说明](./dual-review/) · [资源中心](./resources/) · [提交问题](https://github.com/quzhiii/-PRISMA-/issues)

> 独立项目声明：这是独立开源项目，不隶属于 PRISMA Statement 官方组织，也未获其授权或背书。项目名称中的 PRISMA 用于说明面向 PRISMA 相关工作流；研究者仍需根据官方材料核对报告要求。

## 当前公开版本线

| 版本线 | Canonical route | 状态 |
|---|---|---|
| V2.5 dual-review closeout | `/app/` | 当前公开版本线，包含 A/B 决定隔离、冲突队列、resolver workflow、一致性指标和未解决冲突导出门禁。 |
| V2.5.1 project history rollback | `/app/` | 当前 patch-line 能力，包含本地历史快照、恢复入口和来源文件增减记录。 |

旧的 `literature-screening-v2.2/` HTML 路径保留为兼容入口，不再承担独立公开版本叙事。历史路径说明见 [`/legacy/`](./legacy/)。

## 为什么使用

系统综述真正难的是过程能否被复查：哪些记录被导入、哪些重复项被移除、为什么排除、双人复核冲突如何解决、最终计数来自哪些人工决定。工作台围绕这些问题保留可导出的事件和决定数据，而不只生成最终图表。

| 研究工作中的问题 | 当前处理方式 |
|---|---|
| 数据库导出格式混杂 | 支持 `CSV / TSV / RIS / ENW / BibTeX / RDF / TXT / NBIB` 和混合来源导入 |
| 自动去重可能误删 | 硬重复自动移除，疑似重复保留人工复核 |
| PRISMA 数字难以核对 | 计数可从 `AuditEvent` 和 `ScreeningDecision` 重算 |
| 全文排除理由分散 | 使用排除理由 taxonomy，并导出决定表和理由汇总 |
| 两位复核者决定不一致 | A/B 决定隔离，冲突进入 resolver workflow，未解决冲突阻止最终结果导出 |
| 项目调整后难以回退 | 浏览器本地项目快照和来源文件增减记录支持恢复 |
| AI 辅助边界不清 | 真实 provider 默认关闭；本地建议只作辅助，最终纳排由人工确认 |

## 工作流

```text
导入文献 -> 保守去重 -> 配置筛选规则 -> 标题/摘要筛选 -> 全文复核 -> 质量评价 -> PRISMA 与审计包导出
```

| 阶段 | 关键产物 |
|---|---|
| 导入 | 标准化记录、来源文件信息、导入事件 |
| 去重 | 硬重复移除列表、疑似重复候选、去重证据 |
| 筛选 | 标题/摘要和全文阶段的人工决定、排除理由、复核备注 |
| 双人复核 | Reviewer A/B 决定、冲突队列、一致性指标、resolver 最终值 |
| 质量评价 | 条目级质量评价、证据表和 GRADE 摘要脚手架 |
| 导出 | PRISMA SVG、结果表、报告、事件日志、决定表和复核证据包 |

## 双人复核边界

工作台不提供账号、在线项目查询或实时同步。协作依赖浏览器本地状态和文件交接：

- `Collaboration Seed`：owner 从已有项目导出的协作起点描述。
- `Reviewer Decision Bundle`：Reviewer A 或 B 导出的 reviewer-scoped 决定文件。
- `merge import`：owner 将决定文件合并回现有项目，并刷新冲突和导出门禁。
- 完整项目保存/加载是单独的备份路径。
- 当前没有独立的 Seed 导入向导；跨设备开始复核前，接收方仍需通过完整项目备份建立相同项目上下文。

## 数据与网络边界

- 导入的项目记录默认在浏览器本地处理和存储，应用不会自动上传项目记录。
- 页面仍可请求第三方 `js-yaml` 资源；单篇翻译功能只有在用户主动调用时才会向外部翻译服务发送所选文本。
- 使用 `file://` 打开属于降级模式；Worker 和较大文件能力可能受浏览器限制，建议通过静态 HTTP 服务使用。
- 项目导出文件可能包含研究数据和复核者标识，分享前应由研究者检查和脱敏。

## 主要导出

| 文件 | 用途 |
|---|---|
| `project_manifest.json` | 项目基本信息、PRISMA 版本、AI 模式和应用版本 |
| `events.jsonl` | 导入、去重、筛选、复核、质量评价和导出事件 |
| `screening_decisions.csv` | 可持久化的人工筛选决定表 |
| `exclusion_reasons.csv` | 排除理由 taxonomy 和计数 |
| `prisma_counts.json` | 从决定和事件重算的 PRISMA 计数 |
| `audit_summary.md` | 可读的审计摘要和边界提示 |
| `DEFENSE_AUDIT_PACK.md` | 方法附录 / 复核证据包；整合计数、双审、质量、来源提示和 AI 边界，使用前需研究者核对 |
| `quality_appraisal.csv` | 逐研究、逐领域的质量评价记录 |
| `evidence_table.csv` | PICOS、效应量、质量判断和证据等级整理表 |
| `grade_summary.csv` | GRADE 摘要脚手架；最终 certainty 和降级理由由人工确认 |
| `dual_review_conflicts.csv` | 筛选和质量评价冲突证据 |
| `dual_review_agreement.json` | percent agreement、Cohen's kappa 和冲突门禁状态 |

## 资源

- [公开演示数据指南](./docs/demo/README.md)
- [复现基准说明](./docs/benchmarks/README.md)
- [Review Starter Kits](./docs/templates/README.md)
- [检索策略助手设计边界](./docs/design/SEARCH_STRATEGY_ASSISTANT.md)

检索策略助手只生成和记录检索式，不抓取数据库、不处理机构凭证，也不自动纳入或排除文献。

## 技术结构

```text
index.html                          -> 当前 V2.5 官网
start/index.html                    -> Demo、新建导入与项目恢复入口
app/index.html                      -> canonical 工作台
dual-review/index.html              -> 双人复核与文件交接边界
resources/index.html                -> 公开资源中心
literature-screening-v2.2/app.js   -> 主流程、复核、导出和状态管理
literature-screening-v2.2/audit-engine.js
                                    -> 审计模型、序列化和报告构建
literature-screening-v2.2/reviewer-bundle-engine.js
                                    -> Reviewer Bundle 协议纯逻辑
literature-screening-v2.2/project-package-engine.js
                                    -> 完整项目包诊断与恢复合同
scripts/build-public-site.mjs       -> 显式白名单静态构建
```

## 测试与构建

```powershell
node --test tests\public\public-site-alignment.test.mjs
node tests\run-all-regressions.js
node scripts\build-public-site.mjs
```

当前完整回归入口：`node tests\run-all-regressions.js`。

`dist/` 是忽略的生成物。公开部署应只上传该目录，不应直接发布仓库根目录。

## 许可证

[MIT License](./LICENSE)
