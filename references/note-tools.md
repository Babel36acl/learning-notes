# 影响预览与受保护保存

仅在用户要求改名/合并前检查，或实际保存与恢复笔记时读取。本工具不执行改名、合并、发布或删除；不让普通短记先做全库预览。工具输出用于操作过程，给用户说明具体影响与结果，不塞进学习正文。

## 可用环境与入口

入口是 [notes_tool.cjs](../scripts/notes_tool.cjs)，需要 Node.js 18 或更新版本，无第三方运行依赖。`preview`、`prepare`、`status` 使用本地文件，Windows/Linux/macOS 路径由 Node 处理；实际跨平台运行仍要验证。`apply`、`restore` 还需要运行中的桌面 Obsidian、当前可用的 CLI `eval` 与 Vault API。没有客户端的 Hermes 主机可以预览和准备方案，不能把本工具当作无需客户端的远程保存服务。

先核对实际库根、`.obsidian`、CLI 帮助和目标库名称。所有笔记路径为库内相对路径、使用 `/`；目标库根、输出及状态目录用绝对路径。不接受越界、隐藏目录、路径联接或符号链接目标。保存只支持 UTF-8 Markdown；单个读取文本上限 16 MiB，超过则报告，不能当作空文件。

下列 PowerShell 示例中的变量由本次实际环境确定，不能照抄占位路径创建真实笔记。`$tool` 指向当前安装包内 `scripts/notes_tool.cjs`。其他 shell 使用各自正确的参数数组/引用方式。

```powershell
node $tool help
node $tool preview --vault $vaultPath --request $previewRequest --out $previewOutput
node $tool prepare --vault $vaultPath --request $editRequest --out $savePlan
node $tool status --plan $savePlan --state-dir $stateDir
node $tool apply --plan $savePlan --state-dir $stateDir --obsidian $cliPath --vault-name $vaultName
node $tool restore --plan $savePlan --state-dir $stateDir --paths '["笔记/示例.md"]' --obsidian $cliPath --vault-name $vaultName
```

请求与返回均为 JSON。`--out` 必须是库外的新文件，不覆盖已有输出。状态目录固定在库外、技能目录之外；同一库的调用共用同一状态目录。计划和回执含原文备份，属于本地运行数据，不放入技能分发包或知识正文，不随代码上传。

## 只读影响预览

改名请求：

```json
{"action":"rename","source":"笔记/旧名.md","target":"笔记/新名.md"}
```

合并请求：

```json
{"action":"merge","sources":["笔记/A.md","笔记/B.md"],"target":"笔记/B.md","candidateContent":"# 合并后标题\n保留的正文与块 ^block-id\n"}
```

`candidateContent` 可省略；省略时明确不能核验合并后的锚点是否保留。预览假定源页退役、目标页保留，报告中 `afterWithoutLinkUpdate` 表示尚未更新链接时的解析候选，不代表 Obsidian 改名后仍会留下这些断链。

报告包含目标冲突、同名文件、Wiki/Markdown 链接与嵌入、标题/块引用、引用式 Markdown 的定义位置、Canvas 文件与文字节点、源页附件引用，以及移动后相对链接可能改变的位置。合并会列出重复标题/块及候选正文缺失的锚点。附件被引用不代表仅由该页拥有，更不授权删除。

静态解析采用保守候选集合，不冒充 Obsidian `metadataCache`。同名歧义、标题格式与重复标题、Setext 标题、复杂 Markdown、普通 YAML 路径值、HTML、Bases/插件计算引用、隐藏/链接目录、库外应用与其他库引用，保留为不确定范围。解析不到不等于没有影响；客户端可用时继续核对实际解析目标。

`scannedVersions`、`sourceVersions` 记录所读内容版本，预览不是全库原子快照。执行结构改动前重新核对相关页；预览本身不修改任何笔记，也不自动创建占位页。

## 准备与保存

已有页使用明确的旧文本/新文本补丁；每个旧文本必须恰好匹配一次，不使用同词全局替换。示例：

