# 问题事实库（Problems Registry）

统一记录所有项目中发生过的问题，作为跨项目、长期可追溯的工程经验积累。
本文件是问题事实来源，不等同于 Issue 或 TODO。

---

## 条目格式说明

每个问题条目必须包含以下字段：

- **ID**：P-YYYY-NNN  
  - P 表示 Problem  
  - YYYY 为首次发现年份  
  - NNN 为当年递增序号，不复用、不回收
- **项目**：项目名称
- **仓库**：git 地址
- **发生版本**：commit hash 或 tag
- **现象**：实际观察到的异常行为（用户可见或系统层面）
- **根因**：技术层面的原因分析
- **修复**：采用的解决方案
- **回归检查**：关联的 R-ID
- **状态**：open / fixed / verified
- **日期**：YYYY-MM-DD

### 状态说明

- **open**：问题已发现，尚未完成修复
- **fixed**：代码已修复，但未完成回归验证
- **verified**：回归检查存在，且在当前版本中通过

---

## P-2026-001 .gitignore 通配符导致 .cunzhi-knowledge 文件被忽略

- 项目：iterate (CunZhi)
- 仓库：/Users/apple/cunzhi
- 发生版本：v0.5.0
- 现象：问题解决后，相关的 .md 文件没有在 .cunzhi-knowledge/ 中正确显示或被 IDE 识别。发现项目根目录的 .gitignore 包含 *.md 规则，导致知识库内的文件被忽略。
- 根因：项目级的 .gitignore 通配符规则（如 *.md）会递归影响子目录，包括作为 submodule 或独立仓库存在的 .cunzhi-knowledge/，导致 IDE（如 Windsurf）隐藏这些文件，且 git 操作受限。
- 修复：
  1. 在 .gitignore 中添加 `!.cunzhi-knowledge/` 和 `!.cunzhi-memory/` 例外保护。
  2. 在 .cunzhi-knowledge 中提供标准化保护模板。
  3. 增强 `ji(回忆)` 工具，使其能自动检测此类配置风险并提供一键修复建议。
- 回归检查：R-2026-001
- 状态：verified
- 日期：2026-01-03

---
## P-2026-002 AI Sidebar 导出/保存路径导致重复写入与来源校验缺失

- 项目：AI-Sidebar
- 仓库：/Users/apple/AI-sidebar 更新/AI-Sidebar
- 发生版本：51299728c58bc9bd6b5116eb98fbb7f7269b89d5
- 现象：
  1. 使用 Cmd/Option+S 保存对话时，历史库可能出现重复记录。
  2. 嵌入页面可发送伪造的 `AI_SIDEBAR_*` 消息触发下载或写库。
- 根因：
  1. 内容脚本同时走 `postMessage` 与 `chrome.runtime.sendMessage`，侧边栏即时保存 + 后台队列再次保存，导致重复。
  2. 侧边栏 `message` 监听未校验 `event.source`/`event.origin`。
- 修复：
  1. 保存路径二选一：仅保留 `postMessage` 或仅保留 runtime 队列；必要时在保存前去重。
  2. 严格校验消息来源（限定 `event.source` 为当前 iframe、`origin` 在白名单）。
- 回归检查：待补充
- 状态：open
- 日期：2026-01-05

---
## P-2025-001 Windsurf/Cursor 编辑器插入失败

- 项目：Full-screen-prompt (Electron)
- 仓库：/Users/apple/提示词最新的/Full-screen-prompt
- 发生版本：2.0.0
- 现象：在 Windsurf 或 Cursor 等编辑器中，选择提示词后无法自动粘贴到光标位置，而在备忘录等应用中正常。
- 根因：原方案使用 `activateAppByName` 激活应用，但在 Windsurf 这类基于 VS Code 的编辑器中，进程名称（如 `Windsurf` vs `Windsurf Helper`）或窗口层级较为复杂，导致 AppleScript 无法精准切回编辑器焦点。
- 修复：将激活逻辑从“按名称”改为“按 PID（进程 ID）”。在呼出窗口时记录当前前台 PID，插入时通过 PID 强制激活。同时增加了 150ms 的激活缓冲时间。
- 回归检查：R-2025-001
- 状态：verified
- 日期：2025-12-30

## P-2025-001 磁盘空间不足导致最新数据丢失

- 项目：RI (Replace-Information)
- 仓库：/Users/apple/信息置换起/RI
- 发生版本：2.1.1
- 现象：用户退出应用后再次打开，发现最新数据全部丢失。
- 根因：系统磁盘空间完全耗尽（ENOSPC），导致 ElectronStore 在保存 `config.json` 时写入失败，且 IndexedDB 事务无法提交。
- 修复：
  1. 实现自动备份机制：应用启动时及运行期间每 30 分钟备份一次 `config.json` 和 `IndexedDB` 目录。
  2. 限制备份数量：保留最近 10 次备份以平衡安全与空间占用。
  3. 暴露备份 API：允许通过 `window.electronAPI.backup` 进行手动备份、查看列表及恢复。
- 回归检查：R-2025-001
- 状态：verified
- 日期：2025-12-31

## P-2025-005 全局快捷键开关失效及系统快捷键冲突

- 项目：iterate (CunZhi)
- 仓库：/Users/apple/cunzhi
- 发生版本：v1.2.0
- 现象：
  1. 点击快捷键开关图标，状态虽变但快捷键在窗口聚焦时仍生效。
  2. `Tab`/`Shift+Tab` 拦截了系统级组合键（如 `Cmd+Tab`），导致无法切换应用。
  3. 修改代码后由于缺失 `@tauri-apps/api/event` 中的 `listen` 导入，导致前端无法接收状态变更。
- 根因：
  1. 仅注销了全局插件快捷键，未禁用前端 `document` 级别的本地监听器。
  2. 键盘事件处理器缺乏对修饰键（Cmd/Alt/Ctrl）的排除逻辑。
  3. `AppContent.vue` 中未导入 `listen` 函数，导致异步状态同步失败。
- 修复：
  1. 在 `AppContent.vue` 的 `handleGlobalKeydown` 中增加 `globalShortcutEnabled` 校验。
  2. 优化 `Tab`/`Shift+Tab` 拦截逻辑，明确排除带修饰键的情况。
  3. 补齐 `listen` 导入，确保 `global-shortcut-state-changed` 事件能被正确处理。
  4. 移除 `PopupHeader.vue` 中冗余的“已禁”文本，优化 UI。
- 回归检查：R-2025-005
- 状态：verified
- 日期：2025-12-30

---

## P-2025-004 全局快捷键无法临时禁用

- 项目：iterate (CunZhi)
- 仓库：/Users/apple/cunzhi
- 发生版本：v1.2.0
- 现象：用户希望在某些场景下临时关闭全局快捷键（如 `Shift+Tab`），避免冲突，但目前只能通过系统设置或修改配置文件实现，操作不便。
- 根因：缺乏快捷键状态的运行时管理机制和 UI 快速切换入口。
- 修复：
  1. 后端：在 `ShortcutConfig` 和 `AppState` 中增加 `global_enabled` 状态。
  2. 逻辑：重构前端快捷键注册逻辑，支持动态监听状态变化并执行 `register/unregister`。
  3. UI：在弹窗头部（`PopupHeader`）增加闪电图标按钮，支持一键切换。
- 回归检查：R-2025-004
- 状态：fixed
- 日期：2025-12-29

---

## P-2025-003 上下文追加项无法按需禁用

- 项目：iterate (CunZhi)
- 仓库：/Users/apple/cunzhi
- 发生版本：v1.2.0
- 现象：弹窗中的“上下文追加”项（如“是否生成总结性Markdown文档”）总是会追加内容到输入框，用户无法在弹窗中临时选择不追加某一项。
- 根因：数据结构 `CustomPrompt` 缺少启用状态标志（`is_active`），且前端 UI 只提供了模板状态切换（Switch），没有提供项级别的开启/关闭控制。
- 修复：
  1. 后端：在 `CustomPrompt` 结构体中添加 `is_active` 字段，并新增 `update_conditional_prompt_active` 命令。
  2. 前端：在弹窗 UI 的上下文追加区域，为每项添加 Checkbox 勾选框；只有 `is_active` 为 true 的项才会参与内容追加。
  3. 设置：在自定义 Prompt 设置页面增加“是否启用”开关。
- 回归检查：R-2025-003
- 状态：fixed
- 日期：2025-12-29

---

## P-2024-007 笔记窗口 Cmd+B 加粗时画面跳动

- 项目：RI (Replace-Information)
- 仓库：/Users/apple/信息置换起/RI
- 发生版本：2024-12-15 之前版本
- 现象：在笔记窗口中，当文字内容超过一屏时，使用 Cmd+B 加粗选中文字会导致画面自动滚动到下方，用户需要手动翻回原位置
- 根因：浏览器 `execCommand('bold')` 执行后会自动将光标位置滚动到可见区域，加上 MutationObserver 同时触发导致滚动位置被多次修改
- 修复：
  1. 添加 `isFormatting` 标志位和 `savedScrollTop` 变量
  2. 在 keydown 事件中检测格式化快捷键时保存滚动位置，格式化后恢复
  3. MutationObserver 回调中检查标志位，正在格式化时直接恢复到已保存位置
- 回归检查：手动验证 Cmd+B 加粗时画面不再跳动
- 状态：verified
- 日期：2024-12-15

---

## P-2024-023 Electron/macOS HTML5 拖拽被立即取消

- 项目：RI (Replace-Information)
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：Electron 28 + macOS
- 现象：在侧栏拖拽模式时，幽灵预览显示到窗口背后；拖拽开始后立即结束（只有 dragstart→dragend）；无法完成排序
- 根因：Electron/Chromium 在 macOS 下的原生 HTML5 DnD 会被环境策略立即取消（窗口/区域策略导致），非代码问题
- 修复：采用"自定义鼠标拖拽"替代原生 HTML5 DnD：
  - mousedown 超阈值后进入拖拽，创建 fixed+高 z-index 悬浮预览
  - `document.elementFromPoint` 命中按钮并显示上/下插入线
  - mouseup 计算索引并更新顺序
- 回归检查：手动验证拖拽排序功能正常
- 状态：verified
- 日期：2024-12-15
- 经验：Electron/macOS 遇到只有 dragstart→dragend 时，优先考虑自定义鼠标拖拽；调试时分层日志（按钮/容器/文档）能快速定位事件流

---

## P-2024-024 笔记内容因防抖机制丢失

- 项目：RI (Replace-Information)
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：v2.0.0
- 现象：上传图片后立即切换模式，图片丢失；输入文字后立即切换模式，文字也会丢失
- 根因：笔记保存使用 500ms 防抖，用户在 500ms 内切换模式/关闭窗口/失去焦点时，定时器被销毁，内容未保存
- 修复：
  1. 模式切换前清除防抖定时器并立即保存
  2. 窗口失去焦点时自动保存
  3. 关闭窗口前强制保存
  4. IPC mode-changed 事件前保存
- 回归检查：手动验证图片/文字在各种切换场景下均保留
- 状态：verified
- 日期：2024-12-15
- 经验：防抖适合频繁输入，但关键操作前必须强制保存；添加多重保护（失焦、关闭、切换）

---

## P-2024-025 IndexedDB 数据库锁定导致启动失败

- 项目：RI (Replace-Information)
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：v2.0.0+
- 现象：启动时报 `Failed to open LevelDB database, IO error: LOCK: File currently in use`；应用无法读取或保存数据
- 根因：IndexedDB 的 LevelDB 后端使用文件锁，同一时间只允许一个进程访问。常见触发：打包版本后台运行、崩溃遗留锁、多实例同时运行
- 修复：
  1. `pkill -f "replace-information"` 温和关闭
  2. 强制终止 `kill -9`
  3. 最后手段：删除 LOCK 文件（需确认无进程运行）
- 回归检查：手动验证应用正常启动
- 状态：verified
- 日期：2024-12-15
- 经验：使用活动监视器或 `ps aux | grep` 检查进程；定期备份用户数据目录

---

## P-2024-026 IPC 事件语义混淆导致笔记内容串联

- 项目：RI (Replace-Information)
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：v2.0.0
- 现象：切换模式后，笔记内容显示为其他模式的内容
- 根因：
  1. `modes-sync` 事件（同步列表）被错误地用于切换状态
  2. 主窗口和子窗口可以在不同模式，强行同步导致状态错乱
  3. 缺少从数据库重新加载，使用了过期缓存数据
- 修复：
  1. `modes-sync` 只同步列表，不改变当前状态
  2. 模式切换只通过 `mode-changed` 事件
  3. 永远从 IndexedDB 加载权威数据
- 回归检查：手动验证多模式切换内容正确
- 状态：verified
- 日期：2024-12-15
- 经验：IPC 事件语义要清晰（同步列表 vs 切换状态）；主窗口和子窗口状态独立管理

---

## P-2024-027 AI-Sidebar 提供商登录页无法在 iframe 加载

- 项目：AI-Sidebar
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：v0.0.1
- 现象：Gemini/Google 等提供商的登录页在侧边栏 iframe 中无法加载
- 根因：某些提供商（尤其是 Google）对 iframe 嵌入有安全限制（X-Frame-Options/CSP）
- 修复：提供 "Open in Tab" 按钮，在新标签页中登录，登录完成后侧边栏恢复正常
- 回归检查：手动验证登录流程
- 状态：verified
- 日期：2024-12-15
- 经验：嵌入第三方服务时需考虑 iframe 安全限制，提供降级方案

---

## P-2024-028 ChatGPT 403 错误

- 项目：AI-Sidebar
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：v0.0.1
- 现象：ChatGPT 在侧边栏中显示 403 错误
- 根因：OpenAI 针对侧边栏请求进行了特殊检查
- 修复：先在普通标签页中打开 ChatGPT 通过初始检查，之后侧边栏可正常访问
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15

---

## P-2024-029 Chrome 扩展 Tab 键切换失效

- 项目：AI-Sidebar
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：v0.0.1
- 现象：Tab 键切换提供商不工作
- 根因：某些网站的 iframe 拦截了 Tab 键事件
- 修复：确保侧边栏处于焦点状态；在侧边栏空白区域点击后再按 Tab 键
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15

---

## P-2024-030 久坐提醒 iPhone 后台推送失败

- 项目：Sitting
- 仓库：https://github.com/kexin94yyds/Sitting
- 发生版本：v1.0.0
- 现象：iPhone 收不到后台推送通知
- 根因：iOS PWA 推送需要特定条件：iOS ≥ 16.4、通过"添加到主屏幕"安装、已授予通知权限、应用在后台运行
- 修复：文档说明必要条件
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15
- 经验：iOS PWA 推送限制多，需在文档中明确说明

---

## P-2024-031 RI-Flow 快捷键不起作用

- 项目：RI-Flow (信息过滤器桌面版)
- 仓库：https://github.com/kexin94yyds/RI-Flow
- 发生版本：当前版本
- 现象：快捷键无响应
- 根因：可能原因：应用未运行、其他应用占用相同快捷键
- 修复：确保应用运行、检查快捷键冲突、重启应用
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15

---

## P-2024-032 YouTube-Transcript 侧边栏高度自适应问题

- 项目：YouTube-Transcript
- 仓库：https://github.com/kexin94yyds/YouTube-Transcript
- 发生版本：早期版本
- 现象：侧边栏高度不自适应视频页面
- 根因：CSS 布局问题
- 修复：修复侧边栏高度自适应
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15

---

## P-2024-033 Chrome 扩展历史记录不显示

- 项目：AI-Sidebar / AI-Aplication
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：v0.0.1
- 现象：历史记录不显示
- 根因：Chrome Storage 权限未授予、隐私模式下不记录、清除浏览器数据后重置
- 修复：
  1. 检查 Chrome Storage 权限是否已授予
  2. 避免在隐私/无痕模式下使用
  3. 定期导出历史数据备份
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15
- 经验：Chrome 扩展需明确说明权限要求和数据持久性限制

---

## P-2024-034 Chrome 扩展提供商加载失败

- 项目：AI-Sidebar / AI-Aplication
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：v0.0.1
- 现象：AI 提供商无法加载
- 根因：浏览器缓存、扩展未正确加载、网络问题
- 修复：
  1. 清空浏览器缓存
  2. 在 Chrome 中重新加载扩展
  3. 确保网络连接正常
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15

---

## P-2024-035 Electron 桌面应用窗口无法显示

- 项目：RI-Flow / flow-learning
- 仓库：https://github.com/kexin94yyds/RI-Flow
- 发生版本：当前版本
- 现象：应用启动后窗口不显示
- 根因：应用缺少必要的系统权限（如辅助功能权限）
- 修复：
  1. 确保应用有必要的权限（系统偏好设置 → 安全性与隐私 → 辅助功能）
  2. 尝试重启应用
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15
- 经验：macOS 应用需要在文档中说明权限要求

---

## P-2024-036 Chrome 扩展数据本地存储安全说明

- 项目：AI-Sidebar / words-RL
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：v0.0.1
- 现象：用户担心数据安全
- 根因：需要明确说明数据存储位置
- 修复：FAQ 中明确说明：除生产力工具（Attention Tracker）需要 Supabase 同步外，所有数据存储在本地浏览器
- 回归检查：文档验证
- 状态：verified
- 日期：2024-12-15
- 经验：隐私敏感的应用需要在 FAQ 中明确数据存储策略

---

## P-2024-037 EPUB 切书工具脚本权限问题

- 项目：book-cutting-script-web
- 仓库：https://github.com/kexin94yyds/book-cutting-script-web
- 发生版本：当前版本
- 现象：首次运行可能失败
- 根因：切书神技.zsh 脚本缺少执行权限
- 修复：首次运行会自动设置权限；或手动 `chmod +x 切书神技.zsh`
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15
- 经验：脚本文件需要在文档中说明权限要求，或自动设置

---

## P-2024-038 寸止 MCP 工具配置问题

- 项目：iterate (寸止)
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：v1.0.0
- 现象：MCP 客户端无法连接寸止
- 根因：配置文件格式错误或路径不正确
- 修复：
  1. 在 MCP 客户端配置文件中添加正确配置：`{ "mcpServers": { "寸止": { "command": "寸止" } } }`
  2. 确保寸止命令在 PATH 中
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15
- 经验：MCP 工具需要提供清晰的配置示例

---

## P-2024-039 Slash-Command-Prompter 提示词上移跨模式问题

- 项目：Slash-Command-Prompter
- 仓库：https://github.com/kexin94yyds/Slash-Command-Prompter
- 发生版本：2.0 之前
- 现象：提示词上移操作影响了其他模式的提示词顺序
- 根因：上移逻辑未限制在当前模式内
- 修复：修复提示词上移仅在当前模式内有效
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15
- 经验：多模式系统中的操作需要明确限定作用域

---

## P-2024-040 Slash-Command-Prompter 斜杠菜单误触发

- 项目：Slash-Command-Prompter / Full-screen-prompt
- 仓库：https://github.com/kexin94yyds/Slash-Command-Prompter
- 发生版本：2.0 之前
- 现象：斜杠菜单在不应触发时被触发
- 根因：触发逻辑过于宽松
- 修复：优化斜杠菜单触发逻辑，避免误触发
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15
- 经验：输入触发类功能需要精确的触发条件

---

## P-2024-041 Chrome 扩展删除模式丢失所有数据

- 项目：words-RL (多模式单词记录器)
- 仓库：https://github.com/kexin94yyds/words-RL
- 发生版本：v2.1
- 现象：用户删除模式后，该模式下所有单词丢失
- 根因：删除模式时级联删除了所有关联数据
- 修复：文档中明确说明"删除模式会同时删除该模式下的所有单词"
- 回归检查：文档验证
- 状态：verified
- 日期：2024-12-15
- 经验：破坏性操作需要在 UI 和文档中明确提示

---

## P-2024-042 Node.js 应用部署到静态托管平台失败

- 项目：kexin-podcast (个人播客网站)
- 仓库：https://github.com/kexin94yyds/kexin-podcast
- 发生版本：当前版本
- 现象：应用部署到 Netlify 或 GitHub Pages 后无法运行
- 根因：Netlify 和 GitHub Pages 只支持静态网站，不能运行 Node.js 服务器
- 修复：部署到支持 Node.js 的平台（Render、Railway、Vercel、Heroku）
- 回归检查：文档验证
- 状态：verified
- 日期：2024-12-15
- 经验：选择部署平台前需确认技术栈兼容性；Node.js 应用需要后端托管服务

---

## P-2024-043 Web 应用震动功能在桌面端无效

- 项目：relax (呼吸练习 Web 应用)
- 仓库：https://github.com/kexin94yyds/relax
- 发生版本：当前版本
- 现象：震动提示在桌面浏览器上不工作
- 根因：震动 API (Vibration API) 主要在移动设备上有效，桌面设备通常不支持
- 修复：文档中说明"震动功能需要设备支持，主要在移动设备上有效"
- 回归检查：文档验证
- 状态：verified
- 日期：2024-12-15
- 经验：使用设备特定 API 时需要提供降级方案或文档说明

---

## P-2024-044 Web 应用音频提示需要用户授权

- 项目：relax (呼吸练习 Web 应用)
- 仓库：https://github.com/kexin94yyds/relax
- 发生版本：当前版本
- 现象：音频提示在首次使用时不播放
- 根因：浏览器自动播放策略要求用户交互后才能播放音频
- 修复：文档中说明"音频提示功能需要用户授权"
- 回归检查：文档验证
- 状态：verified
- 日期：2024-12-15
- 经验：涉及音频/视频自动播放的功能需要处理浏览器权限策略

---

## P-2024-045 macOS 终端通知权限未授予

- 项目：rest (静音倒计时器)
- 仓库：https://github.com/kexin94yyds/rest
- 发生版本：当前版本
- 现象：倒计时结束后通知不显示
- 根因：终端应用缺少系统通知权限
- 修复：系统偏好设置 → 通知与专注模式 → 确保终端有通知权限
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15
- 经验：依赖系统通知的脚本需要文档说明权限配置

---

## P-2024-046 macOS 语音功能未启用

- 项目：rest (静音倒计时器)
- 仓库：https://github.com/kexin94yyds/rest
- 发生版本：当前版本
- 现象：语音提示不工作
- 根因：系统语音功能未启用
- 修复：系统偏好设置 → 辅助功能 → 语音 → 确保语音功能已启用
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15

---

## P-2024-047 Shell 配置未重新加载

- 项目：rest (静音倒计时器)
- 仓库：https://github.com/kexin94yyds/rest
- 发生版本：当前版本
- 现象：安装后 "开始" 命令不可用
- 根因：添加到 ~/.zshrc 后未重新加载配置
- 修复：运行 `source ~/.zshrc` 或重启终端
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15
- 经验：修改 shell 配置后需提示用户重载或重启终端

---

## P-2024-048 12306 抢票脚本 ChromeDriver 版本问题

- 项目：High-speed-rail-ticket-grabbing
- 仓库：https://github.com/kexin94yyds/High-speed-rail-ticket-grabbing
- 发生版本：v1.0
- 现象：ChromeDriver 版本不匹配导致脚本无法运行
- 根因：Chrome 浏览器版本与 ChromeDriver 版本不一致
- 修复：脚本使用 webdriver-manager 自动管理 ChromeDriver，无需手动下载
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15
- 经验：Selenium 项目推荐使用 webdriver-manager 自动管理驱动版本

---

## P-2024-049 12306 抢票脚本登录后页面卡住

- 项目：High-speed-rail-ticket-grabbing
- 仓库：https://github.com/kexin94yyds/High-speed-rail-ticket-grabbing
- 发生版本：v1.0
- 现象：登录后页面卡住不动
- 根因：网络问题或 12306 系统繁忙
- 修复：检查网络连接或稍后重试
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15

---

## P-2024-050 RI index.html 文件被意外清空

- 项目：RI (Replace-Information)
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：开发阶段
- 现象：打开应用发现主窗口无法显示，检查 index.html 发现文件只剩一行空白
- 根因：文件被意外清空或覆盖（可能是编辑器误操作）；打包好的应用仍能运行是因为使用的是打包时的完整文件副本
- 修复：从 git 历史恢复文件 `git show HEAD:index.html > index.html`
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-15
- 经验：关键文件应有版本控制；定期提交代码可快速恢复

---

## P-2024-051 AI-Sidebar NotebookLM 标题捕获失败

