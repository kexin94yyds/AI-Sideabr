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
    "https://www.genspark.ai/*",
    "https://genspark.ai/*",
    "https://*.tongyi.com/*",
    "https://www.tongyi.com/*",
    "https://tongyi.com/*",
    "https://*.doubao.com/*",
    "https://www.doubao.com/*",
    "https://doubao.com/*",
    "https://gemini.google.com/*",
    "https://accounts.google.com/*",
    "https://www.google.com/*",
    "https://aistudio.google.com/*",
    "https://claude.ai/*",
    "https://notebooklm.google.com/*",
    "https://chat.deepseek.com/*",
    "https://*.deepseek.com/*",
    "https://deepseek.com/*",
    "https://ima.qq.com/*",
    "https://*.ptlogin2.qq.com/*",
    "https://ssl.ptlogin2.qq.com/*",
    "https://xui.ptlogin2.qq.com/*",
    "https://grok.com/*",
    "https://x.com/*",
    "https://*.x.com/*",
    "https://mubu.com/*",
    "https://*.mubu.com/*",
    "https://excalidraw.com/*",
    "https://tobooks.xin/*",
    "https://kimi.moonshot.cn/*",
    "https://*.moonshot.cn/*",
    "https://v0.dev/*",
    "https://*.v0.dev/*",
    "https://vercel.com/*",
    "https://*.vercel.com/*",
    "https://copilot.microsoft.com/*",
    "https://*.microsoft.com/*",
    "https://github.com/*",
    "https://*.github.com/*",
    "https://chat.mistral.ai/*",
    "https://*.mistral.ai/*",
    "https://coral.cohere.com/*",
    "https://*.cohere.com/*",
    "https://huggingface.co/*",
    "https://*.huggingface.co/*",
    "https://www.meta.ai/*",
    "https://meta.ai/*",
    "https://chatglm.cn/*",
    "https://*.chatglm.cn/*",
    "https://hailuoai.com/*",
    "https://*.hailuoai.com/*"
  ]
};

const NATIVE_HOST_NAME = 'com.aisidebar.bridge';
const CUSTOM_DNR_RULE_ID_MIN = 1000;
const PARALLEL_SESSION_RULE_ID_MIN = 1000000;
let lastShortcutTarget = { surface: '', tabId: null, at: 0 };
const AISB_AUTOSAVE_DEBUG = true;
let saveQueueMutation = Promise.resolve();
let dnrMutation = Promise.resolve();

function aisbAutosaveDebug(scope, payload = {}) {
  if (!AISB_AUTOSAVE_DEBUG) return;
  try {
    console.info('[AISB autosave debug]', scope, payload);
  } catch (_) {}
}

function aisbConversationSummary(conversation) {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  return {
    provider: String(conversation?.provider || ''),
    title: String(conversation?.title || ''),
    url: String(conversation?.url || ''),
    conversationIdPresent: Boolean(String(conversation?.conversationId || '').trim()),
    messageCount: Number(conversation?.messageCount || messages.length || 0),
    lastRole: String(messages[messages.length - 1]?.role || ''),
    lastContentLength: String(messages[messages.length - 1]?.content || '').length
  };
}

function createHeaderRemovalRule(id, urlFilter, extraCondition = {}) {
  return {
    id,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: DNR_CONFIG.commonHeaders
    },
    condition: {
      urlFilter,
      initiatorDomains: [chrome.runtime.id],
      resourceTypes: ["sub_frame"],
      ...extraCondition
    }
  };
}

// 生成仅由扩展页面发起的基础 DNR 规则。
function createDnrRules() {
  return DNR_CONFIG.domains.map((domain, index) => createHeaderRemovalRule(index + 1, domain));
}

function serializeDnrMutation(mutator) {
  const operation = dnrMutation.then(mutator);
  dnrMutation = operation.then(() => undefined, () => undefined);
  return operation;
}

function normalizeHttpOrigin(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.origin;
  } catch (_) {
    return '';
  }
}

