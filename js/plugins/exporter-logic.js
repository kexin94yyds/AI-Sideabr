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
        default:
          return '';
      }
    } catch (error) {
      console.error('[AI Chat Exporter] Failed to extract conversation ID:', error);
      return '';
    }
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
      const selectors = ['nav .bg-token-surface-active', '.ds-sidebar-item--active', '.selected[data-test-id="conversation"]', 'h1', 'title'];
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el?.innerText.trim()) return el.innerText.trim().split('\n')[0];
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

    // 5. Deduplicate & Return
    const final = [];
    const seen = new Set();
    messages.forEach(m => {
      const key = `${m.role}:${m.content.substring(0, 100)}`;
      if (!seen.has(key)) { final.push(m); seen.add(key); }
    });

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
  window.addEventListener('message', async (event) => {
    const data = event.data || {};
    
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
          content: result.content
        }, '*');
      } catch (err) {
        window.parent.postMessage({
          type: 'AI_SIDEBAR_SAVE_TO_LIBRARY_RESPONSE',
          error: err.message
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
        
        const saveData = {
          type: 'AI_SIDEBAR_SAVE_TO_LIBRARY',
          data: result.data,
          content: result.content
        };
        
        // Try postMessage first (works if in sidebar iframe)
        if (window.parent !== window) {
          window.parent.postMessage(saveData, '*');
        }
        
        // Also send via chrome.runtime for standalone page usage
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          try {
            chrome.runtime.sendMessage(saveData);
          } catch (e) {
            console.log('[Exporter] runtime.sendMessage failed:', e);
          }
        }
        
        showStatus(`✓ Saved to library`, 'success');
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
      toggleExportPanel();
    }
  }, true);

  const toggleExportPanel = () => {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      existing.remove();
      document.getElementById(`${PANEL_ID}-backdrop`)?.remove();
    } else {
      createExportPanel();
    }
  };

  // Listen for command from background script
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'AISB_SHOW_EXPORT_PANEL') {
        toggleExportPanel();
      }
    });
  }

})();

