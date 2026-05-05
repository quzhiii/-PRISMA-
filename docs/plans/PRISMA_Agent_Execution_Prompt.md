# AI Agent 执行 Prompt：PRISMA 项目 V2.1 → V2.2/V3.0 演进优化

你现在需要接手并继续优化这个 GitHub 项目：

- 项目仓库：https://github.com/quzhiii/-PRISMA-
- 当前阶段：V2.1 已完成，仍保持免费、本地优先、浏览器运行
- 当前目标：在不破坏现有功能的前提下，围绕新的产品定位，系统推进 README、landing page、roadmap、功能架构和下一阶段开发计划

---

## 一、项目新的核心定位

请将本项目从“PRISMA 流程图工具”升级理解为：

> PRISMA Workbench：一个面向系统综述、证据整合与严谨文献筛选的 local-first、audit-ready、支持质量评价、适配中文/多源脏数据、采用保守型 AI 的 evidence screening workstation。

注意：  
不要把项目直接拔高成泛化的“Scientific Agent Governance OS”。  
当前阶段应聚焦在 evidence screening / systematic review / literature screening 这个明确入口。

---

## 二、必须坚持的产品原则

后续所有修改都必须遵守以下原则：

### 1. Local-first 优先

- 默认数据在浏览器本地处理
- 不默认上传用户文献、摘要、筛选结果
- 不引入默认云端依赖
- 如果未来支持云协作或 AI API，必须明确标注数据边界

### 2. Audit-ready 优先

项目未来的核心差异化不是“更炫的 AI”，而是：

- 每一步筛选都有记录
- 每一次纳入/排除都有原因
- 每一次去重都有依据
- 每一次 AI 参与都有留痕
- 最终可以导出方法学附录、筛选明细、AI 使用报告

### 3. Quality appraisal 前置

质量评价不应只是尾部附加功能，而应逐渐成为主流程的一部分：

- 研究设计识别
- 工具族建议
- 质量评价队列
- 证据等级基线
- 后续可导出论文/报告可用的质量评价表格

### 4. Chinese-source compatibility 是项目特色

项目需要特别强调对中文数据库和中文文献源的适配：

- CNKI RDF
- 万方/维普/中文题录格式
- 摘要截断提示
- 噪音字段清理
- 中英文混合题录字段归一化
- 中文用户友好的导入说明

### 5. Conservative AI，而不是 aggressive AI

AI 只能作为辅助层，不能默认替代人工筛选。

推荐的 AI 角色：

- AI suggest only
- AI prioritise + human decide
- AI uncertainty flagging
- AI screening rationale draft
- AI audit report helper

禁止默认宣传为：

- AI 自动帮你完成系统综述
- AI 一键筛完文献
- AI 替代双人复核
- AI 自动保证纳入/排除正确

---

## 三、你的第一阶段任务：先做仓库审计，不要立即改代码

请先完整阅读仓库，至少检查以下内容：

1. README
2. docs 目录
3. landing page / demo 页面
4. package.json / vite / 前端结构
5. src 或 app 目录下的核心模块
6. 当前导入、去重、筛选、质量评价、导出相关实现
7. 当前是否已有测试、脚本、构建命令

然后输出一份：

`docs/V2_1_PROJECT_AUDIT.md`

内容包括：

- 当前功能清单
- 当前信息架构问题
- 当前 README / landing page 的表达问题
- 当前代码结构中与 roadmap 相关的模块位置
- 已有能力与新定位之间的匹配度
- 不建议立即改动的部分
- 最适合先推进的 P0 任务

验收标准：

- 不少于 1500 字
- 不泛泛评价，必须引用具体文件路径
- 必须区分“已有能力”“缺失能力”“表达不清但已有能力”
- 不允许直接开始大规模重构

---

## 四、第二阶段任务：更新项目定位与公开表达

在完成仓库审计后，开始更新项目的公开表达层。

### 需要产出的文件

1. `docs/PRODUCT_POSITIONING_2026.md`
2. `docs/ROADMAP_2026.md`
3. `docs/COMMERCIALIZATION_NOTES.md`
4. `docs/NAME_STRATEGY.md`

---

## 五、`PRODUCT_POSITIONING_2026.md` 要求

内容结构如下：

```markdown
# PRISMA Workbench 产品定位说明

## 1. 项目一句话定位

## 2. 项目不是什么

## 3. 核心用户

## 4. 核心场景

## 5. 核心差异化

### 5.1 Local-first
### 5.2 Audit-ready
### 5.3 Quality appraisal
### 5.4 Chinese-source compatibility
### 5.5 Conservative AI

## 6. 与现有工具的差异

## 7. 当前版本边界

## 8. 下一阶段产品判断
```

