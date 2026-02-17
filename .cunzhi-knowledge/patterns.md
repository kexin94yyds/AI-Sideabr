# 可复用模式 (Patterns Registry)

> 记录跨项目可复用的解决方案和最佳实践。

---

## Expertise Sections

### 🎯 提示词工程
| ID | 名称 | 核心要点 |
|----|------|----------|
| PAT-2024-001 | 行为导向原则 | 告诉 AI 做什么，不是描述概念 |
| PAT-2024-003 | XML 标签分组 | 结构清晰，便于 AI 解析 |
| PAT-2024-004 | 人类可读即 AI 可读 | 具体到行为 |
| PAT-2024-006 | 规则简化原则 | 重复逻辑合并 |
| PAT-2024-018 | 输出纪律 | 禁止元评论，直接输出结果 |
| PAT-2024-019 | 7 级成熟度模型 | L1 静态 → L7 元认知 |

### 🔧 MCP 工具开发
| ID | 名称 | 核心要点 |
|----|------|----------|
| PAT-2024-002 | Memory vs Knowledge 分层 | L1 缓存 + L2 持久化 |
| PAT-2024-007 | 外部依赖降级 | 无 API key 时用内置替代 |
| PAT-2024-020 | MCP Agent 规范格式 | 工具+约束+反模式 |
| PAT-2024-021 | ji 统一管理 memory/knowledge | 单一入口，action 区分 |

### 🛡️ 安全与防护
| ID | 名称 | 核心要点 |
|----|------|----------|
| PAT-2024-005 | Smart Guard 依赖检查 | 删文件前查依赖 |
| PAT-2024-017 | AI 防注入安全 | Lethal Trifecta 三要素 |
| PAT-2026-001 | 知识库目录的 .gitignore 保护与自动检测 | 例外保护 + 运行时风险检测 |

### 📱 桌面应用 (Electron/Tauri)

### 📱 桌面应用 (Electron/Tauri)
| ID | 名称 | 核心要点 |
|----|------|----------|
| PAT-2024-008 | macOS 拖拽替代 | 自定义鼠标拖拽 |
| PAT-2024-009 | 防抖保存安全 | 关键操作前强制保存 |
| PAT-2024-010 | IPC 事件语义分离 | 同步 ≠ 切换 |
| PAT-2024-011 | IndexedDB 锁定诊断 | lsof + pkill |
| PAT-2025-001 | macOS 应用精准焦点唤回模式 | 使用 PID 识别切换焦点 |
| PAT-2025-002 | 全局快捷键的运行时热切换 | 状态同步链与动态注册 |
| PAT-2025-003 | Tauri 应用动态快捷键同步 | 后端持久化与前端分层处理 |
| PAT-2026-005 | macOS Swift 全局热键监听 | NSEvent.addGlobalMonitorForEvents + 辅助功能权限 |

### 📱 iOS 移动开发
| ID | 名称 | 核心要点 |
|----|------|----------|
| PAT-2024-022 | iOS 后台持续运行 | 静音音频播放绕过系统限制 |
| PAT-2024-023 | AI/LLM 品牌图标获取 | lobehub/lobe-icons CDN |

### 🚀 部署与运维
| ID | 名称 | 核心要点 |
|----|------|----------|
| PAT-2024-016 | 全功能部署脚本 | 5 步流程 |
| PAT-2024-021 | 应用项目更新脚本规范 | 编译→构建→同步→签名→安装 |

### 📚 其他
| ID | 名称 | 核心要点 |
|----|------|----------|
| PAT-2024-012 | Chrome 扩展 iframe 降级 | Open in Tab |
| PAT-2024-013 | PWA 推送限制 | iOS 16.4+ |
| PAT-2024-014 | macOS 权限说明 | 辅助功能/屏幕录制 |
| PAT-2024-015 | 脚本权限自动设置 | chmod +x |
| PAT-2024-025 | grep 中文字符用法 | 用 `-e` 或 `--` 避免误解析 |
| PAT-2025-004 | 上下文追加项的精细化控制 | 两级控制与 UI 状态联动 |

---

## PAT-2026-001 知识库目录的 .gitignore 保护与自动检测模式

- **场景**：项目根目录存在破坏性的 `.gitignore` 规则（如 `*.md`, `*.json`），导致插件目录或知识库子仓库的文件被意外忽略，IDE 不可见。
- **模式描述**：
  1. **防御性例外**：在项目 `.gitignore` 中显式添加 `!/path/to/protected/` 规则。
  2. **模板化配置**：在知识库中提供标准的 `gitignore-protection.txt` 模板。
  3. **运行时感知**：工具在执行相关操作（如 `ji 回忆`）时，主动解析 `.gitignore` 文件，检测是否存在忽略风险。
  4. **引导式修复**：发现风险时，不仅提示警告，还提供精确的修复命令（如 `cat template >> .gitignore`）。
- **关联问题**：P-2026-001
- **日期**：2026-01-03

---
## PAT-2025-004 上下文追加项的精细化控制

- 来源：CunZhi 弹窗系统优化
- 日期：2025-12-29

**核心原则**：
- **两级控制**：区分“内容切换（Switch）”与“是否生效（Checkbox）”。
- **UI 状态联动**：当某项被禁用（Unchecked）时，其操作控件（Switch）应同步禁用，并提供视觉反馈（如降低不透明度）。
- **默认安全原则**：新创建或预设的项默认应处于激活状态（`is_active: true`），由用户按需关闭。

**实现模式**：
- **数据层**：在条件性 Prompt 结构中引入 `is_active` 状态位。
- **逻辑层**：生成最终 Prompt 时，先过滤掉 `is_active === false` 的项，再根据 `current_state` 选择对应的模板内容。
- **持久化**：独立的 RPC 命令 `update_conditional_prompt_active` 用于快速同步单个项的激活状态。

---

## PAT-2025-003 Tauri 应用中的动态快捷键状态同步模式