function isOwnedCustomDnrRule(rule) {
  if (!Number.isInteger(rule?.id) || rule.id < CUSTOM_DNR_RULE_ID_MIN || rule.id >= PARALLEL_SESSION_RULE_ID_MIN) {
    return false;
  }
  if (rule?.action?.type !== 'modifyHeaders' || typeof rule?.condition?.urlFilter !== 'string') return false;
  return (rule.action.responseHeaders || []).some((header) => (
    String(header?.header || '').toLowerCase() === 'x-frame-options' && header?.operation === 'remove'
  ));
}

function getOriginFromCustomRule(rule) {
  const filter = String(rule?.condition?.urlFilter || '');
  return filter.endsWith('/*') ? normalizeHttpOrigin(filter.slice(0, -2)) : '';
}

async function applyPersistentDnrRules() {
  const baseRules = createDnrRules();
  const baseRuleIds = baseRules.map((rule) => rule.id);
  const [stored, existing] = await Promise.all([
    chrome.storage.local.get(['aiDnrRules']),
    chrome.declarativeNetRequest.getDynamicRules()
  ]);
  const storedMap = stored.aiDnrRules && typeof stored.aiDnrRules === 'object'
    ? stored.aiDnrRules
    : {};
  const ownedExisting = existing.filter(isOwnedCustomDnrRule);
  const candidates = new Map();

  for (const [rawOrigin, rawId] of Object.entries(storedMap)) {
    const origin = normalizeHttpOrigin(rawOrigin);
    const id = Number(rawId);
    if (origin && Number.isInteger(id) && id >= CUSTOM_DNR_RULE_ID_MIN && id < PARALLEL_SESSION_RULE_ID_MIN) {
      candidates.set(origin, id);
    }
  }
  for (const rule of ownedExisting) {
    const origin = getOriginFromCustomRule(rule);
    if (origin && !candidates.has(origin)) candidates.set(origin, rule.id);
  }

  const removedCustomIds = new Set([
    ...ownedExisting.map((rule) => rule.id),
    ...Object.values(storedMap)
      .map(Number)
      .filter((id) => Number.isInteger(id) && id >= CUSTOM_DNR_RULE_ID_MIN && id < PARALLEL_SESSION_RULE_ID_MIN)
  ]);
  const reservedIds = new Set(
    existing
      .filter((rule) => !baseRuleIds.includes(rule.id) && !removedCustomIds.has(rule.id))
      .map((rule) => rule.id)
  );
  for (const id of baseRuleIds) reservedIds.add(id);

  let nextId = CUSTOM_DNR_RULE_ID_MIN;
  const customRules = [];
  const nextMap = {};
  for (const [origin, preferredId] of candidates) {
    let id = preferredId;
    if (reservedIds.has(id)) {
      while (reservedIds.has(nextId)) nextId += 1;
      id = nextId;
      nextId += 1;
    }
    reservedIds.add(id);
    nextMap[origin] = id;
    customRules.push(createHeaderRemovalRule(id, `${origin}/*`));
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [...baseRules, ...customRules],
    removeRuleIds: [...new Set([...baseRuleIds, ...removedCustomIds])]
  });
  await chrome.storage.local.set({ aiDnrRules: nextMap });
}

