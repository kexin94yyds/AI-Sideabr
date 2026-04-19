// 公共认证检查函数 - 减少重复代码
const AuthCheckers = {
  // ChatGPT通用认证检查
  chatgptAuth: async (baseUrl = 'https://chatgpt.com') => {
    try {
      const res = await fetch(`${baseUrl}/api/auth/session`);
      if (res.status === 403) {
        return {
          state: 'cloudflare',
          message: `Please login and pass Cloudflare at <a href="${baseUrl}" target="_blank" rel="noreferrer">${baseUrl}</a>`
        };
      }
      const data = await res.json();
      if (!res.ok || !data.accessToken) {
        return {
          state: 'unauthorized',
          message: `Please login at <a href="${baseUrl}" target="_blank" rel="noreferrer">${baseUrl}</a> first`
        };
      }
      return { state: 'authorized' };
    } catch (e) {
      console.error('ChatGPT session check failed:', e);
      return { state: 'error', message: 'Error checking session.' };
    }
  }
};

const PROVIDERS = {
  chatgpt: {
    label: 'ChatGPT',
    icon: 'images/providers/chatgpt.svg',
    baseUrl: 'https://chatgpt.com',
    iframeUrl: 'https://chatgpt.com/chat',
    authCheck: () => AuthCheckers.chatgptAuth()
  },
  codex: {
    label: 'ChatGPT Codex',
    icon: 'images/providers/codex.svg',
    baseUrl: 'https://chatgpt.com/codex',
    iframeUrl: 'https://chatgpt.com/codex',
    authCheck: () => AuthCheckers.chatgptAuth()
  },
  perplexity: {
    label: 'Perplexity',
    icon: 'images/providers/perplexity.png',
    baseUrl: 'https://www.perplexity.ai',
    iframeUrl: 'https://www.perplexity.ai/',
    authCheck: null
  },
  genspark: {
    label: 'Genspark',
    icon: 'images/providers/genspark.png',
    baseUrl: 'https://www.genspark.ai',
    iframeUrl: 'https://www.genspark.ai/agents?type=moa_chat',
    authCheck: null
  },
  tongyi: {
    label: '通义千问',
    icon: 'images/providers/tongyi.png',
    baseUrl: 'https://www.tongyi.com',
    iframeUrl: 'https://www.tongyi.com/',
    authCheck: null
  },
  doubao: {
    label: '豆包',
    icon: 'images/providers/doubao.png',
    baseUrl: 'https://www.doubao.com',
    iframeUrl: 'https://www.doubao.com/',
    authCheck: null
  },
  gemini: {
    label: 'Gemini',
    icon: 'images/providers/gemini.png',
    baseUrl: 'https://gemini.google.com',
    iframeUrl: 'https://gemini.google.com/app',
    authCheck: null // render directly; login handled by site
  },
  google: {
    label: 'Google',
    icon: 'images/providers/google.png',
    baseUrl: 'https://www.google.com',
    // User-requested AI/UDM search entry
    iframeUrl: 'https://www.google.com/search?udm=50&aep=46&source=25q2-US-SearchSites-Site-CTA',
    authCheck: null
  },
  aistudio: {
    label: 'AI Studio',
    icon: 'images/providers/aistudio.png',
    baseUrl: 'https://aistudio.google.com',
    iframeUrl: 'https://aistudio.google.com/apps',
    authCheck: null
  },
  claude: {
    label: 'Claude',
    icon: 'images/providers/claude.png',
    baseUrl: 'https://claude.ai',
    iframeUrl: 'https://claude.ai',
    authCheck: null
  },
  deepseek: {
    label: 'DeepSeek',
    icon: 'images/providers/deepseek.png',
    baseUrl: 'https://chat.deepseek.com',
    iframeUrl: 'https://chat.deepseek.com/',
    authCheck: null
  },
  grok: {
    label: 'Grok',
    icon: 'images/providers/grok.png',
    baseUrl: 'https://grok.com',
    iframeUrl: 'https://grok.com/',
    authCheck: null
  },
  notebooklm: {
    label: 'NotebookLM',
    icon: 'images/providers/notebooklm.png',
    baseUrl: 'https://notebooklm.google.com',
    iframeUrl: 'https://notebooklm.google.com/',
    authCheck: null
  },
  ima: {
    label: 'IMA',
    icon: 'images/providers/ima.jpeg', // 使用新的熊猫图标
    baseUrl: 'https://ima.qq.com',
    iframeUrl: 'https://ima.qq.com/',
    authCheck: null
  },
  tobooks: {
    label: 'ToBooks',
    icon: 'images/providers/tobooks.png',
    baseUrl: 'https://tobooks.xin/',
    iframeUrl: 'https://tobooks.xin/',
    authCheck: null
  },
  mubu: {
    label: '幕布',
    icon: 'images/providers/mubu.png',
    baseUrl: 'https://mubu.com',
    iframeUrl: 'https://mubu.com/app/edit/home/5zT4WuoDoc0',
    authCheck: null // 幕布通过网站处理登录
  },
  excalidraw: {
    label: 'Excalidraw',
    icon: 'images/providers/excalidraw.svg',
    baseUrl: 'https://excalidraw.com',
    iframeUrl: 'https://excalidraw.com/',
    authCheck: null // Excalidraw 无需登录
  },
  kimi: {
    label: 'Kimi',
    icon: 'images/providers/kimi.png',
    baseUrl: 'https://kimi.moonshot.cn',
    iframeUrl: 'https://kimi.moonshot.cn/',
    authCheck: null
  },
  'v0': {
    label: 'v0',
    icon: 'images/providers/v0.svg',
    baseUrl: 'https://v0.dev',
    iframeUrl: 'https://v0.dev/chat',
    authCheck: null
  },
  copilot: {
    label: 'GitHub Copilot',
    icon: 'images/providers/copilot.png',
    baseUrl: 'https://github.com/copilot',
    iframeUrl: 'https://github.com/copilot',
    authCheck: null
  },
  mistral: {
    label: 'Mistral',
    icon: 'images/providers/mistral.png',
    baseUrl: 'https://chat.mistral.ai',
    iframeUrl: 'https://chat.mistral.ai/',
    authCheck: null
  },
  cohere: {
    label: 'Cohere',
    icon: 'images/providers/cohere.png',
    baseUrl: 'https://coral.cohere.com',
    iframeUrl: 'https://coral.cohere.com/',
    authCheck: null
  },
  huggingface: {
    label: 'HuggingChat',
    icon: 'images/providers/huggingface.png',
    baseUrl: 'https://huggingface.co',
    iframeUrl: 'https://huggingface.co/chat/',
    authCheck: null
  },
  metaai: {
    label: 'Meta AI',
    icon: 'images/providers/metaai.png',
    baseUrl: 'https://www.meta.ai',
    iframeUrl: 'https://www.meta.ai/',
    authCheck: null
  },
  zhipu: {
    label: '智谱清言',
    icon: 'images/providers/zhipu.png',
    baseUrl: 'https://chatglm.cn',
    iframeUrl: 'https://chatglm.cn/',
    authCheck: null
  },
  minimax: {
    label: '海螺AI',
    icon: 'images/providers/minimax.png',
    baseUrl: 'https://hailuoai.com',
    iframeUrl: 'https://hailuoai.com/',
    authCheck: null
  }
};

// Debug logging helper (set to false to silence in production)
const DEBUG = true;
const dbg = (...args) => { try { if (DEBUG) console.log('[AISidebar]', ...args); } catch (_) {} };

// Custom provider helpers (for Add AI)
async function loadCustomProviders() {
  return new Promise((resolve) => {
    try {
      chrome.storage?.local.get(['customProviders'], (res) => {
        const arr = Array.isArray(res.customProviders) ? res.customProviders : [];
        resolve(arr);
      });
    } catch (_) { resolve([]); }
  });
}
async function saveCustomProviders(list) {
  try { chrome.storage?.local.set({ customProviders: list }); } catch (_) {}
}

// No built-in prompt overlay

// Overrides (per-provider), e.g., force useWebview true/false
const getOverrides = async () => {
  return new Promise((resolve) => {
    try {
      chrome.storage?.local.get(['aiProviderOverrides'], (res) => {
        resolve(res.aiProviderOverrides || {});
      });
    } catch (_) { resolve({}); }
  });
};
const setOverride = async (key, patch) => {
  try {
    const all = await getOverrides();
    const cur = all[key] || {};
    all[key] = { ...cur, ...patch };
    chrome.storage?.local.set({ aiProviderOverrides: all });
  } catch (_) {}
};
// Build effective provider config with overrides, but enforce webview for Perplexity
const effectiveConfig = (baseMap, key, overrides) => {
  const base = (baseMap && baseMap[key]) || PROVIDERS[key];
  const ovr = (overrides && overrides[key]) || {};
  const merged = { ...(base || {}), ...(ovr || {}) };
  if (key === 'perplexity') merged.useWebview = false;
  return merged;
};
const clearOverride = async (key) => {
  try {
    const all = await getOverrides();
    if (all[key]) { delete all[key]; }
    chrome.storage?.local.set({ aiProviderOverrides: all });
  } catch (_) {}
};

const getProvider = async () => {
  return new Promise((resolve) => {
    try {
      chrome.storage?.local.get(['provider'], (res) => {
        resolve(res.provider || 'chatgpt');
      });
    } catch (_) {
      resolve('chatgpt');
    }
  });
};

const setProvider = async (key) => {
  return new Promise((resolve) => {
    try {
      chrome.storage?.local.set({ provider: key }, () => resolve());
    } catch (_) {
      resolve();
    }
  });
};

// Normalize provider URLs so renamed domains can be migrated from old stored values.
const normalizeProviderUrl = (providerKey, url) => {
  if (!url || typeof url !== 'string') return null;
  if (providerKey !== 'tobooks') return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'tobooks.netlify.app') {
      return 'https://tobooks.xin/';
    }
  } catch (_) {}
  return url;
};

// Save and restore current URL for each provider
const saveProviderUrl = async (providerKey, url) => {
  try {
    const data = await chrome.storage?.local.get(['providerUrls']);
    const urls = data?.providerUrls || {};
    urls[providerKey] = normalizeProviderUrl(providerKey, url);
    await chrome.storage?.local.set({ providerUrls: urls });
  } catch (_) {}
};

const getProviderUrl = async (providerKey) => {
  try {
    const data = await chrome.storage?.local.get(['providerUrls']);
    const saved = data?.providerUrls?.[providerKey] || null;
    const normalized = normalizeProviderUrl(providerKey, saved);
    if (saved && normalized && saved !== normalized) {
      const urls = data?.providerUrls || {};
      urls[providerKey] = normalized;
      await chrome.storage?.local.set({ providerUrls: urls });
    }
    return normalized;
  } catch (_) {
    return null;
  }
};


const getProviderOrder = async () => {
  return new Promise((resolve) => {
    try {
      chrome.storage?.local.get(['providerOrder'], (res) => {
        const builtins = Object.keys(PROVIDERS);
        let order = Array.isArray(res.providerOrder) ? res.providerOrder.slice() : [];
        // append any new built-ins not in stored order
        builtins.forEach((k)=>{ if (!order.includes(k)) order.push(k); });
        // Ensure 'history' is not in the regular provider order if it's meant to be a special tab
        order = order.filter(k => k !== 'history');
        resolve(order);
      });
    } catch (_) {
      resolve(Object.keys(PROVIDERS));
    }
  });
};

const saveProviderOrder = async (order) => {
  try { chrome.storage?.local.set({ providerOrder: order }); } catch (_) {}
};

// Star shortcut key management
const getStarShortcut = async () => {
  return new Promise((resolve) => {
    try {
      chrome.storage?.local.get(['starShortcut'], (res) => {
        resolve(res.starShortcut || { key: 'l', ctrl: true, shift: false, alt: false });
      });
    } catch (_) {
      resolve({ key: 'l', ctrl: true, shift: false, alt: false });
    }
  });
};

const setStarShortcut = async (shortcut) => {
  try {
    await chrome.storage?.local.set({ starShortcut: shortcut });
  } catch (_) {}
};

// Button shortcuts management
const defaultButtonShortcuts = {
  openInTab: { key: 'o', ctrl: true, shift: false, alt: false },
  searchBtn: { key: 'f', ctrl: true, shift: true, alt: false },
  historyBtn: { key: 'h', ctrl: true, shift: false, alt: false },
  exportBtn: { key: 'e', ctrl: true, shift: true, alt: false },
  favoritesBtn: { key: 'l', ctrl: true, shift: false, alt: false }
};

const getButtonShortcuts = async () => {
  return new Promise((resolve) => {
    try {
      chrome.storage?.local.get(['buttonShortcuts'], (res) => {
        resolve(res.buttonShortcuts || defaultButtonShortcuts);
      });
    } catch (_) {
      resolve(defaultButtonShortcuts);
    }
  });
};

const setButtonShortcuts = async (shortcuts) => {
  try {
    await chrome.storage?.local.set({ buttonShortcuts: shortcuts });
  } catch (_) {}
};

const matchesShortcut = (event, shortcut) => {
  return (
    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
    event.ctrlKey === shortcut.ctrl &&
    event.shiftKey === shortcut.shift &&
    event.altKey === shortcut.alt
  );
};

// Cache embedded elements per provider to preserve state between switches
const cachedFrames = {};
// Cache simple meta for frames (e.g., expected origin)
const cachedFrameMeta = {}; // { [providerKey]: { origin: string } }
// Track the latest known URL and title inside each provider frame (from content script)
const currentUrlByProvider = {};   // { [providerKey]: string }
const currentTitleByProvider = {}; // { [providerKey]: string }

// ---- History store helpers ----
const HISTORY_KEY = 'aiLinkHistory';
const TITLE_MAX_LEN = 50;

// ---- Export/Import helpers ----
async function exportHistory() {
  try {
    const list = await loadHistory();
    const dataStr = JSON.stringify(list, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-sidebar-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('导出历史记录失败:', err);
    alert('导出失败：' + String(err));
  }
}

async function importHistory() {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        const imported = JSON.parse(text);
        if (!Array.isArray(imported)) {
          alert('无效的导入文件格式');
          return;
        }
        const current = await loadHistory();
        const currentUrls = new Set(current.map(x => normalizeUrlForMatch(x.url)));
        const newItems = imported.filter(x => x && x.url && !currentUrls.has(normalizeUrlForMatch(x.url)));
        const merged = [...newItems, ...current].slice(0, 500);
        await saveHistory(merged);
        renderHistoryPanel();
        alert(`已导入 ${newItems.length} 条新记录`);
      } catch (err) {
        console.error('导入历史记录失败:', err);
        alert('导入失败：' + String(err));
      }
    };
    input.click();
  } catch (err) {
    console.error('导入历史记录失败:', err);
    alert('导入失败：' + String(err));
  }
}

