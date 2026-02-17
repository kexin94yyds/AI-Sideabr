# /settle

沉淀三件套的内部循环命令。确保每次沉淀都自动同步到 GitHub。

## 使用场景

- 解决 Bug 后记录经验
- 完成功能后沉淀模式
- 任何需要写入 `.cunzhi-knowledge/` 的场景

## 执行步骤（CRITICAL）

1. **调用 zhi** 询问要沉淀的类型：
   - problems（P-YYYY-NNN）
   - patterns（PAT-YYYY-NNN）
   - regressions（R-YYYY-NNN）

2. **准备内容** 按对应格式整理

3. **调用 ji(沉淀)** 写入（自动 git push）
   - `ji(action=沉淀, category=problems, content=...)`
   - `ji(action=沉淀, category=patterns, content=...)`
   - `ji(action=沉淀, category=regressions, content=...)`

4. **确认同步结果**
   - 看到 "🚀 已自动推送到 GitHub" → 成功
   - 看到 "⚠️ Git 同步失败" → 需要手动处理

## 禁止事项

- ❌ 使用 `edit` 工具直接编辑 `.cunzhi-knowledge/*.md`
- ❌ 跳过 regressions.md
- ❌ 不等 git push 完成就说"沉淀完成"

## 三件套顺序

```
problems.md → patterns.md → regressions.md
     ↓              ↓              ↓
  P-YYYY-NNN    PAT-YYYY-NNN    R-YYYY-NNN
```

**P-ID 与 R-ID 必须一一对应**

## 示例输出

```
✅ 已沉淀到 .cunzhi-knowledge/problems.md
🚀 已自动推送到 GitHub

✅ 已沉淀到 .cunzhi-knowledge/patterns.md
🚀 已自动推送到 GitHub

✅ 已沉淀到 .cunzhi-knowledge/regressions.md
🚀 已自动推送到 GitHub

✓ 三件套沉淀完成，已同步到 GitHub
```