注意：

- 语言要专业、克制、清晰
- 不要营销腔
- 不要夸大为替代 Rayyan / Covidence / ASReview
- 要强调适合低部署、重审计、中文/多源脏数据、严谨研究流程的用户

---

## 六、`ROADMAP_2026.md` 要求

请按 P0 / P1 / P2 / P3 分层。

### P0：近期必须做

重点是让项目定位和 V2.1 能力对齐。

建议包含：

1. README 重写
2. landing page 信息架构调整
3. audit ledger 数据结构设计
4. screening event log 方案
5. AI usage report 占位设计
6. CNKI / 中文源兼容说明文档
7. 质量评价模板最小集
8. 导出文件命名和字段标准化

### P1：V2.2 功能增强

建议包含：

1. screening ledger 导出
2. methods appendix 自动生成
3. exclusion reasons 标准化管理
4. 双人复核一致性字段
5. conflict resolution workflow
6. quality appraisal template v1
7. bilingual source normalization

### P2：V3.0 产品化能力

建议包含：

1. conservative AI assistant
2. AI suggest only 模式
3. AI prioritization mode
4. uncertainty bucket
5. local model / cloud model 明确区分
6. team collaboration prototype
7. project package export/import

### P3：商业化和机构能力

建议包含：

1. Pro 版能力边界
2. Team 版能力边界
3. Institutional license
4. 私有部署/离线包
5. 审计报告高级导出
6. 研究团队模板库
7. 机构品牌化报告导出

每个功能请给出：

- 功能说明
- 用户价值
- 技术复杂度：低 / 中 / 高
- 优先级：P0 / P1 / P2 / P3
- 是否影响 local-first 原则
- 是否适合免费版
- 是否适合未来付费版

---

## 七、`COMMERCIALIZATION_NOTES.md` 要求

请分析项目未来商业化路径，但不要立即实现收费代码。

推荐采用 open-core 模式。

### 必须包含

```markdown
# PRISMA Workbench 商业化路径草案

## 1. 为什么当前 V2.1 继续免费是合理的

## 2. 不建议收费的能力

## 3. 可以收费的能力

## 4. Free / Pro / Team / Institution 分层

## 5. 可能的定价逻辑

## 6. 面向中文研究者的商业化切入点

## 7. 面向机构用户的商业化切入点

## 8. 风险

## 9. 下一步验证方式
```

### 初步商业化判断

免费版保留：

- 单人本地使用
- 基础导入
- 基础去重
- 基础筛选
- 基础 PRISMA 导出
- 基础质量评价

Pro 版可包含：

- 高级审计导出
- methods appendix 生成
- AI usage report
- 高级质量评价模板
- 批量导出
- 本地项目包管理
- 高级中文源清洗

Team 版可包含：

- 双人复核
- 分歧解决
- reviewer agreement
- 多角色协作
- 项目级审计日志
- 团队模板

Institution 版可包含：

- 私有部署
- 离线版本
- 机构模板
- 统一审计报告
- 品牌化导出
- 培训与支持

注意：  
商业化文档只做规划，不要在当前版本中加入登录、支付、license check、云端账户系统。

---

## 八、`NAME_STRATEGY.md` 要求

项目当前名称是 `-PRISMA-`，但这个名字容易被理解为 PRISMA 流程图工具，也不利于后续产品化。

请给出命名策略，不要直接强行改仓库名。

推荐路线：

### 当前阶段

公开显示名可以逐步改为：

- PRISMA Workbench

副标题：

- Local-first evidence screening workstation
- Audit-ready systematic review workflow
- Conservative AI-assisted literature screening

### 过渡阶段

README 中可使用：

> PRISMA Workbench, formerly `-PRISMA-`, is a local-first evidence screening workstation for rigorous systematic reviews.

### 未来可选独立品牌

请评估但不要直接采用：

- EvidenceWorkbench
- ReviewWorkbench
- ScreenLedger
- ReviewLedger
- PrismaLedger
- EvidenceStudio
- ReviewPilot
- MetaReview Studio

每个名称请从以下维度判断：

- 是否容易理解
- 是否适合国际用户
- 是否过度占用 PRISMA 语义
- 是否适合商业化
- 是否适合中文传播
- 是否容易和已有工具混淆