async function exportFavorites() {
  try {
    const list = await loadFavorites();
    const dataStr = JSON.stringify(list, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-sidebar-favorites-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('导出收藏失败:', err);
    alert('导出失败：' + String(err));
  }
}

async function importFavorites() {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        const imported = JSON.parse(text);
        if (!Array.isArray(imported)) {
          alert('无效的导入文件格式');
          return;
        }
        const current = await loadFavorites();
        const currentUrls = new Set(current.map(x => normalizeUrlForMatch(x.url)));
        const newItems = imported.filter(x => x && x.url && !currentUrls.has(normalizeUrlForMatch(x.url)));
        const merged = [...newItems, ...current].slice(0, 500);
        await saveFavorites(merged);
        renderFavoritesPanel();
        alert(`已导入 ${newItems.length} 条新收藏`);
      } catch (err) {
        console.error('导入收藏失败:', err);
        alert('导入失败：' + String(err));
      }
    };
    input.click();
  } catch (err) {
    console.error('导入收藏失败:', err);
    alert('导入失败：' + String(err));
  }
}
// When set, renderHistoryPanel will start inline edit for this URL
let __pendingInlineEditUrl = null;
// When true, the inline edit that starts should close panel on Enter
let __pendingInlineEditCloseOnEnter = false;
// Persist history panel search across re-renders
let __historySearchQuery = '';
// History panel view mode: 'link' or 'content'
let __historyViewMode = 'link';

