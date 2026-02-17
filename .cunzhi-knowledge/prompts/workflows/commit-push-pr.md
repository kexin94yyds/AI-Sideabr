# /commit-push-pr

提交代码、推送到远程并创建 Pull Request 的内部循环命令。

## 使用场景

- 完成一个功能或修复后
- 日常开发的频繁提交
- 需要快速创建 PR 进行代码审查

## 执行步骤

1. **检查状态**：`git status` 查看变更文件
2. **暂存变更**：`git add -A` 或选择性暂存
3. **生成 commit message**：基于变更内容自动生成符合规范的提交信息
4. **提交**：`git commit -m "<message>"`
5. **推送**：`git push origin <branch>`
6. **创建 PR**（可选）：`gh pr create` 或打开 PR 链接

## Commit Message 规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**: feat | fix | docs | style | refactor | test | chore

## 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--no-pr` | 只提交推送，不创建 PR | false |
| `--draft` | 创建草稿 PR | false |
| `--amend` | 修改上次提交 | false |

## 示例输出

```
✓ Staged 3 files
✓ Committed: feat(auth): add OAuth2 login support
✓ Pushed to origin/feature/oauth
✓ PR created: https://github.com/user/repo/pull/123
```
