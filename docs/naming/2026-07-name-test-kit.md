# M2 名称测试工具包与迁移影响预案

日期：2026-07-13

状态：材料已准备，尚未开展真实用户访谈，尚未选择新名称。

## 1. 决策边界

本轮只测试 `EvidenceDock`、`SiftTrail` 和 `ReviewTrail` 三个候选名称，并记录未来正式更名的影响。本轮不做正式重命名，不修改公开页面、repository、域名、canonical origin、package/app internal ID、schema producer、Bundle producer、持久化 key 或旧项目读取逻辑。

当前公开名称继续使用 `PRISMA Workbench`，当前公开版本线继续使用 `V2.5 dual-review closeout`。保留 `PRISMA Workbench` 作为未来 legacy alias 只是建议，尚未批准；测试结果也不会自动批准迁移。正式更名至少需要完成 5-8 位目标用户测试、检查名称占位风险，并获得维护者批准。

## 2. 测试目的与非目标

### 测试目的

- 判断受访者能否从名称和一句副标题理解这是系统综述相关工具。
- 判断名称是否让人联想到筛选、写作、检索或数据管理。
- 检查即时记忆、延迟回忆和无提示拼写。
- 检查名称是否传达本地优先、过程留痕和未来工作流扩展空间。
- 检查受访者是否误以为产品是 PRISMA 官方软件，或得到 PRISMA Statement 官方授权或背书。
- 收集信任感、偏好排序和具体困惑，不只统计票数。

### 非目标

- 不在小样本访谈后自动宣布获胜名称。
- 不测试 logo、颜色、域名或完整视觉系统。
- 不执行 repository、域名、CLI、数据格式、导出文件名或 runtime producer 迁移。
- 不把便利样本结果描述成统计代表性结论。
- 不提前实施 M3 的 `/start/`、M4 的 Reviewer Bundle 合同或 M5 的 `/methods/` 与导出完整性工作。

## 3. 受访者与个人信息最小化

招募 5-8 位受访者，尽量覆盖研究生、系统综述研究者、方法学人员和有实际文献筛选经验的用户。一个人可以符合多个角色，但记录时只选择最接近其当前工作的宽泛角色。

使用 `P01` 至 `P08` 之类的匿名 ID。只记录宽泛角色和与产品判断有关的回答，不记录姓名、单位、邮箱、具体研究课题、未公开数据或音视频。若确需录音，应另行取得明确同意，并将录音与本评分表分开保管。本工具包默认只做文字记录。

## 4. 测试卡片

主持人每次只展示一张卡片。不要同时展示候选名称的优缺点、中文工作描述、当前品牌或其他候选卡片。中文工作描述仅供主持人整理结果时参考，不作为首轮刺激材料。

### Card A

```text
EvidenceDock
Local-first systematic review screening and evidence workspace.
本地优先的系统综述筛选与证据工作台。
```

中文工作描述：证据工作台。

### Card B

```text
SiftTrail
Traceable literature screening for systematic reviews.
面向系统综述的可追溯文献筛选工具。
```

中文工作描述：筛选轨迹。

### Card C

```text
ReviewTrail
A local-first workflow for systematic reviews.
本地优先的系统综述流程工作台。
```

中文工作描述：综述轨迹。

## 5. 展示顺序

为减少首因和近因偏差，按受访者匿名 ID 轮换六种顺序。`candidate_order` 记录候选在该场访谈中的实际位置 `1`、`2` 或 `3`。

| 受访者 | 顺序 |
|---|---|
| P01、P07 | EvidenceDock -> SiftTrail -> ReviewTrail |
| P02、P08 | EvidenceDock -> ReviewTrail -> SiftTrail |
| P03 | SiftTrail -> EvidenceDock -> ReviewTrail |
| P04 | SiftTrail -> ReviewTrail -> EvidenceDock |
| P05 | ReviewTrail -> EvidenceDock -> SiftTrail |
| P06 | ReviewTrail -> SiftTrail -> EvidenceDock |