function escapeAttr(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function deriveTitle(provider, url, rawTitle) {
  try {
    const label = historyProviderLabel(provider) || '';
    const t = (rawTitle || '').trim();
    // Filter out generic or unhelpful titles
    const blacklist = ['recent','google gemini','gemini','conversation with gemini'];
    if (t && !blacklist.includes(t.toLowerCase())) {
      if (!label) return t;
      const containsLabel = t.toLowerCase().includes(label.toLowerCase());
      // Be more permissive so titles like "ChatGPT chat" are accepted
      const extraThreshold = (provider === 'chatgpt') ? 2 : 5;
      if (!containsLabel || t.length > label.length + extraThreshold) return t;
    }
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    let id = parts[parts.length - 1] || '';
    if (provider === 'chatgpt') {
      const idx = parts.indexOf('c');
      if (idx >= 0 && parts[idx + 1]) id = parts[idx + 1];
    } else if (provider === 'gemini') {
      const idx = parts.indexOf('app');
      if (idx >= 0 && parts[idx + 1]) id = parts[idx + 1];
    }
    const shortId = id ? id.slice(0, 8) : '';
    return [label || provider, shortId].filter(Boolean).join(' ');
  } catch (_) { return rawTitle || historyProviderLabel(provider) || provider || 'Conversation'; }
}
// clampTitle函数用于将传入的标题字符串s截断到最大长度max（默认是TITLE_MAX_LEN全局常量）以内，
// 如果字符串长度超过max，会在末尾加上省略号“…”；如果发生异常则返回原始输入。
function clampTitle(s, max = TITLE_MAX_LEN) {
  try {
    const str = String(s || '').trim();
    if (str.length <= max) return str;
    return str.slice(0, Math.max(0, max - 1)) + '…';
  } catch (_) { return s; }
}

// loadHistory是异步函数，用于加载历史会话数据（即AI聊天历史）。
// 优先从window.HistoryDB（IndexedDB实现，较新且推荐的历史存储方案）获取，如果存在HistoryDB，则先尝试迁移从chrome.storage.local的老数据，再直接从HistoryDB获取所有历史记录。
// 如果没有HistoryDB实现（比如还没升级数据），则降级回老的chrome.storage.local方式，读取HISTORY_KEY键对应的数据数组，不存在则返回空数组。
async function loadHistory() {
  try {
    if (window.HistoryDB) {
      await window.HistoryDB.migrateFromStorageIfAny();
      return await window.HistoryDB.getAll();
    }
  } catch (_) {}
  // Fallback to chrome.storage.local legacy (should be gone after migration)
  try {
    const res = await new Promise((r)=> chrome.storage?.local.get([HISTORY_KEY], (v)=> r(v||{})));
    const arr = Array.isArray(res[HISTORY_KEY]) ? res[HISTORY_KEY] : [];
    return arr;
  } catch (_) { return []; }
}
async function saveHistory(list) {
  try {
    if (window.HistoryDB) {
      await window.HistoryDB.replace(Array.isArray(list) ? list : []);
      return;
    }
  } catch (_) {}
  try { await chrome.storage?.local.set({ [HISTORY_KEY]: list }); } catch (_) {}
}
async function addHistory(entry) {
  try {
    if (window.HistoryDB) {
      const suggested = typeof entry.title === 'string' ? entry.title : '';
      const title = clampTitle(entry && entry.needsTitle ? suggested : deriveTitle(entry.provider, entry.url, suggested));
      await window.HistoryDB.add({ ...entry, title, time: Date.now() });
      return await window.HistoryDB.getAll();
    }
  } catch (_) {}
  // Legacy fallback
  try {
    const list = await loadHistory();
    const filtered = list.filter((x)=> x && x.url !== entry.url);
    const suggested = typeof entry.title === 'string' ? entry.title : '';
    const title = clampTitle(entry && entry.needsTitle ? suggested : deriveTitle(entry.provider, entry.url, suggested));
    const next = [{...entry, title, time: Date.now()}].concat(filtered).slice(0, 500);
    await saveHistory(next);
    return next;
  } catch (_) { return null; }
}
function isDeepLink(providerKey, href) {
  try {
    if (!href) return false;
    const u = new URL(href);
    if (providerKey === 'chatgpt') {
      // ChatGPT deep links: /c/<id> (primary), sometimes include conversationId in query
      if (/\/c\/[a-z0-9-]+/i.test(u.pathname)) return true;
      if (u.searchParams && u.searchParams.get('conversationId')) return true;
      return false;
    }
    if (providerKey === 'gemini') return /\/app\//.test(u.pathname) && u.pathname !== '/app';
    if (providerKey === 'perplexity') return /\/search\//.test(u.pathname);
    if (providerKey === 'deepseek') return /(\/sessions\/|\/s\/|\/chat)/.test(u.pathname);
    if (providerKey === 'notebooklm') {
      // NotebookLM uses a variety of routes; treat any non-root path as a deep link
      return (u.pathname && u.pathname !== '/' && u.pathname !== '/u/0' && u.pathname !== '/u/1');
    }
    if (providerKey === 'google') {
      // Consider Google deep link when search query present
      return (u.hostname === 'www.google.com' && u.pathname === '/search' && !!u.searchParams.get('q'));
    }
  } catch (_) {}
  return false;
}
function historyProviderLabel(key) {
  const m = PROVIDERS[key];
  return (m && m.label) || key;
}
function normalizeUrlAttr(s) {
  if (!s) return s;
  // Decode common HTML entity for '&' to match stored URL
  return s.replace(/&amp;/g, '&');
}

// Normalize URL for robust equality checks (align with HistoryDB.removeByUrl)
function normalizeUrlForMatch(uStr) {
  try {
    const u = new URL(String(uStr));
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    if (u.search && u.search.length > 1) {
      const sp = new URLSearchParams(u.search);
      const sorted = new URLSearchParams();
      Array.from(sp.keys()).sort().forEach(k => {
        const vals = sp.getAll(k);
        vals.sort().forEach(v => sorted.append(k, v));
      });
      u.search = sorted.toString() ? `?${sorted.toString()}` : '';
    }
    if (u.pathname === '/') u.pathname = '';
    return u.toString();
  } catch (_) {
    return String(uStr || '');
  }
}
async function renderHistoryPanel() {
  try {
    const panel = document.getElementById('historyPanel');
    if (!panel) return;
    
    // Mode toggle buttons
    const linkActive = __historyViewMode === 'link' ? 'active' : '';
    const contentActive = __historyViewMode === 'content' ? 'active' : '';
    
    let rows = '';
    
    if (__historyViewMode === 'link') {
      // Link mode: show URL history
      const list = await loadHistory();
      const favList = await loadFavorites();
      const favSet = new Set((favList||[]).map(x=> normalizeUrlForMatch(x.url)));
      rows = (list || []).map((it)=>{
        const date = new Date(it.time||Date.now());
        const ds = date.toLocaleString();
        const titleToShow = clampTitle((it && it.title && it.title.trim())
          ? it.title
          : (deriveTitle(it.provider, it.url, '') || ''));
        const escTitle = titleToShow.replace(/[<>]/g,'');
        const isStarred = favSet.has(normalizeUrlForMatch(it.url));
        const starClass = isStarred ? 'hp-star active' : 'hp-star';
        const starTitle = isStarred ? 'Unstar' : 'Star';
        const rawTitleForData = (it && typeof it.title === 'string' && it.title.trim())
          ? it.title.trim()
          : titleToShow;
        return `<div class="hp-item" data-url="${escapeAttr(it.url)}" data-provider="${escapeAttr(it.provider || '')}" data-title="${escapeAttr(rawTitleForData)}">
          <span class="hp-provider">${historyProviderLabel(it.provider||'')}</span>
          <span class="hp-title" data-url="${escapeAttr(it.url)}" title="${escTitle}">${escTitle}</span>
          <span class="hp-time">${ds}</span>
          <span class="hp-actions">
            <button class="hp-open" data-url="${escapeAttr(it.url)}" data-provider="${it.provider||''}">Open</button>
            <button class="hp-copy" data-url="${escapeAttr(it.url)}">Copy</button>
            <button class="hp-rename" data-url="${escapeAttr(it.url)}">Rename</button>
            <button class="${starClass}" data-url="${escapeAttr(it.url)}" title="${starTitle}">★</button>
          </span>
        </div>`;
      }).join('');
    } else {
      // Content mode: show saved conversations from IndexedDB
      try {
        let conversations = typeof window.ChatHistoryDB?.getAll === 'function' 
          ? await window.ChatHistoryDB.getAll() 
          : [];
        
        // Filter by search query (search in title and content)
        const query = __historySearchQuery.toLowerCase().trim();
        if (query) {
          conversations = conversations.filter(conv => {
            const title = (conv.title || '').toLowerCase();
            const content = (conv.content || '').toLowerCase();
            return title.includes(query) || content.includes(query);
          });
        }
        
        rows = (conversations || []).map((conv)=>{
          const date = new Date(conv.updatedAt || conv.createdAt || Date.now());
          const ds = date.toLocaleString();
          const escTitle = (conv.title || 'Untitled').replace(/[<>]/g,'');
          const msgCount = conv.messageCount || conv.messages?.length || 0;
          
          // Extract matching snippet if searching - show sentence containing keyword
          let snippetHtml = '';
          if (query) {
            const titleMatch = (conv.title || '').toLowerCase().includes(query);
            const content = conv.content || '';
            const lowerContent = content.toLowerCase();
            const idx = lowerContent.indexOf(query);
            
            if (idx !== -1) {
              // Find sentence boundaries around the keyword
              let sentenceStart = idx;
              let sentenceEnd = idx + query.length;
              
              // Look back for sentence start (limit 100 chars)
              for (let i = idx - 1; i >= 0 && i > idx - 100; i--) {
                const c = content[i];
                if ('。！？\n.!?'.includes(c)) {
                  sentenceStart = i + 1;
                  break;
                }
                if (i === Math.max(0, idx - 100)) sentenceStart = i;
              }
              
              // Look forward for sentence end (limit 100 chars)
              for (let i = idx + query.length; i < content.length && i < idx + 100; i++) {
                const c = content[i];
                if ('。！？\n.!?'.includes(c)) {
                  sentenceEnd = i + 1;
                  break;
                }
                if (i === Math.min(content.length - 1, idx + 100)) sentenceEnd = i + 1;
              }
              
              let snippet = content.substring(sentenceStart, sentenceEnd).trim().replace(/\n/g, ' ').replace(/[<>]/g, '');
              // Ensure keyword is visible - if snippet too long, center on keyword
              if (snippet.length > 60) {
                const keywordPosInSnippet = idx - sentenceStart;
                const start = Math.max(0, keywordPosInSnippet - 25);
                const end = Math.min(snippet.length, keywordPosInSnippet + query.length + 35);
                snippet = (start > 0 ? '...' : '') + snippet.substring(start, end) + (end < snippet.length ? '...' : '');
              } else if (sentenceStart > 0) {
                snippet = '...' + snippet;
              }
              snippetHtml = `<div class="hp-snippet">${snippet}</div>`;
            } else if (titleMatch) {
              // Title matches but content doesn't - show indicator
              snippetHtml = `<div class="hp-snippet">标题匹配</div>`;
            }
          }
          
          return `<div class="hp-item hp-content-item" data-conv-id="${escapeAttr(conv.id)}" data-provider="${escapeAttr(conv.provider || '')}">
            <span class="hp-provider">${historyProviderLabel(conv.provider||'')}</span>
            <div class="hp-content-info">
              <span class="hp-title" title="${escTitle}">${escTitle}</span>
              ${snippetHtml}
            </div>
            <span class="hp-msg-count">${msgCount} msgs</span>
            <span class="hp-time">${ds}</span>
            <span class="hp-actions">
              <button class="hp-view-conv" data-conv-id="${escapeAttr(conv.id)}">View</button>
              <button class="hp-export-conv" data-conv-id="${escapeAttr(conv.id)}">Export</button>
              <button class="hp-delete-conv" data-conv-id="${escapeAttr(conv.id)}">Delete</button>
            </span>
          </div>`;
        }).join('');
        if (!rows) rows = query 
          ? '<div class="hp-empty">No conversations matching your search.</div>'
          : '<div class="hp-empty">No saved conversations yet. Use Cmd+S to save chats.</div>';
      } catch (err) {
        console.error('Failed to load conversations:', err);
        rows = '<div class="hp-empty">Failed to load conversations</div>';
      }
    }
    
    panel.innerHTML = `<div class="hp-header">
      <span>History</span>
      <span class="hp-actions">
        <button id="hp-mode-link" class="hp-mode-btn ${linkActive}">Link</button>
        <button id="hp-mode-content" class="hp-mode-btn ${contentActive}">Content</button>
        <button id="hp-add-current">Add Current</button>
        <button id="hp-export">导出</button>
        <button id="hp-import">导入</button>
        <button id="hp-clear-all">Clear</button>
        <button id="hp-close">Close</button>
      </span>
    </div>
    <div class="hp-search-row">
      <span class="hp-search-icon">🔍</span>
      <input id="hp-search-input" class="hp-search-input" type="text" placeholder="搜索" />
    </div>
    <div class="hp-list">${rows || ''}</div>`;
    // events
    panel.querySelector('#hp-close')?.addEventListener('click', ()=> panel.style.display='none');
    panel.querySelector('#hp-export')?.addEventListener('click', exportHistory);
    panel.querySelector('#hp-import')?.addEventListener('click', importHistory);
    panel.querySelector('#hp-clear-all')?.addEventListener('click', async ()=>{ 
      if (__historyViewMode === 'link') {
        await saveHistory([]); 
      } else {
        if (typeof window.ChatHistoryDB?.clear === 'function') {
          await window.ChatHistoryDB.clear();
        }
      }
      renderHistoryPanel(); 
    });
    
    // Mode toggle buttons
    panel.querySelector('#hp-mode-link')?.addEventListener('click', ()=>{
      __historyViewMode = 'link';
      renderHistoryPanel();
    });
    panel.querySelector('#hp-mode-content')?.addEventListener('click', ()=>{
      __historyViewMode = 'content';
      renderHistoryPanel();
    });
    
    // Content mode: View/Export/Delete conversation
    panel.querySelectorAll('.hp-view-conv')?.forEach((btn)=>{
      btn.addEventListener('click', async (e)=>{
        const convId = e.currentTarget.getAttribute('data-conv-id');
        if (!convId) return;
        try {
          const conv = typeof window.ChatHistoryDB?.get === 'function' 
            ? await window.ChatHistoryDB.get(parseInt(convId)) 
            : null;
          if (conv && conv.content) {
            // Open in new tab with proper HTML wrapper for UTF-8
            const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${conv.title || 'Chat'}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;}
pre{background:#f5f5f5;padding:16px;overflow-x:auto;border-radius:8px;}
code{background:#f0f0f0;padding:2px 6px;border-radius:4px;}
h1,h2,h3{border-bottom:1px solid #eee;padding-bottom:8px;}
blockquote{border-left:4px solid #ddd;margin:0;padding-left:16px;color:#666;}</style>
</head><body><pre>${conv.content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre></body></html>`;
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
          }
        } catch (err) {
          console.error('View conversation error:', err);
        }
      });
    });
    panel.querySelectorAll('.hp-export-conv')?.forEach((btn)=>{
      btn.addEventListener('click', async (e)=>{
        const convId = e.currentTarget.getAttribute('data-conv-id');
        if (!convId) return;
        try {
          const conv = typeof window.ChatHistoryDB?.get === 'function' 
            ? await window.ChatHistoryDB.get(parseInt(convId)) 
            : null;
          if (conv) {
            const filename = `${(conv.title || 'chat').replace(/[\/\\?%*:|"<>]/g, '_')}.md`;
            const blob = new Blob([conv.content || ''], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
          }
        } catch (err) {
          console.error('Export conversation error:', err);
        }
      });
    });
    panel.querySelectorAll('.hp-delete-conv')?.forEach((btn)=>{
      btn.addEventListener('click', async (e)=>{
        const convId = e.currentTarget.getAttribute('data-conv-id');
        if (!convId) return;
        if (!confirm('Delete this conversation?')) return;
        try {
          if (typeof window.ChatHistoryDB?.delete === 'function') {
            await window.ChatHistoryDB.delete(parseInt(convId));
            renderHistoryPanel();
          }
        } catch (err) {
          console.error('Delete conversation error:', err);
        }
      });
    });
    
    panel.querySelector('#hp-add-current')?.addEventListener('click', async ()=>{
      try {
        const a = document.getElementById('openInTab');
        const href = a && a.href;
        const provider = (await getProvider())||'chatgpt';
        if (href) {
          __pendingInlineEditUrl = href;
          __pendingInlineEditCloseOnEnter = true;
          const suggested = (currentTitleByProvider[provider] || document.title || '').trim();
          await addHistory({ url: href, provider, title: suggested, needsTitle: true });
          renderHistoryPanel();
        }
      } catch (_) {}
    });
    panel.querySelectorAll('.hp-open')?.forEach((btn)=>{
      btn.addEventListener('click', async (e)=>{
        try {
          const raw = e.currentTarget.getAttribute('data-url');
          const url = normalizeUrlAttr(raw);
          const providerKey = e.currentTarget.getAttribute('data-provider');
          if (!url) return;
          
          // Load the URL in the sidebar
          const container = document.getElementById('iframe');
          const overrides = await getOverrides();
          const customProviders = await loadCustomProviders();
          const ALL = { ...PROVIDERS };
          (customProviders || []).forEach((c) => { ALL[c.key] = c; });
          
          // Switch to the provider if specified, otherwise stay on current
          if (providerKey && ALL[providerKey]) {
            await setProvider(providerKey);
            const p = effectiveConfig(ALL, providerKey, overrides);
            
            // Update the Open in Tab button
            const openInTab = document.getElementById('openInTab');
            if (openInTab) {
              openInTab.dataset.url = url;
              try { openInTab.title = url; } catch (_) {}
            }
            
            // Load the frame
            if (p.authCheck) {
              const auth = await p.authCheck();
              if (auth.state === 'authorized') {
                await ensureFrame(container, providerKey, p);
              } else {
                renderMessage(container, auth.message || 'Please login.');
              }
            } else {
              await ensureFrame(container, providerKey, p);
            }
            
            // Navigate the frame to the URL
            const frame = cachedFrames[providerKey];
            if (frame && frame.contentWindow) {
              try {
                frame.contentWindow.location.href = url;
              } catch (err) {
                // Fallback: reload frame with new URL
                frame.src = url;
              }
            }
            
            // Update UI
            renderProviderTabs(providerKey, overrides);
            // Update Star button state for the newly opened URL
            await updateStarButtonState();
          }
          
          // Close the history panel
          panel.style.display = 'none';
          try { document.getElementById('historyBackdrop')?.remove(); } catch (_) {}
        } catch (err) {
          console.error('Error opening history item in sidebar:', err);
        }
      });
    });
    panel.querySelectorAll('.hp-copy')?.forEach((btn)=>{
      btn.addEventListener('click', async (e)=>{
        try {
          const raw = e.currentTarget.getAttribute('data-url');
          const url = normalizeUrlAttr(raw);
          await navigator.clipboard.writeText(url);
        } catch (_) {}
      });
    });
    // Remove action removed by request; Clear-all remains available
    // Star/unstar from history list - only toggle star, don't open Favorites panel
    panel.querySelectorAll('.hp-star')?.forEach((btn)=>{
      btn.addEventListener('click', async (e)=>{
        e.stopPropagation(); // Prevent event bubbling
        const url = e.currentTarget.getAttribute('data-url');
        const row = e.currentTarget.closest('.hp-item');
        const rowProvider = row ? row.getAttribute('data-provider') : null;
        const rowTitleAttr = row ? row.getAttribute('data-title') : null;
        const rowTitleText = row ? (row.querySelector('.hp-title')?.textContent || '') : '';
        const isActive = e.currentTarget.classList.contains('active');
        const provider = (rowProvider && rowProvider.trim()) || (await getProvider()) || 'chatgpt';
        const normalizedUrl = normalizeUrlForMatch(url);
        if (isActive) {
          // Unstar
          const favs = await loadFavorites();
          await saveFavorites(favs.filter((x)=> normalizeUrlForMatch(x.url) !== normalizedUrl));
        } else {
          // Star - use the history item's own title when available
          const baseTitle = (rowTitleAttr || rowTitleText || '').trim();
          const suggested = baseTitle || (currentTitleByProvider[provider] || document.title || '').trim();
          // needsTitle: true here means "preserve the supplied title" (no inline rename)
          await addFavorite({ url, provider, title: suggested, needsTitle: true });
        }
        // Update history panel to show new star state
        renderHistoryPanel();
        // Update the Star button in toolbar if this URL is currently displayed
        try {
          const openInTab = document.getElementById('openInTab');
          const currentUrl = openInTab && openInTab.dataset.url;
          if (currentUrl && normalizeUrlForMatch(currentUrl) === normalizedUrl) {
            await updateStarButtonState();
          }
        } catch (_) {}
      });
    });
    const beginInlineEdit = (titleEl, options) => {
      try {
        const row = titleEl.closest('.hp-item');
        const url = normalizeUrlAttr(row?.getAttribute('data-url'));
        const orig = titleEl.textContent || '';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = orig;
        input.className = 'hp-title-input';
        titleEl.replaceWith(input);
        input.focus(); input.select();
        const closeOnEnter = !!(options && options.closeOnEnter);
        const finish = async (save, how) => {
          try {
            const newTitle = save ? (input.value || '').trim() : orig;
            const list = await loadHistory();
            const idx = list.findIndex((x)=> x.url === url);
            if (idx >= 0 && save && newTitle) {
              // Clear needsTitle once a custom title is saved and clamp length
              list[idx] = { ...list[idx], title: clampTitle(newTitle), needsTitle: false };
              await saveHistory(list);
            }
          } catch (_) {}
          renderHistoryPanel();
          // If this inline edit was initiated by Add Current and Enter was pressed, close panel
          try {
            if (how === 'enter' && closeOnEnter) {
              if (typeof window.hideHistoryPanel === 'function') {
                window.hideHistoryPanel();
              } else {
                const p = document.getElementById('historyPanel');
                if (p) p.style.display = 'none';
                try { document.getElementById('historyBackdrop')?.remove(); } catch (_) {}
              }
            }
          } catch (_) {}
        };
        input.addEventListener('keydown', (e)=>{
          if (e.key === 'Enter') finish(true, 'enter');
          if (e.key === 'Escape') finish(false, 'escape');
        });
        input.addEventListener('blur', ()=> finish(true, 'blur'));
      } catch (_) {}
    };
    panel.querySelectorAll('.hp-title')?.forEach((el)=>{
      el.addEventListener('click', ()=> beginInlineEdit(el));
    });
    panel.querySelectorAll('.hp-rename')?.forEach((btn)=>{
      btn.addEventListener('click', (e)=>{
        const row = e.currentTarget.closest('.hp-item');
        const titleEl = row?.querySelector('.hp-title');
        if (titleEl) beginInlineEdit(titleEl);
      });
    });

    // --- Search controls (always visible below header) ---
    try {
      const searchInput = panel.querySelector('#hp-search-input');
      const filterRows = (qRaw) => {
        const q = (qRaw || '').toLowerCase();
        __historySearchQuery = qRaw || '';
        
        // For Content mode, re-render to search within content
        if (__historyViewMode === 'content') {
          renderHistoryPanel();
          return;
        }
        
        // For Link mode, filter DOM elements
        let matchCount = 0;
        panel.querySelectorAll('.hp-item')?.forEach((row)=>{
          const title = (row.querySelector('.hp-title')?.textContent || '').toLowerCase();
          const url = (row.getAttribute('data-url') || '').toLowerCase();
          const provider = (row.querySelector('.hp-provider')?.textContent || '').toLowerCase();
          const ok = !q || title.includes(q) || url.includes(q) || provider.includes(q);
          row.style.display = ok ? 'flex' : 'none';
          if (ok) matchCount++;
        });
        const emptyId = 'hp-search-empty';
        let empty = panel.querySelector('#'+emptyId);
        if (matchCount === 0 && (panel.querySelectorAll('.hp-item').length > 0)) {
          if (!empty) {
            empty = document.createElement('div');
            empty.id = emptyId;
            empty.style.padding = '8px 12px';
            empty.style.color = '#64748b';
            empty.textContent = 'No matches';
            panel.querySelector('.hp-list')?.appendChild(empty);
          }
        } else if (empty && matchCount > 0) {
          empty.remove();
        }
      };
      if (searchInput) {
        searchInput.value = __historySearchQuery;
        let __searchDebounce = null;
        searchInput.addEventListener('input', (e)=>{
          const v = e.currentTarget.value;
          if (__searchDebounce) clearTimeout(__searchDebounce);
          __searchDebounce = setTimeout(()=> filterRows(v), 1500); // 1.5s debounce for content search
        });
        // If we are about to start an inline rename (after clicking Add Current),
        // do NOT steal focus to the search box. Keep focus on the rename input.
        if (!__pendingInlineEditUrl) {
          setTimeout(()=>{ try { searchInput.focus(); searchInput.select(); } catch(_){} }, 0);
        }
        // Only filter for Link mode on initial render (Content already filtered during render)
        if (__historyViewMode === 'link') {
          filterRows(__historySearchQuery);
        }
      }
    } catch (_) {}

    // If we have a pending inline edit request (from toolbar Add), start it now
    if (__pendingInlineEditUrl) {
      try {
        const row = panel.querySelector(`.hp-item[data-url="${CSS.escape(__pendingInlineEditUrl)}"]`);
        const titleEl = row?.querySelector('.hp-title');
        if (titleEl) beginInlineEdit(titleEl, { closeOnEnter: !!__pendingInlineEditCloseOnEnter });
      } catch (_) { /* no-op */ }
      __pendingInlineEditUrl = null;
      __pendingInlineEditCloseOnEnter = false;
    }
  } catch (_) {}
}

// ---- Favorites store helpers ----
const FAVORITES_KEY = 'aiFavoriteLinks';
let __pendingFavInlineEditUrl = null;
let __pendingFavCloseOnEnter = false;
let __favSearchQuery = '';

// Update star button state based on current URL
async function updateStarButtonState() {
  try {
    const starBtn = document.getElementById('starBtn');
    const openInTab = document.getElementById('openInTab');
    if (!starBtn || !openInTab) return;
    
    const currentUrl = openInTab.dataset.url;
    if (!currentUrl || currentUrl === '#') {
      starBtn.textContent = '☆'; // Empty star
      starBtn.classList.remove('starred');
      return;
    }
    
    // Normalize current URL for comparison
    const normalizedCurrent = normalizeUrlForMatch(currentUrl);
    
    const favList = await loadFavorites();
    const isStarred = (favList || []).some(fav => normalizeUrlForMatch(fav.url) === normalizedCurrent);
    
    if (isStarred) {
      starBtn.textContent = '★'; // Filled star (black)
      starBtn.classList.add('starred');
    } else {
      starBtn.textContent = '☆'; // Empty star (white)
      starBtn.classList.remove('starred');
    }
  } catch (_) {}
}

// Deprecated: kept for backwards compatibility, but Favorites button no longer shows star
async function updateStarredButtonState() {
  await updateStarButtonState();
}
async function loadFavorites() {
  try {
    const res = await new Promise((r)=> chrome.storage?.local.get([FAVORITES_KEY], (v)=> r(v||{})));
    const arr = Array.isArray(res[FAVORITES_KEY]) ? res[FAVORITES_KEY] : [];
    return arr;
  } catch (_) { return []; }
}
async function saveFavorites(list) {
  try { await chrome.storage?.local.set({ [FAVORITES_KEY]: list }); } catch (_) {}
}
async function addFavorite(entry) {
  try {
    const list = await loadFavorites();
    const filtered = list.filter((x)=> x && x.url !== entry.url);
    const suggested = typeof entry.title === 'string' ? entry.title : '';
    const title = clampTitle(entry && entry.needsTitle
      ? suggested
      : deriveTitle(entry.provider, entry.url, suggested));
    const next = [{...entry, title, time: Date.now()}].concat(filtered).slice(0, 500);
    await saveFavorites(next);
    return next;
  } catch (_) { return null; }
}

async function renderFavoritesPanel() {
  try {
    const panel = document.getElementById('favoritesPanel');
    if (!panel) return;
    const list = await loadFavorites();
    const rows = (list || []).map((it)=>{
      const date = new Date(it.time||Date.now());
      const ds = date.toLocaleString();
      const titleToShow = clampTitle((it && it.title && it.title.trim())
        ? it.title
        : (deriveTitle(it.provider, it.url, '') || ''));
      const escTitle = titleToShow.replace(/[<>]/g,'');
      return `<div class="fp-item" data-url="${it.url}">
        <span class="fp-provider">${historyProviderLabel(it.provider||'')}</span>
        <span class="fp-title" data-url="${it.url}" title="${escTitle}">${escTitle}</span>
        <span class="fp-time">${ds}</span>
        <span class="fp-actions-row">
          <button class="fp-open" data-url="${it.url}" data-provider="${it.provider||''}">Open</button>
          <button class="fp-copy" data-url="${it.url}">Copy</button>
          <button class="fp-rename" data-url="${it.url}">Rename</button>
          <button class="fp-remove" data-url="${it.url}">Remove</button>
        </span>
      </div>`;
    }).join('');
    panel.innerHTML = `<div class=\"fp-header\">\n      <span>Favorites</span>\n      <span class=\"fp-actions\">\n        <button id=\"fp-add-current\">Add Current</button>\n        <button id=\"fp-export\">导出</button>\n        <button id=\"fp-import\">导入</button>\n        <button id=\"fp-clear-all\">Clear</button>\n        <button id=\"fp-close\">Close</button>\n      </span>\n    </div>\n    <div class=\"fp-search-row\">\n      <span class=\"fp-search-icon\">🔍</span>\n      <input id=\"fp-search-input\" class=\"fp-search-input\" type=\"text\" placeholder=\"搜索\" />\n    </div>\n    <div class=\"fp-list\">${rows || ''}</div>`;

    panel.querySelector('#fp-close')?.addEventListener('click', ()=> panel.style.display='none');
    panel.querySelector('#fp-export')?.addEventListener('click', exportFavorites);
    panel.querySelector('#fp-import')?.addEventListener('click', importFavorites);
    panel.querySelector('#fp-clear-all')?.addEventListener('click', async ()=>{ await saveFavorites([]); renderFavoritesPanel(); });
    
    panel.querySelector('#fp-add-current')?.addEventListener('click', async ()=>{
      try {
        const a = document.getElementById('openInTab');
        const href = a && a.href;
        const provider = (await getProvider())||'chatgpt';
        if (href) {
          __pendingFavInlineEditUrl = href;
          __pendingFavCloseOnEnter = true;
          const suggested = (currentTitleByProvider[provider] || document.title || '').trim();
          await addFavorite({ url: href, provider, title: suggested, needsTitle: true });
          renderFavoritesPanel();
        }
      } catch (_) {}
    });
    panel.querySelectorAll('.fp-open')?.forEach((btn)=>{
      btn.addEventListener('click', async (e)=>{
        try {
          const url = e.currentTarget.getAttribute('data-url');
          const providerKey = e.currentTarget.getAttribute('data-provider');
          if (!url) return;
          
          // Load the URL in the sidebar
          const container = document.getElementById('iframe');
          const overrides = await getOverrides();
          const customProviders = await loadCustomProviders();
          const ALL = { ...PROVIDERS };
          (customProviders || []).forEach((c) => { ALL[c.key] = c; });
          
          // Switch to the provider if specified, otherwise stay on current
          if (providerKey && ALL[providerKey]) {
            await setProvider(providerKey);
            const p = effectiveConfig(ALL, providerKey, overrides);
            
            // Update the Open in Tab button
            const openInTab = document.getElementById('openInTab');
            if (openInTab) {
              openInTab.dataset.url = url;
              try { openInTab.title = url; } catch (_) {}
            }
            
            // Load the frame
            if (p.authCheck) {
              const auth = await p.authCheck();
              if (auth.state === 'authorized') {
                await ensureFrame(container, providerKey, p);
              } else {
                renderMessage(container, auth.message || 'Please login.');
              }
            } else {
              await ensureFrame(container, providerKey, p);
            }
            
            // Navigate the frame to the URL
            const frame = cachedFrames[providerKey];
            if (frame && frame.contentWindow) {
              try {
                frame.contentWindow.location.href = url;
              } catch (err) {
                // Fallback: reload frame with new URL
                frame.src = url;
              }
            }
            
            // Update UI
            renderProviderTabs(providerKey, overrides);
            // Update Star button state for the newly opened URL
            await updateStarButtonState();
          }
          
          // Close the favorites panel
          panel.style.display = 'none';
          try { document.getElementById('favoritesBackdrop')?.remove(); } catch (_) {}
        } catch (err) {
          console.error('Error opening favorite in sidebar:', err);
        }
      });
    });
    panel.querySelectorAll('.fp-copy')?.forEach((btn)=>{
      btn.addEventListener('click', async (e)=>{
        try { await navigator.clipboard.writeText(e.currentTarget.getAttribute('data-url')); } catch (_) {}
      });
    });
    panel.querySelectorAll('.fp-remove')?.forEach((btn)=>{
      btn.addEventListener('click', async (e)=>{
        const url = e.currentTarget.getAttribute('data-url');
        const list = await loadFavorites();
        await saveFavorites(list.filter((x)=> x.url !== url));
        renderFavoritesPanel();
      });
    });
    const beginInlineEdit = (titleEl, options) => {
      try {
        const row = titleEl.closest('.fp-item');
        const url = row?.getAttribute('data-url');
        const orig = titleEl.textContent || '';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = orig;
        input.className = 'fp-title-input';
        titleEl.replaceWith(input);
        input.focus(); input.select();
        const closeOnEnter = !!(options && options.closeOnEnter);
        const finish = async (save, how) => {
          try {
            const newTitle = save ? (input.value || '').trim() : orig;
            const list = await loadFavorites();
            const idx = list.findIndex((x)=> x.url === url);
            if (idx >= 0 && save && newTitle) {
              list[idx] = { ...list[idx], title: clampTitle(newTitle) };
              await saveFavorites(list);
            }
          } catch (_) {}
          renderFavoritesPanel();
          try {
            if (how === 'enter' && closeOnEnter) {
              const p = document.getElementById('favoritesPanel');
              if (p) p.style.display = 'none';
              try { document.getElementById('favoritesBackdrop')?.remove(); } catch (_) {}
            }
          } catch (_) {}
        };
        input.addEventListener('keydown', (e)=>{
          if (e.key === 'Enter') finish(true, 'enter');
          if (e.key === 'Escape') finish(false, 'escape');
        });
        input.addEventListener('blur', ()=> finish(true, 'blur'));
      } catch (_) {}
    };
    panel.querySelectorAll('.fp-title')?.forEach((el)=>{
      el.addEventListener('click', ()=> beginInlineEdit(el));
    });
    panel.querySelectorAll('.fp-rename')?.forEach((btn)=>{
      btn.addEventListener('click', (e)=>{
        const row = e.currentTarget.closest('.fp-item');
        const titleEl = row?.querySelector('.fp-title');
        if (titleEl) beginInlineEdit(titleEl);
      });
    });

    // Search
    try {
      const searchInput = panel.querySelector('#fp-search-input');
      const filterRows = (qRaw) => {
        const q = (qRaw || '').toLowerCase();
        __favSearchQuery = qRaw || '';
        let matchCount = 0;
        panel.querySelectorAll('.fp-item')?.forEach((row)=>{
          const title = (row.querySelector('.fp-title')?.textContent || '').toLowerCase();
          const url = (row.getAttribute('data-url') || '').toLowerCase();
          const provider = (row.querySelector('.fp-provider')?.textContent || '').toLowerCase();
          const ok = !q || title.includes(q) || url.includes(q) || provider.includes(q);
          row.style.display = ok ? 'flex' : 'none';
          if (ok) matchCount++;
        });
        const emptyId = 'fp-search-empty';
        let empty = panel.querySelector('#'+emptyId);
        if (matchCount === 0 && (panel.querySelectorAll('.fp-item').length > 0)) {
          if (!empty) {
            empty = document.createElement('div');
            empty.id = emptyId;
            empty.style.padding = '8px 12px';
            empty.style.color = '#64748b';
            empty.textContent = 'No matches';
            panel.querySelector('.fp-list')?.appendChild(empty);
          }
        } else if (empty && matchCount > 0) {
          empty.remove();
        }
      };
      if (searchInput) {
        searchInput.value = __favSearchQuery;
        let __searchDebounce = null;
        searchInput.addEventListener('input', (e)=>{
          const v = e.currentTarget.value;
          if (__searchDebounce) clearTimeout(__searchDebounce);
          __searchDebounce = setTimeout(()=> filterRows(v), 80);
        });
        if (!__pendingFavInlineEditUrl) {
          setTimeout(()=>{ try { searchInput.focus(); searchInput.select(); } catch(_){} }, 0);
        }
        filterRows(__favSearchQuery);
      }
    } catch (_) {}

    if (__pendingFavInlineEditUrl) {
      try {
        const row = panel.querySelector(`.fp-item[data-url="${CSS.escape(__pendingFavInlineEditUrl)}"]`);
        const titleEl = row?.querySelector('.fp-title');
        if (titleEl) beginInlineEdit(titleEl, { closeOnEnter: !!__pendingFavCloseOnEnter });
      } catch (_) {}
      __pendingFavInlineEditUrl = null;
      __pendingFavCloseOnEnter = false;
    }
  } catch (_) {}
}

const showOnlyFrame = (container, key) => {
  const nodes = container.querySelectorAll('[data-provider]');
  nodes.forEach((el) => {
    el.style.display = el.dataset.provider === key ? 'block' : 'none';
  });
};


let __suppressNextFrameFocus = false; // when true, do not focus iframe/webview on switch (e.g., Tab cycling)

const ensureFrame = async (container, key, provider) => {
  if (!cachedFrames[key]) {
    const useWebview = !!provider.useWebview;
    const tag = useWebview ? 'webview' : 'iframe';
    const view = document.createElement(tag);
    view.setAttribute('data-provider', key);
    view.id = 'ai-frame-' + key;
    view.tabIndex = 0;
    if (tag === 'iframe') {
      view.scrolling = 'auto';
      view.frameBorder = '0';
      // Allow typical login flows (popups, redirects, storage access)
      view.allow = [
        'fullscreen',
        'clipboard-read',
        'clipboard-write',
        'geolocation',
        'camera',
        'microphone',
        'display-capture'
      ].join('; ');
    } else {
      // webview specific attributes
      // persist partition so login state survives reloads
      view.setAttribute('partition', 'persist:ai-panel');
      view.setAttribute('allowpopups', '');
      // Minimal newwindow handling: open in a normal tab (more stable across Chrome versions)
      view.addEventListener('newwindow', (e) => {
        try {
          const url = e.targetUrl || provider.baseUrl;
          window.open(url, '_blank');
          if (e.preventDefault) e.preventDefault();
        } catch (_) {}
      });
      // If a site still blocks embedding, surface a friendly message
      view.addEventListener('loadabort', (e) => {
        try {
          const reason = e.reason || 'blocked';
          const msg = 'This site refused to load in the panel (' + reason + '). ' +
                      'Click Open in Tab to use it directly.';
          const container = document.getElementById('iframe');
          renderMessage(container, msg);
        } catch (_) {}
      });
    }
    // Try to restore last visited URL for this provider
    const savedUrl = await getProviderUrl(key);
    let urlToLoad = provider.iframeUrl;
    if (savedUrl) {
      urlToLoad = savedUrl;
      dbg('ensureFrame:', key, 'restored URL:', savedUrl);
    }
    view.src = urlToLoad;
    dbg('ensureFrame:', key, 'final URL:', urlToLoad);
    view.style.width = '100%';
    view.style.height = '100%';
    container.appendChild(view);
    cachedFrames[key] = view;
    // Update Open in Tab immediately to at least the initial URL
    try {
      const openInTab = document.getElementById('openInTab');
      if (openInTab && typeof view.src === 'string') {
        openInTab.dataset.url = view.src;
      }
    } catch (_) {}
    // Record expected origin for this provider (for message validation)
    try {
      const origin = new URL(provider.baseUrl || provider.iframeUrl).origin;
      cachedFrameMeta[key] = { origin };
      // Initialize with initial URL as a fallback until content script reports
      currentUrlByProvider[key] = provider.iframeUrl || provider.baseUrl || '';
    } catch (_) {
      cachedFrameMeta[key] = { origin: '' };
    }
    if (!__suppressNextFrameFocus) {
      const focusHandler = () => { try { view.focus(); } catch(_) {} };
      if (tag === 'iframe') {
        view.addEventListener('load', focusHandler);
      } else {
        view.addEventListener('contentload', focusHandler);
      }
    }
  }
  // hide message overlay if any
  const msg = document.getElementById('provider-msg');
  if (msg) msg.style.display = 'none';
  showOnlyFrame(container, key);
  if (!__suppressNextFrameFocus) {
    try { cachedFrames[key].focus(); } catch(_) {}
  }
};

const renderMessage = (container, message) => {
  let msg = document.getElementById('provider-msg');
  if (!msg) {
    msg = document.createElement('div');
    msg.id = 'provider-msg';
    msg.className = 'extension-body';
    container.appendChild(msg);
  }
  msg.innerHTML = '<div class="notice"><div>' + message + '</div></div>';
  msg.style.display = 'flex';
  // hide all frames but keep them mounted
  const nodes = container.querySelectorAll('[data-provider]');
  nodes.forEach((el) => { el.style.display = 'none'; });
};

// 当前拖拽中的 provider key
let __dragKey = null;

const getTabsCollapsed = async () => {
  try {
    const { tabsCollapsed } = await chrome.storage?.local.get(['tabsCollapsed']);
    return !!tabsCollapsed;
  } catch (_) {
    return false;
  }
};
const setTabsCollapsed = async (v) => {
  try { await chrome.storage?.local.set({ tabsCollapsed: !!v }); } catch (_) {}
};

// 渲染右侧垂直导航栏
const renderProviderTabs = async (currentProviderKey, overrides = null) => {
  const tabsContainer = document.getElementById('provider-tabs');
  if (!tabsContainer) return;

  const collapsed = await getTabsCollapsed();
  tabsContainer.classList.toggle('collapsed', collapsed);

  // Clear and rebuild
  tabsContainer.innerHTML = '';

  // 1. Add Collapse/Expand toggle at top
  const header = document.createElement('div');
  header.className = 'tabs-header';
  const toggle = document.createElement('div');
  toggle.className = 'tabs-toggle';
  toggle.innerHTML = collapsed ? '«' : '»';
  toggle.title = collapsed ? 'Expand' : 'Collapse';
  toggle.onclick = async () => {
    tabsContainer.classList.toggle('collapsed');
    const nowCollapsed = tabsContainer.classList.contains('collapsed');
    toggle.innerHTML = nowCollapsed ? '«' : '»';
    toggle.title = nowCollapsed ? 'Expand' : 'Collapse';
    await chrome.storage?.local.set({ tabsCollapsed: nowCollapsed });
    // Re-render to update UI spacing
    renderProviderTabs(currentProviderKey, overrides);
  };
  header.appendChild(toggle);
  tabsContainer.appendChild(header);

  // 2. Render Providers
  const providerOrder = await getProviderOrder();
  
  // 加载自定义提供商
  const customProviders = await loadCustomProviders();
  const ALL = { ...PROVIDERS };
  customProviders.forEach((c) => { 
    ALL[c.key] = c; 
    if (!providerOrder.includes(c.key)) providerOrder.push(c.key); 
  });

  // --- DnD 辅助函数 ---
  const clearInsertClasses = () => {
    tabsContainer.querySelectorAll('button.insert-before, button.insert-after')
      .forEach((b)=>{ b.classList.remove('insert-before','insert-after'); });
  };
  const moveKeyToIndex = async (arr, key, idx) => {
    const cur = arr.slice();
    const from = cur.indexOf(key);
    if (from === -1) return arr;
    cur.splice(from, 1);
    if (idx < 0) idx = 0;
    if (idx > cur.length) idx = cur.length;
    cur.splice(idx, 0, key);
    await saveProviderOrder(cur);
    // 重新渲染，保持当前激活不变
    renderProviderTabs(currentProviderKey, overrides);
    return cur;
  };

  // 为每个提供商创建标签按钮
  providerOrder.forEach((key) => {
    const cfg = ALL[key] || PROVIDERS[key];
    if (!cfg) return;

    const button = document.createElement('button');
    button.dataset.providerId = key;
    button.title = cfg.label; // 悬停提示
    button.className = key === currentProviderKey ? 'active' : '';
    button.draggable = true; // 始终启用拖拽，在事件中检查 collapsed

    // 添加图标
    if (cfg.icon) {
      const icon = document.createElement('img');
      icon.src = cfg.icon;
      icon.alt = cfg.label;
      icon.className = 'provider-icon';
      icon.onerror = function() {
        const fallback = document.createElement('div');
        fallback.className = 'provider-icon provider-icon-fallback';
        fallback.textContent = cfg.label.charAt(0).toUpperCase();
        fallback.title = cfg.label;
        this.parentNode.replaceChild(fallback, this);
      };
      button.appendChild(icon);
    } else {
      // 如果没有图标，显示首字母
      const fallback = document.createElement('div');
      fallback.className = 'provider-icon provider-icon-fallback';
      fallback.textContent = cfg.label.charAt(0).toUpperCase();
      fallback.title = cfg.label;
      button.appendChild(fallback);
    }

    // 点击切换提供商
    button.addEventListener('click', async () => {
      const container = document.getElementById('iframe');
      const openInTab = document.getElementById('openInTab');
      
      await setProvider(key);
      const p = effectiveConfig(ALL, key, overrides);
      if (openInTab) {
        const preferred = (currentUrlByProvider && currentUrlByProvider[key]) || p.baseUrl;
        openInTab.dataset.url = preferred;
        try { openInTab.title = preferred; } catch (_) {}
      }
      // ensure DNR + host permissions for selected origin
      try { (typeof ensureAccessFor === 'function') && ensureAccessFor(p.baseUrl); } catch(_) {}

      if (p.authCheck) {
        const auth = await p.authCheck();
        if (auth.state === 'authorized') {
          await ensureFrame(container, key, p);
        } else {
          renderMessage(container, auth.message || 'Please login.');
        }
      } else {
        await ensureFrame(container, key, p);
      }

      // 更新活动状态
      renderProviderTabs(key, overrides);
      // 更新星号按钮状态
      await updateStarButtonState();
    });

    tabsContainer.appendChild(button);

    // --- 拖拽事件 ---
    button.addEventListener('dragstart', (e) => {
      // 检查当前是否折叠（实时检查）
      const isCollapsed = tabsContainer.classList.contains('collapsed');
      if (isCollapsed) {
        e.preventDefault();
        return;
      }
      __dragKey = key;
      button.classList.add('dragging');
      try {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', key);
      } catch (_) {}
    });
    button.addEventListener('dragend', () => {
      __dragKey = null;
      button.classList.remove('dragging');
      clearInsertClasses();
    });
    button.addEventListener('dragover', (e) => {
      const isCollapsed = tabsContainer.classList.contains('collapsed');
      if (isCollapsed) return;
      if (!__dragKey || __dragKey === key) return;
      e.preventDefault();
      const rect = button.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      button.classList.toggle('insert-before', before);
      button.classList.toggle('insert-after', !before);
      try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
    });
    button.addEventListener('dragleave', () => {
      button.classList.remove('insert-before','insert-after');
    });
    button.addEventListener('drop', async (e) => {
      const isCollapsed = tabsContainer.classList.contains('collapsed');
      if (isCollapsed) return;
      if (!__dragKey || __dragKey === key) return;
      e.preventDefault();
      const rect = button.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      const fromIdx = providerOrder.indexOf(__dragKey);
      const toIdxBase = providerOrder.indexOf(key);
      if (fromIdx === -1 || toIdxBase === -1) return;
      let insertIdx = before ? toIdxBase : toIdxBase + 1;
      // 调整因移除后的索引偏移
      if (fromIdx < insertIdx) insertIdx -= 1;
      await moveKeyToIndex(providerOrder, __dragKey, insertIdx);
      __dragKey = null;
    });
  });

  // 展开时：使用 sticky 置顶（CSS 负责），不覆盖第一个图标

  if (typeof window.__aisbUpdateLeftSidebar === 'function') {
    window.__aisbUpdateLeftSidebar(currentProviderKey);
  }
};

const initializeBar = async () => {
  const container = document.getElementById('iframe');
  const openInTab = document.getElementById('openInTab');

  const currentProviderKey = await getProvider();
  const overrides = await getOverrides();
  const mergedCurrent = effectiveConfig(PROVIDERS, currentProviderKey, overrides) || (PROVIDERS[currentProviderKey] || PROVIDERS.chatgpt);

  // 渲染右侧导航栏
  await renderProviderTabs(currentProviderKey, overrides);

  // Provider tabs hover auto-collapse
  (() => {
    const tabs = document.getElementById('provider-tabs');
    if (!tabs) return;

    let collapseTimer = null;
    let expandTimer = null;
    const COLLAPSE_DELAY = 600;
    const EXPAND_DELAY = 200;
    let isDragging = false; // 拖拽中禁用自动折叠

    // 监听拖拽开始/结束事件（从 renderProviderTabs 中触发）
    tabs.addEventListener('dragstart', () => { isDragging = true; });
    tabs.addEventListener('dragend', () => { isDragging = false; });

    tabs.addEventListener('mouseenter', () => {
      if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null; }
      expandTimer = setTimeout(async () => {
        expandTimer = null;
        if (tabs.classList.contains('collapsed')) {
          tabs.classList.remove('collapsed');
          const toggle = tabs.querySelector('.tabs-toggle');
          if (toggle) { toggle.innerHTML = '»'; toggle.title = 'Collapse'; }
        }
      }, EXPAND_DELAY);
    });

    tabs.addEventListener('mouseleave', () => {
      if (expandTimer) { clearTimeout(expandTimer); expandTimer = null; }
      // 拖拽中不触发自动折叠
      if (isDragging) return;
      collapseTimer = setTimeout(async () => {
        collapseTimer = null;
        if (!tabs.classList.contains('collapsed')) {
          tabs.classList.add('collapsed');
          const toggle = tabs.querySelector('.tabs-toggle');
          if (toggle) { toggle.innerHTML = '«'; toggle.title = 'Expand'; }
        }
      }, COLLAPSE_DELAY);
    });
  })();

  // Left sidebar: NotebookLM tab toggle strip
  (() => {
    const leftSidebar = document.getElementById('left-sidebar');
    if (!leftSidebar) return;

    let tabsVisible = false;

    function sendMsg(msg) {
      const frame = cachedFrames['notebooklm'];
      if (frame && frame.contentWindow) {
        try { frame.contentWindow.postMessage(msg, '*'); } catch (_) {}
        return;
      }
      const container = document.getElementById('iframe');
      if (!container) return;
      const iframes = container.querySelectorAll('iframe');
      if (iframes[0] && iframes[0].contentWindow) {
        try { iframes[0].contentWindow.postMessage(msg, '*'); } catch (_) {}
      }
    }

    function buildLeftSidebar(providerKey) {
      leftSidebar.innerHTML = '';
      leftSidebar.classList.remove('has-items');
      tabsVisible = false;
    }

    buildLeftSidebar(currentProviderKey);

    window.__aisbUpdateLeftSidebar = buildLeftSidebar;
  })();

  // helper: request host permission for a provider URL and add DNR rule
  const ensureAccessFor = (url) => {
    let origin = null;
    try { origin = new URL(url).origin; } catch (_) {}
    if (!origin) return;
    try {
      if (chrome.permissions && chrome.permissions.request) {
        chrome.permissions.request({ origins: [origin + '/*'] }, () => {
          try { chrome.runtime.sendMessage({ type: 'ai-add-host', origin }); } catch (_) {}
        });
      } else {
        try { chrome.runtime.sendMessage({ type: 'ai-add-host', origin }); } catch (_) {}
      }
    } catch (_) {}
  };

  // The rest of this function is now handled by renderProviderTabs
  // No need to build a separate list of providers here.

  if (openInTab) {
    const preferred = currentUrlByProvider[currentProviderKey] || mergedCurrent.baseUrl;
    openInTab.dataset.url = preferred;
    try { openInTab.title = preferred; } catch (_) {}
    // 初始化星号按钮状态
    await updateStarButtonState();

    // Open the current provider URL in a new tab
    openInTab.addEventListener('click', async (e) => {
      try {
        e.preventDefault();
      } catch (_) {}
      const url = openInTab.dataset.url || preferred || mergedCurrent.baseUrl;
      try { window.open(url, '_blank'); } catch (_) {}
    });
  }


  // History button handler
  try {
    const hBtn = document.getElementById('historyBtn');
    const panel = document.getElementById('historyPanel');
    const ensureBackdrop = () => {
      let bd = document.getElementById('historyBackdrop');
      if (!bd) {
        bd = document.createElement('div');
        bd.id = 'historyBackdrop';
        bd.className = 'history-backdrop';
        bd.addEventListener('click', () => hideHistoryPanel());
        // Attach under the same stacking context as the panel to guarantee panel stays above
        const parent = panel.parentNode || document.body;
        parent.appendChild(bd);
      }
      return bd;
    };
    const removeBackdrop = () => {
      const bd = document.getElementById('historyBackdrop');
      if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
    };
    const showHistoryPanel = async () => {
      await renderHistoryPanel();
      panel.style.display = 'block';
      ensureBackdrop();
    };
    const hideHistoryPanel = () => {
      panel.style.display = 'none';
      removeBackdrop();
    };
    window.hideHistoryPanel = hideHistoryPanel; // expose for other handlers if needed
    window.showHistoryPanel = showHistoryPanel;

    if (hBtn && panel) {
      hBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = panel.style.display === 'block';
        // Hide other panels
        document.getElementById('favoritesPanel').style.display = 'none';
        document.getElementById('exporterPanel').style.display = 'none';
        document.getElementById('favoritesBackdrop')?.remove();
        
        if (isVisible) {
          panel.style.display = 'none';
          document.getElementById('historyBackdrop')?.remove();
        } else {
          panel.style.display = 'block';
          renderHistoryPanel();
          const bd = ensureBackdrop();
          bd.addEventListener('click', () => {
            panel.style.display = 'none';
            bd.remove();
          }, { once: true });
        }
      });
    }

    // Close with Escape
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') hideHistoryPanel(); }, true);
  } catch (_) {}

  // Favorites button handler
  try {
    const fBtn = document.getElementById('favoritesBtn');
    const panel = document.getElementById('favoritesPanel');
    const isTyping = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = (el.tagName||'').toLowerCase();
      return tag === 'input' || tag === 'textarea' || !!el.isContentEditable;
    };
    const starCurrentAndOpenRename = async () => {
      try {
        const a = document.getElementById('openInTab');
        const href = a && a.href;
        const provider = (await getProvider())||'chatgpt';
        if (href) {
          __pendingFavInlineEditUrl = href;
          __pendingFavCloseOnEnter = true;
          const suggested = (currentTitleByProvider[provider] || document.title || '').trim();
          await addFavorite({ url: href, provider, title: suggested, needsTitle: true });
          return true;
        }
      } catch (_) {}
      return false;
    };
    const ensureBackdrop = () => {
      let bd = document.getElementById('favoritesBackdrop');
      if (!bd) {
        bd = document.createElement('div');
        bd.id = 'favoritesBackdrop';
        bd.className = 'favorites-backdrop';
        bd.addEventListener('click', () => hideFavoritesPanel());
        const parent = panel.parentNode || document.body;
        parent.appendChild(bd);
      }
      return bd;
    };
    const removeBackdrop = () => {
      const bd = document.getElementById('favoritesBackdrop');
      if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
    };
    const showFavoritesPanel = async () => {
      await renderFavoritesPanel();
      panel.style.display = 'block';
      ensureBackdrop();
    };
    const hideFavoritesPanel = () => {
      panel.style.display = 'none';
      removeBackdrop();
    };
    window.hideFavoritesPanel = hideFavoritesPanel;
    window.showFavoritesPanel = showFavoritesPanel;

    if (fBtn && panel) {
      // Click Favorites button to toggle favorites panel (show all starred items)
      fBtn.addEventListener('click', async () => {
        if (panel.style.display === 'none' || !panel.style.display) {
          await showFavoritesPanel();
        } else {
          hideFavoritesPanel();
        }
      });
    }

    // Global keyboard shortcut to star current page (customizable)
    let __starShortcut = null;
    (async () => {
      __starShortcut = await getStarShortcut();
    })();
    
    document.addEventListener('keydown', async (e) => {
      try {
        if (!__starShortcut) return;
        if (matchesShortcut(e, __starShortcut)) {
          // Check if user is typing in input/textarea
          const el = document.activeElement;
          const tag = (el && el.tagName) ? el.tagName.toLowerCase() : '';
          if (tag === 'input' || tag === 'textarea') return; // Allow typing in inputs
          
          e.preventDefault();
          e.stopPropagation();
          
          // Star current page - trigger the star button click
          const starBtn = document.getElementById('starBtn');
          if (starBtn) starBtn.click();
        }
      } catch (_) {}
    }, true);

    // Close with Escape
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') hideFavoritesPanel(); }, true);
  } catch (_) {}

  // Exporter button handler
  try {
    const eBtn = document.getElementById('exportBtn');
    const panel = document.getElementById('exporterPanel');
    const statusEl = document.getElementById('ep-status');
    
    const updateStatus = (msg, type = 'info') => {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.className = `ep-status ${type}`;
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

    const loadHistoryCount = async () => {
      try {
        const result = await chrome.storage.local.get('ai_chat_conversations');
        const count = (result.ai_chat_conversations || []).length;
        const countEl = document.getElementById('ep-history-count');
        if (countEl) countEl.textContent = count;
      } catch (err) { dbg('Load export history count failed', err); }
    };

    eBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = panel.style.display === 'block';
      // Hide other panels
      document.getElementById('historyPanel').style.display = 'none';
      document.getElementById('favoritesPanel').style.display = 'none';
      document.getElementById('historyBackdrop')?.remove();
      document.getElementById('favoritesBackdrop')?.remove();

      if (isVisible) {
        panel.style.display = 'none';
      } else {
        panel.style.display = 'block';
        loadHistoryCount();
        updateStatus('', 'info');
      }
    });

    document.getElementById('ep-close')?.addEventListener('click', () => {
      panel.style.display = 'none';
    });

    // Handle export responses from iframe
    window.addEventListener('message', async (event) => {
      const data = event.data || {};
      
      // Quick Export Response
      if (data.type === 'AI_SIDEBAR_EXPORT_RESPONSE') {
        if (data.error) {
          updateStatus(`Error: ${data.error}`, 'error');
        } else if (data.result) {
          const result = data.result;
          downloadFile(result.filename, result.content, data.format === 'markdown' ? 'text/markdown' : 'application/json');
          updateStatus(`✓ Exported ${result.count || result.data?.messageCount} messages`, 'success');
        }
      }

      // Save & Export Response
      if (data.type === 'AI_SIDEBAR_SAVE_EXPORT_RESPONSE') {
        if (data.error) {
          updateStatus(`Error: ${data.error}`, 'error');
        } else if (data.result) {
          const result = data.result;
          downloadFile(result.filename, result.content, 'text/markdown');
          let msg = `✓ Exported ${result.count} messages`;
          if (data.saved) msg = `✓ Saved & ${msg}`;
          if (data.warning) msg += ` (${data.warning})`;
          updateStatus(msg, 'success');
          loadHistoryCount();
        }
      }

      // Confirm Update (Duplicate check from iframe)
      if (data.type === 'AI_SIDEBAR_CONFIRM_UPDATE') {
        const { duplicate, result } = data;
        if (confirm(`This conversation already exists in history:\n"${duplicate.title}"\n\nDo you want to update it?`)) {
          const provider = getProviderSync(); // We need a sync version or a stored one
          const frame = cachedFrames[provider];
          if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage({
              type: 'AI_SIDEBAR_SAVE_EXPORT_CONFIRMED',
              result: result
            }, '*');
          }
        } else {
          updateStatus('Save cancelled.', 'info');
        }
      }
      
      // Save to Library Response (from sidebar button)
      if (data.type === 'AI_SIDEBAR_SAVE_TO_LIBRARY_RESPONSE') {
        const isSilent = Boolean(data.meta?.silent);
        if (data.error) {
          const providerKey = String(data.meta?.provider || '');
          if (providerKey) getAutoSaveState(providerKey).inFlight = false;
          if (!isSilent) updateStatus(`Error: ${data.error}`, 'error');
        } else if (data.data) {
          try {
            const convData = {
              ...data.data,
              content: data.content,
              timestamp: Date.now(),
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            const providerKey = String(convData.provider || data.meta?.provider || '');
            if (providerKey) {
              const state = getAutoSaveState(providerKey);
              state.inFlight = false;
              state.href = String(convData.url || state.href || '');
              state.title = String(convData.title || state.title || '');

              if (!canAutoSaveConversation(providerKey, state.href, state.title)) {
                return;
              }

              const fingerprint = buildAutoSaveFingerprint(convData);
              if (isSilent && fingerprint && fingerprint === state.lastFingerprint) {
                return;
              }

              state.lastMessageCount = Number(convData.messageCount || convData.messages?.length || 0);
              state.lastConversationId = String(convData.conversationId || '');
              state.lastFingerprint = fingerprint;
            }
            if (typeof window.ChatHistoryDB?.saveConversation === 'function') {
              await window.ChatHistoryDB.saveConversation(convData);
              if (!isSilent) updateStatus(`✓ Saved to library`, 'success');
            } else {
              if (!isSilent) updateStatus('Storage not available', 'error');
            }
          } catch (err) {
            const providerKey = String(data.data?.provider || data.meta?.provider || '');
            if (providerKey) getAutoSaveState(providerKey).inFlight = false;
            if (!isSilent) updateStatus(`Error: ${err.message}`, 'error');
          }
        }
      }
      
      // Save to Library (from Option+S panel on page)
      if (data.type === 'AI_SIDEBAR_SAVE_TO_LIBRARY') {
        try {
          const convData = {
            ...data.data,
            content: data.content,
            timestamp: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          
          if (typeof window.ChatHistoryDB?.saveConversation === 'function') {
            await window.ChatHistoryDB.saveConversation(convData);
            console.log('[AI Sidebar] Conversation saved to library');
          } else {
            console.error('[AI Sidebar] ChatHistoryDB not available');
          }
        } catch (err) {
          console.error('[AI Sidebar] Save to library error:', err);
        }
      }
    });

    // Helper to get provider without await in event listeners
    let __currentProviderSync = 'chatgpt';
    const updateProviderSync = async () => { __currentProviderSync = await getProvider(); };
    const getProviderSync = () => __currentProviderSync;
    updateProviderSync();

    const showExporterPanelInCurrentFrame = async () => {
      const provider = await getProvider();
      await updateProviderSync();
      const frame = cachedFrames[provider];
      if (!frame || !frame.contentWindow) {
        updateStatus('No active chat found.', 'error');
        return;
      }
      frame.contentWindow.postMessage({ type: 'AISB_SHOW_EXPORT_PANEL' }, '*');
    };

    document.addEventListener('keydown', (e) => {
      try {
        if (!(e.metaKey || e.ctrlKey)) return;
        if (e.shiftKey || e.altKey || e.key.toLowerCase() !== 's') return;
        e.preventDefault();
        e.stopPropagation();
        showExporterPanelInCurrentFrame();
      } catch (_) {}
    }, true);

    const runExport = async (format) => {
      updateStatus(`Exporting as ${format}...`, 'info');
      try {
        const provider = await getProvider();
        await updateProviderSync();
        const frame = cachedFrames[provider];
        if (!frame || !frame.contentWindow) {
          updateStatus('No active chat found.', 'error');
          return;
        }

        // Send export request to iframe
        frame.contentWindow.postMessage({
          type: 'AI_SIDEBAR_EXPORT_REQUEST',
          format: format
        }, '*');
      } catch (err) {
        updateStatus(`Error: ${err.message}`, 'error');
        dbg('Export error', err);
      }
    };

    document.getElementById('ep-export-markdown')?.addEventListener('click', () => runExport('markdown'));
    document.getElementById('ep-export-json')?.addEventListener('click', () => runExport('json'));
    
    // Save to Library button in sidebar
    document.getElementById('ep-save-to-library')?.addEventListener('click', async () => {
      updateStatus('Saving to library...', 'info');
      try {
        const provider = await getProvider();
        await updateProviderSync();
        const frame = cachedFrames[provider];
        if (!frame || !frame.contentWindow) {
          updateStatus('No active chat found.', 'error');
          return;
        }

        // Request export data from iframe, then save locally
        frame.contentWindow.postMessage({
          type: 'AI_SIDEBAR_SAVE_TO_LIBRARY_REQUEST'
        }, '*');
      } catch (err) {
        updateStatus(`Error: ${err.message}`, 'error');
      }
    });
    
    document.getElementById('ep-view-history')?.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('history/history.html') });
    });

    document.getElementById('ep-save-export')?.addEventListener('click', async () => {
      updateStatus('Saving to history...', 'info');
      try {
        const provider = await getProvider();
        await updateProviderSync();
        const frame = cachedFrames[provider];
        if (!frame || !frame.contentWindow) {
          updateStatus('No active chat found.', 'error');
          return;
        }

        // Send save & export request to iframe
        frame.contentWindow.postMessage({
          type: 'AI_SIDEBAR_SAVE_EXPORT_REQUEST'
        }, '*');
      } catch (err) {
        updateStatus(`Error: ${err.message}`, 'error');
      }
    });

  } catch (e) { dbg('Exporter btn init error', e); }

  // Star button handler - toggle star for current page
  try {
    const starBtn = document.getElementById('starBtn');
    if (starBtn) {
      starBtn.addEventListener('click', async () => {
        try {
          const openInTab = document.getElementById('openInTab');
          const href = openInTab && openInTab.dataset.url;
          const provider = (await getProvider()) || 'chatgpt';
          
          if (!href || href === '#') return;
          
          // Check if already starred (normalize for comparison)
          const normalizedHref = normalizeUrlForMatch(href);
          const favList = await loadFavorites();
          const isStarred = (favList || []).some(fav => normalizeUrlForMatch(fav.url) === normalizedHref);
          
          if (isStarred) {
            // Unstar: remove from favorites (use normalized comparison)
            const filtered = favList.filter(fav => normalizeUrlForMatch(fav.url) !== normalizedHref);
            await saveFavorites(filtered);
          } else {
            // Star: add to favorites
            const suggested = (currentTitleByProvider[provider] || document.title || '').trim();
            await addFavorite({ url: href, provider, title: suggested, needsTitle: false });
          }
          
          // Update star button state
          await updateStarButtonState();
          
          // If History panel is open, update it to show new star state
          try {
            const historyPanel = document.getElementById('historyPanel');
            if (historyPanel && historyPanel.style.display !== 'none') {
              await renderHistoryPanel();
            }
          } catch (_) {}
        } catch (err) {
          console.error('Error toggling star:', err);
        }
      });
    }
  } catch (_) {}

  // (Shortcuts button removed)

  // Parallel Panel button handler (replaces Settings)
  // State for sidebar-embedded parallel panels
  let sidebarParallelPanels = [];
  let sidebarPanelCounter = 0;
  
  // Create parallel panel inside sidebar
  function createSidebarParallelPanel(providerKey) {
    const mainContent = document.getElementById('main-content');
    const iframeContainer = document.getElementById('iframe');
    if (!mainContent || !iframeContainer) return;
    
    // First time: create wrapper and switch to flex layout
    let wrapper = document.getElementById('parallel-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'parallel-wrapper';
      wrapper.style.cssText = 'display:flex;flex-direction:column;position:absolute;inset:0;z-index:1;';
      
      // Move iframe container into wrapper
      iframeContainer.style.position = 'relative';
      iframeContainer.style.inset = 'auto';
      iframeContainer.style.flex = '1';
      
      mainContent.appendChild(wrapper);
      wrapper.appendChild(iframeContainer);
    }
    
    sidebarPanelCounter++;
    const panelId = `sidebar-parallel-${sidebarPanelCounter}`;
    const provider = PROVIDERS[providerKey] || PROVIDERS.chatgpt;
    
    // Create panel element
    const panel = document.createElement('div');
    panel.id = panelId;
    panel.className = 'sidebar-parallel-panel';
    panel.innerHTML = `
      <div class="spp-header">
        <span class="spp-title">🪟 并行 ${sidebarPanelCounter}</span>
        <div class="spp-actions">
          <select class="spp-select" data-panel-id="${panelId}">
            ${Object.entries(PROVIDERS).map(([k, p]) => 
              `<option value="${k}" ${k === providerKey ? 'selected' : ''}>${p.label}</option>`
            ).join('')}
          </select>
          <button class="spp-btn spp-add" title="新开窗口">+</button>
          <button class="spp-btn spp-close" title="关闭">✕</button>
        </div>
      </div>
      <div class="spp-content">
        <iframe class="spp-iframe" src="${provider.iframeUrl}"></iframe>
      </div>
    `;
    
    // Create resizer handle
    const resizer = document.createElement('div');
    resizer.className = 'spp-resizer';
    resizer.innerHTML = '<div class="spp-resizer-line"></div>';
    
    // Insert panel and resizer
    wrapper.insertBefore(panel, iframeContainer);
    wrapper.insertBefore(resizer, iframeContainer);
    sidebarParallelPanels.push({ id: panelId, element: panel, resizer: resizer });
    
    // Setup resizer drag
    setupResizer(resizer, panel);
    
    // Adjust layout
    updateSidebarLayout();
    
    // Bind events
    const select = panel.querySelector('.spp-select');
    const addBtn = panel.querySelector('.spp-add');
    const closeBtn = panel.querySelector('.spp-close');
    const iframe = panel.querySelector('.spp-iframe');
    
    select.addEventListener('change', () => {
      const newProvider = PROVIDERS[select.value];
      if (newProvider) iframe.src = newProvider.iframeUrl;
    });
    
    addBtn.addEventListener('click', () => {
      createSidebarParallelPanel(select.value);
    });
    
    closeBtn.addEventListener('click', () => {
      panel.remove();
      resizer.remove();
      sidebarParallelPanels = sidebarParallelPanels.filter(p => p.id !== panelId);
      updateSidebarLayout();
    });
  }
  
  // Setup resizer drag functionality - direct drag, no lock needed
  function setupResizer(resizer, panel) {
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;
    
    // 直接拖动，无需点击解锁
    resizer.addEventListener('mousedown', (e) => {
      startY = e.clientY;
      startHeight = panel.offsetHeight;
      isResizing = true;
      resizer.classList.add('active');
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      // 禁用 iframe 的 pointer events，防止拖动时被 iframe 捕获
      document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'none');
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const deltaY = e.clientY - startY;
      const newHeight = Math.max(100, Math.min(window.innerHeight * 0.7, startHeight + deltaY));
      panel.style.height = newHeight + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizer.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        // 恢复 iframe 的 pointer events
        document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = '');
      }
    });
  }
  
  // Update sidebar layout when panels change
  function updateSidebarLayout() {
    const iframeContainer = document.getElementById('iframe');
    const wrapper = document.getElementById('parallel-wrapper');
    if (!iframeContainer) return;
    
    const panelCount = sidebarParallelPanels.length;
    if (panelCount === 0) {
      // No panels - restore original layout if wrapper exists
      if (wrapper) {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.appendChild(iframeContainer);
          wrapper.remove();
          iframeContainer.style.position = 'absolute';
          iframeContainer.style.inset = '0';
          iframeContainer.style.flex = '';
        }
      }
    } else {
      // Set panel heights - each panel gets equal share up to 50% of viewport
      const maxPanelHeight = Math.floor(window.innerHeight * 0.4 / panelCount);
      const panelHeight = Math.min(250, Math.max(150, maxPanelHeight));
      sidebarParallelPanels.forEach(p => {
        p.element.style.height = panelHeight + 'px';
        p.element.style.flexShrink = '0';
      });
    }
  }
  
  // Show position selection modal
  function showParallelPositionModal(currentProvider, tab) {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    
    modal.innerHTML = `
      <div class="settings-modal-backdrop"></div>
      <div class="settings-modal-content" style="max-width: 300px;">
        <div class="settings-header">
          <h2>选择窗口位置</h2>
          <button class="settings-close-btn" title="Close">&times;</button>
        </div>
        <div class="settings-body" style="display: flex; gap: 16px; justify-content: center; padding: 24px;">
          <button id="parallel-left-btn" class="parallel-pos-btn" style="
            padding: 20px 30px;
            font-size: 16px;
            border: 1px solid #d1d5db;
            background: #f9fafb;
            color: #374151;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
          ">⬅️ 左边<br><small>浮动窗口</small></button>
          <button id="parallel-right-btn" class="parallel-pos-btn" style="
            padding: 20px 30px;
            font-size: 16px;
            border: 1px solid #d1d5db;
            background: #f9fafb;
            color: #374151;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
          ">➡️ 右边<br><small>侧边栏内</small></button>
        </div>
      </div>
    `;
    
    modal.style.display = 'flex';
    
    const closeBtn = modal.querySelector('.settings-close-btn');
    const backdrop = modal.querySelector('.settings-modal-backdrop');
    const leftBtn = modal.querySelector('#parallel-left-btn');
    const rightBtn = modal.querySelector('#parallel-right-btn');
    
    const closeModal = () => { modal.style.display = 'none'; };
    
    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    
    // Left: floating window on main page
    leftBtn.addEventListener('click', async () => {
      closeModal();
      await openLeftParallelPanel(currentProvider, tab);
    });
    
    // Right: embedded in sidebar
    rightBtn.addEventListener('click', () => {
      closeModal();
      createSidebarParallelPanel(currentProvider);
    });
  }
  
  // Open left (floating) parallel panel
  async function openLeftParallelPanel(currentProvider, tab) {
    const url = tab.url || '';
    if (url.startsWith('chrome://') || url.startsWith('edge://') || 
        url.startsWith('about:') || url.startsWith('chrome-extension://')) {
      alert('无法在此页面打开浮动窗口。请选择"右边"在侧边栏内打开。');
      return;
    }
    
    // Request permission if needed
    const origin = new URL(url).origin + '/*';
    try {
      const hasPermission = await chrome.permissions.contains({ origins: [origin] });
      if (!hasPermission) {
        const granted = await chrome.permissions.request({ origins: [origin] });
        if (!granted) return;
      }
    } catch (_) {}
    
    // Send message or inject script
    try {
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'toggleParallelPanel',
        provider: currentProvider 
      });
    } catch (_) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/parallel-panel.js']
        });
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tab.id, { 
              action: 'toggleParallelPanel',
              provider: currentProvider 
            });
          } catch (e) {}
        }, 150);
      } catch (injectErr) {
        alert('无法注入脚本。请选择"右边"在侧边栏内打开。');
      }
    }
  }
  
  try {
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.textContent = '🪟 并行';
      settingsBtn.title = 'Open parallel AI window';
      
      settingsBtn.addEventListener('click', async () => {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const currentProvider = await getProvider();
          showParallelPositionModal(currentProvider, tab);
        } catch (err) {
          console.error('[AISidebar] Error:', err);
        }
      });
    }
  } catch (_) {}

  try { (typeof ensureAccessFor === 'function') && ensureAccessFor(mergedCurrent.baseUrl); } catch(_) {}

  // Helper: cycle provider by direction (-1 prev, +1 next)
  const cycleProvider = async (dir) => {
    try {
      const container = document.getElementById('iframe');
      const openInTab = document.getElementById('openInTab');
      const btns = Array.from(document.querySelectorAll('#provider-tabs button[data-provider-id]'));
      const order = btns.map(b => b.dataset.providerId).filter(Boolean);
      if (!order.length) return;
      const cur = await getProvider();
      let idx = order.indexOf(cur);
      if (idx < 0) idx = 0;
      const nextIdx = (idx + (dir || 1) + order.length) % order.length;
      const nextKey = order[nextIdx];
      const overridesNow = await getOverrides();
      const customProviders = await loadCustomProviders();
      const ALL = { ...PROVIDERS };
      (customProviders || []).forEach((c) => { ALL[c.key] = c; });
      const p = effectiveConfig(ALL, nextKey, overridesNow);
      await setProvider(nextKey);
      if (openInTab) {
        const preferred = (currentUrlByProvider && currentUrlByProvider[nextKey]) || p.baseUrl;
        openInTab.dataset.url = preferred;
        try { openInTab.title = preferred; } catch (_) {}
      }
      try {
        const origin = new URL(p.baseUrl || p.iframeUrl || '').origin;
        if (origin) chrome.runtime.sendMessage({ type: 'ai-add-host', origin });
      } catch (_) {}
      // Avoid focusing inside the frame so Tab stays captured by the panel
      __suppressNextFrameFocus = true;
      if (p.authCheck) {
        const auth = await p.authCheck();
        if (auth.state === 'authorized') {
          await ensureFrame(container, nextKey, p);
        } else {
          renderMessage(container, auth.message || 'Please login.');
        }
      } else {
        await ensureFrame(container, nextKey, p);
      }
      // Reset suppression and bring focus back to the panel container
      __suppressNextFrameFocus = false;
      renderProviderTabs(nextKey, overridesNow);
      try {
        const tabsEl = document.getElementById('provider-tabs');
        if (tabsEl) { tabsEl.tabIndex = -1; tabsEl.focus(); }
        else if (document && document.body && document.body.focus) { document.body.focus(); }
      } catch (_) {}
    } catch (_) {}
  };
  try { window.__AIPanelCycleProvider = cycleProvider; } catch (_) {}

  // Global keyboard shortcut to star current page (customizable, default: Ctrl+L)
  let __starShortcut = null;
  (async () => {
    __starShortcut = await getStarShortcut();
    dbg('Star shortcut loaded:', __starShortcut);
  })();

  document.addEventListener('keydown', async (e) => {
    try {
      if (!__starShortcut) return;
      if (matchesShortcut(e, __starShortcut)) {
        // Check if user is typing in input/textarea
        const el = document.activeElement;
        const tag = (el && el.tagName) ? el.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea') return; // Allow typing in inputs
        
        e.preventDefault();
        e.stopPropagation();
        
        // Star current page - trigger the star button click
        const starBtn = document.getElementById('starBtn');
        if (starBtn) {
          starBtn.click();
          dbg('Page starred via keyboard shortcut');
        }
      }
    } catch (_) {}
  }, true);

  // Keyboard: Tab to cycle providers (Shift+Tab reverse)
  try {
    document.addEventListener('keydown', async (e) => {
      try {
        if (e.key !== 'Tab') return;
        // Force-bind Tab to provider switching within the side panel
        e.preventDefault();
        e.stopPropagation();
        const dir = e.shiftKey ? -1 : 1;
        await cycleProvider(dir);
      } catch (_) {}
    }, true);
  } catch (_) {}

  // Global keyboard shortcuts for toolbar buttons
  let __buttonShortcuts = await getButtonShortcuts();
  document.addEventListener('keydown', async (e) => {
    try {
      const el = document.activeElement;
      const tag = (el && el.tagName) ? el.tagName.toLowerCase() : '';
      // Don't trigger shortcuts when typing in inputs
      if (tag === 'input' || tag === 'textarea') return;
      
      const isShortcutMatch = (shortcut) => {
        return e.key.toLowerCase() === shortcut.key.toLowerCase() &&
               e.ctrlKey === shortcut.ctrl &&
               e.shiftKey === shortcut.shift &&
               e.altKey === shortcut.alt;
      };
      
      // Check Open in Tab
      if (isShortcutMatch(__buttonShortcuts.openInTab)) {
        e.preventDefault();
        const btn = document.getElementById('openInTab');
        if (btn) btn.click();
        return;
      }
      
      // Check Search
      if (isShortcutMatch(__buttonShortcuts.searchBtn)) {
        e.preventDefault();
        const btn = document.getElementById('searchBtn');
        if (btn) btn.click();
        return;
      }
      
      // Check History
      if (isShortcutMatch(__buttonShortcuts.historyBtn)) {
        e.preventDefault();
        const btn = document.getElementById('historyBtn');
        if (btn) btn.click();
        return;
      }
      
      // Check Export
      if (isShortcutMatch(__buttonShortcuts.exportBtn)) {
        e.preventDefault();
        const btn = document.getElementById('exportBtn');
        if (btn) btn.click();
        return;
      }
      
      // Check Starred
      if (isShortcutMatch(__buttonShortcuts.favoritesBtn)) {
        e.preventDefault();
        const btn = document.getElementById('favoritesBtn');
        if (btn) btn.click();
        return;
      }
      
      // Shift+Cmd+L: Open left floating parallel panel
      if (e.shiftKey && e.metaKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        (async () => {
          try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentProvider = await getProvider();
            await openLeftParallelPanel(currentProvider, tab);
          } catch (err) {
            console.error('[AISidebar] Error opening parallel panel:', err);
          }
        })();
        return;
      }
    } catch (_) {}
  }, true);

  // Listen for shortcut updates in settings
  try {
    window.addEventListener('storage', async (e) => {
      if (e.key === 'buttonShortcuts') {
        __buttonShortcuts = await getButtonShortcuts();
      }
    });
  } catch (_) {}

  // Initial render
  if (mergedCurrent.authCheck) {
    const auth = await mergedCurrent.authCheck();
    if (auth.state === 'authorized') {
      await ensureFrame(container, currentProviderKey, mergedCurrent);
    } else {
      renderMessage(container, auth.message || 'Please login.');
    }
  } else {
    await ensureFrame(container, currentProviderKey, mergedCurrent);
  }

  // removed keyboard command & navigation for menu
  // (keyboard command & navigation removed)
};

