# Pre-commit Hooks

**模板分类**: Message-Only
**提示级别**: 1 (Static)

Pre-commit hooks 自动在暂存文件上运行类型检查和 lint，防止 TypeScript 错误和 lint 问题到达 CI。

## 安装

```bash
bun install    # 通过 prepare 脚本自动安装 hooks
```

Hooks 在 `bun install` 时自动安装。

## 执行

Hooks 在 `git commit` 时自动运行：

- **类型检查**: 在更改的目录运行 `bunx tsc --noEmit`
- **Lint**: 在目录运行 `bun run lint`
- **跳过检查**: 当无相关文件更改时快速提交

## 绕过（仅紧急情况）

```bash
git commit --no-verify -m "emergency: bypass hooks"
```

**警告**: 仅在紧急情况下绕过 hooks。CI 仍会捕获问题。

## 故障排除

### Hook 失败 "command not found"
- **原因**: Bun 未全局安装或不在 PATH 中
- **修复**: 全局安装 Bun

### Hook 耗时太长
- **原因**: 每次提交完整项目类型检查
- **修复**: 确保使用增量检查配置

### Hook 在有效代码上失败
- **原因**: TypeScript 配置问题或瞬态错误
- **调试**: 手动运行 `bunx tsc --noEmit` 查看完整输出
- **修复**: 解决 TypeScript 错误或调查配置

### 临时禁用 hooks
- **禁用**: `git config core.hooksPath /dev/null`
- **恢复**: `git config core.hooksPath .husky`

## Hooks 验证内容

### 日志标准
- **TypeScript**: 阻止 `console.log()` 等
- **Python**: 阻止 `print()`

### TypeScript 类型安全
- 通过 `bunx tsc --noEmit` 运行完整类型检查
- 在 CI 前捕获类型错误

### Lint 规则
- 通过 linter 运行
- 验证代码风格并捕获常见错误
