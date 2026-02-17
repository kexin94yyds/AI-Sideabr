# cunzhi-knowledge

跨项目全局知识库，作为所有项目的"问题事实源"。

## 文件说明

| 文件 | 用途 |
|------|------|
| `problems.md` | 问题事实库，记录所有已发生的问题 |
| `regressions.md` | 回归检查索引，绑定问题与检查方法 |
| `patterns.md` | 可复用模式，跨项目最佳实践 |

## 使用方式

在项目中添加为 submodule：

```bash
git submodule add https://github.com/yourname/cunzhi-knowledge .cunzhi-knowledge
```

## Windsurf Global Rules 配置

```text
所有 Bug 经验与问题记录，统一写入：
- .cunzhi-knowledge/problems.md
- .cunzhi-knowledge/regressions.md

若以上路径或目录不存在：
- 必须提示用户先初始化全局知识库
- 禁止在项目内自动新建任何替代的 problems.md 或 regressions.md
```
