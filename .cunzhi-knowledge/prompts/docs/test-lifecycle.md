# 测试环境生命周期管理

**模板分类**: Message-Only
**提示级别**: 1 (Static)

在 slash 命令中运行测试的标准化模式，确保可靠的数据库集成。

## 概述

遵循**反 mock 哲学**，要求所有测试针对真实数据库运行。这确保测试环境与生产一致，防止脆弱的基于 stub 的测试模式。

**关键要求**: 执行任何测试命令前，数据库必须运行。如果容器不可用，测试将以晦涩的连接错误失败。

## 标准测试执行模式

所有运行测试的 slash 命令**必须**遵循此生命周期：

```bash
# 1. 验证 Docker 可用
if ! command -v docker &> /dev/null; then
  echo "ERROR: Docker not found"
  exit 1
fi

# 2. 设置测试环境（幂等 - 多次运行安全）
bun test:setup

# 3. 运行测试
bun test

# 4. 清理测试环境（开发时可选）
bun test:teardown || true
```

**关键原则:**
- **幂等性**: `bun test:setup` 检查现有容器，如健康则重用
- **错误处理**: 设置前始终检查 Docker 可用性
- **清理安全**: teardown 使用 `|| true` 防止清理错误阻塞

## 可用测试脚本

| 脚本 | 目的 | 何时使用 |
|------|------|---------|
| `bun test:setup` | 启动数据库 | 运行任何测试前 |
| `bun test` | 运行完整测试套件 | 设置完成后 |
| `bun test --filter integration` | 仅运行集成测试 | 开发时快速验证 |
| `bun test:teardown` | 停止并移除容器 | 测试完成后或清理时 |
| `bun test:reset` | 重置数据库到干净状态 | 测试数据损坏时 |

## 要避免的反模式

### 不要对 Bun 测试使用管道操作符

**问题**: `bun test | grep` 等命令会无限挂起。

```bash
# 会无限挂起
bun test | grep "passing"

# 改用内置过滤
bun test --filter integration
```

### 不要不设置就运行测试

```bash
# 容器未运行时会失败
bun test

# 先确保容器运行
bun test:setup
bun test
```

### 不要在 CI 或自动化工作流中跳过 Teardown

```bash
# CI 中始终清理
bun test:setup
bun test
bun test:teardown || true
```

## 故障排除

| 症状 | 解决方案 |
|------|---------|
| 连接错误 | 运行 `bun test:setup` |
| 端口冲突 | 运行 `bun test:teardown` |
| 过期容器状态 | 运行 `bun test:reset` |
| Docker 不可用 | 安装 Docker Desktop |
| Docker 守护进程未运行 | 启动 Docker Desktop |
