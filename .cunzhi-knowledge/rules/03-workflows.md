# Bug 修复与知识库流程

## Bug 修复流程（IMPORTANT）

### 修复完成的必要条件
Bug 标记为"已修复"前，**必须同时满足**：
1. 创建回归检查，覆盖原始失败场景
2. 回归检查在当前版本实际通过
3. 问题原因、修复方式沉淀到 `.cunzhi-knowledge/problems.md`
4. 回归检查写入 `.cunzhi-knowledge/regressions.md`
5. 解决模式沉淀到 `.cunzhi-knowledge/patterns.md`
6. 每个步骤完成后调用 `寸止` 汇报进度
7. 通过最终 `寸止` 授权

### 回归检查强制要求
- **P-ID 与 R-ID 一一对应**
- 格式：R-YYYY-NNN
- 类型：unit / e2e / integration / 手工检查
- 禁止只写 problems.md 而跳过 regressions.md

### 状态枚举
- **open** → **fixed** → **verified**
- 只有 `verified` 状态才能标记为已完成
- 禁止跳过 `fixed` 直接到 `verified`

## 全局知识库规则

### 唯一来源
- 所有问题与经验记录必须写入项目根目录下的 `.cunzhi-knowledge/` 文件夹
- Bug 记录：`.cunzhi-knowledge/problems.md`
- 回归经验：`.cunzhi-knowledge/regressions.md`
- 最佳实践：`.cunzhi-knowledge/patterns.md`
- **禁止在根目录创建临时/副本文件进行中转。**

### 写入方式（CRITICAL）
- **禁止**使用 `edit` 工具直接编辑 `.cunzhi-knowledge/*.md` 文件
- **必须**通过 `ji(沉淀)` 工具写入，它会自动执行 git add → commit → push
- **追加逻辑**：使用 `>>` 或编辑器追加模式，禁止使用 `>` 或 `cp` 直接覆盖整个文件。
- 原因：直接编辑不会触发自动同步，导致内容只在本地

### 同步与冲突要求
- `ji(沉淀)` 会自动执行 `git add / commit / push`
- **冲突预警**：发现 ID 冲突（如 P-ID 重复）时，必须调用 `zhi` 确认是否需要重编号，严禁直接跳过或覆盖旧记录。
- **文件合并**：若必须进行大规模合并，优先使用 Git 提供的合并工具，严禁人工手动覆盖。
- 如果看到 "⚠️ Git 同步失败"，需要手动处理。
- remote：https://github.com/kexin94yyds/cunzhi-knowledge.git

### 经验沉淀引导
- 对话结束前 → 调用 `寸止` 简要回顾
- 引导用户思考：解决了什么问题？学到了什么？
- 用户有想法时 → 协助整理并记录

## 输出纪律

**禁止元评论模式：**
- ❌ "Based on..." / "根据..."
- ❌ "Looking at..." / "看起来..."
- ❌ "I can see that..." / "我看到..."
- ❌ "Let me..." / "让我..."

**替代方式：** 直接陈述结论，不加前缀说明

## Smart Guard

删除/重命名/移动文件前，执行 `grep_search` 搜索依赖：
- 依赖数 ≤2 → 直接执行
- 依赖数 3-5 → 列出文件，调用 `寸止` 确认
- 依赖数 ≥6 → 调用 `寸止` 说明高风险

命名：文件 kebab-case | 类 PascalCase | 函数 camelCase | 测试 *.test.ts