- 项目：AI-Sidebar
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：早期版本
- 现象：收藏 NotebookLM 页面时，扩展未能捕获实时项目标题，而是显示 "NotebookLM" 或 "Untitled"
- 根因：NotebookLM 使用 Angular 动态渲染组件，项目标题存储在特定的 Angular Material 组件结构中（`.title-label-inner`），原实现只检查标准 h1/h2 和 OpenGraph meta 标签
- 修复：
  1. 增强 `resolveNotebookLMTitle()` 函数，使用多优先级选择器策略
  2. 使用 `deepFind()` BFS 遍历 Angular 组件结构
  3. 添加 MutationObserver 监听标题变化
  4. 实现重试机制（500ms + 2000ms）应对 Angular 异步渲染
- 回归检查：手动验证标题捕获
- 状态：verified
- 日期：2024-12-15
- 经验：SPA 框架（Angular/React/Vue）集成需使用深度 DOM 遍历 + 重试机制 + MutationObserver

---

## P-2024-006 Acemcp 无法获取 Augment API 凭证

- 项目：acemcp
- 仓库：https://github.com/qy527145/acemcp.git
- 发生版本：2024-12-15
- 现象：尝试通过 `auggie login` 获取 Augment API 凭证时，hCaptcha 验证失败，控制台显示 401/403 错误
- 根因：Augment 认证服务的 hCaptcha 验证在当前网络环境下无法通过（可能需要科学上网或服务本身有问题）
- 修复：暂无，需要解决网络问题或等待 Augment 服务修复
- 回归检查：待创建
- 状态：open
- 日期：2024-12-15
- 备注：acemcp 是基于 Augment Context Engine 的语义代码搜索 MCP 工具，必须连接 Augment 云服务才能使用。暂时用 grep_search 和 code_search 替代。

## P-2024-002 WindowSwitcher 上下箭头切换时窗口未置顶

- 项目：iterate (cunzhi)
- 仓库：/Users/apple/cunzhi
- 发生版本：2024-12-14 之前版本
- 现象：多窗口并列时，按 Tab 打开窗口选择器，使用上下箭头切换选中行，第一行窗口会置顶，但第二、第三行选中时对应窗口不会置顶
- 根因：`WindowSwitcher.vue` 中 `selectedIndex` 变化时未调用 `activate_window_instance` 置顶窗口
- 修复：新增 `activateWindowAtIndex()` 函数，在上下箭头切换时实时调用置顶
- 回归检查：R-2024-002
- 状态：verified
- 日期：2024-12-14

## P-2024-004 窗口切换器点击第二行无法激活对应窗口

- 项目：cunzhi
- 仓库：/Users/apple/cunzhi
- 发生版本：2024-12-14
- 现象：按 Tab 打开窗口切换器，点击第二行或其他行时，总是激活第一行的窗口
- 根因：macOS 多个同名应用进程时，AppleScript 激活行为不确定
- 修复：待定
- 回归检查：待创建
- 状态：open
- 日期：2024-12-14

## P-2024-003 GUI 标题栏只显示项目名称，无法显示完整路径

- 项目：cunzhi
- 仓库：/Users/apple/cunzhi
- 发生版本：2024-12-14
- 现象：GUI 标题栏显示 `iterate / cunzhi`（只有项目名称），用户无法区分同名但不同路径的项目
- 根因：`PopupHeader.vue` 中 `displayProjectName` 只取路径最后一部分，窗口标题是静态的
- 修复：修改 `PopupHeader.vue` 使用完整路径，在 `useMcpHandler.ts` 动态设置窗口标题
- 回归检查：R-2024-003
- 状态：verified
- 日期：2024-12-14

## P-2024-005 Supabase RLS 策略只对 service_role 生效导致 API 查询失败

- 项目：ContentDash
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：2024-12-14
- 现象：密钥激活时返回"密钥不存在"错误（400 Bad Request），但数据库中密钥确实存在
- 根因：Supabase RLS 策略只配置了 `service_role` 角色权限，而 Netlify Functions 使用的是 `anon` key（匿名密钥），导致匿名用户无法查询数据
- 修复：在 Supabase 中添加 `anon` 角色的 SELECT 和 UPDATE 策略：
  ```sql
  CREATE POLICY "Allow anon read" ON contentdash_licenses
      FOR SELECT TO anon USING (true);
  CREATE POLICY "Allow anon update" ON contentdash_licenses
      FOR UPDATE TO anon USING (true) WITH CHECK (true);
  ```
- 回归检查：手动验证激活功能正常
- 状态：verified
- 日期：2024-12-14

## P-2024-052 Shift+Tab 恢复窗口时最后操作的窗口应置顶

- 项目：iterate (cunzhi)
- 仓库：/Users/apple/cunzhi
- 发生版本：2024-12-15
- 现象：按 Shift+Tab 恢复所有最小化窗口后，所有窗口平等恢复，没有将最后一个按 Tab 最小化的窗口置于最上层
- 期望行为：
  1. 在窗口 A 按 Tab 最小化后，按 Shift+Tab 恢复时，窗口 A 应在最上层
  2. 如果期间在窗口 B 也按了 Tab 最小化，则最后按 Tab 的窗口（B）应在最上层
  3. 所有最小化的窗口都恢复，但最后操作的窗口获得焦点
- 根因：全局快捷键 Shift+Tab 目前只调用 `unminimize()` 恢复当前窗口，没有记录最后最小化的窗口信息
- 修复：待实现 - 需要添加窗口最小化历史栈，记录最后最小化的窗口，恢复时按栈顺序置顶
- 回归检查：待创建
- 状态：open
- 日期：2024-12-15

---

## P-2024-001 全局知识库流程验证

- 项目：windsurf-project
- 仓库：本地测试
- 发生版本：N/A
- 现象：验证全局知识库写入、提交、推送流程是否正常
- 根因：流程验证用途
- 修复：N/A
- 回归检查：R-2024-001
- 状态：verified
- 日期：2024-12-14

---

## P-2024-053 iterate 中文输入候选栏移位

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：PR #55
- 现象：移动窗口时中文输入法候选栏位置偏移
- 根因：Tauri 窗口移动事件未同步更新输入法候选栏位置
- 修复：监听窗口移动事件，重新定位候选栏
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：跨平台桌面应用需要特别处理输入法集成问题

---

## P-2024-054 iterate 首次启动缺少 config.json 导致主题异常

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：PR #51
- 现象：首次启动应用时页面主题显示异常
- 根因：config.json 不存在时，主题配置读取失败，未正确使用默认值
- 修复：添加配置文件不存在时的默认值处理逻辑
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：配置文件读取必须有完整的默认值兜底

---

## P-2024-055 iterate 多开时配置不同步

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：PR #48
- 现象：同时打开多个应用实例时，配置修改不同步
- 根因：各实例独立读写配置文件，无进程间通信
- 修复：采用单实例模式 + 监听窗口焦点变化时重新加载配置
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：桌面应用配置同步需考虑多实例场景

---

## P-2024-056 iterate GitHub Actions 构建白屏

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：早期 CI 版本
- 现象：通过 GitHub Actions 构建的 CLI 工具启动后白屏
- 根因：前端资源未正确嵌入到二进制文件中
- 修复：使用 tauri-action 替代手动构建，确保前端资源正确嵌入
- 回归检查：CI 验证
- 状态：verified
- 日期：2024-12-16
- 经验：Tauri 应用 CI 构建需使用官方 tauri-action

---

## P-2024-057 iterate pnpm 版本冲突

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：GitHub Actions
- 现象：CI 构建时 pnpm 版本与 package.json 指定版本不一致导致失败
- 根因：GitHub Actions 中手动指定的 pnpm 版本与项目配置冲突
- 修复：移除 GitHub Actions 中的 pnpm 版本指定，让 pnpm/action-setup 自动从 package.json 读取
- 回归检查：CI 验证
- 状态：verified
- 日期：2024-12-16
- 经验：CI 中依赖版本应与项目配置保持一致

---

## P-2024-058 信息过滤器 EPUB 封面提取失败

- 项目：信息过滤器
- 仓库：/Users/apple/信息过滤器
- 发生版本：当前版本
- 现象：部分 EPUB 书籍封面无法正确提取显示
- 根因：不同 EPUB 格式封面存储位置不同，只实现了一种提取方式
- 修复：添加完整的 3 种封面提取方法（meta cover-image、manifest、文件名匹配）
- 回归检查：手动验证多种 EPUB 格式
- 状态：verified
- 日期：2024-12-16
- 经验：EPUB 格式多样，封面提取需要多种策略兜底

---

## P-2024-059 信息过滤器 localStorage 超限

- 项目：信息过滤器
- 仓库：/Users/apple/信息过滤器
- 发生版本：当前版本
- 现象：保存大量书籍封面后，localStorage 超出限制导致数据丢失
- 根因：封面图片 base64 编码后体积过大，localStorage 只有 5MB 限制
- 修复：压缩封面图片（限制尺寸 + 质量压缩）防止超限
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：localStorage 存储图片需要压缩处理

---

## P-2024-060 tobooks Cmd+Enter 保存笔记无效

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：在笔记编辑框中按 Cmd+Enter 无法保存笔记
- 根因：keydown 事件监听在 iframe 内无法捕获
- 修复：改用 window capture 模式监听快捷键
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：iframe 内的快捷键需要特殊处理

---

## P-2024-061 tobooks 高亮功能导致内容消失

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：对文本添加高亮后，部分内容消失
- 根因：DOM 操作时 Range 对象处理不当，误删了相邻文本节点
- 修复：优化高亮 DOM 操作逻辑，正确处理文本节点分割
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：DOM Range 操作需要仔细处理边界情况

---

## P-2024-062 zhuyili 微信支付功能异常

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：购买按钮点击后无反应，试用次数逻辑异常
- 根因：购买按钮点击事件未正确绑定，试用次数判断逻辑有 bug
- 修复：修复事件绑定和试用次数逻辑
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：支付功能需要完整的事件绑定和状态管理

---

## P-2024-063 zhuyili 二维码不显示

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：微信支付二维码无法显示
- 根因：二维码生成库加载或配置问题
- 修复：修复二维码生成逻辑
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-064 zhuyili OAuth 回调 URL 跳回本地

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：Google 登录后回调到 localhost 导致 Cannot GET /
- 根因：OAuth 重定向 URL 动态生成时在生产环境仍使用了本地地址
- 修复：生产环境 OAuth 回调固定到 Netlify 正式域名
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：OAuth 回调 URL 需要区分开发/生产环境

---

## P-2024-065 视频侧边栏与视频未实时联动

- 项目：视频侧边栏
- 仓库：/Users/apple/视频侧边栏
- 发生版本：当前版本
- 现象：调整视频大小后，侧边栏未同步调整位置
- 根因：缺少 ResizeObserver 监听视频容器大小变化
- 修复：添加实时联动逻辑，监听视频和窗口大小变化
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：视频播放器扩展需要多种方式监听布局变化

---

## P-2024-066 视频侧边栏切换视频后字幕加载失败

- 项目：视频侧边栏
- 仓库：/Users/apple/视频侧边栏
- 发生版本：当前版本
- 现象：在 YouTube 切换视频后，第一次加载字幕失败
- 根因：视频切换时字幕 API 请求时机不对，新视频 ID 尚未生效
- 修复：添加视频切换检测和延迟加载机制
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：YouTube 视频切换需要监听 URL 变化和播放器状态

---

## P-2024-067 久坐通知 Service Worker 缓存问题

- 项目：久坐通知
- 仓库：/Users/apple/久坐通知
- 发生版本：当前版本
- 现象：更新应用后用户仍使用旧版本
- 根因：Service Worker 使用缓存优先策略，不获取最新版本
- 修复：改为网络优先策略，确保获取最新版本
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：PWA 缓存策略需要根据应用更新频率选择

---

## P-2024-068 久坐通知 iPhone 通知权限问题

- 项目：久坐通知
- 仓库：/Users/apple/久坐通知
- 发生版本：当前版本
- 现象：在 iPhone 上无法发送通知提醒
- 根因：iOS Safari 对 Web 通知有特殊限制，需要 PWA 安装后才能发送通知
- 修复：添加 PWA 支持，引导用户添加到主屏幕
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：iOS Web 通知必须通过 PWA 实现

---

## P-2024-069 网页看书目录按钮嵌套显示

- 项目：网页看书
- 仓库：/Users/apple/网页看书
- 发生版本：当前版本
- 现象：第二次点击目录按钮时，目录不是隐藏而是嵌套显示
- 根因：点击事件处理逻辑只判断了显示，未正确处理隐藏
- 修复：修复目录按钮逻辑，添加显示/隐藏切换判断
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-070 网页看书 Edge 浏览器兼容性问题

- 项目：网页看书
- 仓库：/Users/apple/网页看书
- 发生版本：当前版本
- 现象：在 Edge 浏览器上滚动和显示异常
- 根因：CSS 滚动属性在 Edge 上有兼容性问题
- 修复：添加 Edge 浏览器兼容性 CSS 前缀
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：Web 应用需要测试多浏览器兼容性

---

## P-2024-071 注意力追踪器计时器占位符闪烁

- 项目：注意力追踪器
- 仓库：/Users/apple/注意力追踪器最终版
- 发生版本：当前版本
- 现象：计时器继续/暂停时数字占位符闪烁
- 根因：状态切换时 DOM 更新导致重绘闪烁
- 修复：优化状态切换逻辑，避免不必要的 DOM 更新
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-072 播客 Cloudinary 存储配置问题

- 项目：播客
- 仓库：/Users/apple/播客
- 发生版本：当前版本
- 现象：上传播客文件后无法正确获取 URL
- 根因：Cloudinary file_url 获取逻辑不统一，部分代码使用本地 /uploads 回退
- 修复：统一使用 Cloudinary file_url，移除本地回退逻辑
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：云存储集成需要全局统一使用云端 URL

---

## P-2024-073 背单词网页 YouTube 字幕获取失败

- 项目：背单词的网页
- 仓库：/Users/apple/背单词的网页
- 发生版本：当前版本
- 现象：无法获取 YouTube 视频字幕
- 根因：youtube-transcript 库被 YouTube 限制
- 修复：改用 YouTube timedtext API 直接获取 WebVTT 格式字幕
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：第三方库被限制时需要直接调用官方 API

---

## P-2024-074 时间追踪器 Enter 键跳转问题

- 项目：时间追踪器
- 仓库：/Users/apple/时间追踪器
- 发生版本：当前版本
- 现象：按 Enter 键无法正确跳转到计时页面
- 根因：事件处理逻辑过于复杂，多个跳转条件冲突
- 修复：简化逻辑，直接跳转到计时页面
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-075 Slash-Command-Prompter 模式切换后斜杠命令菜单不同步

- 项目：Slash-Command-Prompter
- 仓库：/Users/apple/prompt/Slash-Command-Prompter
- 发生版本：2.0 之前
- 现象：切换模式后，斜杠命令菜单仍显示第一个模式的提示词，而非当前选中模式
- 根因：模式切换事件未正确触发菜单数据源更新
- 修复：确保 / 命令显示当前选中模式的提示词
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：状态切换需要同步更新所有相关 UI 组件

---

## P-2024-076 Slash-Command-Prompter 提示词上移仅在当前模式内有效

- 项目：Slash-Command-Prompter
- 仓库：/Users/apple/prompt/Slash-Command-Prompter
- 发生版本：2.0 之前
- 现象：将提示词上移时，只能在当前模式内移动，无法跨模式调整
- 根因：排序逻辑限制在当前模式数组内
- 修复：优化斜杠菜单触发逻辑，v2.0 版本发布
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-077 微信公众号爬虫搜索失效

- 项目：wechat-spider
- 仓库：/Users/apple/微信公众号/wechat-spider
- 发生版本：当前版本
- 现象：搜索公众号功能失效
- 根因：微信改版导致接口变化
- 修复：适配微信新版接口
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：依赖第三方平台的爬虫需要定期维护适配

---

## P-2024-078 沉浸式写作页面跳动

- 项目：zen-flow (沉浸式写作)
- 仓库：/Users/apple/沉浸式写作/zen-flow
- 发生版本：当前版本
- 现象：输入文字时页面发生跳动
- 根因：调整 textarea 高度时未保持滚动位置
- 修复：在调整 textarea 高度时保持滚动位置
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：自适应高度的文本框需要处理滚动位置

---

## P-2024-079 git-worktree-manager 路径解析错误

- 项目：git-worktree-manager
- 仓库：/Users/apple/git-worktree-manage/git-worktree-manager
- 发生版本：当前版本
- 现象：在某些目录下执行命令时 git 路径解析错误
- 根因：execBase 函数中 git 路径解析逻辑不完善
- 修复：改进 git 路径解析，使用正确的 mainFolder
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-080 震动 App 数字输入双重输入

- 项目：curlsapp (震动)
- 仓库：/Users/apple/震动/curlsapp
- 发生版本：当前版本
- 现象：数字输入框出现双重输入问题
- 根因：自定义数字输入组件与原生输入冲突
- 修复：替换为标准数字输入，实现输入框之间无缝切换
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-081 ClipBook 退出时历史记录未清除

- 项目：ClipBook
- 仓库：/Users/apple/Downloads/ClipBook
- 发生版本：当前版本
- 现象：退出应用时历史记录未正确清除
- 根因：退出事件处理中清除逻辑有 bug
- 修复：修复退出时历史记录清除逻辑
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-082 看书神器下载文件名编码问题

- 项目：tobooks (看书神器)
- 仓库：/Users/apple/看书神器/tobooks
- 发生版本：当前版本
- 现象：下载文件时文件名编码错误，中文乱码
- 根因：HTTP header 中 filename 编码处理不当
- 修复：修复下载 header filename 编码
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：HTTP 下载文件名需要正确处理 UTF-8 编码

---

## P-2024-083 acemcp Google Antigravity MCP invalid trailing data 错误

- 项目：acemcp
- 仓库：/Users/apple/ace/acemcp
- 发生版本：v0.2.0 之前
- 现象：调用 Google Antigravity MCP 时出现 "invalid trailing data" 错误
- 根因：stdio 流未强制使用 UTF-8 编码，导致数据解析错误
- 修复：强制 stdio 流使用 UTF-8 编码
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：MCP 服务器需要确保 stdio 编码一致性

---

## P-2024-084 RI 笔记功能多个关键问题

- 项目：RI (信息置换器)
- 仓库：/Users/apple/信息过滤器和信息置换器叠加/RI
- 发生版本：当前版本
- 现象：笔记功能存在多个问题：列表项编辑后未正确保存、导出后主页未刷新
- 根因：
  1. 编辑使用了错误的保存方法
  2. 导出按钮保存后未触发主页刷新
- 修复：
  1. 列表项编辑后使用 updateWord 正确保存
  2. 笔记导出按钮保存后主页自动刷新
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-085 Strong-Iterate 微信验证文件部署失败

- 项目：Strong-Iterate
- 仓库：/Users/apple/产品更新/Strong-Itreate
- 发生版本：当前版本
- 现象：微信验证文件无法在网站根目录访问
- 根因：验证文件未放在 public 文件夹，部署后路径不正确
- 修复：将文件移动到 public 文件夹确保正确部署到根目录
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：静态文件需要放在正确的 public 目录才能被访问

---

## P-2024-086 笔记升级工具按钮大小不一致

- 项目：Note-taking-tool (笔记升级)
- 仓库：/Users/apple/笔记升级/Note-taking-tool
- 发生版本：当前版本
- 现象：清理缓存按钮与其他按钮大小不一致
- 根因：CSS 样式未统一
- 修复：添加黄色清理缓存按钮并修复按钮大小一致性
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-087 codex-watcher 侧边栏重渲染后高亮丢失

- 项目：codex-watcher
- 仓库：/Users/apple/codexwatcher/codex-watcher
- 发生版本：当前版本
- 现象：侧边栏重新渲染后，活动会话高亮状态丢失
- 根因：重渲染时未保存和恢复高亮状态
- 修复：持久化并重新应用活动会话高亮，恢复每个来源的最后打开状态
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-088 codex-watcher DOMPurify 下展开/折叠失效

- 项目：codex-watcher
- 仓库：/Users/apple/codexwatcher/codex-watcher
- 发生版本：当前版本
- 现象：使用 DOMPurify 后展开/折叠按钮点击无效
- 根因：DOMPurify 清理了 inline onclick 事件处理器
- 修复：使用事件委托替代 inline onclick，改用 data-* 属性
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：使用 DOMPurify 时需要用事件委托替代内联事件

---

## P-2024-089 kexin-podcast Render 部署 SQLite3 构建失败

- 项目：kexin-podcast
- 仓库：/Users/apple/kexin-podacast/My-podcast
- 发生版本：当前版本
- 现象：部署到 Render 时 SQLite3 构建失败
- 根因：Render 环境缺少 SQLite3 原生编译依赖
- 修复：添加必要的构建依赖或改用纯 JS 实现
- 回归检查：部署验证
- 状态：verified
- 日期：2024-12-16
- 经验：云平台部署原生模块需要检查构建环境

---

## P-2024-090 Full-screen-prompt 删除功能异常

- 项目：Full-screen-prompt
- 仓库：/Users/apple/提示词最新的/Full-screen-prompt
- 发生版本：当前版本
- 现象：删除提示词时功能异常
- 根因：删除确认对话框逻辑有问题
- 修复：修复删除功能，添加自定义确认对话框
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-091 Full-screen-prompt 图标格式错误

- 项目：Full-screen-prompt
- 仓库：/Users/apple/提示词最新的/Full-screen-prompt
- 发生版本：当前版本
- 现象：应用图标显示异常
- 根因：图标格式不正确
- 修复：修复图标格式，同时添加窗口边缘拖拽功能
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-092 twscrape 部署问题

- 项目：twscrape (Twitter 爬虫)
- 仓库：/Users/apple/twiter/twscrape
- 发生版本：当前版本
- 现象：部署后爬虫无法正常运行
- 根因：部署配置问题
- 修复：修复部署问题并优化实时爬取
- 回归检查：部署验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-093 hack-airdrop Railway/Vercel 部署配置问题

- 项目：hack-airdrop
- 仓库：/Users/apple/twiter/hack-airdrop
- 发生版本：当前版本
- 现象：部署到 Railway 和 Vercel 失败
- 根因：端口配置和部署配置不正确
- 修复：修复 Railway 端口配置和 Vercel 部署配置
- 回归检查：部署验证
- 状态：verified
- 日期：2024-12-16
- 经验：不同云平台的部署配置需要分别适配

---

## P-2024-094 Attention-Span 计时器暂停时间计算错误

- 项目：Attention-Span (注意力追踪器)
- 仓库：/Users/apple/注意力追踪器最终版/Attention-Span
- 发生版本：当前版本
- 现象：暂停计时器后恢复时，时间计算不正确
- 根因：暂停时间未正确从总时间中扣除
- 修复：修复计时器暂停时间计算 bug
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-095 Attention-Span 重复记录问题

- 项目：Attention-Span (注意力追踪器)
- 仓库：/Users/apple/注意力追踪器最终版/Attention-Span
- 发生版本：当前版本
- 现象：同一个计时记录被重复保存
- 根因：保存逻辑触发多次
- 修复：添加重复记录检测和防抖
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-096 DDK 跑步愿望图片路径错误

- 项目：DDK
- 仓库：/Users/apple/DDK
- 发生版本：当前版本
- 现象：跑步愿望图片无法显示
- 根因：图片引用路径不正确
- 修复：更新图片引用路径
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-097 DDK 文字重叠问题

- 项目：DDK
- 仓库：/Users/apple/DDK
- 发生版本：当前版本
- 现象：页面文字出现重叠
- 根因：CSS 布局问题
- 修复：修复文字重叠问题，优化图片命名
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-098 编程网站中文引号语法错误

- 项目：编程网站
- 仓库：/Users/apple/编程网站
- 发生版本：当前版本
- 现象：代码中使用了中文引号导致语法错误
- 根因：输入法切换时误输入中文引号
- 修复：将中文引号替换为英文引号
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：代码编辑时注意输入法状态，避免中文标点

---

## P-2024-099 aliyun-deploy Supabase URL 配置错误

- 项目：aliyun-deploy (nativePaySDK)
- 仓库：/Users/apple/Downloads/nativePaySDK/aliyun-deploy
- 发生版本：当前版本
- 现象：部署到阿里云后 Supabase 连接失败
- 根因：Supabase URL 配置不正确
- 修复：修正 Supabase URL 配置
- 回归检查：部署验证
- 状态：verified
- 日期：2024-12-16
- 经验：云部署时需要检查所有环境变量配置

---

## P-2024-100 RI 多桌面/全屏 Space 窗口跳动