---

## 九、第三阶段任务：README 与 landing page 重构

在完成上述 docs 后，开始处理公开入口。

### README 重构要求

README 首页应按以下顺序组织：

1. 项目名称与一句话定位
2. 核心截图或 demo 链接
3. 为什么需要这个工具
4. 核心能力
5. 与传统工具/AI 工具的差异
6. Local-first 数据原则
7. Audit-ready 工作流
8. Chinese-source compatibility
9. Quality appraisal support
10. Conservative AI roadmap
11. 快速开始
12. 当前版本能力边界
13. Roadmap
14. License / citation / acknowledgment

注意：

- 第一屏必须让用户知道这不是简单流程图工具
- 语言要中英兼顾，但中文说明要对中国研究生/医生/公卫研究者友好
- 不要使用过度营销化语言
- 不要宣传“AI 一键完成综述”

---

## 十、landing page 信息架构要求

如果仓库中已有 landing page，请先分析现有页面结构，再修改。

推荐页面结构：

1. Hero  
   - 标题：PRISMA Workbench
   - 副标题：Local-first evidence screening workstation for rigorous reviews
   - CTA：Try the demo / View on GitHub

2. Problem  
   - 多源题录混乱
   - 去重不可解释
   - 人工筛选难追踪
   - 质量评价和导出割裂
   - AI 使用难报告

3. Solution  
   - Local-first import
   - Explainable deduplication
   - Screening workflow
   - Quality appraisal queue
   - Audit-ready export

4. Workflow  
   - Import
   - Clean
   - Deduplicate
   - Screen
   - Appraise
   - Export

5. Differentiators  
   - Local-first
   - Audit-ready
   - Chinese-source aware
   - Conservative AI-ready

6. Roadmap  
   - V2.1 current
   - V2.2 audit ledger
   - V3.0 conservative AI
   - Future team / institution version

7. Footer  
   - GitHub
   - Docs
   - License

视觉要求：

- 白底
- 低饱和
- 学术工具感
- 不要花哨渐变
- 不要廉价 SaaS 风
- 信息密度适中
- 更接近 OpenAI / Claude / Linear / academic software 的表达方式

---

## 十一、第四阶段任务：功能设计，不急着完整实现

请先做功能设计文档，再决定是否写代码。

### 需要新增设计文档

1. `docs/design/AUDIT_LEDGER_DESIGN.md`
2. `docs/design/CONSERVATIVE_AI_DESIGN.md`
3. `docs/design/CHINESE_SOURCE_COMPATIBILITY.md`
4. `docs/design/QUALITY_APPRAISAL_MODULE.md`

---

## 十二、Audit Ledger 设计要求

请设计一个最小可行的 audit ledger 数据结构。

需要覆盖：

- record_id
- source_file
- source_database
- import_time
- normalized_fields
- dedup_decision
- dedup_reason
- screening_stage
- human_decision
- exclusion_reason
- reviewer_id
- conflict_status
- quality_appraisal_status
- ai_assistance_used
- ai_model
- ai_prompt_hash
- ai_output_summary
- final_export_status

注意：

- 当前可以先设计，不一定全部实现
- 需要考虑 CSV / JSON 导出
- 需要保证不会破坏现有项目数据结构

---

## 十三、Conservative AI 设计要求

AI 模块只做设计，不要默认接入云 API。

请设计以下模式：

1. Manual only
2. AI suggest only
3. AI prioritise + human decide
4. AI uncertainty flagging
5. AI audit report helper

每个模式需要说明：

- 输入
- 输出
- 是否会改变最终筛选结果
- 是否需要人工确认
- 是否写入 audit ledger
- local model / cloud model 的数据边界

默认策略：

- AI 不得静默排除文献
- AI 不得自动覆盖人工决定
- AI 输出必须可追溯
- AI 使用必须可导出为报告

---

## 十四、Chinese-source compatibility 设计要求

请重点检查和设计中文源支持。

内容包括：

- CNKI RDF 字段映射
- 万方字段映射
- 维普字段映射
- SinoMed 可能字段
- 中文摘要截断识别
- 噪音字段清理
- 中英文标题归一化
- 作者字段清洗
- DOI / PMID / CNKI ID / 中文期刊字段处理
- 中文用户导入说明

请输出清楚：

- 当前已支持什么
- 当前支持不稳定的地方
- 下一步最值得补的 parser
- 哪些功能不要过度承诺

---

## 十五、Quality Appraisal Module 设计要求

