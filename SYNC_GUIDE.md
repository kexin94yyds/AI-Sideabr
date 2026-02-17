# 数据同步指南

## 概述

本项目支持将浏览器扩展的数据（历史记录和收藏）同步到本地 `sync/*.json` 文件，以便其他应用（如 Electron 应用）可以读取和使用这些数据。

## 架构说明

### 三个保存位置

1. **本地工作目录** - 你编辑的文件
   - 路径：`/Users/apple/AI-sidebar 更新/AI-Sidebar`

2. **本地 Git 仓库** - Git 版本历史
   - 路径：`.git` 文件夹
   - 提交后数据保存在这里

3. **GitHub 远程仓库** - 远程备份
   - 地址：`https://github.com/kexin94yyds/AI-Sidebar.git`
   - Push 后数据同步到这里

### 数据存储位置

**浏览器扩展数据：**
- **History（历史记录）**
  - 主要存储：IndexedDB (`AISidebarDB` 数据库)
  - 降级存储：`chrome.storage.local` (键名: `aiLinkHistory`)
  
- **Favorites（收藏）**
  - 存储：`chrome.storage.local` (键名: `aiFavoriteLinks`)

**同步文件：**
- `sync/history.json` - 历史记录
- `sync/favorites.json` - 收藏

## 使用方法

### 方式 1：自动同步（推荐）

1. **启动同步服务器**

```bash
cd "/Users/apple/AI-sidebar 更新/AI-Sidebar"
node sync-server.js
```

服务器会在 `http://localhost:3456` 监听。

2. **打开或重新加载扩展**

扩展会自动检测同步服务器，并每分钟同步一次数据。

3. **验证同步**

检查 `sync/` 目录下的文件是否有数据：

```bash
cat sync/history.json
cat sync/favorites.json
```

### 方式 2：手动导出

如果不想运行同步服务器，可以手动导出数据：

1. **打开扩展的侧边栏**
2. **打开开发者工具** (右键 → 检查)
3. **在 Console 中运行导出脚本**

```javascript
// 复制整个 js/sync-to-file.js 的内容并粘贴到 Console
// 或者直接运行以下命令：

(async function() {
  const history = window.HistoryDB ? await window.HistoryDB.getAll() : [];
  const favRes = await chrome.storage.local.get(['aiFavoriteLinks']);
  const favorites = favRes.aiFavoriteLinks || [];
  
  console.log('History:', history.length, '条');
  console.log('Favorites:', favorites.length, '条');
  
  // 下载 history.json
  const downloadJson = (name, data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  downloadJson('history.json', history);
  setTimeout(() => downloadJson('favorites.json', favorites), 500);
})();
```

4. **将下载的文件移动到 `sync/` 目录**

```bash
mv ~/Downloads/history.json "/Users/apple/AI-sidebar 更新/AI-Sidebar/sync/"
mv ~/Downloads/favorites.json "/Users/apple/AI-sidebar 更新/AI-Sidebar/sync/"
```

### 方式 3：使用 AutoSync API

在扩展的 Console 中手动触发同步：

```javascript
// 同步历史记录
AutoSync.syncHistory().then(console.log);

// 同步收藏
AutoSync.syncFavorites().then(console.log);

// 同步所有数据
AutoSync.syncAll().then(console.log);

// 检查同步服务器状态
AutoSync.checkServerAvailability().then(available => {
  console.log('同步服务器', available ? '可用' : '不可用');
});
```

## 数据格式

### 标准格式

`history.json` 和 `favorites.json` 都使用相同的格式：

```json
[
  {
    "url": "https://chatgpt.com/",
    "provider": "chatgpt",
    "title": "ChatGPT",
    "time": 1720000000000
  },
  {
    "url": "https://claude.ai/",
    "provider": "claude",
    "title": "Claude",
    "time": 1720000001000
  }
]
```

**字段说明：**
- `url` (string, 必需) - 完整的 URL
- `provider` (string, 可选) - 提供商标识 (chatgpt, claude, perplexity, etc.)
- `title` (string, 可选) - 页面标题
- `time` (number, 可选) - Unix 时间戳（毫秒）

## 同步服务器 API

### 端点

