# 2026-02-28 Session 2: Gemini Timeline 修复 + 折叠注入

## 目标
从 AI-Sidebar 2 Chrome 扩展移植 Gemini 时间线、设置面板、输入框折叠功能到全局 AI 侧边栏 Electron 应用。

## 完成的工作

### 1. Gemini 时间线修复（3个根因）
| 根因 | 错误 | 修复 |
|------|------|------|
| `initI18n()` 崩溃 | `storage.onChanged` undefined | 创建 `chrome-storage-shim.js` polyfill |
| Trusted Types CSP | `innerHTML` 赋值被拦截 | `innerHTML` → `DOMParser` |
| CSS 注入失败 | `style.textContent` 可能被拦截 | CSS 拆成独立文件 `gemini-timeline.css`，通过 `insertCSS` 注入 |

### 2. 设置面板默认打开问题
- **根因**: `gemini-voyager-settings-panel.css` 文件缺失，`.gvsp-panel` 无初始隐藏样式
- **修复**: 从 backup 分支恢复 CSS 文件

### 3. 输入框折叠注入
- **需求**: Cmd+Shift+Y/K 在折叠状态下也能注入文字/截图
- **修复**: `insertTextIntoCurrentView` 和 `insertImageIntoView` 执行前先移除 `aisb-input-collapsed` 类

### 4. 折叠默认开启
- `gvInputCollapseEnabled` 默认值改为 `true`

## 诊断方法
- 在 `electron-main.js` 添加 `console-message` 监听，转发 BrowserView 日志到主进程 stdout
- 在 `gemini-timeline.js` 入口和关键路径添加 `[Timeline-DIAG]` 日志

## Git 提交
```
8dbad32 feat: 输入框折叠默认开启
111278f feat: 折叠状态下 Cmd+Shift+Y/K 自动展开后注入
dd46582 fix: 恢复 settings-panel.css (面板默认关闭)
99d789a fix: 时间线两个根因 - shim + innerHTML→DOMParser + CSS分离
61a5804 feat: 添加 Gemini 时间线功能
3f78460 feat: 右侧嵌入式浏览器注入 content-scripts
ec8a469 fix: 删除设置面板残留裸 CSS 代码
```

## 关键文件
- `/Users/apple/全局 ai 侧边栏/AI-Sidebar/electron-main.js` — 主进程注入逻辑
- `/Users/apple/全局 ai 侧边栏/AI-Sidebar/content-scripts/chrome-storage-shim.js` — chrome.storage polyfill
- `/Users/apple/全局 ai 侧边栏/AI-Sidebar/content-scripts/gemini-timeline.js` — 时间线（已修补）
- `/Users/apple/全局 ai 侧边栏/AI-Sidebar/content-scripts/gemini-timeline.css` — 时间线CSS（从JS提取）
- `/Users/apple/全局 ai 侧边栏/AI-Sidebar/content-scripts/gemini-input-collapse.js` — 折叠逻辑
- `/Users/apple/全局 ai 侧边栏/AI-Sidebar/content-scripts/gemini-voyager-settings-panel.js` — 设置面板
- `/Users/apple/全局 ai 侧边栏/AI-Sidebar/content-scripts/gemini-voyager-settings-panel.css` — 设置面板CSS

## 待办（后续）
- 清理诊断日志 `[Timeline-DIAG]` 和 `console-message` 监听
- backup-fixes-20260228 分支中有更多修复（10个缺失脚本复制、storageSet双写、跨平台shim），可按需 cherry-pick
- 暗色主题下时间线圆点对比度可能需要调整
