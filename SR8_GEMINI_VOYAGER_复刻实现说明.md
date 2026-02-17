# Gemini Voyager 功能复刻实现说明（AI Sidebar SR8）

## 1. 目标与范围
本次在 `AI-Sidebar 2` 中完成 Gemini 页面（`https://gemini.google.com/*`）的 Content Script 化复刻，覆盖你要求的 11 大模块，并统一为原生 JavaScript + HTML + CSS 架构。

核心设计目标：
- 不依赖 React/TypeScript 运行时。
- 模块解耦，按需加载，支持跨模块数据协作。
- 数据结构兼容 `gemini-voyager.folders.v1` / `gemini-voyager.prompts.v1`。
- 适配 Gemini 深浅色变量与 SPA 路由。

---

## 2. 新增与重写文件

### 2.1 通用基座
- `content-scripts/gemini-common.js`
  - 统一命名空间：`window.__AISB_GEMINI__`
  - 存储封装：`chrome.storage.local` + `localStorage` 兼容
  - 账号隔离：按 `/u/<id>/` 解析
  - 路由监听：`history.pushState/replaceState` + `popstate/hashchange`
  - DOM 工具：Sidebar 定位、会话解析、样式注入、等待元素
  - 轻量 Zip 打包器：`SimpleZipBuilder`（无第三方依赖）
  - 事件总线与模块注册中心

### 2.2 11 大模块
- `content-scripts/gemini-folder.js`（重写）
- `content-scripts/gemini-timeline.js`
- `content-scripts/gemini-export.js`
- `content-scripts/gemini-prompt.js`
- `content-scripts/gemini-formula.js`
- `content-scripts/gemini-mermaid.js`
- `content-scripts/gemini-markdown-patcher.js`
- `content-scripts/gemini-watermark.js`
- `content-scripts/gemini-deep-research.js`
- `content-scripts/gemini-tools.js`
- `content-scripts/gemini-cloud-sync.js`

### 2.3 资源与后台支持
- 新增资源目录：`content-scripts/watermark-assets/`
  - `bg_48.png`
  - `bg_96.png`
- 更新后台：`js/background.js`
  - 新增 `gv.fetchImage` 消息处理，支持跨域图片抓取（base64 返回）

---

## 3. manifest 更新
已更新 `manifest.json`：

1. `web_accessible_resources` 新增：
- `content-scripts/watermark-assets/bg_48.png`
- `content-scripts/watermark-assets/bg_96.png`

2. Gemini Content Script 注入顺序调整为：
1. `content-scripts/gemini-common.js`
2. `content-scripts/gemini-folder.js`
3. `content-scripts/gemini-timeline.js`
4. `content-scripts/gemini-export.js`
5. `content-scripts/gemini-prompt.js`
6. `content-scripts/gemini-formula.js`
7. `content-scripts/gemini-mermaid.js`
8. `content-scripts/gemini-markdown-patcher.js`
9. `content-scripts/gemini-watermark.js`
10. `content-scripts/gemini-deep-research.js`
11. `content-scripts/gemini-tools.js`
12. `content-scripts/gemini-cloud-sync.js`

---

## 4. 11 大模块实现要点

## 4.1 文件夹组织（最高优先级）
文件：`content-scripts/gemini-folder.js`

已实现：
- 两级文件夹层级（父/子）+ 超级深度自动迁移为两级
- 8 色文件夹（含自定义色）
- 文件夹拖拽排序与层级移动（before/after/inside）
- 会话拖拽（原生会话 -> 文件夹、文件夹间移动、同文件夹重排）
- 账号隔离模式（`/u/<id>`）与“仅当前账号显示”切换
- 导入/导出（兼容 `gemini-voyager.folders.v1`）
- 版本兼容校验、旧结构迁移、冲突 ID 重映射
- 右键菜单：重命名/删除/颜色/子文件夹/移动
- 批量选择 + 批量移动 + 批量移除
- 搜索过滤（文件夹名/会话名）
- 展开/折叠动画

## 4.2 时间线导航（高优先级）
文件：`content-scripts/gemini-timeline.js`

已实现：
- 右侧可视化消息节点
- 节点点击快速跳转
- Hover 预览 Tooltip
- 长按星标、右键星标
- 右键节点等级（1/2/3）标注
- 视口激活节点定位（滚动联动）
- 节点撤回（回滚到某节点并隐藏后续）+ 恢复
- `j/k` 快捷导航

## 4.3 聊天导出（高优先级）
文件：`content-scripts/gemini-export.js`