// (Global command message listener removed)

const AUTO_SAVE_INTERVAL_MS = 12000;
const AUTO_SAVE_DEBOUNCE_MS = 1800;
const autoSaveStateByProvider = Object.create(null);

function buildAutoSaveFingerprint(conversation) {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const messageCount = Number(conversation?.messageCount || messages.length || 0);
  const stableKey = String(conversation?.conversationId || conversation?.url || '');
  const lastMessage = messages[messages.length - 1] || null;
  const lastRole = String(lastMessage?.role || '').trim();
  const lastContent = String(lastMessage?.content || '').trim();
  const lastTail = lastContent.slice(-120);
  return `${stableKey}|${messageCount}|${lastRole}|${lastContent.length}|${lastTail}|${conversation?.title || ''}`;
}

function getAutoSaveState(provider) {
  if (!autoSaveStateByProvider[provider]) {
    autoSaveStateByProvider[provider] = {
      timer: null,
      inFlight: false,
      title: '',
      href: '',
      lastMessageCount: 0,
      lastConversationId: '',
      lastFingerprint: ''
    };
  }
  return autoSaveStateByProvider[provider];
}

function canAutoSaveConversation(provider, href, title) {
  if (typeof window.AutoSync?.isUsefulConversationTitle !== 'function') return false;
  if (typeof window.AutoSync?.hasStableConversationUrl !== 'function') return false;
  return (
    window.AutoSync.isUsefulConversationTitle(title) &&
    window.AutoSync.hasStableConversationUrl(href, provider)
  );
}

