# 环境变量

**模板分类**: Message-Only
**提示级别**: 1 (Static)

项目使用的环境变量。通常在 `.env` 中配置用于本地开发。

## 必需变量

### 数据库配置

- **`DATABASE_URL`**: 数据库连接字符串
  - 本地: `postgresql://postgres:postgres@localhost:5432/postgres`
  - 生产: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`
  - **必需** 用于所有数据库操作

- **`SUPABASE_URL`**: Supabase 项目 URL
  - 本地: `http://localhost:54326`
  - 生产: `https://[PROJECT_REF].supabase.co`
  - **必需** 用于数据库和认证操作

- **`SUPABASE_SERVICE_KEY`**: Supabase 服务角色密钥
  - **必需** 用于绕过 RLS 的管理操作

- **`SUPABASE_ANON_KEY`**: Supabase 匿名密钥
  - **必需** 用于 RLS 强制执行的用户范围查询

## 可选变量

### 服务器配置

- **`PORT`**: 服务器端口（默认: 3000）
  - 示例: `PORT=4000 bun run src/index.ts`

- **`LOG_LEVEL`**: 日志详细级别（默认: info）
  - 选项: `debug`, `info`, `warn`, `error`

### Git 配置

- **`GIT_BASE_URL`**: Git 克隆基础 URL（默认: https://github.com）
  - 示例: `GIT_BASE_URL=https://gitlab.com`

### 外部服务配置

- **`STRIPE_SECRET_KEY`**: Stripe 密钥
- **`STRIPE_WEBHOOK_SECRET`**: Stripe webhook 签名密钥
- **`GITHUB_APP_ID`**: GitHub App ID
- **`GITHUB_APP_PRIVATE_KEY`**: GitHub App 私钥

## 自动生成文件

### `.env`
由 `dev-start.sh` 生成，包含来自 Docker Compose 容器的正确凭据。

**不要**提交此文件 - 已在 gitignore 中。

### `.env.test`
由 CI 和测试设置脚本生成，用于动态端口配置。

## 端口架构

### 数据库端口（用于测试）
- **Port 5434**: PostgreSQL
- **Port 54322**: PostgREST API
- **Port 54325**: GoTrue 认证服务
- **Port 54326**: Kong 网关（**测试使用此端口**）

### 应用端口
- **Port 3000**: API 服务器（默认）
