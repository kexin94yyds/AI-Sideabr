# Gemini Voyager 风格 UI 样式优化说明

## 1. 目标
- 保持 11 个模块功能逻辑不变，仅升级 UI 外观与交互质感。
- 统一接入 Gemini 风格变量体系，减少硬编码颜色。
- 完善深色/浅色模式适配与过渡动画。

## 2. 核心改造
### 2.1 全局主题变量（新增）
- 文件：`content-scripts/gemini-common.js`
- 新增 `ensureGeminiThemeStyles()`，统一注入：
  - 颜色变量：主色、表面色、轮廓色、状态色（hover/active/focus）
  - 字体变量：Google Sans 系列优先
  - 圆角与阴影变量：与 Gemini 浮层风格统一
  - 动效变量：`fast` / `standard` 动画节奏
- 新增深色主题覆盖选择器：
  - `html.dark-theme`
  - `body.dark-theme`
  - `html[data-theme="dark"]`
  - `body[data-theme="dark"]`
- 新增 `prefers-reduced-motion` 兜底，降低动画强度。

### 2.2 Toast 风格统一
- 文件：`content-scripts/gemini-common.js`
- Toast 改为使用统一变量，颜色、阴影、圆角与模块浮层一致。

## 3. 模块样式升级清单
已升级的样式文件（功能逻辑未改）：
- `content-scripts/gemini-folder.js`
- `content-scripts/gemini-timeline.js`
- `content-scripts/gemini-export.js`
- `content-scripts/gemini-prompt.js`
- `content-scripts/gemini-formula.js`
- `content-scripts/gemini-mermaid.js`
- `content-scripts/gemini-watermark.js`
- `content-scripts/gemini-deep-research.js`
- `content-scripts/gemini-tools.js`
- `content-scripts/gemini-cloud-sync.js`

辅助基座更新：
- `content-scripts/gemini-common.js`

说明：
- `content-scripts/gemini-markdown-patcher.js` 为无可视 UI 模块，本次不涉及样式改造。

## 4. 各模块视觉改进摘要
### 4.1 文件夹面板（Folder）
- 面板、列表项、右键菜单、颜色选择器、移动对话框统一为 Gemini 变量风格。
- 增强 hover/active/dragover 反馈。
- 优化批量栏视觉层级与对话框交互状态。

### 4.2 时间线（Timeline）
- 节点、轨道、头部卡片、Tooltip、上下文菜单统一视觉语言。
- 增加轨道线层次、节点高亮/星标视觉强化。
- 提升悬浮与激活态的过渡体验。

### 4.3 工具栏（Tools）
- 面板与按钮升级为更接近 Gemini 的浮层按钮风格。
- 批量栏、引用回复按钮统一圆角、阴影、状态色与动效。

### 4.4 导出面板（Export）
- 主入口按钮、下拉菜单、进度浮层、批量导出对话框统一变量体系。
- 增强弹出动画与遮罩层表现。

### 4.5 提示词面板（Prompt）
- 触发按钮、浮层、列表卡片、输入控件、标签 chip 全面视觉统一。
- 卡片 hover 与按钮状态更加清晰。

### 4.6 其他模块
- 公式复制工具条：浮层与按钮风格升级。
- Mermaid 容器与工具条：边框、背景、按钮状态统一。
- 水印下载按钮：高对比胶囊按钮与悬浮反馈。
- 深度研究导出浮层：按钮与菜单项风格升级。
- 云同步面板：触发器、面板、状态信息统一风格。

## 5. 兼容性与验证
已通过语法校验：
```bash
node --check content-scripts/gemini-common.js
node --check content-scripts/gemini-folder.js
node --check content-scripts/gemini-timeline.js
node --check content-scripts/gemini-export.js
node --check content-scripts/gemini-prompt.js
node --check content-scripts/gemini-formula.js
node --check content-scripts/gemini-mermaid.js
node --check content-scripts/gemini-tools.js
node --check content-scripts/gemini-deep-research.js
node --check content-scripts/gemini-watermark.js
node --check content-scripts/gemini-cloud-sync.js
```

建议人工验证：
- Gemini 浅色模式下各浮层视觉一致性。
- Gemini 深色模式下文本可读性、边框对比度。
- 拖拽、批量、菜单、导出进度、提示词编辑流程的状态反馈。