受访者不足 8 人时按编号顺序使用；临时更换受访者时保留原匿名 ID 对应顺序。不要根据主持人的个人偏好调整顺序。也可在访谈前随机分配六种排列，但必须先固定结果并记录，不能在访谈过程中改变。

## 6. 主持说明

### 开场白

```text
我们正在测试三个尚未采用的产品名称。请根据你看到的名称和一句说明作答，没有标准答案。我们测试的是名称，不是你的专业知识。三个名称都不是当前正式品牌，你的回答不会直接触发更名。
```

主持人不得说明某个候选“扩展性最好”“更贴近筛选”或“已经做过名称搜索”。除非受访者问到操作方式，否则不要解释 local-first、traceable、evidence workspace 或 PRISMA 的含义。受访者追问时先记录问题，再回答“请先按你的第一理解作答”。

### 单张卡片流程

1. 展示卡片，最多阅读 60 秒，不展示其他候选。
2. 询问第一印象、用途和产品类别。
3. 询问本地优先、可追溯和系统综述相关性的理解，但不纠正回答。
4. 隐藏卡片，要求受访者无提示说出并拼写名称，记录 `unaided_spelling`。
5. 记录即时回忆后再显示下一张卡片。
6. 三张卡片都完成后，询问偏好排序、信任理由和未来扩展判断。
7. 进行 3-5 分钟与命名无关的简短交流后，要求受访者再次回忆三个名称，记录延迟回忆。

### 60 秒首页占位测试

本轮不创建或修改真实首页。每张测试卡片视为未来首页首屏名称和副标题的最小占位版本，阅读上限为 60 秒。主持人逐张询问：“如果只看首页或测试卡片 60 秒，你能否说出它的核心用途？”

如果另行展示当前线上首页，只能作为现有文案理解的控制项，不能把页面上现有的 `PRISMA Workbench` 品牌归因给任何候选名称，也不能将该控制项混入候选名称得分。

## 7. 核心问题

对每个候选名称使用相同措辞：

1. 你认为这是什么工具？
2. 你能记住这个名字吗？请先不要回看卡片。
3. 它更像筛选、写作、检索还是数据管理？如果都不像，请说明你的分类。
4. 你会如何拼写？请在不看卡片时逐字母说出或写出。
5. 你是否误以为它是 PRISMA 官方软件，或得到 PRISMA Statement 官方授权或背书？为什么？
6. 如果只看首页或测试卡片 60 秒，你能否说出它的核心用途？请用自己的话描述。
7. 名称是否让你想到系统综述？依据是什么？
8. 名称是否让你想到本地优先或过程可追溯？依据是什么？

三个候选全部完成后再问：

1. 请按偏好将三个名称排为第 1、第 2 和第 3，并说明理由。
2. 你最信任和最不信任哪个名称？为什么？
3. 哪个名称最适合未来覆盖检索记录、筛选、双审、质量评价和证据导出？
4. 哪个名称最容易与其他产品混淆？你想到什么产品或类别？
5. 还有什么名称风险是前面的问题没有覆盖的？

## 8. 评分表使用说明

使用 [`2026-07-name-test-scorecard.csv`](./2026-07-name-test-scorecard.csv)。一行表示一位受访者对一个候选名称的评价，因此每位受访者应有三行。CSV 只提供稳定表头，不包含虚构示例或测试结果。

### 允许值

