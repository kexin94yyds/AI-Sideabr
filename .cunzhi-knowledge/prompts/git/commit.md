# /commit

**模板分类**: Message-Only

为暂存的工作生成 git 提交消息。

## 指令

- 提交消息格式: `<type>: <issue_number> - <short description>`
- 描述必须 ≤ 60 字符，现在时态，无尾随句号
- 审查 `git diff HEAD` 理解暂存的更改后再生成消息
- **不要执行 git 命令**（暂存/提交由编排层处理）

## 提交消息验证规则

### 格式要求

- **Conventional Commits 格式**: `<type>(<scope>): <subject>`
- **有效类型**: feat, fix, chore, docs, test, refactor, perf, ci, build, style
- **主题长度**: 1-72 字符（最佳实践保持在 60 以下）
- **可选 scope**: 可以在类型后添加括号中的 scope（例如 `feat(api):`）

### 元评论模式（第一行禁止）

**不要在提交消息主题行中包含这些短语:**

- ❌ `based on`
- ❌ `the commit should`
- ❌ `here is`
- ❌ `this commit`
- ❌ `i can see`
- ❌ `looking at`
- ❌ `the changes`
- ❌ `let me`

这些模式表示 AI 推理泄漏。提交消息应该是直接陈述。

## 示例

**✅ 正确（会通过验证）:**
```
chore: 98 - document test path resolution strategy
feat: 123 - add rate limiting middleware
fix: 456 - resolve API key validation bug
docs: 789 - update authentication guide
```

**❌ 错误（会失败验证）:**
```
Based on the changes, I can see this is a documentation update
The commit should be: chore - update docs
Here is the commit message for the changes
This commit documents the test path resolution strategy
```

## 输出格式（关键）

你的响应将**直接**用作提交消息，无需任何解析或提取。你**必须**输出**正好一行**，**仅**包含格式为以下的提交消息：

```
<type>: <issue_number> - <description>
```

**绝对要求:**

1. 响应的**第一个字符**必须是有效类型
2. **无前言** - 不要在提交消息前写任何内容
3. **无后记** - 不要在提交消息后写任何内容
4. **无解释** - 你的**整个**响应就是提交消息本身
5. **仅单行** - 无换行，无额外句子
