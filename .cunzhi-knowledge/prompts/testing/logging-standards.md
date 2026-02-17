# 日志标准

**模板分类**: Message-Only
**提示级别**: 1 (Static)

标准化输出机制，启用结构化日志、程序化解析和统一可观察性。

## 概述

强制执行跨所有层的一致日志模式：

- **TypeScript/应用层**: 使用 `process.stdout.write()` 和 `process.stderr.write()`
- **Python/自动化层**: 使用 `sys.stdout.write()` 和 `sys.stderr.write()`

**永远不要在 TypeScript 中使用 `console.log()` 或在 Python 中使用 `print()`**（独立脚本除外）。

## TypeScript 日志标准

### 批准的方法

✅ **使用**: `process.stdout.write()` 用于信息输出
✅ **使用**: `process.stderr.write()` 用于错误和警告

❌ **永远不要使用**: `console.log()`, `console.error()`, `console.warn()`, `console.info()`

### 示例

```typescript
// 正确
process.stdout.write("Indexing completed\n");
process.stderr.write("Error: Failed to connect\n");

// 错误 - 会失败 pre-commit hooks 和 CI
console.log("Indexing completed");
console.error("Error: Failed to connect");
```

### 理由

直接流写入启用：
- 结构化日志框架（Winston、Pino）
- 测试期间日志抑制
- 统一格式化和过滤
- 更好的输出缓冲控制

## Python 日志标准

### 批准的方法

✅ **使用**: `sys.stdout.write()` 用于信息输出
✅ **使用**: `sys.stderr.write()` 用于错误和警告

❌ **永远不要使用**: `print()`（独立脚本除外）

### 示例

```python
# 正确
import sys
sys.stdout.write("Indexing completed\n")
sys.stderr.write("Error: Failed to connect\n")

# 错误 - 会失败 pre-commit hooks 和 CI
print("Indexing completed")
```

## 执行

### Pre-commit Hooks

Pre-commit hooks 在允许提交前验证日志标准：

- **TypeScript**: Linter 阻止 `console.*` 使用
- **Python**: Linter 阻止 `print()` 使用

违规会阻止提交。