- 项目：RI (Replace-Information)
- 仓库：/Users/apple/信息置换起/RI
- 发生版本：当前版本
- 现象：在 macOS 多桌面或全屏 Space 环境下，窗口出现跳动
- 根因：窗口位置计算未考虑多 Space 环境
- 修复：修复多桌面/全屏 Space 窗口跳动问题，添加清理启动脚本解决开机后窗口跳动
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：macOS 桌面应用需要处理多 Space 环境

---

## P-2024-101 Note-taking-tool 标题被 CSS 污染

- 项目：Note-taking-tool (笔记升级)
- 仓库：/Users/apple/笔记升级/Note-taking-tool
- 发生版本：当前版本
- 现象：提取的标题包含 CSS 样式文本
- 根因：提取标题时未跳过 style/script 标签，未过滤疑似 CSS 文本
- 修复：提取标题时跳过 style/script 且过滤疑似 CSS 文本；粘贴清理时移除非内容标签
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：DOM 文本提取需要过滤样式和脚本内容

---

## P-2024-102 Note-taking-tool 沉浸式翻译插件按钮重叠

- 项目：Note-taking-tool (笔记升级)
- 仓库：/Users/apple/笔记升级/Note-taking-tool
- 发生版本：当前版本
- 现象：安装沉浸式翻译浏览器插件后，按钮出现重叠
- 根因：插件注入的 DOM 元素与应用按钮冲突
- 修复：修复沉浸式翻译插件导致的按钮重叠问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：Web 应用需要考虑浏览器插件的 DOM 注入影响

---

## P-2024-103 wechat-spider 保存图片到 OSS 问题

- 项目：wechat-spider
- 仓库：/Users/apple/微信公众号/wechat-spider
- 发生版本：当前版本
- 现象：图片无法正确保存到 OSS
- 根因：OSS 上传配置或控制逻辑有问题
- 修复：修复控制保存图片到 OSS 的逻辑
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-104 Strong-Iterate navBackButton 未定义

- 项目：Strong-Iterate
- 仓库：/Users/apple/产品更新/Strong-Itreate
- 发生版本：当前版本
- 现象：点击关闭按钮时报错 navBackButton 未定义
- 根因：事件监听器中引用了未定义的变量
- 修复：修复关闭按钮事件监听器中 navBackButton 变量未定义的问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：事件处理器中引用的变量需要确保已定义

---

## P-2024-105 Strong-Iterate Web/Crawler 视图退出逻辑

- 项目：Strong-Iterate
- 仓库：/Users/apple/产品更新/Strong-Itreate
- 发生版本：当前版本
- 现象：关闭按钮无法正确隐藏 Web 和 Crawler 视图
- 根因：关闭按钮事件处理未包含这些视图的隐藏逻辑
- 修复：添加关闭按钮对 web-projects-view 和 crawlers-view 的隐藏处理
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-106 kotadb MCP tool schema localPath 参数问题

- 项目：kotadb
- 仓库：/Users/apple/agent/kotadb
- 发生版本：PR #412, #501
- 现象：MCP 工具调用时出现参数错误
- 根因：MCP tool schema 中包含了不应该存在的 localPath 参数
- 修复：从 MCP tool schema 中移除 localPath 参数
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：MCP 工具定义需要精确匹配实际参数

---

## P-2024-107 Strong-Iterate HTML 语法错误

- 项目：Strong-Iterate
- 仓库：/Users/apple/测试马上删除/Strong-Itreate
- 发生版本：当前版本
- 现象：页面渲染异常
- 根因：HTML 语法错误
- 修复：修复 HTML 语法错误，完善章节内容
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-108 tobooks text-to-epub 页面高度问题

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：text-to-epub.html 页面高度显示不正确
- 根因：CSS 高度设置问题
- 修复：修复页面高度问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-109 播客 fs 变量重复声明

- 项目：My-podcast (播客)
- 仓库：/Users/apple/播/My-podcast
- 发生版本：当前版本
- 现象：启动时报错变量重复声明
- 根因：fs 模块被重复 require/import
- 修复：修复 fs 变量重复声明错误
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：避免在同一文件中重复声明变量

---

## P-2024-110 kexin-podcast DELETE API 参数类型问题

- 项目：kexin-podcast
- 仓库：/Users/apple/podcast/kexin-podcast
- 发生版本：当前版本
- 现象：DELETE /api/podcasts/:id 返回 404
- 根因：API 不接受数字类型 ID，且非幂等
- 修复：修复 DELETE API 接受数字 ID，实现幂等性避免 404
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：REST API 应该设计为幂等的

---

## P-2024-111 ClipBook 删除时 bug

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：早期版本
- 现象：删除剪贴板项目时出现错误
- 根因：删除逻辑有 bug
- 修复：修复删除时的 bug
- 回归检查：手动验证
- 状态：verified
- 日期：2024-05-01
- 来源：git log (早期历史)

---

## P-2024-112 ClipBook 初始状态 bug

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：早期版本
- 现象：应用启动时初始状态异常
- 根因：初始化逻辑有 bug
- 修复：修复初始状态 bug，同时使骨架可拖拽
- 回归检查：手动验证
- 状态：verified
- 日期：2024-05-01
- 来源：git log (早期历史)

---

## P-2024-113 ClipBook HTML 和代码被忽略

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：早期版本
- 现象：复制 HTML 和代码时内容被忽略
- 根因：剪贴板类型判断逻辑有误
- 修复：修复 HTML 和代码被忽略的问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-05-01
- 来源：git log (早期历史)

---

## P-2024-114 twscrape OTP 验证码问题

- 项目：twscrape (Twitter 爬虫)
- 仓库：/Users/apple/twiter/twscrape
- 发生版本：早期版本
- 现象：OTP 验证码处理异常
- 根因：OTP 代码解析或提交逻辑有问题
- 修复：修复 OTP 代码处理
- 回归检查：手动验证
- 状态：verified
- 日期：2024-05-01
- 来源：git log (早期历史)

---

## P-2024-115 twscrape 登录时无 ct0 cookie

- 项目：twscrape (Twitter 爬虫)
- 仓库：/Users/apple/twiter/twscrape
- 发生版本：Issue #143
- 现象：登录时找不到 ct0 cookie 导致失败
- 根因：Twitter 接口变化，ct0 获取时机变化
- 修复：修复登录时无 ct0 找到的情况
- 回归检查：手动验证
- 状态：verified
- 日期：2024-05-01
- 来源：git log (早期历史)

---

## P-2024-116 twscrape 登录无限循环

- 项目：twscrape (Twitter 爬虫)
- 仓库：/Users/apple/twiter/twscrape
- 发生版本：Issue #132, #165
- 现象：使用不存在的账户登录时进入无限循环
- 根因：登录失败处理未考虑账户不存在的情况
- 修复：修复不存在账户登录时的无限循环
- 回归检查：手动验证
- 状态：verified
- 日期：2024-05-01
- 来源：git log (早期历史)
- 经验：登录逻辑需要处理各种失败场景

---

## P-2024-117 git-worktree-manager 翻译问题

- 项目：git-worktree-manager
- 仓库：/Users/apple/git-worktree-manage/git-worktree-manager
- 发生版本：早期版本
- 现象：界面翻译显示不正确
- 根因：i18n 配置或翻译文件问题
- 修复：修复翻译问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-05-01
- 来源：git log (早期历史)

---

## P-2024-118 git-worktree-manager worktree 事件监听

- 项目：git-worktree-manager
- 仓库：/Users/apple/git-worktree-manage/git-worktree-manager
- 发生版本：早期版本
- 现象：worktree 变化时界面未更新
- 根因：worktree 事件监听未正确设置
- 修复：修复监听 worktree 事件
- 回归检查：手动验证
- 状态：verified
- 日期：2024-05-01
- 来源：git log (早期历史)

---

## P-2024-119 git-worktree-manager 移动 worktree 问题

- 项目：git-worktree-manager
- 仓库：/Users/apple/git-worktree-manage/git-worktree-manager
- 发生版本：早期版本
- 现象：移动 worktree 时出错
- 根因：移动逻辑有 bug
- 修复：修复移动 worktree 功能
- 回归检查：手动验证
- 状态：verified
- 日期：2024-05-01
- 来源：git log (早期历史)

---

## P-2024-120 RI 开发版本无法访问原有数据

- 项目：RI (Replace-Information)
- 仓库：/Users/apple/信息置换起/RI
- 发生版本：当前版本
- 现象：开发版本无法访问原有数据库数据
- 根因：数据目录配置被修改，未使用默认数据目录
- 修复：恢复使用默认数据目录，确保开发版本可访问原有数据
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-121 RI 文字颜色显示问题

- 项目：RI (Replace-Information)
- 仓库：/Users/apple/信息置换起/RI
- 发生版本：当前版本
- 现象：文字颜色显示不正确
- 根因：CSS 样式问题
- 修复：修复文字颜色显示问题，同时添加切换模式自动保存功能
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-122 RI 主窗口和笔记窗口在全屏应用前来回跳动

- 项目：RI (Replace-Information)
- 仓库：/Users/apple/信息置换起/RI
- 发生版本：当前版本
- 现象：当有全屏应用时，主窗口和笔记窗口来回跳动
- 根因：窗口位置计算受全屏应用影响
- 修复：修复窗口在全屏应用前来回跳动的问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：macOS 窗口管理需要考虑全屏应用的影响

---

## P-2024-123 ClipBook 本地化 Help 菜单 bug

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：Help tray menu 本地化显示错误
- 根因：本地化配置 bug
- 修复：修复 Help tray menu 的本地化 bug
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-124 zhuyili 主页完成按钮需点两次

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：主页完成按钮需要点击两次才能生效
- 根因：handleButtonAction 不是 async 函数，完成操作未正确 await
- 修复：将主页 handleButtonAction 改为 async，完成操作改为 await completeActivityAndReset()
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：涉及异步操作的事件处理器需要正确使用 async/await

---

## P-2024-125 zhuyili 活动记录云端同步失败

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：活动记录无法同步到云端
- 根因：云端同步逻辑有问题
- 修复：修复活动记录云端同步失败问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-126 wechat-spider avatar 和 abstract 设置问题

- 项目：wechat-spider
- 仓库：/Users/apple/微信公众号/wechat-spider
- 发生版本：当前版本
- 现象：头像和摘要显示异常
- 根因：数据初始化时未正确处理空值
- 修复：avatar 和 abstract 先设置为空，后期修正
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-127 Strong-Iterate App 视图退出逻辑

- 项目：Strong-Iterate
- 仓库：/Users/apple/新网站测试/Strong-Itreate
- 发生版本：当前版本
- 现象：关闭按钮无法正确隐藏 App 视图
- 根因：关闭按钮事件处理未包含 apps-view 的隐藏逻辑
- 修复：添加关闭按钮对 apps-view 的隐藏处理
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-128 ClipBook 快捷键注册失败导致崩溃

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：早期版本
- 现象：尝试注销未成功注册的快捷键时应用崩溃
- 根因：快捷键注册失败后未重置为空，后续注销操作导致崩溃
- 修复：注册失败时将快捷键重置为空，避免后续注销崩溃
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：资源注册失败时需要正确清理状态

---

## P-2024-129 ClipBook 显示/隐藏详情时崩溃

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：早期版本
- 现象：点击显示/隐藏详情按钮时应用崩溃
- 根因：UI 状态切换逻辑有 bug
- 修复：修复显示/隐藏详情时的崩溃问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-130 ClipBook 启动时崩溃

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：早期版本
- 现象：应用启动时崩溃
- 根因：初始化逻辑有 bug
- 修复：修复启动时崩溃问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-131 codex-watcher 本地 vendor 404/MIME 错误

- 项目：codex-watcher
- 仓库：/Users/apple/codexwatcher/codex-watcher
- 发生版本：当前版本
- 现象：加载本地 vendor 文件时出现 404 和 MIME 类型错误
- 根因：本地 vendor 标签在文件不存在时导致错误
- 修复：移除本地 vendor 标签，仅使用 CDN
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：静态资源加载需要考虑文件缺失的降级处理

---

## P-2024-132 git-worktree-manager getNameRev 错误处理

- 项目：git-worktree-manager
- 仓库：/Users/apple/git-worktree-manage/git-worktree-manager
- 发生版本：当前版本
- 现象：getNameRev 函数执行出错时未正确处理
- 根因：错误处理逻辑不完善
- 修复：在 getNameRev 函数中正确处理错误
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-133 git-worktree-manager worktree pruning 问题

- 项目：git-worktree-manager
- 仓库：/Users/apple/git-worktree-manage/git-worktree-manager
- 发生版本：Issue #23
- 现象：worktree pruning 操作不正确
- 根因：git worktree prune 相关操作逻辑有问题
- 修复：改进 worktree pruning 和相关 git 操作
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-134 kexin-podcast JavaScript 变量重复声明

- 项目：kexin-podcast
- 仓库：/Users/apple/podcast/kexin-podcast
- 发生版本：当前版本
- 现象：启动时报错变量重复声明
- 根因：JavaScript 变量被重复声明
- 修复：修复 JavaScript 变量重复声明错误
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-135 Slash-Command-Prompter mode 下拉菜单对齐问题

- 项目：Slash-Command-Prompter
- 仓库：/Users/apple/prompt/Slash-Command-Prompter
- 发生版本：当前版本
- 现象：mode 下拉菜单与其他元素对齐不正确
- 根因：CSS 布局问题
- 修复：优化 UI 布局，修复 mode 下拉菜单对齐问题，统一按钮间距
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-136 tobooks 搜索栏和按钮重叠

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：顶部栏搜索栏和按钮出现重叠
- 根因：CSS 布局问题
- 修复：重构顶部栏，使用 CSS Grid 布局解决重叠问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：复杂布局使用 CSS Grid 比 Flexbox 更易控制

---

## P-2024-137 zhuyili Google 登录回调 URL 问题

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：Google 登录回调失败
- 根因：回调 URL 配置错误
- 修复：修复 Google 登录回调 URL
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-138 ClipBook 多文件选择时布局问题

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：选择多个文件时布局显示异常
- 根因：多选模式下 CSS 布局未正确处理
- 修复：修复多文件选择时的布局问题，同时支持批量粘贴多个文件
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-139 ClipBook 通用布局问题

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：早期版本
- 现象：界面布局显示不正确
- 根因：CSS 布局问题
- 修复：修复布局问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-140 ClipBook 图片标题问题

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：图片标题显示不正确
- 根因：图片元数据解析问题
- 修复：修复图片标题显示，同时添加右键菜单命令
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-141 kotadb orchestrator 原子代理签名不匹配

- 项目：kotadb
- 仓库：/Users/apple/agent/kotadb
- 发生版本：当前版本
- 现象：orchestrator.py 中存在 7 个原子代理签名不匹配
- 根因：代理函数签名定义与实际调用不一致
- 修复：解决 orchestrator.py 中 7 个原子代理签名不匹配问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：函数签名变更时需要同步更新所有调用方

---

## P-2024-142 zhuyili 活动记录不同步核心问题

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：活动记录在设备间不同步
- 根因：同步逻辑存在核心问题
- 修复：修复活动记录不同步的核心问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-143 ClipBook 检查更新时死锁

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：检查更新时应用卡死
- 根因：更新检查逻辑存在死锁
- 修复：修复检查更新时的死锁问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：多线程更新检查需要避免主线程阻塞

---

## P-2024-144 kotadb 数据库 rate limit 更新问题

- 项目：kotadb
- 仓库：/Users/apple/agent/kotadb
- 发生版本：Issue #463
- 现象：数据库中已有的 rate limit 无法正确更新
- 根因：更新逻辑未正确处理已存在的记录
- 修复：更新数据库中已存在的 rate limit 记录
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-145 tobooks intro 按钮链接错误

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：intro 按钮点击后跳转到错误的 URL
- 根因：链接地址配置错误
- 修复：更新 intro 按钮链接到正确的 URL
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-146 tobooks OG/Twitter 图片域名问题

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：社交分享时预览图片无法显示
- 根因：og:image 和 twitter:image 未使用实际的 Netlify 域名
- 修复：更新 og:image 和 twitter:image 使用实际 Netlify 域名
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：社交分享图片需要使用完整的绝对 URL

---

## P-2024-147 zhuyili 详情页按钮完全点不动

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：计时器详情页面的按钮完全无法点击
- 根因：事件绑定方式有问题
- 修复：使用事件委托修复详情页按钮无法点击的问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：动态生成的元素需要使用事件委托

---

## P-2024-148 kotadb v0.1.1 生产环境回滚

- 项目：kotadb
- 仓库：/Users/apple/agent/kotadb
- 发生版本：v0.1.1
- 现象：v0.1.1 版本在生产环境出现问题需要回滚
- 根因：新版本存在未发现的问题
- 修复：回滚到之前稳定版本
- 回归检查：生产环境验证
- 状态：verified
- 日期：2024-12-16
- 经验：生产环境发布需要更充分的测试

---

## P-2024-149 tobooks iOS 主屏独立模式扩展不可用

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：iOS 从主屏幕图标启动时浏览器扩展不可用
- 根因：iOS standalone 模式下扩展无法工作
- 修复：尝试添加"在 Safari 中打开"提示按钮（后被 revert）
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：iOS PWA standalone 模式与扩展不兼容是平台限制

---

## P-2024-150 git-worktree-manager worktree 列表处理重构问题

- 项目：git-worktree-manager
- 仓库：/Users/apple/git-worktree-manage/git-worktree-manager
- 发生版本：当前版本
- 现象：worktree 列表处理重构后出现问题
- 根因：重构引入了新的 bug
- 修复：回滚 worktree 列表处理重构
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：重构需要充分的测试覆盖

---

## P-2024-151 ClipBook 拼写错误

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：界面文本拼写错误
- 根因：拼写错误
- 修复：修复拼写错误
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-152 ClipBook 缺少依赖

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：应用启动或编译失败
- 根因：缺少必要的依赖
- 修复：添加缺少的依赖
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-153 ClipBook 预览面板边框缺失

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：预览面板边框不显示
- 根因：CSS 样式缺失
- 修复：修复预览面板边框缺失问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-154 git-worktree-manager 国际化文本遗漏

- 项目：git-worktree-manager
- 仓库：/Users/apple/git-worktree-manage/git-worktree-manager
- 发生版本：当前版本
- 现象：部分界面文本未翻译
- 根因：国际化文本配置遗漏
- 修复：补充遗漏的国际化文本
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-155 iterate UnoCSS safelist 黑色变体问题

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：当前版本
- 现象：黑色相关的 CSS 类不生效
- 根因：UnoCSS safelist 未包含黑色变体
- 修复：修复 UnoCSS safelist 添加黑色变体
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：UnoCSS safelist 需要包含所有用到的动态类名

---

## P-2024-156 insidebar-ai Share 按钮布局不一致

- 项目：insidebar-ai
- 仓库：/Users/apple/insidebar-ai
- 发生版本：当前版本
- 现象：/chats/ 和 /pages/ 页面的 Share 按钮布局不同导致功能异常
- 根因：不同页面的按钮布局结构不一致
- 修复：处理不同 Share 按钮布局
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：扩展需要适配多种页面布局

---

## P-2024-157 codex-watcher indexer_test vet 错误

- 项目：codex-watcher
- 仓库：/Users/apple/codexwatcher/codex-watcher
- 发生版本：当前版本
- 现象：运行 go vet 时 indexer_test 出错
- 根因：测试代码不符合 vet 规范
- 修复：修复 indexer_test 中的 vet 错误
- 回归检查：CI 验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-158 iterate 多开时配置不同步

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：PR #48
- 现象：多开应用时配置不同步
- 根因：多个实例同时操作配置文件导致冲突
- 修复：采用单实例模式并监听窗口焦点，解决多开时配置不同步问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：桌面应用需要考虑单实例模式避免配置冲突

---

## P-2024-159 zhuyili 生产环境 OAuth 回调跳回本地

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：生产环境 OAuth 回调后出现 "Cannot GET /" 错误
- 根因：OAuth 回调 URL 跳回到本地而不是 Netlify 正式域名
- 修复：生产环境 OAuth 回调固定到 Netlify 正式域名
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：OAuth 回调 URL 需要根据环境正确配置

---

## P-2024-160 zhuyili 用户数据隔离和 JSON 导入同步

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：用户数据未正确隔离，JSON 导入后数据不同步
- 根因：数据隔离和同步逻辑有问题
- 修复：修复用户数据隔离和 JSON 导入同步问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-161 Strong-Iterate Netlify 部署 PNG/JPEG 扩展名问题

- 项目：Strong-Iterate
- 仓库：/Users/apple/产品更新/Strong-Itreate
- 发生版本：当前版本
- 现象：Netlify 部署时图片资源 404
- 根因：vite.config.js 未包含 PNG 和 JPEG 大写扩展名
- 修复：在 vite.config.js 中添加 PNG 和 JPEG 大写扩展名支持
- 回归检查：部署验证
- 状态：verified
- 日期：2024-12-16
- 经验：Vite 配置需要考虑文件扩展名大小写

---

## P-2024-162 Strong-Iterate JS 文件 404 问题

- 项目：Strong-Iterate
- 仓库：/Users/apple/产品更新/Strong-Itreate
- 发生版本：当前版本
- 现象：部署后 JS 文件 404
- 根因：script 标签配置问题
- 修复：更新 vite.config.js 并修复 script 标签
- 回归检查：部署验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-163 iterate proc-macro 编译问题

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：当前版本
- 现象：proc-macro 编译失败
- 根因：静态链接标志导致 proc-macro 编译问题
- 修复：移除静态链接标志解决 proc-macro 编译问题
- 回归检查：CI 验证
- 状态：verified
- 日期：2024-12-16
- 经验：Rust proc-macro 不兼容某些静态链接配置

---

## P-2024-164 twscrape 构建问题

- 项目：twscrape (Twitter 爬虫)
- 仓库：/Users/apple/twiter/twscrape
- 发生版本：当前版本
- 现象：项目构建失败
- 根因：构建配置问题
- 修复：修复构建问题
- 回归检查：CI 验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-165 iterate 自定义 Telegram API URL 问题

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：当前版本
- 现象：自定义 Telegram API URL 功能不完整
- 根因：监听函数未支持自定义 API URL，前端存在硬编码 URL
- 修复：改进自定义 Telegram API URL 实现，添加前端常量文件消除硬编码
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：API URL 应该统一通过常量管理，避免硬编码

---

## P-2024-166 tobooks /api/book-cutting 根路径访问问题

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：/api/book-cutting 根路径无法访问
- 根因：路由逻辑未支持根路径
- 修复：修复路由逻辑支持根路径访问，添加调试日志
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-167 zhuyili 二维码不显示

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：二维码无法显示
- 根因：二维码生成或渲染逻辑有问题
- 修复：修复二维码不显示问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-168 背单词网页 YouTube 字幕 API 问题

- 项目：背单词的网页
- 仓库：/Users/apple/背单词的网页
- 发生版本：当前版本
- 现象：YouTube 字幕获取失败
- 根因：youtube-transcript 库不可用
- 修复：改用 YouTube timedtext API 替代 youtube-transcript
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：第三方库不可用时需要寻找官方 API 替代方案

---

## P-2024-169 codex-watcher 侧边栏高亮状态丢失

- 项目：codex-watcher
- 仓库：/Users/apple/codexwatcher/codex-watcher
- 发生版本：当前版本
- 现象：侧边栏重新渲染后活动会话高亮状态丢失
- 根因：状态未持久化，重新渲染时未恢复
- 修复：持久化并在侧边栏重新渲染时恢复活动会话高亮，恢复每个来源最后打开的会话
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：UI 状态需要持久化以支持重新渲染

---

## P-2024-170 Slash-Command-Prompter 模式切换后菜单同步问题

- 项目：Slash-Command-Prompter
- 仓库：/Users/apple/prompt/Slash-Command-Prompter
- 发生版本：当前版本
- 现象：切换模式后斜杠命令菜单显示第一个模式的提示词而非当前选中模式
- 根因：模式切换时菜单数据未正确同步
- 修复：确保 / 命令显示当前选中模式的提示词
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：状态切换时需要同步更新所有依赖的 UI 组件

---

## P-2024-171 tobooks 高亮菜单位置和文字加粗显示

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：高亮菜单位置不正确，文字加粗显示异常
- 根因：CSS 定位和样式问题
- 修复：修复高亮菜单位置和文字加粗显示
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-172 ClipBook 历史为空时拖拽区域 bug

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：历史记录为空时拖拽区域功能异常
- 根因：空状态下拖拽区域逻辑有 bug
- 修复：修复历史为空时拖拽区域 bug
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-173 ClipBook 深色/浅色模式滚动条问题

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：深色/浅色模式切换时滚动条样式不正确
- 根因：滚动条样式未适配主题
- 修复：修复深色/浅色滚动条样式
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-174 codex-watcher DOMPurify 下展开/折叠失效