- **场景**：需要在 Tauri 应用中动态启用/禁用全局快捷键（Plugin Global Shortcut）以及本地键盘监听器（document event listener）。
- **模式描述**：
  1. **后端持久化**：在 Rust 后端 `AppState` 中使用 `AtomicBool` 维护启用状态，并同步到配置文件。
  2. **事件驱动同步**：通过 `app.emit` 发送自定义事件（如 `global-shortcut-state-changed`）通知所有窗口前端。
  3. **前端分层处理**：
     - **插件层**：接收事件后调用 `register`/`unregister` 操作系统的全局快捷键。
     - **监听层**：在本地 `keydown`/`keyup` 处理器中增加对响应式状态位（如 `globalShortcutEnabled`）的校验。
  4. **精确拦截**：在本地处理器中，拦截 `Tab` 等常用键时，必须明确排除 `metaKey`/`ctrlKey`/`altKey` 等修饰键，防止干扰系统原生快捷键（如 `Cmd+Tab`）。
- **关联问题**：P-2025-004, P-2025-005
- **日期**：2025-12-30

## PAT-2025-002 全局快捷键的运行时热切换

- 来源：CunZhi 快捷键管理优化
- 日期：2025-12-29

**核心原则**：
- **状态同步链**：配置文件 (Disk) -> AppConfig (Memory) -> AppState Atomic (Runtime) -> 前端事件 (UI)。
- **动态注册**：全局快捷键不应仅在应用启动时注册一次，而应封装为可重复调用的 `register/unregister` 逻辑。
- **视觉一致性**：UI 上的切换按钮应通过监听后端推送的事件（如 `global-shortcut-state-changed`）来同步状态，确保多窗口下的表现一致。

**实现模式**：
- **原子变量保护**：在 `AppState` 中使用 `AtomicBool` 记录状态，确保在 Rust 层级也能进行低开销的状态检查。
- **生命周期管理**：在前端组件 `onUnmounted` 时执行注销，并在 `onMounted` 时根据后端状态决定是否注册。

---

## PAT-2025-001 macOS 应用精准焦点唤回模式

- 场景：在 macOS 开发全局快捷键唤起的工具类应用（如粘贴板、提示词库）时，需要精准将焦点切换回之前的应用。
- 模式：使用 Unix PID 识别而非应用名称。
- 实现关键点：
  1. 呼出窗口前捕获 PID：`tell application "System Events" to get unix id of first application process whose frontmost is true`
  2. 插入/返回前强制激活 PID：`tell application "System Events" to set frontmost of first application process whose unix id is {pid} to true`
  3. 留出激活延迟：在激活指令后设置 100-200ms 的延时，再发送按键事件。
- 关联问题：P-2025-001
- 日期：2025-12-31

---

## PAT-2024-021 ji 工具统一管理 memory 和 knowledge

- 来源：cunzhi 项目实践
- 日期：2024-12-15

**核心原则**：
- 单一入口原则：用户只需记住 `ji` 这一个工具
- 通过 `action` 参数区分操作

**操作类型**：
| action | 读/写 | 目标 | category |
|--------|-------|------|----------|
| 回忆 | 读 | memory + knowledge | - |
| 记忆 | 写 | .cunzhi-memory/ | rule/preference/note/context |
| 沉淀 | 写 | .cunzhi-knowledge/ | patterns/problems |
| 摘要 | 写 | .cunzhi-memory/ | session（L3 会话摘要，自动保留15条） |

**设计决策**：
- memory 的 `patterns.md` 改名为 `notes.md`，避免与 knowledge 混淆
- `回忆` 返回合并内容，减少用户认知负担
- `沉淀` 写入 knowledge 前建议调用寸止确认

---

## PAT-2024-020 MCP Agent 规范格式

- 来源：KotaDB Agent 定义格式
- 日期：2024-12-15

**核心原则**：
- 每个 MCP 工具应定义清晰的：工具权限、约束、反模式、输出类型

### zhi (寸止) - 对话控制 Agent

**成熟度**：L3 (Conditional)

**工具权限**：
- 显示消息给用户
- 接收用户选择/输入
- 显示图片

**约束**：
- 必须等待用户响应后才能继续
- 用户未说"结束"前，保持对话活跃
- 高风险操作前必须调用

**反模式**：
- ❌ 自己假设用户同意
- ❌ 跳过确认直接执行
- ❌ 输出后不等响应就继续

**输出类型**：Message-Only（返回用户响应文本）

---

### ji (记忆) - 知识管理 Agent

**成熟度**：L2 (Parameterized)

**工具权限**：
- 读取/写入项目记忆（`.cunzhi-memory/`）
- 读取全局知识库（`.cunzhi-knowledge/`）

**管理范围**：
| 目录 | 权限 | 用途 |
|------|------|------|
| `.cunzhi-memory/` | 读写 | 项目级临时上下文 |
| `.cunzhi-knowledge/` | 读（写需用户确认） | 全局持久化经验 |

**约束**：
- 必须绑定 git 根目录作为 project_path
- 非 git 仓库禁用
- 写入 `.cunzhi-knowledge/` 前必须调用 `寸止` 确认

**反模式**：
- ❌ 在非 git 目录使用
- ❌ memory 和 knowledge 内容重复（如 problems.md 只能在 knowledge）
- ❌ 不经确认直接写入 knowledge

**输出类型**：Structured（返回记忆/知识内容）

---

### sou (搜索) - 代码探索 Agent

**成熟度**：L4 (Contextual)

**工具权限**：
- 语义搜索代码库
- 返回相关代码片段

**约束**：
- 只读操作
- 需要项目先被索引

**降级方案**（无 API key 时）：
- 语义搜索 → `code_search`
- 精确匹配 → `grep_search`

**反模式**：
- ❌ 用于非代码内容搜索
- ❌ 忽略降级方案导致功能不可用

**输出类型**：Structured（返回代码片段列表）

---

## PAT-2024-019 提示词成熟度模型（7 级）

- 来源：KotaDB 项目
- 日期：2024-12-15

**核心原则**：
- 提示词从简单到复杂分为 7 级
- 从 L1 开始，按需升级，避免过度设计

