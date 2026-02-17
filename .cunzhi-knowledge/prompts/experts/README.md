# 专家系统

`experts/` 目录包含领域专家，为计划和代码审查提供多视角分析。每个专家遵循三命令模式。

## 专家类型

| 专家 | 领域 | 命令 |
|------|------|------|
| 架构 | 路径别名、组件边界、数据流 | `architecture_plan`, `architecture_review`, `architecture_improve` |
| 测试 | 测试模式、覆盖率 | `testing_plan`, `testing_review`, `testing_improve` |
| 安全 | RLS、认证、输入验证 | `security_plan`, `security_review`, `security_improve` |
| 集成 | MCP、数据库、外部 API | `integration_plan`, `integration_review`, `integration_improve` |

## 命令模式

每个专家有三个不同提示成熟度级别的命令：

### `_plan` (Level 5)
从领域视角分析需求
- 调用: `/experts:architecture:architecture_plan <context>`
- 输出: 分析、建议、风险

### `_review` (Level 5)
从领域视角审查代码更改
- 调用: `/experts:testing:testing_review <pr-context>`
- 输出: APPROVE/CHANGES_REQUESTED/COMMENT 及发现

### `_improve` (Level 6-7)
通过分析 git 历史自我改进
- 调用: `/experts:security:security_improve`
- 效果: 更新 `_plan` 和 `_review` 命令中的专业知识部分

## 编排器

多专家协调进行全面分析：

### 计划委员会
- 并行调用所有 4 个专家
- 将发现综合为单一统一计划贡献
- 识别跨切关注点和优先建议

### 审查小组
- 并行调用所有 4 个专家
- 聚合审查状态
- 产出单一整合审查决定

## 调用示例

```bash
# 单专家计划
/experts:architecture:architecture_plan "Add rate limiting to /search endpoint"

# 单专家审查
/experts:testing:testing_review "#123"

# 多专家计划
/experts:orchestrators:planning_council "Implement user authentication flow"

# 多专家审查
/experts:orchestrators:review_panel "PR #456"

# 自我改进（定期运行）
/experts:architecture:architecture_improve
```

## 提示成熟度级别

| 级别 | 名称 | 特征 |
|------|------|------|
| 1 | Static | 硬编码指令，无变量 |
| 2 | Parameterized | 使用 `$ARGUMENTS` 输入 |
| 3 | Conditional | 基于输入或状态分支 |
| 4 | Contextual | 引用外部文件或上下文 |
| 5 | Higher Order | 调用其他命令，接受复杂上下文 |
| 6 | Self-Modifying | 基于执行更新自身内容 |
| 7 | Meta-Cognitive | 反思并改进其他命令 |

专家是 Level 5-7，`_improve` 命令启用知识积累。
