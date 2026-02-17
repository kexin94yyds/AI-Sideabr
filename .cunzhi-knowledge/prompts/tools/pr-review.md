# /pr-review

**模板分类**: Action
**提示级别**: 2 (Parameterized)

审查其他贡献者的 Pull Request。通过 `$ARGUMENTS` 提供 PR 编号。

## 审查前设置

- `git fetch --all --prune`, `git pull --rebase`
- 确保本地 `develop` 是最新的
- 从干净的工作区开始
- 验证 PR 遵循分支流程
- 使用 `gh pr checkout $ARGUMENTS` checkout PR 分支

## 上下文收集

- 阅读链接的问题、计划和 PR 描述
- 注意声称的验证命令、影响的环境和附加的日志

## 代码检查

- 逐模块检查 diff（`gh pr diff --stat`, `git diff`）
- 关注正确性、性能和安全性
- 高亮风险更改、缺失的边缘情况或偏离计划/架构

## 测试 & 工具

- 执行适合更改的验证级别（最少 Level 2）
- 记录结果和失败，标出与贡献者报告结果的任何偏差
- 确认集成套件触及真实服务

## 文档 & 发布说明

- 验证行为更改时文档已更新
- 检查发布影响/回滚说明（如提供）

## 手动验证

- 如可行，运行本地冒烟测试验证行为

## 反馈 & 决定

- 按严重性分组提供可操作的反馈（阻塞 vs nit）
- 在 GitHub 中决定 `Approve`、`Request Changes` 或 `Comment`
- 将审查摘要作为 PR 评论发布

## 报告

- 做出的决定和理由
- 关键发现（bug、风险、缺失的测试/文档）及文件/行引用
- 后续行动或开放问题
- 已发布的 GitHub 审查评论的 URL

## 输出 Schema

```json
{
  "review_status": "approved" | "changes_requested" | "commented",
  "comment_count": number,
  "blocking_issues": number,
  "review_url": "https://github.com/..."
}
```
