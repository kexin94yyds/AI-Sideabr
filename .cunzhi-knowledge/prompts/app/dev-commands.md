# 开发命令

**模板分类**: Message-Only
**提示级别**: 1 (Static)

常用开发命令快速参考。

## 快速启动（推荐）

```bash
./scripts/dev-start.sh            # 启动数据库 + API 服务器
./scripts/dev-start.sh --web      # 启动数据库 + API + Web 应用
```

`dev-start.sh` 脚本自动化：
- 数据库容器生命周期（停止现有，启动新的）
- `.env` 文件生成，包含正确凭据
- 依赖安装（如果 `node_modules/` 缺失）
- API 服务器启动，带健康检查验证
- 可选 Web 应用启动（`--web` 标志）
- Ctrl+C 时优雅清理

## 手动服务器启动

```bash
bun run src/index.ts              # 启动服务器（默认端口 3000）
PORT=4000 bun run src/index.ts    # 使用自定义端口
bun --watch src/index.ts          # 开发监视模式
```

## 测试命令

```bash
bun test                          # 运行测试套件
DEBUG=1 bun test                  # 详细测试输出
bunx tsc --noEmit                 # 不生成文件的类型检查
bun run test:validate-migrations  # 验证迁移同步
bun run test:validate-env         # 检测硬编码环境 URL
```

## 测试数据库管理

```bash
./scripts/setup-test-db.sh       # 启动测试数据库
./scripts/reset-test-db.sh       # 重置测试数据库到干净状态
```

## Docker

```bash
docker compose up dev   # 在开发容器中运行
```

## 相关文档

- 环境变量
- Pre-commit Hooks
- 测试指南
