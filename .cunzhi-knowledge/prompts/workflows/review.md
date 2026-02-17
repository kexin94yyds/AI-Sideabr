# /review

**模板分类**: Structured Data

根据规范和验证结果审查实施。

## 变量

- spec_file: $1 (计划文件相对路径)
- reviewer_name: $2 (审查者名称)

## 指令

- 阅读规范文件了解预期更改
- 审查 `git diff origin/develop...HEAD` 查看所有实施更改
- 检查验证证据（测试结果、构建输出、lint）
- 验证规范和实施之间的对齐
- 识别阻塞项（必须修复）、技术债务（应该修复）或可跳过的问题（次要）

## 审查标准

- **Blocker**: 破坏功能、验证失败、安全问题
- **Tech Debt**: 可工作但需要改进、缺少测试、不完整文档
- **Skippable**: 次要风格问题、非关键优化、可选增强

## 输出格式要求

返回匹配此精确 schema 的 JSON 对象（所有字段必需）：

```json
{
  "success": boolean,
  "review_summary": string,
  "review_issues": [
    {
      "review_issue_number": number,
      "issue_description": string,
      "issue_resolution": string,
      "issue_severity": "blocker" | "tech_debt" | "skippable"
    }
  ]
}
```

## 示例

**正确输出（无问题）:**
```json
{
  "success": true,
  "review_summary": "实施与规范对齐。所有验证命令通过。",
  "review_issues": []
}
```

**正确输出（有问题）:**
```json
{
  "success": false,
  "review_summary": "实施覆盖核心功能但有验证失败和缺少测试覆盖。",
  "review_issues": [
    {
      "review_issue_number": 1,
      "issue_description": "集成测试失败，401 未授权错误",
      "issue_resolution": "更新测试夹具使用有效 API 密钥",
      "issue_severity": "blocker"
    }
  ]
}
```