**级别定义**：
| 级别 | 名称 | 特点 | cunzhi 对应 |
|------|------|------|-------------|
| L1 | Static | 固定指令，无变量 | 静态规则文档 |
| L2 | Parameterized | 使用参数输入 | `ji`（接收 project_path） |
| L3 | Conditional | 根据条件分支 | `zhi`（根据用户响应分支） |
| L4 | Contextual | 引用外部文件/上下文 | `sou`（引用代码库上下文） |
| L5 | Higher Order | 调用其他命令/接收复杂上下文 | 未来扩展 |
| L6 | Self-Modifying | 自我更新内容 | 未来扩展 |
| L7 | Meta-Cognitive | 改进其他命令 | 未来扩展 |

**设计决策**：
- 新建 MCP 工具时，先确定目标级别
- L1-L4 满足大部分需求
- L5+ 仅在需要命令编排时使用

---

## PAT-2024-018 输出纪律（禁止元评论）

- 来源：KotaDB 提示词体系借鉴
- 日期：2024-12-15

**核心原则：**
- 直接输出结果，不加前缀说明
- AI 的价值在于答案本身，不是解释过程

**禁止的元评论模式：**
| 禁止 | 替代 |
|------|------|
| "Based on..." / "根据..." | 直接陈述结论 |
| "Looking at..." / "看起来..." | 直接说发现 |
| "I can see that..." / "我看到..." | 省略 |
| "Here is..." / "这是..." | 省略 |
| "Let me..." / "让我..." | 省略 |
| "It seems..." / "似乎..." | 用"可能"或直接判断 |
| "The problem is..." | 改用 "问题原因：" |
| "I found..." | 改用 "发现：" |

**示例对比：**
```
❌ "Based on my analysis, I found that the issue is in the handleClick function"
✅ "问题定位：`handleClick` 函数第 42 行缺少 null 检查"

❌ "Let me fix this by adding a null check"  
✅ "修复：添加 null 检查"

❌ "Looking at the error message, it seems like the API is failing"
✅ "API 返回 500 错误，原因：数据库连接超时"
```

**适用场景：**
- 所有 AI 输出，尤其是技术分析和问题诊断
- `.cursorrules` 中引用本模式

---

## PAT-2025-001 数据防丢失多级备份模式

- 来源：RI 项目数据丢失事故（P-2025-001）
- 日期：2025-12-31

**核心原则：**
- **不信任单一写入**：在复杂环境（如磁盘空间不足、权限问题）下，主存储文件可能随时损坏。
- **冷热备份结合**：热数据实时保存，冷数据（备份）定期持久化到独立目录。

**实现要点：**
1. **启动即备份**：在应用启动时立即创建一份当前状态的快照。
2. **定时轮转**：使用 `setInterval` 定期备份，并配合 `fs.rmSync` 清理旧版本。
3. **全量覆盖**：备份应包含所有关键文件（如配置文件、LevelDB 数据库目录）。
4. **用户可干预**：暴露 IPC 接口允许用户在进行重大操作前手动备份，或在出事后通过 UI/控制台恢复。

**代码参考：**
- 使用 `fs.copyFileSync` 处理单文件。
- 使用递归函数或 `cp -R` 处理数据库目录（IndexedDB）。

---

## PAT-2024-001 提示词行为导向原则

- 来源：Claude / Windsurf 官方最佳实践
- 日期：2024-12-14

**核心原则：**
- 规则要告诉 AI **做什么**，而不是描述概念
- 避免定义导向（"X 是唯一来源"），改用行为导向（"必须写入 X"）

**示例：**
| 定义导向（差） | 行为导向（好） |
|----------------|----------------|
| "寸止授权是唯一事实来源" | "寸止返回后，根据用户响应继续执行" |
| "X 是唯一合法来源" | "所有记录必须写入 X" |
| "仅 verified 状态视为已完成" | "只有 verified 状态才能标记为已完成" |

---

## PAT-2024-002 Memory vs Knowledge 分层设计

- 来源：imhuso/cunzhi 项目分析
- 日期：2024-12-14

**分层原则：**
- `.cunzhi-memory/` = L1 缓存（项目级、快速、临时）
- `.cunzhi-knowledge/` = L2 持久化（全局级、规范、长期）

**分工：**
| 目录 | 内容 | 同步方式 |
|------|------|----------|
| .cunzhi-memory/ | context/preferences/patterns/rules | 跟项目 git |
| .cunzhi-knowledge/ | problems/regressions/patterns | 独立仓库 push |

**关键约束：**
- `.cunzhi-memory/` 禁止存放 `problems.md`，避免重叠

---

## PAT-2024-003 XML 标签分组规则

- 来源：Windsurf 官方推荐
- 日期：2024-12-14

**用法：**
```xml
<section_name>
## 标题
- 规则内容
</section_name>
```

**好处：**
- 结构清晰，便于 AI 解析
- 支持条件性加载
- 易于维护和扩展


## PAT-2024-004 人类可读即 AI 可读原则

- 来源：用户经验总结
- 日期：2024-12-14

**核心原则：**
- 提示词要具体到行为
- 人能看懂，AI 就一定能看懂
- 避免抽象概念，用具体动作描述

**应用：**
- ❌ "确保质量" → ✅ "运行测试并检查覆盖率"
- ❌ "优化性能" → ✅ "减少 API 调用次数"
- ❌ "保持一致性" → ✅ "使用相同的命名规范"

---

## PAT-2024-005 Smart Guard 依赖检查模式

- 来源：KotaDB MCP 工具设计理念 + Windsurf 最佳实践
- 日期：2024-12-14

**核心原则：**
- 删文件前，先看谁在用它，用的人多就问一声

**实现方式：**
1. 用 `grep_search` 搜索 `import.*<文件名>`
2. 按依赖数量分级处理：
   - ≤2：直接执行
   - 3-5：列出后确认
   - ≥6：警告高风险

**设计决策：**
- 放全局 Rule（所有项目通用）
- 精简为 8 行（AI 遵守率高）
- 与寸止规则联动（高风险时调用寸止）

**不适用场景：**
- 多 Agent 并行架构（如 KotaDB ADW）
- 需要复杂依赖图分析的场景

---

## PAT-2024-006 代码索引流水线架构

