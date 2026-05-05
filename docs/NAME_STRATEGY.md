# PRISMA Workbench 命名策略

Last updated: 2026-04-28

## 1. 当前命名问题

`PRISMA` 本身是方法学标准和通用术语。直接把项目叫 PRISMA 有传播优势，也有长期问题：

- 容易被误解为只做 PRISMA 流程图。
- 搜索和品牌占位不够独立。
- 与官方方法学标准语义过近。
- 仓库名 `-PRISMA-` 对新用户不够直观。
- 难以承接 future audit、quality、collaboration、AI 等更宽能力。

## 2. 当前阶段是否改名

建议现在不做仓库和项目大改名。更稳妥的方式是采用过渡命名：

> PRISMA Workbench

副标题保持：

> Local-first evidence screening workstation for systematic reviews

这样既延续现有 PRISMA 认知，又避免用户把项目理解成单一流程图生成器。

## 3. 命名原则

未来候选名称应满足：

- 不只表达流程图。
- 能覆盖导入、去重、筛选、复核、质量评价、导出和审计。
- 能承接 conservative AI，而不是暗示自动裁决。
- 中英文传播不别扭。
- 适合 GitHub、论文、landing page 和机构沟通。
- 不侵犯已有工具或标准的品牌边界。

## 4. 推荐命名层级

| 层级 | 建议写法 | 用途 |
|---|---|---|
| 当前公开名称 | PRISMA Workbench | README、landing page、文档标题 |
| 描述副标题 | local-first evidence screening workstation | 解释项目本质 |
| 功能标签 | audit-ready PRISMA workflow | 强调 V2.2 能力 |
| AI 标签 | conservative AI-assisted literature screening | 用于 V2.3 以后 |
| 中文解释 | 本地优先的证据筛选工作台 | 面向中文研究者 |

## 5. 候选方向

### 5.1 保守过渡型

| 名称 | 判断 |
|---|---|
| PRISMA Workbench | 当前推荐，清楚、稳妥、迁移成本低 |
| PRISMA Studio | 更像创作工具，但可能偏轻 |
| PRISMA Desk | 简洁，但专业感略弱 |
| PRISMA FlowLab | 强调流程实验室，但不够直接 |

### 5.2 独立产品型

| 名称 | 判断 |
|---|---|
| Evidence Studio | 覆盖面广，品牌感强，但竞争词多 |
| ReviewDesk | 清楚实用，适合工作台定位 |
| Evidesk | 短，但需要建立新认知 |
| Screenory | 更偏筛选，不够覆盖质量评价和审计 |

### 5.3 中文传播型

| 名称 | 判断 |
|---|---|
| 证据筛选工作台 | 清楚但偏描述 |
| 循证筛选台 | 中文用户好懂，但国际化弱 |
| 综述工作台 | 覆盖宽，但和通用写作工具容易混淆 |

## 6. 当前推荐写法

README 和 landing page 使用：

```text
PRISMA Workbench
Local-first evidence screening workstation for systematic reviews, meta-analyses, and evidence synthesis.
```

中文使用：

```text
PRISMA Workbench
面向系统综述、Meta 分析与证据整合的本地优先文献筛选工作台。
```

V2.2 标签使用：

```text
V2.2 audit-ready
```

V2.3 以后可使用：

```text
PRISMA-trAIce-ready
Conservative AI-ready
```

## 7. 不建议的写法

当前不建议宣传：

- AI PRISMA
- Auto Review AI
- One-click systematic review
- Fully automated screening
- AI replaces dual review
- PRISMA official tool

这些写法会削弱方法学可信度，或者造成与官方标准/人工复核边界的误解。

## 8. 未来改名触发条件

可以在满足以下条件后重新评估独立品牌名：

1. V2.3 PRISMA-trAIce 报告稳定。
2. V2.4 质量评价模板稳定。
3. V2.5 双人复核和冲突解决稳定。
4. 有真实用户或机构开始以“工作台”而不是“流程图工具”来理解项目。
5. 确认商业化方向是 open-core、Team 还是 Institution。

在此之前，维持 `PRISMA Workbench` 是最低风险选择。