- 项目：codex-watcher
- 仓库：/Users/apple/codexwatcher/codex-watcher
- 发生版本：当前版本
- 现象：DOMPurify 处理后展开/折叠按钮点击无效
- 根因：DOMPurify 移除了内联 onclick 事件
- 修复：使用事件委托替代内联 onclick，使用 data-* 属性传递参数
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：DOMPurify 会移除内联事件，需要使用事件委托

---

## P-2024-175 git-worktree-manager treeView 点击打开终端和文件夹

- 项目：git-worktree-manager
- 仓库：/Users/apple/git-worktree-manage/git-worktree-manager
- 发生版本：当前版本
- 现象：点击 treeView 无法打开终端和文件夹
- 根因：点击事件处理有问题
- 修复：修复点击 treeView 打开终端和文件夹功能
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-176 zhuyili 微信支付按钮点击事件绑定

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：微信支付购买按钮点击无反应
- 根因：点击事件绑定和试用次数逻辑有问题
- 修复：修复购买按钮点击事件绑定和试用次数逻辑
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-177 iterate 状态同步可能导致白屏

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：当前版本
- 现象：应用启动后可能出现白屏
- 根因：状态同步逻辑过于复杂
- 修复：简化状态同步逻辑，修复可能的白屏问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：状态同步逻辑应该保持简单，避免复杂依赖

---

## P-2024-178 kexin-podcast 本地 uploads 回退问题

- 项目：kexin-podcast
- 仓库：/Users/apple/podcast/kexin-podcast
- 发生版本：当前版本
- 现象：部署后文件 URL 仍然回退到本地 /uploads 路径
- 根因：未统一使用 Cloudinary file_url
- 修复：统一使用 Cloudinary file_url，移除本地 /uploads 回退
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：云部署后应该完全使用云存储 URL

---

## P-2024-179 tobooks 高亮功能导致内容消失

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：使用高亮功能后内容消失
- 根因：高亮处理逻辑有 bug
- 修复：修复高亮功能导致内容消失的问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-180 ClipBook 随机窗口自动隐藏

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：应用窗口随机自动隐藏
- 根因：窗口状态管理 bug
- 修复：修复随机应用窗口自动隐藏 bug
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-181 ClipBook 活动应用为空时显示窗口问题

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：当活动应用为空时显示窗口出错
- 根因：未处理活动应用为空的边界情况
- 修复：修复活动应用为空时显示窗口的 bug
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：窗口显示逻辑需要处理空状态

---

## P-2024-182 iterate 移动窗口中文输入候选栏移位

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：PR #55
- 现象：移动窗口时中文输入法候选栏位置错位
- 根因：窗口位置变化未正确通知输入法系统
- 修复：修复移动窗口中文输入候选栏移位 bug
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：窗口移动时需要考虑输入法候选栏位置

---

## P-2024-183 tobooks Cmd+Enter 监听模式问题

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：Cmd+Enter 快捷键不生效
- 根因：使用了错误的事件监听模式
- 修复：改用 window capture 模式监听 Cmd+Enter
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：全局快捷键需要使用 capture 模式

---

## P-2024-184 iterate 增强快捷键默认值问题

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：当前版本
- 现象：增强快捷键功能不符合预期
- 根因：默认值设置不正确
- 修复：更新增强快捷键的默认值并优化日志输出
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-185 git-worktree-manager 更新保存仓库时缓存未刷新

- 项目：git-worktree-manager
- 仓库：/Users/apple/git-worktree-manage/git-worktree-manager
- 发生版本：当前版本
- 现象：更新保存的仓库后数据未更新
- 根因：缓存未刷新
- 修复：更新保存的仓库时刷新缓存
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：数据变更后需要刷新相关缓存

---

## P-2024-186 tobooks Cmd+Enter 保存笔记无效

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：按 Cmd+Enter 保存笔记不生效
- 根因：保存逻辑有问题
- 修复：修复 Cmd+Enter 保存笔记无效的问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-187 ClipBook 路径问题

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：文件路径处理有问题
- 根因：路径逻辑 bug
- 修复：修复路径问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-188 git-worktree-manager git 路径解析

- 项目：git-worktree-manager
- 仓库：/Users/apple/git-worktree-manage/git-worktree-manager
- 发生版本：当前版本
- 现象：git 路径解析不正确
- 根因：execBase 函数中 git 路径解析逻辑有问题
- 修复：改进 execBase 函数中的 git 路径解析
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-189 twscrape 解析链接计数问题

- 项目：twscrape (Twitter 爬虫)
- 仓库：/Users/apple/twiter/twscrape
- 发生版本：Issue #56
- 现象：解析的链接计数不正确
- 根因：链接计数逻辑有 bug
- 修复：修复解析链接计数
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-190 twscrape 用户资料中的 URL 问题

- 项目：twscrape (Twitter 爬虫)
- 仓库：/Users/apple/twiter/twscrape
- 发生版本：当前版本
- 现象：用户资料中的 URL 解析不正确
- 根因：URL 解析逻辑有问题
- 修复：修复用户资料中的 URL 解析
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-191 tobooks 高亮加载错误处理

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：高亮加载失败时没有正确的错误处理
- 根因：异步加载错误处理不完善
- 修复：修复高亮加载错误处理
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-192 zhuyili 主页完成按钮首次点击即生效

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：主页完成按钮首次点击不保存和重置
- 根因：异步操作未正确等待
- 修复：修复完成按钮首次点击即保存和重置
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-193 kotadb 管理账单按钮不可用

- 项目：kotadb
- 仓库：/Users/apple/agent/kotadb
- 发生版本：Issue #450
- 现象：管理账单按钮点击无反应
- 根因：按钮事件绑定或功能实现有问题
- 修复：修复管理账单按钮不可用问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-194 kotadb API 密钥页面自动获取

- 项目：kotadb
- 仓库：/Users/apple/agent/kotadb
- 发生版本：当前版本
- 现象：API 密钥页面加载时未自动获取已有密钥
- 根因：页面加载时未触发获取操作
- 修复：页面加载时自动获取已有 API 密钥
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-195 git-worktree-manager 视图条件和收藏操作

- 项目：git-worktree-manager
- 仓库：/Users/apple/git-worktree-manage/git-worktree-manager
- 发生版本：当前版本
- 现象：视图条件判断不正确，收藏相关操作缺失
- 根因：视图条件逻辑和收藏功能未完善
- 修复：更新视图条件并添加收藏相关操作
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-196 iterate 重复 applyFontVariables 函数

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：当前版本
- 现象：代码中存在重复的函数定义
- 根因：重构时未清理旧代码
- 修复：移除重复的 applyFontVariables 函数
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-197 iterate Windows 路径编码问题

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：PR #24, #27
- 现象：Windows 系统上 memory 功能路径编码错误
- 根因：Windows 路径编码与 Unix 不同
- 修复：修复 Windows 路径编码问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：跨平台应用需要处理不同系统的路径编码

---

## P-2024-198 zhuyili 计时页面图标显示问题

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：计时页面图标不显示
- 根因：图标资源路径或加载逻辑有问题
- 修复：修复计时页面图标显示问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-199 zhuyili 移动端标题被遮挡

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：移动端标题显示被其他元素遮挡
- 根因：移动端 CSS 布局问题
- 修复：优化移动端标题显示，解决被遮挡问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-200 久坐通知 Service Worker 缓存问题

- 项目：久坐通知
- 仓库：/Users/apple/久坐通知
- 发生版本：当前版本
- 现象：应用无法获取最新版本
- 根因：Service Worker 缓存策略导致旧版本被缓存
- 修复：改为网络优先策略确保获取最新版本
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：PWA 应用需要正确配置 Service Worker 缓存策略

---

## P-2024-201 tobooks 客户端书籍切割功能

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：客户端书籍切割功能与脚本要求不匹配
- 根因：客户端实现与后端脚本要求不一致
- 修复：增强客户端书籍切割功能以匹配脚本要求
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-202 播客 备份文件 Git 跟踪问题

- 项目：My-podcast / 播客
- 仓库：/Users/apple/播/My-podcast
- 发生版本：当前版本
- 现象：备份文件被 Git 跟踪
- 根因：.gitignore 配置不正确
- 修复：修复备份文件 Git 跟踪问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-203 git-worktree-manager worktree 命令和刷新逻辑

- 项目：git-worktree-manager
- 仓库：/Users/apple/git-worktree-manage/git-worktree-manager
- 发生版本：当前版本
- 现象：worktree 命令执行和刷新逻辑有问题
- 根因：命令执行和刷新逻辑不完善
- 修复：更新 worktree 命令并优化刷新逻辑
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-204 tobooks multipart 解析和代码结构

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：multipart 请求解析有问题
- 根因：解析逻辑不完善
- 修复：使用 busboy 改进 multipart 解析并修复代码结构
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-205 tobooks Supabase 权限绕过

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：Supabase 权限问题导致功能无法使用
- 根因：Supabase RLS 策略限制
- 修复：添加硬编码白名单绕过 Supabase 权限问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：Supabase RLS 问题可以通过白名单临时绕过

---

## P-2024-206 久坐通知 iPhone 通知权限问题

- 项目：久坐通知
- 仓库：/Users/apple/久坐通知
- 发生版本：当前版本
- 现象：iPhone 上通知权限无法正常工作
- 根因：iOS Safari 对 PWA 通知权限有特殊要求
- 修复：添加 PWA 支持，解决 iPhone 通知权限问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：iOS PWA 通知需要特殊的权限处理

---

## P-2024-207 tobooks 支付 API 地址问题

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：手机端支付功能无法使用
- 根因：支付 API 地址配置不正确
- 修复：更新支付 API 地址为阿里云 FC 公网地址
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-208 zhuyili 注意力跳动问题

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：注意力页面出现跳动
- 根因：使用页面跳转导致闪烁
- 修复：用视图切换替代页面跳转
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：SPA 应用应使用视图切换而非页面跳转

---

## P-2024-209 insidebar-ai DeepSeek Enter 键行为

- 项目：insidebar-ai
- 仓库：/Users/apple/insidebar-ai
- 发生版本：当前版本
- 现象：DeepSeek 中编辑旧消息时 Enter 键行为不正确
- 根因：未正确处理 DeepSeek 的编辑模式
- 修复：修复 DeepSeek 编辑旧消息时的 Enter 键行为
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-210 insidebar-ai Perplexity Enter 键行为

- 项目：insidebar-ai
- 仓库：/Users/apple/insidebar-ai
- 发生版本：当前版本
- 现象：Perplexity 中编辑旧消息时 Enter 键行为不正确
- 根因：未正确处理 Perplexity 的编辑模式
- 修复：修复 Perplexity 编辑旧消息时的 Enter 键行为
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-211 insidebar-ai Gemini Update 按钮检测

- 项目：insidebar-ai
- 仓库：/Users/apple/insidebar-ai
- 发生版本：当前版本
- 现象：Gemini 的 Update 按钮无法正确检测
- 根因：按钮选择器未使用上下文感知搜索
- 修复：使用上下文感知搜索修复 Gemini Update 按钮检测
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-212 Full-screen-prompt 多桌面/全屏 Space 窗口跳动

- 项目：Full-screen-prompt (全屏提示)
- 仓库：/Users/apple/全屏/Full-screen-prompt
- 发生版本：当前版本
- 现象：在多桌面或全屏 Space 下窗口跳回固定桌面
- 根因：窗口位置计算未考虑多 Space 环境
- 修复：修复多桌面/全屏 Space 下窗口跳回固定桌面的问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：macOS 多 Space 应用需要正确处理窗口位置

---

## P-2024-213 kexin-podcast 上传时 filename 为空

- 项目：kexin-podcast
- 仓库：/Users/apple/podcast/kexin-podcast
- 发生版本：当前版本
- 现象：上传文件时报数据库约束错误
- 根因：filename 字段为空违反数据库约束
- 修复：修复上传时 filename 为空的数据库约束错误
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-214 twscrape 媒体类型问题

- 项目：twscrape (Twitter 爬虫)
- 仓库：/Users/apple/twiter/twscrape
- 发生版本：当前版本
- 现象：媒体类型解析不正确
- 根因：媒体类型判断逻辑有问题
- 修复：修复媒体类型解析
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-215 tobooks 白名单 site 字段过滤不匹配

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：白名单检查时 site 字段过滤不正确
- 根因：字段匹配逻辑有问题
- 修复：修复白名单检查时 site 字段过滤不匹配的问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-216 Full-screen-prompt 复制到剪贴板功能

- 项目：Full-screen-prompt (全屏提示)
- 仓库：/Users/apple/全屏/Full-screen-prompt
- 发生版本：当前版本
- 现象：点击提示词无法复制到剪贴板
- 根因：剪贴板 API 调用有问题
- 修复：修复点击提示词复制到剪贴板功能
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-217 wechat-spider 微信改版搜索公众号失效

- 项目：wechat-spider
- 仓库：/Users/apple/微信公众号/wechat-spider
- 发生版本：当前版本
- 现象：搜索公众号功能失效
- 根因：微信改版导致接口变化
- 修复：修复微信改版后搜索公众号失效的问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：爬虫需要及时适配目标网站的改版

---

## P-2024-218 RI 排序问题

- 项目：RI (Replace-Information)
- 仓库：/Users/apple/信息置换起/RI
- 发生版本：当前版本
- 现象：最新保存的内容未显示在列表顶部
- 根因：排序逻辑不正确
- 修复：修复排序，最新保存的内容现在显示在列表顶部
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-219 RI 笔记保存功能迁移到 IndexedDB

- 项目：RI (Replace-Information)
- 仓库：/Users/apple/信息置换起/RI
- 发生版本：当前版本
- 现象：笔记保存功能有问题
- 根因：存储方案需要迁移
- 修复：将 note-window.js 笔记保存功能迁移到 IndexedDB
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：大量数据存储应使用 IndexedDB 而非 localStorage

---

## P-2024-220 insidebar-ai 性能和验证问题

- 项目：insidebar-ai
- 仓库：/Users/apple/insidebar-ai
- 发生版本：当前版本
- 现象：代码审计发现性能和验证问题
- 根因：代码实现不够优化
- 修复：修复代码审计发现的性能和验证问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-221 git-worktree-manager URI 处理问题

- 项目：git-worktree-manager
- 仓库：/Users/apple/git-worktree-manage/git-worktree-manager
- 发生版本：当前版本
- 现象：worktree 路径 URI 处理不正确
- 根因：应使用 Uri.parse 而非 Uri.file
- 修复：使用 Uri.parse 替代 Uri.file 处理 worktree 路径
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：VS Code 扩展中 URI 处理需要根据来源选择正确方法

---

## P-2024-222 tobooks Vercel 部署 ES6 模块格式

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：Vercel 部署失败
- 根因：book-cutting.js 模块格式与其他 API 文件不一致
- 修复：将 book-cutting.js 改为 ES6 模块格式
- 回归检查：部署验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-223 tobooks Vercel serverless 函数导出和 CORS

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：Vercel serverless 函数不工作
- 根因：导出格式和 CORS 设置不正确
- 修复：修复 Vercel serverless 函数导出格式和 CORS 设置
- 回归检查：部署验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-224 zhuyili JSON 导入日期格式问题

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：JSON 导入时日期格式解析错误
- 根因：日期格式解析逻辑有问题
- 修复：修复 JSON 导入日期格式问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-225 ClipBook 启动时崩溃

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：应用启动时崩溃
- 根因：启动初始化逻辑有问题
- 修复：修复启动时崩溃问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-226 git-worktree-manager worktree 进程移除

- 项目：git-worktree-manager
- 仓库：/Users/apple/git-worktree-manage/git-worktree-manager
- 发生版本：当前版本
- 现象：worktree 进程处理有问题
- 根因：进程移除逻辑不正确
- 修复：修复 worktree 进程移除问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-227 tobooks 高亮菜单遮挡内容

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：高亮菜单显示位置遮挡选中文字
- 根因：菜单定位逻辑有问题
- 修复：高亮菜单始终显示在选中文字下方，不遮挡内容
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-228 ClipBook bundle 提取应用名崩溃

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：从 bundle 提取应用名时崩溃
- 根因：提取逻辑未处理异常情况
- 修复：修复从 bundle 提取应用名时的崩溃问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-229 iterate 只构建 CLI 避免打包问题

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：当前版本
- 现象：完整构建时出现打包问题
- 根因：打包配置有问题
- 修复：修改为只构建 CLI 二进制文件，避免打包问题
- 回归检查：CI 验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-230 iterate Windows icon.ico 缺失

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：当前版本
- 现象：Windows 构建失败
- 根因：缺少 Windows 需要的 icon.ico 文件
- 修复：添加 Windows 需要的 icon.ico 文件
- 回归检查：CI 验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-231 背单词网页 Vite base path 问题

- 项目：背单词的网页
- 仓库：/Users/apple/背单词的网页
- 发生版本：当前版本
- 现象：Netlify 根目录部署时资源路径错误
- 根因：Vite base path 配置不正确
- 修复：移除 Vite base path 以支持 Netlify 根目录部署
- 回归检查：部署验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-232 Strong-Iterate script 标签缺少 type=module

- 项目：Strong-Iterate
- 仓库：/Users/apple/产品更新/Strong-Itreate
- 发生版本：当前版本
- 现象：Vite 打包后 JS 无法执行
- 根因：script 标签缺少 type=module 属性
- 修复：添加 type=module 属性解决 Vite 打包问题
- 回归检查：部署验证
- 状态：verified
- 日期：2024-12-16
- 经验：Vite 打包的 ES 模块需要 type=module

---

## P-2024-233 ClipBook CSS 颜色值为空时崩溃

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：CSS 颜色值为空时应用崩溃
- 根因：未处理空颜色值的边界情况
- 修复：修复 CSS 颜色值为空时的崩溃问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-234 Strong-Iterate 刷新后样式重置

- 项目：Strong-Iterate
- 仓库：/Users/apple/产品更新/Strong-Itreate
- 发生版本：当前版本
- 现象：页面刷新后样式被重置
- 根因：缺少缓存控制
- 修复：添加缓存控制，解决刷新后样式重置问题
- 回归检查：部署验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-235 tobooks CORS 预检请求问题

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：跨域请求失败
- 根因：CORS 头未在 Vercel handler 和 Express 中间件中都设置
- 修复：在两处都设置 CORS 头，确保预检请求正确处理
- 回归检查：部署验证
- 状态：verified
- 日期：2024-12-16
- 经验：CORS 需要在所有入口点都正确配置

---

## P-2024-236 tobooks CDN 加载 Turndown 库问题

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：CDN 加载 Turndown 库失败
- 根因：CDN 网络问题
- 修复：使用本地 Turndown 库避免 CDN 加载问题
- 回归检查：部署验证
- 状态：verified
- 日期：2024-12-16
- 经验：关键依赖应使用本地副本避免 CDN 不可用

---

## P-2024-237 tobooks 移动端双击手势兼容性

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：沉浸式翻译等扩展在手机上双击无响应
- 根因：文档点击处理与翻译扩展冲突
- 修复：改为单/双击判定，双击派发 dblclick 不翻页，单击延时触发翻页
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：手势处理需要考虑与浏览器扩展的兼容性

---

## P-2024-238 zhuyili 计时器继续/暂停时占位符闪烁

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：计时器继续或暂停时占位符闪烁
- 根因：状态切换时 UI 更新不平滑
- 修复：修复计时器继续/暂停时占位符闪烁问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-239 insidebar-ai 语言切换需要重新加载

- 项目：insidebar-ai
- 仓库：/Users/apple/insidebar-ai
- 发生版本：当前版本
- 现象：切换语言后需要重新加载才能生效
- 根因：语言切换未实时更新 UI
- 修复：修复语言切换立即生效，无需重新加载
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-240 kotadb Docker 构建 shared types 问题

- 项目：kotadb
- 仓库：/Users/apple/agent/kotadb
- 发生版本：Issue #428
- 现象：Docker 构建时 shared types 无法正确解析
- 根因：Docker 构建上下文配置不正确
- 修复：解决 Docker 构建上下文中 shared types 的问题
- 回归检查：CI 验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-241 视频侧边栏 视频与侧边栏实时联动

- 项目：视频侧边栏
- 仓库：/Users/apple/视频侧边栏
- 发生版本：当前版本
- 现象：视频与侧边栏未能实时联动
- 根因：同步逻辑有问题
- 修复：完美解决视频与侧边栏实时联动问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-242 insidebar-ai Google AI Mode 重复检测

- 项目：insidebar-ai
- 仓库：/Users/apple/insidebar-ai
- 发生版本：当前版本
- 现象：Google AI Mode 重复检测和消息提取有问题
- 根因：检测逻辑不完善
- 修复：修复 Google AI Mode 重复检测和消息提取
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-243 播客 数据持久化问题

- 项目：My-podcast / 播客
- 仓库：/Users/apple/播/My-podcast
- 发生版本：当前版本
- 现象：数据未正确持久化
- 根因：数据持久化逻辑有问题
- 修复：修复数据持久化问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-244 Full-screen-prompt Perplexity Slate 编辑器插入

- 项目：Full-screen-prompt (全屏提示)
- 仓库：/Users/apple/全屏/Full-screen-prompt
- 发生版本：当前版本
- 现象：Perplexity Slate 编辑器中 Enter/点击插入不可靠，菜单重复
- 根因：选区恢复、事件派发、竞态处理等多个问题
- 修复：可靠插入，恢复选区，派发 beforeinput+execCommand，添加 Enter 竞态处理，通过防抖和守卫修复重复菜单
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：Slate 编辑器需要特殊的事件处理

---

## P-2024-245 tobooks 笔记关联到整个高亮

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：当选中已高亮文本的局部部分时，笔记未关联到整个高亮
- 根因：笔记关联逻辑未正确处理局部选择
- 修复：修复当选中已高亮文本的局部部分时，笔记关联到整个高亮
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-246 zhuyili 活动记录云端同步失败

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：活动记录云端同步失败
- 根因：同步逻辑有问题
- 修复：修复活动记录云端同步失败问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-247 kotadb 域名错误

- 项目：kotadb
- 仓库：/Users/apple/agent/kotadb
- 发生版本：当前版本
- 现象：域名配置错误
- 根因：使用了错误的域名 kotadb.com
- 修复：将域名从 kotadb.com 修正为 kotadb.io
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-248 tobooks vercel.json 缺失 /upload-url 路由

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：/upload-url 路由无法访问
- 根因：vercel.json 中缺少该路由的 rewrite 配置
- 修复：添加缺失的 /upload-url rewrite 路由
- 回归检查：部署验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-249 zhuyili Enter 键跳转问题

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：Enter 键无法正确跳转到计时页面
- 根因：跳转逻辑过于复杂
- 修复：简化逻辑，直接跳转到计时页面
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-250 zhuyili Google 登录重定向问题

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：Google 登录后重定向失败
- 根因：重定向 URL 配置有问题
- 修复：修复 Google 登录重定向问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-251 信息过滤器 App 导出 JSON 格式兼容

- 项目：信息过滤器
- 仓库：/Users/apple/信息过滤器
- 发生版本：当前版本
- 现象：导入 App 导出的 JSON 格式失败
- 根因：未支持纯数组 JSON 格式
- 修复：修复导入，支持 App 导出的纯数组 JSON 格式
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-252 ClipBook 对话框透明度问题

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：对话框透明度显示不正确
- 根因：透明度样式设置有问题
- 修复：修复对话框透明度问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-253 kexin-podcast DELETE 接口 ID 类型问题

- 项目：kexin-podcast
- 仓库：/Users/apple/kexin-podcast
- 发生版本：当前版本
- 现象：DELETE /api/podcasts/:id 无法接受数字 ID，返回 404
- 根因：ID 参数类型处理不正确
- 修复：DELETE 接口接受数字 ID，实现幂等性，避免 404
- 回归检查：API 测试验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-254 播客 备份文件 Git 跟踪问题

- 项目：My-podcast / 播客
- 仓库：/Users/apple/播/My-podcast
- 发生版本：当前版本
- 现象：备份文件被 Git 跟踪
- 根因：.gitignore 配置不正确
- 修复：修复备份文件 Git 跟踪问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-255 ClipBook 搜索意外获取焦点

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：搜索框意外获取焦点
- 根因：焦点管理逻辑有问题
- 修复：修复搜索意外获取焦点的问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-256 iterate 重复 applyFontVariables 函数