- 来源：KotaDB Indexer 模块分析
- 日期：2024-12-14

**核心原则：**
- 给代码建目录，让搜索和依赖分析变快

**流水线架构：**
```
源代码 → AST解析 → 符号提取 → 引用提取 → 依赖图 → 循环检测 → 存储
```

**关键组件：**
| 组件 | 功能 |
|------|------|
| AST Parser | 代码 → 抽象语法树 |
| Symbol Extractor | 提取函数、类、接口等 |
| Reference Extractor | 提取 import、call 关系 |
| Dependency Extractor | 构建文件/符号依赖图 |
| Circular Detector | DFS 检测循环依赖 |

**设计要点：**
- 解析错误不阻塞（返回 null，继续处理其他文件）
- 原子存储（单事务，保证一致性）
- 分层依赖（file→file 和 symbol→symbol）

**应用场景：**
- 代码搜索引擎
- 依赖分析工具
- 重构影响评估
- IDE 代码导航

---

## PAT-2024-007 MCP 工具外部依赖降级方案

- 来源：cunzhi MCP `sou` 工具无 API key 问题
- 日期：2024-12-15

**问题场景：**
- MCP 工具依赖外部 API（如语义搜索需要 embedding API）
- 用户没有 API key 或不想配置

**降级方案：**
- 将触发词映射到 IDE 内置工具
- 保留用户习惯的快捷词，替换底层实现

**示例：**
```markdown
| 用户说"sou" 或需要搜索代码 | 优先 `code_search`，精确匹配用 `grep_search` |
```

**内置替代工具：**
| 原 MCP 工具 | 内置替代 | 说明 |
|-------------|----------|------|
| `sou`（语义搜索） | `code_search` | 智能语义搜索 subagent |
| `sou`（精确匹配） | `grep_search` | ripgrep 精确搜索 |


---

## PAT-2024-005 会话启动双仓库同步检查

- 来源：cunzhi 项目实践
- 日期：2024-12-15

**核心原则：**
- 会话启动时检查**两个仓库**是否有远程更新
- 使用 `git fetch` + `git status` 检测当前分支与上游差异

**检查顺序：**
1. `.cunzhi-knowledge/` - 全局知识库
2. **本项目** - 用户当前工作的项目

**好处：**
- 避免在旧代码上工作
- 确保知识库是最新的
- `git status` 自动检测当前分支，不管是 main 还是其他分支


---

## PAT-2024-006 规则简化原则

- 来源：cunzhi 项目实践
- 日期：2024-12-15

**核心原则：**
- 重复的逻辑应该合并，保持简洁清晰
- 用"两者都执行"代替复制粘贴相同的规则

**示例：**
```markdown
# 差（重复）
- .cunzhi-knowledge/ 执行 git fetch + git status
  - 有更新 → 询问 pull
- 本项目执行 git fetch + git status
  - 有更新 → 询问 pull

# 好（合并）
- 两者都执行 git fetch + git status
  - 有更新 → 询问 pull
```

---

## PAT-2024-008 Electron/macOS 拖拽替代方案

- 来源：RI 项目拖拽排序问题
- 日期：2024-12-15

**问题场景：**
- Electron/macOS 环境下原生 HTML5 DnD 被立即取消
- 只有 dragstart→dragend，没有 drag/dragover/drop 事件

**解决方案：**
自定义鼠标拖拽替代原生 HTML5 DnD：
1. mousedown 超阈值后进入拖拽
2. 创建 fixed+高 z-index 悬浮预览
3. `document.elementFromPoint` 命中目标并显示插入线
4. mouseup 计算索引并更新顺序

**调试技巧：**
- 分层日志（按钮/容器/文档）快速定位事件流
- 运行时开关便于线上甄别问题源头

---

## PAT-2024-009 防抖保存的安全实践

- 来源：RI 笔记窗口数据丢失问题
- 日期：2024-12-15

**核心原则：**
防抖适合频繁输入，但**关键操作前必须强制保存**

**必须添加保存触发点：**
| 触发点 | 操作 |
|--------|------|
| 模式切换前 | 清除防抖定时器 + 立即保存 |
| 窗口失去焦点 | 立即保存 |
| 关闭窗口前 | 强制保存 |
| IPC 事件前 | 保存当前状态 |

---

## PAT-2024-010 IPC 事件语义分离原则

- 来源：RI 笔记内容串联问题
- 日期：2024-12-15

**核心原则：**
**同步列表** 和 **切换状态** 是两个独立概念，不能混用

**事件语义：**
| 事件 | 用途 | 行为 |
|------|------|------|
| `modes-sync` | 同步列表 | 只更新列表，不改变当前状态 |
| `mode-changed` | 切换状态 | 保存旧数据 + 加载新数据 |

**最佳实践：**
- 主窗口和子窗口状态独立管理
- 永远从数据库加载权威数据

---

## PAT-2024-011 IndexedDB 锁定问题诊断流程

- 来源：RI 数据库锁定问题
- 日期：2024-12-15

**诊断步骤：**
```bash
# 检查进程
ps aux | grep -i "electron\|<app-name>" | grep -v grep
# 查看锁文件
lsof "<AppSupport>/<app>/IndexedDB/file__0.indexeddb.leveldb/LOCK"
```

**解决方案优先级：**
1. `pkill -f "<app-name>"` 温和关闭
2. `kill -9` 强制终止
3. 删除 LOCK 文件（最后手段）

---

## PAT-2024-012 Chrome 扩展 iframe 安全降级

- 来源：AI-Sidebar 第三方登录问题
- 日期：2024-12-15

**问题场景：**
第三方服务（尤其是 Google）对 iframe 嵌入有安全限制

**解决方案：**
提供 "Open in Tab" 降级按钮，在新标签页中完成登录

---

## PAT-2024-013 PWA 推送通知限制说明

- 来源：Sitting 久坐提醒 iPhone 问题
- 日期：2024-12-15

**iOS PWA 推送必要条件：**
- iOS 版本 ≥ 16.4
- 通过"添加到主屏幕"安装
- 已授予通知权限
- 应用在后台运行

---

## PAT-2024-014 macOS 应用权限说明模板

