(function() {
  'use strict';

  // ============================================================================
  // Robust Markdown Extraction (Recursive & Whitespace-Aware)
  // ============================================================================
  function extractMarkdownFromElement(node) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tagName = node.tagName.toLowerCase();
    
    // Filter noise
    if (node.classList.contains('sr-only') || node.hasAttribute('aria-hidden') || 
        ['script', 'style', 'nav', 'header', 'footer', 'button'].includes(tagName)) return '';

    // Code blocks (High Priority)
    if (tagName === 'pre') {
      const code = node.querySelector('code');
      const lang = code?.className.match(/language-(\w+)/)?.[1] || '';
      return `\n\`\`\`${lang}\n${(code || node).textContent}\n\`\`\`\n\n`;
    }

    // Inline
    if (tagName === 'code') return ` \`${node.textContent}\` `;
    if (tagName === 'strong' || tagName === 'b') return `**${getChildrenMarkdown(node)}**`;
    if (tagName === 'em' || tagName === 'i') return `*${getChildrenMarkdown(node)}*`;
    if (tagName === 'a') return `[${node.textContent.trim()}](${node.getAttribute('href') || ''})`;

    // Lists
    if (tagName === 'ul' || tagName === 'ol') {
      let result = '\n';
      Array.from(node.children).forEach((li, i) => {
        if (li.tagName.toLowerCase() === 'li') {
          const p = tagName === 'ol' ? `${i + 1}. ` : '- ';
          result += `${p}${extractMarkdownFromElement(li).trim()}\n`;
        }
      });
      return result + '\n';
    }

    // Paragraphs
    if (tagName === 'p') return `${getChildrenMarkdown(node).trim()}\n\n`;
    if (tagName === 'br') return '\n';

    return getChildrenMarkdown(node);
  }

  function getChildrenMarkdown(node) {
    return Array.from(node.childNodes).map(child => extractMarkdownFromElement(child)).join('');
  }

  // ============================================================================
  // Shadow DOM Traversal
  // ============================================================================
  function getDeepElements(root = document) {
    let all = Array.from(root.querySelectorAll('*'));
    all.forEach(el => {
      if (el.shadowRoot) all = all.concat(getDeepElements(el.shadowRoot));
    });
    return all;
  }

  // ============================================================================
  // Hybrid Role Detection (Visual + Attribute)
  // ============================================================================
  function detectRole(el, index) {
    // 1. Tags (Gemini / Standard)
    if (el.tagName.toLowerCase() === 'user-query' || el.closest('user-query')) return 'User';
    if (el.tagName.toLowerCase() === 'model-response' || el.closest('model-response')) return 'Assistant';

    // 2. Attributes (ChatGPT / Generic)
    const roleAttr = el.getAttribute('data-message-author-role') || el.getAttribute('data-role');
    if (roleAttr) return roleAttr === 'user' ? 'User' : 'Assistant';

    // 3. Multi-language Keywords
    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
    const text = el.innerText.toLowerCase().substring(0, 50);
    if (/you|user|你|用户|提问/.test(aria) || /you|user|你/.test(text)) return 'User';
    if (/gemini|assistant|ai|模型|助手|回答/.test(aria) || /gemini|assistant|ai/.test(text)) return 'Assistant';

    // 4. Visual Heuristic (Alignment)
    try {
      const rect = el.getBoundingClientRect();
      if (rect.left > window.innerWidth * 0.5) return 'User';
    } catch (e) {}

    // 5. Alternating Fallback (DeepSeek/Generic)
    return index % 2 === 0 ? 'User' : 'Assistant';
  }

  // ============================================================================
  // Provider Detection & Metadata Extraction
  // ============================================================================
  function detectProvider(hostname) {
    if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) return 'chatgpt';
    if (hostname.includes('claude.ai')) return 'claude';
    if (hostname.includes('gemini.google.com')) return 'gemini';
    if (hostname.includes('deepseek.com')) return 'deepseek';
    if (hostname.includes('notebooklm.google.com')) return 'notebooklm';
    return 'unknown';
  }

  function extractConversationId(url, provider) {
    try {
      switch (provider) {
        case 'chatgpt':
          return /chatgpt\.com\/c\/([a-z0-9-]+)/i.exec(url)?.[1] || '';
        case 'claude':
          return /claude\.ai\/chat\/([a-z0-9-]+)/i.exec(url)?.[1] || '';
        case 'gemini':
          return window.location.hash.substring(1) || '';
        case 'deepseek':
          return /deepseek\.com\/chat\/([a-z0-9-]+)/i.exec(url)?.[1] || '';
        case 'notebooklm':
          return /\/notebook\/([^/?#]+)/i.exec(url)?.[1] || '';
        default:
          return '';
      }
    } catch (error) {
      console.error('[AI Chat Exporter] Failed to extract conversation ID:', error);
      return '';
    }
  }

  function isNotebookLmNoiseMessage(content) {
    const value = String(content || '').replace(/\s+/g, ' ').trim();
    if (!value) return true;
    if (value === 'Loading' || value === '(1)') return true;
    return /Chat history is now saved across sessions|Jump to bottom|Light mode|Dark mode|Device theme|Good response|Bad response|CopyGood response|Copy model response|Generate an AI|Generate reports based on your sources|Infinite Curiosity|Click to open citation details/i.test(value);
  }

  function looksLikeNotebookLmQuestion(content) {
    const value = String(content || '').replace(/\s+/g, ' ').trim();
    if (!value) return false;
    if (value.length > 140) return false;
    return /[?？]$/.test(value) || /^(为什么|怎么|如何|它是怎么|达芬奇|莱昂纳多)/.test(value);
  }

  function normalizeNotebookLmMessages(messages) {
    const cleaned = [];

    for (const raw of Array.isArray(messages) ? messages : []) {
      const role = String(raw?.role || '').trim() || 'Assistant';
      const content = String(raw?.content || '').trim();
      if (!content || isNotebookLmNoiseMessage(content)) continue;

      const prev = cleaned[cleaned.length - 1];
      if (prev && prev.content === content) {
        continue;
      }

      cleaned.push({ role, content });
    }

    return cleaned.map((message, index, arr) => {
      const next = arr[index + 1];
      if (
        message.role === 'Assistant' &&
        looksLikeNotebookLmQuestion(message.content) &&
        next &&
        next.role === 'Assistant' &&
        next.content.length > Math.max(message.content.length * 2, 160)
      ) {
        return { role: 'User', content: message.content };
      }

      return message;
    });
  }

  function finalizeMessages(provider, messages) {
    if (provider === 'notebooklm') {
      return normalizeNotebookLmMessages(messages);
    }

    const final = [];
    const seen = new Map();
    messages.forEach(m => {
      const key = normalizeDuplicateMessageKey(m.content);
      if (!key) return;
      const existingIndex = seen.get(key);
      if (existingIndex === undefined) {
        seen.set(key, final.length);
        final.push(m);
        return;
      }

      const preferred = choosePreferredDuplicateMessage(final[existingIndex], m);
      if (preferred !== final[existingIndex]) {
        final[existingIndex] = preferred;
      }
    });
    return final;
  }

  function normalizeDuplicateMessageKey(content) {
    return String(content || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000);
  }

  function looksLikeUserPrompt(content) {
    const value = String(content || '').replace(/\s+/g, ' ').trim();
    if (!value) return false;
    if (/[?？]$/.test(value)) return true;
    if (value.length <= 180 && /^(那|请|帮我|你|我们|怎么|如何|为什么|能不能|是否|如果)/.test(value)) return true;
    return false;
  }

  function choosePreferredDuplicateMessage(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (a.role === b.role) return a;
    const preferUser = looksLikeUserPrompt(a.content || b.content);
    const wantedRole = preferUser ? 'User' : 'Assistant';
    if (b.role === wantedRole) return b;
    return a;
  }

  // ============================================================================
  // Main
  // ============================================================================
  window.exportChatToMarkdown = function() {
    console.log('[AI Chat Exporter] Deep Scanning...');
    const host = window.location.hostname;
    const url = window.location.href;
    const provider = detectProvider(host);
    const conversationId = extractConversationId(url, provider);
    let messages = [];
    
    console.log(`[AI Chat Exporter] Provider: ${provider}, ConversationId: ${conversationId}`);
    
    // 1. Title Extraction
    const getTitle = () => {
      const selectors = [
        '.title-label-inner',
        'editable-project-title',
        'input.title-input',
        '[role="heading"][aria-level="1"]',
        'nav .bg-token-surface-active',
        '.ds-sidebar-item--active',
        '.selected[data-test-id="conversation"]',
        'h1',
        'title'
      ];
      for (const s of selectors) {
        const el = document.querySelector(s);
        const value =
          typeof el?.value === 'string' && el.value.trim()
            ? el.value.trim()
            : el?.innerText?.trim();
        if (value) return value.split('\n')[0];
      }
      return document.title;
    };
    const title = getTitle().replace(/ - (ChatGPT|Claude|DeepSeek|Gemini|AI)$/i, '').replace(/[\/\?%*:|"<>]/g, '_').substring(0, 50);

    // 2. Universal Block Discovery
    const all = getDeepElements();
    console.log(`[AI Chat Exporter] Total DOM elements (incl. Shadow): ${all.length}`);
    
    const blocks = all.filter(el => {
      const tag = el.tagName.toLowerCase();
      const testid = el.getAttribute('data-testid') || '';
      const cls = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');
      
      // Comprehensive selectors for all platforms
      return tag === 'message-content' ||      // Gemini
             tag === 'user-query' ||            // Gemini user
             tag === 'model-response' ||        // Gemini AI
             testid.startsWith('conversation-turn-') || // ChatGPT
             cls.includes('ds-message') ||      // DeepSeek
             cls.includes('message') ||         // Generic
             cls.includes('chat-turn') ||       // Potential Gemini
             cls.includes('conversation-turn') || // Potential alternative
             el.hasAttribute('data-test-render-count') || // Claude
             el.hasAttribute('data-message-author-role');  // ChatGPT
    });
    
    console.log(`[AI Chat Exporter] Found ${blocks.length} potential message blocks`);

    // 3. Process
    blocks.forEach((el, i) => {
      const role = detectRole(el, i);
      const contentEl = el.querySelector('.markdown, .prose, .ds-markdown, .query-content, .model-response-text, [class*="message-content"]') || el;
      const content = extractMarkdownFromElement(contentEl).trim();
      
      console.log(`[Block ${i}] Tag: ${el.tagName}, Role: ${role}, Content length: ${content.length}`);
      
      if (content && content.length > 2) {
        messages.push({ role, content });
        console.log(`  ✓ Added: ${content.substring(0, 50)}...`);
      }
    });
    
    console.log(`[AI Chat Exporter] Total messages captured: ${messages.length}`);

    // 4. Emergency Fallback (Generic Text Blocks)
    if (messages.length === 0) {
      console.log('[AI Chat Exporter] Structural scan failed, using visual fallback...');
      all.filter(el => el.classList.contains('markdown') || el.classList.contains('prose') || el.classList.contains('ds-markdown'))
         .forEach(ai => {
            let userText = '';
            let prev = ai.parentElement;
            while (prev && prev.innerText.length < 5) prev = prev.previousElementSibling;
            if (prev) userText = prev.innerText.trim();
            if (userText) messages.push({ role: 'User', content: userText });
            messages.push({ role: 'Assistant', content: extractMarkdownFromElement(ai).trim() });
         });
    }

    // 5. Normalize & Return
    const final = finalizeMessages(provider, messages);

    if (final.length === 0) {
      console.error('[AI Chat Exporter] FAILED. Platform:', host, 'DOM Size:', all.length);
      return null;
    }

    // Generate Markdown content
    let md = `# ${title}\n\n`;
    md += `> Source: [${host}](${url})\n\n---\n\n`;
    final.forEach(m => md += `### ${m.role}\n\n${m.content}\n\n---\n\n`);

    // Return both structured data and formatted content
    return { 
      // For immediate export
      filename: `${title.toLowerCase().replace(/\s+/g, '_')}.md`, 
      content: md, 
      count: final.length,
      
      // Structured data for storage
      data: {
        title: title,
        provider: provider,
        url: url,
        conversationId: conversationId,
        messageCount: final.length,
        messages: final,
        timestamp: Date.now()
      }
    };
  };

  // Export as JSON
  window.exportChatToJSON = function() {
    const result = window.exportChatToMarkdown();
    if (!result || !result.data) return null;
    
    const jsonData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      ...result.data
    };
    
    const filename = `${result.data.title.toLowerCase().replace(/\s+/g, '_')}.json`;
    const content = JSON.stringify(jsonData, null, 2);
    
    return { filename, content, data: jsonData };
  };

  function escapePrintableHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeExportBaseName(value) {
    return String(value || 'ai-chat')
      .replace(/[\/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'ai-chat';
  }

  function formatMarkdownTextForPrint(value) {
    const source = String(value || '').trim();
    if (!source) return '';

    const parts = [];
    const fencePattern = /```([^\n`]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    const renderInlineMarkdown = (text) => {
      let html = escapePrintableHtml(text);
      html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
      html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
      html = html.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
      html = html.replace(/(^|[\s(])_([^_\n]+)_/g, '$1<em>$2</em>');
      return html;
    };

    const splitTableRow = (line) => String(line || '')
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());

    const isTableDivider = (line) => {
      const cells = splitTableRow(line);
      return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
    };

    const flushParagraph = (paragraphLines, out) => {
      if (!paragraphLines.length) return;
      out.push(`<p>${renderInlineMarkdown(paragraphLines.join('\n')).replace(/\n/g, '<br>')}</p>`);
      paragraphLines.length = 0;
    };

    const renderMarkdownBlocks = (text) => {
      const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
      const out = [];
      const paragraph = [];
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
          flushParagraph(paragraph, out);
          i += 1;
          continue;
        }

        const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
        if (heading) {
          flushParagraph(paragraph, out);
          const level = Math.min(Number(heading[1].length) + 1, 4);
          out.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
          i += 1;
          continue;
        }

        if (/^>\s?/.test(trimmed)) {
          flushParagraph(paragraph, out);
          const quoteLines = [];
          while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
            quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
            i += 1;
          }
          out.push(`<blockquote>${renderMarkdownBlocks(quoteLines.join('\n'))}</blockquote>`);
          continue;
        }

        if (/^\s*[-*+]\s+/.test(line)) {
          flushParagraph(paragraph, out);
          const items = [];
          while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
            items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
            i += 1;
          }
          out.push(`<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ul>`);
          continue;
        }

        if (/^\s*\d+[.)]\s+/.test(line)) {
          flushParagraph(paragraph, out);
          const items = [];
          while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
            items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
            i += 1;
          }
          out.push(`<ol>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ol>`);
          continue;
        }

        if (
          trimmed.includes('|') &&
          i + 1 < lines.length &&
          isTableDivider(lines[i + 1])
        ) {
          flushParagraph(paragraph, out);
          const headers = splitTableRow(trimmed);
          i += 2;
          const rows = [];
          while (i < lines.length && lines[i].trim().includes('|')) {
            rows.push(splitTableRow(lines[i]));
            i += 1;
          }
          out.push(`
            <table>
              <thead><tr>${headers.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join('')}</tr></thead>
              <tbody>${rows.map((row) => `<tr>${headers.map((_, index) => `<td>${renderInlineMarkdown(row[index] || '')}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>`);
          continue;
        }

        paragraph.push(line);
        i += 1;
      }

      flushParagraph(paragraph, out);
      return out.join('');
    };

    while ((match = fencePattern.exec(source)) !== null) {
      parts.push(renderMarkdownBlocks(source.slice(lastIndex, match.index)));
      const lang = String(match[1] || '').trim();
      const code = String(match[2] || '').replace(/^\n+|\n+$/g, '');
      parts.push(
        `<pre><code>${lang ? `<span class="code-lang">${escapePrintableHtml(lang)}</span>\n` : ''}${escapePrintableHtml(code)}</code></pre>`
      );
      lastIndex = match.index + match[0].length;
    }

    parts.push(renderMarkdownBlocks(source.slice(lastIndex)));
    return parts.join('');
  }

  function buildPrintableChatHtml(conversation) {
    const title = String(conversation?.title || 'AI Chat').trim() || 'AI Chat';
    const provider = String(conversation?.provider || 'unknown').trim() || 'unknown';
    const url = String(conversation?.url || '').trim();
    const exportedAt = new Date().toLocaleString();
    const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];

    const messageHtml = messages.map((message, index) => {
      const role = String(message?.role || (index % 2 === 0 ? 'User' : 'Assistant')).trim() || 'Message';
      const roleClass = /^user$/i.test(role) ? 'user' : 'assistant';
      const body = formatMarkdownTextForPrint(message?.content);
      if (!body) return '';
      return `
        <article class="message ${roleClass}">
          <div class="role">${escapePrintableHtml(role)}</div>
          <div class="body">${body}</div>
        </article>`;
    }).filter(Boolean).join('\n');

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapePrintableHtml(title)} - PDF Export</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #1f2933;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      font-size: 13px;
      line-height: 1.55;
    }
    .print-help {
      margin: 20px auto;
      max-width: 840px;
      padding: 12px 14px;
      border: 1px solid #9ca3af;
      color: #374151;
      background: #f9fafb;
    }
    main {
      max-width: 840px;
      margin: 0 auto;
      padding: 28px 24px 40px;
    }
    h1 {
      margin: 0 0 10px;
      color: #111827;
      font-size: 28px;
      line-height: 1.2;
      letter-spacing: 0;
    }
    .meta {
      margin: 0 0 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #d1d5db;
      color: #4b5563;
      font-size: 12px;
    }
    .meta div { margin: 3px 0; overflow-wrap: anywhere; }
    .message {
      break-inside: avoid;
      page-break-inside: avoid;
      margin: 0 0 18px;
      padding: 14px 16px;
      border: 1px solid #d1d5db;
      border-left-width: 4px;
      background: #ffffff;
    }
    .message.user { border-left-color: #2563eb; }
    .message.assistant { border-left-color: #059669; }
    .role {
      margin-bottom: 8px;
      color: #111827;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    p { margin: 0 0 10px; }
    p:last-child { margin-bottom: 0; }
    h2, h3, h4 {
      margin: 18px 0 8px;
      color: #111827;
      line-height: 1.3;
      letter-spacing: 0;
    }
    h2 { font-size: 20px; }
    h3 { font-size: 17px; }
    h4 { font-size: 15px; }
    ul, ol {
      margin: 8px 0 12px 1.5em;
      padding: 0;
    }
    li { margin: 4px 0; }
    blockquote {
      margin: 12px 0;
      padding: 8px 12px;
      border-left: 3px solid #9ca3af;
      background: #f9fafb;
      color: #374151;
    }
    table {
      width: 100%;
      margin: 12px 0;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      padding: 7px 8px;
      border: 1px solid #d1d5db;
      vertical-align: top;
      text-align: left;
    }
    th {
      background: #f3f4f6;
      color: #111827;
      font-weight: 700;
    }
    a { color: #1d4ed8; text-decoration: underline; overflow-wrap: anywhere; }
    strong { color: #111827; font-weight: 700; }
    .inline-code {
      padding: 1px 4px;
      border: 1px solid #d1d5db;
      background: #f3f4f6;
      border-radius: 3px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 0.92em;
    }
    pre {
      margin: 12px 0;
      padding: 12px;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      border: 1px solid #d1d5db;
      background: #f3f4f6;
      color: #111827;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 11px;
      line-height: 1.45;
    }
    .code-lang {
      display: block;
      margin-bottom: 6px;
      color: #6b7280;
      font-weight: 700;
    }
    @media print {
      .print-help { display: none; }
      main { max-width: none; padding: 0; }
      .message { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="print-help">Use the browser print dialog and choose Save as PDF. This helper box will not appear in the PDF.</div>
  <main>
    <h1>${escapePrintableHtml(title)}</h1>
    <section class="meta">
      <div><strong>Provider:</strong> ${escapePrintableHtml(provider)}</div>
      <div><strong>Exported:</strong> ${escapePrintableHtml(exportedAt)}</div>
      <div><strong>Messages:</strong> ${messages.length}</div>
      ${url ? `<div><strong>Source:</strong> ${escapePrintableHtml(url)}</div>` : ''}
    </section>
    <section class="conversation">
      ${messageHtml || '<p>No messages captured.</p>'}
    </section>
  </main>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        try { window.print(); } catch (_) {}
      }, 350);
    });
  </script>
</body>
</html>`;
  }

  window.exportChatToPrintableHTML = function() {
    const result = window.exportChatToMarkdown();
    if (!result || !result.data) return null;

    return {
      filename: `${safeExportBaseName(result.data.title)}_pdf.html`,
      content: buildPrintableChatHtml(result.data),
      count: result.count,
      data: result.data
    };
  };

  const ORIGINAL_VIEW_STYLE_PROPS = [
    'display', 'box-sizing',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    'border-radius', 'background', 'background-color', 'color',
    'font-family', 'font-size', 'font-weight', 'font-style', 'line-height',
    'letter-spacing', 'text-align', 'text-decoration', 'text-transform',
    'white-space', 'overflow-wrap', 'word-break',
    'list-style-type', 'list-style-position',
    'width', 'max-width', 'min-width', 'height', 'max-height', 'min-height',
    'align-items', 'align-self', 'justify-content', 'flex-direction', 'flex-wrap',
    'gap', 'row-gap', 'column-gap',
    'grid-template-columns', 'grid-template-rows',
    'vertical-align'
  ];

  function isRenderableOriginalNode(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    const text = String(el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length < 2 && !el.querySelector('img, pre, code, table')) return false;
    try {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    } catch (_) {
      return true;
    }
  }

  function getOriginalViewMessageBlocks() {
    const selectors = [
      '[data-testid^="conversation-turn-"]',
      '[data-message-author-role]',
      'article[data-testid]',
      'user-query',
      'model-response',
      'message-content',
      '[class*="conversation-turn"]',
      '[class*="chat-turn"]',
      '[class*="ds-message"]',
      '[data-test-render-count]'
    ];
    const nodes = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
    const unique = Array.from(new Set(nodes)).filter(isRenderableOriginalNode);
    const outermost = unique.filter((node) => !unique.some((other) => other !== node && other.contains(node)));
    outermost.sort((a, b) => {
      if (a === b) return 0;
      const position = a.compareDocumentPosition(b);
      if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      return 0;
    });
    return outermost;
  }

  function findCommonAncestor(nodes) {
    if (!nodes.length) return null;
    let current = nodes[0];
    while (current && current !== document.body) {
      if (nodes.every((node) => current.contains(node))) return current;
      current = current.parentElement;
    }
    return null;
  }

  function findOriginalViewRoot() {
    const blocks = getOriginalViewMessageBlocks();
    const ancestor = findCommonAncestor(blocks);
    if (ancestor && ancestor !== document.body) return ancestor;

    const fallbacks = [
      'main',
      '[role="main"]',
      '[data-testid="conversation"]',
      '[class*="conversation"]',
      '[class*="chat"]'
    ];
    for (const selector of fallbacks) {
      const el = document.querySelector(selector);
      if (isRenderableOriginalNode(el)) return el;
    }

    return document.body;
  }

  function inlineOriginalViewStyles(source, clone) {
    if (!source || !clone || source.nodeType !== Node.ELEMENT_NODE || clone.nodeType !== Node.ELEMENT_NODE) return;

    try {
      const computed = window.getComputedStyle(source);
      const rules = ORIGINAL_VIEW_STYLE_PROPS
        .map((prop) => {
          const value = computed.getPropertyValue(prop);
          return value ? `${prop}:${value}` : '';
        })
        .filter(Boolean);
      if (rules.length) clone.setAttribute('style', rules.join(';'));
    } catch (_) {}

    const sourceChildren = Array.from(source.children || []);
    const cloneChildren = Array.from(clone.children || []);
    sourceChildren.forEach((child, index) => inlineOriginalViewStyles(child, cloneChildren[index]));
  }

  function cleanOriginalViewClone(clone) {
    if (!clone || clone.nodeType !== Node.ELEMENT_NODE) return clone;

    const noiseSelectors = [
      'script', 'style', 'noscript',
      'button', 'textarea', 'input', 'select', 'form',
      '[role="button"]',
      '[aria-label*="Copy"]',
      '[aria-label*="复制"]',
      '[aria-label*="Good response"]',
      '[aria-label*="Bad response"]',
      '[contenteditable="true"]',
      '.sr-only',
      '[aria-hidden="true"]'
    ];

    clone.querySelectorAll(noiseSelectors.join(',')).forEach((el) => el.remove());
    clone.querySelectorAll('[style]').forEach((el) => {
      const style = el.getAttribute('style') || '';
      const normalized = style
        .replace(/position:\s*(fixed|sticky);?/gi, 'position: static;')
        .replace(/overflow:\s*(auto|scroll|hidden);?/gi, 'overflow: visible;')
        .replace(/max-height:\s*[^;]+;?/gi, 'max-height: none;')
        .replace(/min-height:\s*[^;]+;?/gi, 'min-height: 0;');
      el.setAttribute('style', normalized);
    });

    return clone;
  }

  function normalizeOriginalPrintBlock(clone) {
    if (!clone || clone.nodeType !== Node.ELEMENT_NODE) return clone;
    clone.setAttribute('data-aisb-original-block', '1');
    clone.style.position = 'static';
    clone.style.inset = 'auto';
    clone.style.transform = 'none';
    clone.style.overflow = 'visible';
    clone.style.maxHeight = 'none';
    clone.style.height = 'auto';
    clone.style.opacity = '1';
    clone.style.visibility = 'visible';
    clone.style.breakInside = 'avoid';
    clone.style.pageBreakInside = 'avoid';
    clone.style.justifyContent = 'flex-start';
    clone.style.alignItems = 'stretch';
    clone.style.marginTop = '0';
    clone.style.paddingTop = '0';
    clone.style.marginBottom = clone.style.marginBottom || '16px';
    return clone;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    });
  }

  async function fetchImageDataUrlByRuntime(url) {
    if (!url || typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return '';

    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'gv.fetchImage', url }, (response) => {
          if (chrome.runtime.lastError || !response?.ok || !response?.base64) {
            resolve('');
            return;
          }
          resolve(`data:${response.contentType || 'image/png'};base64,${response.base64}`);
        });
      } catch (_) {
        resolve('');
      }
    });
  }

  async function fetchImageDataUrl(url) {
    const src = String(url || '').trim();
    if (!src) return '';
    if (src.startsWith('data:')) return src;

    try {
      const response = await fetch(src, {
        credentials: 'include',
        cache: 'force-cache'
      });
      if (response.ok) {
        return await blobToDataUrl(await response.blob());
      }
    } catch (_) {}

    if (/^https?:\/\//i.test(src)) {
      return await fetchImageDataUrlByRuntime(src);
    }

    return '';
  }

  function imageElementToDataUrl(img) {
    try {
      if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) return '';
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) return '';
      context.drawImage(img, 0, 0);
      return canvas.toDataURL('image/png');
    } catch (_) {
      return '';
    }
  }

  async function inlineOriginalViewImages(sourceRoot, cloneRoot) {
    const sourceImages = Array.from(sourceRoot.querySelectorAll('img'));
    const cloneImages = Array.from(cloneRoot.querySelectorAll('img'));
    const maxImages = 80;

    for (let index = 0; index < Math.min(sourceImages.length, cloneImages.length, maxImages); index += 1) {
      const sourceImage = sourceImages[index];
      const cloneImage = cloneImages[index];
      const src = sourceImage.currentSrc || sourceImage.getAttribute('src') || cloneImage.getAttribute('src') || '';

      let dataUrl = imageElementToDataUrl(sourceImage);
      if (!dataUrl) dataUrl = await fetchImageDataUrl(src);
      if (!dataUrl) continue;

      cloneImage.setAttribute('src', dataUrl);
      cloneImage.removeAttribute('srcset');
      cloneImage.removeAttribute('sizes');
      cloneImage.setAttribute('loading', 'eager');
      cloneImage.setAttribute('decoding', 'sync');

      const picture = cloneImage.closest('picture');
      if (picture) {
        picture.querySelectorAll('source').forEach((source) => source.remove());
      }
    }

    const sourceCanvases = Array.from(sourceRoot.querySelectorAll('canvas'));
    const cloneCanvases = Array.from(cloneRoot.querySelectorAll('canvas'));
    sourceCanvases.forEach((sourceCanvas, index) => {
      const cloneCanvas = cloneCanvases[index];
      if (!cloneCanvas) return;
      try {
        const dataUrl = sourceCanvas.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = cloneCanvas.getAttribute('aria-label') || 'canvas';
        cloneCanvas.replaceWith(img);
      } catch (_) {}
    });
  }

  async function buildOriginalViewContentHtml(root) {
    const blocks = getOriginalViewMessageBlocks();
    if (blocks.length) {
      const html = [];
      for (const block of blocks) {
        const clonedBlock = block.cloneNode(true);
        inlineOriginalViewStyles(block, clonedBlock);
        cleanOriginalViewClone(clonedBlock);
        normalizeOriginalPrintBlock(clonedBlock);
        await inlineOriginalViewImages(block, clonedBlock);
        html.push(clonedBlock.outerHTML);
      }
      return html.join('\n');
    }

    const clonedRoot = root.cloneNode(true);
    inlineOriginalViewStyles(root, clonedRoot);
    cleanOriginalViewClone(clonedRoot);
    normalizeOriginalPrintBlock(clonedRoot);
    await inlineOriginalViewImages(root, clonedRoot);
    return clonedRoot.outerHTML;
  }

  async function buildOriginalViewPrintHtml(root, meta) {
    const contentHtml = await buildOriginalViewContentHtml(root);

    const title = String(meta?.title || document.title || 'AI Chat').trim() || 'AI Chat';
    const url = String(meta?.url || window.location.href || '').trim();
    const exportedAt = new Date().toLocaleString();

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapePrintableHtml(title)} - Original View Export</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      background: #ffffff;
      color: #111827;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    }
    .original-export-meta {
      margin: 0 auto 16px;
      max-width: 980px;
      padding: 14px 16px;
      border-bottom: 1px solid #d1d5db;
      color: #4b5563;
      font-size: 12px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    .original-export-meta h1 {
      margin: 0 0 6px;
      color: #111827;
      font-size: 18px;
      line-height: 1.25;
      letter-spacing: 0;
    }
    .original-export-content {
      max-width: 980px;
      margin: 0 auto;
      padding: 0 12px 32px;
    }
    .original-export-content,
    .original-export-content * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .original-export-content [data-aisb-original-block] {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      opacity: 1 !important;
      visibility: visible !important;
      justify-content: flex-start !important;
      align-items: stretch !important;
      margin-top: 0 !important;
      padding-top: 0 !important;
    }
    .original-export-content [data-aisb-original-block] * {
      max-height: none !important;
      min-height: 0 !important;
      overflow: visible !important;
    }
    .original-export-content img,
    .original-export-content video,
    .original-export-content canvas {
      max-width: 100% !important;
      height: auto !important;
    }
    .original-export-content pre,
    .original-export-content code {
      white-space: pre-wrap !important;
      overflow-wrap: anywhere !important;
    }
    .original-export-content [data-testid^="conversation-turn-"],
    .original-export-content user-query,
    .original-export-content model-response,
    .original-export-content message-content {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    @media print {
      .original-export-content {
        max-width: none;
        padding: 0;
      }
      .original-export-meta {
        max-width: none;
        padding-left: 0;
        padding-right: 0;
      }
    }
  </style>
</head>
<body>
  <section class="original-export-meta">
    <h1>${escapePrintableHtml(title)}</h1>
    <div><strong>Exported:</strong> ${escapePrintableHtml(exportedAt)}</div>
    ${url ? `<div><strong>Source:</strong> ${escapePrintableHtml(url)}</div>` : ''}
  </section>
  <main class="original-export-content">
    ${contentHtml}
  </main>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        try { window.print(); } catch (_) {}
      }, 450);
    });
  </script>
</body>
</html>`;
  }

  window.exportChatToOriginalViewHTML = async function() {
    const result = window.exportChatToMarkdown();
    const root = findOriginalViewRoot();
    if (!root) return null;

    const title = result?.data?.title || document.title || 'AI Chat';
    return {
      filename: `${safeExportBaseName(title)}_original_view.html`,
      content: await buildOriginalViewPrintHtml(root, {
        title,
        url: result?.data?.url || window.location.href
      }),
      count: result?.count || getOriginalViewMessageBlocks().length || 0,
      data: result?.data || null
    };
  };

  // ============================================================================
  // Communication Bridge for AI-Sidebar
  // ============================================================================
  const markShortcutTarget = () => {
    try {
      if (window.top === window) {
        chrome.runtime?.sendMessage?.({ type: 'AISB_SHORTCUT_TARGET', surface: 'page' });
      } else if (window.parent !== window) {
        window.parent.postMessage({ type: 'AISB_SHORTCUT_TARGET' }, '*');
      }
    } catch (_) {}
  };

  try { document.addEventListener('pointerdown', markShortcutTarget, true); } catch (_) {}
  try { window.addEventListener('focus', markShortcutTarget, true); } catch (_) {}

  window.addEventListener('message', async (event) => {
    const data = event.data || {};

    if (data.type === 'ai-url-changed') {
      if (window.top !== window) return;
      pageAutoSaveState.href = String(data.href || window.location.href || '');
      pageAutoSaveState.title = String(data.title || document.title || '');
      schedulePageAutoSave();
      return;
    }

    if (data.type === 'AISB_SHOW_EXPORT_PANEL') {
      showExportPanel();
      return;
    }

    if (data.type === 'AISB_SHORTCUT_SAVE_TOGGLE_EXPORT_PANEL') {
      await shortcutSaveToggleExportPanel();
      return;
    }

    if (data.type === 'AI_SIDEBAR_SHORTCUT_SAVE_ACK') {
      const panel = document.getElementById(PANEL_ID);
      const statusEl = panel?.querySelector('.ep-status');
      if (statusEl) {
        if (data.ok) {
          statusEl.textContent = '✓ Saved to history; folder sync queued';
          statusEl.className = 'ep-status success';
        } else {
          statusEl.textContent = `Save failed: ${data.error || 'Unknown error'}`;
          statusEl.className = 'ep-status error';
        }
      }
      return;
    }
    
    // Quick Export
    if (data.type === 'AI_SIDEBAR_EXPORT_REQUEST') {
      console.log('[AI Chat Exporter] Received export request:', data.format);
      let result = null;
      if (data.format === 'markdown') {
        result = window.exportChatToMarkdown();
      } else if (data.format === 'json') {
        result = window.exportChatToJSON();
      } else if (data.format === 'pdf') {
        result = window.exportChatToPrintableHTML();
      } else if (data.format === 'original') {
        result = await window.exportChatToOriginalViewHTML();
      }
      
      if (result) {
        window.parent.postMessage({
          type: 'AI_SIDEBAR_EXPORT_RESPONSE',
          format: data.format,
          result: result
        }, '*');
      } else {
        window.parent.postMessage({
          type: 'AI_SIDEBAR_EXPORT_RESPONSE',
          format: data.format,
          error: 'Failed to capture chat data'
        }, '*');
      }
    }

    // Save to Library Request (from sidebar button)
    if (data.type === 'AI_SIDEBAR_SAVE_TO_LIBRARY_REQUEST') {
      console.log('[AI Chat Exporter] Received save to library request');
      try {
        const result = window.exportChatToMarkdown();
        if (!result) {
          window.parent.postMessage({
            type: 'AI_SIDEBAR_SAVE_TO_LIBRARY_RESPONSE',
            error: 'Failed to capture chat data'
          }, '*');
          return;
        }
        
        window.parent.postMessage({
          type: 'AI_SIDEBAR_SAVE_TO_LIBRARY_RESPONSE',
          data: result.data,
          content: result.content,
          meta: data.meta || null
        }, '*');
      } catch (err) {
        window.parent.postMessage({
          type: 'AI_SIDEBAR_SAVE_TO_LIBRARY_RESPONSE',
          error: err.message,
          meta: data.meta || null
        }, '*');
      }
    }

    // Save & Export
    if (data.type === 'AI_SIDEBAR_SAVE_EXPORT_REQUEST') {
      console.log('[AI Chat Exporter] Received save & export request');
      try {
        if (typeof window.exportChatToMarkdown !== 'function') {
          throw new Error('Export logic not ready');
        }
        
        const result = window.exportChatToMarkdown();
        if (!result) throw new Error('Failed to capture chat');

        // Check for duplicate if storage manager is present
        if (typeof window.findDuplicate === 'function' && result.data.conversationId) {
          const duplicate = await window.findDuplicate(result.data.conversationId);
          if (duplicate) {
            // We can't show confirm() easily from iframe to sidebar, 
            // so we send a message back to sidebar to ask the user.
            window.parent.postMessage({
              type: 'AI_SIDEBAR_CONFIRM_UPDATE',
              duplicate: { title: duplicate.title, id: duplicate.id },
              result: result
            }, '*');
            return;
          }
        }

        // Save if storage manager is present
        if (typeof window.saveConversation === 'function') {
          await window.saveConversation(result.data);
          window.parent.postMessage({
            type: 'AI_SIDEBAR_SAVE_EXPORT_RESPONSE',
            result: result,
            saved: true
          }, '*');
        } else {
          window.parent.postMessage({
            type: 'AI_SIDEBAR_SAVE_EXPORT_RESPONSE',
            result: result,
            saved: false,
            warning: 'Storage manager not found, only exported'
          }, '*');
        }
      } catch (err) {
        window.parent.postMessage({
          type: 'AI_SIDEBAR_SAVE_EXPORT_RESPONSE',
          error: err.message
        }, '*');
      }
    }

    // Confirm Update (User said yes)
    if (data.type === 'AI_SIDEBAR_SAVE_EXPORT_CONFIRMED') {
      const result = data.result;
      if (typeof window.saveConversation === 'function') {
        // Find existing ID to update
        const duplicate = await window.findDuplicate(result.data.conversationId);
        if (duplicate && typeof window.updateConversation === 'function') {
          await window.updateConversation(duplicate.id, result.data);
        } else {
          await window.saveConversation(result.data);
        }
        window.parent.postMessage({
          type: 'AI_SIDEBAR_SAVE_EXPORT_RESPONSE',
          result: result,
          saved: true
        }, '*');
      }
    }
  });

  // ============================================================================
  // Option+S Shortcut - Show Export Panel on Page
  // ============================================================================
  const PANEL_ID = 'ai-sidebar-export-panel';
  const PROJECT_NAME = 'AI-Sidebar';
  const AUTO_SAVE_INTERVAL_MS = 12000;
  const AUTO_SAVE_DEBOUNCE_MS = 1800;
  const AUTO_SAVE_MUTATION_DEBOUNCE_MS = 900;
  const pageAutoSaveState = {
    timer: null,
    inFlight: false,
    title: '',
    href: '',
    lastFingerprint: ''
  };

  async function syncSavedConversationToNativeHost(conversation) {
    if (!conversation || typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return false;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'AI_SIDEBAR_SYNC_CONVERSATION_NATIVE',
        project: PROJECT_NAME,
        conversation: {
          ...conversation,
          project: PROJECT_NAME
        }
      });
      return response?.ok !== false && response?.result?.success !== false;
    } catch (error) {
      console.warn('[Exporter] native mirror sync failed:', error);
      return false;
    }
  }

  function isUsefulConversationTitle(title) {
    const value = String(title || '').trim();
    if (!value) return false;

    const normalized = value.toLowerCase();
    if (normalized.length < 4) return false;
    if (/^(new\s*chat|chatgpt|gemini|deepseek|claude|ai|conversation with gemini)$/i.test(normalized)) return false;
    if (/^(新聊天|新对话|最近|recent)$/i.test(value)) return false;
    return true;
  }

  function hasStableConversationUrl(url, provider) {
    try {
      const u = new URL(String(url || ''));
      if (provider === 'chatgpt') return /\/c\/[\w-]+/i.test(u.pathname);
      if (provider === 'gemini') return /\/app\/(?:conversation\/)?[^/?#]+/.test(u.pathname);
      if (provider === 'deepseek') return /\/(sessions|s)\/[^/?#]+/.test(u.pathname);
      if (provider === 'claude') return /\/chat\/[\w-]+/i.test(u.pathname);
      if (provider === 'notebooklm') return /\/notebook\/[^/?#]+/.test(u.pathname);
      return Boolean(u.pathname && u.pathname !== '/');
    } catch (_) {
      return false;
    }
  }

  function buildConversationFingerprint(conversation, href, title) {
    const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
    const messageCount = Number(conversation?.messageCount || messages.length || 0);
    const stableKey = String(conversation?.conversationId || href || '');
    const lastMessage = messages[messages.length - 1] || null;
    const lastRole = String(lastMessage?.role || '').trim();
    const lastContent = String(lastMessage?.content || '').trim();
    const lastTail = lastContent.slice(-120);
    return `${stableKey}|${messageCount}|${lastRole}|${lastContent.length}|${lastTail}|${conversation?.title || title || ''}`;
  }

  function canAutoSaveCurrentPage(provider, href, title) {
    if (window.top !== window) return false;
    if (typeof window.saveConversation !== 'function') return false;
    return isUsefulConversationTitle(title) && hasStableConversationUrl(href, provider);
  }

  async function autoSaveCurrentConversation(force = false) {
    if (window.top !== window) return { ok: false, reason: 'not_top_window' };
    if (pageAutoSaveState.inFlight) return { ok: false, reason: 'in_flight' };

    const provider = detectProvider(window.location.hostname);
    const href = pageAutoSaveState.href || window.location.href;
    const title = pageAutoSaveState.title || document.title;
    if (!canAutoSaveCurrentPage(provider, href, title)) {
      return { ok: false, reason: 'conversation_not_ready' };
    }

    pageAutoSaveState.inFlight = true;
    try {
      const result = window.exportChatToMarkdown();
      if (!result?.data) return { ok: false, reason: 'export_failed' };

      const fingerprint = buildConversationFingerprint(result.data, href, title);
      if (!force && fingerprint === pageAutoSaveState.lastFingerprint) {
        return { ok: false, reason: 'unchanged' };
      }

      await window.saveConversation(result.data);
      await syncSavedConversationToNativeHost(result.data);
      pageAutoSaveState.lastFingerprint = fingerprint;
      return { ok: true, fingerprint };
    } finally {
      pageAutoSaveState.inFlight = false;
    }
  }

  function schedulePageAutoSave(delay = AUTO_SAVE_DEBOUNCE_MS) {
    clearTimeout(pageAutoSaveState.timer);
    pageAutoSaveState.href = window.location.href;
    pageAutoSaveState.title = document.title;
    const provider = detectProvider(window.location.hostname);
    const href = pageAutoSaveState.href || window.location.href;
    const title = pageAutoSaveState.title || document.title;
    if (!canAutoSaveCurrentPage(provider, href, title)) return;

    pageAutoSaveState.timer = setTimeout(() => {
      autoSaveCurrentConversation().catch((error) => {
        console.warn('[Exporter] page auto-save failed:', error);
      });
    }, delay);
  }
  
  const createExportPanel = () => {
    if (document.getElementById(PANEL_ID)) return document.getElementById(PANEL_ID);
    
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <style>
        #${PANEL_ID} {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #fff;
          color: #000;
          border: 1px solid #000;
          border-radius: 0;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          padding: 20px;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          width: 280px;
        }
        #${PANEL_ID} .ep-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        #${PANEL_ID} .ep-title {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.5px;
          text-transform: uppercase;
        }
        #${PANEL_ID} .ep-section {
          margin-bottom: 15px;
        }
        #${PANEL_ID} .ep-section-title {
          font-size: 10px;
          color: #666;
          margin-bottom: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        #${PANEL_ID} .ep-divider {
          border-bottom: 1px solid #000;
          margin: 15px 0;
        }
        #${PANEL_ID} button:not(.ep-close) {
          width: 100%;
          padding: 12px;
          margin-bottom: 10px;
          border: 1px solid #000;
          background: #fff;
          color: #000;
          border-radius: 0;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.15s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
        }
        #${PANEL_ID} button:not(.ep-close):hover {
          background: #000;
          color: #fff;
        }
        #${PANEL_ID} .ep-close {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          padding: 0;
          color: #000;
        }
        #${PANEL_ID} .ep-status {
          font-size: 12px;
          margin-top: 12px;
          padding: 8px;
          text-align: center;
        }
        #${PANEL_ID} .ep-status.success { background: #d4edda; color: #155724; }
        #${PANEL_ID} .ep-status.error { background: #f8d7da; color: #721c24; }
        #${PANEL_ID} .ep-status.info { color: #666; }
        #${PANEL_ID}-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.4);
          z-index: 999998;
        }
      </style>
      <div class="ep-header">
        <span class="ep-title">EXPORTER</span>
        <button class="ep-close">✕</button>
      </div>
      <div class="ep-section">
        <div class="ep-section-title">QUICK EXPORT</div>
        <button data-action="markdown">EXPORT MARKDOWN</button>
        <button data-action="json">EXPORT JSON</button>
        <button data-action="pdf">EXPORT PDF</button>
        <button data-action="original">PRINT ORIGINAL VIEW</button>
      </div>
      <div class="ep-divider"></div>
      <div class="ep-section">
        <div class="ep-section-title">SAVE TO LIBRARY</div>
        <button data-action="save">💾 SAVE TO HISTORY</button>
      </div>
      <div class="ep-status" style="display:none;"></div>
    `;
    
    const backdrop = document.createElement('div');
    backdrop.id = `${PANEL_ID}-backdrop`;
    
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
    
    // Event handlers
    const closePanel = () => {
      panel.remove();
      backdrop.remove();
    };
    
    backdrop.addEventListener('click', closePanel);
    panel.querySelector('.ep-close').addEventListener('click', closePanel);
    
    const statusEl = panel.querySelector('.ep-status');
    const showStatus = (msg, type) => {
      statusEl.textContent = msg;
      statusEl.className = `ep-status ${type}`;
      statusEl.style.display = 'block';
    };
    
    const downloadFile = (filename, content, mimeType) => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    const openPrintDocument = (filename, content) => {
      const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (!printWindow) {
        URL.revokeObjectURL(url);
        downloadFile(filename, content, 'text/html;charset=utf-8');
        return false;
      }
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return true;
    };
    
    panel.querySelector('[data-action="markdown"]').addEventListener('click', () => {
      const result = window.exportChatToMarkdown();
      if (result) {
        downloadFile(result.filename, result.content, 'text/markdown');
        showStatus(`✓ Exported ${result.count} messages`, 'success');
        setTimeout(closePanel, 1500);
      } else {
        showStatus('Failed to capture chat data', 'error');
      }
    });
    
    panel.querySelector('[data-action="json"]').addEventListener('click', () => {
      const result = window.exportChatToJSON();
      if (result) {
        downloadFile(result.filename, result.content, 'application/json');
        showStatus(`✓ Exported as JSON`, 'success');
        setTimeout(closePanel, 1500);
      } else {
        showStatus('Failed to capture chat data', 'error');
      }
    });

    panel.querySelector('[data-action="pdf"]').addEventListener('click', () => {
      const result = window.exportChatToPrintableHTML();
      if (result) {
        const opened = openPrintDocument(result.filename, result.content);
        showStatus(opened ? '✓ Print dialog opened' : '✓ Downloaded print-ready HTML', 'success');
        setTimeout(closePanel, 1500);
      } else {
        showStatus('Failed to capture chat data', 'error');
      }
    });

    panel.querySelector('[data-action="original"]').addEventListener('click', async () => {
      showStatus('Preparing original view...', 'info');
      const result = await window.exportChatToOriginalViewHTML();
      if (result) {
        const opened = openPrintDocument(result.filename, result.content);
        showStatus(opened ? '✓ Original view print opened' : '✓ Downloaded original view HTML', 'success');
        setTimeout(closePanel, 1500);
      } else {
        showStatus('Failed to capture original view', 'error');
      }
    });
    
    panel.querySelector('[data-action="save"]').addEventListener('click', async () => {
      showStatus('Saving to library...', 'info');
      try {
        const result = window.exportChatToMarkdown();
        if (!result) {
          showStatus('Failed to capture chat data', 'error');
          return;
        }

        if (typeof window.saveConversation === 'function') {
          await window.saveConversation(result.data);
          await syncSavedConversationToNativeHost(result.data);
          showStatus('✓ Saved to library', 'success');
          setTimeout(closePanel, 1500);
          return;
        }

        const saveData = {
          type: 'AI_SIDEBAR_SAVE_TO_LIBRARY',
          data: result.data,
          content: result.content
        };

        // Try postMessage first (works if in sidebar iframe)
        if (window.parent !== window) {
          window.parent.postMessage(saveData, '*');
        }

        // Fallback to background queue only when storage manager is unavailable.
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          try {
            chrome.runtime.sendMessage(saveData);
          } catch (e) {
            console.log('[Exporter] runtime.sendMessage failed:', e);
          }
        }

        showStatus('✓ Saved to library', 'success');
        setTimeout(closePanel, 1500);
      } catch (err) {
        showStatus(`Error: ${err.message}`, 'error');
      }
    });
    
    return panel;
  };
  
  // Listen for Cmd+S (Mac) / Ctrl+S (Windows) - keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      e.stopPropagation();
      shortcutSaveToggleExportPanel();
    }
  }, true);

  const showExportPanel = () => {
    if (!document.getElementById(PANEL_ID)) {
      createExportPanel();
    }
  };

  const toggleExportPanel = () => {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      existing.remove();
      document.getElementById(`${PANEL_ID}-backdrop`)?.remove();
    } else {
      createExportPanel();
    }
  };

  let shortcutToggleAt = 0;

  async function saveCurrentConversationFromShortcut() {
    const panel = document.getElementById(PANEL_ID);
    const statusEl = panel?.querySelector('.ep-status');
    const setStatus = (message, type = 'info') => {
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.className = `ep-status ${type}`;
    };

    setStatus('Saving to history...', 'info');

    try {
      const result = window.exportChatToMarkdown();
      if (!result?.data) {
        setStatus('Failed to capture chat data', 'error');
        return;
      }

      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'AI_SIDEBAR_SAVE_TO_LIBRARY_RESPONSE',
          data: result.data,
          content: result.content,
          meta: { shortcut: true }
        }, '*');
        setStatus('Saving to history...', 'info');
        return;
      }

      if (typeof autoSaveCurrentConversation === 'function') {
        const saved = await autoSaveCurrentConversation(true);
        if (saved?.ok) {
          setStatus('✓ Saved to history & folder', 'success');
          return;
        }
      }

      if (typeof window.saveConversation === 'function') {
        await window.saveConversation(result.data);
        const mirrored = await syncSavedConversationToNativeHost(result.data);
        setStatus(mirrored ? '✓ Saved to history & folder' : '✓ Saved to history; folder sync pending', 'success');
        return;
      }

      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        await chrome.runtime.sendMessage({
          type: 'AI_SIDEBAR_SAVE_TO_LIBRARY',
          data: result.data,
          content: result.content
        });
        setStatus('✓ Save queued', 'success');
        return;
      }

      setStatus('Storage not available', 'error');
    } catch (error) {
      setStatus(`Error: ${error.message}`, 'error');
    }
  }

  async function shortcutSaveToggleExportPanel() {
    const now = Date.now();
    if (now - shortcutToggleAt < 1000) return;
    shortcutToggleAt = now;

    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      existing.remove();
      document.getElementById(`${PANEL_ID}-backdrop`)?.remove();
      return;
    }

    createExportPanel();
    await saveCurrentConversationFromShortcut();
  }

  if (window.top === window) {
    pageAutoSaveState.href = window.location.href;
    pageAutoSaveState.title = document.title;
    schedulePageAutoSave(2500);

    const observer = new MutationObserver(() => {
      schedulePageAutoSave(AUTO_SAVE_MUTATION_DEBOUNCE_MS);
    });

    const startObserving = () => {
      if (!document.body) return false;
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
      return true;
    };

    if (!startObserving()) {
      document.addEventListener('DOMContentLoaded', () => {
        startObserving();
      }, { once: true });
    }

    setInterval(() => {
      autoSaveCurrentConversation().catch((error) => {
        console.warn('[Exporter] page auto-save interval failed:', error);
      });
    }, AUTO_SAVE_INTERVAL_MS);
  }

  // Listen for command from background script
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'AISB_SHOW_EXPORT_PANEL') {
        if (window.top !== window && !document.hasFocus()) return;
        showExportPanel();
      }
      if (msg.type === 'AISB_SHORTCUT_SAVE_TOGGLE_EXPORT_PANEL') {
        if (window.top !== window && !document.hasFocus()) return;
        shortcutSaveToggleExportPanel();
      }
    });
  }

})();