- `participant_id`：匿名 ID，例如 `P01`。
- `participant_profile`：`graduate_student`、`systematic_review_researcher`、`methodologist`、`screening_practitioner` 或 `other`。
- `candidate_order`：整数 `1`、`2` 或 `3`。
- `candidate_name`：`EvidenceDock`、`SiftTrail` 或 `ReviewTrail`。
- `first_impression`：逐字记录看到卡片后的第一反应，不先归类或改写。
- `perceived_core_use`：逐字记录受访者对“这是什么工具”的回答。
- `perceived_product_category`：`screening`、`writing`、`search`、`data_management`、`mixed`、`other` 或 `unclear`。
- `understood_systematic_review_use`、`understood_screening_use`、`understood_local_first`、`understood_traceability`、`mistaken_for_official_prisma`、`spelling_correct`、`immediate_recall`、`delayed_recall`、`homepage_60_second_understanding`：只填 `yes` 或 `no`；未提问时留空，不用猜测补值。
- `unaided_spelling`：按受访者实际拼写原样记录；若包含逗号，按标准 CSV 使用双引号包裹。
- `memorability_score`、`clarity_score`、`trust_score`、`extensibility_score`：整数 `1` 至 `5`。
- `homepage_60_second_core_use`：逐字记录 60 秒后对核心用途的复述；不能只记录 yes/no 自评。
- `overall_preference`：整数 `1`、`2` 或 `3`，其中 `1` 为最偏好；不得并列，无法排序时留空并在 `preference_reason` 说明。
- `preference_reason`、`confusion_notes`、`interviewer_notes`：尽量记录受访者原话；包含逗号、双引号或换行时按标准 CSV 转义。

### 1-5 分定义

| 分值 | Memorability | Clarity | Trust | Extensibility |
|---|---|---|---|---|
| 1 | 无法回忆 | 用途判断明显错误 | 明显不可信或排斥 | 只能联想到单一且错误的用途 |
| 2 | 只能模糊回忆 | 仅理解宽泛软件类别 | 信任较低 | 只能覆盖单一当前环节 |
| 3 | 提示后可回忆 | 大致理解研究工作流 | 中性 | 可覆盖相邻环节但需解释 |
| 4 | 无提示回忆，轻微拼写偏差 | 理解系统综述或筛选用途 | 较可信 | 能自然覆盖多数规划环节 |
| 5 | 延迟后仍可准确回忆和拼写 | 准确说出系统综述筛选与证据工作流 | 很可信并能说明原因 | 能覆盖检索记录、筛选、双审、质量评价和证据导出 |

评分优先依据受访者原始回答。主持人不得为了让评分“更整齐”而覆盖矛盾信息；例如受访者自评容易记住但延迟回忆失败时，应保留原话，并按实际表现记录 `delayed_recall=no`。

## 9. 汇总与判定规则

样本只有 5-8 人，报告必须同时展示分子和分母、原始困惑类型及受访者角色，不把结果写成总体市场比例。

1. 先检查 PRISMA 官方关系误认。若同一候选有至少 2 人误认，暂停推荐并修改副标题或重新测试；任何强烈的官方授权误认都必须单独报告。
2. 再检查用途理解。候选应至少让四分之三的受访者识别出系统综述、文献筛选或证据工作流；低于该参考线时不能只靠偏好票数胜出。
3. 检查拼写和回忆。报告准确拼写、即时回忆、延迟回忆的人数，并逐项列出高频错误。
4. 分别报告 clarity、memorability、trust、extensibility 的中位数和取值范围，不用单一总分掩盖风险。
5. 偏好排序只作为一项证据。优先检查受访者的理由是否与计划能力边界一致。
6. 只有候选通过官方关系误认检查、达到基本用途理解参考线，并在至少两个核心维度表现出清晰优势时，才形成“建议进入名称占位与法律检查”的结论。
7. 若没有清晰优势、不同角色结论相反或关键风险重复出现，结论应是补充受访者、调整副标题或继续候选探索，而不是强行选名。

即使形成推荐，也只进入后续域名、商标、软件目录、repository 占位和迁移设计检查。必须另获维护者批准后，才能建立正式迁移分支。

## 10. 迁移影响预案

下表是未来正式更名前的影响清单，不是实施任务。所有未来值均待定，示例候选不得写入 runtime。

