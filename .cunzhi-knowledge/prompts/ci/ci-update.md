# /ci:update

**模板分类**: Action
**提示级别**: 2 (Parameterized)

根据调查结果或审计建议更新 CI 工作流。

## 前置条件

- 已运行 `/ci:investigate` 或 `/ci:audit` 获取问题诊断
- 理解需要的更改及其影响
- 工作区干净，在正确分支上

## 指令

1. **审查更改需求**
   - 确认要修改的工作流文件
   - 理解更改对其他工作流的影响
   - 识别潜在的向后兼容性问题

2. **实施更改**
   - 编辑 `.github/workflows/*.yml` 文件
   - 遵循 YAML 最佳实践
   - 保持一致的格式

3. **本地验证**
   - 使用 `act` 工具本地测试（如可用）
   - 或通过推送到功能分支触发 CI
   - 验证语法：`yq eval '.jobs' .github/workflows/<file>.yml`

4. **提交和推送**
   - 使用 Conventional Commits 格式
   - 提交消息示例：`ci: fix test timeout in app-ci.yml`

## 更改类型指南

### 修复失败
```yaml
# 增加超时
timeout-minutes: 30

# 添加重试
uses: nick-fields/retry@v2
with:
  max_attempts: 3
  retry_on: error
```

### 优化性能
```yaml
# 添加缓存
- uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

# 并行作业
jobs:
  lint:
    runs-on: ubuntu-latest
  test:
    runs-on: ubuntu-latest
  # 两者并行运行
```

### 安全加固
```yaml
# 固定 Action 版本到 SHA
- uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608

# 最小权限
permissions:
  contents: read
  pull-requests: write
```

## 验证步骤

1. 推送更改到分支
2. 观察工作流运行
3. 确认问题已解决
4. 如需要，迭代修复

## 报告格式

### 更改摘要
- 修改的文件列表
- 每个文件的更改描述

### 验证结果
- 工作流运行 URL
- 运行状态
- 改进指标（如运行时间减少）

### 后续建议
- 需要监控的项目
- 可能的进一步优化
