(function () {
  'use strict';

  if (window.__AISB_GEMINI__) {
    return;
  }

  // 统一根命名空间，所有 Gemini 模块都挂在这里。
  const AISB = {
    version: 'sr8',
    loadedAt: Date.now(),
    modules: {},
    constants: {
      sidebarSelectors: [
        '[data-test-id="overflow-container"]',
        'bard-sidenav-content',
        'aside[role="navigation"]',
        'aside',
      ],
      conversationSelectors: [
        '[data-test-id="conversation"]',
        'mat-list-item[aria-label]',
        'a[href*="/app/"]',
      ],
    },
  };

  const bus = new EventTarget();
  const routeWatchers = new Set();
  let routePatched = false;
  let routeIntervalId = null;
  let lastRouteKey = `${location.pathname}${location.search}${location.hash}`;

  function now() {
    return Date.now();
  }

  function uid(prefix) {
    const name = prefix || 'id';
    return `${name}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function safeParseJSON(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function toAbsoluteUrl(url) {
    if (!url) return '';
    try {
      return new URL(url, location.origin).href;
    } catch (_) {
      return '';
    }
  }

  function getCurrentAccountId(pathname) {
    const path = typeof pathname === 'string' ? pathname : location.pathname;
    const match = path.match(/\/u\/(\d+)\//);
    return match ? match[1] : '0';
  }

  function getScopedKey(baseKey, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const isolateByAccount = opts.isolateByAccount !== false;
    if (!isolateByAccount) return baseKey;
    const accountId = opts.accountId || getCurrentAccountId();
    return `${baseKey}::u:${accountId}`;
  }

  function getStorageArea() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return chrome.storage.local;
      }
    } catch (_) {}
    return null;
  }

  function storageGetRaw(keys) {
    const area = getStorageArea();
    if (!area) {
      return Promise.resolve({});
    }
    return new Promise((resolve) => {
      try {
        area.get(keys, (result) => {
          resolve(result || {});
        });
      } catch (_) {
        resolve({});
      }
    });
  }

  function storageSetRaw(payload) {
    const area = getStorageArea();
    if (!area) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      try {
        area.set(payload, () => resolve(true));
      } catch (_) {
        resolve(false);
      }
    });
  }

  function storageRemoveRaw(keys) {
    const area = getStorageArea();
    if (!area) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      try {
        area.remove(keys, () => resolve(true));
      } catch (_) {
        resolve(false);
      }
    });
  }

  async function storageGet(key, fallbackValue) {
    const result = await storageGetRaw(key);
    if (result && Object.prototype.hasOwnProperty.call(result, key)) {
      return result[key];
    }

    // 回退 localStorage，兼容历史数据。
    try {
      const localRaw = localStorage.getItem(key);
      if (localRaw != null) {
        if (typeof fallbackValue === 'string') return localRaw;
        return safeParseJSON(localRaw, fallbackValue);
      }
    } catch (_) {}

    return fallbackValue;
  }

  async function storageSet(key, value) {
    let ok = await storageSetRaw({ [key]: value });
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      ok = true;
    } catch (_) {}
    return ok;
  }

  async function storageRemove(key) {
    await storageRemoveRaw(key);
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  }

  async function storageMergeObject(key, patch) {
    const current = (await storageGet(key, {})) || {};
    const next = { ...current, ...(patch || {}) };
    await storageSet(key, next);
    return next;
  }

  function emit(eventName, detail) {
    try {
      bus.dispatchEvent(new CustomEvent(eventName, { detail }));
    } catch (_) {}
  }

  function on(eventName, handler) {
    const wrapped = (event) => {
      try {
        handler(event.detail, event);
      } catch (error) {
        console.error('[AISB Common] Event handler failed:', eventName, error);
      }
    };
    bus.addEventListener(eventName, wrapped);
    return () => {
      bus.removeEventListener(eventName, wrapped);
    };
  }

  function registerModule(name, api) {
    if (!name) return;
    AISB.modules[name] = api || {};
    emit('module:registered', { name, api: AISB.modules[name] });
  }

  function getModule(name) {
    return AISB.modules[name] || null;
  }

  function ensureStyle(id, cssText) {
    if (!id || !cssText) return null;
    const existing = document.getElementById(id);
    if (existing) return existing;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = cssText;
    (document.head || document.documentElement).appendChild(style);
    return style;
  }

  function ensureGeminiThemeStyles() {
    // 统一 Gemini 主题变量，所有模块都从这里取值，减少硬编码颜色和字体。
    return ensureStyle(
      'aisb-gemini-theme-style',
      `
      :root {
        --aisb-gm-color-primary: var(--gm-color-primary, var(--gem-sys-color-primary, #1a73e8));
        --aisb-gm-color-on-primary: var(--gm-color-on-primary, var(--gem-sys-color-on-primary, #ffffff));
        --aisb-gm-color-primary-container: var(
          --gm-color-primary-container,
          var(--gem-sys-color-primary-container, rgba(26, 115, 232, .14))
        );
        --aisb-gm-color-on-primary-container: var(
          --gm-color-on-primary-container,
          var(--gem-sys-color-on-primary-container, #0b57d0)
        );
        --aisb-gm-color-surface: var(--gm-color-surface, var(--gem-sys-color-surface, #ffffff));
        --aisb-gm-color-surface-variant: var(
          --gm-color-surface-variant,
          var(--gem-sys-color-surface-container, #f8f9fa)
        );
        --aisb-gm-color-surface-high: var(
          --gm-color-surface-container-high,
          var(--gem-sys-color-surface-container-high, #f1f3f4)
        );
        --aisb-gm-color-on-surface: var(--gm-color-on-surface, var(--gem-sys-color-on-surface, #1f1f1f));
        --aisb-gm-color-on-surface-variant: var(
          --gm-color-on-surface-variant,
          var(--gem-sys-color-on-surface-variant, #5f6368)
        );
        --aisb-gm-color-outline: var(--gm-color-outline, var(--gem-sys-color-outline, rgba(95, 99, 104, .48)));
        --aisb-gm-color-outline-variant: var(
          --gm-color-outline-variant,
          var(--gem-sys-color-outline-variant, rgba(95, 99, 104, .24))
        );
        --aisb-gm-color-error: var(--gm-color-error, var(--gem-sys-color-error, #d93025));
        --aisb-gm-color-success: #188038;
        --aisb-gm-color-warning: #e37400;
        --aisb-gm-state-hover: rgba(95, 99, 104, .12);
        --aisb-gm-state-active: rgba(26, 115, 232, .14);
        --aisb-gm-state-focus: rgba(26, 115, 232, .28);
        --aisb-gm-scrim: rgba(17, 24, 39, .4);
        --aisb-gm-font-family: var(
          --gm-font-family,
          "Google Sans",
          "Google Sans Text",
          Roboto,
          "Noto Sans SC",
          "PingFang SC",
          "Microsoft YaHei",
          sans-serif
        );
        --aisb-gm-font-size-xs: var(--gm-font-size-xs, 11px);
        --aisb-gm-font-size-sm: var(--gm-font-size-sm, 12px);
        --aisb-gm-font-size-md: var(--gm-font-size-md, 13px);
        --aisb-gm-font-size-lg: var(--gm-font-size-lg, 14px);
        --aisb-gm-radius-xs: var(--gm-border-radius-xs, 8px);
        --aisb-gm-radius-sm: var(--gm-border-radius-sm, 10px);
        --aisb-gm-radius-md: var(--gm-border-radius-md, 12px);
        --aisb-gm-radius-lg: var(--gm-border-radius-lg, 14px);
        --aisb-gm-radius-pill: 999px;
        --aisb-gm-shadow-1: var(--gm-shadow-sm, 0 8px 20px rgba(0, 0, 0, .12));
        --aisb-gm-shadow-2: var(--gm-shadow-md, 0 14px 32px rgba(0, 0, 0, .18));
        --aisb-gm-shadow-3: var(--gm-shadow-lg, 0 20px 44px rgba(0, 0, 0, .24));
        --aisb-gm-transition-fast: 150ms cubic-bezier(.2, 0, 0, 1);
        --aisb-gm-transition-standard: 220ms cubic-bezier(.2, 0, 0, 1);
      }

      html.dark-theme,
      body.dark-theme,
      html[data-theme="dark"],
      body[data-theme="dark"] {
        --aisb-gm-color-surface: var(--gm-color-surface, var(--gem-sys-color-surface, #1f1f1f));
        --aisb-gm-color-surface-variant: var(
          --gm-color-surface-variant,
          var(--gem-sys-color-surface-container, #262a2f)
        );
        --aisb-gm-color-surface-high: var(
          --gm-color-surface-container-high,
          var(--gem-sys-color-surface-container-high, #30343a)
        );
        --aisb-gm-color-on-surface: var(--gm-color-on-surface, var(--gem-sys-color-on-surface, #e8eaed));
        --aisb-gm-color-on-surface-variant: var(
          --gm-color-on-surface-variant,
          var(--gem-sys-color-on-surface-variant, #bdc1c6)
        );
        --aisb-gm-color-outline: var(
          --gm-color-outline,
          var(--gem-sys-color-outline, rgba(232, 234, 237, .45))
        );
        --aisb-gm-color-outline-variant: var(
          --gm-color-outline-variant,
          var(--gem-sys-color-outline-variant, rgba(232, 234, 237, .24))
        );
        --aisb-gm-state-hover: rgba(232, 234, 237, .14);
        --aisb-gm-state-active: rgba(138, 180, 248, .22);
        --aisb-gm-state-focus: rgba(138, 180, 248, .34);
        --aisb-gm-scrim: rgba(0, 0, 0, .52);
        --aisb-gm-shadow-1: 0 10px 24px rgba(0, 0, 0, .4);
        --aisb-gm-shadow-2: 0 18px 38px rgba(0, 0, 0, .46);
        --aisb-gm-shadow-3: 0 26px 54px rgba(0, 0, 0, .54);
      }

      :where(
        #aisb-gemini-folder-panel,
        #aisb-gemini-timeline-bar,
        #aisb-gemini-tools-panel,
        #aisb-gemini-export-trigger,
        #aisb-gemini-prompt-wrap,
        #aisb-gemini-cloud-sync-wrap,
        #aisb-gemini-deep-research-float,
        #aisb-gemini-formula-toolbar,
        .aisb-folder-context-menu,
        .aisb-folder-color-picker,
        .aisb-folder-dialog,
        .aisb-timeline-tooltip,
        .aisb-timeline-context,
        .aisb-export-progress-card,
        .aisb-export-batch-dialog,
        .aisb-tools-batchbar,
        .aisb-tools-quote-btn,
        .aisb-watermark-btn,
        .aisb-mermaid-toolbar,
        .aisb-mermaid-diagram
      ) {
        font-family: var(--aisb-gm-font-family);
        color: var(--aisb-gm-color-on-surface);
      }

      :where(
        #aisb-gemini-folder-panel,
        #aisb-gemini-timeline-bar,
        #aisb-gemini-tools-panel,
        #aisb-gemini-export-trigger,
        #aisb-gemini-prompt-wrap,
        #aisb-gemini-cloud-sync-wrap,
        #aisb-gemini-deep-research-float,
        #aisb-gemini-formula-toolbar
      ) :is(button, input, select, textarea) {
        font-family: inherit;
        transition:
          background-color var(--aisb-gm-transition-fast),
          border-color var(--aisb-gm-transition-fast),
          color var(--aisb-gm-transition-fast),
          box-shadow var(--aisb-gm-transition-standard),
          transform var(--aisb-gm-transition-fast);
      }

      :where(
        #aisb-gemini-folder-panel,
        #aisb-gemini-timeline-bar,
        #aisb-gemini-tools-panel,
        #aisb-gemini-export-trigger,
        #aisb-gemini-prompt-wrap,
        #aisb-gemini-cloud-sync-wrap,
        #aisb-gemini-deep-research-float,
        #aisb-gemini-formula-toolbar,
        .aisb-folder-context-menu,
        .aisb-folder-color-picker,
        .aisb-folder-dialog,
        .aisb-timeline-context
      ) :is(button, input, select, textarea):focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px var(--aisb-gm-state-focus);
      }

      @keyframes aisb-gm-fade-up {
        from {
          opacity: 0;
          transform: translateY(8px) scale(.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes aisb-gm-fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @media (prefers-reduced-motion: reduce) {
        :where(
          #aisb-gemini-folder-panel,
          #aisb-gemini-timeline-bar,
          #aisb-gemini-tools-panel,
          #aisb-gemini-export-trigger,
          #aisb-gemini-prompt-wrap,
          #aisb-gemini-cloud-sync-wrap,
          #aisb-gemini-deep-research-float,
          #aisb-gemini-formula-toolbar
        ) * {
          transition-duration: 1ms !important;
          animation-duration: 1ms !important;
          animation-iteration-count: 1 !important;
        }
      }
      `,
    );
  }

  function downloadBlob(filename, blob) {
    if (!blob) return;
    const name = filename || `download-${Date.now()}`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadText(filename, text, mimeType) {
    const blob = new Blob([text || ''], {
      type: mimeType || 'text/plain;charset=utf-8',
    });
    downloadBlob(filename, blob);
  }

  async function copyText(text) {
    const payload = String(text || '');
    if (!payload) return false;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(payload);
        return true;
      }
    } catch (_) {}

    try {
      const textarea = document.createElement('textarea');
      textarea.value = payload;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      return copied;
    } catch (_) {
      return false;
    }
  }

  function toast(message, type, duration) {
    const text = String(message || '').trim();
    if (!text) return;

    ensureStyle(
      'aisb-gemini-common-toast-style',
      `
      .aisb-gemini-toast-wrap {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      }
      .aisb-gemini-toast {
        max-width: 360px;
        padding: 10px 12px;
        border-radius: var(--aisb-gm-radius-sm);
        font-family: var(--aisb-gm-font-family);
        font-size: var(--aisb-gm-font-size-sm);
        line-height: 1.4;
        color: var(--aisb-gm-color-on-surface);
        background: var(--aisb-gm-color-surface-high);
        border: 1px solid var(--aisb-gm-color-outline-variant);
        box-shadow: var(--aisb-gm-shadow-1);
        opacity: 0;
        transform: translateY(-6px);
        transition: opacity var(--aisb-gm-transition-fast), transform var(--aisb-gm-transition-fast);
      }
      .aisb-gemini-toast.show {
        opacity: 1;
        transform: translateY(0);
      }
      .aisb-gemini-toast.error {
        border-color: color-mix(in srgb, var(--aisb-gm-color-error) 50%, transparent);
        background: color-mix(in srgb, var(--aisb-gm-color-error) 14%, var(--aisb-gm-color-surface));
      }
      .aisb-gemini-toast.success {
        border-color: color-mix(in srgb, var(--aisb-gm-color-success) 48%, transparent);
        background: color-mix(in srgb, var(--aisb-gm-color-success) 14%, var(--aisb-gm-color-surface));
      }
      .aisb-gemini-toast.warn {
        border-color: color-mix(in srgb, var(--aisb-gm-color-warning) 48%, transparent);
        background: color-mix(in srgb, var(--aisb-gm-color-warning) 14%, var(--aisb-gm-color-surface));
      }
      `,
    );

    let wrap = document.querySelector('.aisb-gemini-toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'aisb-gemini-toast-wrap';
      document.body.appendChild(wrap);
    }

    const item = document.createElement('div');
    item.className = `aisb-gemini-toast ${type || ''}`;
    item.textContent = text;
    wrap.appendChild(item);

    requestAnimationFrame(() => item.classList.add('show'));

    const ttl = Number(duration) > 0 ? Number(duration) : 2600;
    setTimeout(() => {
      item.classList.remove('show');
      setTimeout(() => {
        item.remove();
        if (wrap && wrap.childElementCount === 0) {
          wrap.remove();
        }
      }, 220);
    }, ttl);
  }

  function observeElement(selector, onFound, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const timeout = Number.isFinite(opts.timeout) ? Number(opts.timeout) : 15000;
    const root = opts.root || document;

    const immediate = root.querySelector(selector);
    if (immediate) {
      onFound(immediate);
      return () => {};
    }

    const observer = new MutationObserver(() => {
      const node = root.querySelector(selector);
      if (!node) return;
      observer.disconnect();
      onFound(node);
    });

    observer.observe(root === document ? document.documentElement || document.body : root, {
      childList: true,
      subtree: true,
    });

    let timer = null;
    if (timeout > 0) {
      timer = setTimeout(() => {
        observer.disconnect();
      }, timeout);
    }

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }

  function waitForElement(selector, options) {
    return new Promise((resolve) => {
      const opts = options && typeof options === 'object' ? options : {};
      const timeout = Number.isFinite(opts.timeout) ? Number(opts.timeout) : 12000;
      const root = opts.root || document;

      const initial = root.querySelector(selector);
      if (initial) {
        resolve(initial);
        return;
      }

      const observer = new MutationObserver(() => {
        const node = root.querySelector(selector);
        if (!node) return;
        observer.disconnect();
        resolve(node);
      });

      observer.observe(root === document ? document.documentElement || document.body : root, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  function extractConversationId(element) {
    if (!element) return '';

    const jslog = element.getAttribute && element.getAttribute('jslog');
    if (jslog) {
      const match = jslog.match(/c_[a-z0-9]+/i);
      if (match && match[0]) {
        return match[0];
      }
    }

    const idAttrs = ['data-conversation-id', 'data-id', 'id'];
    for (const attr of idAttrs) {
      const value = element.getAttribute && element.getAttribute(attr);
      if (value && /c_[a-z0-9]+/i.test(value)) {
        return value.match(/c_[a-z0-9]+/i)[0];
      }
    }

    const anchor = element.querySelector && element.querySelector('a[href*="/app/"]');
    if (anchor) {
      const href = anchor.getAttribute('href') || '';
      const appMatch = href.match(/\/app\/([^/?#]+)/);
      if (appMatch && appMatch[1]) {
        return `c_${appMatch[1]}`;
      }
    }

    const text = ((element.textContent || '').trim() || '').slice(0, 120);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return `c_${Math.abs(hash).toString(16)}_${Math.abs((Date.now() + hash) % 100000).toString(16)}`;
  }

  function extractConversationTitle(element) {
    if (!element) return '未命名会话';

    const selectors = [
      '[data-test-id="conversation-title"]',
      '.conversation-title',
      'a[aria-label]',
      'a',
      '[mat-line]',
    ];

    for (const selector of selectors) {
      const node = element.querySelector && element.querySelector(selector);
      if (!node) continue;
      const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (text) return text;
      const aria = (node.getAttribute && node.getAttribute('aria-label')) || '';
      if (aria.trim()) return aria.trim();
    }

    const fallback = (element.textContent || '').replace(/\s+/g, ' ').trim();
    return fallback || '未命名会话';
  }

  function buildConversationUrlById(conversationId) {
    const accountMatch = location.pathname.match(/\/u\/(\d+)\//);
    const accountPrefix = accountMatch ? `/u/${accountMatch[1]}` : '';
    if (!conversationId) {
      return location.href;
    }
    const pureId = conversationId.startsWith('c_') ? conversationId.slice(2) : conversationId;
    return `${location.origin}${accountPrefix}/app/${pureId}`;
  }

  function extractConversationUrl(element, conversationId) {
    if (element && element.querySelector) {
      const link = element.querySelector('a[href*="/app/"],a[href*="/gem/"]');
      if (link) {
        const href = link.getAttribute('href');
        const abs = toAbsoluteUrl(href);
        if (abs) return abs;
      }
    }
    return buildConversationUrlById(conversationId);
  }

  function extractConversationFromElement(element) {
    if (!(element instanceof HTMLElement)) return null;
    const conversationId = extractConversationId(element);
    if (!conversationId) return null;
    const title = extractConversationTitle(element);
    const url = extractConversationUrl(element, conversationId);
    return {
      conversationId,
      title,
      url,
      addedAt: now(),
      lastOpenedAt: now(),
      accountId: getCurrentAccountId(),
    };
  }

  function getGeminiSidebarRefs() {
    let sidebar = null;
    for (const selector of AISB.constants.sidebarSelectors) {
      const found = document.querySelector(selector);
      if (found) {
        sidebar = found;
        break;
      }
    }
    if (!sidebar) return null;

    let recentSection =
      sidebar.querySelector('[data-test-id="all-conversations"]') ||
      sidebar.querySelector('.chat-history') ||
      sidebar.querySelector('mat-nav-list') ||
      sidebar;

    // 兜底：以第一个会话节点的父级作为注入位置。
    if (!recentSection) {
      const firstConv = sidebar.querySelector('[data-test-id="conversation"]');
      if (firstConv) {
        recentSection = firstConv.closest('[role="list"]') || firstConv.parentElement;
      }
    }

    return {
      sidebar,
      recentSection: recentSection || sidebar,
    };
  }

  function mountInGeminiSidebar(node, options) {
    if (!(node instanceof HTMLElement)) return false;

    const opts = options && typeof options === 'object' ? options : {};
    const refs = getGeminiSidebarRefs();
    if (!refs || !refs.sidebar) return false;

    const parent = (refs.recentSection && refs.recentSection.parentElement) || refs.sidebar;
    if (!(parent instanceof HTMLElement)) return false;

    const placeBeforeRecent = opts.beforeRecent !== false;
    const anchor = placeBeforeRecent && refs.recentSection && refs.recentSection.parentElement === parent
      ? refs.recentSection
      : null;

    if (anchor) {
      if (node.parentElement !== parent || node.nextSibling !== anchor) {
        parent.insertBefore(node, anchor);
      }
      return true;
    }

    if (node.parentElement !== parent) {
      parent.appendChild(node);
    }
    return true;
  }

  function notifyRouteChange() {
    const next = `${location.pathname}${location.search}${location.hash}`;
    if (next === lastRouteKey) return;
    const previous = lastRouteKey;
    lastRouteKey = next;

    for (const callback of routeWatchers) {
      try {
        callback({
          previous,
          current: next,
          href: location.href,
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        });
      } catch (error) {
        console.error('[AISB Common] Route watcher error:', error);
      }
    }

    emit('route:change', {
      previous,
      current: next,
      href: location.href,
      pathname: location.pathname,
    });
  }

  function patchHistoryIfNeeded() {
    if (routePatched) return;
    routePatched = true;

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function patchedPushState() {
      originalPushState.apply(history, arguments);
      notifyRouteChange();
    };

    history.replaceState = function patchedReplaceState() {
      originalReplaceState.apply(history, arguments);
      notifyRouteChange();
    };

    window.addEventListener('popstate', notifyRouteChange, true);
    window.addEventListener('hashchange', notifyRouteChange, true);

    routeIntervalId = window.setInterval(() => {
      notifyRouteChange();
    }, 800);
  }

  function onRouteChange(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }
    patchHistoryIfNeeded();
    routeWatchers.add(callback);
    return () => {
      routeWatchers.delete(callback);
    };
  }

  // -----------------------------
  // 轻量 ZIP 打包器（无外部依赖）
  // -----------------------------

  function createCrc32Table() {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        if (c & 1) c = 0xedb88320 ^ (c >>> 1);
        else c = c >>> 1;
      }
      table[i] = c >>> 0;
    }
    return table;
  }

  const CRC32_TABLE = createCrc32Table();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      c = CRC32_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function writeU16(view, offset, value) {
    view[offset] = value & 0xff;
    view[offset + 1] = (value >>> 8) & 0xff;
  }

  function writeU32(view, offset, value) {
    view[offset] = value & 0xff;
    view[offset + 1] = (value >>> 8) & 0xff;
    view[offset + 2] = (value >>> 16) & 0xff;
    view[offset + 3] = (value >>> 24) & 0xff;
  }

  function toDosTime(ts) {
    const date = new Date(ts || Date.now());
    const seconds = Math.floor(date.getSeconds() / 2);
    return (
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      seconds
    ) & 0xffff;
  }

  function toDosDate(ts) {
    const date = new Date(ts || Date.now());
    const year = Math.max(1980, date.getFullYear());
    return (
      ((year - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate()
    ) & 0xffff;
  }

  function concatUint8(parts, totalLength) {
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
      result.set(part, offset);
      offset += part.length;
    }
    return result;
  }

  class SimpleZipBuilder {
    constructor() {
      this.files = [];
      this.encoder = new TextEncoder();
    }

    addText(name, text) {
      this.files.push({
        name,
        data: this.encoder.encode(String(text || '')),
        mtime: Date.now(),
      });
      return this;
    }

    async addBlob(name, blob) {
      const buffer = await blob.arrayBuffer();
      this.files.push({
        name,
        data: new Uint8Array(buffer),
        mtime: Date.now(),
      });
      return this;
    }

    addUint8(name, uint8) {
      this.files.push({
        name,
        data: uint8,
        mtime: Date.now(),
      });
      return this;
    }

    async build() {
      const localChunks = [];
      const centralChunks = [];
      let localOffset = 0;

      for (const file of this.files) {
        const nameBytes = this.encoder.encode(String(file.name || `file-${uid('zip')}`));
        const dataBytes = file.data instanceof Uint8Array ? file.data : this.encoder.encode('');
        const crc = crc32(dataBytes);
        const dosTime = toDosTime(file.mtime);
        const dosDate = toDosDate(file.mtime);

        const localHeader = new Uint8Array(30 + nameBytes.length);
        writeU32(localHeader, 0, 0x04034b50);
        writeU16(localHeader, 4, 20);
        writeU16(localHeader, 6, 0);
        writeU16(localHeader, 8, 0); // 存储模式（不压缩）
        writeU16(localHeader, 10, dosTime);
        writeU16(localHeader, 12, dosDate);
        writeU32(localHeader, 14, crc);
        writeU32(localHeader, 18, dataBytes.length);
        writeU32(localHeader, 22, dataBytes.length);
        writeU16(localHeader, 26, nameBytes.length);
        writeU16(localHeader, 28, 0);
        localHeader.set(nameBytes, 30);

        localChunks.push(localHeader, dataBytes);

        const centralHeader = new Uint8Array(46 + nameBytes.length);
        writeU32(centralHeader, 0, 0x02014b50);
        writeU16(centralHeader, 4, 20);
        writeU16(centralHeader, 6, 20);
        writeU16(centralHeader, 8, 0);
        writeU16(centralHeader, 10, 0);
        writeU16(centralHeader, 12, dosTime);
        writeU16(centralHeader, 14, dosDate);
        writeU32(centralHeader, 16, crc);
        writeU32(centralHeader, 20, dataBytes.length);
        writeU32(centralHeader, 24, dataBytes.length);
        writeU16(centralHeader, 28, nameBytes.length);
        writeU16(centralHeader, 30, 0);
        writeU16(centralHeader, 32, 0);
        writeU16(centralHeader, 34, 0);
        writeU16(centralHeader, 36, 0);
        writeU32(centralHeader, 38, 0);
        writeU32(centralHeader, 42, localOffset);
        centralHeader.set(nameBytes, 46);

        centralChunks.push(centralHeader);
        localOffset += localHeader.length + dataBytes.length;
      }

      const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const localSize = localChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const endRecord = new Uint8Array(22);
      writeU32(endRecord, 0, 0x06054b50);
      writeU16(endRecord, 4, 0);
      writeU16(endRecord, 6, 0);
      writeU16(endRecord, 8, this.files.length);
      writeU16(endRecord, 10, this.files.length);
      writeU32(endRecord, 12, centralSize);
      writeU32(endRecord, 16, localSize);
      writeU16(endRecord, 20, 0);

      const zipBytes = concatUint8([...localChunks, ...centralChunks, endRecord], localSize + centralSize + endRecord.length);
      return new Blob([zipBytes], { type: 'application/zip' });
    }
  }

  AISB.now = now;
  AISB.uid = uid;
  AISB.safeParseJSON = safeParseJSON;
  AISB.toAbsoluteUrl = toAbsoluteUrl;
  AISB.getCurrentAccountId = getCurrentAccountId;
  AISB.getScopedKey = getScopedKey;

  AISB.storage = {
    getRaw: storageGetRaw,
    setRaw: storageSetRaw,
    removeRaw: storageRemoveRaw,
    get: storageGet,
    set: storageSet,
    remove: storageRemove,
    mergeObject: storageMergeObject,
  };

  AISB.events = {
    emit,
    on,
  };

  AISB.route = {
    onChange: onRouteChange,
  };

  AISB.dom = {
    ensureStyle,
    ensureGeminiThemeStyles,
    observeElement,
    waitForElement,
    getGeminiSidebarRefs,
    mountInGeminiSidebar,
    extractConversationFromElement,
    extractConversationId,
    extractConversationTitle,
    extractConversationUrl,
    buildConversationUrlById,
  };

  AISB.utils = {
    copyText,
    downloadBlob,
    downloadText,
    toast,
    SimpleZipBuilder,
  };

  AISB.module = {
    register: registerModule,
    get: getModule,
  };

  ensureGeminiThemeStyles();

  window.__AISB_GEMINI__ = AISB;
})();
