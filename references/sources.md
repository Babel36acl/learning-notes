# 来源与取舍

2026-10-19.4 新增独立编写的影响预览与受保护保存工具，使用官方 [Vault 修改接口](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Plugins/Vault.md) 的当前内容回调核验方案；没有移植 EchoInk 事务实现。静态引用解析、客户端写入和模拟接口验证分别界定，见 [工具入口](note-tools.md)。此前“不冒充已经提供事务工具”的取舍仍禁止将本次逐页保护说成跨宿主或多页原子事务。

本轮复核：2026-10-19。用于维护技能和追溯取舍，普通写作不必逐次加载。用户指定的对话“继续分析和搜索”（6ad57280-88f0-83e8-9e4a-26bb55ace3ea）提供需求与候选来源；对话中的助手结论只作线索，本轮重新打开原文和实际模板核对。

分发修复 `2026-10-19.3`：用户反馈 Hermes 将无 frontmatter 的嵌套 SKILL.md 也注册为同名技能。本轮核对了 [Hermes 上游技能消歧实现](https://github.com/NousResearch/hermes-agent/blob/eea83bb603c397396acaf6cc453cf3012a8524aa/agent/skill_utils.py)：不同内容的同层同名候选拒绝择一。修复本技能包的额外入口，保留加载器规则；Windows 目录联接不依赖嵌套层。验收改为完整文件清单与全部 SKILL.md 枚举，并覆盖远端安装残留。本轮未登录用户的 Hermes 主机；上游固定版本验证不等于该主机现场验证。

## 方法怎样改变默认行为

| 来源 | 吸收为具体做法 | 不扩大成什么要求 |
|---|---|---|
| [Kepano 的实际说明](https://stephango.com/vault)、[论坛 50251](https://forum-zh.obsidian.md/t/topic/50251) | 对象记录可只有必要信息；模板可无正文栏目；有意的未建页链接是联系线索 | 不照搬少文件夹、属性分类、评分制，也不为每个名词自动建页 |
| [Evergreen 模板](https://github.com/kepano/kepano-obsidian/blob/main/Templates/Evergreen%20Template.md)、[Journal 模板](https://github.com/kepano/kepano-obsidian/blob/main/Templates/Journal%20Template.md)、[Out of Control 对象页](https://github.com/kepano/kepano-obsidian/blob/main/References/Out%20of%20Control.md) | 前两者没有预设正文栏目，后者只有属性，说明不同页面可以有不同文字量 | 只借形态，不照搬属性值及未加引号的日期变量；本库仍按原生语法保留日期引号 |
| [Andy：Evergreen notes should be atomic](https://notes.andymatuschak.org/zNUaiGAXp21eorsER1Jm9yU) | 尽量完整地表达一件事，权衡过宽与过碎；按复用需要确定粒度 | 不固定字数，不把一段依赖连续上下文的推导拆成大量短页 |
| [Ryooo：KG 新版及讨论](https://forum-zh.obsidian.md/t/topic/52933) | 关注概念与关系，先收录，内容增长后按独立使用需要拆分 | 不规定每个关系独立成篇，不照搬固定关系名和命名法 |
| [Nick Milo：Habits Map](https://blog.linkingyourthinking.com/notes/habits-map) | 分组与阅读线索可以表达理解，MOC 可随材料继续生长 | 不只做文件目录，也不要求每个主题都有 MOC 或叙述性导读 |
| [Maggie Appleton：数字花园](https://maggieappleton.com/garden-history) | 允许未完成、澄清和持续改写，保留认识发展的痕迹 | 不将公开花园的成熟度标记变成私人笔记统一的升级流程 |
| [Simon Willison：pytest-httpx 调试笔记](https://til.simonwillison.net/pytest/pytest-httpx-debug) | 从具体问题进入，代码和解释紧邻；按理解需要决定篇幅 | 不将技术笔记统一成短模板或交付规程，不借作者案例声称用户工程已验证 |
| [Lillian Who：Commonplace book](https://lillianwho.com/posts/commonplace-book/) | 围绕自己的问题取材，摘录与批注可以并列 | 不必总结完整书籍，也不强迫无个人输入时填“我的思考”；其手写效果论断未作为规则依据 |
| [Tiago Forte：渐进式摘要案例](https://fortelabs.com/blog/progressive-summarization-ii-examples-and-metaphors/) | 回读时逐步突出重点，保留早期层次和理解所需上下文 | 不一次处理所有层次；AI 摘要不是读者已经理解的证明 |
| [Cornell：概念图](https://lsc.cornell.edu/how-to-study/concept-maps/) | 用关系词说明概念怎样相关，借图澄清关系 | 不要求每篇画图，不用连线数量代替解释，不把并列误画成因果 |
| [Silicon：论坛 51185 及 2026-08-15 作者回复](https://forum-zh.obsidian.md/t/topic/51185/6) | 允许关键词和临时标题，回看时补容易遗忘的联系 | 作者承认未继续发展方法；不作为成熟标准，不采纳记忆容量等未验证判断 |

这些是实践、作者经验和教学建议，不能统称经过实验验证的最佳笔记系统。常青笔记、KG、对象记录和数字花园的目标不同；按当前用途取用，不能拼成一套必须走完的流程。卡片可以是一段论述或问题，不强制完整自足；本轮未逐页复核卢曼档案研究中的历史细节，未据此新增具体历史事实。

## 工具与组织的职责

[Obsidian 链接](https://help.obsidian.md/links)、[Properties](https://help.obsidian.md/properties)、[Bases](https://help.obsidian.md/bases) 和 [CLI](https://help.obsidian.md/cli) 用来处理格式与操作，不决定笔记是否需要结论、个人思考或复习题。实际能力与解析仍须按本机确认。

[PARA](https://fortelabs.com/blog/para/) 可帮助归属，[Blue Topaz 示例库](https://github.com/PKM-er/Blue-topaz-example) 可提供导航和样式参考；知识正文不因此按任务管理组织。既有来源中的 Starter Vault、Dusk、distill 等仍可在修改前备份追溯，本轮没有新增安装依赖或宣称已验证它们。

## 本轮直接读取的模板

通过 GitHub 作者仓库 contents API 读取：Evergreen Template.md blob `334fd382135765482e9445f1f58012e363cab640`；Journal Template.md blob `0a24d28e3fc865a744166fd4ea1bd9fc24aaf49c`；Out of Control.md blob `c8d8f4f6213b537f9b773eaf68a4cad992f0ef09`。没有整份复制这些文件进用户库。

## 2026-10-19 仓库与 PDF 吸纳

本次版本 `2026-10-19.2` 基于已完成的方法审查；以下链接固定到实际审读提交。条目是本技能的适配，不等于原项目要求。

| 来源 | 采用与边界 |
|---|---|
| [花园 ACCESS 组织](https://github.com/oldwinter/knowledge-garden/blob/96d0a6045a63550571c11717cf8da0f847357daa/%F0%9F%8D%80%20%E8%8A%B1%E5%9B%AD%E5%AF%BC%E8%A7%88/%F0%9F%A7%B0%20%E6%9C%AC%E5%BA%93%E6%8C%87%E5%8D%97/Tutorials/%E6%9C%AC%E5%BA%93ACCESS%E6%96%87%E4%BB%B6%E5%A4%B9%E7%BB%93%E6%9E%84%E4%B8%8E%E6%B7%B7%E5%90%88%E7%AC%94%E8%AE%B0%E6%B3%95.md#L1-L40) | 采用多入口检索与职责映射；沿用实际目录，不迁移命名体系 |
| [花园搜索旧笔记](https://github.com/oldwinter/knowledge-garden/blob/96d0a6045a63550571c11717cf8da0f847357daa/%F0%9F%8D%80%20%E8%8A%B1%E5%9B%AD%E5%AF%BC%E8%A7%88/%F0%9F%A7%B0%20%E6%9C%AC%E5%BA%93%E6%8C%87%E5%8D%97/Tutorials/obsidian%E4%B8%AD%E5%A6%82%E4%BD%95%E6%90%9C%E7%B4%A2%E6%89%BE%E5%88%B0%E4%BB%A5%E5%89%8D%E5%86%99%E8%BF%87%E7%9A%84%E7%AC%94%E8%AE%B0.md#L1-L14) | 采用按线索扩展检索；不要求一句速记先遍历全库 |
| [花园关系说明](https://github.com/oldwinter/knowledge-garden/blob/96d0a6045a63550571c11717cf8da0f847357daa/Sources/Articles/%E5%B8%B8%E9%9D%92%E7%AC%94%E8%AE%B0%E9%98%85%E8%AF%BB%E7%AC%94%E8%AE%B0/%E4%BC%98%E5%85%88%E4%BD%BF%E7%94%A8%E7%BB%8F%E8%BF%87%E6%A0%87%E6%B3%A8%E7%9A%84%E5%85%B3%E8%81%94.md#L1-L21) | 采用关系语义；导航不自动等于支持或因果 |
| [EchoInk 知识维护协议](https://github.com/AKin-lvyifang/codex-echoink/blob/1077a6bb7ed4cb8c7e7c326dadc80e538e1d39a4/src/knowledge-base/knowledge-maintenance-protocol.ts#L8-L95) | 改造成正式维护的内部骨架与最小增量；允许已有解释足够、不新增 |
| [EchoInk 知识问答协议](https://github.com/AKin-lvyifang/codex-echoink/blob/1077a6bb7ed4cb8c7e7c326dadc80e538e1d39a4/src/harness/pi-native/knowledge-ask-protocol.ts#L5-L62) | 采用读取范围、上下文和来源降级；按任务需要补读 |
| [EchoInk 内置方法](https://github.com/AKin-lvyifang/codex-echoink/blob/1077a6bb7ed4cb8c7e7c326dadc80e538e1d39a4/src/harness/resources/builtin-skills.ts#L45-L238) | 按需采用决定性澄清、两层解释、比较、时效核验、多视角、最小验证和回顾；不搬固定界面与重复审批 |
| [EchoInk 来源校验](https://github.com/AKin-lvyifang/codex-echoink/blob/1077a6bb7ed4cb8c7e7c326dadc80e538e1d39a4/src/knowledge-base/knowledge-maintenance-protocol.ts#L98-L140) | 可读链接与机器来源集合应对应且属于锁定来源子集；标记不能代替校验工具 |
| [EchoInk 写入协调](https://github.com/AKin-lvyifang/codex-echoink/blob/1077a6bb7ed4cb8c7e7c326dadc80e538e1d39a4/src/knowledge-base/phase3-maintenance-service.ts#L350-L1109) | 采用版本核对、读回与部分完成恢复思想；不冒充本技能已经提供事务工具 |
| [EchoInk 技能运行](https://github.com/AKin-lvyifang/codex-echoink/blob/1077a6bb7ed4cb8c7e7c326dadc80e538e1d39a4/src/harness/resources/skill-runtime.ts#L1-L160) | 借鉴人工修改保护；不移植自动衰减、归档和删除笔记 |
| [花园合并已引用页面](https://github.com/oldwinter/knowledge-garden/blob/96d0a6045a63550571c11717cf8da0f847357daa/%F0%9F%8D%80%20%E8%8A%B1%E5%9B%AD%E5%AF%BC%E8%A7%88/%F0%9F%A7%B0%20%E6%9C%AC%E5%BA%93%E6%8C%87%E5%8D%97/Obsidian/obsidian%E7%9B%B8%E5%85%B3%E7%AC%94%E8%AE%B0/obsidian%E4%B8%AD2%E4%B8%AA%E5%9D%87%E8%A2%AB%E5%BC%95%E7%94%A8%E8%BF%87%E7%9A%84%E9%A1%B5%E9%9D%A2%E5%A6%82%E4%BD%95%E9%87%8D%E7%BB%84%E5%90%88%E5%B9%B6.md#L1-L19) | 检查引用和内容保留；不对同词批量替换 |
| [花园改名经验](https://github.com/oldwinter/knowledge-garden/blob/96d0a6045a63550571c11717cf8da0f847357daa/%F0%9F%8D%80%20%E8%8A%B1%E5%9B%AD%E5%AF%BC%E8%A7%88/%F0%9F%A7%B0%20%E6%9C%AC%E5%BA%93%E6%8C%87%E5%8D%97/Obsidian/obsidian%E7%9B%B8%E5%85%B3%E7%AC%94%E8%AE%B0/obsidian%20%E7%AC%94%E8%AE%B0%E6%96%87%E4%BB%B6%E6%89%B9%E9%87%8F%E9%87%8D%E5%91%BD%E5%90%8D%20-%20%E5%8D%83%E4%B8%87%E5%88%AB%E5%9C%A8%E5%A4%96%E9%83%A8%E7%94%A8%E8%84%9A%E6%9C%AC%E5%AE%9E%E6%96%BD.md#L1-L13) | 重视客户端引用更新；仍须核对锚点、嵌入和外部引用 |

附件《Obsidian + Claude Code：用 AI 重建你的第二大脑》共 58 页，SHA-256 `49c6e94e8f2104c40fdfdb9f7c1332c1a56058cff1a2a87f906f62c918f8ab04`。采用第 21–24 页的分层规则入口思路及第 34–44 页的整理/输出回流，区分规则路由和内容 MOC。未采用自动为所有实体建页、固定每篇属性、全库回退和未验证的产品/性能结论。全部页文字已审读，视觉只核对 26、35、37、47 页。

花园当前提交为 `96d0a6045a63550571c11717cf8da0f847357daa`，EchoInk 为 `1077a6bb7ed4cb8c7e7c326dadc80e538e1d39a4`。覆盖清单含全部 2,007 个跟踪文件；花园 473 个候选采用抽取段落筛查与关键正文展开，不声称 961 篇逐字精读。代码路径只做静态审读，没有运行 EchoInk 产品。

未把固定 300 字、固定比例、“六个不搞”、间隔复习调度、元数据齐全、图谱稠密或收件箱清零变成规则。停止加工、修正传播与有限交接是本次综合设计；MAPS 链接不能证明缺失目标文章的内容。

许可按文件判断：EchoInk 的 MIT/PRO 范围见该提交 LICENSE，功能名称不能替代路径；花园翻译、摘录另有归属。本技能仅采用自己的方法总结，不包含 PRO 实现或整篇译文。格式与方法来源不能授予安装、发布、设备运行或更新长期记忆的权限。

## 2026-10-24 kepano obsidian-skills 吸纳

来源仓库 `https://github.com/kepano/obsidian-skills`，提交 `3ccff5338ea700537839b21900aa5358a0402c98`（2026-09-15），本地浅克隆仅读 `skills/obsidian-markdown`、`obsidian-bases`、`obsidian-cli`、`json-canvas` 的 SKILL 与 references，未安装到用户库，未复制整包。

| 采用 | 边界 |
|---|---|
| `obsidian-markdown` 的内/外链分工（库内 `[[wikilink]]`、外部 `[text](url)`）、嵌入（`![[页#标题]]`、图片尺寸、按视图嵌入 Bases）、Callout 类型与折叠（`-`/`+`）、Properties 类型与标签规则、注释 `%% %%`、高亮 `== ==`、脚注、Mermaid `internal-link` | 只取语法清单，不照搬其 `title/date` 示例值，不把“每页必备完整 frontmatter”变成新规则；短记仍可零装饰（T36） |
| `obsidian-bases` 的 YAML 引用规则与公式需引号、Duration 取 `.days` 后再计算、未定义 `formula.X` 不引用 | 只在确需 Bases 视图时启用，不为 MOC 标配 Bases；本轮未在真实库建 `.base` |
| `obsidian-cli` 的 `vault=`/`file=`/`path=` 定位与 `dev:screenshot` 阅读视图验收 | CLI 是否可用仍按本机实际确认，不把远端文档能力当本次已验证 |

本次触发：`知识/工具链/LVGL/00-LVGL学习地图.md` 在 Blue Topaz 阅读视图出现文件名与正文 H1 同义重复（`00-LVGL学习地图` 与 `# LVGL学习地图（暂定大纲，供审查）`），且五个平行入口挤在长段落、约束与待核验未用 Callout/列表/表格区分。修复规则只收敛到“单一视觉标题＋拥挤时才取用语法”，不扩大成每篇必填栏目。

## 2026-10-24 Blue-topaz-examples 与主题说明书吸纳

阅读范围（只读，未安装插件、未改用户库）：`Blue-topaz-examples/README.md`（内置插件表、cssclass 表、ad 类型表）、`从这开始.md`、`00-Tips/🥑Blue Topaz Themes Tips.md:1-530`（强调两三种、多彩高亮、cloze、图片尺寸/对齐/行内/标题、勾选框、mermaid、cssclass）、`10-Help/【md】Blue topaz--style setting 插件设置内容 简介.md:1-120`（配色与背景结构）、`77-Example/各级标题示例.md:10-16`、`77-Example/ob提示框(callout)样式展示.md:15-100`。本库核对：`.obsidian/appearance.json`（`cssTheme: Blue Topaz`，snippets 含 `artcore` 系）、`community-plugins.json`（16 个：style-settings、tasks、table-editor、tag-wrangler 等，无 dataview/admonition/buttons/kanban）。

| 采用 | 边界 |
|---|---|
| 一级作文档标题、二级作章节；连续两个 `# 一级标题` 为反例，支撑单一 H1 规则 | 示例页本身含重复 H1 与超长填充段，仅取标题层级语义，不取其正文 |
| 原生 Callout 13 类＋折叠＋自定义标题；主题纯 CSS 类 `cloze/hibox/blank/indent/left-center-right/xx%`；单页 `cssclass`（`artcore/code-wrap/img-grid/inline-list/fullwidth/noyaml/cloze`）；图片 `\|300`、`\|R/L`、`\|inl`、`#center` 标题；Mermaid 原生块 | `kanban/bookinfo/timeline`、旧 ` ```ad-xxx ` 语法、dataview/dvjs、buttons、主页脚本一律不引入；多彩高亮只在 style-settings 2.1.4 或单页 `colorful-highlight` 条件下用；示例库排除在正式索引外，只作读法参考 |

## 2026-10-24 思源新手指南与 16 插件文档吸纳

用户指定对标 `https://siyuannote.com/article/1724525755`（《快速上手思源笔记》，NotionNext 渲染，h1×3/h2×4/h3×4/h4×13、图片×22、表 0），本地抓包仅作版式分析，未复制正文。取其四点，转写为 Obsidian 原生实现：标题层级即目录（一级一用、二级作章节，与单一 H1 规则同构）；过程用有序列表一事一步；图贴在该步下面并配一行斜体图注（Obsidian 用 `![[a.png|600]]`＋图注行，Blue Topaz 可用 `#center` 标题）；轻量提示用行内 `💡/⚠️ 一句话`，只有禁区/正确序列/待核验才升 Callout。

16 插件文档存 `资料/摘录/插件文档/`（各 `README.上游.md`＋`来源.md`，以上游默认分支原文为准）： cited 为技能备料，不默认全读。已用：tasks 的 `- [ ]` 任务行（MOC 待办，深层查询语法仍指向上游用户指南，本技能不复述）；latex-suite 默认 snippets 机制（公式仍以正文讲清符号为准）；text-extractor 标为 Unmaintained，只作 PDF/图片提数备选（摘录仍以手动核对为准）；其余 13 个按需取用，不为装饰装插件。
