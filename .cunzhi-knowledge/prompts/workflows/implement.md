# /implement

**模板分类**: Action

按照提供的计划文件（通过 `$ARGUMENTS` 传递路径）实施每个步骤，不偏离范围。

## 指令

- 在更改之前阅读整个计划；如有歧义，在内联注释中澄清假设
- 根据实施范围查阅相关文档
- **修改共享模块前**: 检查依赖项并理解影响
- 按文档顺序执行任务，仅触及列出的文件，除非计划明确允许
- 保持提交增量且逻辑分组，使用 Conventional Commit 格式引用问题号
  - **关键**: 避免在提交消息中使用元评论模式
  - 使用直接陈述: `feat: add search filters` 而非 `Based on the changes, this commit adds search filters`
- 保持在正确的工作分支上

## 验证

在创建 PR 之前，选择并执行适当的验证级别：

1. 查阅验证指南了解验证级别
2. 根据更改确定正确级别：
   - **Level 1** (快速): 仅文档、配置注释 (lint + typecheck)
   - **Level 2** (集成): 功能、bug、端点 (**默认**)
   - **Level 3** (发布): Schema、认证、迁移、高风险更改

3. 按顺序运行所选级别的所有命令
4. 捕获每个命令的输出和状态
5. 任何命令失败时立即停止；修复后再继续

## 报告

提供执行的实施工作的简洁列表。

**不要包含:**
- Markdown 格式
- 解释性前言
- 多段描述

**正确输出:**
```
- Modified src/api/routes.ts: added rate limiting middleware (45 lines)
- Created tests/api/rate-limit.test.ts: 15 integration tests added
- Updated src/auth/middleware.ts: integrated rate limit checks
- Validation: Level 2 selected (feature with new endpoints)
- Commands executed: lint (pass), typecheck (pass), integration tests (pass)
- git diff --stat: 4 files changed, 156 insertions(+), 12 deletions(-)
- Implementation complete, ready for PR
```
