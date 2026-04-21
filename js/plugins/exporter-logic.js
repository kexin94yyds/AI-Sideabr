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
