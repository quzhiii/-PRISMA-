# Chinese Source Compatibility Design

Last updated: 2026-04-28

## 1. 设计目标

中文源兼容不是简单“支持中文显示”，而是要处理中文数据库导出在字段、编码、摘要、作者、期刊、标识符和噪音内容上的真实差异。

目标：

- 明确当前已支持什么。
- 明确哪些格式只是部分支持。
- 建立中文源字段映射和清洗规则。
- 不对无法恢复的信息做过度承诺。
- 为后续 parser fixtures 和回归测试提供设计基线。

## 2. 当前已支持能力

| 能力 | 当前状态 |
|---|---|
| 中文显示 | 已解决主要乱码问题 |
| 多格式导入 | 支持 CSV、TSV、RIS、ENW、BibTeX、RDF、TXT、NBIB |
| 常用格式增量解析 | CSV、TSV、RIS、NBIB、ENW 走 Worker 分块解析 |
| RDF/BibTeX/TXT | 可导入，但大文件和字段噪音仍需加强 |
| 中英文筛选语言选项 | 已有中文/英文语言筛选 |
| CNKI RDF 噪音处理 | 已有初步处理，但需要系统化 fixture |
| DOI/PMID | 已在通用字段中使用 |

## 3. 当前不稳定点

| 问题 | 风险 |
|---|---|
| CNKI RDF 字段多样且含噪音 | 摘要、基金、机构、关键词可能混入错误字段 |
| 万方/维普导出格式不统一 | 同一字段可能有中文表头、英文表头或组合字段 |
| SinoMed 样例不足 | 难以冻结字段映射 |
| 中文摘要截断 | 工具不能补全，只能标记风险 |
| 中英文标题并存 | 去重和展示可能选择不稳定 |
| 作者字段分隔符多样 | 中文顿号、分号、逗号、英文逗号混用 |
| 中文期刊和英文期刊名 | 同一刊物可能多种写法 |
| 编码和 BOM | CSV/TSV 来源可能存在 UTF-8 BOM、GBK 转码问题 |

## 4. 字段映射目标

### 4.1 通用规范字段

| 规范字段 | 说明 |
|---|---|
| `title` | 优先展示主标题 |
| `title_zh` | 中文标题 |
| `title_en` | 英文标题 |
| `abstract` | 优先展示可用摘要 |
| `abstract_zh` | 中文摘要 |
| `abstract_en` | 英文摘要 |
| `authors` | 作者数组或标准字符串 |
| `year` | 发表年份 |
| `journal` | 期刊名 |
| `keywords` | 关键词 |
| `doi` | DOI |
| `pmid` | PMID |
| `cnki_id` | CNKI 标识符 |
| `wanfang_id` | 万方标识符 |
| `vip_id` | 维普标识符 |
| `sinomed_id` | SinoMed 标识符 |
| `source_database` | 来源数据库 |
| `source_format` | 导入格式 |

### 4.2 CNKI RDF 映射

| 可能字段 | 目标字段 |
|---|---|
| `题名`、`Title`、`TI` | `title` / `title_zh` |
| `英文题名`、`English Title` | `title_en` |
| `作者`、`Author`、`AU` | `authors` |
| `机构`、`Author Address` | `affiliations` |
| `摘要`、`Abstract`、`AB` | `abstract` / `abstract_zh` |
| `关键词`、`Key Words`、`KW` | `keywords` |
| `刊名`、`Journal`、`JO` | `journal` |
| `年`、`Year`、`PY` | `year` |
| `DOI` | `doi` |
| `基金` | `funding` |
| `分类号` | `classification` |
| `数据库` | `source_database` |

清洗规则：

- 删除明显的字段标签残留。
- 基金、机构、分类号不应并入摘要。
- 摘要中如果出现大量来源元数据，标记 `abstract_noise_detected = true`。
- 如摘要含“下载频次”“被引频次”等平台统计，移入 `source_notes`。

### 4.3 万方字段映射

