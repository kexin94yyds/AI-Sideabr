# Issue 关系文档标准

**模板分类**: Message-Only
**提示级别**: 1 (Static)

定义关系类型和文档标准，用于跟踪 issue 依赖、上下文和演变。

## 何时使用

在以下情况下查阅此指南：
- 创建新 GitHub issues 或规范文件
- 计划实施工作并识别依赖
- 构建 issue 优先级的依赖图
- 编写带关系元数据的提交消息
- 审查 PR 的关系文档完整性

## 关系类型

### Depends On（依赖）
**目的**: 必须在当前 issue 工作开始前完成的 issues。

**何时使用**:
- 需要技术前置工作
- 共享基础设施或工具必须先就位
- 需要数据库 schema 更改后才能实施功能
- 阻止开始实施的阻塞依赖

### Related To（相关）
**目的**: 提供上下文或共享技术关注点的 issues（非严格阻塞）。

**何时使用**:
- Issues 触及相同子系统或组件
- 类似的架构模式或设计决策
- 共享技术关注点但无直接依赖

### Blocks（阻塞）
**目的**: 等待当前工作完成的 issues。

**何时使用**:
- 下游工作必须等当前 issue 合并后才能开始
- 解锁多个功能的高杠杆工作
- 启用未来能力的基础设施更改

### Supersedes（取代）
**目的**: 当前 issue 替换或废弃之前的工作。

**何时使用**:
- 替换旧实现的架构迁移
- 移除废弃代码的清理工作
- 使之前方法过时的重构

### Child Of（子项）
**目的**: 当前 issue 是更大 epic 或跟踪 issue 的一部分。

**何时使用**:
- Issue 是多阶段 epic 中的一个任务
- 更大功能的细粒度实施
- 复杂计划的子任务跟踪

### Follow-Up（后续）
**目的**: 当前工作完成后的计划下一步（非阻塞）。

**何时使用**:
- 实施期间识别的未来增强
- 延后的技术债务或优化
- 当前范围外的可选改进

## 文档标准

### 规范文件
`docs/specs/` 中的所有规范文件，如有任何关系，**必须**包含 `## Issue Relationships` 部分：

```markdown
## Issue Relationships

- **Depends On**: #25 (API key generation) - Required for authentication
- **Related To**: #26 (rate limiting) - Both touch authentication layer
- **Blocks**: #74 (symbol extraction) - Provides AST parsing foundation
- **Child Of**: #70 (AST parsing epic) - Phase 1: Parser infrastructure
- **Follow-Up**: #148 (hybrid resilience) - Enhanced error handling
```

**格式要求**:
- 使用 H2 标题
- 每种关系类型独立一行
- 格式: `- **{Type}**: #{issue_number} ({short_title}) - {brief_rationale}`
- 顺序: Depends On → Related To → Blocks → Supersedes → Child Of → Follow-Up
- 如无关系，完全省略此部分

### GitHub Issues
Issue 描述**应该**包含关系元数据：

```markdown
## Relationships

**Depends On**: #25
**Related To**: #26, #45
**Blocks**: #74, #116
```

### Pull Requests
PR 描述**必须**在描述中引用相关 issues：

```markdown
## Related Issues

Closes #123
Depends-On: #25
Related-To: #26
```

### 提交消息
提交消息**可以**在页脚中为重要依赖包含关系元数据：

```
feat: add rate limiting middleware

Implement tier-based rate limiting with hourly quotas.

Depends-On: #25
Related-To: #26
```

## 优先级策略

选择要处理的 issues 时，遵循此依赖感知优先级：

1. 获取开放 issues
2. 从 issue body 和链接的规范文件解析关系元数据
3. 构建依赖图识别：
   - 未阻塞 issues
   - 高杠杆 issues
   - 隔离 issues
4. 选择最高优先级的未阻塞 issue
5. 开始前验证依赖解决

## 常见反模式

**避免**:
- 过度文档化琐碎关系
- 对软依赖使用 "Depends On"
- 范围变更时忘记更新关系
- 破坏解析的不一致格式

**改为**:
- 仅文档化有意义的连接
- 使用精确的关系类型
- 实施期间上下文变更时更新关系
- 严格遵循格式标准
