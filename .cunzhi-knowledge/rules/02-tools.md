# MCP 工具说明

## 快捷调用

| 触发条件 | 动作 |
|----------|------|
| 对话开始 | 先调用 `ji`（action=回忆）获取项目信息，再调用 `zhi` 确认 |
| 用户说"ji" | AI 根据上下文自动判断执行哪个 action |
| 用户输入"请记住：" | 总结后调用 `ji`（action=记忆） |
| 用户说"等一下" | 调用 `zhi` MCP 工具 |
| 用户说"sou" | 代码搜索：优先 `sou` MCP，无 API 时用 `code_search` 或 `grep_search` |
| 用户说"xi" | 调用 `xi` 在 `.cunzhi-knowledge/` 中查找历史经验 |
| prompts 目录名 | 调用 `ci` MCP 工具搜索 `prompts/<目录>/` 找相关模板并应用 |
| 解决问题后 | 调用 `ji`（action=沉淀） |
| 用户说"批量任务" | 调用 `pai` MCP 工具生成子代理提示词 |
| 用户说"验收" | 执行 `git diff`，调用 `寸止` 展示验收结果 |
| 对话结束 | 调用 `ji(action=摘要)` 记录会话 |

## 工具层级

**L0: zhi (寸止)** - 顶层协调者
- 定位：所有对话必经，控制任务流程
- 权限：显示消息、接收输入、显示图片、确认/授权/反问/终止
- 反模式：❌ 自己假设同意 ❌ 跳过确认

**L1: 执行层工具**

### ji (记忆)
- action 类型：回忆/记忆/沉淀/摘要
- 约束：必须绑定 git 根目录
- 反模式：❌ 非 git 目录使用 ❌ 不经确认写 knowledge

### sou (搜索)
- **自动判断搜索类型**：
  - 代码相关（函数名、变量、文件路径、项目内容）→ `mcp0_sou` 或 `code_search`
  - 外部知识（API 文档、框架用法、最新版本、外部服务）→ `search_web`
- 代码搜索：语义搜索代码库
- 降级：无 API 时用 `code_search` / `grep_search`
- 网络搜索：query 涉及外部知识时自动调用 `search_web`

### xi (习)
- 功能：在 `.cunzhi-knowledge/` 中查找历史经验
- 搜索范围：patterns.md、problems.md、regressions.md

### pai (派发)
- 功能：生成子代理提示词
- 遵循：`prompts/workflows/batch-task.md` 工作流
- 反模式：❌ 用模糊范围 ❌ 跳过验收

### ci（提示词库）
- 功能：搜索 `prompts/<目录>/` 找相关模板并应用
- 触发：用户输入 prompts 目录名（如 ci、git、testing）
- 参数：directory（目录名）、project_path、query（可选）
- 反模式：❌ 列出文件而不应用 ❌ 忽略目录名关键词

## 提示词库

存储位置：`.cunzhi-knowledge/prompts/`

**定位**：AI 协作技能库，开发全流程的模板、工作流和最佳实践参考

**调用方式**：按需搜索对应目录，参考 `prompts/README.md`