- 项目：iterate (cunzhi)
- 仓库：https://github.com/imhuso/cunzhi
- 发生版本：当前版本
- 现象：代码中存在重复的 applyFontVariables 函数
- 根因：函数定义重复
- 修复：移除重复的 applyFontVariables 函数
- 回归检查：编译验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-257 zhuyili 微信支付购买按钮事件绑定

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：购买按钮点击无响应
- 根因：事件绑定和试用次数逻辑有问题
- 修复：修复微信支付功能，购买按钮点击事件绑定和试用次数逻辑
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-258 久坐通知 Service Worker 缓存问题

- 项目：久坐通知
- 仓库：/Users/apple/久坐通知
- 发生版本：当前版本
- 现象：页面无法获取最新版本
- 根因：Service Worker 缓存策略导致
- 修复：改为网络优先策略确保获取最新版本
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16
- 经验：PWA 应用需要合理设计缓存策略

---

## P-2024-259 RI 列表项编辑后保存问题

- 项目：RI (Replace-Information)
- 仓库：/Users/apple/信息置换起/RI
- 发生版本：当前版本
- 现象：列表项编辑后未正确保存
- 根因：保存方法调用不正确
- 修复：列表项编辑后正确保存（使用 updateWord）
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-260 insidebar-ai ES6 模块导入错误

- 项目：insidebar-ai
- 仓库：/Users/apple/insidebar-ai
- 发生版本：当前版本
- 现象：模块导入错误
- 根因：ES6 模块导入方式不兼容
- 修复：将 ES6 模块转换为全局命名空间
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-261 ClipBook 辅助功能访问检查时粘贴为空

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：检查辅助功能访问权限时粘贴内容为空
- 根因：辅助功能权限检查逻辑有问题
- 修复：修复检查辅助功能访问权限时粘贴为空的问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-262 zhuyili Supabase 客户端访问方式

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：Supabase 客户端访问有问题
- 根因：访问方式不正确
- 修复：修复 Supabase 客户端访问方式
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-263 git-worktree-manager push/pull 未触发 git hook

- 项目：git-worktree-manager
- 仓库：/Users/apple/git-worktree-manage/git-worktree-manager
- 发生版本：当前版本
- 现象：push/pull 操作未触发 git hook
- 根因：命令执行方式未正确调用 hook
- 修复：修复 push/pull 时触发 git hook
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-264 RI 导入/清空后模式跳转问题

- 项目：RI (Replace-Information)
- 仓库：/Users/apple/信息置换起/RI
- 发生版本：当前版本
- 现象：导入或清空数据后模式跳转不正确
- 根因：状态更新后未正确处理模式切换
- 修复：修复导入/清空后模式跳转的问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-265 RI 通知图标路径问题

- 项目：RI (Replace-Information)
- 仓库：/Users/apple/信息置换起/RI
- 发生版本：当前版本
- 现象：通知图标无法显示
- 根因：图标文件已删除但路径未更新
- 修复：使用 RI.png 替代已删除的信息置换.png
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-266 ClipBook Actions 弹窗高度问题

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：Actions 弹窗高度不正确
- 根因：高度样式设置有问题
- 修复：修复 Actions 弹窗高度
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-267 ClipBook 滚动问题

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：列表滚动有问题
- 根因：滚动逻辑有 bug
- 修复：修复滚动问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-268 tobooks text-to-epub 页面高度问题

- 项目：tobooks
- 仓库：/Users/apple/tobooks
- 发生版本：当前版本
- 现象：text-to-epub.html 页面高度不正确
- 根因：页面高度样式设置有问题
- 修复：修复 text-to-epub.html 页面高度问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-269 zen-flow 页面跳动问题

- 项目：zen-flow
- 仓库：/Users/apple/zen-flow
- 发生版本：当前版本
- 现象：调整 textarea 高度时页面跳动
- 根因：未保持滚动位置
- 修复：在调整 textarea 高度时保持滚动位置
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-270 视频侧边栏 视频与侧边栏自适应联动

- 项目：视频侧边栏
- 仓库：/Users/apple/视频侧边栏
- 发生版本：当前版本
- 现象：视频与侧边栏未能实时自适应联动
- 根因：尺寸变化监听逻辑有问题
- 修复：修复视频与侧边栏未实时自适应联动的问题
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-271 ClipBook 深色/浅色模式滚动条

- 项目：ClipBook
- 仓库：/Users/apple/clipbook/ClipBook
- 发生版本：当前版本
- 现象：深色/浅色模式下滚动条样式不正确
- 根因：滚动条样式未适配主题
- 修复：修复深色/浅色模式滚动条样式
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-272 zhuyili 统计图表颜色显示

- 项目：zhuyili (注意力追踪器)
- 仓库：/Users/apple/zhuyili
- 发生版本：当前版本
- 现象：统计图表颜色显示不正确
- 根因：combined.js 颜色算法未同步更新
- 修复：修复统计图表颜色显示，同步更新 combined.js 颜色算法
- 回归检查：手动验证
- 状态：verified
- 日期：2024-12-16

---

## P-2024-273 flow-learning 下载书籍文件名问题

- 项目：flow-learning (信息过滤器)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：56d015f
- 现象：下载书籍时文件名不是原始文件名
- 根因：下载时未使用书籍的原始文件名
- 修复：下载书籍时使用原始文件名
- 回归检查：R-2024-273
- 状态：verified
- 日期：2024-12-16

---

## P-2024-274 flow-learning 批量上传未同步到 Supabase

- 项目：flow-learning (信息过滤器)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：aef3c59
- 现象：批量上传书籍时未同步到 Supabase，fileUrl 未保存
- 根因：批量上传逻辑未包含 Supabase 上传和 fileUrl 保存
- 修复：批量上传也上传到 Supabase 并保存 fileUrl
- 回归检查：R-2024-274
- 状态：verified
- 日期：2024-12-16

---

## P-2024-275 flow-learning Supabase InvalidKey 错误

- 项目：flow-learning (信息过滤器)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：750b191
- 现象：上传文件到 Supabase 时报 InvalidKey 错误
- 根因：文件名包含特殊字符导致 Supabase 存储 key 无效
- 修复：使用简化文件名避免 Supabase InvalidKey 错误
- 回归检查：R-2024-275
- 状态：verified
- 日期：2024-12-16

---

## P-2024-276 flow-learning 书籍点击使用本地链接

- 项目：flow-learning (信息过滤器)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：bd30e23
- 现象：点击书籍时使用本地链接而非云端链接
- 根因：书籍点击逻辑未优先使用 fileUrl 云端链接
- 修复：书籍点击仅用云端链接，拖拽状态基于 fileUrl
- 回归检查：R-2024-276
- 状态：verified
- 日期：2024-12-16

---

## P-2024-277 flow-learning 导入 App JSON 格式不兼容

- 项目：flow-learning (信息过滤器)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：b11d025
- 现象：无法导入 App 导出的 JSON 文件
- 根因：导入逻辑不支持 App 导出的纯数组 JSON 格式
- 修复：支持 App 导出的纯数组 JSON 格式导入
- 回归检查：R-2024-277
- 状态：verified
- 日期：2024-12-16

---

## P-2024-278 flow-learning 导入按钮不可见

- 项目：flow-learning (信息过滤器)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：72c2ba4
- 现象：导入按钮不显示
- 根因：CSS 样式问题导致按钮不可见
- 修复：添加明确的样式确保按钮可见
- 回归检查：R-2024-278
- 状态：verified
- 日期：2024-12-16

---

## P-2024-279 Full-screen-prompt 多桌面/全屏Space窗口跳回

- 项目：Full-screen-prompt
- 仓库：https://github.com/kexin94yyds/Full-screen-prompt
- 发生版本：ff708d9
- 现象：在多桌面或全屏 Space 环境下，窗口跳回固定桌面
- 根因：窗口创建时未正确处理 macOS 多桌面环境
- 修复：修复多桌面/全屏 Space 下窗口跳回固定桌面的问题
- 回归检查：R-2024-279
- 状态：verified
- 日期：2024-12-16

---

## P-2024-280 Full-screen-prompt 点击提示词无法复制

- 项目：Full-screen-prompt
- 仓库：https://github.com/kexin94yyds/Full-screen-prompt
- 发生版本：73b0605
- 现象：点击提示词无法复制到剪切板
- 根因：复制到剪切板的逻辑有 bug
- 修复：修复点击提示词复制到剪切板功能
- 回归检查：R-2024-280
- 状态：verified
- 日期：2024-12-16

---

## P-2024-281 Full-screen-prompt Perplexity 编辑器插入问题

- 项目：Full-screen-prompt
- 仓库：https://github.com/kexin94yyds/Full-screen-prompt
- 发生版本：61c36fb
- 现象：在 Perplexity 的 Slate 编辑器中插入提示词不可靠
- 根因：Slate 编辑器需要特殊处理：恢复选区、dispatch beforeinput+execCommand、触发 input 事件
- 修复：实现可靠的 Slate 编辑器插入：恢复选区、事件分发、Enter 打开竞态处理、后备编辑器解析、通过防抖和 ensureVisible 守卫修复重复菜单
- 回归检查：R-2024-281
- 状态：verified
- 日期：2024-12-16

---

## P-2024-282 if-compond 授权弹窗邮箱不自动预填充

- 项目：if-compond (ContentDash)
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：07ecbac
- 现象：打开授权弹窗时邮箱字段不自动预填充
- 根因：弹窗打开时未读取已保存的邮箱地址
- 修复：授权弹窗打开时自动预填充邮箱
- 回归检查：R-2024-282
- 状态：verified
- 日期：2024-12-16

---

## P-2024-283 if-compond 缓存数量检查问题

- 项目：if-compond (ContentDash)
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：9db3b02
- 现象：缓存数量不足时仍然使用缓存
- 根因：缓存数量检查逻辑有 bug
- 修复：只有缓存数量足够时才使用缓存
- 回归检查：R-2024-283
- 状态：verified
- 日期：2024-12-16

---

## P-2024-284 if-compond 在线密钥验证问题

- 项目：if-compond (ContentDash)
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：3639519
- 现象：可能存在伪造密钥绕过验证
- 根因：未启用在线密钥验证
- 修复：启用在线密钥验证，防止伪造密钥
- 回归检查：R-2024-284
- 状态：verified
- 日期：2024-12-16

---

## P-2024-285 if-compond 生产环境 User-Agent 缺失

- 项目：if-compond (ContentDash)
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：dba96ac
- 现象：生产环境请求被拒绝
- 根因：生产环境请求缺少 User-Agent header
- 修复：为生产环境添加 User-Agent header
- 回归检查：R-2024-285
- 状态：verified
- 日期：2024-12-16

---

## P-2024-286 if-compond 本地开发与生产 fetch 策略

- 项目：if-compond (ContentDash)
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：50d83a1
- 现象：本地开发和生产环境请求方式不一致导致问题
- 根因：未区分本地开发和生产环境的 fetch 策略
- 修复：生产环境使用直接 fetch，本地开发使用代理
- 回归检查：R-2024-286
- 状态：verified
- 日期：2024-12-16

---

## P-2024-289 relax Netlify 构建错误

- 项目：relax (呼吸练习 Web 应用)
- 仓库：https://github.com/kexin94yyds/relax
- 发生版本：4a3ba70
- 现象：Netlify 构建失败
- 根因：audioContext 未添加到 useEffect 依赖数组
- 修复：添加 audioContext 到 useEffect 依赖数组
- 回归检查：R-2024-273
- 状态：verified
- 日期：2024-12-16

---

## P-2024-290 relax ESLint 错误

- 项目：relax (呼吸练习 Web 应用)
- 仓库：https://github.com/kexin94yyds/relax
- 发生版本：c2b2aa6
- 现象：ESLint 报错
- 根因：audioContext 未添加到 useEffect 依赖数组
- 修复：添加 audioContext 到 useEffect 依赖数组修复 ESLint 错误
- 回归检查：R-2024-274
- 状态：verified
- 日期：2024-12-16

---

## P-2024-291 relax 声音开关功能异常

- 项目：relax (呼吸练习 Web 应用)
- 仓库：https://github.com/kexin94yyds/relax
- 发生版本：15ac7d6
- 现象：声音开关功能不工作
- 根因：soundEnabled 未添加到 useCallback 依赖数组
- 修复：添加 soundEnabled 到 useCallback 依赖数组
- 回归检查：R-2024-275
- 状态：verified
- 日期：2024-12-16

---

## P-2024-292 hack-airdrop Railway 端口配置错误

- 项目：hack-airdrop
- 仓库：https://github.com/kexin94yyds/hack-airdrop
- 发生版本：fb60938
- 现象：Railway 部署后应用无法访问
- 根因：Railway 端口配置不正确
- 修复：修复 Railway 端口配置
- 回归检查：R-2024-276
- 状态：verified
- 日期：2024-12-16

---

## P-2024-293 hack-airdrop Railway 部署配置问题

- 项目：hack-airdrop
- 仓库：https://github.com/kexin94yyds/hack-airdrop
- 发生版本：f1fdeac
- 现象：Railway 部署失败
- 根因：Railway 部署配置有误
- 修复：修复 Railway 部署配置
- 回归检查：R-2024-277
- 状态：verified
- 日期：2024-12-16

---

## P-2024-294 hack-airdrop Vercel 部署配置问题

- 项目：hack-airdrop
- 仓库：https://github.com/kexin94yyds/hack-airdrop
- 发生版本：f8b04d6
- 现象：Vercel 部署失败
- 根因：Vercel 部署配置有误
- 修复：修复 Vercel 部署配置 + 添加 Railway 支持
- 回归检查：R-2024-278
- 状态：verified
- 日期：2024-12-16

---

## P-2024-295 hack-airdrop Vercel 部署配置问题 (第二次)

- 项目：hack-airdrop
- 仓库：https://github.com/kexin94yyds/hack-airdrop
- 发生版本：4963778
- 现象：Vercel 部署配置仍有问题
- 根因：Vercel 部署配置未完全修正
- 修复：修复 Vercel 部署配置
- 回归检查：R-2024-279
- 状态：verified
- 日期：2024-12-16

---

## P-2024-296 program-lesson 中文引号语法错误

- 项目：program-lesson (编程课程网站)
- 仓库：https://github.com/kexin94yyds/program-lesson
- 发生版本：0559a9e
- 现象：代码中存在中文引号导致语法错误
- 根因：错误使用了中文引号
- 修复：修复中文引号语法错误
- 回归检查：R-2024-280
- 状态：verified
- 日期：2024-12-16

---

## P-2024-297 PixelTunePhoto 移动端响应式布局问题

- 项目：PixelTunePhoto
- 仓库：https://github.com/kexin94yyds/PixelTunePhoto
- 发生版本：7e34036
- 现象：移动端布局显示异常
- 根因：workspace 和 sidebar 未在移动端垂直堆叠
- 修复：修复移动端响应式布局，垂直堆叠 workspace 和 sidebar
- 回归检查：R-2024-281
- 状态：verified
- 日期：2024-12-16

---

## P-2024-298 memory-english YouTube 字幕获取失败

- 项目：memory-english (背单词网页)
- 仓库：https://github.com/kexin94yyds/memory-english
- 发生版本：d692b20
- 现象：无法获取 YouTube 字幕
- 根因：需要使用 WebVTT 格式获取字幕
- 修复：使用 YouTube timedtext API 获取 WebVTT 格式字幕
- 回归检查：R-2024-282
- 状态：verified
- 日期：2024-12-16

---

## P-2024-299 memory-english YouTube Transcript API 失效

- 项目：memory-english (背单词网页)
- 仓库：https://github.com/kexin94yyds/memory-english
- 发生版本：8e7fa0c
- 现象：youtube-transcript 库无法获取字幕
- 根因：youtube-transcript 库方式失效
- 修复：改用 YouTube timedtext API 替代 youtube-transcript
- 回归检查：R-2024-283
- 状态：verified
- 日期：2024-12-16

---

## P-2024-300 memory-english Netlify 部署路径问题

- 项目：memory-english (背单词网页)
- 仓库：https://github.com/kexin94yyds/memory-english
- 发生版本：7e2e65f
- 现象：Netlify 部署后页面白屏或资源加载失败
- 根因：vite base path 配置导致资源路径错误
- 修复：移除 vite base path 配置以适配 Netlify 根目录部署
- 回归检查：R-2024-284
- 状态：verified
- 日期：2024-12-16

---

## P-2024-301 me-h (DDK) HTML 语法错误

- 项目：me-h (DDK 个人网站)
- 仓库：https://github.com/kexin94yyds/me-h
- 发生版本：6ac1893
- 现象：HTML 语法错误导致页面显示异常
- 根因：HTML 语法有误
- 修复：修复 HTML 语法错误，完善章节内容
- 回归检查：R-2024-285
- 状态：verified
- 日期：2024-12-16

---

## P-2024-302 me-h (DDK) 18 岁生日礼物 HTML 错误

- 项目：me-h (DDK 个人网站)
- 仓库：https://github.com/kexin94yyds/me-h
- 发生版本：13fd6d3
- 现象：18 岁生日礼物页面 HTML 语法错误
- 根因：HTML 语法有误
- 修复：修复 HTML 语法错误，更新 18 岁生日礼物内容
- 回归检查：R-2024-286
- 状态：verified
- 日期：2024-12-16

---

## P-2024-303 me-h (DDK) Netlify 部署 PNG/JPEG 扩展名问题

- 项目：me-h (DDK 个人网站)
- 仓库：https://github.com/kexin94yyds/me-h
- 发生版本：d6c2339
- 现象：Netlify 部署后图片无法显示
- 根因：vite.config.js 未配置 PNG 和 JPEG 大写扩展名支持
- 修复：在 vite.config.js 中添加 PNG 和 JPEG 大写扩展名支持
- 回归检查：R-2024-287
- 状态：verified
- 日期：2024-12-16

---

## P-2024-304 me-h (DDK) 图片引用路径错误

- 项目：me-h (DDK 个人网站)
- 仓库：https://github.com/kexin94yyds/me-h
- 发生版本：9d0bccc
- 现象：图片无法加载显示
- 根因：使用直接文件路径引用图片，打包后路径失效
- 修复：使用 import 语句和变量引用替换直接文件路径
- 回归检查：R-2024-288
- 状态：verified
- 日期：2024-12-16

---

## P-2024-319 me-h (DDK) JS 文件 404 问题

- 项目：me-h (DDK 个人网站)
- 仓库：https://github.com/kexin94yyds/me-h
- 发生版本：69365de
- 现象：JS 文件加载 404
- 根因：script 标签配置问题
- 修复：更新 vite.config.js 并修复 script 标签
- 回归检查：R-2024-289
- 状态：verified
- 日期：2024-12-16

---

## P-2024-320 me-h (DDK) Vite 打包 script 问题

- 项目：me-h (DDK 个人网站)
- 仓库：https://github.com/kexin94yyds/me-h
- 发生版本：23d3f19
- 现象：Vite 打包后脚本不执行
- 根因：script 标签缺少 type=module 属性
- 修复：添加 type=module 属性解决 Vite 打包问题
- 回归检查：R-2024-290
- 状态：verified
- 日期：2024-12-16

---

## P-2024-321 me-h (DDK) Netlify 部署白屏

- 项目：me-h (DDK 个人网站)
- 仓库：https://github.com/kexin94yyds/me-h
- 发生版本：09f7ebe
- 现象：Netlify 部署后页面白屏
- 根因：缺少 vite.config.js 配置文件
- 修复：添加 vite.config.js 配置文件解决 Netlify 部署白屏问题
- 回归检查：R-2024-291
- 状态：verified
- 日期：2024-12-16

---

## P-2024-322 me-h (DDK) 跑步愿望图片路径错误

- 项目：me-h (DDK 个人网站)
- 仓库：https://github.com/kexin94yyds/me-h
- 发生版本：27e3d27
- 现象：跑步愿望图片无法显示
- 根因：图片引用路径错误
- 修复：更新跑步愿望图片的引用路径
- 回归检查：R-2024-292
- 状态：verified
- 日期：2024-12-16

---

## P-2024-323 me-h (DDK) 文字重叠问题

- 项目：me-h (DDK 个人网站)
- 仓库：https://github.com/kexin94yyds/me-h
- 发生版本：bcf245e
- 现象：页面文字重叠显示
- 根因：CSS 布局问题
- 修复：修复文字重叠问题，优化图片命名
- 回归检查：R-2024-293
- 状态：verified
- 日期：2024-12-16

---

## P-2024-324 Note-taking-tool 标题被 CSS 污染

- 项目：Note-taking-tool (笔记工具)
- 仓库：https://github.com/kexin94yyds/Note-taking-tool
- 发生版本：35ae396
- 现象：提取的标题包含 CSS 样式文本
- 根因：提取标题时未跳过 style/script 标签
- 修复：提取标题时跳过 style/script 标签
- 回归检查：R-2024-294
- 状态：verified
- 日期：2024-12-16

---

## P-2024-325 Note-taking-tool 沉浸式翻译插件按钮重叠

- 项目：Note-taking-tool (笔记工具)
- 仓库：https://github.com/kexin94yyds/Note-taking-tool
- 发生版本：948891a
- 现象：安装沉浸式翻译浏览器插件后按钮重叠
- 根因：CSS 布局与浏览器插件冲突
- 修复：修复沉浸式翻译插件导致的按钮重叠问题
- 回归检查：R-2024-295
- 状态：verified
- 日期：2024-12-16

---

## P-2024-326 Note-taking-tool 清理缓存按钮大小不一致

- 项目：Note-taking-tool (笔记工具)
- 仓库：https://github.com/kexin94yyds/Note-taking-tool
- 发生版本：6a1bcc6
- 现象：黄色清理缓存按钮大小与其他按钮不一致
- 根因：按钮样式未统一
- 修复：添加黄色清理缓存按钮并修复按钮大小一致性问题
- 回归检查：R-2024-296
- 状态：verified
- 日期：2024-12-16


---

## P-2024-305 crawl-Twitter 代理端口和账户锁定问题

- 项目：crawl-Twitter (Twitter 爬虫)
- 仓库：https://github.com/kexin94yyds/crawl-Twitter
- 发生版本：db7c460
- 现象：代理端口配置错误，账户登录后被锁定
- 根因：代理端口配置不正确，登录频率过高触发账户锁定
- 修复：修复代理端口配置，优化账户登录策略
- 回归检查：R-2024-275
- 状态：verified
- 日期：2024-12-16
- 经验：爬虫项目需要正确配置代理，控制请求频率避免账户锁定

---

## P-2024-306 flow-learning EPUB 封面提取失败

- 项目：flow-learning (信息过滤器 Web 版)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：a9461b3
- 现象：部分 EPUB 书籍封面无法正确提取显示
- 根因：不同 EPUB 格式封面存储位置不同，只实现了一种提取方式
- 修复：为 capture.html 和 flow.js 添加完整的 3 种封面提取方法
- 回归检查：R-2024-276
- 状态：verified
- 日期：2024-12-16

---

## P-2024-307 flow-learning localStorage 超限

- 项目：flow-learning (信息过滤器 Web 版)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：5f1715d
- 现象：保存大量书籍封面后，localStorage 超出限制导致数据丢失
- 根因：封面图片 base64 编码后体积过大，localStorage 只有 5MB 限制
- 修复：压缩封面图片防止 localStorage 超限
- 回归检查：R-2024-277
- 状态：verified
- 日期：2024-12-16

---

## P-2024-308 flow-learning 下载书籍文件名问题

- 项目：flow-learning (信息过滤器 Web 版)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：56d015f
- 现象：下载书籍时文件名不正确
- 根因：下载时未使用原始文件名
- 修复：下载书籍时使用原始文件名
- 回归检查：R-2024-278
- 状态：verified
- 日期：2024-12-16

---

## P-2024-309 flow-learning 批量上传未同步到 Supabase

- 项目：flow-learning (信息过滤器 Web 版)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：aef3c59
- 现象：批量上传书籍时数据未同步到 Supabase
- 根因：批量上传逻辑缺少 Supabase 同步和 fileUrl 保存
- 修复：批量上传也上传到 Supabase 并保存 fileUrl
- 回归检查：R-2024-279
- 状态：verified
- 日期：2024-12-16

---

## P-2024-310 flow-learning Supabase InvalidKey 错误

- 项目：flow-learning (信息过滤器 Web 版)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：750b191
- 现象：上传文件到 Supabase 时报 InvalidKey 错误
- 根因：文件名包含特殊字符导致 Supabase 无法处理
- 修复：使用简化文件名避免 Supabase InvalidKey 错误
- 回归检查：R-2024-280
- 状态：verified
- 日期：2024-12-16

