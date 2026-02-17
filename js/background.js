// 优化的DNR规则配置 - 减少冗余
const DNR_CONFIG = {
  // 通用的响应头移除配置
  commonHeaders: [
    { "header": "content-security-policy", "operation": "remove" },
    { "header": "content-security-policy-report-only", "operation": "remove" },
    { "header": "x-frame-options", "operation": "remove" },
    { "header": "cross-origin-opener-policy", "operation": "remove" },
    { "header": "cross-origin-embedder-policy", "operation": "remove" },
    { "header": "cross-origin-resource-policy", "operation": "remove" },
    { "header": "permissions-policy", "operation": "remove" }
  ],
  
  // 需要DNR规则的域名列表
  domains: [
    "https://chatgpt.com/*",
    "https://*.perplexity.ai/*", 
    "https://www.perplexity.ai/*",
    "https://perplexity.ai/*",
    "https://*.genspark.ai/*",
    "https://*.tongyi.com/*",
    "https://*.doubao.com/*",
    "https://gemini.google.com/*",
    "https://accounts.google.com/*",
    "https://aistudio.google.com/*",
    "https://claude.ai/*",
    "https://notebooklm.google.com/*",
    "https://chat.deepseek.com/*",
    "https://ima.qq.com/*",
    "https://*.ptlogin2.qq.com/*",
    "https://www.google.com/*",
    "https://mubu.com/*",
    "https://*.mubu.com/*",
    "https://excalidraw.com/*",
    "https://tobooks.netlify.app/*"
  ]
};

// 生成DNR规则的工厂函数
function createDnrRules() {
  return DNR_CONFIG.domains.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: DNR_CONFIG.commonHeaders
    },
    condition: {
      urlFilter: domain,
      resourceTypes: ["main_frame", "sub_frame"]
    }
  }));
}

// 应用DNR规则
function applyBaseDnrRules() {
  const rules = createDnrRules();
  const ruleIds = rules.map(rule => rule.id);
  
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules,
    removeRuleIds: ruleIds
  });
}

chrome.runtime.onInstalled.addListener(() => {
  applyBaseDnrRules();
  try { setupContextMenus(); } catch (_) {}
});

chrome.runtime.onStartup.addListener(() => {
  applyBaseDnrRules();
  try { setupContextMenus(); } catch (_) {}
});

// Also apply immediately when the service worker (re)starts
applyBaseDnrRules();
try { setupContextMenus(); } catch (_) {}

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error))

// ---- Persist Perplexity cookies across browser restarts (best-effort) ----
const PERSIST_COOKIE_DOMAINS = [
  'perplexity.ai',
  '.perplexity.ai',
  'www.perplexity.ai'
];

async function backupPerplexityCookies() {
  try {
    const all = [];
    for (const pattern of ['https://perplexity.ai', 'https://www.perplexity.ai']) {
      const list = await chrome.cookies.getAll({ url: pattern });
      for (const c of list) {
        if (!PERSIST_COOKIE_DOMAINS.some(d => c.domain === d || c.domain.endsWith(d))) continue;
        all.push({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          sameSite: c.sameSite,
          expirationDate: c.expirationDate,
          storeId: c.storeId,
          // partitionKey may exist in newer Chrome versions
          partitionKey: c.partitionKey
        });
      }
    }
    await chrome.storage.local.set({ perplexityCookieBackup: all });
  } catch (e) {
    console.warn('backupPerplexityCookies failed', e);
  }
}

