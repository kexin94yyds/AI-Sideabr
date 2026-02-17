# /build

**模板分类**: Action

无计划阶段的简单任务直接实施工作流。

## 输入

- `$1` (task_id): 任务追踪 ID
- `$2` (task_description): 任务详细描述

## 指令

1. **理解任务**: 分析任务描述，识别所需更改
2. **查找相关文件**: 使用搜索工具定位需要修改的文件
3. **实施更改**: 使用 Edit 工具修改现有文件，仅对新文件使用 Write 工具
4. **遵循约定**:
   - 使用现有代码模式和风格
   - 如果修改功能则更新测试
   - 使用路径别名
   - 遵循 TypeScript 严格模式
5. **验证更改**:
   - 运行 `bunx tsc --noEmit` 检查类型错误
   - 如果影响测试，遵循测试生命周期模式
6. **提交更改**: 使用 Conventional Commits 格式创建提交

## 提交消息格式

使用 Conventional Commits 格式：
```
<type>(<scope>): <description>

<optional body>
```

**有效类型**: feat, fix, chore, docs, refactor, test, style, perf, ci, build

**关键: 避免元评论模式**

不要在提交消息第一行包含这些短语：
- ❌ `based on`, `the commit should`, `here is`, `this commit`
- ❌ `i can see`, `looking at`, `the changes`, `let me`

**示例:**
- ✅ `feat(api): add rate limiting middleware`
- ✅ `fix(auth): resolve API key validation bug`
- ❌ `Based on the changes, the commit should add rate limiting`

## 预期输出

返回实施摘要，包括：
- 修改/创建的文件列表
- 更改的简要描述
- 提交哈希
- 验证状态

示例：
```
Implementation complete:
- Modified: src/api/routes.ts (added rate limiting)
- Modified: src/auth/middleware.ts (enforceRateLimit function)
- Created: tests/integration/rate-limit.test.ts
- Commit: a1b2c3d4
- Type-check: ✓ Passed
- Tests: ✓ All tests passed
```

## 用例

此工作流适用于：
- 打字错误和文档更新
- 添加日志或调试语句
- 简单重构（重命名、提取函数）
- 有明确解决方案的小 bug 修复
- 配置更改

对于需要架构决策的复杂功能，请改用 `/plan` + `/implement` 工作流。
