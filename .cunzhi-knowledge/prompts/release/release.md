# /release

**模板分类**: Action

通过合并 develop 到 main 创建生产发布，带自动版本管理和验证。

## 发布前验证

1. **干净工作区**: 确保无未提交更改
2. **CI 状态**: 验证 develop 分支所有 CI 通过
3. **迁移同步**: 检查数据库迁移同步
4. **类型检查**: 执行类型安全检查
5. **健康检查**: 验证 API 端点正常响应

## 版本提升

提示用户版本提升类型：
- **major**: 破坏性更改 (1.0.0 到 2.0.0)
- **minor**: 新功能，向后兼容 (1.0.0 到 1.1.0)
- **patch**: Bug 修复，向后兼容 (1.0.0 到 1.0.1)

## 发布流程

### 步骤 1: 准备发布分支
```bash
git checkout develop
git pull --rebase origin develop
git checkout -b release/vX.Y.Z
```

### 步骤 2: 更新版本
```bash
bun run version <major|minor|patch>
git add package.json
git commit -m "chore: bump version to X.Y.Z"
```

### 步骤 3: 生成 Changelog
按类型分组提交：
- **Features**: feat: 开头
- **Bug Fixes**: fix: 开头
- **Chore**: chore: 开头
- **Documentation**: docs: 开头

### 步骤 4: 创建发布 PR
```bash
git push -u origin release/vX.Y.Z
gh pr create --base main --head release/vX.Y.Z --title "Release vX.Y.Z"
```

### 步骤 5: 合并后操作
1. 创建 Git Tag
2. 创建 GitHub Release
3. 同步 develop 与 main

## 紧急热修复流程

```bash
git checkout main
git checkout -b hotfix/vX.Y.Z+1
# 做最小修复
git commit -m "fix: critical issue"
bun run version patch
git push -u origin hotfix/vX.Y.Z+1
```

## 回滚程序

```bash
git checkout main
git revert -m 1 <merge-commit-sha>
git push origin main
```

## 注意事项

- **永不** force-push 到 main 或 develop
- **始终**要求 PR 批准发布
- 发布后 24 小时监控错误
- 在发布说明中突出记录破坏性更改