async function restorePerplexityCookies() {
  try {
    const { perplexityCookieBackup } = await chrome.storage.local.get(['perplexityCookieBackup']);
    const arr = Array.isArray(perplexityCookieBackup) ? perplexityCookieBackup : [];
    for (const c of arr) {
      try {
        const urlBase = (c.domain && c.domain.includes('perplexity.ai')) ? 'https://www.perplexity.ai' : 'https://perplexity.ai';
        const details = {
          url: urlBase,
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path || '/',
          secure: !!c.secure,
          httpOnly: !!c.httpOnly,
          sameSite: c.sameSite || 'no_restriction',
          storeId: c.storeId
        };
        if (typeof c.expirationDate === 'number') details.expirationDate = c.expirationDate;
        // If partitionKey is present, pass it back (Chrome 118+)
        if (c.partitionKey) details.partitionKey = c.partitionKey;
        await chrome.cookies.set(details);
      } catch (e) {
        console.warn('restore cookie failed', c?.name, e);
      }
    }
  } catch (e) {
    console.warn('restorePerplexityCookies failed', e);
  }
}

// On startup, try to restore saved cookies so the first load has a session
chrome.runtime.onStartup.addListener(() => {
  restorePerplexityCookies();
});

// When cookies change for perplexity, back them up
chrome.cookies.onChanged.addListener((change) => {
  try {
    const c = change.cookie;
    if (!c) return;
    if (!PERSIST_COOKIE_DOMAINS.some(d => c.domain === d || c.domain.endsWith(d))) return;
    // debounce a bit
    clearTimeout(backupPerplexityCookies._t);
    backupPerplexityCookies._t = setTimeout(backupPerplexityCookies, 300);
  } catch (_) {}
});

// Handle adding DNR rules for custom hosts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg && msg.type === 'ai-add-host' && typeof msg.origin === 'string') {
        const origin = msg.origin.replace(/\/$/, '');
        const storage = await chrome.storage.local.get(['aiDnrRules']);
        const rulesMap = storage.aiDnrRules || {}; // { origin: ruleId }
        // Find existing dynamic rules to avoid duplicate IDs and duplicates by urlFilter
        const existing = await chrome.declarativeNetRequest.getDynamicRules();
        const existForOrigin = existing.find(r => r?.condition?.urlFilter === origin + '/*');
        if (existForOrigin) {
          // persist in storage for future lookups
          rulesMap[origin] = existForOrigin.id;
          await chrome.storage.local.set({ aiDnrRules: rulesMap });
          sendResponse({ ok: true, ruleId: existForOrigin.id, existed: true });
          return;
        }
        // allocate a new rule id (avoid collision with built-ins 1..999 and dynamic ones)
        const used = new Set([...Object.values(rulesMap), ...existing.map(r => r.id)]);
        let next = 1000;
        while (used.has(next)) next++;
        const rule = {
          id: next,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            responseHeaders: [
              { header: 'content-security-policy', operation: 'remove' },
              { header: 'content-security-policy-report-only', operation: 'remove' },
              { header: 'x-frame-options', operation: 'remove' },
              { header: 'cross-origin-opener-policy', operation: 'remove' },
              { header: 'cross-origin-embedder-policy', operation: 'remove' },
              { header: 'cross-origin-resource-policy', operation: 'remove' },
              { header: 'permissions-policy', operation: 'remove' }
            ]
          },
          condition: {
            urlFilter: origin + '/*',
            resourceTypes: ['main_frame', 'sub_frame']
          }
        };
        await chrome.declarativeNetRequest.updateDynamicRules({ addRules: [rule], removeRuleIds: [] });
        rulesMap[origin] = next;
        await chrome.storage.local.set({ aiDnrRules: rulesMap });
        sendResponse({ ok: true, ruleId: next });
        return;
      }
      if (msg && msg.type === 'ai-remove-host' && typeof msg.origin === 'string') {
        const origin = msg.origin.replace(/\/$/, '');
        const storage = await chrome.storage.local.get(['aiDnrRules']);
        const rulesMap = storage.aiDnrRules || {};
        const id = rulesMap[origin];
        if (id) {
          await chrome.declarativeNetRequest.updateDynamicRules({ addRules: [], removeRuleIds: [id] });
          delete rulesMap[origin];
          await chrome.storage.local.set({ aiDnrRules: rulesMap });
          sendResponse({ ok: true, removed: true });
          return;
        }
        sendResponse({ ok: true, removed: false });
        return;
      }
    } catch (e) {
      console.error('ai-add-host failed:', e);
      sendResponse({ ok: false, error: String(e) });
      return;
    }
    
    // Forward save to library request to sidebar via storage
    if (msg && msg.type === 'AI_SIDEBAR_SAVE_TO_LIBRARY') {
      try {
        // Store in chrome.storage.local for sidebar to pick up
        const saveQueue = (await chrome.storage.local.get(['__saveQueue'])).__saveQueue || [];
        saveQueue.push({
          data: msg.data,
          content: msg.content,
          timestamp: Date.now()
        });
        await chrome.storage.local.set({ __saveQueue: saveQueue });
        console.log('[AI Sidebar BG] Queued conversation for sidebar');
        sendResponse({ ok: true });
        return;
      } catch (e) {
        console.error('[AI Sidebar BG] Save queue error:', e);
        sendResponse({ ok: false, error: String(e) });
        return;
      }
    }

    // Fetch image binary via service worker (用于跨域图片下载/导出)
    if (msg && msg.type === 'gv.fetchImage' && typeof msg.url === 'string') {
      try {
        const response = await fetch(msg.url, {
          credentials: 'omit',
          cache: 'no-cache'
        });

        if (!response.ok) {
          sendResponse({ ok: false, error: `HTTP ${response.status}` });
          return;
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode(...chunk);
        }
        const base64 = btoa(binary);

        sendResponse({
          ok: true,
          base64,
          contentType
        });
        return;
      } catch (e) {
        console.error('[AI Sidebar BG] gv.fetchImage error:', e);
        sendResponse({ ok: false, error: String(e) });
        return;
      }
    }
    
    // default
    sendResponse({ ok: false });
  })();
  return true; // keep channel open for async sendResponse
});

