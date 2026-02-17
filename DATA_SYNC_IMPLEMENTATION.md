# 数据同步系统实现总结

## 概述

本文档记录了为 AI-Sidebar 浏览器扩展实现的完整数据同步系统，使扩展数据（历史记录和收藏）能够自动同步到本地 JSON 文件，以便其他应用（如 Electron 应用）读取使用。

## 问题背景

用户创建了一个新的应用，需要从以下路径读取扩展数据：
- `/Users/apple/AI-sidebar 更新/AI-Sidebar/sync/favorites.json`
- `/Users/apple/AI-sidebar 更新/AI-Sidebar/sync/history.json`

但浏览器扩展的数据存储在：
- **History**: IndexedDB (`AISidebarDB` 数据库，键名 `history`)
- **Favorites**: `chrome.storage.local` (键名 `aiFavoriteLinks`)

需要建立从扩展到 JSON 文件的同步机制。

## 解决方案架构

### 三层架构

```
┌─────────────────────────────────────┐
│   浏览器扩展 (Chrome Extension)     │
│                                     │
│  ┌──────────────┐  ┌──────────────┐│
│  │  IndexedDB   │  │ chrome.     ││
│  │  (History)   │  │ storage     ││
│  │              │  │ (Favorites) ││
│  └──────┬───────┘  └──────┬───────┘│
│         │                 │        │
│         └────────┬────────┘        │
│                  │                 │
│         ┌────────▼────────┐        │
│         │  auto-sync.js   │        │
│         └────────┬────────┘        │
│                  │                 │
└──────────────────┼─────────────────┘
                   │ HTTP POST
                   │
┌──────────────────▼─────────────────┐
│     同步服务器 (sync-server.js)     │
│     http://localhost:3456          │
│                                     │
│     POST /sync/history             │
│     POST /sync/favorites           │
└──────────────────┬─────────────────┘
                   │ 写入文件
                   │
┌──────────────────▼─────────────────┐
│    本地文件系统 (sync/*.json)      │
│                                     │
│    sync/history.json               │
│    sync/favorites.json             │
└──────────────────┬─────────────────┘
                   │ 读取
                   │
┌──────────────────▼─────────────────┐
│     其他应用 (Electron/Node.js)    │
│                                     │
│     - 读取 JSON 文件                │
│     - 监听文件变化                  │
│     - 实时同步数据                  │
└─────────────────────────────────────┘
```

## 实现的组件

### 1. 自动同步模块 (`js/auto-sync.js`)

**功能**：
- 从 IndexedDB 和 `chrome.storage.local` 读取数据
- 检查同步服务器是否可用
- 定期同步数据到服务器
- 提供手动同步 API

**关键特性**：
- 自动重连机制（30秒检查一次服务器状态）
- 超时保护（2秒连接超时，5秒请求超时）
- 数据格式化和验证
- 优雅降级（服务器不可用时静默失败）

**公开 API**：
```javascript
AutoSync.syncHistory()      // 同步历史记录
AutoSync.syncFavorites()    // 同步收藏
AutoSync.syncAll()          // 同步所有数据
AutoSync.enableAutoSync()   // 启用自动同步（每分钟）
AutoSync.checkServerAvailability()  // 检查服务器状态
```

### 2. 同步服务器 (`sync-server.js`)

**功能**：
- HTTP 服务器监听本地端口 3456
- 接收扩展发送的数据
- 写入 JSON 文件到 `sync/` 目录
- 提供健康检查端点

**端点**：
- `GET /ping` - 健康检查
- `POST /sync/history` - 接收历史记录
- `POST /sync/favorites` - 接收收藏数据

**特性**：
- CORS 支持（允许扩展访问）
- 自动创建目录
- 格式化 JSON 输出（2 空格缩进）
- 错误处理和日志

### 3. 手动导出脚本 (`js/sync-to-file.js`)

**功能**：
- 在扩展 Console 中运行
- 导出数据为 JSON 文件
- 自动触发浏览器下载
- 供不想运行服务器的用户使用

### 4. 集成到扩展

**修改的文件**：

1. **index.html**
   - 引入 `auto-sync.js`

2. **manifest.json**
   - 添加 `http://localhost:*/*` 权限

3. **popup.js**
   - 在初始化时启用自动同步
   - 添加 `initAutoSync()` 函数

## 数据格式

### 标准 JSON 格式

```json
[
  {
    "url": "https://chatgpt.com/",
    "provider": "chatgpt",
    "title": "ChatGPT",
    "time": 1720000000000
  }
]
```

**字段说明**：
- `url` (string, 必需) - 完整 URL
- `provider` (string, 可选) - AI 提供商标识
- `title` (string, 可选) - 页面标题
- `time` (number, 可选) - Unix 时间戳（毫秒）