| 影响面 | 当前实际值 | 未来可能值 | 持久化影响 | 兼容读取要求 | Redirect / alias | M2 动作 | 正式迁移前的批准条件 |
|---|---|---|---|---|---|---|---|
| Repository display name | GitHub repository `-PRISMA-` | 获批名称对应的 repository 名 | URL 会影响 clone、issues 和外部引用 | Git 历史不变，但文档和自动化需审计 | 依赖 GitHub rename redirect，仍需验证 | 不改 | 名称获批、remote/CI 清单完成 |
| Repository URL 与 inbound links | `github.com/quzhiii/-PRISMA-` | 待定 | 外部书签、论文、badge、issue 链接受影响 | 旧链接需继续可达 | 需要 redirect 与 inbound-link 盘点 | 不改 | 链接清单、回滚方案和 redirect 实测 |
| GitHub Pages 与公开域名 | `https://quzhiii.github.io/-PRISMA-/` | 待定 | 用户书签和公开引用受影响 | 旧路径需保留兼容入口 | 需要主机级 redirect 或兼容页 | 不改 | 新旧主机可复现构建、redirect 和 rollback 实测 |
| Canonical metadata | canonical 页面按当前 route 工作；兼容页使用相对 canonical，绝对 canonical origin 尚未决策 | 获批 origin 与 route | 搜索索引和分享预览受影响 | 不涉及项目文件读取 | 旧 origin 指向新 canonical 前需验证 | 不改 | hosting origin 冻结、每个页面唯一 canonical |
| 页面 title、meta、logo label 与公开文案 | `PRISMA Workbench`，`V2.5 dual-review closeout` | 获批 display name，版本另行决策 | 不影响项目数据，但影响截图和用户认知 | 历史文档需保留上下文 | 旧名称可作为说明性 alias，尚未批准 | 不改 | 双语文案审阅、非隶属声明复核 |
| README 与文档 | 中英文 README 和文档使用当前名称 | 获批名称与迁移说明 | 外部深链和引用受影响 | 历史版本文档不能被静默改写 | 需要名称变更说明和旧称索引 | 不改 | 文档链接盘点和历史材料策略获批 |
| Package / app display name | 无 package manifest；浏览器 UI 使用 `PRISMA Workbench` | 获批 display name | 主要影响 UI 和安装/书签标签 | 不应改变数据读取 | 可在过渡期显示旧称 | 不改 | 明确 display identity 与 internal identity 分离 |
| Package / app internal ID | 当前无独立 package ID；内部仍使用现有 PRISMA 标识 | 待定，默认保留稳定 ID | 可能影响缓存、安装和自动化 | 必须兼容旧 ID | 通常需要长期 alias | 不改 | 证明修改必要性并提供迁移读取 |
| Project schema product / producer | 当前项目保存使用 `version: 2.5-dual-review-release`；project manifest 没有独立 product/producer 字段 | 可选新增获批 display producer，合同待设计 | 影响已有项目文件与导入诊断 | 必须读取无字段和旧值文件 | 字段层面保留 legacy alias 映射 | 不改 | M3 兼容策略与 fixtures 已冻结；不得因品牌改名升 schema major |
| Reviewer Bundle producer | 当前无独立 producer 字段；schema 为 `reviewer_bundle.v1.local` | 可选新增 producer，合同待 M4 决定 | 影响跨设备 Bundle | 必须读取旧 schema 和无 producer Bundle | 需要 producer alias 或忽略 display 差异 | 不改 | M4 合同、round-trip fixtures 和版本策略获批 |
| Export manifest producer | 当前 `project_manifest.json` 没有独立 producer；使用 app version 与 audit schema | 获批名称对应 producer，具体合同待 M5 | 影响导出比较、验证和历史归档 | 旧 manifest 必须继续解析 | 需要 legacy producer 映射 | 不改 | M5 manifest/hash 范围和兼容 fixtures 获批 |
| CLI command | 当前没有已批准或已发布的 CLI | 获批名称对应命令，若未来批准 CLI | 可能影响脚本和文档 | 若先发布旧命令则需 alias | 可能需要命令 alias | 不改 | CLI 进入 roadmap 后单独批准，且 RT-1 稳定 |
| localStorage keys | 包括 `prisma_lang`、`prisma_projects`、`prisma_current_project_id`、`prisma_project_${projectId}`、`prisma_autosave` | 默认保留；是否迁移待定 | 直接影响浏览器已有项目和设置 | 必须继续读取旧 key，写入权威关系需先冻结 | 可能需双读或一次性迁移，但不得在 M2 添加 | 不改 | M7 权威持久化合同、迁移和回滚测试获批 |
| IndexedDB name | `PRISMA_LiteratureDB_v2.2` | 默认保留；是否迁移待定 | 直接影响浏览器本地数据库 | 必须打开并读取旧数据库 | 可能需显式数据库迁移 | 不改 | M7 数据模型与迁移测试获批 |
| Test fixtures 与 assertions | 当前 fixtures 和测试使用 V2.5、旧 schema 与 PRISMA 标识 | 同时覆盖旧值和获批新值 | 错误替换会隐藏兼容回归 | 旧 fixtures 必须长期保留 | 测试同时验证 alias/redirect | 不改现有 runtime fixtures | 兼容矩阵与 golden fixtures 评审通过 |
| Legacy alias | `PRISMA Workbench` 是当前正式 display name，不是 legacy alias | 未来可能作为 legacy alias | 影响旧文件识别、搜索和用户支持 | 旧名称必须能被识别 | 保留时长和展示位置待定 | 只记录建议，未批准 | 维护者批准 alias、期限和弃用策略 |
| 下载文件名 | 包括 `PRISMA-Project-*`、`PRISMA-Collaboration-Seed-*`、`PRISMA-Reviewer-Decision-Bundle-*`、`PRISMA_TRAICE_REPORT.md` 和 `prisma_flow_*` | 获批前缀或保持兼容前缀 | 用户脚本、归档和人工识别受影响 | 文件内容读取不能依赖新前缀 | 可能长期接受新旧前缀 | 不改 | 文件名是否属于合同、兼容期和 fixtures 获批 |
| 已有项目和 Bundle 读取 | 读取当前 V2.5 项目与 `reviewer_bundle.v1.local` Bundle | 同时读取旧值和未来获批值 | 这是正式迁移的核心数据风险 | 必须保持旧项目读取，不做品牌驱动的 schema major 升级 | 使用 producer alias 而非拒绝旧文件 | 不改 | round-trip、旧文件恢复、错误诊断和 rollback 全部通过 |
| 独立项目声明 | 当前明确不隶属于、未获 PRISMA Statement 授权或背书 | 即使新名称不含 PRISMA，工作流描述仍可能提及 PRISMA | 影响法律和用户认知，不影响项目数据 | 历史导出按原文保留 | 新旧品牌页面均需清晰边界 | 不改 | 双语声明和名称误认测试通过 |

