# /deploy

部署应用的内部循环命令。

## 使用场景

- 发布新版本到生产环境
- 部署到预发布环境验证
- 回滚到上一版本

## 执行步骤

1. **检查环境**：确认部署目标（staging/production）
2. **运行测试**：确保所有测试通过
3. **构建应用**：`npm run build` 或对应命令
4. **部署**：执行部署脚本或 CI/CD
5. **验证**：检查部署是否成功
6. **通知**：调用 zhi 报告部署结果

## 部署目标

| 环境 | 说明 | 触发条件 |
|------|------|----------|
| development | 开发环境 | 自动 |
| staging | 预发布环境 | PR 合并 |
| production | 生产环境 | 手动确认 |

## 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `<env>` | 部署环境 | staging |
| `--skip-tests` | 跳过测试（危险） | false |
| `--rollback` | 回滚到上一版本 | false |

## 示例输出

```
✓ Environment: staging
✓ Tests passed (42/42)
✓ Build successful
✓ Deploying to staging...
✓ Deployed: https://staging.example.com
✓ Health check passed
```
