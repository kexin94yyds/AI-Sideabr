## 06:48:14  @ AI-Sidebar 

### 🤖 AI
我先给结论：**这次在 2026 年 4 月 10 日被拒的直接原因，不是权限说明文案，也不是单一用途，而是 `Privacy policy URL` 为空。**

你截图里写得很明确：
- `Violation type`: **User Data Privacy**
- `Violation reference ID`: **Purple Nickel**
- 具体说明：**隐私政策链接没有填在指定字段里**，并且“把链接写进描述里也不算”。

所以，针对“为什么还是被拒绝”，当前最准确的回答是：

## 1. 本轮真正的拒审原因
你在商店表单里把 **Privacy policy URL** 留空了，而你的扩展又明显会处理用户数据，所以按照政策必须提供一个**公开可访问**的隐私政策链接。

你的表单截图里这一项就是空的；而仓库里虽然已经有本地文档 [PRIVACY_POLICY.md](/Users/apple/gemini/AI-Sidebar%20/PRIVACY_POLICY.md)，但**本地 Markdown 文件不等于商店后台的公开 URL**。

官方对应要求：
- [Fill out the privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/)：要在隐私字段里提供 privacy policy link，并且权限、数据披露、远程代码声明要和它一致。
- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)：如果处理用户数据，就必须透明披露收集、使用、共享方式。

## 2. 为什么你这个扩展一定会被要求隐私政策
因为从代码和清单看，它不属于“几乎不碰数据”的那类扩展，至少涉及这些：
- `cookies` 权限存在，[manifest.json:13](/Users/apple/gemini/AI-Sidebar%20/manifest.json:13)
- 会备份/恢复 Perplexity cookies，[background.js:95](/Users/apple/gemini/AI-Sidebar%20/js/background.js:95) 和 [background.js:140](/Users/apple/gemini/AI-Sidebar%20/js/background.js:140)
- 会保存历史链接/收藏，并自动同步，[index.html:90](/Users/apple/gemini/AI-Sidebar%20/index.html:90)、[popup.js:2903](/Users/apple/gemini/AI-Sidebar%20/js/popup.js:2903)、[auto-sync.js:301](/Users/apple/gemini/AI-Sidebar%20/js/auto-sync.js:301)
- 会读取选中文本、截图、页面内容并送进侧边栏流程，[background.js:347](/Users/apple/gemini/AI-Sidebar%20/js/background.js:347)、[background.js:434](/Users/apple/gemini/AI-Sidebar%20/js/background.js:434)

换句话说，**Google 看到这类权限和行为，默认就会要求你把隐私政策 URL 填完整。**

## 3. 但我还发现了几处“下一轮很可能继续卡你”的风险
这部分不是这次截图里写明的直接拒因，但我认为是你补完 privacy URL 之后的**高概率二轮风险**。

### A. 数据披露和真实行为可能还没完全对齐
你表单里现在把数据使用写得比较轻，但代码里有这些更敏感的点：
- 自动同步历史/收藏到 `http://localhost:3456`，而且是自动启用逻辑，不只是文档功能，[auto-sync.js:13](/Users/apple/gemini/AI-Sidebar%20/js/auto-sync.js:13)、[auto-sync.js:330](/Users/apple/gemini/AI-Sidebar%20/js/auto-sync.js:330)
- 导出/保存聊天内容、读取选中文本、保存历史链接，这会触到 `website content` / `personal communications` / `web history` 这几个披露项的边界

我的判断：**你下一次提交时，Data usage 不能再按“几乎不收集”来填。** 至少要重新核对 `Authentication information`、`Web history`、`Website content`，而 `Personal communications` 很可能也要勾，具体取决于你是否把聊天正文读入扩展并本地保存/导出。

### B. 权限和注入范围过大，容易被问“为什么需要这么宽”
官方隐私字段文档明确要求最小权限。[manifest.json](/Users/apple/gemini/AI-Sidebar%20/manifest.json) 里现在有：
- `declarativeNetRequest` + `declarativeNetRequestWithHostAccess`
- `cookies`
- `scripting`
- `contextMenus`
- `optional_host_permissions` 直接到 `https://*/*` / `http://*/*`
- 还有一个 `<all_urls>` 内容脚本入口，[manifest.json:220](/Users/apple/gemini/AI-Sidebar%20/manifest.json:220)

