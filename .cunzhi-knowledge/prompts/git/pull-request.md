# /pull-request

**模板分类**: Path Resolution

实施工作完成并验证后打开 GitHub Pull Request。

## 变量

- branch_name: $1
- issue_number: $2
- plan_file: $3 (相对路径)

## 输出格式要求

**仅**返回 PR URL 作为纯文本单行。

**不要包含:**
- 解释性文本
- Markdown 格式
- 多行或额外评论
- PR 元数据

**正确输出:**
```
https://github.com/user/repo/pull/123
```

## 前置条件

- 工作区干净（`git status --short` 为空）
- 所有提交本地和远程都存在
- **提交消息已验证**: 所有提交消息遵循 Conventional Commits 格式
- Level 2 或更高验证已通过

## 准备清单

1. `git branch --show-current` – 验证在正确分支
2. `git fetch --all --prune` – 确保远程是最新的
3. `git status --short` – 确认无未暂存或未跟踪文件
4. `git log origin/develop..HEAD --oneline` – 审查将发布的提交
5. `gh pr status` – 确保分支没有已打开的 PR

## 准备元数据

- **PR 标题格式**:
  - **计划 PR**: `<type>: add [specification|plan] for <feature name> (#<issue_number>)`
  - **实施 PR**: `<type>: <imperative verb> <feature name> (#<issue_number>)`
- 组成 PR body 包括:
  - 更改摘要
  - 验证证据部分
  - 计划链接
  - `Closes #<issue_number>`

## PR Body 模板

```markdown
## 验证证据

### 验证级别: [1/2/3]
**理由**: [为什么选择此级别]

**运行的命令**:
- ✅/❌ `lint` - [状态]
- ✅/❌ `typecheck` - [状态]
- ✅/❌ `test --filter integration` - [X 测试通过]
- ✅/❌ `test` - [X 测试通过]
- ✅/❌ `build` - [构建输出]
```

## 命令

1. `git status --short`
2. `git diff origin/develop...HEAD --stat`
3. `git log origin/develop..HEAD --oneline`
4. `git push -u origin HEAD`
5. `gh pr create --base develop --title "<title>" --body "<body>"`

## 创建后

- `gh pr view --web` 验证渲染的描述和元数据
- 与审查者分享 PR 链接
- 确保应用标签/审查者
