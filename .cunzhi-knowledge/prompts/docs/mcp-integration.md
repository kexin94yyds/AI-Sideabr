# MCP 集成

**模板分类**: Message-Only
**提示级别**: 4 (Contextual)

Model Context Protocol (MCP) 集成架构、工具、SDK 行为和测试指南。

## MCP 服务器架构

### 服务器工厂

使用官方 `@modelcontextprotocol/sdk` 的 MCP 服务器工厂：

- 为用户隔离创建每请求 Server 实例（无状态模式）
- 注册工具：`search_code`, `index_repository`, `list_recent_files`, `search_dependencies` 等
- 使用 `StreamableHTTPServerTransport` 和 `enableJsonResponse: true` 进行简单 JSON-RPC over HTTP
- 无 SSE 流或会话管理（无状态设计）

### 工具执行

工具执行逻辑和参数验证：

- 被 SDK 服务器处理器重用
- 参数验证的类型守卫
- 返回包装在 SDK 内容块中的 JSON 结果

## 可用 MCP 工具

### search_code
搜索已索引代码文件中的特定术语。

**参数:**
- `term` (必需): 在代码文件中查找的搜索术语
- `limit` (可选): 最大结果数（默认: 20，最大: 100）
- `repository` (可选): 过滤到特定仓库 ID

### index_repository
通过克隆/更新并提取代码文件索引 git 仓库。

**参数:**
- `repository` (必需): 仓库标识符
- `ref` (可选): Git ref/branch
- `localPath` (可选): 使用本地目录而非克隆

### list_recent_files
列出最近索引的文件。

**参数:**
- `limit` (可选): 返回的最大文件数

### search_dependencies
搜索依赖图查找依赖或被依赖的文件。

**参数:**
- `file_path` (必需): 仓库内的相对文件路径
- `direction` (可选): 搜索方向
- `depth` (可选): 递归深度

## MCP SDK 行为说明

### 内容块响应格式

工具结果被 SDK 包装在内容块中：

- 服务器返回: `{ content: [{ type: "text", text: JSON.stringify(result) }] }`
- 测试必须从 `response.result.content[0].text` 提取结果并解析 JSON

### 错误代码映射

- **`-32700` (解析错误)**: 无效 JSON（返回 HTTP 400）
- **`-32601` (方法未找到)**: 未知 JSON-RPC 方法（返回 HTTP 200）
- **`-32603` (内部错误)**: 工具执行错误、验证失败（返回 HTTP 200）

### HTTP 状态码

- **HTTP 400**: 解析错误和无效 JSON-RPC 结构
- **HTTP 200**: 方法级错误

## 测试编写指南

编写 MCP 测试时：

- 始终使用 `extractToolResult(data)` 帮助函数解析工具响应
- 对工具级验证错误期望 `-32603`（而非 `-32602`）
- 对解析错误期望 HTTP 400（而非 HTTP 200）
