# /prime

**模板分类**: Action

进入仓库时用于构建基线上下文。

## 步骤

1. **同步 git 状态**: 
   - `git fetch --all --prune`
   - `git pull --rebase`
   - `git rev-parse --abbrev-ref HEAD` 获取当前分支
   - `git status --short` 检查工作区状态

2. **清点跟踪文件**: 
   - `git ls-files` 采样代表性路径
   - 识别关键域（API、服务、工具等）

3. **审阅关键文档**: 
   - README.md
   - 项目特定配置（.cursorrules、.windsurf/workflows 等）
   - docs/ 或 specs/ 下的规范文档

4. **综合学习**: 
   - 总结架构亮点（服务、脚本、数据流）
   - 列出所需命令（安装、构建、测试等）

5. **捕获问题上下文**: 
   - 检查与当前任务相关的开放任务或讨论
   - 确保工作区干净后再继续

## 必需输出

- 当前分支和清洁状态
- 高亮文件组和重要目录
- 关键文档洞察（工具、工作流、约束）
- 待解决的问题或风险