function refreshPersistentDnrRules() {
  void serializeDnrMutation(applyPersistentDnrRules).catch((error) => {
    console.error('Failed to apply scoped DNR rules:', error);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  refreshPersistentDnrRules();
  try { setupContextMenus(); } catch (_) {}
});

chrome.runtime.onStartup.addListener(() => {
  refreshPersistentDnrRules();
  try { setupContextMenus(); } catch (_) {}
});

// Also apply immediately when the service worker (re)starts
refreshPersistentDnrRules();
try { setupContextMenus(); } catch (_) {}

function createSaveQueueId() {
  try {
    return crypto.randomUUID();
  } catch (_) {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function normalizeSaveQueueItem(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    ...item,
    queueId: String(item.queueId || createSaveQueueId())
  };
}

function mutateSaveQueue(mutator) {
  const operation = saveQueueMutation.then(async () => {
    const stored = await chrome.storage.local.get(['__saveQueue']);
    const current = Array.isArray(stored.__saveQueue)
      ? stored.__saveQueue.map(normalizeSaveQueueItem).filter(Boolean)
      : [];
    const next = await mutator(current);
    const normalized = Array.isArray(next) ? next.map(normalizeSaveQueueItem).filter(Boolean) : [];
    await chrome.storage.local.set({ __saveQueue: normalized });
    return normalized;
  });

  saveQueueMutation = operation.then(() => undefined, () => undefined);
  return operation;
}

function isExtensionPageSender(sender) {
  const senderUrl = String(sender?.url || sender?.documentUrl || '');
  return senderUrl.startsWith(chrome.runtime.getURL(''));
}

function getParallelInitiatorDomain(tabUrl) {
  const origin = normalizeHttpOrigin(tabUrl);
  if (!origin) return '';
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch (_) {
    return '';
  }
}

function isParallelSessionRule(rule) {
  return Number.isInteger(rule?.id) && rule.id >= PARALLEL_SESSION_RULE_ID_MIN;
}

async function setParallelEmbedRules(tabId, tabUrl, enabled) {
  return serializeDnrMutation(async () => {
    const sessionRules = await chrome.declarativeNetRequest.getSessionRules();
    const removeRuleIds = sessionRules
      .filter((rule) => isParallelSessionRule(rule) && rule.condition?.tabIds?.includes(tabId))
      .map((rule) => rule.id);

    if (!enabled) {
      if (removeRuleIds.length > 0) {
        await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds, addRules: [] });
      }
      return 0;
    }

    const initiatorDomain = getParallelInitiatorDomain(tabUrl);
    if (!initiatorDomain) throw new Error('Parallel embed requires an HTTP(S) tab');

    const dynamicRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removedIds = new Set(removeRuleIds);
    const usedIds = new Set([
      ...dynamicRules.map((rule) => rule.id),
      ...sessionRules.filter((rule) => !removedIds.has(rule.id)).map((rule) => rule.id)
    ]);
    let nextId = PARALLEL_SESSION_RULE_ID_MIN;
    const addRules = DNR_CONFIG.domains.map((urlFilter) => {
      while (usedIds.has(nextId)) nextId += 1;
      const id = nextId;
      usedIds.add(id);
      nextId += 1;
      return createHeaderRemovalRule(id, urlFilter, {
        initiatorDomains: [initiatorDomain],
        tabIds: [tabId]
      });
    });

    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds, addRules });
    return addRules.length;
  });
}

function clearParallelEmbedRules(tabId) {
  void setParallelEmbedRules(tabId, '', false).catch((error) => {
    console.warn('Failed to clear parallel-panel DNR rules:', error);
  });
}