- 来源：RI-Flow/flow-learning 权限问题
- 日期：2024-12-15

**常见权限需求：**
| 权限 | 路径 |
|------|------|
| 辅助功能 | 系统偏好设置 → 安全性与隐私 → 辅助功能 |
| 屏幕录制 | 系统偏好设置 → 安全性与隐私 → 屏幕录制 |

---

## PAT-2024-015 脚本文件权限自动设置

- 来源：book-cutting-script-web 权限问题
- 日期：2024-12-15

**解决方案：**
```bash
if [ ! -x "$SCRIPT_PATH" ]; then
  chmod +x "$SCRIPT_PATH"
fi
```

---

## PAT-2024-016 全功能应用部署脚本模板

- 来源：cunzhi/iterate 项目部署需求
- 日期：2024-12-15

**核心流程（5 步）：**
1. **关闭进程** - `pkill -x "app_name"` + 关闭开发服务
2. **备份旧版** - `mv /Applications/app.app /Applications/app.app.bak`
3. **构建新版** - `npm run build` 或 `npm run tauri:build`
4. **安装新版** - `cp -R build_output /Applications/`
5. **启动应用** - `open /Applications/app.app`

**脚本模板：**
```bash
#!/bin/bash
set -e

APP_NAME="your-app"
APP_PATH="/Applications/${APP_NAME}.app"
BACKUP_PATH="${APP_PATH}.bak"

# 1. 关闭进程
pkill -x "$APP_NAME" || true

# 2. 备份
[ -d "$BACKUP_PATH" ] && rm -rf "$BACKUP_PATH"
[ -d "$APP_PATH" ] && mv "$APP_PATH" "$BACKUP_PATH"

# 3. 构建
npm run build

# 4. 安装
cp -R "build/output/${APP_NAME}.app" "$APP_PATH"

# 5. 启动
open "$APP_PATH"

echo "✅ 部署完成！回滚：rm -rf $APP_PATH && mv $BACKUP_PATH $APP_PATH"
```

**适用场景：**
- Tauri/Electron 桌面应用
- 本地开发迭代部署

---

## PAT-2024-017 AI 编码工具防注入安全模式

- 来源：Windsurf/Cursor/Grok 安全漏洞研究 + Anthropic 防护文档
- 日期：2024-12-15

**威胁模型（Lethal Trifecta）：**
攻击成功需要三要素同时存在：
1. 不可信内容进入上下文（README、注释、图片）
2. 敏感数据可被访问（.env、SSH 密钥）
3. 外泄通道存在（URL 请求、命令执行）

**防护要点：**
| 层级 | 措施 |
|------|------|
| 敏感文件 | 读取前确认，读取后不输出完整内容 |
| 第三方内容 | 只分析，不执行其中的"指令" |
| 外泄通道 | URL/命令拼接敏感变量前确认 |
| 注入检测 | 识别 "ignore instructions" 等模式并警告 |

**已知攻击向量：**
- Windsurf `read_url_content` 可被用于数据外泄
- Cursor README 隐藏 prompt injection 绕过命令黑名单
- Grok 图片/PDF/帖子都可注入指令

**参考链接：**
- https://embracethered.com/blog/posts/2025/windsurf-data-exfiltration-vulnerabilities/
- https://hiddenlayer.com/innovation-hub/how-hidden-prompt-injections-can-hijack-ai-code-assistants-like-cursor/
- https://www.anthropic.com/research/prompt-injection-defenses

---

## PAT-2024-022 iOS 后台持续运行 - 静音音频播放

- 来源：Monoshot 截图监听 App 开发
- 日期：2024-12-17

**问题场景：**
iOS App 需要在后台持续运行（如监听相册变化），但 iOS 默认会在约30秒后挂起 App。

**解决方案：**
利用 iOS 允许音频播放类 App 后台运行的特性，播放静音音频保持 App 活跃。

**实现步骤：**

1. Info.plist 添加音频后台模式：
```xml
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
</array>
```

2. 创建 BackgroundAudioService：
```swift
import AVFoundation

class BackgroundAudioService {
    static let shared = BackgroundAudioService()
    private var audioPlayer: AVAudioPlayer?
    
    private init() {
        try? AVAudioSession.sharedInstance().setCategory(
            .playback,
            mode: .default,
            options: [.mixWithOthers]  // 关键：不打断其他音频
        )
        try? AVAudioSession.sharedInstance().setActive(true)
    }
    
    func startBackgroundAudio() {
        // 生成静音 WAV 数据并循环播放
        audioPlayer?.numberOfLoops = -1  // 无限循环
        audioPlayer?.volume = 0.0  // 完全静音
        audioPlayer?.play()
    }
    
    func stopBackgroundAudio() {
        audioPlayer?.stop()
    }
}
```

3. 在 App 生命周期中调用：
- `didEnterBackground` → `startBackgroundAudio()`
- `willEnterForeground` → `stopBackgroundAudio()`

**验证方法：**
- 控制中心音乐控件显示 App 名称
- Xcode Console 打印 "Background audio started"
- 灵动岛/状态栏显示音频指示器

**注意事项：**
| 类型 | 说明 |
|------|------|
| ⚠️ App Store | 无法上架，Apple 会拒绝 |
| ⚠️ 电池 | 略微增加消耗 |
| ✅ 本地使用 | 仅限个人/开发使用 |
| ✅ 音频兼容 | `mixWithOthers` 不打断用户音乐 |

**适用场景：**
- 截图监听 App
- 剪贴板监听
- 任何需要后台持续监听系统事件的 App

## PAT-2024-021: Electron 中实现类似 Chrome 的浮动搜索栏

### 问题
在 Electron 应用中实现 Cmd+F 搜索功能，需要让搜索栏浮在 BrowserView 上方，类似 Chrome 的效果。

### 挑战
- BrowserView 总是渲染在 HTML 元素之上，无法用普通 CSS overlay
- `webContents.blur()` 方法不存在，不能用于转移焦点

### 解决方案
使用 **BrowserWindow 子窗口** 作为搜索栏：