| 可能字段 | 目标字段 |
|---|---|
| `题名`、`论文题名`、`Title` | `title` |
| `作者` | `authors` |
| `作者单位` | `affiliations` |
| `摘要` | `abstract` |
| `关键词` | `keywords` |
| `刊名` | `journal` |
| `年,卷(期)` | `year`、`volume`、`issue` |
| `DOI` | `doi` |
| `万方ID`、`ArticleID` | `wanfang_id` |

### 4.4 维普字段映射

| 可能字段 | 目标字段 |
|---|---|
| `题名`、`标题` | `title` |
| `作者` | `authors` |
| `机构` | `affiliations` |
| `摘要` | `abstract` |
| `关键词` | `keywords` |
| `出处`、`刊名` | `journal` |
| `年份` | `year` |
| `分类号` | `classification` |
| `维普ID` | `vip_id` |

### 4.5 SinoMed 可能字段

| 可能字段 | 目标字段 |
|---|---|
| `TI`、`题名` | `title` |
| `AU`、`作者` | `authors` |
| `AD`、`机构` | `affiliations` |
| `AB`、`摘要` | `abstract` |
| `MH`、`主题词` | `mesh_terms` |
| `SO`、`出处` | `journal` |
| `PY`、`年份` | `year` |
| `PMID` | `pmid` |
| `SinoMed ID` | `sinomed_id` |

SinoMed 需要补真实导出样例后再冻结 parser 行为。

## 5. 中文摘要截断识别

工具不能补全被数据库截断的摘要，只能识别风险。

可疑信号：

- 摘要以省略号结尾。
- 摘要长度明显过短，但标题和期刊完整。
- 摘要包含“余略”“详见原文”等提示。
- RDF/TXT 中摘要后紧接平台元数据。
- 摘要字段缺失但其他字段完整。

输出字段：

| 字段 | 说明 |
|---|---|
| `abstract_truncation_suspected` | 是否疑似截断 |
| `abstract_noise_detected` | 是否疑似混入噪音 |
| `abstract_quality_note` | 可读说明 |

## 6. 标题和作者归一化

标题归一：

- 去除首尾空白。
- 统一全角/半角常见标点。
- 保留中文标题和英文标题两个字段。
- 去重比较时可使用 normalized title，但展示保留原始标题。

作者归一：

- 支持 `;`、`; `、`；`、`,`、`，`、`、` 分隔。
- 保留原始作者字符串。
- 去重比较时使用标准化作者 key。
- 不尝试强行推断中文姓名拼音。

## 7. 标识符处理

| 标识符 | 规则 |
|---|---|
| DOI | 小写、去除 URL 前缀、去除尾部标点 |
| PMID | 保留数字字符串 |
| CNKI ID | 保留原始 ID，避免误改 |
| Wanfang ID | 保留原始 ID |
| VIP ID | 保留原始 ID |
| SinoMed ID | 保留原始 ID |

## 8. 中文用户导入说明

landing page 和工作台导入说明应避免过度承诺。推荐表达：

- 优先使用 RIS、NBIB、ENW、CSV/TSV。
- 中文数据库导出建议保留标题、作者、摘要、关键词、期刊、年份、DOI/数据库 ID。
- 如果 RDF/TXT 导入后摘要异常，应检查源文件字段。
- 工具会尽量识别截断或噪音，但不会自动补全缺失摘要。

## 9. 下一步最值得补的 parser

优先级：

1. CNKI RDF fixture 和字段映射回归测试。
2. 万方 CSV/Excel 导出样例字段映射。
3. 维普 CSV/TXT 样例字段映射。
4. SinoMed 样例收集和最小 parser。
5. 中文摘要截断和噪音检测测试。

## 10. 不要过度承诺

当前不要宣传：

- 完美支持所有中文数据库。
- 自动修复所有乱码。
- 自动补全文献摘要。
- 自动识别所有研究设计。
- AI 自动解决中文源字段混乱。

更准确的表达：

> PRISMA Workbench 正在把中文源和多源脏数据兼容作为产品主线之一，当前已支持多格式导入和中文显示，后续会通过真实样例和回归测试逐步加强 CNKI、万方、维普和 SinoMed 的字段映射。
