# 数据库

**模板分类**: Message-Only
**提示级别**: 4 (Contextual)

数据库 schema、配置和策略。

## 数据库客户端初始化

数据库客户端在 `src/db/client.ts` 中初始化：

- **服务角色客户端**: 绕过 RLS 用于管理操作
- **匿名客户端**: 强制 RLS 用于用户范围查询

配置通过环境变量：
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## 行级安全（RLS）

RLS 用于多租户数据隔离，有两种策略类型：

- **用户范围策略**: 基于认证用户限制访问
- **组织范围策略**: 基于组织成员身份限制访问

所有通过匿名客户端的查询自动强制 RLS。服务角色客户端绕过 RLS 用于管理操作。

## 迁移

数据库迁移存在于**两个位置**：

1. `src/db/migrations/` - 应用的真实来源
2. `supabase/migrations/` - Supabase CLI 兼容的副本

**重要**: 两个目录必须保持同步。

### 迁移同步要求

- 在 `src/db/migrations/` 添加或修改迁移时，**必须**也更新 `supabase/migrations/`
- 运行 `bun run test:validate-migrations` 检查偏移
- CI 在设置作业中验证同步

### 迁移命名约定

所有迁移文件必须使用时间戳格式：`YYYYMMDDHHMMSS_description.sql`

示例：`20241024143000_add_rate_limiting.sql`

生成时间戳：`date -u +%Y%m%d%H%M%S`

## 使用真实数据库测试

所有测试使用真实数据库连接（反 mock 哲学）。

### 测试环境设置

1. 通过 Docker Compose 启动本地数据库
2. 直接应用迁移到 PostgreSQL
3. 生成包含正确端口的 `.env.test`
4. 测试自动通过预加载脚本加载环境

### 测试数据库命令

```bash
./scripts/setup-test-db.sh       # 启动测试数据库
./scripts/reset-test-db.sh       # 重置到干净状态
```