## 使用流程

### 自动同步模式（推荐）

```bash
# 1. 启动同步服务器
npm run sync

# 2. 打开/重新加载扩展
# 扩展会自动检测服务器并开始同步

# 3. 验证同步
cat sync/history.json
cat sync/favorites.json
```

### 手动导出模式

1. 打开扩展侧边栏
2. 右键 → 检查（打开开发者工具）
3. 在 Console 中粘贴并运行 `js/sync-to-file.js` 的内容
4. 将下载的文件移动到 `sync/` 目录

## 技术细节

### 同步频率

- **初始同步**: 扩展加载后 2 秒
- **定期同步**: 每 60 秒
- **服务器检查**: 每 30 秒检查一次可用性

### 错误处理

- 服务器不可用时静默失败（不打断用户）
- 超时保护避免长时间等待
- 详细日志记录在 Console

### 性能影响

- 最小化：每分钟一次同步，数据量通常很小（<1MB）
- 异步操作：不阻塞主线程
- 条件同步：只在服务器可用时同步

## 安全考虑

1. **本地服务器**: 只监听 `localhost`，不暴露到外网
2. **CORS 限制**: 只允许本地源访问
3. **无敏感数据**: 只同步 URL、标题等公开信息
4. **权限最小化**: 只请求必要的 `localhost` 权限

## 扩展性

### 添加新的同步目标

可以轻松添加新的同步端点：

```javascript
// 在 sync-server.js 中添加
if (req.method === 'POST' && req.url === '/sync/settings') {
  // 处理设置同步
}
```

### 自定义同步频率

修改 `auto-sync.js` 中的 `setInterval` 参数：

```javascript
setInterval(async () => {
  await syncAll();
}, 30000); // 改为 30 秒
```

### 集成到其他应用

**Node.js / Electron**:
```javascript
const fs = require('fs');
const history = JSON.parse(fs.readFileSync('sync/history.json'));

// 监听文件变化
fs.watch('sync', (event, filename) => {
  console.log(`${filename} 已更新`);
});
```

**Python**:
```python
import json
with open('sync/history.json', 'r') as f:
    history = json.load(f)
```

## 文档

创建的文档：
1. **SYNC_GUIDE.md** - 完整同步指南（架构、API、故障排除）
2. **QUICK_START_SYNC.md** - 3 分钟快速开始
3. **DATA_SYNC_IMPLEMENTATION.md** - 本文档（实现细节）

更新的文档：
- **README.md** - 添加数据同步功能介绍
- **package.json** - 添加 `npm run sync` 脚本

## 版本控制建议

建议将 `sync/*.json` 添加到 `.gitignore`：

```bash
# 在 .gitignore 中添加
sync/*.json
```

原因：
- 避免提交个人浏览历史和收藏
- 防止冲突（不同机器有不同数据）
- 保护隐私

但保留 `sync/` 目录结构（可以提交空文件或 `.gitkeep`）。

## 测试

### 功能测试

```bash
# 1. 测试服务器启动
node sync-server.js

# 2. 测试健康检查
curl http://localhost:3456/ping

# 3. 测试数据同步
curl -X POST http://localhost:3456/sync/history \
  -H "Content-Type: application/json" \
  -d '[{"url":"https://test.com","provider":"test","title":"Test","time":1720000000000}]'

# 4. 验证文件
cat sync/history.json
```

### 扩展测试

1. 在扩展 Console 运行：
```javascript
AutoSync.checkServerAvailability().then(console.log)
AutoSync.syncAll().then(console.log)
```

2. 查看日志输出
3. 验证 `sync/*.json` 文件

## 已知限制

1. **本地同步**: 只能同步到本机（不支持云同步）
2. **单向同步**: 只从扩展到文件（不支持反向导入）
3. **依赖服务器**: 需要手动启动同步服务器
4. **Chrome Only**: 只支持 Chrome（不支持 Firefox 等）

## 未来改进

可能的增强功能：
1. **双向同步**: 支持从 JSON 文件导入到扩展
2. **云同步**: 集成 Dropbox/Google Drive API
3. **实时同步**: 使用 WebSocket 而不是轮询
4. **加密**: 加密敏感数据
5. **压缩**: 压缩大数据量
6. **增量同步**: 只同步变化的数据

## 总结

成功实现了完整的数据同步系统，使浏览器扩展数据能够：
- ✅ 自动同步到本地 JSON 文件
- ✅ 供其他应用读取使用
- ✅ 实时更新，保持数据一致
- ✅ 简单易用，零配置
- ✅ 安全可靠，本地运行

用户现在可以通过简单的 `npm run sync` 命令启动同步服务器，扩展会自动将数据同步到 `sync/*.json` 文件，其他应用可以直接读取这些文件。