已实现：
- JSON 导出（完整 turn 结构）
- Markdown 导出（含图片引用）
- PDF 打印导出（样式化打印页）
- 图片打包导出（Zip：Markdown + JSON + images）
- Deep Research 报告导出（Markdown/PDF/JSON）
- 批量导出（会话清单）

## 4.4 提示词库（中优先级）
文件：`content-scripts/gemini-prompt.js`

已实现：
- 提示词保存/编辑/删除
- 分类 + 标签
- 搜索与过滤（关键词/分类/标签）
- 一键插入输入框
- 一键复制
- 导入/导出（`gemini-voyager.prompts.v1`）
- 从当前输入框抓取文本保存
- 使用 `chrome.storage.local` 跨站点共享数据

## 4.5 公式复制（中优先级）
文件：`content-scripts/gemini-formula.js`

已实现：
- 自动检测公式容器（Gemini + ms-katex）
- 悬浮工具条
- 一键复制 LaTeX
- 一键复制 MathML（Word 友好格式）
- Clipboard API + fallback

## 4.6 Mermaid 渲染（中优先级）
文件：`content-scripts/gemini-mermaid.js`

已实现：
- 自动检测 Mermaid 代码块
- 代码/图表切换
- 版本切换（`11.12.2` / `9.2.2`）
- MutationObserver 实时扫描

## 4.7 Markdown 修复（低优先级）
文件：`content-scripts/gemini-markdown-patcher.js`

已实现：
- `**bold**` 被中间节点打断的自动修复
- TreeWalker 精细扫描
- 跳过 code/pre/math 区域
- 新增节点增量修复

## 4.8 水印去除（低优先级）
文件：`content-scripts/gemini-watermark.js`

已实现：
- 自动为生成图片注入“🍌 无水印下载”按钮
- 逆向 alpha blending 去水印算法
- 48/96 watermark 自适应
- 下载并替换预览
- 资源依赖：`content-scripts/watermark-assets/bg_48.png`, `bg_96.png`

## 4.9 深度研究（中优先级）
文件：`content-scripts/gemini-deep-research.js`

已实现：
- Deep Research 场景检测
- Thinking 面板结构化提取
- Thinking Markdown 导出
- 报告区 JSON/PDF 导出
- 会话菜单项注入（Download Thinking / Report Export）

## 4.10 工具集（低优先级）
文件：`content-scripts/gemini-tools.js`

已实现：
- 批量删除模式（多选 + 删除流程）
- 引用回复（选中文本 -> blockquote 插入输入框）
- 标签页标题同步
- 输入框折叠
- 默认模型设置与应用
- 隐藏最近项目

## 4.11 云同步（最低优先级）
文件：`content-scripts/gemini-cloud-sync.js`

已实现：
- 云端上传（chrome.storage.sync 分片写入）
- 下载并合并（folders/prompts/tools settings）
- 云端备份下载
- 分片元信息管理（`gvCloudSyncMeta` + chunk keys）

---

## 5. 数据兼容与迁移

### 5.1 文件夹
- 兼容导入格式：
  - `gemini-voyager.folders.v1`
  - 直接 `folders + folderContents` 结构
- 自动迁移：
  - 父级无效修复
  - 超过两级自动提升
  - 冲突 folder id 自动重映射
  - conversation 去重

### 5.2 提示词
- 兼容：`gemini-voyager.prompts.v1`
- 导入合并去重：按文本内容判重，标签合并

---

## 6. 语法与配置校验
已执行：
- `manifest.json` JSON 解析校验通过
- 所有新增/修改 JS 文件 `node --check` 通过

涉及文件：
- `content-scripts/gemini-common.js`
- `content-scripts/gemini-folder.js`
- `content-scripts/gemini-timeline.js`
- `content-scripts/gemini-export.js`
- `content-scripts/gemini-prompt.js`
- `content-scripts/gemini-formula.js`
- `content-scripts/gemini-mermaid.js`
- `content-scripts/gemini-markdown-patcher.js`
- `content-scripts/gemini-watermark.js`
- `content-scripts/gemini-deep-research.js`
- `content-scripts/gemini-tools.js`
- `content-scripts/gemini-cloud-sync.js`
- `js/background.js`

---

## 7. 运行方式
1. 打开 Chrome 扩展管理页（`chrome://extensions/`）
2. 重新加载当前扩展
3. 打开 `https://gemini.google.com/*`
4. 验证左侧文件夹面板、右侧时间线、导出/提示词/工具等浮层是否出现

---

## 8. 备注
- 所有模块均为原生 JS DOM 注入实现，满足 React/TS -> Vanilla 迁移要求。
- 所有新增代码均添加中文注释。
- 模块采用统一基座通信（`window.__AISB_GEMINI__`），便于后续扩展与回归测试。
