# 工程运行手册

## Bug 修复闭环（6 步）

```
1. 修 Bug
2. 写回归检查
3. 写 problems.md + regressions.md
4. 运行回归检查通过
5. 同步知识库到 GitHub
6. 调用寸止确认完成
```

---

## 状态流转

```
open → fixed → verified
  ↑       ↑        ↑
发现问题  代码修复  回归通过
```

**只有 verified 才算完成**

---

## 同步命令

```bash
cd .cunzhi-knowledge
git add .
git commit -m "record: P-YYYY-NNN 问题标题"
git push
```

---

## 新项目接入

```bash
git clone https://github.com/kexin94yyds/cunzhi-knowledge.git .cunzhi-knowledge
```

---

## 文件职责

| 文件 | 职责 |
|------|------|
| problems.md | 问题事实库 |
| regressions.md | 回归检查索引 |
| patterns.md | 可复用模式 |

---

## ID 规则

- **P-YYYY-NNN**：问题 ID
- **R-YYYY-NNN**：回归检查 ID
- 序号递增，不复用
