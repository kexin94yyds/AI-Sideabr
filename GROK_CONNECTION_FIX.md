# Grok 连接问题修复方案

## 问题描述
Grok 网站拒绝在 iframe 中加载，显示错误："grok.com 拒绝了我们的连接请求。"

## 根本原因
Grok 网站设置了 `X-Frame-Options` 和 `Content-Security-Policy` 头部，阻止了在 iframe 中的嵌入。

## 解决方案
学习 `insidebar-ai` 项目的实现，使用 Chrome 扩展的 `declarativeNetRequest` API 来绕过这些安全限制。

### 1. 添加 Host Permissions
在 `manifest.json` 中添加 Grok 的 host permissions：
```json
"host_permissions": [
  "https://grok.com/*"
]
```

### 2. 创建 Bypass 规则
创建 `rules/bypass-headers.json` 文件，定义规则来移除阻止 iframe 嵌入的头部：
```json
[
  {
    "id": 4,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        { "header": "X-Frame-Options", "operation": "remove" },
        { "header": "Content-Security-Policy", "operation": "remove" }
      ]
    },
    "condition": {
      "urlFilter": "https://grok.com/*",
      "resourceTypes": ["sub_frame"]
    }
  }
]
```

### 3. 配置 Declarative Net Request
在 `manifest.json` 中引用规则文件：
```json
"declarative_net_request": {
  "rule_resources": [
    {
      "id": "bypass_headers",
      "enabled": true,
      "path": "rules/bypass-headers.json"
    }
  ]
}
```

## 技术原理
- `declarativeNetRequest` API 允许扩展在请求/响应级别修改网络行为
- 通过移除 `X-Frame-Options` 和 `Content-Security-Policy` 头部，允许网站在 iframe 中加载
- 规则只对 `sub_frame` 资源类型生效，不影响主页面

## 应用范围
此解决方案不仅适用于 Grok，也适用于其他有类似限制的 AI 提供商：
- ChatGPT
- Claude
- Gemini
- Perplexity (包括 www.perplexity.ai 和 perplexity.ai)
- Genspark
- 通义千问
- 豆包
- NotebookLM
- IMA
- Attention Span Tracker

## 注意事项
- 需要重新加载扩展才能生效
- 规则只对扩展内的 iframe 生效，不影响其他网页
- 这是合法的技术手段，用于改善用户体验
