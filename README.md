
# AI Sidebar Chrome Extension 🤖

<div align="center">
  <img src="images/icon128.png" alt="AI Sidebar Logo" width="128">
  
  **一个强大的 Chrome 扩展，将多个 AI 助手集成到浏览器侧边栏**
  
  [![Version](https://img.shields.io/badge/version-0.0.1-blue)](https://github.com)
  [![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
  [![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-4285F4)](https://chrome.google.com)
</div>

## 📋 项目概述

AI Sidebar 是一个功能完整的 Chrome 扩展程序，让你无需切换标签页就能直接在浏览器侧边栏中使用多个 AI 助手。支持 ChatGPT、Claude、Gemini、Perplexity、DeepSeek、NotebookLM 等 11+ 个 AI 提供商，以及生产力工具如 Attention Tracker（专注力追踪）。

## ✨ 核心功能

### 🎯 AI 提供商集成
- **ChatGPT** (OpenAI) - 多功能对话 AI
- **Claude** (Anthropic) - 高级推理与分析
- **Gemini** (Google) - 多模态 AI 助手
- **Perplexity** - AI 搜索引擎
- **DeepSeek** - 开源 AI 助手
- **Google Search** - AI 概览与搜索增强
- **NotebookLM** (Google) - AI 笔记助手
- **Grok** (X/Twitter) - 实时对话 AI
- **Genspark** - 智能搜索助手
- **通义千问** (阿里云) - 中文 AI 助手
- **豆包** (字节跳动) - 中文 AI 助手
- **IMA** (QQ) - 腾讯 AI 助手

### 🎨 用户界面
- **底部导航栏** - 所有 AI 提供商图标固定在底部，支持快速切换
- **提供商图标** - 彩色图标清晰展示各个提供商的身份
- **折叠功能** - 可折叠的导航栏，节省面板空间
- **拖拽排序** - 按个人偏好重新排列提供商顺序
- **响应式设计** - 自适应各种面板尺寸

### ⌨️ 键盘快捷键
- **Tab 键** - 循环切换到下一个提供商
- **Shift + Tab** - 切换到上一个提供商
- **快速导航** - 无需鼠标即可切换 AI 提供商

### 🔒 会话管理
- **登录状态检查** - 自动检测登录状态，提示需要登录时的情况
- **会话保持** - 保持登录会话状态
- **跨域支持** - 支持多域名登录和认证流

### 📌 实用工具
- **Open in Tab** - 在新标签页中打开当前 AI 提供商
- **智能链接更新** - 自动更新链接到最新的对话 URL
- **历史记录追踪** - 追踪最近访问的 AI 对话链接
- **URL 同步** - 实时同步 iframe 内容的 URL 变化

### 🚀 高级功能
- **斜杠命令提示器** - `/` 快捷命令菜单（集成 Slash-Command-Prompter）
- **关注力追踪器** - Attention Tracker 生产力工具集成
- **年度统计表** - 活动统计与生产力分析
- **多计时器支持** - 同时运行多个计时器
- **数据导入导出** - 备份和恢复使用数据

### 🎯 代理与绕过
- **请求头修改** - 移除限制性请求头以支持 iframe 嵌入
- **DNR 规则** - 使用声明式网络请求规则绕过 CSP 和 X-Frame-Options
- **主机权限管理** - 动态管理和请求必要的主机权限

### 🔄 数据同步 (新功能!)
- **自动同步** - 历史记录和收藏自动同步到本地 JSON 文件
- **跨应用共享** - 与 Electron 应用或其他工具无缝共享数据
- **实时更新** - 每分钟自动同步，保持数据最新
- **本地服务器** - 简单的 HTTP 服务器接收扩展数据
- **零配置** - 开箱即用，无需复杂设置

#### 快速启动同步
```bash
# 启动同步服务器
npm run sync

# 服务器将在 http://localhost:3456 运行
# 扩展会自动检测并开始同步数据
```

📚 详细文档：
- [快速启动指南](./QUICK_START_SYNC.md) - 3 分钟快速开始
- [完整同步指南](./SYNC_GUIDE.md) - 详细配置和故障排除

同步后的数据保存在 `sync/` 目录：
- `sync/history.json` - 历史记录
- `sync/favorites.json` - 收藏

## 🏗️ 项目结构

```
AI-Sidebar/
├── index.html                          # 侧边栏主界面
├── manifest.json                       # Chrome 扩展配置
├── js/
│   ├── popup.js                       # 主应用逻辑（UI、提供商管理、事件处理）
│   ├── background.js                  # 后台服务工作线程
│   ├── history-db.js                  # 历史记录数据库管理（IndexedDB）
│   ├── auto-sync.js                   # 自动同步模块（新）
│   ├── sync-to-file.js                # 手动导出脚本（新）
│   ├── utils.js                       # 工具函数
│   └── plugins/                       # 插件系统目录
├── css/
│   └── panel.css                      # 样式表（布局、主题、响应式设计）
├── content-scripts/
│   └── url-sync.js                    # 内容脚本（URL 同步、Tab 拦截、消息桥接）
├── images/
│   ├── icon*.png                      # 扩展图标
│   ├── screenshot.png                 # 预览图
│   └── providers/                     # AI 提供商图标
│       ├── *.png                      # 彩色图标
│       └── dark/                      # 暗色主题图标
├── rules/
│   └── bypass-headers.json            # DNR 规则（绕过限制性请求头）
├── sync/                              # 同步数据目录（新）
│   ├── history.json                   # 历史记录同步文件
│   └── favorites.json                 # 收藏同步文件
├── vendor/
│   ├── attention/                     # Attention Tracker 生产力工具
│   │   ├── index.html                # 生产力工具界面
│   │   ├── script.js                 # 核心逻辑
│   │   ├── stats_functions.js        # 统计功能
│   │   ├── supabaseClient.js         # Supabase 数据库客户端
│   │   └── supabase/                 # 数据库迁移脚本
│   ├── Slash-Command-Prompter/       # 斜杠命令提示器
│   │   └── content.js                # 命令菜单逻辑
│   └── supabase.js                   # 共享 Supabase 配置
├── sync-server.js                     # 本地同步服务器（新）
├── _metadata/                        # 生成的元数据和索引
└── [文档文件]                        # 更新日志和指南
    ├── SYNC_GUIDE.md                 # 完整同步指南（新）
    └── QUICK_START_SYNC.md           # 快速启动指南（新）
```

## 🔧 技术架构

### 核心技术栈
- **Manifest V3** - 现代 Chrome 扩展标准
- **JavaScript (ES6+)** - 核心应用逻辑
- **Chrome Storage API** - 本地数据持久化
- **Chrome Declarative Net Request API** - 高效的请求头修改
- **iframe Sandbox** - 安全的内容隔离
- **Supabase** - 后端数据库（生产力工具）

### 架构设计
1. **后台服务工作线程** - 处理请求拦截、权限管理、消息路由
2. **侧边栏界面** - 提供商选择、切换、历史记录管理
3. **内容脚本** - URL 同步、键盘事件拦截、跨域通信
4. **iframe 沙箱** - 隔离的 AI 提供商内容

## 📦 核心模块

### popup.js (主应用) - ~1400+ 行
- **提供商配置** - 12+ 个 AI 提供商的完整配置
- **UI 渲染** - 底部导航栏、提供商切换、历史记录显示
- **事件处理** - 点击、拖拽、键盘事件
- **会话管理** - 登录状态检查、认证处理
- **历史记录** - URL 追踪、记录管理、复制/重命名功能
- **拖拽排序** - 提供商顺序自定义和持久化

### url-sync.js (内容脚本) - ~440+ 行
- **URL 监控** - 实时追踪 iframe 内容 URL 变化
- **Tab 拦截** - 截获 Tab 键事件用于提供商循环切换
- **消息桥接** - iframe 与主窗口间的双向通信
- **事件同步** - 历史 API、导航事件的拦截
- **跨域支持** - 多域名的完整覆盖

### history-db.js (历史管理) - ~200+ 行
- **数据存储** - Chrome Storage 的 CRUD 操作
- **URL 规范化** - 确保 URL 一致性和比较准确性
- **搜索过滤** - 基于关键词搜索历史记录
- **数据导入导出** - 支持备份和恢复

### panel.css (样式系统) - ~800+ 行
- **响应式布局** - Flexbox 布局适应多种屏幕尺寸
- **暗色主题支持** - 完整的暗色和亮色主题
- **动画效果** - 平滑的过渡和交互反馈
- **无障碍设计** - 高对比度、清晰字体

## 🎯 关键功能详解

### 1. 底部导航栏系统
```
特点：
- 所有提供商图标固定显示
- 当前选中图标高亮显示
- 悬停时显示提供商名称
- 支持横向滚动（提供商众多时）
- 完全可折叠以节省空间
- 支持拖拽重新排序
```

### 2. Tab 键提供商切换
```
工作流程：
1. 用户在 iframe 内容中按 Tab 键
2. 内容脚本拦截该事件（不让其传递给 iframe）
3. 向主窗口发送 'ai-tab-cycle' 消息
4. 主窗口获取下一个提供商并切换
5. 调用 ensureFrame() 加载新提供商内容
```

### 3. URL 同步机制
```
实时追踪流程：
1. 内容脚本定期检查 iframe 内的 location.href
2. 检测到变化时向主窗口发送 'ai-url-changed' 消息
3. 主窗口更新 Open in Tab 链接
4. 历史记录数据库记录新 URL
5. 支持复制、重命名等操作
```

### 4. 会话认证系统
```
认证流程：
1. 获取提供商配置中的 authCheck 方法
2. 执行认证检查（如 ChatGPT 的 session 检查）
3. 如果未授权，显示登录提示信息
4. 用户点击 "Open in Tab" 在新标签页登录
5. 返回侧边栏，重新加载提供商内容
```

### 5. 历史记录系统
- **自动追踪** - 访问的每个 URL 自动记录
- **去重处理** - 相同 URL 不重复记录
- **搜索功能** - 按关键词快速查找历史
- **快速操作** - 复制链接、重命名、删除
- **批量管理** - 支持清空所有历史

## 🚀 安装与使用

### 本地安装
```bash
# 1. 克隆项目
git clone https://github.com/yourusername/AI-Sidebar.git
cd AI-Sidebar

# 2. 安装依赖（如有）
npm install

# 3. 在 Chrome 中加载
# 打开 chrome://extensions/
# 启用 "开发者模式"
# 点击 "加载未封装的扩展程序"
# 选择项目目录
```

### 基本使用
1. **点击提供商图标** - 在底部导航栏中选择 AI 提供商
2. **按 Tab 键** - 快速循环切换提供商
3. **点击 "Open in Tab"** - 在新标签页中打开当前对话
4. **拖拽图标** - 按偏好重新排列提供商顺序
5. **点击折叠按钮** - 隐藏/显示导航栏

## ⚙️ 权限说明

| 权限 | 用途 |
|------|------|
| `sidePanel` | 向侧边栏添加内容 |
| `tabs` | 查询和更新标签页 |
| `storage` | 保存用户偏好设置 |
| `cookies` | 访问认证 Cookie |
| `identity` | 处理认证流 |
| `scripting` | 动态脚本注入 |
| `declarativeNetRequest` | 修改请求头以绕过 CSP/X-Frame-Options |
| `declarativeNetRequestWithHostAccess` | 提升版请求头修改 |

## 🔍 故障排除

### 常见问题

**1. 提供商加载失败**
- 清空浏览器缓存
- 在 Chrome 中重新加载扩展
- 确保网络连接正常

**2. 登录页面在侧边栏中无法加载**
- 某些提供商（尤其是 Gemini/Google）可能因 iframe 安全限制无法加载登录页
- **解决方案**: 点击 "Open in Tab" 在新标签页中登录
- 登录完成后，侧边栏应能正常加载

**3. ChatGPT 显示 403 错误**
- OpenAI 可能针对侧边栏请求进行了特殊检查
- **解决方案**: 先在普通标签页中打开 ChatGPT 通过初始检查
- 之后侧边栏应该可以正常访问

**4. Tab 键不工作**
- 确保侧边栏处于焦点状态
- 如果某些网站的 iframe 拦截了 Tab 键，这可能是预期行为
- 尝试在侧边栏空白区域点击后再按 Tab 键

**5. 历史记录不显示**
- 检查 Chrome Storage 权限是否已授予
- 清除浏览器数据后可能会重置历史记录
- 在隐私/无痕模式下运行可能不会记录历史

## 📝 最近更新 (2025年10月)

### v0.0.1 重要更新
- ✅ **底部导航栏重设计** - 从顶部下拉菜单改为底部固定图标导航
- ✅ **提供商图标系统** - 添加彩色图标和暗色主题支持
- ✅ **Tab 键快捷切换** - 使用 Tab/Shift+Tab 循环切换提供商
- ✅ **拖拽排序功能** - 自定义提供商顺序并持久化保存
- ✅ **历史记录系统** - 追踪最近访问的对话链接
- ✅ **URL 实时同步** - iframe 内容 URL 变化自动更新
- ✅ **完整的认证系统** - 支持多种认证流程
- ✅ **生产力工具集成** - 集成 Attention Tracker 和统计分析

### 前期更新亮点
- 请求头修改系统（DNR）
- iframe 沙箱隔离
- 多提供商支持
- 会话状态检查
- 跨域通信桥接

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🙋 常见问题

**Q: 数据会被发送到服务器吗？**
A: 不会。除了生产力工具（Attention Tracker）需要 Supabase 同步外，其他所有数据都存储在本地浏览器中。

**Q: 可以添加自己的 AI 提供商吗？**
A: 可以！在 popup.js 中的 PROVIDERS 对象添加新配置即可。

**Q: 支持 Firefox 或其他浏览器吗？**
A: 目前仅支持 Chrome。未来可能支持其他 Chromium 浏览器。

**Q: 如何联系开发者？**
A: 欢迎通过 GitHub Issues 或 GitHub Discussions 与我们联系。

---

<div align="center">
  
  **⭐ 如果这个项目对你有帮助，请不要忘记给个 Star!**
  
  Made with ❤️ for AI enthusiasts
  
</div>
