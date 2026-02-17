# 统一输入框折叠功能

## 功能概述

为所有主流 AI 平台实现了统一的输入框折叠功能，当输入框为空时自动折叠成一个简洁的胶囊按钮，点击即可展开。

## 支持的平台

- ✅ **NotebookLM** - `notebooklm.google.com`
- ✅ **ChatGPT** - `chatgpt.com`
- ✅ **Claude** - `claude.ai`
- ✅ **DeepSeek** - `chat.deepseek.com`
- ✅ **Kimi** - `kimi.moonshot.cn`
- ✅ **通义千问** - `tongyi.com`
- ✅ **豆包** - `doubao.com`
- ✅ **Perplexity** - `perplexity.ai`
- ✅ **Copilot** - `copilot.microsoft.com`
- ✅ **Grok** - `grok.com`
- ✅ **Gemini** - `gemini.google.com` (使用专用脚本)

## 功能特性

### 自动折叠
- 输入框为空时自动折叠
- 有附件时不会折叠
- 正在输入时不会折叠

### 智能展开
- 点击折叠按钮展开
- 聚焦输入框自动展开
- 拖拽文件时自动展开

### 视觉效果
- 折叠后显示为圆角胶囊按钮
- 显示平台名称和图标
- 支持亮色/暗色主题
- 悬停时有提升动画效果

## 使用方法

### 启用功能

1. 在 Gemini 页面打开 Voyager 设置面板
2. 找到 **"启用输入框折叠 (所有AI)"** 开关
3. 开启后，访问任何支持的 AI 平台即可生效

### 配置项

在 `chrome.storage.sync` 中存储：
- `universalInputCollapseEnabled`: boolean - 是否启用通用输入框折叠

### 平台特定配置

每个平台都有独立的配置，包括：
- `inputSelector`: 输入框选择器
- `containerSelector`: 容器选择器
- `placeholderText`: 折叠时显示的文本
- `shouldAutoCollapse`: 是否自动折叠的判断函数

## 技术实现

### 文件结构

```
content-scripts/
├── universal-input-collapse.js  # 通用输入框折叠脚本
├── gemini-input-collapse.js     # Gemini 专用脚本
└── gemini-voyager-settings-panel.js  # 设置面板
```

### 核心逻辑

1. **平台检测**: 根据 `location.hostname` 选择对应配置
2. **DOM 监听**: 使用 `MutationObserver` 监听输入框变化
3. **状态管理**: 跟踪输入框内容、附件、焦点状态
4. **事件绑定**: 处理点击、聚焦、拖拽等交互

### 样式特点

- 使用 `!important` 确保样式优先级
- 折叠状态下隐藏所有子元素
- 仅显示自定义的占位符元素
- 支持深色模式自动适配

## 开发说明

### 添加新平台

在 `PLATFORM_CONFIGS` 中添加新配置：

```javascript
'example.com': {
  inputSelector: 'textarea',
  containerSelector: 'form',
  placeholderText: '给 Example 发消息',
  shouldAutoCollapse: () => true,
}
```

### 调试

在控制台查看日志：
```
[AISB Universal Input Collapse] ✅ 已加载 - notebooklm.google.com
```

### 注意事项

1. 每个平台的 DOM 结构不同，需要精确的选择器
2. 某些平台使用 `contenteditable` 而非 `textarea`
3. 需要处理 SPA 路由变化
4. 避免与平台原生功能冲突

## 更新日志

### v1.0.0 (2026-02-17)
- ✨ 新增统一输入框折叠功能
- ✅ 支持 10+ 主流 AI 平台
- 🎨 优化视觉效果和交互体验
- ⚙️ 添加设置面板控制选项

## 已知问题

- NotebookLM 的输入框选择器可能需要根据实际页面结构调整
- 某些平台在路由切换时可能需要重新初始化

## 后续计划

- [ ] 添加更多 AI 平台支持
- [ ] 支持自定义折叠样式
- [ ] 添加快捷键控制
- [ ] 优化性能和内存占用
