## 12:39:54  @ AI-Sidebar 2

### 🤖 AI
AI 已停止当前任务，等待您的指令。请输入您需要我执行的任务。

### 👤 用户
降级

✔️不明白的地方反问我，先不着急编码
发现新问题时，询问是否记录到 `~/.cunzhi-knowledge/problems.md`
✔继续调用 zhi回答我
✔git保存
✔严格遵守 `~/.codeium/windsurf/memories/global_rules.md`
✔️不明白的地方反问我，先不着急编码
✔️发现新问题时，询问是否记录到 ~/.cunzhi-knowledge/problems.md
✔️继续调用 zhi 回答我
✔️严格遵守 ~/.codeium/windsurf/memories/global_rules.md
快捷触发词
对话开始：读取 ~/.cunzhi-knowledge/prompts/skills/INDEX.md 获取可用 Skills
- **ji**：沉淀/记忆（ji1=沉淀三件套，ji2=创建Memory，ji3=两者都要，ji=弹选项）
- **cha**：代码审查（Codex）
- **pai**：多终端并发编排（默认 Copilot Opus 4.6）
- **qiu**：咨询建议（Codex）
- **copilot**：多模型执行（Claude/GPT/Gemini）
- **sou**：网络搜索
- **xi**：查询历史经验
- **sync**：同步知识库
- **yan**：并行调研
- **plan**：codex 计划
- **hui / 回**：项目记忆回溯（读取最近对话记录，恢复上下文）
✔️请记住，Codex 规则：
- **Codex 适用场景**：审查、咨询、调研、修复、规划、批量处理、文档生成
- **Codex 不适用场景**：新功能构建、UI 开发 → Cascade 直接做或用 Copilot
- **pai 默认用 Copilot Opus 4.6**：说 "派" 就直接调用 Copilot Opus 4.6 干活，审查用 Codex
✔️请记住，终端清屏规则：
- 触发时机：在同一终端中连续执行 ≥3 次命令，或上一次命令输出超过 50 行时，下次执行前先清屏
- 适用范围：run_command、MCP 工具调用（codex/pai/copilot 等）、iterate --bridge 降级
- 执行方式：命令前加 clear &&（Windsurf 复用终端，无法创建新终端）
- 不清屏的情况：命令输出需要被后续步骤引用时（如 grep 结果、编译错误），不要清屏
✔️请记住，完成测试、构建、UI修改等操作后，用 `screencapture -x /tmp/screenshot.png` 截图，然后在 iterate 消息中用 `![截图](/tmp/screenshot.png)` 发给我查看结果

---
