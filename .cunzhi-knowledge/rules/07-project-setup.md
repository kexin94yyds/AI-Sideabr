# 07 - 项目接入规范

## 必备配置检查清单

### 1. `.gitignore` 保护规则

**问题场景：**
- 项目 `.gitignore` 包含 `*.md`、`*.json` 等通配符规则
- 导致 `.cunzhi-knowledge/` 文件被意外忽略
- IDE 不显示知识库文件，影响协作

**解决方案：**
在项目 `.gitignore` 添加例外规则：

```gitignore
# cunzhi 知识库保护
!.cunzhi-knowledge/
!.cunzhi-memory/
```

**验证方式：**
```bash
cd /path/to/project
git status .cunzhi-knowledge/
# 应该显示文件变更，而不是被忽略
```

### 2. 自动检查机制

`ji(回忆)` 工具会自动检查：
- ✅ `.cunzhi-knowledge/` 是否存在
- ✅ `.gitignore` 是否包含保护规则
- ⚠️ 如果检测到风险配置，会提供修复建议

### 3. 常见错误模式

| 错误配置 | 后果 | 修复 |
|---------|------|------|
| `*.md` 无例外 | 知识库文件被忽略 | 添加 `!.cunzhi-knowledge/` |
| `*.json` 无例外 | 配置文件丢失 | 添加 `!.cunzhi-knowledge/**/*.json` |
| 手动删除 `.cunzhi-knowledge/` | 知识库丢失 | `git clone https://github.com/kexin94yyds/cunzhi-knowledge.git .cunzhi-knowledge` |
| `.cunzhi-knowledge/` 不是 git 仓库 | 无法同步更新 | 重新克隆知识库 |

### 4. 新项目接入流程

#### 步骤 1：克隆知识库
```bash
cd /path/to/your/project
git clone https://github.com/kexin94yyds/cunzhi-knowledge.git .cunzhi-knowledge
```

#### 步骤 2：检查并修复 `.gitignore`
```bash
# 方式 1：自动检查（推荐）
# 调用 ji(action=回忆) 工具会自动检测风险并给出修复建议

# 方式 2：手动应用模板
cat .cunzhi-knowledge/templates/gitignore-cunzhi.txt >> .gitignore
```

#### 步骤 3：验证配置
```bash
# 检查 .cunzhi-knowledge/ 是否可见
git status .cunzhi-knowledge/

# 应该看到类似输出：
# modified:   .cunzhi-knowledge/problems.md
# modified:   .cunzhi-knowledge/patterns.md

# 如果看到：
# nothing to commit
# 或文件不在 git status 中显示，说明被忽略了
```

#### 步骤 4：初始化项目记忆
```bash
# 创建 .cunzhi-memory/ 目录
mkdir -p .cunzhi-memory

# 首次调用 ji(回忆) 会自动初始化结构
```

### 5. 维护与更新

#### 同步知识库更新
```bash
cd .cunzhi-knowledge
git fetch origin
git pull origin main
```

#### 推送本地沉淀
```bash
# ji(沉淀) 工具会自动执行以下操作：
cd .cunzhi-knowledge
git add patterns.md problems.md regressions.md
git commit -m "沉淀: xxx"
git push origin main
```

## 工程原则

### 防御性配置
假设项目可能有破坏性的 `.gitignore` 规则，主动添加保护规则。

### 自动检测
工具应主动发现配置问题，而不是事后修复。`ji(回忆)` 集成了自动检测逻辑。

### 最小惊讶原则
知识库文件应始终可见和可编辑，不应该因为父项目配置而被隐藏。

### 文档即代码
所有配置规则和模板都存储在 `.cunzhi-knowledge/` 中，版本控制下演进。

## 故障排查

### 问题：`ji(沉淀)` 报错 "项目未接入全局知识库"

**原因：** `.cunzhi-knowledge/` 目录不存在或不是 git 仓库

**修复：**
```bash
cd /path/to/project
git clone https://github.com/kexin94yyds/cunzhi-knowledge.git .cunzhi-knowledge
```

### 问题：知识库文件不在 git status 中显示

**原因：** 项目 `.gitignore` 包含通配符规则，且缺少例外保护

**修复：**
```bash
# 检查 .gitignore 中是否有 *.md 或 *.json
grep "^\*\.md\|^\*\.json" .gitignore

# 如果有，添加保护规则
cat .cunzhi-knowledge/templates/gitignore-cunzhi.txt >> .gitignore

# 验证
git status .cunzhi-knowledge/
```

### 问题：`ji(沉淀)` 后 git push 失败

**原因：** 网络问题或权限问题

**修复：**
```bash
cd .cunzhi-knowledge
git status  # 查看是否有未提交的更改
git push    # 手动推送

# 如果是权限问题，检查 SSH key 或 token 配置
```

## 附录：完整示例

```bash
# 1. 在现有项目中接入 cunzhi
cd ~/projects/my-app

# 2. 克隆知识库
git clone https://github.com/kexin94yyds/cunzhi-knowledge.git .cunzhi-knowledge

# 3. 检查并修复 .gitignore（如果需要）
if grep -q "^\*\.md" .gitignore; then
    cat .cunzhi-knowledge/templates/gitignore-cunzhi.txt >> .gitignore
    echo "✅ 已添加 .gitignore 保护规则"
fi

# 4. 验证配置
git status .cunzhi-knowledge/

# 5. 提交配置更改
git add .gitignore
git commit -m "chore: 接入 cunzhi 知识库系统"

# 6. 开始使用
# 调用 ji(action=回忆) 查看项目上下文
# 调用 ji(action=记忆) 记录项目规范
# 调用 ji(action=沉淀) 沉淀可复用经验
```