function requestSilentSaveToLibrary(provider) {
  const state = getAutoSaveState(provider);
  if (state.inFlight) return;

  const frame = cachedFrames[provider];
  if (!frame || !frame.contentWindow) return;

  state.inFlight = true;
  frame.contentWindow.postMessage({
    type: 'AI_SIDEBAR_SAVE_TO_LIBRARY_REQUEST',
    meta: {
      silent: true,
      provider
    }
  }, '*');
}

function scheduleSilentSave(provider, delay = AUTO_SAVE_DEBOUNCE_MS) {
  const state = getAutoSaveState(provider);
  clearTimeout(state.timer);

  if (!canAutoSaveConversation(provider, state.href, state.title)) return;
  state.timer = setTimeout(() => requestSilentSaveToLibrary(provider), delay);
}

// Also close panel on Escape (backdrop version handles outside clicks)
try {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    try { const p = document.getElementById('historyPanel'); if (p) p.style.display = 'none'; } catch (_) {}
    try { document.getElementById('historyBackdrop')?.remove(); } catch (_) {}
  }, true);
} catch (_) {}

  // Listen for URL updates from content scripts inside provider iframes
  window.addEventListener('message', async (event) => {
    try {
      const data = event.data || {};
      if (!data || !data.type) return;
      if (data.type === 'ai-tab-cycle') {
        const dir = (data.dir === 'prev') ? -1 : 1;
        // When message comes from iframe, don't focus the frame after switching
        __suppressNextFrameFocus = true;
        try { if (window.__AIPanelCycleProvider) window.__AIPanelCycleProvider(dir); } catch (_) {}
        __suppressNextFrameFocus = false;
        return;
      }
      if (data.type !== 'ai-url-changed') return;

    // Find which provider frame this message came from by comparing contentWindow
    let matchedKey = null;
    for (const [key, el] of Object.entries(cachedFrames)) {
      try {
        if (el && el.contentWindow === event.source) {
          matchedKey = key;
          break;
        }
      } catch (_) {}
    }
    // No provider matched; ignore stray messages
    if (!matchedKey) { return; }

    // Update current URL for this provider
    if (typeof data.href === 'string' && data.href) {
      // Ignore Gemini internal utility frames to avoid polluting state
      try {
        const u = new URL(data.href);
        if (u.hostname === 'gemini.google.com' && (u.pathname === '/_/' || u.pathname.startsWith('/_/'))) {
          return;
        }
      } catch (_) {}
      currentUrlByProvider[matchedKey] = data.href;
      getAutoSaveState(matchedKey).href = data.href;
      // Save URL for restoration on next open
      saveProviderUrl(matchedKey, data.href);

      // If this provider is currently visible, update the Open in Tab link
      const openInTab = document.getElementById('openInTab');
      const visible = (cachedFrames[matchedKey] && cachedFrames[matchedKey].style.display !== 'none');
      if (openInTab && visible) {
        openInTab.dataset.url = data.href;
        try { openInTab.title = data.href; } catch (_) {}
        // 更新星号按钮状态
        await updateStarButtonState();
      }

      // Auto-save history for supported providers when a deep link is detected
      try {
        if (isDeepLink(matchedKey, data.href)) {
          addHistory({ url: data.href, provider: matchedKey, title: data.title || '' });
        }
      } catch (_) {}
      // Track last known title for this provider for better Add Current defaults
      try {
        currentTitleByProvider[matchedKey] = data.title || '';
        getAutoSaveState(matchedKey).title = data.title || '';
        scheduleSilentSave(matchedKey);
      } catch (_) {}
    }
  } catch (_) {}
});

