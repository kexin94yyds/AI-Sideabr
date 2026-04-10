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
## 06:49:27  @ AI-Sidebar 

### 🤖 AI
后台自动检查点：检测到稳定改动，已创建工作区 checkpoint。
iterate-checkpoint:2026-04-10T22:49:26Z | 自动检查点 06:49:26

---
## 06:49:36  @ AI-Sidebar 

### 🤖 AI
后台自动检查点：检测到稳定改动，已创建工作区 checkpoint。
iterate-checkpoint:2026-04-10T22:49:35Z | 自动检查点 06:49:35

---
## 06:49:45  @ AI-Sidebar 

### 🤖 AI
后台自动检查点：检测到稳定改动，已创建工作区 checkpoint。
iterate-checkpoint:2026-04-10T22:49:44Z | 自动检查点 06:49:44

---
## 06:49:55  @ AI-Sidebar 

### 🤖 AI
后台自动检查点：检测到稳定改动，已创建工作区 checkpoint。
iterate-checkpoint:2026-04-10T22:49:53Z | 自动检查点 06:49:53

---
## 06:50:04  @ AI-Sidebar 

### 🤖 AI
后台自动检查点：检测到稳定改动，已创建工作区 checkpoint。
iterate-checkpoint:2026-04-10T22:50:03Z | 自动检查点 06:50:03

---
## 06:54:00  @ AI-Sidebar 

### 🤖 AI
我按代码实际数据流看完了，结论很明确：**会，你们现在确实在处理用户数据。** 但更准确地说，是“**主要在本地收集/存储/读取**”，而不是“把核心数据发到你自己的远程服务器”。

## 1. 按事实判断，你们现在实际处理了哪些数据

### A. `Authentication information`：**是**
证据：
- `cookies` 权限存在，[manifest.json:13](/Users/apple/gemini/AI-Sidebar%20/manifest.json:13)
- 会读取并备份/恢复 Perplexity cookies，[background.js:95](/Users/apple/gemini/AI-Sidebar%20/js/background.js:95)、[background.js:140](/Users/apple/gemini/AI-Sidebar%20/js/background.js:140)

这已经不只是“看登录状态”，而是确实处理了认证相关数据。

### B. `Web history`：**是**
证据：
- 你们保存对话 URL、provider、title、time 到本地 IndexedDB，[history-db.js:60](/Users/apple/gemini/AI-Sidebar%20/js/history-db.js:60)
- 自动同步历史/收藏到本地 `localhost:3456` 服务，[auto-sync.js:13](/Users/apple/gemini/AI-Sidebar%20/js/auto-sync.js:13)、[auto-sync.js:206](/Users/apple/gemini/AI-Sidebar%20/js/auto-sync.js:206)、[auto-sync.js:270](/Users/apple/gemini/AI-Sidebar%20/js/auto-sync.js:270)

所以这项不能按“不处理”来写。

### C. `Personal communications`：**大概率应该勾选 Yes**
这是这次最关键的事实点。

证据：
- 导出器会从 AI 聊天页面提取 `messages` 和完整 `content`，[exporter-logic.js:197](/Users/apple/gemini/AI-Sidebar%20/js/plugins/exporter-logic.js:197)、[exporter-logic.js:232](/Users/apple/gemini/AI-Sidebar%20/js/plugins/exporter-logic.js:232)
- “Save to Library” 会把完整对话内容落到本地 IndexedDB，[popup.js:2147](/Users/apple/gemini/AI-Sidebar%20/js/popup.js:2147)、[storage-manager.js:3](/Users/apple/gemini/AI-Sidebar%20/js/plugins/storage-manager.js:3)、[storage-manager.js:122](/Users/apple/gemini/AI-Sidebar%20/js/plugins/storage-manager.js:122)

只要你们会把聊天正文、用户提问、AI 回复抓出来并保存，本质上就已经在处理“个人通信内容”了，即便是**仅本地存储**。

### D. `Website content`：**是**
证据：
- 读取当前网页选中文本并注入侧边栏，[background.js:347](/Users/apple/gemini/AI-Sidebar%20/js/background.js:347)
- 捕获当前标签页截图并发到侧边栏，[background.js:434](/Users/apple/gemini/AI-Sidebar%20/js/background.js:434)
- 内容脚本会读取页面 DOM、标题、对话内容、URL 变化用于导出/历史/增强功能，[url-sync.js](/Users/apple/gemini/AI-Sidebar%20/content-scripts/url-sync.js)、[exporter-logic.js](/Users/apple/gemini/AI-Sidebar%20/js/plugins/exporter-logic.js)

这项我认为也必须勾 Yes。

## 2. 哪些项目前看**不一定**要勾
这是按当前 Web Store 打包脚本判断的。