- `GET /ping` - 健康检查
- `POST /sync/history` - 同步历史记录
- `POST /sync/favorites` - 同步收藏

### 示例请求

```bash
# 健康检查
curl http://localhost:3456/ping

# 同步历史记录
curl -X POST http://localhost:3456/sync/history \
  -H "Content-Type: application/json" \
  -d '[{"url":"https://chatgpt.com/","provider":"chatgpt","title":"ChatGPT","time":1720000000000}]'

# 同步收藏
curl -X POST http://localhost:3456/sync/favorites \
  -H "Content-Type: application/json" \
  -d '[{"url":"https://claude.ai/","provider":"claude","title":"Claude","time":1720000000000}]'
```

## 故障排除

### 问题：同步服务器无法启动

**解决方案：**
1. 检查端口 3456 是否被占用：
   ```bash
   lsof -i :3456
   ```
2. 如果被占用，修改 `sync-server.js` 中的 `PORT` 变量

### 问题：扩展无法连接到同步服务器

**解决方案：**
1. 确认同步服务器正在运行
2. 检查扩展权限：
   - 打开 `chrome://extensions/`
   - 找到 AI-Sidebar 扩展
   - 确保已授予所有权限
3. 查看扩展 Console 日志

### 问题：sync/*.json 文件为空

**解决方案：**
1. 检查扩展是否有数据：
   ```javascript
   // 在扩展 Console 中运行
   window.HistoryDB.getAll().then(console.log);
   chrome.storage.local.get(['aiFavoriteLinks'], console.log);
   ```
2. 手动触发同步：
   ```javascript
   AutoSync.syncAll().then(console.log);
   ```
3. 如果仍然为空，使用手动导出方式

### 问题：数据格式不对

**解决方案：**
确保数据是数组格式，每个元素包含必需的 `url` 字段。可以使用在线 JSON 验证器检查格式。

## 扩展功能

### 添加新的同步目标

如果你想同步到其他应用（如 Electron 应用），可以：

1. **读取 sync/*.json 文件**
   ```javascript
   // Node.js / Electron
   const fs = require('fs');
   const path = require('path');
   
   const syncDir = '/Users/apple/AI-sidebar 更新/AI-Sidebar/sync';
   const history = JSON.parse(fs.readFileSync(path.join(syncDir, 'history.json')));
   const favorites = JSON.parse(fs.readFileSync(path.join(syncDir, 'favorites.json')));
   ```

2. **监听文件变化**
   ```javascript
   const fs = require('fs');
   
   fs.watch(syncDir, (eventType, filename) => {
     if (filename === 'history.json' || filename === 'favorites.json') {
       console.log(`${filename} 已更新`);
       // 重新读取数据
     }
   });
   ```

### 自定义同步频率

修改 `js/auto-sync.js` 中的 `setInterval` 时间：

```javascript
// 当前是 60000 (60秒)
setInterval(async () => {
  const available = await checkServerAvailability();
  if (available) {
    await syncAll();
  }
}, 30000); // 改为 30 秒
```

## 文件清单

- `sync-server.js` - Node.js 同步服务器
- `js/auto-sync.js` - 扩展自动同步模块
- `js/sync-to-file.js` - 手动导出脚本
- `sync/history.json` - 历史记录数据
- `sync/favorites.json` - 收藏数据

## 注意事项

1. **隐私安全**：同步服务器只在本地运行（localhost），不会发送数据到外部
2. **性能影响**：自动同步每分钟运行一次，对性能影响极小
3. **数据去重**：应用端应该自行处理数据去重和合并
4. **版本控制**：建议将 `sync/*.json` 添加到 `.gitignore`，避免提交敏感数据
5. **跨平台**：同步服务器和脚本支持 macOS、Linux、Windows

## 开发模式

如果你正在开发调试，可以：

```bash
# 启动同步服务器（带日志）
node sync-server.js

# 在另一个终端监听文件变化
watch -n 1 'cat sync/history.json | jq "length"'

# 查看扩展日志
# 打开 chrome://extensions/ → 找到扩展 → 点击 "检查视图" → Console
```

## 参考资料

- [Chrome Extension Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Git 基础](https://git-scm.com/book/zh/v2)