initializeBar();

// ============== 自动同步到 sync/*.json ==============
(function initAutoSync() {
  // 等待 HistoryDB 初始化完成
  async function waitForHistoryDB(maxWait = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      if (typeof window !== 'undefined' && window.HistoryDB) {
        // 尝试调用一次确保完全初始化
        try {
          await window.HistoryDB.migrateFromStorageIfAny();
          return true;
        } catch (e) {
          // 继续等待
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return typeof window !== 'undefined' && window.HistoryDB;
  }

  // 启用自动同步（如果 AutoSync 模块可用且同步服务器运行中）
  if (typeof AutoSync !== 'undefined') {
    try {
      // 等待 HistoryDB 初始化
      waitForHistoryDB().then(ready => {
        if (ready) {
          console.log('AutoSync: HistoryDB 已就绪');
        } else {
          console.warn('AutoSync: HistoryDB 初始化超时，将使用降级方案');
        }
      });

      AutoSync.enableAutoSync();
      console.log('AutoSync: 自动同步已启用');
    } catch (e) {
      console.log('AutoSync: 同步服务器未运行，跳过自动同步', e);
    }
  }

  setInterval(() => {
    try {
      const iframeContainer = document.getElementById('iframe');
      const activeFrame = iframeContainer?.querySelector('[data-provider]:not([style*="display: none"])');
      const provider = activeFrame?.dataset?.provider;
      if (!provider) return;

      const state = getAutoSaveState(provider);
      if (!canAutoSaveConversation(provider, state.href, state.title)) return;
      requestSilentSaveToLibrary(provider);
    } catch (_) {}
  }, AUTO_SAVE_INTERVAL_MS);
})();

// ============== 来自后台的消息与待处理队列 ==============
(function initRuntimeMessages() {
  function getActiveProviderFrame() {
    try {
      const iframeContainer = document.getElementById('iframe');
      const el = iframeContainer?.querySelector('[data-provider]:not([style*="display: none"])');
      return el || null;
    } catch (_) { return null; }
  }

  function toast(text, level = 'info') {
    try {
      let box = document.getElementById('aisb-toast');
      if (!box) {
        box = document.createElement('div');
        box.id = 'aisb-toast';
        box.style.cssText = 'position:fixed;right:12px;top:12px;z-index:2147483647;background:#111827;color:#fff;padding:8px 12px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:12px;max-width:60%;opacity:.98;';
        document.body.appendChild(box);
      }
      box.textContent = String(text || '');
      box.style.background = level === 'error' ? '#b91c1c' : (level === 'warn' ? '#92400e' : '#111827');
      box.style.display = 'block';
      clearTimeout(toast._t);
      toast._t = setTimeout(()=>{ try { box.style.display = 'none'; } catch (_) {} }, 2200);
    } catch (_) {}
  }

  async function handlePendingFromStorage() {
    try {
      const {
        aisbPendingExportPanel,
        aisbPendingInsert,
        aisbPendingScreenshot,
        aisbPendingNotify
      } = await chrome.storage?.local.get([
        'aisbPendingExportPanel',
        'aisbPendingInsert',
        'aisbPendingScreenshot',
        'aisbPendingNotify'
      ]);
      if (aisbPendingExportPanel) {
        showExporterPanelInActiveFrame();
        try { await chrome.storage?.local.remove(['aisbPendingExportPanel']); } catch (_) {}
      }
      if (aisbPendingNotify && aisbPendingNotify.text) {
        toast(aisbPendingNotify.text, aisbPendingNotify.level || 'info');
        try { await chrome.storage?.local.remove(['aisbPendingNotify']); } catch (_) {}
      }
      if (aisbPendingInsert && aisbPendingInsert.text) {
        routeInsertText(aisbPendingInsert);
        try { await chrome.storage?.local.remove(['aisbPendingInsert']); } catch (_) {}
      }
      if (aisbPendingScreenshot && aisbPendingScreenshot.dataUrl) {
        showScreenshotOverlay(aisbPendingScreenshot);
        try { await chrome.storage?.local.remove(['aisbPendingScreenshot']); } catch (_) {}
      }
    } catch (_) {}
  }

  function showExporterPanelInActiveFrame() {
    try {
      const target = getActiveProviderFrame();
      if (!target || !target.contentWindow) {
        toast('未找到活动的 AI 面板。', 'warn');
        return;
      }
      try { window.focus(); } catch (_) {}
      try { document.body.tabIndex = -1; document.body.focus(); } catch (_) {}
      try { target.focus(); } catch (_) {}
      try { target.contentWindow.focus(); } catch (_) {}
      target.contentWindow.postMessage({ type: 'AISB_SHOW_EXPORT_PANEL' }, '*');
    } catch (e) {
      toast('打开导出面板失败：' + String(e), 'error');
    }
  }

  function routeInsertText(msg) {
    try {
      const target = getActiveProviderFrame();
      if (!target || !target.contentWindow) {
        toast('未找到活动的 AI 面板。', 'warn');
        return;
      }
      // 尽量把焦点转入侧栏与 iframe
      try { window.focus(); } catch (_) {}
      try { document.body.tabIndex = -1; document.body.focus(); } catch (_) {}
      try { target.focus(); } catch (_) {}
      try { target.contentWindow.focus(); } catch (_) {}
      // 追加并要求聚焦
      target.contentWindow.postMessage({ type: 'AI_SIDEBAR_INSERT', text: msg.text || '', mode: 'append', focus: true }, '*');

      // 多次尝试确保焦点最终在输入框（处理面板刚打开或站点懒加载）
      const pokeFocus = () => {
        try {
          target.focus();
          target.contentWindow?.postMessage({ type: 'AI_SIDEBAR_FOCUS' }, '*');
        } catch (_) {}
      };
      const attempts = [40, 120, 240, 420, 700];
      attempts.forEach((ms)=> setTimeout(pokeFocus, ms));
      toast('已将选中文本注入输入框');
    } catch (e) {
      toast('注入失败：' + String(e), 'error');
    }
  }

  function showScreenshotOverlay(msg) {
    try {
      // 直接将截图发送到活动的 iframe 中
      const target = getActiveProviderFrame();
      if (!target || !target.contentWindow) {
        toast('未找到活动的 AI 面板', 'warn');
        return;
      }
      
      // 发送截图数据到 iframe
      target.contentWindow.postMessage({
        type: 'AI_SIDEBAR_INSERT_IMAGE',
        dataUrl: msg.dataUrl,
        tabTitle: msg.tabTitle || '',
        tabUrl: msg.tabUrl || ''
      }, '*');
      
      toast('截图已加载到输入框');
      
      // 聚焦到 iframe
      try { window.focus(); } catch (_) {}
      try { document.body.tabIndex = -1; document.body.focus(); } catch (_) {}
      try { target.focus(); } catch (_) {}
      try { target.contentWindow.focus(); } catch (_) {}
    } catch (e) {
      toast('加载截图失败：' + String(e), 'error');
    }
  }

  // Receive from background in real time
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        if (!message || !message.type) return;
        if (message.type === 'aisb.notify') {
          toast(message.text || '', message.level || 'info');
          return;
        }
        if (message.type === 'aisb.insert-text') {
          routeInsertText(message);
          return;
        }
        if (message.type === 'AISB_SHOW_EXPORT_PANEL') {
          showExporterPanelInActiveFrame();
          return;
        }
        // 当后台未能从左侧活动页读取到选区时，请求右侧当前 iframe 自行上报选区并注入
        if (message.type === 'aisb.request-frame-selection') {
          const target = getActiveProviderFrame();
          if (!target || !target.contentWindow) {
            toast('未找到活动的 AI 面板。', 'warn');
            return;
          }
          // 一次性监听 selection 结果
          const onMsg = (ev) => {
            try {
              const data = ev.data || {};
              if (data && data.type === 'AI_SIDEBAR_SELECTION_RESULT') {
                window.removeEventListener('message', onMsg, true);
                const txt = String(data.text || '').trim();
                if (txt) {
                  routeInsertText({ text: txt });
                } else {
                  toast('未检测到选区，可用“右键菜单 → 发送选中文本”，无需授权。', 'warn');
                }
              }
            } catch (_) {}
          };
          window.addEventListener('message', onMsg, true);
          try { target.contentWindow.postMessage({ type: 'AI_SIDEBAR_REQUEST_SELECTION' }, '*'); } catch (_) {}
          return;
        }
        if (message.type === 'aisb.focus-only') {
          const target = getActiveProviderFrame();
          if (target && target.contentWindow) {
            try { window.focus(); } catch (_) {}
            try { document.body.tabIndex = -1; document.body.focus(); } catch (_) {}
            try { target.focus(); } catch (_) {}
            try { target.contentWindow.focus(); } catch (_) {}
            try { target.contentWindow.postMessage({ type: 'AI_SIDEBAR_FOCUS' }, '*'); } catch (_) {}
            const poke = () => { try { target.focus(); target.contentWindow?.postMessage({ type: 'AI_SIDEBAR_FOCUS' }, '*'); } catch (_) {} };
            ;[40,120,240,420,700,1000].forEach(ms => setTimeout(poke, ms));
          }
          return;
        }
        if (message.type === 'aisb.receive-screenshot') {
          showScreenshotOverlay(message);
          return;
        }
        if (message.type === 'aisb.type-proxy') {
          const target = getActiveProviderFrame();
          if (target && target.contentWindow) {
            try { target.focus(); } catch (_) {}
            try { target.contentWindow.focus(); } catch (_) {}
            target.contentWindow.postMessage({ type: 'AI_SIDEBAR_PROXY_TYPE', payload: message.payload || {} }, '*');
          }
          return;
        }
      } catch (_) {}
    });
  } catch (_) {}

  // Drain any pending payloads saved in storage (when panel was closed)
  handlePendingFromStorage();
})();