---

## P-2024-311 flow-learning Supabase anon key 过期

- 项目：flow-learning (信息过滤器 Web 版)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：2587b6f
- 现象：Supabase 连接失败
- 根因：Supabase anon key 已过期或更换
- 修复：更新 Supabase anon key
- 回归检查：R-2024-281
- 状态：verified
- 日期：2024-12-16

---

## P-2024-312 flow-learning 书籍点击链接问题

- 项目：flow-learning (信息过滤器 Web 版)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：bd30e23
- 现象：点击书籍时链接不正确，拖拽状态判断有问题
- 根因：书籍点击未使用云端链接，拖拽状态判断逻辑有误
- 修复：书籍点击仅用云端链接，拖拽状态基于 fileUrl 判断
- 回归检查：R-2024-282
- 状态：verified
- 日期：2024-12-16

---

## P-2024-313 flow-learning 导入 JSON 格式兼容问题

- 项目：flow-learning (信息过滤器 Web 版)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：b11d025
- 现象：无法导入 App 导出的数据
- 根因：App 导出的是纯数组 JSON 格式，Web 版不支持
- 修复：支持 App 导出的纯数组 JSON 格式
- 回归检查：R-2024-283
- 状态：verified
- 日期：2024-12-16

---

## P-2024-314 flow-learning 行内编辑和全屏窗口跳动

- 项目：flow-learning (信息过滤器 Web 版)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：b89c037
- 现象：行内编辑时有问题，全屏应用前窗口跳动
- 根因：编辑和窗口位置逻辑有问题
- 修复：修复行内编辑和全屏应用前窗口跳动问题
- 回归检查：R-2024-284
- 状态：verified
- 日期：2024-12-16

---

## P-2024-315 flow-learning 导入按钮不显示

- 项目：flow-learning (信息过滤器 Web 版)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：72c2ba4
- 现象：导入按钮不可见
- 根因：CSS 样式问题导致按钮不显示
- 修复：添加明确的样式确保导入按钮可见
- 回归检查：R-2024-285
- 状态：verified
- 日期：2024-12-16

---

## P-2024-316 flow-learning Web Dashboard JS 错误

- 项目：flow-learning (信息过滤器 Web 版)
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：c31eb0a
- 现象：Web Dashboard 有 JS 错误
- 根因：JavaScript 代码有错误
- 修复：修复 Web Dashboard JS 错误
- 回归检查：R-2024-286
- 状态：verified
- 日期：2024-12-16

---

## P-2024-317 Full-screen-prompt 全屏应用前窗口跳动

- 项目：Full-screen-prompt
- 仓库：https://github.com/kexin94yyds/Full-screen-prompt
- 发生版本：5d52bff
- 现象：在全屏应用前窗口跳动
- 根因：窗口位置计算未正确处理全屏应用场景
- 修复：修复窗口在全屏应用前跳动的问题
- 回归检查：R-2024-287
- 状态：verified
- 日期：2024-12-16

---

## P-2024-318 Book (epub.js) Node.js 版本兼容性和构建问题

- 项目：Book (epub.js 阅读器)
- 仓库：https://github.com/kexin94yyds/Book
- 发生版本：259ecbe
- 现象：部署时构建失败，Node.js 版本不兼容
- 根因：
  1. Node.js 版本过低
  2. 缺少 OpenSSL legacy provider 配置
  3. 缺少 crypto polyfills
- 修复：
  1. 更新 Node.js 版本到 18.16.0
  2. 添加 OpenSSL legacy provider 配置
  3. 添加 crypto polyfills
  4. 更新 npm 版本到 9.5.1
  5. 添加完整的部署配置
- 回归检查：R-2024-288
- 状态：verified
- 日期：2024-12-16
- 经验：epub.js 等旧项目部署时需要处理 Node.js 版本兼容性和 crypto API 变化

---

## P-2024-327 Note-taking-tool 标题被CSS污染

- 项目：Note-taking-tool
- 仓库：https://github.com/kexin94yyds/Note-taking-tool
- 发生版本：35ae396
- 现象：提取标题时包含CSS样式文本
- 根因：标题提取逻辑未跳过 style/script 标签
- 修复：修复标题提取逻辑，跳过样式标签
- 回归检查：R-2024-327
- 状态：verified
- 日期：2024-12-16

---

## P-2024-328 Note-taking-tool 沉浸式翻译插件导致按钮重叠

- 项目：Note-taking-tool
- 仓库：https://github.com/kexin94yyds/Note-taking-tool
- 发生版本：948891a
- 现象：安装沉浸式翻译浏览器插件后，按钮出现重叠
- 根因：插件注入的元素与原有按钮布局冲突
- 修复：修复按钮布局，避免与插件冲突
- 回归检查：R-2024-328
- 状态：verified
- 日期：2024-12-16

---

## P-2024-329 Note-taking-tool 按钮大小不一致

- 项目：Note-taking-tool
- 仓库：https://github.com/kexin94yyds/Note-taking-tool
- 发生版本：6a1bcc6
- 现象：清理缓存按钮与其他按钮大小不一致
- 根因：CSS 样式未统一
- 修复：添加黄色清理缓存按钮并修复按钮大小一致性问题
- 回归检查：R-2024-329
- 状态：verified
- 日期：2024-12-16

---

## P-2024-330 PixelTunePhoto 移动端响应式布局问题

- 项目：PixelTunePhoto
- 仓库：https://github.com/kexin94yyds/PixelTunePhoto
- 发生版本：7e34036
- 现象：移动端工作区和侧边栏布局错乱
- 根因：响应式布局未正确处理移动端
- 修复：移动端响应式布局 - 工作区和侧边栏垂直堆叠
- 回归检查：R-2024-330
- 状态：verified
- 日期：2024-12-16

---

## P-2024-331 program-lesson 中文引号语法错误

- 项目：program-lesson
- 仓库：https://github.com/kexin94yyds/program-lesson
- 发生版本：0559a9e
- 现象：代码中存在中文引号导致语法错误
- 根因：编辑时误用中文引号
- 修复：修复中文引号语法错误
- 回归检查：R-2024-331
- 状态：verified
- 日期：2024-12-16

---

## P-2024-332 relax Netlify构建错误

- 项目：relax
- 仓库：https://github.com/kexin94yyds/relax
- 发生版本：4a3ba70
- 现象：Netlify 构建时 React hooks 依赖数组警告导致失败
- 根因：audioContext 未添加到 useEffect 依赖数组
- 修复：添加 audioContext 到 useEffect 依赖数组
- 回归检查：R-2024-332
- 状态：verified
- 日期：2024-12-16

---

## P-2024-333 relax ESLint错误

- 项目：relax
- 仓库：https://github.com/kexin94yyds/relax
- 发生版本：c2b2aa6
- 现象：ESLint 报错缺少依赖
- 根因：audioContext 未添加到 useEffect 依赖数组
- 修复：添加 audioContext 到 useEffect 依赖数组
- 回归检查：R-2024-333
- 状态：verified
- 日期：2024-12-16

---

## P-2024-334 relax 声音开关功能异常

- 项目：relax
- 仓库：https://github.com/kexin94yyds/relax
- 发生版本：15ac7d6
- 现象：声音开关功能不工作
- 根因：soundEnabled 未添加到 useCallback 依赖数组
- 修复：添加 soundEnabled 到 useCallback 依赖数组
- 回归检查：R-2024-334
- 状态：verified
- 日期：2024-12-16

---

## P-2024-335 RI 笔记功能多个关键问题

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：5c9b299
- 现象：笔记功能存在多个问题
- 根因：多处逻辑错误
- 修复：修复笔记功能的多个关键问题
- 回归检查：R-2024-335
- 状态：verified
- 日期：2024-12-16

---

## P-2024-336 RI 列表项编辑后保存问题

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：a71758f
- 现象：列表项编辑后未正确保存
- 根因：保存函数调用错误
- 修复：列表项编辑后正确保存（使用 updateWord）
- 回归检查：R-2024-336
- 状态：verified
- 日期：2024-12-16

---

## P-2024-337 RI 笔记导出按钮保存后主页未刷新

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：753544e
- 现象：笔记导出按钮保存后主页不自动刷新
- 根因：缺少刷新逻辑
- 修复：笔记导出按钮保存后主页自动刷新
- 回归检查：R-2024-337
- 状态：verified
- 日期：2024-12-16

---

## P-2024-338 RI 笔记窗口置顶按钮状态不同步

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：4adb935
- 现象：笔记窗口置顶按钮状态与实际状态不同步
- 根因：状态同步逻辑缺失
- 修复：笔记窗口置顶按钮状态同步
- 回归检查：R-2024-338
- 状态：verified
- 日期：2024-12-16

---

## P-2024-339 RI 打包后应用 currentModeId 未迁移

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：4837e3a
- 现象：打包后应用 currentModeId 未自动迁移
- 根因：迁移逻辑缺失
- 修复：打包后应用自动迁移 currentModeId
- 回归检查：R-2024-339
- 状态：verified
- 日期：2024-12-16

---

## P-2024-340 RI 笔记窗口关闭后无法再次打开

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：9460ad4
- 现象：笔记窗口关闭后无法再次打开
- 根因：窗口状态管理问题
- 修复：修复笔记窗口关闭后无法再次打开的问题
- 回归检查：R-2024-340
- 状态：verified
- 日期：2024-12-16

---

## P-2024-341 RI 导入/清空后模式跳转问题

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：a24ce40
- 现象：导入或清空数据后模式跳转异常
- 根因：模式跳转逻辑错误
- 修复：修复导入/清空后模式跳转的问题
- 回归检查：R-2024-341
- 状态：verified
- 日期：2024-12-16

---

## P-2024-342 RI 访问已销毁的窗口对象

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：a84f8ea
- 现象：访问已销毁的窗口对象导致错误
- 根因：窗口销毁后未检查状态
- 修复：防止访问已销毁的窗口对象
- 回归检查：R-2024-342
- 状态：verified
- 日期：2024-12-16

---

## P-2024-343 RI 列表排序问题

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：ec140f3
- 现象：最新保存的内容不显示在列表顶部
- 根因：排序逻辑错误
- 修复：修复排序，最新保存的内容现在显示在列表顶部
- 回归检查：R-2024-343
- 状态：verified
- 日期：2024-12-16

---

## P-2024-344 RI note-window.js 笔记保存功能问题

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：f32ac77
- 现象：note-window.js 笔记保存功能异常
- 根因：存储方式问题
- 修复：关键修复 - note-window.js 笔记保存功能迁移到 IndexedDB
- 回归检查：R-2024-344
- 状态：verified
- 日期：2024-12-16

---

## P-2024-345 RI 全面保存功能问题

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：72e1799
- 现象：多处保存功能异常
- 根因：多处逻辑错误
- 修复：全面修复所有保存功能
- 回归检查：R-2024-345
- 状态：verified
- 日期：2024-12-16

---

## P-2024-346 RI 快速保存功能问题

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：b73808f
- 现象：快速保存功能异常
- 根因：存储方式问题
- 修复：紧急修复 - 快速保存功能迁移到 IndexedDB
- 回归检查：R-2024-346
- 状态：verified
- 日期：2024-12-16

---

## P-2024-347 RI IndexedDB 集成问题

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：29691ec
- 现象：IndexedDB 集成存在多个问题
- 根因：集成逻辑不完善
- 修复：全面修复 IndexedDB 集成问题
- 回归检查：R-2024-347
- 状态：verified
- 日期：2024-12-16

---

## P-2024-348 RI IndexedDB 数据加载问题

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：05a15fb
- 现象：IndexedDB 数据加载失败
- 根因：加载逻辑错误
- 修复：修复 IndexedDB 数据加载问题
- 回归检查：R-2024-348
- 状态：verified
- 日期：2024-12-16

---

## P-2024-349 RI deleteMode 函数重复声明

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：9cf6a43
- 现象：deleteMode 函数重复声明导致错误
- 根因：代码重复
- 修复：修复 deleteMode 函数重复声明问题
- 回归检查：R-2024-349
- 状态：verified
- 日期：2024-12-16

---

## P-2024-350 RI 笔记格式修改丢失

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：67f2b05
- 现象：笔记格式修改后丢失
- 根因：格式保存逻辑问题
- 修复：修复笔记格式修改丢失的问题
- 回归检查：R-2024-350
- 状态：verified
- 日期：2024-12-16

---

## P-2024-351 RI 笔记窗口关闭按钮不起作用

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：08c41c7
- 现象：笔记窗口关闭按钮点击无效
- 根因：事件绑定问题
- 修复：修复笔记窗口关闭按钮不起作用的问题
- 回归检查：R-2024-351
- 状态：verified
- 日期：2024-12-16

---

## P-2024-352 RI 打包配置 electron-store 模块找不到

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：e1a39a0
- 现象：打包后 electron-store 模块找不到
- 根因：打包配置未包含 node_modules
- 修复：修复打包配置 - 包含 node_modules 以解决 electron-store 模块找不到的问题
- 回归检查：R-2024-352
- 状态：verified
- 日期：2024-12-16

---

## P-2024-353 RI 通知图标路径错误

- 项目：RI
- 仓库：https://github.com/kexin94yyds/RI
- 发生版本：2a49cb9
- 现象：通知图标显示异常
- 根因：图标路径引用了已删除的文件
- 修复：修复通知图标路径，使用 RI.png 替代已删除的信息置换.png
- 回归检查：R-2024-353
- 状态：verified
- 日期：2024-12-16


---

## P-2024-400 iterate pnpm版本冲突问题

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：45ffc97
- 现象：pnpm 版本冲突导致依赖安装失败
- 根因：pnpm 版本不兼容
- 修复：修复 pnpm 版本冲突问题
- 回归检查：R-2024-310
- 状态：verified
- 日期：2024-12-16

---

## P-2024-401 iterate GitHub Actions配置问题

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：8bf68ba
- 现象：GitHub Actions 配置错误导致 CI 失败
- 根因：CI 配置文件有误
- 修复：修复 GitHub Actions 配置
- 回归检查：R-2024-311
- 状态：verified
- 日期：2024-12-16

---

## P-2024-402 iterate Cargo.lock导致分支切换问题

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：305b77d
- 现象：发布脚本中 Cargo.lock 导致分支切换失败
- 根因：Cargo.lock 文件状态影响 git 分支切换
- 修复：修复发布脚本中 Cargo.lock 导致的分支切换问题
- 回归检查：R-2024-312
- 状态：verified
- 日期：2024-12-16

---

## P-2024-403 iterate 发布脚本分支合并逻辑缺失

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：fd97f1a
- 现象：发布脚本缺少分支合并逻辑
- 根因：发布流程不完整
- 修复：发布脚本添加分支合并逻辑
- 回归检查：R-2024-313
- 状态：verified
- 日期：2024-12-16

---

## P-2024-404 iterate 取消发布时退出逻辑问题

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：db2b8b0
- 现象：取消发布时退出逻辑不正确
- 根因：退出逻辑处理有误
- 修复：修复取消发布时的退出逻辑
- 回归检查：R-2024-314
- 状态：verified
- 日期：2024-12-16

---

## P-2024-405 iterate 版本选择函数输出重定向问题

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：8700839
- 现象：版本选择函数输出重定向错误
- 根因：输出重定向逻辑有误
- 修复：修复版本选择函数输出重定向问题
- 回归检查：R-2024-315
- 状态：verified
- 日期：2024-12-16

---

## P-2024-406 iterate 发布脚本菜单显示问题

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：cfc10e3
- 现象：发布脚本菜单显示异常
- 根因：菜单显示逻辑有误
- 修复：修复发布脚本菜单显示问题
- 回归检查：R-2024-316
- 状态：verified
- 日期：2024-12-16

---

## P-2024-407 iterate 错误信息输出问题

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：40d20ce
- 现象：错误信息输出冗余，日志打印过多
- 根因：日志打印逻辑过于复杂
- 修复：修复错误信息输出，简化提示内容，移除多余的日志打印
- 回归检查：R-2024-317
- 状态：verified
- 日期：2024-12-16

---

## P-2024-408 cunzhi-knowledge 验收流程子代理 commit 问题

- 项目：cunzhi-knowledge
- 仓库：https://github.com/kexin94yyds/cunzhi-knowledge
- 发生版本：05f3b60
- 现象：验收流程中子代理单独 commit 导致冲突
- 根因：验收流程设计不合理
- 修复：调整验收流程，子代理不单独 commit
- 回归检查：R-2024-318
- 状态：verified
- 日期：2024-12-16

---

## P-2024-409 cunzhi-knowledge 提示词格式问题

- 项目：cunzhi-knowledge
- 仓库：https://github.com/kexin94yyds/cunzhi-knowledge
- 发生版本：5247e58
- 现象：提示词格式不规范，"你是子代理现在帮我做"位置错误
- 根因：提示词模板设计问题
- 修复：调整提示词格式，将该提示放到最后
- 回归检查：R-2024-319
- 状态：verified
- 日期：2024-12-16

---

## P-2024-410 iterate 移动窗口中文输入候选栏移位

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：e4eec0d
- 现象：移动窗口时中文输入法候选栏位置移位
- 根因：窗口移动事件未正确更新输入法候选栏位置
- 修复：修复移动窗口中文输入候选栏移位bug
- 回归检查：R-2024-320
- 状态：verified
- 日期：2024-12-16

---

## P-2024-411 iterate 首次启动缺少 config.json 主题异常

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：bb7e3f4
- 现象：首次启动缺少 config.json 时页面主题显示异常
- 根因：初始化时未处理配置文件不存在的情况
- 修复：使用默认深色主题，优化主题加载逻辑
- 回归检查：R-2024-321
- 状态：verified
- 日期：2024-12-16

---

## P-2024-412 iterate 多开时配置不同步

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：3990cc0
- 现象：多开 iterate 实例时配置不同步
- 根因：未采用单实例模式，窗口焦点切换时未重新加载配置
- 修复：采用单实例模式并监听窗口焦点，解决多开时配置不同步问题
- 回归检查：R-2024-322
- 状态：verified
- 日期：2024-12-16

---

## P-2024-413 zhuyili 活动记录秒级时长显示问题

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：02495d7
- 现象：活动记录未显示秒级时长
- 根因：时长格式化逻辑不包含秒数
- 修复：show second-level durations in activity records
- 回归检查：R-2024-323
- 状态：verified
- 日期：2024-12-16

---

## P-2024-414 zhuyili 计时器时间归零问题

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：f66e200
- 现象：计时器运行时 elapsedTime 存储为 0，同步后时间归零
- 根因：saveData() 未实时计算运行中计时器的 elapsedTime
- 修复：实时计算 elapsedTime，云端加载时保护正在运行的计时器
- 回归检查：R-2024-324
- 状态：verified
- 日期：2024-12-16

---

## P-2024-415 zhuyili 实时活动刷新问题

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：28aa27f
- 现象：活动记录不实时刷新
- 根因：刷新逻辑未正确触发
- 修复：fix realtime activity refresh
- 回归检查：R-2024-325
- 状态：verified
- 日期：2024-12-16

---

## P-2024-416 zhuyili Supabase 客户端访问方式错误

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：9a97f1f
- 现象：白名单检查无法访问 Supabase
- 根因：使用 window.supabase 而非正确的接口
- 修复：将 window.supabase 改为 window.supabaseClient?.getClient()
- 回归检查：R-2024-326
- 状态：verified
- 日期：2024-12-16

---

## P-2024-417 zhuyili 微信支付购买按钮事件绑定问题

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：50c06ff
- 现象：购买按钮点击事件未正确绑定，试用次数逻辑错误
- 根因：事件绑定位置不正确，与试用按钮事件冲突
- 修复：在 lockPremiumFeatures 中动态绑定购买按钮事件
- 回归检查：R-2024-327
- 状态：verified
- 日期：2024-12-16

---

## P-2024-418 zhuyili 二维码不显示问题

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：8a1a472
- 现象：点击立即购买按钮后无法显示二维码
- 根因：API 返回字段名为 code_url 而非 codeUrl
- 修复：修正 API 返回字段名
- 回归检查：R-2024-328
- 状态：verified
- 日期：2024-12-16

---

## P-2024-419 zhuyili payment.js 缺失函数

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：5ae20e0
- 现象：支付功能无法工作，报 ReferenceError
- 根因：payment.js 缺少 addTrialClickListeners 等函数
- 修复：添加缺失的函数定义
- 回归检查：R-2024-329
- 状态：verified
- 日期：2024-12-16

---

## P-2024-420 zhuyili Google 登录回调 URL 错误

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：bb5cf07
- 现象：登录后重定向到 localhost:3000
- 根因：redirectUrl 配置为错误的域名
- 修复：更新 redirectUrl 为正确的 Netlify 域名
- 回归检查：R-2024-330
- 状态：verified
- 日期：2024-12-16

---

## P-2024-421 zhuyili 生产环境 OAuth 回调问题

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：a459f6c
- 现象：生产环境 OAuth 回调跳回本地导致 Cannot GET /
- 根因：OAuth 回调未固定到正式域名
- 修复：生产环境 OAuth 回调固定到 Netlify 正式域名
- 回归检查：R-2024-331
- 状态：verified
- 日期：2024-12-16

---

## P-2024-422 zhuyili OAuth 重定向 URL 适配问题

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：eeb5a17
- 现象：Netlify 404 回跳问题
- 根因：OAuth 重定向 URL 未自动适配当前域
- 修复：OAuth 重定向 URL 自动适配当前域
- 回归检查：R-2024-332
- 状态：verified
- 日期：2024-12-16

---

## P-2024-423 zhuyili 端口冲突问题

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：371e32a
- 现象：服务器端口 8080 被占用导致启动失败
- 根因：端口冲突
- 修复：将服务器端口从 8080 改为 8888
- 回归检查：R-2024-333
- 状态：verified
- 日期：2024-12-16

---

## P-2024-424 AI- AI Studio URL 路径错误

- 项目：AI-
- 仓库：https://github.com/kexin94yyds/AI-
- 发生版本：4bcfedb
- 现象：AI Studio URL 路径不正确
- 根因：URL 路径配置错误
- 修复：修正 AI Studio URL 为 /apps 路径
- 回归检查：R-2024-334
- 状态：verified
- 日期：2024-12-16

---

## P-2024-425 AI- 图标路径错误

- 项目：AI-
- 仓库：https://github.com/kexin94yyds/AI-
- 发生版本：e4ec716
- 现象：图标无法显示
- 根因：图标路径引用错误
- 修复：copy icons to web directory and update references
- 回归检查：R-2024-335
- 状态：verified
- 日期：2024-12-16

---

## P-2024-426 AI-Sidebar message 监听器 await 语法错误

- 项目：AI-Sidebar
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：29239bf
- 现象：await is only valid in async functions 错误
- 根因：message 事件监听器回调函数非 async
- 修复：将 message 事件监听器回调函数改为 async
- 回归检查：R-2024-336
- 状态：verified
- 日期：2024-12-16

---

## P-2024-427 AI-Sidebar Starred 按钮显示对号问题

- 项目：AI-Sidebar
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：0d23c83
- 现象：Starred 按钮显示对号而不是星号
- 根因：反馈文本恢复时保存了错误的文本状态
- 修复：硬编码恢复文本为 '★ Starred'
- 回归检查：R-2024-337
- 状态：verified
- 日期：2024-12-16

---

## P-2024-428 AI-Sidebar History Remove 点击处理问题

- 项目：AI-Sidebar
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：137142a
- 现象：History 中 Remove 按钮点击无效
- 根因：事件委托处理不正确
- 修复：delegate Remove click handling to panel
- 回归检查：R-2024-338
- 状态：verified
- 日期：2024-12-16

---

## P-2024-429 AI-Sidebar URL 包含 & 时 Remove 失效

- 项目：AI-Sidebar
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：9b9ad84
- 现象：URL 包含 & 符号时 Remove 功能失效
- 根因：属性值未正确解码
- 修复：decoding attribute values，normalize URL
- 回归检查：R-2024-339
- 状态：verified
- 日期：2024-12-16

---

## P-2024-430 AI-Sidebar ChatGPT/Gemini 嵌套框架 URL 同步问题

- 项目：AI-Sidebar
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：005d64e
- 现象：嵌套 iframe 中内容脚本无法向扩展面板发送消息
- 根因：使用 window.parent.postMessage 无法跨越嵌套框架
- 修复：使用 window.top.postMessage 替代
- 回归检查：R-2024-340
- 状态：verified
- 日期：2024-12-16

---

## P-2024-431 program-lesson 中文引号语法错误