// ---------------- Selection to AI + Screenshot shortcuts ----------------
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

function originFromUrl(u) {
  try { return new URL(u).origin + '/*'; } catch (_) { return null; }
}

async function ensureHostPermissionFor(url) {
  try {
    const origin = originFromUrl(url);
    if (!origin) return false;
    const has = await chrome.permissions.contains({ origins: [origin] });
    if (has) return true;
    // Request runtime optional host permission for this origin
    const ok = await chrome.permissions.request({ origins: [origin] });
    return !!ok;
  } catch (e) {
    console.warn('ensureHostPermissionFor failed', e);
    return false;
  }
}

async function readSelectionFromTab(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        try {
          // Return plain text selection and a best-effort HTML snippet
          const sel = window.getSelection && window.getSelection();
          const text = sel ? String(sel.toString() || '') : '';
          let html = '';
          try {
            if (sel && sel.rangeCount) {
              const range = sel.getRangeAt(0).cloneContents();
              const div = document.createElement('div');
              div.appendChild(range);
              html = div.innerHTML;
            }
          } catch (_) {}
          return { ok: true, text, html };
        } catch (e) {
          return { ok: false, error: String(e) };
        }
      }
    });
    // Pick the longest non-empty selection among frames
    let best = { text: '', html: '' };
    for (const r of results || []) {
      const v = r && r.result;
      if (v && v.ok && typeof v.text === 'string') {
        const t = v.text.trim();
        if (t && t.length > best.text.length) best = { text: t, html: String(v.html || '') };
      }
    }
    return best;
  } catch (e) {
    console.warn('readSelectionFromTab failed', e);
    return { text: '', html: '' };
  }
}

async function openSidePanelForCurrentWindow() {
  try {
    const win = await chrome.windows.getCurrent();
    if (win && typeof chrome.sidePanel.open === 'function') {
      await chrome.sidePanel.open({ windowId: win.id });
    }
  } catch (e) {
    // non-fatal
  }
}