try {
  chrome.tabs.onRemoved.addListener((tabId) => clearParallelEmbedRules(tabId));
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') clearParallelEmbedRules(tabId);
  });
} catch (_) {}

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
      if (msg && msg.type === 'AISB_SHORTCUT_TARGET') {
        const surface = String(msg.surface || '');
        if (surface !== 'page' && surface !== 'sidepanel') {
          sendResponse({ ok: false, error: 'invalid_surface' });
          return;
        }
        if (surface === 'page' && !sender?.tab?.id) {
          sendResponse({ ok: false, error: 'missing_tab' });
          return;
        }
        lastShortcutTarget = {
          surface,
          tabId: sender?.tab?.id || null,
          windowId: sender?.tab?.windowId || null,
          at: Date.now()
        };
        sendResponse({ ok: true });
        return;
      }
      if (msg && msg.type === 'AI_SIDEBAR_NATIVE_HOST_PING') {
        const result = await chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, { type: 'ping' });
        sendResponse({ ok: true, result });
        return;
      }
      if (msg && msg.type === 'AI_SIDEBAR_SYNC_CONVERSATION_NATIVE') {
        aisbAutosaveDebug('background.native_sync.start', {
          project: msg.project,
          conversation: aisbConversationSummary(msg.conversation)
        });
        const result = await chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, {
          type: 'syncConversation',
          project: msg.project,
          conversation: msg.conversation
        });
        aisbAutosaveDebug('background.native_sync.result', {
          success: result?.success,
          baseDir: result?.baseDir,
          baseDirSource: result?.baseDirSource,
          outputPath: result?.filePath || result?.path || '',
          error: result?.error || '',
          conversation: aisbConversationSummary(msg.conversation)
        });
        if (!result || result.success === false) {
          throw new Error(result?.error || 'Native host failed');
        }
        sendResponse({ ok: true, result });
        return;
      }
      if (msg && msg.type === 'AI_SIDEBAR_GET_SAVE_QUEUE') {
        if (!isExtensionPageSender(sender)) {
          sendResponse({ ok: false, error: 'forbidden' });
          return;
        }
        const queue = await mutateSaveQueue((current) => current);
        sendResponse({ ok: true, items: queue });
        return;
      }
      if (msg && msg.type === 'AI_SIDEBAR_ACK_SAVE_QUEUE_ITEMS') {
        if (!isExtensionPageSender(sender)) {
          sendResponse({ ok: false, error: 'forbidden' });
          return;
        }
        const ids = new Set(
          (Array.isArray(msg.queueIds) ? msg.queueIds : [])
            .map((value) => String(value || ''))
            .filter(Boolean)
        );
        const queue = await mutateSaveQueue((current) => current.filter((item) => !ids.has(item.queueId)));
        sendResponse({ ok: true, remaining: queue.length });
        return;
      }
      if (msg && msg.type === 'AI_SIDEBAR_SET_PARALLEL_EMBED') {
        const tabId = sender?.tab?.id;
        if (!Number.isInteger(tabId)) {
          sendResponse({ ok: false, error: 'missing_tab' });
          return;
        }
        const count = await setParallelEmbedRules(tabId, sender.tab.url || '', Boolean(msg.enabled));
        sendResponse({ ok: true, enabled: Boolean(msg.enabled), ruleCount: count });
        return;
      }
      if (msg && msg.type === 'ai-add-host' && typeof msg.origin === 'string') {
        if (!isExtensionPageSender(sender)) {
          sendResponse({ ok: false, error: 'forbidden' });
          return;
        }
        const origin = normalizeHttpOrigin(msg.origin);
        if (!origin) {
          sendResponse({ ok: false, error: 'invalid_origin' });
          return;
        }
        const result = await serializeDnrMutation(async () => {
          const storage = await chrome.storage.local.get(['aiDnrRules']);
          const rulesMap = storage.aiDnrRules && typeof storage.aiDnrRules === 'object'
            ? storage.aiDnrRules
            : {};
          const existing = await chrome.declarativeNetRequest.getDynamicRules();
          const existingForOrigin = existing.find((rule) => getOriginFromCustomRule(rule) === origin);
          const used = new Set(existing.map((rule) => rule.id));
          let id = Number(rulesMap[origin]);

          if (!Number.isInteger(id) || id < CUSTOM_DNR_RULE_ID_MIN || id >= PARALLEL_SESSION_RULE_ID_MIN) {
            id = existingForOrigin?.id;
          }
          if (!Number.isInteger(id) || (used.has(id) && existingForOrigin?.id !== id)) {
            id = CUSTOM_DNR_RULE_ID_MIN;
            while (used.has(id)) id += 1;
          }

          const removeRuleIds = existingForOrigin ? [existingForOrigin.id] : (used.has(id) ? [id] : []);
          await chrome.declarativeNetRequest.updateDynamicRules({
            addRules: [createHeaderRemovalRule(id, `${origin}/*`)],
            removeRuleIds
          });
          rulesMap[origin] = id;
          await chrome.storage.local.set({ aiDnrRules: rulesMap });
          return { id, existed: Boolean(existingForOrigin) };
        });
        sendResponse({ ok: true, ruleId: result.id, existed: result.existed });
        return;
      }
      if (msg && msg.type === 'ai-remove-host' && typeof msg.origin === 'string') {
        if (!isExtensionPageSender(sender)) {
          sendResponse({ ok: false, error: 'forbidden' });
          return;
        }
        const origin = normalizeHttpOrigin(msg.origin);
        if (!origin) {
          sendResponse({ ok: false, error: 'invalid_origin' });
          return;
        }
        const removed = await serializeDnrMutation(async () => {
          const storage = await chrome.storage.local.get(['aiDnrRules']);
          const rulesMap = storage.aiDnrRules && typeof storage.aiDnrRules === 'object'
            ? storage.aiDnrRules
            : {};
          const existing = await chrome.declarativeNetRequest.getDynamicRules();
          const ruleIds = existing
            .filter((rule) => getOriginFromCustomRule(rule) === origin)
            .map((rule) => rule.id);
          const storedId = Number(rulesMap[origin]);
          if (Number.isInteger(storedId) && storedId >= CUSTOM_DNR_RULE_ID_MIN && storedId < PARALLEL_SESSION_RULE_ID_MIN) {
            ruleIds.push(storedId);
          }
          const uniqueRuleIds = [...new Set(ruleIds)];
          if (uniqueRuleIds.length > 0) {
            await chrome.declarativeNetRequest.updateDynamicRules({ addRules: [], removeRuleIds: uniqueRuleIds });
          }
          delete rulesMap[origin];
          await chrome.storage.local.set({ aiDnrRules: rulesMap });
          return uniqueRuleIds.length > 0;
        });
        sendResponse({ ok: true, removed });
        return;
      }
    } catch (e) {
      console.error('background message failed:', e);
      sendResponse({ ok: false, error: String(e) });
      return;
    }
    
    // Forward save to library request to sidebar via storage
    if (msg && msg.type === 'AI_SIDEBAR_SAVE_TO_LIBRARY') {
      try {
        const queue = await mutateSaveQueue((current) => [
          ...current,
          {
            queueId: createSaveQueueId(),
            data: msg.data,
            content: msg.content,
            timestamp: Date.now()
          }
        ]);
        console.log('[AI Sidebar BG] Queued conversation for sidebar');
        sendResponse({ ok: true, queued: queue.length });
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
        let response = null;
        let lastError = null;
        for (const credentials of ['include', 'omit']) {
          try {
            response = await fetch(msg.url, {
              credentials,
              cache: 'no-cache'
            });
            if (response.ok) break;
          } catch (error) {
            lastError = error;
          }
        }

        if (!response || !response.ok) {
          sendResponse({ ok: false, error: response ? `HTTP ${response.status}` : String(lastError || 'fetch failed') });
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

function getRestrictedPageReason(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (value.startsWith('chrome://') || value.startsWith('edge://') || value.startsWith('about:')) {
    return '浏览器内部页面';
  }
  if (value.startsWith('chrome-extension://')) {
    return '扩展页面';
  }
  try {
    const parsed = new URL(value);
    if (parsed.hostname === 'chromewebstore.google.com') {
      return 'Chrome 应用商店页面';
    }
  } catch (_) {}
  return '';
}

async function deliverToSidePanel(message, fallbackKey) {
  try {
    // Send directly; if no listener, keep a pending payload in storage
    let responded = false;
    try {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage(message, () => {
          responded = !chrome.runtime.lastError;
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
    await ensureHostPermissionFor(tab.url);
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

async function handleCaptureScreenshot(preferredTab = null) {
  try {
    const tab = preferredTab || await getActiveTab();
    const restrictedReason = getRestrictedPageReason(tab?.url || '');
    if (restrictedReason) {
      const text = `截屏失败：当前是${restrictedReason}，Chrome 会额外限制截图权限。请切回普通网页后再试。`;
      await deliverToSidePanel({ type: 'aisb.notify', level: 'error', text }, 'aisbPendingNotify');
      await openSidePanelForCurrentWindow();
      return;
    }
    const windowId = tab?.windowId;
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
    if (!dataUrl) return;
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
    const msg = String(e || '');
    const needsPermission =
      msg.includes("Either the '<all_urls>' or 'activeTab' permission is required") ||
      /activeTab.*not in effect/i.test(msg) ||
      /has not been (in )?invoked/i.test(msg);
    const text = needsPermission
      ? '截屏失败：当前页面没有可用的截图授权。普通网页请先重载扩展并接受新权限；若是应用商店、浏览器页或扩展页，这类页面可能仍受 Chrome 限制。'
      : '截屏失败：' + msg;
    await deliverToSidePanel({ type: 'aisb.notify', level: 'error', text }, 'aisbPendingNotify');
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
    const requestSidePanelShortcut = (force = false) => new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({
          type: force ? 'AISB_SHORTCUT_SAVE_TOGGLE_SIDE_PANEL' : 'AISB_SHORTCUT_SAVE_TOGGLE_IF_FOCUSED'
        }, (response) => {
          if (chrome.runtime.lastError) {
            resolve(false);
            return;
          }
          resolve(!!response?.handled);
        });
      } catch (_) {
        resolve(false);
      }
    });

    const sendShortcutToActiveTab = async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return false;
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'AISB_SHORTCUT_SAVE_TOGGLE_EXPORT_PANEL' });
        return true;
      } catch (sendError) {
        await deliverToSidePanel({
          type: 'aisb.notify',
          level: 'warn',
          text: '当前页面没有可用的导出脚本，请切换到支持的 AI 聊天页面后再试。'
        }, 'aisbPendingNotify');
        await openSidePanelForCurrentWindow();
        return false;
      }
    };

    const recentTarget = Date.now() - Number(lastShortcutTarget.at || 0) < 8000
      ? lastShortcutTarget.surface
      : '';

    if (recentTarget === 'page') {
      if (await sendShortcutToActiveTab()) return;
    }

    if (recentTarget === 'sidepanel') {
      if (await requestSidePanelShortcut(true)) return;
    }

    if (await requestSidePanelShortcut()) return;
    await sendShortcutToActiveTab();
  } catch (e) {
    console.error('[AI Sidebar] Export chat error:', e);
  }
}

async function handleOpenParallelLeft() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;
    
    // Check if URL is restricted
    if (getRestrictedPageReason(tab.url || '')) {
      console.warn('[AI Sidebar] Cannot open parallel panel on restricted page');
      return;
    }
    
    // Get current provider from storage
    let currentProvider = 'chatgpt';
    let providerUrl = null;
    try {
      const result = await chrome.storage.local.get(['currentProvider', 'provider', 'providerUrls']);
      if (result.currentProvider || result.provider) {
        currentProvider = result.currentProvider || result.provider;
      }
      if (result.providerUrls && typeof result.providerUrls === 'object') {
        providerUrl = result.providerUrls[currentProvider] || null;
      }
    } catch (_) {}
    
    // Try to send message to content script, inject if needed
    try {
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'toggleParallelPanel',
        provider: currentProvider,
        providerUrl
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
          provider: currentProvider,
          providerUrl
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
        chrome.contextMenus.create({
          id: 'aisb-capture-screenshot',
          title: '发送当前页面截图到侧边栏',
          contexts: ['page', 'frame']
        });
      } catch (_) {}
    });
  } catch (_) {}
  try {
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      try {
        if (info.menuItemId === 'aisb-capture-screenshot') {
          await handleCaptureScreenshot(tab || null);
          return;
        }
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

 