```json
{"edits":[{"path":"笔记/示例.md","replace":[{"old":"旧解释。","new":"新解释，保留适用条件。"}]},{"path":"笔记/新记录.md","create":"# 新记录\n用户明确要留下的内容。\n"}]}
```

`prepare` 读取基线并生成计划，不改笔记。计划包含可读的 `review`、操作 ID、目标、原文备份、预期 SHA-256 和写后 SHA-256。补丁只改变明确片段，保留其他字节；支持保留 UTF-8 BOM 与已有 CRLF。新页必须不存在，不自动创建父目录。需要完整改写时，完整旧正文也必须成为明确匹配对象，不能以空旧文本绕过保护。

`apply` 在客户端内再次核对实际库路径。已有页使用 `Vault.process`，在同步回调里对当前文本核对预期版本，再返回新文本；编辑器有尚未保存的不同内容时停止。新页通过 `Vault.create` 创建，并检查目标未占用。原文及操作记录先写到库外，再修改目标，写后读回磁盘字节。

同一操作 ID 的成功目标不重复执行；同 ID 换内容会拒绝。若别人已把目标改成期望内容，标 `already_matches`，不声称由本工具写入，也不允许据此撤销别人的修改。批量操作逐页记录，失败即停，返回 `partial` 时保留已成功结果；没有多页全部成功或全部回滚的事务保证。

保护范围是本接口及 Obsidian 的对应修改 API。它不是外部编辑器、同步软件和多宿主共享文件系统的分布式锁，不能宣称阻止所有来源的并发修改。所有写入都在被授权的具体目标范围内；CLI、API 或版本检查不可用时停止本接口，不自动退回无保护文件覆盖。

## 超时、恢复与状态

传输失败或超时可能已写入，先运行 `status`。结果不明不立即重试或恢复。回执显示中断且磁盘已经是目标内容时可确认结果；回执显示中断而磁盘还是旧内容时仍保留 `write_uncertain`，不靠“看起来没变”自动重放。

已完成目标后来被改动，标 `changed_after_commit`，即使又变回旧文本也不重放原操作。局部恢复必须显式选择原计划路径；只有当前内容仍等于本次写入结果，且回执证明本次操作实施了修改，才经相同原子接口恢复原文。人工新改动、仅外部已达成的目标状态、来源不明的回执均不覆盖。新建页的恢复涉及删除，本接口不提供自动删除。

`writer.lock` 只串行化共用此状态目录的工具请求。活着的进程或其他主机持有的锁不会抢占；仅确认本机旧进程不存在时可清理其遗留锁。状态不明或进程 ID 被复用时停止，不能凭时间认定锁过期。回执保存失败也不能继续盲写。

操作输出区分 `completed`、`partial`、`stopped`、`write_uncertain`、`unavailable`、`failed`；文件级状态还区分基线冲突、人工后改、已匹配与恢复状态。CLI 成功返回不替代内容读回，文件写入不替代客户端索引/显示或其他设备同步验证。

## 验证与其余扩展

运行 [test_notes_tool.cjs](../scripts/test_notes_tool.cjs) 可在独立临时目录检查真实文件读写与模拟 Vault API 的冲突、重复提交、中断、部分成功及恢复。测试不启动真实库，也不证明客户端实际写入或其他宿主已通过。

后续四项保留在现有职责位置，不创建空脚本或宣称实现：结论追溯由 [问题检索](knowledge-inquiry.md) 承接；附件定位与增量导入由 [整库构建](knowledge-base-construction.md) 承接；临时 Bases/Canvas 由 [Obsidian 约定](obsidian-conventions.md) 承接；多宿主版本体检由 [技能维护](skill-maintenance.md) 承接。出现明确任务再实现相应工具。

实现依据：官方 [Vault 文档](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Plugins/Vault.md) 与 [Obsidian API 类型定义](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts)。使用前仍核对当前客户端能力；2026-10-19 本机曾读到 Obsidian 1.14.4 与相关 API 可用，之后客户端关闭，尚未完成真实临时库的正向写入试验。
