# /sync-knowledge

同步 .cunzhi-knowledge 知识库仓库的内部循环命令。

## 使用场景

- 对话开始时检查知识库更新
- 沉淀经验后同步到远程
- 多设备间同步知识库

## 执行步骤

1. **进入知识库目录**：`cd .cunzhi-knowledge`
2. **拉取更新**：`git fetch && git pull --rebase`
3. **检查本地变更**：`git status`
4. **提交本地变更**（如有）：
   - `git add -A`
   - `git commit -m "sync: <summary>"`
5. **推送到远程**：`git push origin main`
6. **返回项目目录**

## 冲突处理

如果有冲突：
1. 显示冲突文件列表
2. 调用 zhi 让用户选择处理方式
3. 解决后继续同步

## 自动触发时机

| 触发点 | 动作 |
|--------|------|
| 对话开始 | fetch + status 检查 |
| ji(沉淀) 后 | commit + push |
| 对话结束 | 如有未提交则提醒 |

## 示例输出

```
✓ Fetched from origin
✓ Already up to date
✓ Local changes: 2 files modified
✓ Committed: sync: add P-2024-025 oauth bug
✓ Pushed to origin/main
```