## 11. 暂停条件

出现以下任一情况时，M2 只能记录问题，不能顺手实施迁移：

- 需要改 repository name、GitHub Pages 域名或 canonical origin。
- 需要把候选名称写入 package/app internal ID、schema producer、Bundle producer 或 export manifest producer。
- 需要修改 project schema major version、旧项目读取逻辑、Reviewer Bundle 合同或持久化权威关系。
- 需要修改 localStorage key、IndexedDB 名称或下载文件名。
- 需要创建真实新品牌页面、部署预览、push remote 或发布迁移公告。

这些工作必须等待真实访谈结果、名称风险检查和维护者批准，并在独立迁移范围中执行。

## 12. 访谈完成清单

- 已分配匿名 ID 和固定展示顺序。
- 已取得参与同意且未收集不必要个人信息。
- 每位受访者为三个候选各填写一行。
- 已记录原始拼写、即时回忆和延迟回忆。
- 已单独记录 PRISMA 官方关系误认及理由。
- 已记录 60 秒核心用途理解，而非只记录 yes/no 自评。
- 已完成偏好排序和自由意见。
- 汇总报告明确分子、分母、角色差异与样本限制。
- 没有将任一候选写成已采用品牌。
- 没有执行 repository、域名、runtime 或数据迁移。