### `Personally identifiable information`：**暂时不建议勾**
主包里我没看到明确把姓名、邮箱、手机号这类独立字段作为产品数据结构来收集。

注意一个重要事实：`vendor/attention/` 虽然有登录/支付代码，但 **Web Store 打包脚本根本没把 `vendor/` 打进 ZIP**，[build-webstore-package.sh](/Users/apple/gemini/AI-Sidebar%20/scripts/build-webstore-package.sh)

所以，**当前上架包的披露判断，应以真正进入 ZIP 的代码为准**，不要被仓库里没打包的模块带偏。

### `Financial and payment information`：**当前上架包看起来不用勾**
同理，支付相关代码不在当前 Web Store 打包范围内。

### `Location` / `Health information`：**看起来不用勾**
我没看到相关收集逻辑。

### `User activity`：**我倾向先不勾**
你们有快捷键、焦点切换、页面增强，但我目前没看到“持续记录点击、滚动、键盘行为并存储/分析”的逻辑。现在更像功能性交互，不像 activity profiling。

## 3. 你们的隐私政策现在有哪些地方需要改
你仓库里的 [PRIVACY_POLICY.md](/Users/apple/gemini/AI-Sidebar%20/PRIVACY_POLICY.md) 方向是对的，但**还没完全写到实际上线行为**。

### 需要补上的事实
1. **会本地保存完整聊天内容**
   - 现在只写了 recent conversation links / page URLs / page structure
   - 但实际还会保存 `messages` 和 `content`

2. **会处理用户选中的网页文本和截图**
   - 当前政策没明确写

3. **会处理认证 cookie（至少 Perplexity）**
   - 当前政策写得太泛，不够具体

4. **localhost 自动同步已经是现在的行为，不是“未来可能”**
   - 你现在写的是：
     `If optional productivity or sync-related features are enabled in the future...`
   - 但代码里 `AutoSync.enableAutoSync()` 已自动启用，[popup.js:2903](/Users/apple/gemini/AI-Sidebar%20/js/popup.js:2903)
   - 所以这句已经和事实不一致了，必须改

## 4. Data usage 页面我建议你按这个口径填写
基于当前打包进 Web Store 的功能，我建议：

- `Authentication information` -> **Yes**
- `Personal communications` -> **Yes**
- `Web history` -> **Yes**
- `Website content` -> **Yes**
- `Personally identifiable information` -> **No**（当前上架包前提下）
- `Financial and payment information` -> **No**（当前上架包前提下）
- `Health information` -> **No**
- `Location` -> **No**
- `User activity` -> **暂时 No**

并继续勾选：
- 不出售数据
- 不做与单一用途无关的使用或转移
- 不做信用/放贷用途

## 5. 还有两处文案也需要按事实改
### A. `declarativeNetRequest` justification 现在写得不准
你现在写的是“bypass CORS restrictions when communicating with AI service APIs”。

这和代码不一致。你实际做的是：
- 改响应头
- 去掉 `CSP` / `X-Frame-Options`
- 让支持站点能在 side panel / iframe 里工作

证据：[background.js:1](/Users/apple/gemini/AI-Sidebar%20/js/background.js:1)、[bypass-headers.json](/Users/apple/gemini/AI-Sidebar%20/rules/bypass-headers.json)

所以这里至少要改成**按真实行为描述**，不要再写“API 通信 / CORS”。

### B. Reviewer notes 里提到了 `identity`，但 manifest 里没有
- Reviewer notes 写了 `cookies and identity`
- 实际 manifest 没有 `identity` 权限，[manifest.json](/Users/apple/gemini/AI-Sidebar%20/manifest.json)

这会让审查人觉得你材料和包体对不上，也该改掉。

## 6. 结论压缩成一句话
**如果按事实填，你们这款扩展现在应当承认：会处理认证信息、网页历史、网页内容，以及用户与 AI 的通信内容；这些数据主要保存在本地，核心功能不发到开发者远程服务器，但会在用户使用第三方 AI 网站时直接流向这些第三方网站，并且在本地同步功能可用时会把历史/收藏同步到 `localhost`。**

## 7. 我现在最建议的下一步
我可以下一轮直接帮你做两件事之一：
1. 按上面这套事实，**给你重写一版 Web Store 的 Data usage + Privacy policy 文案**
2. 继续更细地审，**逐条判断每个 permission justification 应该怎么改**

另外，我发现了两个新的问题：
- 当前隐私政策与实际数据流不完全一致
- `declarativeNetRequest` / reviewer notes 文案与真实行为不一致

**要不要我把这两条记录到 `~/.cunzhi-knowledge/problems.md`？**
iterate-checkpoint:2026-04-10T22:50:09Z | 自动检查点 06:50:09

### 👤 用户
那这里的 url 怎么去写

📷 *附图 1 张*

---