async function deliverToSidePanel(message, fallbackKey) {
  try {
    // Send directly; if no listener, keep a pending payload in storage
    let responded = false;
    try {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage(message, () => {
          responded = true;
          resolve();
        });
      });
    } catch (_) {}
    if (!responded && fallbackKey) {
      const obj = {}; obj[fallbackKey] = message;
      await chrome.storage.local.set(obj);
    }
  } catch (e) {
    console.warn('deliverToSidePanel failed', e);
  }
}

async function handleSendSelection() {
  const tab = await getActiveTab();
  if (!tab || !tab.id || !tab.url) return;
  // 尝试直接读取（依赖 activeTab 临时授权），失败时给出回退提示
  let text = '', html = '';
  try {
    const res = await readSelectionFromTab(tab.id);
    text = res.text || '';
    html = res.html || '';
  } catch (e) {
    // ignore
  }
  await openSidePanelForCurrentWindow();
  // give the panel a brief moment to mount listeners
  try { await new Promise(r=> setTimeout(r, 80)); } catch(_) {}
  if (!text) {
    // 若左侧活动页没有选区，尝试让右侧面板主动从其当前 iframe 读取选区
    await deliverToSidePanel({ type: 'aisb.request-frame-selection' }, null);
    await deliverToSidePanel({ type: 'aisb.focus-only' }, null);
  } else {
    const payload = {
      type: 'aisb.insert-text',
      text,
      html,
      tabId: tab.id,
      tabTitle: tab.title || '',
      tabUrl: tab.url || ''
    };
    await deliverToSidePanel(payload, 'aisbPendingInsert');
  }
  // 无论是否读取到选区，均安装临时键入代理
  try { await installTypingRelay(tab.id); } catch (_) {}
}

async function handleCaptureScreenshot() {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
    if (!dataUrl) return;
    const tab = await getActiveTab();
    const payload = {
      type: 'aisb.receive-screenshot',
      dataUrl,
      tabId: tab?.id,
      tabTitle: tab?.title || '',
      tabUrl: tab?.url || '',
      createdAt: Date.now()
    };
    await deliverToSidePanel(payload, 'aisbPendingScreenshot');
    await openSidePanelForCurrentWindow();
  } catch (e) {
    await deliverToSidePanel({ type: 'aisb.notify', level: 'error', text: '截屏失败：' + String(e) }, 'aisbPendingNotify');
    await openSidePanelForCurrentWindow();
  }
}

try {
  chrome.commands.onCommand.addListener((cmd) => {
    if (cmd === 'aisb-send-selection') {
      handleSendSelection();
    } else if (cmd === 'aisb-capture-screenshot') {
      handleCaptureScreenshot();
    } else if (cmd === 'aisb-export-chat') {
      handleExportChat();
    } else if (cmd === 'aisb-open-parallel-left') {
      handleOpenParallelLeft();
    }
  });
} catch (_) {}

async function handleExportChat() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { type: 'AISB_SHOW_EXPORT_PANEL' });
    }
  } catch (e) {
    console.error('[AI Sidebar] Export chat error:', e);
  }
}

async function handleOpenParallelLeft() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;
    
    // Check if URL is restricted
    const url = tab.url || '';
    if (url.startsWith('chrome://') || url.startsWith('edge://') || 
        url.startsWith('about:') || url.startsWith('chrome-extension://')) {
      console.warn('[AI Sidebar] Cannot open parallel panel on restricted page');
      return;
    }
    
    // Get current provider from storage
    let currentProvider = 'chatgpt';
    try {
      const result = await chrome.storage.local.get(['currentProvider']);
      if (result.currentProvider) currentProvider = result.currentProvider;
    } catch (_) {}
    
    // Try to send message to content script, inject if needed
    try {
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'toggleParallelPanel',
        provider: currentProvider 
      });
    } catch (_) {
      // Content script not loaded, inject it first
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/parallel-panel.js']
        });
        // Wait a bit for script to initialize
        await new Promise(r => setTimeout(r, 100));
        await chrome.tabs.sendMessage(tab.id, { 
          action: 'toggleParallelPanel',
          provider: currentProvider 
        });
      } catch (e) {
        console.error('[AI Sidebar] Failed to inject parallel panel:', e);
      }
    }
  } catch (e) {
    console.error('[AI Sidebar] Open parallel left error:', e);
  }
}

