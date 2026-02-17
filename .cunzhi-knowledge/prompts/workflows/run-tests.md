# /run-tests

运行测试套件的内部循环命令。

## 使用场景

- 修改代码后验证
- 提交前确保测试通过
- CI 失败后本地复现

## 执行步骤

1. **检测测试框架**：识别 jest / vitest / pytest 等
2. **运行测试**：
   - 默认运行全部测试
   - 可指定特定文件或模式
3. **显示结果摘要**
4. **失败时**调用 zhi 询问下一步

## 支持的测试框架

| 语言 | 框架 | 命令 |
|------|------|------|
| TypeScript/JavaScript | Jest | `jest` |
| TypeScript/JavaScript | Vitest | `vitest run` |
| Python | Pytest | `pytest` |
| Go | go test | `go test ./...` |
| Rust | cargo test | `cargo test` |

## 参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `<pattern>` | 文件或测试名模式 | `auth` |
| `--watch` | 监听模式 | - |
| `--coverage` | 生成覆盖率报告 | - |
| `--update` | 更新快照 | - |

## 示例输出

```
✓ Detected: Vitest
✓ Running tests...

 ✓ src/auth.test.ts (5 tests)
 ✓ src/utils.test.ts (12 tests)
 ✗ src/api.test.ts (2 failed)

Tests: 2 failed, 17 passed
? View failed test details? [y/n]
```