- 项目：program-lesson
- 仓库：https://github.com/kexin94yyds/program-lesson
- 发生版本：0559a9e
- 现象：代码中存在中文引号导致语法错误
- 根因：误输入中文引号
- 修复：修复中文引号语法错误
- 回归检查：R-2024-341
- 状态：verified
- 日期：2024-12-16

---

## P-2024-432 if-compond 授权弹窗邮箱不自动预填充

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：07ecbac
- 现象：授权弹窗打开时邮箱不自动预填充
- 根因：预填充逻辑未触发
- 修复：修复授权弹窗打开时邮箱预填充问题
- 回归检查：R-2024-342
- 状态：verified
- 日期：2024-12-16

---

## P-2024-433 if-compond 缓存数量检查问题

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：9db3b02
- 现象：缓存数量不足时仍使用缓存
- 根因：缓存数量检查逻辑不正确
- 修复：只有缓存数量足够时才使用
- 回归检查：R-2024-343
- 状态：verified
- 日期：2024-12-16

---

## P-2024-434 if-compond 置顶博主优先显示问题

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：78531f6
- 现象：置顶博主未优先显示
- 根因：排序逻辑问题
- 修复：置顶博主优先显示 + Twitter 抓取 50 条 + 回复转推限 10 条
- 回归检查：R-2024-344
- 状态：verified
- 日期：2024-12-16

---

## P-2024-435 if-compond Supabase URL 配置错误

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：33d2922
- 现象：Supabase 连接失败
- 根因：URL 配置少了字母 i
- 修复：修正 Supabase URL 配置
- 回归检查：R-2024-345
- 状态：verified
- 日期：2024-12-16

---

## P-2024-436 if-compond 在线密钥验证问题

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：3639519
- 现象：可伪造密钥绕过验证
- 根因：未启用在线密钥验证
- 修复：启用在线密钥验证，防止伪造密钥
- 回归检查：R-2024-346
- 状态：verified
- 日期：2024-12-16

---

## P-2024-437 if-compond 生产环境 User-Agent 问题

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：dba96ac
- 现象：生产环境请求被拒绝
- 根因：缺少 User-Agent header
- 修复：add User-Agent header for production
- 回归检查：R-2024-347
- 状态：verified
- 日期：2024-12-16

---

## P-2024-438 if-compond 本地开发 Netlify Blobs 缓存问题

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：cf1ba48
- 现象：本地开发时 Netlify Blobs 缓存导致问题
- 根因：本地开发不应使用 Netlify Blobs 缓存
- 修复：skip Netlify Blobs cache in local dev
- 回归检查：R-2024-348
- 状态：verified
- 日期：2024-12-16

---

## P-2024-439 if-compond 生产环境 fetch 代理问题

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：50d83a1
- 现象：生产环境请求走代理导致问题
- 根因：代理配置不区分环境
- 修复：use direct fetch in production, proxy only for local dev
- 回归检查：R-2024-349
- 状态：verified
- 日期：2024-12-16

---

## P-2024-440 flow-learning EPUB 封面提取问题

- 项目：flow-learning
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：a9461b3
- 现象：EPUB 封面无法正确提取
- 根因：封面提取方法不完整
- 修复：为 capture.html 和 flow.js 添加完整的 3 种封面提取方法
- 回归检查：R-2024-350
- 状态：verified
- 日期：2024-12-16

---

## P-2024-441 flow-learning localStorage 超限问题

- 项目：flow-learning
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：5f1715d
- 现象：封面图片过大导致 localStorage 超限
- 根因：未压缩封面图片
- 修复：压缩封面图片防止 localStorage 超限
- 回归检查：R-2024-351
- 状态：verified
- 日期：2024-12-16

---

## P-2024-442 flow-learning 下载书籍文件名问题

- 项目：flow-learning
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：56d015f
- 现象：下载书籍时文件名不正确
- 根因：未使用原始文件名
- 修复：下载书籍时使用原始文件名
- 回归检查：R-2024-352
- 状态：verified
- 日期：2024-12-16

---

## P-2024-443 flow-learning 批量上传 Supabase 问题

- 项目：flow-learning
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：aef3c59
- 现象：批量上传未上传到 Supabase
- 根因：批量上传逻辑未包含 Supabase 上传
- 修复：批量上传也上传到 Supabase 并保存 fileUrl
- 回归检查：R-2024-353
- 状态：verified
- 日期：2024-12-16

---

## P-2024-354 flow-learning Supabase InvalidKey 错误

- 项目：flow-learning
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：750b191
- 现象：上传时报 InvalidKey 错误
- 根因：文件名包含特殊字符
- 修复：使用简化文件名避免 Supabase InvalidKey 错误
- 回归检查：R-2024-354
- 状态：verified
- 日期：2024-12-16

---

## P-2024-355 flow-learning Supabase anon key 问题

- 项目：flow-learning
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：2587b6f
- 现象：Supabase 连接失败
- 根因：anon key 过期或错误
- 修复：更新 Supabase anon key
- 回归检查：R-2024-355
- 状态：verified
- 日期：2024-12-16

---

## P-2024-356 flow-learning 书籍点击云端链接问题

- 项目：flow-learning
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：bd30e23
- 现象：书籍点击未使用云端链接，拖拽状态判断错误
- 根因：链接和状态逻辑不正确
- 修复：书籍点击仅用云端链接，拖拽状态基于 fileUrl
- 回归检查：R-2024-356
- 状态：verified
- 日期：2024-12-16

---

## P-2024-357 flow-learning 导入 JSON 格式问题

- 项目：flow-learning
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：b11d025
- 现象：无法导入 App 导出的纯数组 JSON 格式
- 根因：导入逻辑不支持该格式
- 修复：支持 App 导出的纯数组 JSON 格式
- 回归检查：R-2024-357
- 状态：verified
- 日期：2024-12-16

---

## P-2024-358 flow-learning 行内编辑和全屏窗口跳动问题

- 项目：flow-learning
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：b89c037
- 现象：行内编辑使用模态框，全屏应用前窗口跳动
- 根因：编辑方式和窗口可见性逻辑不当
- 修复：实现行内编辑，移除 200ms 后还原工作区可见性逻辑
- 回归检查：R-2024-358
- 状态：verified
- 日期：2024-12-16

---

## P-2024-451 if-compond 授权弹窗邮箱不自动预填充

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：07ecbac
- 现象：授权弹窗打开时邮箱不自动预填充
- 根因：邮箱预填充逻辑缺失或未正确触发
- 修复：修复授权弹窗打开时邮箱不自动预填充的问题
- 回归检查：R-2024-354
- 状态：verified
- 日期：2024-12-16

---

## P-2024-457 if-compond 缓存数量检查逻辑

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：9db3b02
- 现象：缓存数量不足时仍尝试使用缓存
- 根因：缓存数量检查逻辑不完善
- 修复：缓存数量检查 - 只有缓存数量足够时才使用
- 回归检查：R-2024-355
- 状态：verified
- 日期：2024-12-16

---

## P-2024-458 if-compond 置顶博主排序和Twitter抓取限制

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：78531f6
- 现象：置顶博主未优先显示，Twitter抓取和回复转推数量未限制
- 根因：排序逻辑和抓取参数未正确配置
- 修复：置顶博主优先显示 + Twitter抓取50条 + 回复转推限10条
- 回归检查：R-2024-356
- 状态：verified
- 日期：2024-12-16

---

## P-2024-459 if-compond Supabase URL配置错误

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：33d2922
- 现象：Supabase 连接失败
- 根因：Supabase URL 配置少了字母 i
- 修复：修正 Supabase URL 配置（少了i）
- 回归检查：R-2024-357
- 状态：verified
- 日期：2024-12-16

---

## P-2024-460 if-compond 密钥验证安全问题

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：3639519
- 现象：可能存在伪造密钥绕过验证
- 根因：密钥验证仅在本地进行，未启用在线验证
- 修复：启用在线密钥验证，防止伪造密钥
- 回归检查：R-2024-358
- 状态：verified
- 日期：2024-12-16

---

## P-2024-359 if-compond 生产环境User-Agent缺失

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：dba96ac
- 现象：生产环境请求可能被拒绝
- 根因：HTTP 请求缺少 User-Agent header
- 修复：add User-Agent header for production
- 回归检查：R-2024-359
- 状态：verified
- 日期：2024-12-16

---

## P-2024-360 if-compond 本地开发环境缓存问题

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：cf1ba48
- 现象：本地开发时 Netlify Blobs 缓存导致问题
- 根因：本地开发环境不应使用 Netlify Blobs 缓存
- 修复：skip Netlify Blobs cache in local dev
- 回归检查：R-2024-360
- 状态：verified
- 日期：2024-12-16

---

## P-2024-361 if-compond 生产环境请求代理问题

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：50d83a1
- 现象：生产环境请求路由不正确
- 根因：生产和本地开发环境的请求方式未区分
- 修复：use direct fetch in production, proxy only for local dev
- 回归检查：R-2024-361
- 状态：verified
- 日期：2024-12-16

---

## P-2024-444 iterate 移动窗口中文输入候选栏移位

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：e4eec0d
- 现象：移动窗口时中文输入法候选栏位置错误
- 根因：窗口移动事件未正确更新输入法候选栏位置
- 修复：修复移动窗口时中文输入候选栏移位的问题
- 回归检查：R-2024-354
- 状态：verified
- 日期：2024-12-16

---

## P-2024-445 iterate 首次启动缺少 config.json 导致主题异常

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：bb7e3f4
- 现象：首次启动时页面主题显示异常
- 根因：缺少 config.json 时未正确初始化默认主题
- 修复：首次启动缺少 config.json 时正确初始化主题
- 回归检查：R-2024-355
- 状态：verified
- 日期：2024-12-16

---

## P-2024-446 iterate 多开时配置不同步

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：3990cc0
- 现象：多开应用时配置不同步
- 根因：多实例间未共享配置状态
- 修复：采用单实例模式并监听窗口焦点，解决多开时配置不同步的问题
- 回归检查：R-2024-356
- 状态：verified
- 日期：2024-12-16

---

## P-2024-447 iterate 增强快捷键默认值问题

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：0654f85
- 现象：增强快捷键默认值不正确
- 根因：默认值配置错误
- 修复：更新增强快捷键的默认值并优化日志输出
- 回归检查：R-2024-357
- 状态：verified
- 日期：2024-12-16

---

## P-2024-448 iterate 状态同步逻辑导致白屏

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：d591382
- 现象：可能出现白屏问题
- 根因：状态同步逻辑过于复杂
- 修复：简化状态同步逻辑，修复可能的白屏问题
- 回归检查：R-2024-358
- 状态：verified
- 日期：2024-12-16

---

## P-2024-449 iterate proc-macro 编译问题

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：844283b
- 现象：proc-macro 编译失败
- 根因：static linking flag 导致编译问题
- 修复：移除 static linking flag 解决 proc-macro 编译问题
- 回归检查：R-2024-359
- 状态：verified
- 日期：2024-12-16

---

## P-2024-450 iterate applyFontVariables 函数重复

- 项目：iterate
- 仓库：https://github.com/kexin94yyds/iterate
- 发生版本：9044f5b
- 现象：applyFontVariables 函数重复声明
- 根因：代码重复
- 修复：移除重复的 applyFontVariables 函数
- 回归检查：R-2024-360
- 状态：verified
- 日期：2024-12-16

---

## P-2024-461 zhuyili 活动记录秒级时长不显示

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：02495d7
- 现象：活动记录中秒级时长不显示
- 根因：时长显示逻辑未包含秒级
- 修复：显示活动记录中的秒级时长
- 回归检查：R-2024-361
- 状态：verified
- 日期：2024-12-16

---

## P-2024-362 zhuyili 计时器时间归零

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：f66e200
- 现象：计时器时间归零
- 根因：计时器状态管理问题
- 修复：修复计时器时间归零问题
- 回归检查：R-2024-362
- 状态：verified
- 日期：2024-12-16

---

## P-2024-363 zhuyili 活动记录实时刷新问题

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：28aa27f
- 现象：活动记录不实时刷新
- 根因：刷新逻辑缺失
- 修复：修复活动记录实时刷新
- 回归检查：R-2024-363
- 状态：verified
- 日期：2024-12-16

---

## P-2024-364 zhuyili Supabase 客户端访问方式

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：9a97f1f
- 现象：Supabase 客户端访问失败
- 根因：客户端访问方式不正确
- 修复：修复 Supabase 客户端访问方式
- 回归检查：R-2024-364
- 状态：verified
- 日期：2024-12-16

---

## P-2024-365 zhuyili 微信支付功能

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：50c06ff
- 现象：购买按钮点击无效，试用次数逻辑错误
- 根因：事件绑定和逻辑错误
- 修复：修复微信支付功能：购买按钮点击事件绑定和试用次数逻辑
- 回归检查：R-2024-365
- 状态：verified
- 日期：2024-12-16

---

## P-2024-366 zhuyili 二维码不显示

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：8a1a472
- 现象：二维码不显示
- 根因：二维码生成或显示逻辑错误
- 修复：修复二维码不显示问题
- 回归检查：R-2024-366
- 状态：verified
- 日期：2024-12-16

---

## P-2024-367 zhuyili payment.js 缺失函数

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：5ae20e0
- 现象：支付功能无法工作
- 根因：payment.js 缺失关键函数
- 修复：修复 payment.js 缺失函数导致支付功能无法工作
- 回归检查：R-2024-367
- 状态：verified
- 日期：2024-12-16

---

## P-2024-368 zhuyili Google 登录回调 URL

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：bb5cf07
- 现象：Google 登录回调失败
- 根因：回调 URL 配置错误
- 修复：修复 Google 登录回调 URL
- 回归检查：R-2024-368
- 状态：verified
- 日期：2024-12-16

---

## P-2024-369 zhuyili OAuth 回调跳回本地

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：a459f6c
- 现象：生产环境 OAuth 回调跳回本地导致 Cannot GET /
- 根因：OAuth 回调 URL 未固定到正式域名
- 修复：生产环境 OAuth 回调固定到 Netlify 正式域名
- 回归检查：R-2024-369
- 状态：verified
- 日期：2024-12-16

---

## P-2024-370 zhuyili OAuth 重定向 Netlify 404

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：eeb5a17
- 现象：OAuth 重定向导致 Netlify 404
- 根因：重定向 URL 未自动适配当前域
- 修复：OAuth 重定向 URL 自动适配当前域，修复 Netlify 404 回跳问题
- 回归检查：R-2024-370
- 状态：verified
- 日期：2024-12-16

---

## P-2024-371 zhuyili 计时器继续/暂停占位符闪烁

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：ce777a0
- 现象：计时器继续/暂停时占位符闪烁
- 根因：状态切换时 UI 更新逻辑问题
- 修复：修复计时器继续/暂停时占位符闪烁问题
- 回归检查：R-2024-371
- 状态：verified
- 日期：2024-12-16

---

## P-2024-372 zhuyili 重复记录问题

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：23aea54
- 现象：产生重复记录
- 根因：记录去重逻辑缺失
- 修复：修复重复记录问题
- 回归检查：R-2024-372
- 状态：verified
- 日期：2024-12-16

---

## P-2024-373 zhuyili 计时器暂停时间计算

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：5ba8cc9
- 现象：计时器暂停时间计算错误
- 根因：暂停时间计算逻辑有误
- 修复：修复计时器暂停时间计算 bug
- 回归检查：R-2024-373
- 状态：verified
- 日期：2024-12-16

---

## P-2024-374 zhuyili 多计时器删除功能

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：9b03563
- 现象：多计时器删除功能异常
- 根因：删除逻辑错误
- 修复：修复多计时器删除功能
- 回归检查：R-2024-374
- 状态：verified
- 日期：2024-12-16

---

## P-2024-375 zhuyili JSON 导入日期格式

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：9dbf58c
- 现象：JSON 导入时日期格式错误
- 根因：日期解析逻辑不兼容
- 修复：修复 JSON 导入日期格式问题
- 回归检查：R-2024-375
- 状态：verified
- 日期：2024-12-16

---

## P-2024-376 zhuyili JSON 导入数据同步

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：ce667a3
- 现象：JSON 导入后数据不同步
- 根因：数据同步逻辑缺失
- 修复：修复 JSON 导入数据同步问题
- 回归检查：R-2024-376
- 状态：verified
- 日期：2024-12-16

---

## P-2024-377 zhuyili 用户数据隔离和导入同步

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：b23fcc2
- 现象：用户数据隔离和 JSON 导入同步问题
- 根因：用户数据隔离逻辑不完善
- 修复：修复用户数据隔离和 JSON 导入同步问题
- 回归检查：R-2024-377
- 状态：verified
- 日期：2024-12-16

---

## P-2024-378 zhuyili Google 登录重定向

- 项目：zhuyili
- 仓库：https://github.com/kexin94yyds/zhuyili
- 发生版本：f71634f
- 现象：Google 登录重定向问题
- 根因：重定向逻辑错误
- 修复：修复 Google 登录重定向问题
- 回归检查：R-2024-378
- 状态：verified
- 日期：2024-12-16

---

## P-2024-379 AI- AI Studio URL 路径错误

- 项目：AI-
- 仓库：https://github.com/kexin94yyds/AI-
- 发生版本：4bcfedb
- 现象：AI Studio URL 路径不正确
- 根因：URL 路径配置错误
- 修复：修正 AI Studio URL 为 /apps 路径
- 回归检查：R-2024-379
- 状态：verified
- 日期：2024-12-16

---

## P-2024-380 AI-Sidebar History 同步问题

- 项目：AI-Sidebar
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：6e9bfd5
- 现象：History 同步失败
- 根因：错误处理不完善，未等待 HistoryDB 初始化
- 修复：增强错误处理和等待 HistoryDB 初始化
- 回归检查：R-2024-380
- 状态：verified
- 日期：2024-12-16

---

## P-2024-381 AI-Sidebar Star 按钮状态不正确

- 项目：AI-Sidebar
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：65992ad
- 现象：Star 按钮状态与实际收藏状态不符
- 根因：URL 比较时未标准化
- 修复：通过标准化 URL 修复 Star 按钮状态
- 回归检查：R-2024-381
- 状态：verified
- 日期：2024-12-16

---

## P-2024-382 AI-Sidebar message 监听器语法错误

- 项目：AI-Sidebar
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：29239bf
- 现象：message 监听器报错
- 根因：await 语法错误
- 修复：修复 message 监听器中的 await 语法错误
- 回归检查：R-2024-382
- 状态：verified
- 日期：2024-12-16

---

## P-2024-383 AI-Sidebar Starred 按钮显示对号

- 项目：AI-Sidebar
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：0d23c83
- 现象：Starred 按钮显示对号而不是星号
- 根因：图标配置错误
- 修复：修复 Starred 按钮显示对号而不是星号的问题
- 回归检查：R-2024-383
- 状态：verified
- 日期：2024-12-16

---

## P-2024-384 AI-Sidebar History Remove 点击不工作

- 项目：AI-Sidebar
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：137142a
- 现象：History 面板 Remove 点击不工作
- 根因：点击事件委托和 URL 标准化问题
- 修复：将 Remove 点击处理委托给面板并标准化 URL
- 回归检查：R-2024-384
- 状态：verified
- 日期：2024-12-16

---

## P-2024-385 AI-Sidebar URL 含 & 时 Remove 失败

- 项目：AI-Sidebar
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：9b9ad84
- 现象：URL 包含 & 字符时 Remove 功能失败
- 根因：属性值未正确解码
- 修复：解码属性值确保 URL 含 & 时 Remove 正常工作
- 回归检查：R-2024-385
- 状态：verified
- 日期：2024-12-16

---

## P-2024-386 AI-Sidebar ChatGPT/Gemini 嵌套框架 URL 同步

- 项目：AI-Sidebar
- 仓库：https://github.com/kexin94yyds/AI-Sidebar
- 发生版本：005d64e
- 现象：ChatGPT/Gemini 嵌套框架 URL 不同步
- 根因：嵌套 iframe URL 监听问题
- 修复：修复 ChatGPT/Gemini 嵌套框架 URL 同步问题
- 回归检查：R-2024-386
- 状态：verified
- 日期：2024-12-16

---

## P-2024-387 if-compond 授权弹窗邮箱不预填充

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：07ecbac
- 现象：授权弹窗打开时邮箱不自动预填充
- 根因：预填充逻辑缺失
- 修复：修复授权弹窗打开时邮箱不自动预填充的问题
- 回归检查：R-2024-387
- 状态：verified
- 日期：2024-12-16

---

## P-2024-388 if-compond 缓存数量检查

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：9db3b02
- 现象：缓存数量不足时仍使用缓存
- 根因：缓存数量检查逻辑缺失
- 修复：缓存数量检查 - 只有缓存数量足够时才使用
- 回归检查：R-2024-388
- 状态：verified
- 日期：2024-12-16

---

## P-2024-389 if-compond 置顶博主和抓取数量

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：78531f6
- 现象：置顶博主不优先显示，Twitter 抓取数量不足
- 根因：排序和数量逻辑问题
- 修复：置顶博主优先显示 + Twitter 抓取 50 条 + 回复转推限 10 条
- 回归检查：R-2024-389
- 状态：verified
- 日期：2024-12-16

---

## P-2024-390 if-compond Supabase URL 配置

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：33d2922
- 现象：Supabase 连接失败
- 根因：Supabase URL 配置少了一个字母 i
- 修复：修正 Supabase URL 配置
- 回归检查：R-2024-390
- 状态：verified
- 日期：2024-12-16

---

## P-2024-391 if-compond 在线密钥验证

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：3639519
- 现象：可以使用伪造的密钥
- 根因：密钥验证仅在本地进行
- 修复：启用在线密钥验证，防止伪造密钥
- 回归检查：R-2024-391
- 状态：verified
- 日期：2024-12-16

---

## P-2024-392 if-compond 生产环境 User-Agent

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：dba96ac
- 现象：生产环境请求被拒绝
- 根因：缺少 User-Agent header
- 修复：添加 User-Agent header 用于生产环境
- 回归检查：R-2024-392
- 状态：verified
- 日期：2024-12-16

---

## P-2024-393 if-compond 本地开发 Netlify Blobs 缓存

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：cf1ba48
- 现象：本地开发时 Netlify Blobs 缓存导致问题
- 根因：本地开发不应使用 Netlify Blobs 缓存
- 修复：本地开发时跳过 Netlify Blobs 缓存
- 回归检查：R-2024-393
- 状态：verified
- 日期：2024-12-16

---

## P-2024-394 if-compond 生产环境代理问题

- 项目：if-compond
- 仓库：https://github.com/kexin94yyds/if-compond
- 发生版本：50d83a1
- 现象：生产环境请求失败
- 根因：生产环境错误使用了代理
- 修复：生产环境使用直接 fetch，代理仅用于本地开发
- 回归检查：R-2024-394
- 状态：verified
- 日期：2024-12-16

---

## P-2024-395 flow-learning EPUB 封面提取

- 项目：flow-learning
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：a9461b3
- 现象：EPUB 封面提取失败
- 根因：封面提取方法不完整
- 修复：为 capture.html 和 flow.js 添加完整的 3 种封面提取方法
- 回归检查：R-2024-395
- 状态：verified
- 日期：2024-12-16

---

## P-2024-396 flow-learning localStorage 超限

- 项目：flow-learning
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：5f1715d
- 现象：localStorage 超限导致存储失败
- 根因：封面图片太大
- 修复：压缩封面图片防止 localStorage 超限
- 回归检查：R-2024-396
- 状态：verified
- 日期：2024-12-16

---

## P-2024-397 flow-learning 下载书籍文件名

- 项目：flow-learning
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：56d015f
- 现象：下载书籍时文件名不正确
- 根因：未使用原始文件名
- 修复：下载书籍时使用原始文件名
- 回归检查：R-2024-397
- 状态：verified
- 日期：2024-12-16

---

## P-2024-398 flow-learning 批量上传 Supabase

- 项目：flow-learning
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：aef3c59
- 现象：批量上传时未同步到 Supabase
- 根因：批量上传逻辑缺少 Supabase 同步
- 修复：批量上传也上传到 Supabase 并保存 fileUrl
- 回归检查：R-2024-398
- 状态：verified
- 日期：2024-12-16

---

## P-2024-399 flow-learning Supabase InvalidKey 错误

- 项目：flow-learning
- 仓库：https://github.com/kexin94yyds/flow-learning
- 发生版本：750b191
- 现象：Supabase 报 InvalidKey 错误
- 根因：文件名包含特殊字符
- 修复：使用简化文件名避免 Supabase InvalidKey 错误
- 回归检查：R-2024-399
- 状态：verified
- 日期：2024-12-16

