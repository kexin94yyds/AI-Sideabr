# /tools

**模板分类**: Action
**提示级别**: 4 (Contextual)

编目仓库工具供快速参考。无需参数。

## 步骤

1. **Git 准备**: 
   - `git fetch --all --prune`
   - `git pull --rebase`
   - 确认干净工作区
   - 保持在 `develop`（只读任务）

2. **审阅文档**: 
   - 扫描 `README.md`、配置文件
   - 查找工具提及（Bun、Biome、Docker 等）

3. **清点命令**: 
   - 列出 `package.json` 中的脚本
   - 自动化帮助器
   - 支持的二进制文件

4. **生成目录**: 
   - 以 TypeScript 风格签名文档化工具
   - 添加简洁注释
   - 示例：`bun run typecheck(): Promise<void> // TypeScript 检查`

5. **验证**: 
   - 确保列表全面、无重复
   - 反映当前版本/用法

## 报告

- 工具目录（签名 + 注释）存储在约定位置
- 咨询来源摘要和缺失/可选工具