// Temporarily relay typing from the page to the side panel input
async function installTypingRelay(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        try {
          if (window.__AISB_TYPE_PROXY && window.__AISB_TYPE_PROXY.stop) {
            window.__AISB_TYPE_PROXY.stop();
          }
          const relay = {};
          let timer = null;
          const TTL = 2500; // ms after last key
          const send = (payload) => {
            try { chrome.runtime.sendMessage({ type: 'aisb.type-proxy', payload }); } catch (_) {}
          };
          const prolong = () => {
            clearTimeout(timer);
            timer = setTimeout(() => relay.stop(), TTL);
          };
          const onKeyDown = (e) => {
            try {
              const k = e.key;
              const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

              // Always handle Enter/Backspace even if Cmd/Ctrl is still held
              // (accounts for sticky meta right after the shortcut)
              if (k === 'Backspace') {
                e.preventDefault(); e.stopPropagation();
                send({ kind: 'backspace' });
                prolong();
                return;
              }
              if (k === 'Enter') {
                e.preventDefault(); e.stopPropagation();
                // Cmd/Ctrl+Enter -> submit；否则换行
                send({ kind: (hasModifier ? 'submit' : 'newline') });
                prolong();
                return;
              }

              // For other keys, allow system/site shortcuts to pass through
              if (hasModifier) return;

              if (k && k.length === 1) {
                // Printable
                e.preventDefault(); e.stopPropagation();
                send({ kind: 'text', text: k });
                prolong();
              }
            } catch (_) {}
          };
          const onPaste = (e) => {
            try {
              const dt = e.clipboardData || window.clipboardData;
              if (!dt) return;
              const t = dt.getData('text');
              if (t) {
                e.preventDefault(); e.stopPropagation();
                send({ kind: 'text', text: t });
                prolong();
              }
            } catch (_) {}
          };
          document.addEventListener('keydown', onKeyDown, true);
          document.addEventListener('paste', onPaste, true);
          relay.stop = () => {
            try { document.removeEventListener('keydown', onKeyDown, true); } catch (_) {}
            try { document.removeEventListener('paste', onPaste, true); } catch (_) {}
            clearTimeout(timer);
          };
          window.__AISB_TYPE_PROXY = relay;
          prolong();
        } catch (_) {}
      }
    });
  } catch (_) {
    // ignore
  }
}

// ---------------- Context Menu (no extra host permission needed) ----------------
function setupContextMenus() {
  try {
    chrome.contextMenus.removeAll(() => {
      try {
        chrome.contextMenus.create({
          id: 'aisb-send-selection',
          title: '发送选中文本到侧边栏',
          contexts: ['selection']
        });
      } catch (_) {}
    });
  } catch (_) {}
  try {
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      try {
        if (info.menuItemId !== 'aisb-send-selection') return;
        const text = String(info.selectionText || '').trim();
        if (!text) {
          await deliverToSidePanel({ type: 'aisb.notify', level: 'info', text: '未检测到文字选中内容。' }, 'aisbPendingNotify');
          await openSidePanelForCurrentWindow();
          return;
        }
        const payload = {
          type: 'aisb.insert-text',
          text,
          html: '',
          tabId: tab?.id,
          tabTitle: tab?.title || '',
          tabUrl: tab?.url || ''
        };
        await deliverToSidePanel(payload, 'aisbPendingInsert');
        await openSidePanelForCurrentWindow();
      } catch (e) {
        console.warn('contextMenus onClicked failed', e);
      }
    });
  } catch (_) {}
}

 