官方原文也说了：权限应当是**minimum permissions**，过宽可能被拒：
- [Fill out the privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/)
- [Get started / single purpose & packaged logic](https://developer.chrome.com/docs/extensions/get-started/)

### C. “单一用途”有漂移风险
你商店里写的是 AI 侧边栏，但代码里不仅有各类 AI 平台，还有：
- Google 搜索入口，[popup.js:78](/Users/apple/gemini/AI-Sidebar%20/js/popup.js:78)
- ToBooks、幕布、Excalidraw，[popup.js:128](/Users/apple/gemini/AI-Sidebar%20/js/popup.js:128)、[popup.js:135](/Users/apple/gemini/AI-Sidebar%20/js/popup.js:135)、[popup.js:142](/Users/apple/gemini/AI-Sidebar%20/js/popup.js:142)
- 页面级并行悬浮面板还注入到 `<all_urls>`，[parallel-panel.js](/Users/apple/gemini/AI-Sidebar%20/content-scripts/parallel-panel.js)

官方对 single purpose 的要求是“**narrow and easy to understand**”。你现在更像“AI 侧边栏 + 页面增强 + 并行面板 + 本地同步 + 一些泛生产力网站聚合器”，这个边界已经有点松了。

### D. 远程代码声明也有潜在风险
你表单里填的是 **No remote code**。但包里有一个页面直接从 CDN 拉 JS：
- [vendor/attention/login.html:233](/Users/apple/gemini/AI-Sidebar%20/vendor/attention/login.html:233) `https://unpkg.com/@supabase/supabase-js@2`

官方文档对 MV3 的态度很明确：
- [Improve extension security](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security/)：扩展逻辑必须打包进扩展，不能运行远程托管代码
- [Fill out the privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/)：如果使用 remote code 而未正确声明，会被拒

这里我先保守判断：**这未必是你这次的直接拒因，但它是必须尽快处理的下一轮风险。**

## 4. 我建议你现在不要直接 Appeal
因为这不是误判，截图已经给了明确整改项。当前更合理的顺序是：
1. 先把 **公开可访问的 Privacy Policy URL** 填到商店后台 `Privacy` 页
2. 同步修正文案和披露，确保和真实行为一致
3. 再做一轮“二次拒审风险清理”，重点看：
   - 数据披露是否少报
   - `<all_urls>` 和宽 host permission 能不能收缩
   - 非 AI/非核心 provider 能不能先下掉
   - `vendor/attention/login.html` 的远程脚本能不能移除或彻底从发布包排除

## 5. 目前最关键的两个不明点
这两个点我需要你确认：
- 你现在**有没有一个已经公开上线**的隐私政策 URL？还是只有仓库里的本地 `PRIVACY_POLICY.md`？
- 你这次准备的是“**先补 URL 直接重提**”，还是“**顺手把二轮高风险点一起清掉再提**”？

另外，我发现了新的问题项：
- 自动同步到 localhost 的数据披露风险
- `vendor/attention/login.html` 的远程脚本风险

**要不要我把这两条记录到 `~/.cunzhi-knowledge/problems.md`？**
iterate-checkpoint:2026-04-10T22:47:13Z | 自动检查点 06:47:13

### 👤 用户
但是你根据事实看看，我们会不会处理用户数据啊，根据我们的侧边栏的插件去看看，有没有地方需要更改的，按照实际去写

---
## 06:48:21  @ AI-Sidebar 

### 🤖 AI
后台自动检查点：检测到稳定改动，已创建工作区 checkpoint。
iterate-checkpoint:2026-04-10T22:48:20Z | 自动检查点 06:48:20

---
## 06:48:31  @ AI-Sidebar 

### 🤖 AI
后台自动检查点：检测到稳定改动，已创建工作区 checkpoint。
iterate-checkpoint:2026-04-10T22:48:30Z | 自动检查点 06:48:30

---
## 06:48:40  @ AI-Sidebar 

### 🤖 AI
后台自动检查点：检测到稳定改动，已创建工作区 checkpoint。
iterate-checkpoint:2026-04-10T22:48:39Z | 自动检查点 06:48:39

---
## 06:48:49  @ AI-Sidebar 

### 🤖 AI
后台自动检查点：检测到稳定改动，已创建工作区 checkpoint。
iterate-checkpoint:2026-04-10T22:48:48Z | 自动检查点 06:48:48

---
## 06:48:59  @ AI-Sidebar 

### 🤖 AI
后台自动检查点：检测到稳定改动，已创建工作区 checkpoint。
iterate-checkpoint:2026-04-10T22:48:58Z | 自动检查点 06:48:58

---
## 06:49:08  @ AI-Sidebar 

### 🤖 AI
后台自动检查点：检测到稳定改动，已创建工作区 checkpoint。
iterate-checkpoint:2026-04-10T22:49:07Z | 自动检查点 06:49:07

---
## 06:49:17  @ AI-Sidebar 

### 🤖 AI
后台自动检查点：检测到稳定改动，已创建工作区 checkpoint。
iterate-checkpoint:2026-04-10T22:49:16Z | 自动检查点 06:49:16

---
