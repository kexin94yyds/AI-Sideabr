# 📸 截图功能使用指南

## ✨ 功能说明

按下 `Cmd+Shift+K` (Mac) 或 `Ctrl+Shift+K` (Windows/Linux) 可以截取当前标签页的完整截图，**并直接加载到右侧 AI 聊天框中**，就像粘贴图片一样！

## 🎯 使用方法

1. **打开侧边栏**：点击扩展图标打开 AI 侧边栏
2. **选择 AI**：选择你想使用的 AI（ChatGPT、Claude、Gemini 等）
3. **截图**：在任意网页按下 `Cmd+Shift+K`
4. **自动加载**：截图会自动插入到 AI 输入框中
5. **发送给 AI**：添加你的问题，然后发送给 AI 分析

## 🔧 技术实现

### 支持的插入方式

我们实现了三种图片插入方法，按优先级尝试：

#### 方法 1: 模拟粘贴事件 ⭐ 推荐
```javascript
const pasteEvent = new ClipboardEvent('paste', {
  bubbles: true,
  cancelable: true,
  clipboardData: clipboardData
});
```
- ✅ **ChatGPT**: 完美支持
- ✅ **Claude**: 完美支持  
- ✅ **Gemini**: 完美支持
- ✅ **DeepSeek**: 支持
- ✅ **Grok**: 支持

#### 方法 2: 模拟拖放事件
```javascript
const dropEvent = new DragEvent('drop', {
  bubbles: true,
  cancelable: true,
  dataTransfer: dataTransfer
});
```
- 作为粘贴失败时的备用方案
- 支持大部分现代 AI 聊天界面

#### 方法 3: 文件上传按钮
```javascript
uploadInput.files = dataTransfer.files;
uploadInput.dispatchEvent(new Event('change'));
```
- 查找并触发隐藏的文件上传 input
- 兼容传统文件上传方式

### 代码架构

```
用户按快捷键 (Cmd+Shift+K)
    ↓
background.js: handleCaptureScreenshot()
    ↓ captureVisibleTab()
    ↓ deliverToSidePanel()
    ↓
popup.js: showScreenshotOverlay()
    ↓ postMessage('AI_SIDEBAR_INSERT_IMAGE')
    ↓
content-scripts/url-sync.js: 图片插入监听器
    ↓ fetch(dataUrl) → Blob → File
    ↓ 尝试方法 1, 2, 3
    ↓
AI 输入框接收图片 ✅
```

## 🎨 用户体验

- ⚡ **快速截图**：一键截取，无需额外操作
- 🎯 **自动插入**：无需手动粘贴，直接加载到输入框
- 💬 **提示反馈**：Toast 通知告知操作结果
- 🔄 **自动聚焦**：截图后自动聚焦到输入框

## 🐛 调试技巧

如果截图无法插入，打开浏览器控制台查看日志：

```javascript
// 成功日志
[AI Sidebar] 图片通过粘贴事件插入成功

// 失败日志
[AI Sidebar] 未找到输入框元素
[AI Sidebar] 所有图片插入方法均失败
```

## 🔍 兼容性

| AI 提供商 | 截图插入 | 备注 |
|----------|---------|------|
| ChatGPT  | ✅ | 完美支持粘贴 |
| Claude   | ✅ | 完美支持粘贴 |
| Gemini   | ✅ | 完美支持粘贴 |
| DeepSeek | ✅ | 支持粘贴 |
| Grok     | ✅ | 支持粘贴 |
| Perplexity | ⚠️ | 不支持图片 |
| 通义千问 | ⚠️ | 需测试 |
| 豆包     | ⚠️ | 需测试 |

## 📝 注意事项

1. **权限要求**：需要 `activeTab` 权限才能截取当前标签页
2. **图片格式**：截图自动保存为 PNG 格式
3. **文件大小**：截图会被转换为 base64，大屏幕可能较大
4. **隐私保护**：截图仅在本地处理，不上传到任何服务器

## 🚀 未来改进

- [ ] 支持截取选区（而非全屏）
- [ ] 支持截图前的延时设置
- [ ] 支持截图编辑（标注、箭头等）
- [ ] 支持截图历史记录
- [ ] 支持同时插入多张图片

---

**享受截图功能吧！** 🎉

