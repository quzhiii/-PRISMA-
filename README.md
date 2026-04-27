<div align="center">

# PRISMA 文献筛选助手

**面向系统综述、Meta 分析与证据整合项目的端到端文献筛选工作台**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-V2.1-brightgreen.svg)](https://quzhiii.github.io/-PRISMA-/)
[![GitHub Pages](https://img.shields.io/badge/Demo-Live-orange.svg)](https://quzhiii.github.io/-PRISMA-/)
[![Scale](https://img.shields.io/badge/Scale-30%2C000%2B-purple.svg)](https://quzhiii.github.io/-PRISMA-/)

[English](./README_EN.md) | 简体中文

[在线使用](https://quzhiii.github.io/-PRISMA-/) · [提交问题](https://github.com/quzhiii/-PRISMA-/issues) · [版本历史](#版本历史)

> 从文献导入、去重、规则筛选、人工复核，到 PRISMA 2020 流程图与明细导出，
> 全流程默认在浏览器本地运行，数据不离开当前设备。

</div>

---

## 为什么是 V2.1

`V2.1` 不是推倒重来，而是在 `V2.0` 已经稳定的首页 / 登录页 / 工作台架构上，正式补齐两块之前已经明确暴露出来的缺口：质量评价 / 证据等级，以及常用格式的真正流式解析。

- 工作流从 5 步扩展到 6 步：先完成质量评价，再正式导出
- 常用导入格式 `CSV / TSV / RIS / NBIB / ENW` 改为 Worker 增量解析，减少“大文件看起来卡住”的体验
- 新增质量评价队列、研究设计建议、工具族建议与证据等级基线
- 保留 GitHub Pages 现有访问路径 `literature-screening-v2.0/`，避免打断已存在的链接与书签

当前 GitHub Pages 默认入口已正式对外发布为 `V2.1`，`v1.7` 作为历史稳定版本保留。

`V2.2` 当前在独立 `literature-screening-v2.2/` 工作区推进 audit-ready 基础层，不替换已发布的 `V2.1` 路径。该迭代新增本地审计日志、项目清单、持久化筛选决策和审计包导出；PRISMA 计数可以从 `ScreeningDecision` 与 `AuditEvent` 重新计算。AI 模式默认仍为 `off`，审计导出均在浏览器本地生成。

---

## 这个工具解决什么问题

| 常见问题 | V2.1 的处理方式 |
|------|------|
| 文献量一大，浏览器容易卡顿或中断 | 对 `CSV / TSV / RIS / NBIB / ENW` 启用 Worker 增量解析，减少主线程长时间阻塞 |
| 自动去重太激进，担心误删真实文献 | 改为“硬重复自动移除 + 疑似重复人工复核”的双层模型 |
| 双人复核流程里状态容易冲突 | 修复共享项目状态、角色隔离与退出清理 |
| 全文纳入后还要单独做质量评价和证据等级整理 | 新增质量评价队列，接住研究设计、工具族和证据等级基线 |
| 摘要显示不完整，英文复核还要逐条复制去翻译 | 修复多行摘要解析，并在全文复核弹窗中增加单篇翻译 |
| 文件显示上传成功，但页面没有正常展示结果 | 修复上传后内容显示、页面滚动、步骤衔接与可见性问题 |
| 英文入口会跳到中文页面，或页面元素异常 | 修复英文首页、双人模式入口和语言路由问题 |
| 最终投稿还需要 PRISMA 流程图和明细 | 支持 PRISMA 2020 SVG 导出与结果明细导出 |

---

## V2.1 首发亮点

### 1. 六步工作流正式成型

- 独立首页、登录页、工作台
- 单人模式与双人模式入口分离
- `Step 5` 正式承接质量评价 / 证据等级
- `Step 6` 再输出 PRISMA 图、结果表与筛选报告

### 2. 常用格式导入终于变成真正的后台增量解析

- `CSV / TSV / RIS / NBIB / ENW` 改为 Worker 按块解析
- 导入任务状态会显式记录阶段、字节进度与记录数
- `BibTeX / RDF / TXT` 当前仍保留 fallback whole-file 路径

### 3. 质量评价与证据等级进入正式主流程

- 为最终纳入研究生成质量评价队列
- 提供研究设计建议、工具族建议和证据等级基线
- 项目级持久化已接通，后续可继续扩展域级详细表单

### 4. 更保守、可解释的去重逻辑继续保留

`V2.1` 继续沿用 [`dedup-engine.js`](./dedup-engine.js) 的双层输出，不把这轮版本迭代误导成“激进删重”：

```text
第一层：硬重复
在证据更强、风险更低的前提下自动移除

第二层：疑似重复
不再静默删除，而是交给人工复核
```

目标不是“自动删得越多越好”，而是尽量贴近科研筛选里的可解释性与可追溯性。

### 5. 大规模能力保留，实际使用体验更稳定

- 继续支持 `30,000+` 条记录
- 上传展示、页面滚动、示例加载与真实文件导入更加稳定
- 双人复核初始化、退出与共享状态更可控

### 6. 中英文入口和公开文档口径被拉齐

- GitHub Pages 根入口默认打开 `V2.1`
- 英文首页进入双人模式时会进入英文登录页
- README、工作台步骤和 benchmark 证据路径同步到同一套版本说明

---

## 摘要与复核弹窗更新（2026-04）

- 全文复核弹窗现在优先支持页内翻译，如果页内翻译不可用，会自动切换到新标签翻译
- 全文复核弹窗已补充滚动优化，关闭按钮与底部操作区会保持可见，并支持点击弹窗外空白区关闭
- 对 CNKI RDF 摘要尾部的 `AbstractFilter(...) / 更多 / 还原` 噪音已做清理
- 对数据源本身已给出截断摘要的记录，列表与弹窗会显式提示“源摘要可能已截断”
- 这类“已截断摘要”属于上游数据库或导出源本身限制，工具会尽量标记，但不会伪造或补全原始未提供的摘要内容

---

## 核心能力

### 多格式文献导入

支持 `CSV / TSV / RIS / ENW / BibTeX / RDF / TXT / NBIB`，也支持混合来源一起导入。

### 双层去重

- 硬重复可自动移除
- 疑似重复进入人工复核队列
- 更贴合保守科研场景

### 规则化自动筛选

- 语言筛选
- 发表年份范围
- 包含 / 排除关键词
- 标题 / 作者 / 期刊条件
- 支持修改规则后重新运行

### 单人与双人复核流程

- 支持单人筛选
- 支持主审 / 副审协作
- 共享项目状态更稳定
- 全文复核弹窗支持查看完整摘要与单篇翻译

### 质量评价 / 证据等级

- 为纳入研究建立质量评价队列
- 识别研究设计并匹配建议工具族
- 给出证据等级基线，作为正式评价入口

### PRISMA 2020 导出

- PRISMA 2020 流程图导出
- 结果明细导出
- 更适合论文写作、投稿和归档

---

## 标准工作流

```text
Step 1  导入文献
        支持多文件、多格式混合导入，并进行跨来源去重

Step 2  配置筛选规则
        语言 / 年份 / 关键词 / 期刊等条件

Step 3  自动筛选
        查看通过结果，并支持修改规则后重跑

Step 4  人工复核
        使用快捷键 1-6 记录排除原因，自动保存进度

Step 5  质量评价
        生成质量评价队列，确认研究设计、工具族与证据等级基线

Step 6  导出
        生成 PRISMA 2020 流程图与明细报告
```

---

## 性能基准

| 操作 | 数据量 | 耗时 | 说明 |
|------|------|------|------|
| 导入 IndexedDB | 30,000 条 | ~3-5s | 500 条一批写入 |
| 分页查询 | 100 条 | ~213ms | 索引查询 |
| 虚拟列表渲染 | 30,000 条 | ~16ms/帧 | 可保持稳定滚动 |
| 常用格式导入（V2.1） | CSV / TSV / RIS / NBIB / ENW | 后台增量解析 | Web Worker 分块处理，减少主线程长时间阻塞 |
| 去重（V2.1） | 全量 | 后台执行 | Web Worker，不阻塞 UI |

---

## V2.1 与 V2.0 对比

| 维度 | V2.0 | V2.1 |
|------|------|------|
| 工作流 | 5 步，到导出结束 | 6 步，新增质量评价 / 证据等级后再导出 |
| 导入解析 | 智能导入看起来分批，实则整包解析 | 常用格式改为 Worker 增量解析 |
| 质量评价 | 需要导出后另行整理 | 主流程内置质量评价队列与证据等级基线 |
| 导入可观测性 | 以“上传完成”为主 | 记录任务阶段、字节进度与解析条数 |
| 公开文档 | README 和仓库证据链接曾有不一致 | README、工作流和 benchmark 引用同步 |
| 当前定位 | 上一代正式主版本 | 当前正式发布版本 |

---

## 现有基准结果与客观变化

下列数据来自本仓库的基准报告 [`docs/benchmarks/dedup/post-implementation-benchmark-report.md`](./docs/benchmarks/dedup/post-implementation-benchmark-report.md)，主要覆盖 `V2.0` 去重引擎基线；`V2.1` 继续沿用这套保守去重策略。

| 指标 | v1.7 | V2.0 | 含义 |
|------|------|------|------|
| 自动删除精确率 | `1.000` | `1.000` | 保持零误删的保守策略 |
| 综合 duplicate-like recall | `0.583` | `0.917` | 对真实重复和近重复的发现能力更强 |
| 综合 Candidate F1 | `0.737` | `0.957` | 疑似重复候选输出质量更高 |
| 真实 RDF hard recall | `0.667` | `1.000` | 在真实导出数据上覆盖更多重复组 |
| 真实 RDF candidate pairs | `0` | `1` | 能显式抛出更多需人工复核的案例 |

### 关于性能与效率

- `V2.1` 在常用格式导入路径上已经补上真正的后台增量解析，但当前还没有跨设备统一测速结论
- 这一轮迭代的主要收益仍然是正确性、稳定性、可解释性和流程完整性
- 更具体地说，提升重点是“让正式系统综述流程更完整”，而不是单纯追求跑得更快

---

## 技术架构

```text
index.html / workspace.html   -> UI 层（入口、步骤导航、工作台）
app.js                        -> 业务逻辑层（规则、流程、状态）
db-worker.js                  -> IndexedDB 数据层
parser-worker.js              -> 多格式解析与后台消息层
streaming-parser.js           -> 常用格式增量解析状态机
quality-engine.js             -> 质量评价 / 证据等级基线
import-job-runtime.js         -> 导入任务状态与持久化
dedup-engine.js               -> 保守去重引擎
virtual-list.js               -> 大规模列表渲染
```

### 核心模块

| 模块 | 职责 |
|------|------|
| `dedup-engine.js` | 独立去重引擎，输出硬重复与疑似重复 |
| `db-worker.js` | IndexedDB 增删改查、批量写入、分页查询 |
| `parser-worker.js` | 多格式解析、DOI / 标题归一化、后台解析消息编排 |
| `streaming-parser.js` | `CSV / TSV / RIS / NBIB / ENW` 增量解析 |
| `quality-engine.js` | 研究设计识别、工具族建议、证据等级基线 |
| `import-job-runtime.js` | 导入任务阶段、进度和项目级状态持久化 |
| `virtual-list.js` | 虚拟滚动，只渲染可见区域 |
| `app.js` | 主流程、规则引擎、导出、状态管理 |

---

## 版本历史

<details>
<summary><b>V2.1（当前正式版本，2026-04）</b></summary>

- 工作流升级为 6 步，新增质量评价 / 证据等级步骤
- 常用格式 `CSV / TSV / RIS / NBIB / ENW` 改为 Worker 增量解析
- 新增 `quality-engine.js`、`import-job-runtime.js`、`streaming-parser.js`
- 导入任务状态支持项目级持久化与阶段化显示
- README、工作台步骤和 benchmark 引用已与仓库主线对齐
- 保留 `literature-screening-v2.0/` 访问路径以兼容既有 GitHub Pages 链接

</details>

<details>
<summary><b>V2.0（上一代主版本，2026-03）</b></summary>

- 新增独立首页 / 登录页 / 工作台结构
- 新增独立 `dedup-engine.js` 去重引擎
- 去重改为“硬重复自动移除 + 疑似重复人工复核”
- 修复 CSV / TSV 跨行摘要解析，减少“完整摘要只显示第一句话”
- 全文复核弹窗新增“翻译本条文献”，可将标题与摘要一键送去中文翻译
- 修复上传成功但结果不显示、页面滚动异常、步骤衔接中断问题
- 修复双人复核共享状态冲突与退出清理问题
- 修复英文入口、语言路由与可见性问题
- GitHub Pages 默认入口切换到 `V2.0`

</details>

<details>
<summary><b>v1.7.x（稳定维护版，2026-03）</b></summary>

- 补全 PubMed `.nbib` 导入支持
- 修复单人 / 双人模式 session 接线问题
- 修复去重后无法继续进入后续步骤的问题
- 历史回归脚本入口：`tests/run-all-regressions.js`

</details>

<details>
<summary><b>v1.5-v1.6（大规模处理能力建设）</b></summary>

- IndexedDB 数据层
- Web Worker 后台处理
- 虚拟滚动列表
- 大规模文献处理链路

</details>

---

## 参与贡献

欢迎提交 Issue 和 Pull Request。

```bash
git checkout -b feature/your-feature
git commit -m "feat: 描述你的改动"
git push origin feature/your-feature
```

---

## 许可证

[MIT License](./LICENSE)

---

<div align="center">

如果这个工具对你的研究有帮助，欢迎点一个 Star。

</div>
