# /batch-task

**模板分类**: Action
**成熟度**: L5 (Higher Order)

将大任务拆分成 N 个批次，分配给 N 个子代理并行执行，主代理通过 git diff 验收结果。

## 输入

- `$1` (task_type): 任务类型（如：补录回归检查、批量重命名、代码审查）
- `$2` (source_file): 源文件路径
- `$3` (target_file): 目标文件路径
- `$4` (batch_count): 分配批次数（默认 10）

## 协作流程

```
人类（最终决策）
    ↓ 分配任务
主代理（我）
    ↓ 生成 N 个子代理提示词
    ↓ 通过 git diff 验收
子代理 1~N（其他聊天窗口）
    ↓ 执行任务
    ↓ 报告完成情况
```

## 子代理提示词模板

```markdown
## 子代理 {batch_number}/{batch_count} 任务

**任务类型**: {task_type}
**范围**:
1. {item_1}
2. {item_2}
...
{count}. {item_n}
**源文件**: {source_file}
**目标文件**: {target_file}

### 步骤
1. 读取源文件中以上列表对应的条目
2. 按格式要求生成目标内容，格式：

{output_format_template}

3. 追加到目标文件末尾
4. 完成后报告：已处理 X 条

### 验收标准
- 条目数量正确
- 格式符合规范
- 无重复条目
```

### 模板要点

1. **范围用显式列表**，不用 `A 到 B` 这种模糊表述
2. **步骤包含具体格式模板**，子代理可直接复制修改

### 示例：补录回归检查

```markdown
## 子代理 {task_name}/{batch_number} 任务

**任务类型**: 补录回归检查
**范围**（共 24 个）：
1. P-2024-007
2. P-2024-008
3. P-2024-009
...
24. P-2024-030

### 步骤
1. 读取 .cunzhi-knowledge/problems.md 中以上 ID 对应的问题
2. 为每个 P-ID 生成对应的 R-ID 条目，格式：

**R-ID 格式**：
## R-YYYY-NNN [问题标题]
- 关联问题：P-YYYY-NNN
- 类型：手工检查
- 关键断言：[根据问题描述提取]
- 运行方式：手工验证

3. 追加到 regressions.md 末尾
4. 完成后报告：已处理 X 条

*你是子代理现在帮我做*：
```

### 示例：检索 GitHub 仓库 fix commit

```markdown
## 子代理 {task_name}/{batch_number} 任务

**任务类型**: 检索 GitHub 仓库 fix commit
**账号**: kexin94yyds
**范围**（共 N 个仓库）：
1. picgo-images
2. Dark-K
3. Climbing-Notes

### 步骤
1. 使用 `gh api repos/kexin94yyds/{repo}/commits` 获取 commit 历史
2. 筛选 message 包含 fix/bug/修复/问题 的 commit
3. 为每个 fix commit 生成 P-ID 和 R-ID 条目，格式：

**P-ID 格式**：
## P-2024-NNN {仓库名} {问题简述}
- 项目：{仓库名}
- 仓库：https://github.com/kexin94yyds/{repo}
- 发生版本：{commit_sha}
- 现象：{从 commit message 提取}
- 根因：{从 commit message 提取}
- 修复：{从 commit message 提取}
- 回归检查：R-2024-NNN
- 状态：已验证
- 日期：2024-12-16

**R-ID 格式**：
## R-2024-NNN {仓库名} {问题简述}
- 关联问题：P-2024-NNN
- 类型：手工检查
- 位置：
- 关键断言：{根据问题描述}
- 运行方式：手工验证

4. 追加到 problems.md 和 regressions.md 末尾
5. **P-ID 从 {start_id} 开始编号**
6. 完成后报告：已检索 X 个仓库，找到 Y 个 fix commit

*你是子代理现在帮我做*：
```

## 主代理验收流程

```bash
# 1. 检查新增条目数量
git diff --stat {target_file}   

# 2. 验证格式正确性
grep -c "^## R-" {target_file}

# 3. 检查与源文件匹配
diff <(grep "^## P-" problems.md | wc -l) <(grep "^## R-" regressions.md | wc -l)
```

## 输出格式

主代理分配任务后，**必须通过 `寸止` 工具**展示**一次性完整可复制**的提示词，用户可直接复制到子代理窗口使用。

**格式规范**：
1. 调用 `寸止` 展示完整提示词（一次性，不分割）
2. 提示词包含完整上下文：任务类型、账号、范围、步骤、格式模板
3. **末尾必须加上**: `*你是子代理现在帮我做*：`
4. 用户复制后在末尾加上批次号（1、2、3...）即可
5. **等待用户确认后**才结束本轮对话

**不要包含:**
- 解释性前言
- 元评论前缀（如 "Based on...", "Let me..."）
- 多段描述
- 分割成 N 个独立提示词

**正确输出**:
```
## 子代理 {task_name}/{batch_number} 任务

**任务类型**: 检索 GitHub 仓库 fix commit
**账号**: kexin94yyds
**范围**（共 N 个仓库）：
1. picgo-images
2. Dark-K
3. Climbing-Notes

### 步骤
1. 使用 `gh api repos/kexin94yyds/{repo}/commits` 获取 commit 历史
2. 筛选 message 包含 fix/bug/修复/问题 的 commit
3. 为每个 fix commit 生成 P-ID 和 R-ID 条目，格式：

**P-ID 格式**：
## P-2024-NNN {仓库名} {问题简述}
- 项目：{仓库名}
- 仓库：https://github.com/kexin94yyds/{repo}
- 发生版本：{commit_sha}
- 现象：{从 commit message 提取}
- 根因：{从 commit message 提取}
- 修复：{从 commit message 提取}
- 回归检查：R-2024-NNN
- 状态：已验证
- 日期：{today}

**R-ID 格式**：
## R-2024-NNN {仓库名} {问题简述}
- 关联问题：P-2024-NNN
- 类型：手工检查
- 位置：
- 关键断言：{根据问题描述}
- 运行方式：手工验证

4. 追加到 problems.md 和 regressions.md 末尾
5. **P-ID 从 {start_id} 开始编号**
6. 完成后报告：已检索 X 个仓库，找到 Y 个 fix commit

*你是子代理现在帮我做*：
```

**验收完成输出**:
```
## 验收结果

| 子代理 | 范围 | 状态 | 完成条数 |
|--------|------|------|----------|
| 1 | P-2024-007 ~ P-2024-030 | ✅ | 24 条 |
| 2 | P-2024-031 ~ P-2024-050 | ✅ | 20 条 |
| 3 | P-2024-051 ~ P-2024-070 | ✅ | 20 条 |
| ... | ... | ... | ... |

**汇总**：
- 总完成：10/10 子代理
- 新增条目：212 条 R-ID
- git diff --stat: 1 file changed, 1800 insertions(+)
```

> **注意**：验收表中的 `~` 仅用于汇总展示，子代理提示词中必须使用显式列表。