---

## P-2024-400 iOS App 退出 Xcode 后后台截屏检测失效

- 项目：Monoshot
- 仓库：/Users/apple/monoshot
- 发生版本：2024-12-17
- 现象：通过 Xcode 调试运行时后台截屏检测正常，但退出 Xcode 独立运行时，App 切到后台后截屏无法触发通知
- 根因：Xcode 调试时会阻止 iOS 挂起 App，独立运行时 iOS 会在约30秒后挂起 App，导致 PHPhotoLibraryChangeObserver 监听失效
- 修复：使用静音音频播放（BackgroundAudioService）绕过 iOS 后台限制，利用音频类 App 允许持续后台运行的特性
- 回归检查：退出 Xcode 独立运行，切到后台后截屏能收到通知
- 状态：fixed
- 日期：2024-12-17
- 关联模式：PAT-2024-022

---

## P-2024-401 cunzhi pai 工具无法在同一窗口打开新聊天标签页

- 项目：cunzhi
- 仓库：https://github.com/kexin94yyds/cunzhi
- 发生版本：当前开发版本
- 现象：pai 工具希望在 Windsurf 同一窗口中打开新聊天标签页并发送提示词，但 AppleScript 方式不稳定（焦点问题导致内容发送到编辑器），Windsurf CLI `-r` 选项会复用窗口但不会打开新标签页，`-n` 选项会打开新窗口而非新标签页
- 根因：Windsurf CLI 目前不支持"在同一窗口打开新聊天标签页"的功能，AppleScript 模拟键盘操作不可靠
- 修复：待定
- 回归检查：待定
- 状态：open
- 日期：2024-12-17

## P-2024-402 cunzhi 弹窗中 Escape/反引号/CapsLock 等按键无法触发最小化

- 项目：cunzhi
- 仓库：https://github.com/kexin94yyds/cunzhi
- 发生版本：当前开发版本
- 现象：在 MCP 弹窗中，Tab 键可以正常触发最小化窗口，但 Escape 键、反引号键（`）、CapsLock（中英切换）等按键都无法触发任何功能。尝试了多种方案均无效。
- 根因：未确定。可能原因包括：
  1. Naive UI 的 n-input 组件内部拦截了 Escape 键事件
  2. macOS 系统级别对某些按键有特殊处理
  3. Tauri/Webview 层面可能有额外的事件拦截
- 尝试过的方案：
  1. keyup 事件 + escapeAlone 标志位检测 → 无效
  2. addEventListener 使用 capture 阶段（第三参数 true）→ 无效
  3. 在 keydown 阶段直接触发（与 Tab 键相同方式）→ 无效
  4. 换用反引号键 → 同样无效
- 修复：放弃该功能，保留 Tab 键最小化
- 回归检查：无（功能未实现）
- 状态：open（待后续排查）
- 日期：2024-12-17

## P-2024-442 pai 工具输出被当前 AI 误解为执行指令

- 项目：cunzhi
- 发生版本：v0.5.0
- 现象：pai 工具生成的提示词末尾有 `*你是子代理现在帮我做*：`，当前窗口 AI 误以为是对自己的指令，直接执行任务而不是等用户复制到新窗口
- 根因：当前 AI 没有被明确告知"这是引用内容，不是执行指令"
- 修复：在返回结果中添加隔离说明 `> ⚠️ 当前窗口 AI 请注意：以下是供用户复制到新窗口的提示词，不是让你执行的任务`，并用 markdown 代码块包裹提示词
- 回归检查：R-2024-442
- 状态：verified
- 日期：2024-12-20

## P-2024-443 MCP 连接不稳定 broken pipe

- 项目：cunzhi
- 发生版本：v0.5.0+
- 现象：MCP 工具调用时频繁出现 "transport error: failed to write request: write |1: broken pipe"
- 根因：Windsurf ↔ 寸止 之间的 stdio 管道断裂后，MCP 服务器进程处于僵死状态，Windsurf 不会自动重启
- 临时修复：
  1. 手动 kill 掉僵死的寸止进程
  2. 在 Windsurf 中 Reload Window（Cmd+Shift+P → Developer: Reload Window）
  3. 或禁用/启用 cunzhi MCP 服务器
- 长期修复：待定（需要 MCP 服务器添加心跳检测和自动重连机制）
- 回归检查：R-2024-443（待创建）
- 状态：fixed
- 日期：2024-12-21

## P-2024-444 ji(action=回忆) 不返回 patterns.md 完整内容

- 状态：open
- 日期：2024-12-21
- 来源：cunzhi MCP 工具

### 现象
调用 `ji(action=回忆)` 时，返回的 patterns.md 内容只有索引表前 5 条，丢失了详细内容。

### 根因
`read_knowledge()` 函数中 `.take(5)` 限制了返回数量：
```rust
let lines: Vec<&str> = summary.lines()
    .filter(|l| l.starts_with("| PAT-"))
    .take(5)  // 问题在这里
    .collect();
```

### 临时解决方案
会话启动时手动调用 `read_file patterns.md` 获取完整内容。

### 待修复
修改 `read_knowledge()` 返回更多 patterns 内容，或在 global_rules.md 中添加手动读取步骤。

## P-2024-445 global_rules.md 与 ji 工具实际行为不一致

- 状态：open
- 日期：2024-12-21
- 来源：cunzhi 规则审查

### 现象
global_rules.md 写着"调用 `寸止` 询问用户是否需要帮助执行 `git add / commit / push`"，但 `ji(action=确认沉淀)` 实际上会**自动推送到 GitHub**，不询问用户。

### 不一致点
| 规则描述 | 实际行为 |
|----------|----------|
| "调用 `寸止` 询问用户是否需要 push" | 直接自动 push，无询问 |
| "用户确认 push 完成前，不得标记 Bug 为 verified" | ji 自动 push 后直接返回成功 |

### 根因
`ji` 工具的 `settle_to_knowledge()` 函数实现了自动 push，但 global_rules.md 没有同步更新。

### 待修复
二选一：
1. 修改 global_rules.md，删除"询问是否 push"的描述
2. 修改 ji 工具，改为询问后再 push

## P-2024-446 ji 工具自动 push 逻辑待优化

- 状态：open
- 日期：2024-12-21
- 来源：cunzhi MCP 工具代码审查
- 关联：P-2024-445

### 代码位置
`cunzhi/src/rust/mcp/tools/memory/manager.rs:361-366`

```rust
// 写入文件
fs::write(&file_path, file_content)?;

// 自动 git add/commit/push
let git_result = self.git_push_knowledge(&knowledge_dir, filename, content);
```

### 待改进
1. 自动 push 前应调用 `寸止` 询问用户确认
2. 或者修改 global_rules.md 说明"自动 push"行为
3. 保持规则与代码行为一致

## P-2024-022 iterate.app 更新后工具不显示

- 来源：CunZhi 项目
- 日期：2024-12-22
- 状态：verified

**问题描述：**
新增 xi 工具后，Windsurf MCP 配置显示 5 个工具，但 iterate.app 只显示 4 个工具。

**根因分析：**
1. Tauri 构建使用缓存，主程序 `iterate` 没有重新编译
2. update.sh 只同步了 MCP 服务器（寸止），没有同步主程序（iterate）
3. `get_mcp_tools_config` 命令在主程序中，必须同步主程序才能生效

**修复方案：**
1. 在 `commands.rs` 中添加 xi 工具配置
2. 更新 `update.sh`，同步主程序和 MCP 服务器：
```bash
sudo rm "$APP_PATH/Contents/MacOS/$APP_NAME"
sudo cp "$PROJECT_DIR/target/release/$APP_NAME" "$APP_PATH/Contents/MacOS/$APP_NAME"
```

**回归检查：R-2024-022**

---

## P-2024-462 pai 工具输出到 Cascade Output 而非寸止窗口

- 项目：cunzhi
- 仓库：/Users/apple/cunzhi
- 发生版本：v0.5.0
- 现象：
  1. `pai` 生成的子代理提示词显示在 Cascade Output 区域，用户需要手动复制
  2. 子代理完成任务后没有调用 `zhi` 汇报工作结果
- 根因：`pai` 直接返回 `CallToolResult::success(vec![Content::text(result)])`，而非通过 `create_tauri_popup` 显示
- 修复：
  1. `pai` 调用 `create_tauri_popup` 将提示词显示在寸止窗口
  2. 子代理提示词模板添加"完成后必须调用 `zhi` 汇报"指令
  3. 添加降级处理：寸止窗口不可用时回退到文本输出
- 修改文件：`cunzhi/src/rust/mcp/tools/dispatch/mcp.rs`
- 回归检查：R-2024-462
- 状态：verified
- 日期：2024-12-22

---

## P-2024-463 zhi 工具记录对话后未自动同步到远程

- 项目：cunzhi
- 仓库：/Users/apple/cunzhi
- 发生版本：v0.5.0
- 现象：`zhi` 工具调用后会将对话记录写入 `.cunzhi-knowledge/conversations/YYYY-MM-DD.md`，但不会自动 `git add/commit/push`，导致其他项目拉取时没有最新的对话记录
- 根因：`log_conversation` 函数只写入文件，没有触发 git 同步
- 修复：实现 5 分钟防抖同步（每次写入后启动定时器，5分钟内无新写入则自动 git push）
- 修改文件：`cunzhi/src/rust/mcp/tools/interaction/logger.rs`
- 回归检查：R-2024-463
- 状态：verified
- 日期：2024-12-22

---

## P-2024-464 update.sh 运行时需要切回终端输入 sudo 密码

- 项目：cunzhi
- 仓库：/Users/apple/cunzhi
- 发生版本：v0.5.0
- 现象：从 IDE 终端运行 `./update.sh` 时，脚本在步骤 3 需要 sudo 权限，此时需要用户切回终端窗口手动输入密码，打断工作流
- 根因：标准 sudo 命令等待终端 stdin 输入密码，无法弹出 GUI 对话框
- 修复：在脚本开头使用 osascript 弹出 macOS 密码对话框预先获取权限
- 修改文件：`cunzhi/update.sh`
- 回归检查：R-2024-464
- 状态：verified
- 日期：2024-12-22

## P-2024-465: ji 工具缺少交互式选择模式

### 现象
- 用户输入 "ji" 时，AI 需要自己判断执行哪个 action
- 用户希望能选择：1=memory, 2=pattern, 3=problem 等

### 期望行为
- 用户输入 "ji" → 弹出选项让用户选择
- 选择后执行对应操作

### 方案待定
- **方案 A**：改规则文档，AI 先用 zhi 询问
- **方案 B**：改代码，ji 工具本身返回选项

### 状态
open

### 相关文件
- `cunzhi/src/rust/mcp/tools/memory/mcp.rs`
- `~/.codeium/windsurf/rules/02-tools.md`

## P-2024-465: Windsurf MCP 显示 "MCPs disabled by your admin"

**现象**：Cascade 面板显示 "MCPs disabled by your admin"，所有 MCP 工具无法调用

**根因**：`~/Library/Application Support/Windsurf/User/settings.json` 中设置了 `http.proxy` 指向未运行的本地代理（如 `127.0.0.1:8899`），导致 Windsurf 无法连接 Codeium 服务器

**修复**：删除 settings.json 中的 `http.proxy`、`http.noProxy`、`http.proxyStrictSSL` 设置，重启 Windsurf

**教训**：在 Windsurf 里配置代理前，必须确保代理服务已启动；否则会导致 MCP 功能完全不可用

P-2025-001
现象：前端按钮样式过于扁平，缺乏交互反馈感，用户希望实现类似 tobooks 项目中的 3D 凹陷（sunken）效果。
根因：默认的 Naive UI 按钮样式及自定义样式仅使用了简单的颜色变化，没有利用阴影和位移来模拟物理深度感。
方案：在全局 CSS 中定义了基于 `inset` 阴影和 `translateY(1px)` 的按下状态样式，并将选中状态（.is-active）统一映射到该物理反馈样式。同时将蓝色调改为更中性的灰色/白色凹陷风格。
关联：R-2025-001, PAT-2025-001

P-2024-001
现象：用户需要将 IDE 跳转逻辑从 Cursor 切换为 Windsurf，并希望不再使用 Cursor。
根因：IDE 偏好变更。
影响范围：前端路径点击跳转、Rust 端 IDE 启动逻辑。
方案：重命名 tauri 命令为 open_in_ide，调整 Rust 端优先级使 Windsurf 为首选，更新 Vue 组件调用。
状态：fixed。

P-2024-002 (Update)
现象：AppleScript 实现的 “+” 按钮新聊天窗口功能在 Windsurf 中不够稳定。
方案：放弃 AppleScript 模拟按键，改用 Windsurf 原生命令行工具 `windsurf chat --reuse-window` 实现。该方案更稳定、响应更快，且支持直接发送内容。
状态：fixed。

P-2024-003
现象：Windsurf 聊天面板已打开时，点击 “+” 按钮逻辑可能导致面板关闭或失效。
根因：复合按键序列 Cmd+L -> Cmd+T 在已聚焦输入框时会触发面板切换。
方案：简化为直接发送 Cmd+T。
状态：fixed。

P-2024-004
现象：用户点击“打开终端”时启动了独立的系统终端应用，而非在当前 IDE（Windsurf）内部开启。
根因：原 `open_terminal` 逻辑硬编码为打开系统 `Terminal.app`。
影响范围：所有触发“打开终端”的功能点。
方案：重构 `open_terminal` 逻辑，在 macOS 上通过 AppleScript 激活 Windsurf 并发送 `Ctrl+` ` 快捷键以切换 IDE 内部终端面板。
状态：fixed。

P-2024-005
现象：用户希望在独立的 App 窗口内直接使用终端，而不是唤起外部终端或 Windsurf 内部终端面板。
根因：原功能仅支持唤起系统终端或通过快捷键联动 IDE 终端，缺乏内置终端容器。
影响范围：应用交互体验，终端使用便捷性。
方案：引入 `xterm.js` (前端) 和 `portable-pty` (后端)，实现完整的 PTY 模拟。在 `AppContent.vue` 中集成嵌入式终端面板，并提供切换开关。
状态：fixed。

P-2024-005 (Update)
现象：嵌入式终端颜色对比度低，ANSI 颜色显示不清晰。
方案：在 `TerminalView.vue` 中配置了高对比度的深色主题（基于 Tokyo Night），明确定义了所有基础 ANSI 颜色及背景/前景文字颜色。
状态：fixed。

P-2024-005 (Persistence Update)
现象：嵌入式终端在切换显示状态（隐藏再显示）后内容会重置，且每次打开都会启动新的 PTY 进程。
方案：
1. Rust 端：在 `PTY_STATE` 中实现单例管理，`open_pty` 会先检查是否已有活跃实例，避免重复创建进程。
2. 前端：在 `AppContent.vue` 中将终端面板的 `v-if` 改为 `v-show`，利用 Vue 的组件保持特性，确保终端在隐藏时不会被销毁，从而保留渲染内容和状态。
状态：fixed。

P-2024-005 (Layout & Color Update)
现象：终端颜色对比度不足，且布局在底部占据空间，干扰主内容阅读。
方案：
1. 颜色：将背景设置为纯黑（#000000），文字设置为纯白（#ffffff），并优化 ANSI 颜色。
2. 布局：重构为绝对定位全屏覆盖（inset-x-0 bottom-0 top-[52px]），不影响主内容骨架，并添加了滑入滑出动画和关闭按钮。
状态：fixed。

### P-2025-001: 数据库连接失败与后端服务不可用
**现象**：老师反馈数据库连不上，访问网页无法加载图书列表。
**根因**：
1. MySQL `root` 用户仅允许 `localhost` 登录，未开启远程访问权限。
2. Tomcat 服务（8080 端口）未启动，导致 API 接口不可用。
**影响范围**：外部数据库客户端无法连接；前端网页无法获取数据（502/Connection refused）。
**状态**：fixed
**修复方案**：
1. 执行 SQL `UPDATE mysql.user SET host='%' WHERE user='root'; FLUSH PRIVILEGES;` 开启远程权限。
2. 运行 `compile.sh` 重新编译并重启 Tomcat 服务。

P-2025-001: 语音记录App开发与iOS适配
现象: 用户需要一个能自动命名、实时转写且具有极简黑魂UI的录音App，并要求适配iOS。
根因: 初始UI不符合审美，本地模型加载慢导致0%显示。
解决方案: 
1. 采用用户提供的极简黑魂UI模板(zip内容)。
2. 接入hiapi.online云端API (Gemini 2.5 Flash + Whisper) 替代本地模型，实现秒开。
3. 集成 Capacitor 并配置 iOS 麦克风/语音识别权限。
4. 加入 Web Speech API 实现录音时实时出字预览。
状态: fixed

---

## P-2026-002: 导出 AI 聊天记录为 Markdown 的 Chrome 插件
- **现象**: 用户需要将网页版 AI（ChatGPT/Claude/DeepSeek）的对话导出为 Markdown 文件。用户曾反馈无法抓取“用户消息”且标题识别不准。
- **根因**: 原生网页 DOM 结构复杂且动态变化，简单的类名匹配容易失效。
- **状态**: fixed
- **解决总结**: 
    1. 借鉴了 `insidebar-ai` 的成熟方案，实现了基于 `Node.TEXT_NODE` 和 `Node.ELEMENT_NODE` 递归的稳健 Markdown 提取算法。
    2. 针对 DeepSeek 引入了“奇偶校验 + 视觉特征”双重角色识别。
    3. 针对 ChatGPT 结合了 `data-message-author-role` 和 `conversation-turn` 结构化抓取。
    4. 实现了多层级标题探测（URL ID 匹配、侧边栏激活态、页面 Header），解决了标题不准的问题。
- **回归检查**: R-2026-002
- **状态**: verified
- **日期**: 2026-01-04

---

## P-2026-003: 插件 UI 风格缺乏辨识度
- **现象**: 初始 UI 使用了通用的 Bootstrap 风格配色（蓝色/绿色/灰色），视觉上较为普通，不符合极简主义审美。
- **根因**: UI 设计未经过深度定制，缺乏独特的品牌感。
- **状态**: fixed
- **解决总结**: 
    1. 重新设计为黑白极简风（B&W Minimalist），移除所有彩色和渐变。
    2. 采用直角设计（Border-radius: 0）和硬阴影（Hard Shadow），增加视觉冲击力。
    3. 优化交互逻辑：按钮默认白底黑字，悬停反转为黑底白字，提升反馈感。
    4. 引入 Monospace 字体处理数值和状态信息，增强专业感。
- **回归检查**: R-2026-003
- **状态**: verified
- **日期**: 2026-01-04
- **影响范围**: Popup 页面、History 历史记录页面

---

## P-2026-004: AI 聊天插件缺少持久化存储和历史管理
- **现象**: v1.0 版本只能即时导出当前对话，无法保存历史记录、批量管理、去重检测，也不支持导入功能。
- **根因**: 
    1. 初版设计追求"即用即走"理念，未考虑长期使用场景
    2. 缺少参考成熟产品（如 insidebar-ai）的数据架构设计
    3. 未提取 conversationId 导致无法实现去重
- **状态**: verified
- **解决总结**:
    1. **数据层**: 引入 chrome.storage.local 作为持久化存储（5MB容量，适合 100-200 条对话）
    2. **元数据提取**: 实现 conversationId 提取逻辑（支持 ChatGPT/Claude/Gemini/DeepSeek 四大平台）
    3. **去重机制**: 基于 conversationId 的查重，保存前自动检测重复并提示用户
    4. **双格式导出**: 支持 Markdown（可读）+ JSON（结构化）双格式
    5. **历史管理**: 完整的 CRUD 界面（搜索、筛选、排序、收藏、标签）
    6. **导入导出**: 支持全量数据备份与恢复（含去重策略选择）
    7. **统计分析**: 提供存储用量、对话数量、消息统计
    8. **存储优化**: 自动清理（容量超90%时删除最旧的10%非收藏对话）
- **回归检查**: R-2026-004
- **状态**: verified
- **日期**: 2026-01-04

P-2026-001: 
现象：用户需要将复制的文件/图片自动转为路径，Electron 打包慢且菜单栏图标易被遮挡。
根因：跨平台框架过于臃肿，macOS 菜单栏在刘海屏下有遮挡风险。
方案：使用原生 Swift 开发“悬浮球+菜单栏”双重交互的应用。
状态：verified

P-2026-002: macOS 辅助工具交互优化
现象：用户需要极致简单的交互（单击切换、双击退出），且菜单栏图标在刘海屏下不可见。
根因：默认的菜单栏交互在特定硬件下体验不佳，且标准 UI 过于繁琐。
方案：实现屏幕左上角悬浮球，支持单击（通过 controller 切换状态）和双击（直接 terminate 应用）的混合交互模式。
状态：verified

---

## P-2026-005: macOS 应用 Option+Q 快捷键无法全局触发

- **项目**: PathHelper
- **仓库**: /Users/apple/URL copy
- **发生版本**: 2026-01-04
- **现象**: Option+Q 快捷键只在菜单激活时生效，悬浮球隐藏后无法全局触发显示/隐藏
- **根因**: 使用 `NSMenuItem.keyEquivalent` 只是菜单快捷键，不是系统全局热键。菜单快捷键需要应用处于前台且菜单激活状态才能响应
- **修复**: 添加 `NSEvent.addGlobalMonitorForEvents(matching: .keyDown)` 实现真正的全局热键监听
  ```swift
  NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { event in
      if event.modifierFlags.contains(.option) && event.keyCode == 12 {
          self.controller.toggleVisibility()
      }
  }
  ```
- **注意事项**:
  1. 全局监听需要辅助功能权限（System Preferences → Security & Privacy → Accessibility）
  2. 修改可执行文件后需要重新签名：`codesign --force --deep --sign -`
  3. 签名变更后需要重新授权辅助功能权限
- **回归检查**: R-2026-005
- **状态**: verified
- **日期**: 2026-01-04

<<<<<<< HEAD
## P-2026-001: ji 工具沉淀分类单复数兼容性修复

### 问题
调用 `ji(action="沉淀")` 时，若 `category` 传入 `pattern/problem/regression`（单数）会报错 `invalid params: 沉淀仅支持 patterns/problems/regressions 分类`。这导致 AI 在自动调用工具时经常因为单复数转换失败。

### 关键技术点
1. **参数校验逻辑**：Rust 后端在 `mcp.rs` 中使用 `match` 对 `category` 进行了硬编码校验。
2. **容错性增强**：在校验层支持单数形式并自动映射为对应的复数形式存储。

### 修复方案
在 `@/Users/apple/cunzhi/src/rust/mcp/tools/memory/mcp.rs:65-75` 中修改 `match` 逻辑，增加单数映射：
```rust
let category = match request.category.as_str() {
    "patterns" | "problems" | "regressions" => request.category.as_str(),
    "pattern" => "patterns",
    "problem" => "problems",
    "regression" => "regressions",
    _ => return Err(...)
};
```

### 验证结果
已重启 Windsurf 并通过 `category: "problem"` 测试，确认修复生效。
=======
P-2026-001: 导出功能无法在侧边栏 iframe 中执行抓取。
现象：集成后导出按钮点击无反应，无法获取 AI 供应商页面的聊天内容。
根因：AI 页面在 iframe 中，原来的脚本尝试在父页面 Tab 中执行抓取逻辑，跨域限制导致无法访问 iframe 内容。
状态：open
>>>>>>> 295e57f321e5f8143d84080d3afa5d1616c65a9c

P-2025-001 左侧图标无法点击：`js/popup.js` 点击处理中调用 `renderProviderTabs` 时引用未定义的 `overrides`，控制台报 `ReferenceError: overrides is not defined`，导致点击事件中断；另发现 `history-backdrop`/`favorites-backdrop` 使用 `position: fixed` 可能遮挡侧栏。修复：`renderProviderTabs` 显式接收并在所有调用处传入 `overrides`；遮罩改为 `position: absolute`。涉及：`js/popup.js`、`css/panel.css`。

P-2025-001 左侧图标无法点击：`js/popup.js` 点击处理中调用 `renderProviderTabs` 时引用未定义的 `overrides`，控制台报 `ReferenceError: overrides is not defined`，导致点击事件中断；另发现 `history-backdrop`/`favorites-backdrop` 使用 `position: fixed` 可能遮挡侧栏。修复：`renderProviderTabs` 显式接收并在所有调用处传入 `overrides`；遮罩改为 `position: absolute`。涉及：`js/popup.js`、`css/panel.css`。
