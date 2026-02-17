# API 工作流

**模板分类**: Message-Only
**提示级别**: 4 (Contextual)

认证、速率限制、索引、搜索和验证的 API 工作流。

## 认证 & 速率限制流程

所有认证端点遵循此流程：

1. 请求带 `Authorization: Bearer <api_key>` 头到达
2. `authenticateRequest()` 中间件验证 API 密钥并提取层级
3. `enforceRateLimit()` 通过数据库函数检查每小时请求计数
4. 如果超出限制，返回 429 和 `Retry-After` 头
5. 如果允许，将认证上下文（用户、层级、速率限制状态）附加到请求
6. 处理器执行，速率限制头注入到响应

## POST /index - 仓库索引

触发仓库索引：

1. 确保仓库存在于表中（如新则创建）
2. 在作业表中记录索引作业（状态: pending → completed/failed/skipped）
3. 通过 `queueMicrotask()` 队列异步索引
4. 仓库准备：如需要则克隆，检出 ref
5. 文件发现：遍历项目树，按扩展名过滤
6. 解析：提取内容和依赖
7. 存储：保存到表中

### 支持的文件扩展名

- `.ts`, `.tsx`, `.js`, `.jsx`, `.cjs`, `.mjs`, `.json`

### 忽略的目录

- `.git`, `node_modules`, `dist`, `build`, `out`, `coverage`

## GET /search - 代码搜索

查询已索引文件：

- 内容全文搜索
- 可选过滤器：`project`（项目根）、`limit`
- 返回带上下文片段的结果

## POST /validate-output - Schema 验证

验证命令输出是否符合 schema：

1. 接受 JSON payload：`{schema: object, output: string}`
2. Schema 格式：JSON 兼容的 Zod schema
3. 返回验证结果：`{valid: boolean, errors?: [{path, message}]}`

### 用例

自动化层在解析前验证 slash 命令输出。

## 速率限制响应头

所有认证端点包含：

- **`X-RateLimit-Limit`**: 层级每小时允许的总请求数
- **`X-RateLimit-Remaining`**: 当前窗口剩余请求数
- **`X-RateLimit-Reset`**: 限制重置的 Unix 时间戳
- **`Retry-After`**: 重试前的秒数（仅 429 响应）

## 速率限制层级

### 每小时限制
- **free**: 1,000 请求/小时
- **solo**: 5,000 请求/小时
- **team**: 25,000 请求/小时

### 每日限制
- **free**: 5,000 请求/天
- **solo**: 25,000 请求/天
- **team**: 100,000 请求/天

同时强制每小时和每日限制。先达到的限制将阻止请求。