请设计质量评价模块的下一步，不要一上来做自动判断。

优先支持：

- RCT
- cohort study
- case-control study
- cross-sectional study
- diagnostic accuracy study
- systematic review

每个模板至少包括：

- study_type
- recommended_tool_family
- required_fields
- judgement_options
- notes
- export_format

注意：

- AI 可以辅助解释条目，但不能默认给最终质量评级
- 质量评价结果要能进入最终报告
- 后续可支持 robvis-like figure，但当前只做结构设计

---

## 十六、代码实现原则

如果需要改代码，请遵守：

1. 每次只改一个阶段，不要大规模重构
2. 先补文档和类型，再补功能
3. 不破坏已有 demo
4. 不引入默认后端
5. 不引入登录系统
6. 不引入支付系统
7. 不引入默认云 AI API
8. 所有新增功能必须保持 local-first 默认行为
9. 新增依赖必须说明理由
10. 修改完成后必须运行项目已有测试/构建命令

---

## 十七、推荐执行顺序

请严格按以下顺序推进：

### Step 0：创建工作分支

新建分支：

```bash
git checkout -b feat/prisma-workbench-roadmap
```

### Step 1：仓库审计

输出：

```text
docs/V2_1_PROJECT_AUDIT.md
```

不要改代码。

### Step 2：产品定位文档

输出：

```text
docs/PRODUCT_POSITIONING_2026.md
docs/ROADMAP_2026.md
docs/COMMERCIALIZATION_NOTES.md
docs/NAME_STRATEGY.md
```

### Step 3：设计文档

输出：

```text
docs/design/AUDIT_LEDGER_DESIGN.md
docs/design/CONSERVATIVE_AI_DESIGN.md
docs/design/CHINESE_SOURCE_COMPATIBILITY.md
docs/design/QUALITY_APPRAISAL_MODULE.md
```

### Step 4：README 重构

更新：

```text
README.md
```

要求：

- 先保守修改
- 不要删除原有重要说明
- 可以重排结构
- 可以新增英文/中文定位

### Step 5：landing page 调整

根据仓库实际结构更新 landing page。

要求：

- 低饱和
- 白底
- 学术工具感
- 不要夸张营销
- 明确展示 local-first / audit-ready / quality appraisal / Chinese-source compatibility

### Step 6：最小功能实现候选

只有在前五步稳定后，再选择一个 P0 功能做最小实现。

优先候选：

1. audit ledger 数据结构占位
2. screening ledger JSON/CSV 导出
3. exclusion reason 标准化字典
4. CNKI parser 文档化和测试样例
5. quality appraisal template schema

不要同时做多个。

---

## 十八、每一步完成后的输出格式

每完成一个 step，请输出：

```markdown
## 本阶段完成内容

- ...

## 修改文件

- ...

## 关键设计判断

- ...

## 未处理问题

- ...

## 验收方式

- ...

## 下一步建议

- ...
```

---

## 十九、验收标准

最终本轮任务至少应该完成：

- [ ] `docs/V2_1_PROJECT_AUDIT.md`
- [ ] `docs/PRODUCT_POSITIONING_2026.md`
- [ ] `docs/ROADMAP_2026.md`
- [ ] `docs/COMMERCIALIZATION_NOTES.md`
- [ ] `docs/NAME_STRATEGY.md`
- [ ] `docs/design/AUDIT_LEDGER_DESIGN.md`
- [ ] `docs/design/CONSERVATIVE_AI_DESIGN.md`
- [ ] `docs/design/CHINESE_SOURCE_COMPATIBILITY.md`
- [ ] `docs/design/QUALITY_APPRAISAL_MODULE.md`
- [ ] README 完成第一轮重构
- [ ] landing page 完成第一轮信息架构调整
- [ ] 构建命令通过
- [ ] 没有引入破坏 local-first 原则的新依赖

---

## 二十、重要提醒

请不要做以下事情：

- 不要直接把项目改成收费系统
- 不要加入登录系统
- 不要加入支付系统
- 不要默认接入云端 AI
- 不要默认上传用户数据
- 不要宣传“AI 一键完成系统综述”
- 不要删除已有 V2.1 能力
- 不要把项目定位改成泛化科研治理系统
- 不要过度重构代码结构
- 不要只写营销文案而不处理真实产品边界

本轮优化的目标是：

> 让 PRISMA 从一个已有功能较完整的免费文献筛选工具，升级为定位清晰、路线明确、具备后续商业化空间的 PRISMA Workbench。
