# /validate

**模板分类**: Action

实施后运行仓库验证关卡。根据范围选择正确级别。

## 快速参考

```bash
# Level 1 – 快速关卡 (≤ 1 分钟)
bun run lint        # 或 npm run lint
bun run typecheck   # 或 npx tsc --noEmit

# Level 2 – 集成关卡 (3-5 分钟)
bun run lint
bun run typecheck
bun test --filter integration

# Level 3 – 发布关卡 (6-8 分钟)
bun run lint
bun run typecheck
bun test --filter integration
bun test
bun run build
```

## 级别选择指南

| 更改类型 | 级别 | 要运行的命令 |
|----------|------|-------------|
| 仅文档、配置注释 | 1 | `lint + typecheck` |
| 核心逻辑、新端点、bug 修复 | 2 | `lint + typecheck + 集成测试` |
| 发布准备、迁移、认证流程 | 3 | `lint + typecheck + 所有测试 + build` |

## 级别详情

### Level 1 – 快速关卡
- 仅触及文档或配置注释时使用
- 确认 lint + 类型保持干净
- 预期时间：一分钟以内

### Level 2 – 集成关卡
- 功能和 bug 工作的默认选择
- 运行集成专注的测试
- 捕获证明真实服务被调用的日志

### Level 3 – 发布关卡
- schema、认证、计费或其他高风险路径需要
- 执行 Level 2 测试 + 完整测试套件和构建
- 确保后台 worker 和 webhook 活跃

## 如何使用

1. 解决计划任务，添加/更新测试
2. 从表中选择适当级别
3. 按顺序运行命令。失败时立即停止修复
4. 捕获命令摘要用于交接
5. 在报告或 PR 正文中记录执行的级别和结果

## 故障排除

- **Lint 错误**: `bun run lint --apply` 用于可自动修复的问题
- **类型错误**: 检查报告的文件，修复后重新运行 typecheck
- **测试错误**: 使用 `bun test <pattern>` 调试时缩小范围，然后重新运行完整套件
- **构建错误**: 修复 `bun run build` 期间出现的类型或运行时导入错误