// ============== 搜索功能 ==============
(function initializeSearch() {
  const searchBar = document.getElementById('searchBar');
  const searchInput = document.getElementById('searchInput');
  const searchPrev = document.getElementById('searchPrev');
  const searchNext = document.getElementById('searchNext');
  const searchClose = document.getElementById('searchClose');
  const searchCount = document.getElementById('searchCount');
  const searchBtn = document.getElementById('searchBtn');

  let isSearchVisible = false;
  let currentSearchTerm = '';

  // 切换搜索框显示/隐藏
  function toggleSearch() {
    isSearchVisible = !isSearchVisible;
    
    if (isSearchVisible) {
      searchBar.style.display = 'block';
      searchInput.focus();
      searchInput.select();
      
      // 高亮搜索按钮
      if (searchBtn) {
        searchBtn.classList.add('active');
      }
      
      // 如果有之前的搜索词，重新搜索
      if (searchInput.value) {
        performSearch(searchInput.value);
      }
    } else {
      searchBar.style.display = 'none';
      clearSearch();
      
      // 取消高亮搜索按钮
      if (searchBtn) {
        searchBtn.classList.remove('active');
      }
    }
  }

  // 执行搜索
  function performSearch(term, direction = '') {
    if (!term) {
      clearSearch();
      return;
    }

    currentSearchTerm = term;

    try {
      // 获取当前激活的iframe
      const iframeContainer = document.getElementById('iframe');
      const activeFrame = iframeContainer?.querySelector('[data-provider]:not([style*="display: none"])');
      
      if (activeFrame) {
        // 通过postMessage向iframe发送搜索请求
        try {
          activeFrame.contentWindow.postMessage({
            type: 'AI_SIDEBAR_SEARCH',
            action: direction === 'prev' ? 'findPrevious' : 'findNext',
            term: term
          }, '*');
          
          // 设置搜索状态
          searchCount.textContent = '搜索中...';
          searchInput.style.backgroundColor = '';
          
          // 如果3秒内没有响应，显示降级方案
          setTimeout(() => {
            if (searchCount.textContent === '搜索中...') {
              tryNativeSearch(activeFrame, term, direction);
            }
          }, 500);
        } catch (e) {
          console.log('postMessage失败，尝试原生搜索:', e);
          tryNativeSearch(activeFrame, term, direction);
        }
      }
    } catch (e) {
      console.error('搜索出错:', e);
      searchCount.textContent = '搜索失败';
    }
  }
  
  // 尝试使用原生window.find
  function tryNativeSearch(frame, term, direction) {
    try {
      const iframeWindow = frame.contentWindow;
      
      if (iframeWindow && iframeWindow.find) {
        // 使用window.find API
        const found = iframeWindow.find(
          term,
          false, // caseSensitive
          direction === 'prev', // backwards
          true, // wrapAround
          false, // wholeWord
          false, // searchInFrames
          false  // showDialog
        );
        
        if (found) {
          searchCount.textContent = '已找到';
          searchInput.style.backgroundColor = '';
        } else {
          searchCount.textContent = '未找到';
          searchInput.style.backgroundColor = '#fff3cd';
        }
      } else {
        // 无法使用window.find，显示提示
        searchCount.textContent = '请使用 Cmd/Ctrl+F';
      }
    } catch (e) {
      console.log('原生搜索失败:', e);
      searchCount.textContent = '请使用 Cmd/Ctrl+F';
    }
  }
  
  // 监听来自iframe的搜索结果
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'AI_SIDEBAR_SEARCH_RESULT') {
      const { found, total, current } = event.data;
      
      if (found) {
        if (total > 0) {
          searchCount.textContent = `${current}/${total}`;
        } else {
          searchCount.textContent = '已找到';
        }
        searchInput.style.backgroundColor = '';
      } else {
        searchCount.textContent = '未找到';
        searchInput.style.backgroundColor = '#fff3cd';
      }
    }
  });


  // 清除搜索
  function clearSearch() {
    currentSearchTerm = '';
    searchCount.textContent = '';
    searchInput.style.backgroundColor = '';
    
    try {
      const iframeContainer = document.getElementById('iframe');
      const activeFrame = iframeContainer?.querySelector('[data-provider]:not([style*="display: none"])');
      
      if (activeFrame && activeFrame.contentWindow) {
        // 向iframe发送清除搜索的消息
        try {
          activeFrame.contentWindow.postMessage({
            type: 'AI_SIDEBAR_SEARCH',
            action: 'clear',
            term: ''
          }, '*');
        } catch (_) {}
        
        // 尝试清除选择
        try {
          const selection = activeFrame.contentWindow.getSelection();
          if (selection) {
            selection.removeAllRanges();
          }
        } catch (_) {}
      }
    } catch (e) {
      // 忽略跨域错误
    }
  }

  // 监听 ESC 键关闭搜索
  document.addEventListener('keydown', (e) => {
    // ESC 关闭搜索
    if (e.key === 'Escape' && isSearchVisible) {
      toggleSearch();
    }
  });

  // 搜索输入框事件
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value;
    if (term) {
      performSearch(term);
    } else {
      clearSearch();
    }
  });

  // Enter键搜索下一个
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        performSearch(searchInput.value, 'prev');
      } else {
        performSearch(searchInput.value, 'next');
      }
    }
  });

  // 上一个按钮
  searchPrev.addEventListener('click', () => {
    if (searchInput.value) {
      performSearch(searchInput.value, 'prev');
    }
  });

  // 下一个按钮
  searchNext.addEventListener('click', () => {
    if (searchInput.value) {
      performSearch(searchInput.value, 'next');
    }
  });

  // 关闭按钮
  searchClose.addEventListener('click', () => {
    toggleSearch();
  });

  // 工具栏搜索按钮
  if (searchBtn) {
    // 设置初始快捷键提示
    getButtonShortcuts().then(shortcuts => {
      const sc = shortcuts.searchBtn;
      const keys = [];
      if (sc.ctrl) keys.push('Ctrl');
      if (sc.shift) keys.push('Shift');
      if (sc.alt) keys.push('Alt');
      keys.push(sc.key.toUpperCase());
      searchBtn.title = `Search in page (${keys.join('+')})`;
    });
    
    searchBtn.addEventListener('click', () => {
      toggleSearch();
    });
  }

  dbg('搜索功能已初始化');
})();

// Process save queue from background script
(async function processSaveQueue() {
  try {
    const { __saveQueue } = await chrome.storage.local.get(['__saveQueue']);
    if (__saveQueue && __saveQueue.length > 0) {
      for (const item of __saveQueue) {
        try {
          const convData = {
            ...item.data,
            content: item.content,
            timestamp: item.timestamp || Date.now(),
            createdAt: item.timestamp || Date.now(),
            updatedAt: Date.now()
          };
          if (typeof window.ChatHistoryDB?.saveConversation === 'function') {
            await window.ChatHistoryDB.saveConversation(convData);
            console.log('[AI Sidebar] Processed queued conversation:', convData.title);
          }
        } catch (e) {
          console.error('[AI Sidebar] Failed to save queued item:', e);
        }
      }
      // Clear queue after processing
      await chrome.storage.local.set({ __saveQueue: [] });
    }
  } catch (e) {
    console.error('[AI Sidebar] processSaveQueue error:', e);
  }
  
  // Check queue periodically
  setTimeout(processSaveQueue, 2000);
})();
