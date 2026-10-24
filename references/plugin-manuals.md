# 插件与官方说明书分层索引

本技能就是用户笔记的说明书。分三层，默认只读本表，按需下钻，不默认全读 16 份 README。

- L0 官方与内置打底：内置 `obsidian` skill（文件级读写，库根 `/vol4/1000/Backup/Obsidian/笔记`）＋ kepano `obsidian-markdown` / `obsidian-bases` / `obsidian-cli` / `json-canvas`（`~/.agents/skills/` 下实体，`~/.hermes/skills/` 符号链接；2026-10-24 用 `npx skills add https://github.com/kepano/obsidian-skills.git` 重装后全部可加载，另带 `defuddle`、`knap`）。此前断链时以 [来源与取舍](sources.md) 吸纳的提交 `3ccff53` 为准，现以实际安装包为准。
- L1 本技能定何时用：何时双链/嵌入/Callout/任务/表格/图注，见 [阅读与视觉](visual-design.md)；链接、标题、Properties 与视图边界，见 [Obsidian 约定](obsidian-conventions.md)；查找与写入、读回层次，见 [Obsidian 操作](obsidian-operations.md)；改名/合并预览与受保护保存，见 [影响预览与受保护保存工具](note-tools.md)。
- L2 插件按需查：说明书存库内 `资料/摘录/插件文档/<目录ID>/README.上游.md`（上游默认分支原文，未改写）＋同目录 `来源.md`（仓库＋本地版本＋抓取日期）。用谁读谁，用前先核对 `.obsidian/plugins/<插件ID>/manifest.json` 版本是否与下表一致；README 功能不等于本机已验证。

积极使用原则：正式整理、MOC、连续讲解默认就要有 Obsidian 味（双链成网、嵌入复用、Callout 分层、对比用表、图文紧邻、可检索），干巴才返工；短记与对象页可零装饰。具体触发见 [阅读与视觉](visual-design.md) 的“默认发挥 Obsidian 特色”一节，本表只给每个插件的“该用时用哪一句”。

| 插件 | 目录ID / 插件ID | 本地版本 | 仓库 | 说明书 | 按需读 ＋ 积极用哪一句 |
|---|---|---|---|---|---|
| importer | obsidian-importer | 3.1.15 | obsidianmd/obsidian-importer | `资料/摘录/插件文档/obsidian-importer/README.上游.md` | 导入外部笔记/附件时读；无正文语法，导入后按本技能重写 |
| notebook-navigator | notebook-navigator | 3.4.3 | johansan/notebook-navigator | `资料/摘录/插件文档/notebook-navigator/README.上游.md` | 启动主页/导航时读 Getting started；无正文语法，不为它改目录 |
| sync-engine | sync-engine | 3.3.2 | hesprs/sync-engine | `资料/摘录/插件文档/sync-engine/README.上游.md` | 同步行为异常时读 Claims/Extensible；无正文语法，不把同步状态写进正文 |
| style-settings | obsidian-style-settings | 1.0.9 | obsidian-community/obsidian-style-settings | `资料/摘录/插件文档/obsidian-style-settings/README.上游.md` | 要调 `cssclass`、多彩高亮、`class-toggle` 时读 `heading`/`class-toggle` 节；默认不开多彩 |
| cm-chs-patch | cm-chs-patch | 1.14.0 | aidenlx/cm-chs-patch | `资料/摘录/插件文档/cm-chs-patch/README.上游.md` | 中文检索异常时读；无正文语法 |
| quiet-outline | obsidian-quiet-outline | 0.5.21 | guopenghui/obsidian-quiet-outline | `资料/摘录/插件文档/obsidian-quiet-outline/README.上游.md` | 长文大纲浏览时读 Features；正文侧保持二级作章节即可 |
| quickadd | quickadd | 2.32.1 | chhoumann/quickadd | `资料/摘录/插件文档/quickadd/README.上游.md` | 新建入口/模板变量时读 What you can build；路径以本库模板为准 |
| omnisearch | omnisearch | 1.31.0 | scambier/obsidian-omnisearch | `资料/摘录/插件文档/omnisearch/README.上游.md` | 要写复杂查询时读 Documentation 节；不默认背诵查询语法 |
| latex-suite | obsidian-latex-suite | 1.14.0 | artisticat1/obsidian-latex-suite | `资料/摘录/插件文档/obsidian-latex-suite/README.上游.md` | 公式要 auto-fraction/matrix 快捷时读 Usage/Features；正文仍讲清符号与前提 |
| hover-editor | obsidian-hover-editor | 0.11.31 | nothingislost/obsidian-hover-editor | `资料/摘录/插件文档/obsidian-hover-editor/README.上游.md` | 悬浮对照时用；无正文语法 |
| excalidraw | obsidian-excalidraw-plugin | 2.29.0 | zsviczian/obsidian-excalidraw-plugin | `资料/摘录/插件文档/obsidian-excalidraw-plugin/README.上游.md` | 要画图或走 agent CLI 时读 Native CLI 节；核心解释仍留 Markdown |
| advanced-canvas | advanced-canvas | 7.1.0 | developer-mike/obsidian-advanced-canvas | `资料/摘录/插件文档/advanced-canvas/README.上游.md` | 画结构时读 Terminology/Standardized Format；Canvas 不替代正文 |
| tasks | obsidian-tasks-plugin | 8.6.0 | obsidian-tasks-group/obsidian-tasks | `资料/摘录/插件文档/obsidian-tasks-plugin/README.上游.md` | 积极用 `- [ ]` 任务行（MOC 待办）；Tasks search 深层语法指向上游，本技能不复述 |
| text-extractor | text-extractor | 0.7.0 | scambier/obsidian-text-extractor | `资料/摘录/插件文档/text-extractor/README.上游.md` | 标 Unmaintained；PDF/图片提数备选，摘录仍手动核对 |
| tag-wrangler | tag-wrangler | 0.6.5 | pjeby/tag-wrangler | `资料/摘录/插件文档/tag-wrangler/README.上游.md` | 要改名标签/建 Tag Pages 时读对应节；标签复用少量稳定词 |
| advanced-tables | table-editor-obsidian | 0.23.2 | tgrosinger/advanced-tables-obsidian | `资料/摘录/插件文档/table-editor-obsidian/README.上游.md` | 短项比较制表时读 How to use；长解释回正文 |

未启用：`obsidian-minimal-settings` 在 `.obsidian/plugins/` 存在但不在启用名单，不列入上表；要启用先核对后再补行。不为装饰装新插件；dataview/admonition/buttons/kanban 不在库内，需要视图先核实插件已装（见 [阅读与视觉](visual-design.md) 边界）。
