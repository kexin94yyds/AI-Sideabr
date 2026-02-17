# 寸止提示词库

**AI 协作技能库：开发全流程的模板、工作流和最佳实践参考。**

## 定位说明

**这是技能库，按需调用，不是强制规则。**

- 与 cunzhi 全局 rules（`.cursorrules`、`global_rules.md`）**互补**，不冲突
- 具体命令（如 `bun test`）是示例，按项目实际替换
- 方法论（计划→实施→验证）是通用的

### 与 cunzhi 核心规则的关系

| 提示词库 | cunzhi 核心规则 | 关系 |
|---------|----------------|------|
| `issues/bug.md` - 如何写 bug 修复计划 | `bug_workflow` - 状态流转 open→fixed→verified | **互补** |
| `禁止元评论` | `output_discipline` PAT-2024-018 | **一致** |
| `workflows/*` - SDLC 方法论 | - | **补充** |

## 目录结构

```
prompts/
├── workflows/     # SDLC 工作流命令
├── git/           # Git 操作命令
├── issues/        # Issue 模板命令
├── testing/       # 测试指南
├── docs/          # 文档查询命令
├── ci/            # CI/CD 命令
├── tools/         # 工具命令
├── experts/       # 专家角色系统
├── release/       # 发布流程
├── app/           # 开发环境
└── modes/         # 场景模式提示词（原始导出 .txt）
```

## 模板分类

| 分类 | 说明 | 输出格式 |
|------|------|----------|
| **Message-Only** | 返回单一文本 | 单行或短段落 |
| **Path Resolution** | 返回文件路径或 URL | 绝对路径或 URL |
| **Action** | 执行操作，返回摘要 | 结构化报告 |
| **Structured Data** | 返回机器可解析数据 | JSON |

## 禁止的元评论模式

以下模式禁止在命令输出中使用：

- ❌ "Based on the changes..."
- ❌ "The commit should..."
- ❌ "Here is the..."
- ❌ "I can see that..."
- ❌ "Looking at..."
- ❌ "Let me..."

使用直接陈述代替元评论。

## 调用方式

### Windsurf Workflows
```
.windsurf/workflows/<command>.md
```

### 直接引用
在对话中直接引用 `.cunzhi-knowledge/prompts/<category>/<command>.md`

## 来源

提示词基于 Claude Code 的 slash commands 系统（参考 [KotaDB](https://github.com/jayminwest/kotadb) 实现），经过适配和本地化。
