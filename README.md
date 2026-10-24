# learning-notes

写给以后回看的用户本人的中文学习笔记技能：保留真实疑问、因果、例子和认识变化；支持随手记、摘录、连续讲解、Obsidian 旧页融合、问题检索、冲突与时效核验、按需回顾，以及改名/合并影响预览和受保护保存。普通问答、代码审查和 AI 交接不自动入库。

当前版本见 `SKILL.md` 的 `metadata.version`（如 `2026-10-24.3`）。

## 安装

```bash
# 任选其一
npx skills add https://github.com/<你>/<仓库名>
```

- Claude Code：把本仓库内容放到 vault 根的 `/.claude`（或所用目录），详见官方 Skills 文档。
- Codex：将 `skills/` 思想对应为本仓库根直接拷贝到 Codex skills 路径（如 `~/.codex/skills/learning-notes`）。
- OpenCode：整仓克隆到 `~/.opencode/skills/learning-notes`，重启后自动发现。

## 目录

- `SKILL.md`——唯一技能入口（全包恰一个 `SKILL.md`）。
- `references/`——写法、方法、检索、维护、回顾、整库构建、Obsidian 约定/操作、排版、来源共 15 个参考。
- `scripts/`——只读影响预览与受保护保存工具（Node.js 18+，无第三方依赖）及测试。
- `agents/openai.yaml`——兼容入口。

## 版本与迭代

- 改规则只改一处，`SKILL.md` 只做路由（见 `references/skill-maintenance.md`）。
- 普通笔记任务不加载 `skill-maintenance.md`；行为验收用 `references/validation-scenarios.md` 在隔离目录验证。
- 工具运行产生的计划、原文备份、回执一律放包外，不提交。

## 出处

方法取舍见 `references/sources.md`；Blue-topaz-examples 与主题说明书只作读法参考，不作工程事实。
