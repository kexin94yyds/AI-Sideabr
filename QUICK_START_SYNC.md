# 数据同步快速启动指南

## 🚀 3 分钟快速开始

### 第 1 步：启动同步服务器

在项目目录打开终端，运行：

```bash
npm run sync
```

或

```bash
node sync-server.cjs
```

你会看到：
```
🚀 同步服务器已启动: http://localhost:3456
📁 同步目录: <repo>/sync

可用端点:
  - GET  /ping            - 健康检查
  - POST /sync/history    - 同步历史记录
  - POST /sync/favorites  - 同步收藏

按 Ctrl+C 停止服务器
```

**保持这个终端窗口打开！**

### 第 2 步：重新加载浏览器扩展

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 找到 AI-Sidebar 扩展
4. 点击刷新按钮 🔄

### 第 3 步：验证同步

打开侧边栏的开发者工具查看日志：

1. 打开 AI-Sidebar 侧边栏
2. 右键点击侧边栏 → 选择 "检查"
3. 切换到 Console 标签

你应该能看到：
```
AutoSync: 自动同步已启用
AutoSync: History 同步成功 (X 条)
AutoSync: Favorites 同步成功 (X 条)
```

同时，同步服务器终端会显示：
```
✅ History 已更新: X 条记录
⭐ Favorites 已更新: X 条记录
```

### 第 4 步：查看同步的数据

```bash
# 查看历史记录
cat sync/history.json | head -20

# 查看收藏
cat sync/favorites.json | head -20

# 统计数据条数
echo "History: $(cat sync/history.json | grep -o '"url"' | wc -l) 条"
echo "Favorites: $(cat sync/favorites.json | grep -o '"url"' | wc -l) 条"
```

---

## ✨ 就这么简单！

现在你的 Electron 应用或其他应用就可以读取 `sync/*.json` 文件了。

数据会：
- ✅ 每分钟自动同步一次
- ✅ 在扩展启动时立即同步
- ✅ 保持最新状态

---

## 🔧 如果遇到问题

### 问题：同步服务器无法启动

**原因**：端口 3456 可能被占用

**解决**：
```bash
# 检查端口占用
lsof -i :3456

# 如果有进程占用，可以杀掉它
kill -9 <PID>

# 或者修改 sync-server.cjs 中的 PORT 变量
```

### 问题：扩展无法连接到服务器

**解决**：
1. 确认同步服务器正在运行（看到 "🚀 同步服务器已启动"）
2. 确认扩展已重新加载
3. 在扩展 Console 手动触发同步：
   ```javascript
   AutoSync.syncAll().then(console.log)
   ```

### 问题：sync/*.json 文件仍然是空的

**解决**：
1. 检查扩展是否有数据：
   ```javascript
   // 在扩展 Console 中运行
   window.HistoryDB.getAll().then(d => console.log('History:', d.length))
   chrome.storage.local.get(['aiFavoriteLinks'], r => console.log('Favorites:', r.aiFavoriteLinks?.length || 0))
   ```

2. 如果没有数据，先使用扩展浏览一些 AI 网站创建历史记录

3. 如果有数据但不同步，手动触发：
   ```javascript
   AutoSync.syncAll().then(console.log)
   ```

---

## 📱 在其他应用中读取数据

### Node.js / Electron

```javascript
const fs = require('fs');
const path = require('path');

const syncDir = path.join(process.cwd(), 'sync');

// 读取数据
const history = JSON.parse(fs.readFileSync(path.join(syncDir, 'history.json'), 'utf8'));
const favorites = JSON.parse(fs.readFileSync(path.join(syncDir, 'favorites.json'), 'utf8'));

console.log(`History: ${history.length} 条`);
console.log(`Favorites: ${favorites.length} 条`);

// 监听文件变化
fs.watch(syncDir, (eventType, filename) => {
  if (filename === 'history.json' || filename === 'favorites.json') {
    console.log(`${filename} 已更新，重新加载...`);
    // 重新读取数据
  }
});
```

### Python

```python
import json
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

sync_dir = os.path.join(os.getcwd(), 'sync')

# 读取数据
with open(os.path.join(sync_dir, 'history.json'), 'r') as f:
    history = json.load(f)
    
with open(os.path.join(sync_dir, 'favorites.json'), 'r') as f:
    favorites = json.load(f)

print(f"History: {len(history)} 条")
print(f"Favorites: {len(favorites)} 条")

# 监听文件变化
class SyncHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith('.json'):
            print(f"{event.src_path} 已更新")
            # 重新读取数据

observer = Observer()
observer.schedule(SyncHandler(), sync_dir, recursive=False)
observer.start()
```

---

## 📚 更多信息

详细文档请参考 [SYNC_GUIDE.md](./SYNC_GUIDE.md)
