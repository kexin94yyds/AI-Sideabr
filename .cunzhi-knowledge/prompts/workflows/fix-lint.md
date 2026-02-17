# /fix-lint

自动修复代码 lint 和格式错误的内部循环命令。

## 使用场景

- 提交前修复格式问题
- CI 失败后快速修复
- 批量格式化代码

## 执行步骤

1. **检测项目类型**：识别 package.json / pyproject.toml 等
2. **运行 lint 检查**：
   - JS/TS: `eslint . --fix` 或 `biome check --fix`
   - Python: `ruff check --fix`
   - Go: `gofmt -w .`
3. **运行格式化**：
   - JS/TS: `prettier --write .`
   - Python: `ruff format`
4. **显示修复结果**
5. **调用 zhi** 确认是否提交

## 支持的工具

| 语言 | Lint | Format |
|------|------|--------|
| TypeScript/JavaScript | ESLint, Biome | Prettier, Biome |
| Python | Ruff, Flake8 | Ruff, Black |
| Go | golangci-lint | gofmt |
| Rust | clippy | rustfmt |

## 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--check` | 只检查不修复 | false |
| `--staged` | 只处理暂存文件 | false |

## 示例输出

```
✓ Detected: TypeScript project (biome)
✓ Fixed 5 lint errors
✓ Formatted 12 files
? Commit these fixes? [y/n]
```