1. 创建独立的 `search-bar.html` 作为子窗口内容
2. 在 `electron-main.js` 中创建无边框、透明的子窗口：
   ```javascript
   searchBarWindow = new BrowserWindow({
     frame: false,
     transparent: true,
     parent: mainWindow,
     alwaysOnTop: true
   });
   ```
3. 监听主窗口 move/resize 事件，动态更新搜索栏位置
4. 使用 `webContents.findInPage()` API 执行搜索
5. 监听 `found-in-page` 事件获取搜索结果

### 关键代码位置
- `search-bar.html` - 搜索栏 UI
- `electron-main.js` showSearchBar/hideSearchBar/toggleSearchBar 函数
- BrowserView 的 `before-input-event` 中拦截 Cmd+F

### 注意事项
- 子窗口需要设置 `nodeIntegration: true, contextIsolation: false` 才能使用 ipcRenderer
- 搜索栏位置需要考虑 sidebar 宽度和顶部 inset

---

## PAT-2024-023: AI/LLM 品牌图标获取方法

- 来源：iOS AI 全家桶应用开发
- 日期：2024-12-20

**场景**: 需要获取 AI 服务（ChatGPT、Claude、Gemini 等）的高质量品牌图标

**推荐资源**: [lobehub/lobe-icons](https://github.com/lobehub/lobe-icons)

**许可证**: MIT（免费商用）

### CDN 使用方法

**PNG 格式（推荐用于 iOS/移动端）**
```bash
# 下载单个图标
curl -L -o [图标名].png "https://unpkg.com/@lobehub/icons-static-png@latest/light/[图标名].png"

# 示例：下载 OpenAI 图标
curl -L -o openai.png "https://unpkg.com/@lobehub/icons-static-png@latest/light/openai.png"
```

**SVG 格式（推荐用于 Web）**
```bash
curl -L -o [图标名].svg "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/[图标名].svg"
```

### 可用的 AI 图标列表（部分）

| 图标名 | 服务 |
|--------|------|
| openai | ChatGPT/OpenAI |
| claude | Claude/Anthropic |
| gemini | Google Gemini |
| perplexity | Perplexity AI |
| deepseek | DeepSeek |
| grok | xAI Grok |
| mistral | Mistral AI |
| cohere | Cohere |
| huggingface | HuggingFace |
| metaai | Meta AI |
| githubcopilot | GitHub Copilot |
| doubao | 豆包 |
| qwen | 通义千问 |
| kimi | Kimi/Moonshot |
| zhipu | 智谱清言 |
| minimax | 海螺AI/MiniMax |
| notebooklm | Google NotebookLM |

### 批量下载脚本

```bash
cd /path/to/your/icons/folder

icons=("openai" "claude" "gemini" "perplexity" "deepseek" "grok" "mistral" "cohere" "huggingface" "metaai" "githubcopilot" "doubao" "qwen" "kimi" "zhipu" "minimax" "notebooklm")

for icon in "${icons[@]}"; do
    curl -L -o "${icon}.png" "https://unpkg.com/@lobehub/icons-static-png@latest/light/${icon}.png"
done
```

### 查看所有可用图标

- 在线浏览: https://lobehub.com/icons
- CDN 目录:
```bash
curl -sL "https://unpkg.com/@lobehub/icons-static-png@latest/light/" | grep -oE '"https://[^"]*\.png"'
```

### 注意事项

1. 图标分辨率为 1024x1024，适合各种场景
2. 提供 light/dark 两种主题版本
3. 定期更新，包含最新的 AI 服务品牌
4. 使用时注意遵守各品牌的商标使用规范

## PAT-2024-021 应用项目一键更新脚本规范

- 来源：CunZhi 项目实践
- 日期：2024-12-22

**核心原则：**
- 每个桌面/移动应用项目都必须配置一个全面、系统、清晰的一键更新脚本
- 脚本应能指导具体行为，消除手动编译、签名等繁琐操作

---

### macOS 应用（Tauri/Electron/Swift）

**必备步骤：**
1. **编译** - `cargo build --release` 或 `npm run build`
2. **构建** - `npm run tauri build` 或 `xcodebuild`
3. **同步** - 复制最新组件到 .app 内（避免缓存）
4. **签名** - `codesign --force --deep --sign - /Applications/xxx.app`
5. **清理** - `xattr -cr /Applications/xxx.app`
6. **安装** - 复制到 `/Applications/`

**关键命令：**
```bash
codesign --force --deep --sign - "$APP_PATH"  # ad-hoc 签名
xattr -cr "$APP_PATH"  # 移除扩展属性
```

---

### iOS 应用（Swift/Flutter/React Native）

**必备步骤：**
1. **依赖** - `pod install` 或 `flutter pub get`
2. **编译** - `xcodebuild -scheme xxx -configuration Release`
3. **签名** - 配置 Provisioning Profile 和证书
4. **打包** - `xcodebuild -exportArchive`
5. **安装** - 通过 TestFlight 或 `ios-deploy`

**关键命令：**
```bash
xcodebuild -workspace xxx.xcworkspace -scheme xxx -configuration Release archive
xcodebuild -exportArchive -archivePath xxx.xcarchive -exportPath ./build
```

---

### Android 应用（Kotlin/Flutter/React Native）

**必备步骤：**
1. **依赖** - `./gradlew dependencies` 或 `flutter pub get`
2. **编译** - `./gradlew assembleRelease`
3. **签名** - 配置 keystore 和 signingConfigs
4. **对齐** - `zipalign -v 4 app.apk app-aligned.apk`
5. **安装** - `adb install -r app.apk`

**关键命令：**
```bash
./gradlew assembleRelease
./gradlew bundleRelease  # AAB 格式
adb install -r app/build/outputs/apk/release/app-release.apk
```

---

### 通用反模式

- ❌ 每次手动执行多个命令
- ❌ 忘记同步内部组件导致版本不一致
- ❌ 忘记签名导致应用无法运行
- ❌ 依赖构建工具缓存而不验证

### 通用最佳实践

- ✅ 脚本开头添加 `set -e` 遇错即停
- ✅ 关闭正在运行的应用后再更新
- ✅ 使用 MD5/SHA 验证二进制文件一致性
- ✅ 脚本输出清晰的步骤提示

## PAT-2024-024 Tauri 应用更新必须同步主程序

- 来源：P-2024-022 iterate.app 更新后工具不显示
- 日期：2024-12-22

**核心经验：**
Tauri 应用的更新脚本必须同时同步**主程序**和**子进程**，否则 Tauri 构建缓存会导致组件版本不一致。

**具体做法：**
```bash
# 1. 同步主程序（Tauri 前端+后端命令）
sudo rm "$APP_PATH/Contents/MacOS/$APP_NAME"
sudo cp "$PROJECT_DIR/target/release/$APP_NAME" "$APP_PATH/Contents/MacOS/$APP_NAME"

# 2. 同步子进程（MCP 服务器等）
sudo rm "$APP_PATH/Contents/MacOS/$MCP_BIN_NAME"
sudo cp "$PROJECT_DIR/target/release/$MCP_BIN_NAME" "$APP_PATH/Contents/MacOS/$MCP_BIN_NAME"

# 3. 重新签名
sudo codesign --force --deep --sign - "$APP_PATH"
```

**适用场景：**
- Tauri 应用新增/修改 Tauri 命令
- Tauri 应用新增/修改前端组件
- 子进程（如 MCP 服务器）功能变更

**反模式：**
- ❌ 只同步子进程，不同步主程序
- ❌ 依赖 Tauri 构建缓存

---

## PAT-2024-025 grep 搜索中文字符的正确用法

- 来源：cunzhi 知识库维护实践
- 日期：2024-12-22

**问题现象**：
grep 搜索含中文冒号 `：` 的内容时报错：
```bash
grep "- 类型：" file.md
# grep: invalid option --
```

**根因**：
中文冒号 `：` 的 UTF-8 字节序列包含 `-` 字符（0x2D），grep 误解析为命令选项。

**解决方案**：
```bash
# 方法1：使用 -e 参数
grep -e '- 关联问题：' regressions.md

# 方法2：使用 -- 终止选项解析
grep -- '- 关联问题：' regressions.md

# 方法3：用于计数
grep -c -e '- 类型：' regressions.md
```

**适用场景**：
- 搜索含中文标点的 Markdown 文件
- 统计中文字段数量
- 任何 grep 搜索中文内容

---

## PAT-2024-026 Shell 脚本 sudo 密码 GUI 弹窗

- 来源：cunzhi update.sh 优化
- 日期：2024-12-22

**问题现象**：
运行需要 sudo 权限的脚本时，必须切回终端窗口输入密码，打断工作流。

**解决方案**：
使用 osascript 在脚本开头弹出 macOS 密码对话框：
```bash
acquire_sudo() {
    # 检查是否已有 sudo 权限
    if sudo -n true 2>/dev/null; then
        return 0
    fi
    # 弹出 GUI 密码对话框
    osascript -e 'do shell script "echo" with administrator privileges' 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "❌ 未获取管理员权限"
        exit 1
    fi
}

# 在脚本开头调用
acquire_sudo
```

**适用场景**：
- macOS 上需要 sudo 的自动化脚本
- 从 IDE 终端运行的构建/部署脚本
- 任何希望减少终端交互的场景

## PAT-2024-027: 软链接 vs 硬链接

### 软链接（Symbolic Link）
- **类似**：Windows 快捷方式
- **命令**：`ln -s 目标 链接名`
- **特点**：
  - 删除原文件 → 链接失效
  - 可跨文件系统、可链接目录
  - `ls -l` 显示 `->` 指向

### 硬链接（Hard Link）
- **类似**：同一文件的多个名字
- **命令**：`ln 目标 链接名`
- **特点**：
  - 删除原文件 → 链接仍有效
  - 不能跨文件系统、不能链接目录

### 使用场景
- **软链接**：配置共享、目录链接
- **硬链接**：备份、节省空间

## PAT-2024-028: Windsurf AI 强制调用 zhi 工具的规则配置

**场景**：让 Windsurf AI 在每次回复结束时必须调用 MCP 工具 `zhi` 进行确认，防止 AI 自动结束对话

**解决方案**：纯规则约束（无需代码拦截）

**关键规则文件**：
1. `~/.codeium/windsurf/rules/01-core.md` - 核心原则，要求"任何对话都要调用 MCP 工具 zhi"
2. `~/.codeium/windsurf/rules/05-output-style.md` - 输出规范，明确"MUST call MCP tool zhi"并"FORBIDDEN output literal string without tool call"
3. `~/.codeium/windsurf/memories/global_rules.md` - 索引文件，指向所有规则

**关键措辞**：
- "必须调用 MCP 工具 zhi（寸止）" 而不是 "调用寸止"
- "禁止仅输出文字 zhi 代替工具调用"
- 英文版更清晰："you MUST call the MCP tool" + "FORBIDDEN: Do NOT output literal string"

**失败的方案**：
- MITM 代理：Windsurf 使用证书钉扎，不信任系统证书
- 探测本地 API：50973/59538 是 Gemini A2A 端口，不是聊天 API

**关联**：P-2024-465

## PAT-2025-001: macOS 应用图标设置经验

### 问题场景
为 SwiftUI macOS 应用设置自定义图标

### 解决方案
macOS 应用图标可以通过简单的复制粘贴方式设置：

1. **准备图标文件**：准备 `.icns` 格式的图标文件（可以从其他应用复制，或使用工具生成）

2. **放置位置**：将图标文件放到 `YourApp.app/Contents/Resources/AppIcon.icns`

3. **Info.plist 配置**：确保 `Info.plist` 中引用了图标：
   ```xml
   <key>CFBundleIconFile</key>
   <string>AppIcon</string>
   ```

4. **Finder 快捷方式**：
   - 选中任意应用，按 `Cmd+I` 打开"显示简介"窗口
   - 点击左上角的应用图标（会出现蓝色选中框），按 `Cmd+C` 复制
   - 打开目标应用的"显示简介"窗口
   - 点击左上角的图标位置，按 `Cmd+V` 粘贴即可替换图标

### 关键点
- macOS 图标机制非常灵活，支持直接复制粘贴到"显示简介"窗口左上角的图标位置
- `.icns` 是 macOS 原生图标格式，包含多种分辨率
- 修改后可能需要清除图标缓存才能看到更新

## PAT-2025-001: macOS 应用图标设置经验

### 问题场景
为 SwiftUI macOS 应用设置自定义图标

### 解决方案
macOS 应用图标可以通过简单的复制粘贴方式设置：

1. **准备图标文件**：准备 `.icns` 格式的图标文件（可以从其他应用复制，或使用工具生成）

2. **放置位置**：将图标文件放到 `YourApp.app/Contents/Resources/AppIcon.icns`

3. **Info.plist 配置**：确保 `Info.plist` 中引用了图标：
   ```xml
   <key>CFBundleIconFile</key>
   <string>AppIcon</string>
   ```

4. **Finder 快捷方式**：
   - 选中任意应用，按 `Cmd+I` 打开"显示简介"窗口
   - 点击左上角的应用图标（会出现蓝色选中框），按 `Cmd+C` 复制
   - 打开目标应用的"显示简介"窗口
   - 点击左上角的图标位置，按 `Cmd+V` 粘贴即可替换图标

### 关键点
- macOS 图标机制非常灵活，支持直接复制粘贴到"显示简介"窗口左上角的图标位置
- `.icns` 是 macOS 原生图标格式，包含多种分辨率
- 修改后可能需要清除图标缓存才能看到更新

---

## PAT-2026-002: 鲁棒的 AI 聊天记录抓取模式
- **适用场景**: 抓取包含高度混淆类名的 AI 网页（如 ChatGPT, DeepSeek）。
- **核心模式**:
    1. **层级探测**: 优先寻找带有特定属性（如 `data-testid`）或已知组件类名（如 `ds-markdown`）的元素。
    2. **递归 Markdown 提取**: 通过 `Node.TEXT_NODE` 和 `Node.ELEMENT_NODE` 递归，精准保留列表、代码块（带语言）、加粗、链接等格式。
    3. **多层级标题探测**: 优先从 URL 匹配的侧边栏项、页面 Header 或当前激活态组件中提取标题，而非仅依赖 `document.title`。
    4. **DeepSeek 角色识别**: 结合 `.ds-message` 容器的奇偶索引（DeepSeek 常用模式）和 `.ds-message-bubble--user` 类名进行双重校验。
- **关联 P-ID**: P-2026-002

---

## PAT-2026-003: 开发者工具的黑白极简（B&W Minimalist）UI 模式
- **适用场景**: 需要高辨识度、专业感且审美前卫的浏览器扩展或开发者工具。
- **核心模式**:
    1. **色彩压缩**: 严格限制色彩空间为 #000, #fff, 和极少量的 #666。
    2. **形态重塑**: 全局移除圆角（Border-radius: 0），使用硬朗的直线边框。
    3. **负空间交互**: 按钮采用反色交互（默认白底黑字 -> 悬停黑底白字）。
- **关联 P-ID**: P-2026-003

---

## PAT-2026-004: Chrome 插件的混合模式数据管理架构
- **适用场景**: 需要同时支持"即用即走"和"持久化管理"的浏览器插件。
- **核心模式**:
    1. **双模式设计**: 快速导出 + 历史管理。
    2. **去重机制**: 基于 conversationId 的提取与查重。
    3. **容量管理**: 监控 chrome.storage.local 使用率并在 90% 时触发清理。
- **关联 P-ID**: P-2026-004

---

## PAT-2026-005: 对标学习的系统化方法
- **适用场景**: 需要快速提升产品功能完整性，参考成熟竞品。
- **核心模式**: 克隆分析、结构化对比、取舍原则、分阶段实施。
- **关联 P-ID**: P-2026-004

---

## PAT-2026-006: macOS Swift 全局热键监听

- **适用场景**: macOS 原生 Swift 应用需要实现系统级全局快捷键（无论应用是否在前台）
- **核心模式**:
  1. **NSMenuItem.keyEquivalent 的局限**: 只是菜单快捷键，需要应用前台且菜单激活才响应
  2. **全局监听**: 使用 `NSEvent.addGlobalMonitorForEvents(matching: .keyDown)` 监听系统级按键
  3. **keyCode 映射**: Q=12, W=13, E=14... 使用 keyCode 而非字符判断
  4. **权限要求**: 必须在 System Preferences → Security & Privacy → Accessibility 中授权
  5. **签名重建**: 修改可执行文件后需 `codesign --force --deep --sign -` 重新签名，否则权限失效

```swift
// 在 applicationDidFinishLaunching 中添加
NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { [weak self] event in
    // Option + Q (keyCode 12)
    if event.modifierFlags.contains(.option) && event.keyCode == 12 {
        self?.controller.toggleVisibility()
    }
}
```

- **关联 P-ID**: P-2026-005

## PAT-2025-001: AI Sidebar 聊天导出功能集成

### 问题
集成聊天导出功能到 AI-Sidebar 扩展，支持：
1. Cmd+S 快捷键呼出导出面板
2. 导出 Markdown/JSON
3. 保存到本地库（可搜索关键词）
4. History 面板 Link/Content 切换

### 关键技术点
1. **跨域 IndexedDB 隔离**：content script 保存的数据无法在 sidebar 访问
   - 解决：通过 background script 队列转发，sidebar 定期处理队列
2. **SVG className 类型**：`el.className` 对 SVG 返回 `SVGAnimatedString`，需要判断类型
3. **存储键一致性**：读写使用相同的 storage key（tabsCollapsed vs sidebarCollapsed）
4. **UTF-8 编码**：blob URL 打开 Markdown 需要 HTML 包装器设置 charset

### 文件修改
- `manifest.json` - 注册 aisb-export-chat 命令
- `js/plugins/exporter-logic.js` - 导出逻辑 + Cmd+S 面板
- `js/plugins/storage-manager.js` - IndexedDB CRUD
- `js/popup.js` - History Link/Content 切换、搜索功能
- `js/background.js` - 消息队列转发
- `css/panel.css` - 样式
