(function () {
  'use strict';

  if (window.__AISB_GEMINI_PROMPT_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_PROMPT_LOADED__ = true;

  const core = window.__AISB_GEMINI__;
  if (!core) {
    console.error('[AISB Prompt] 缺少 gemini-common.js。');
    return;
  }

  const STORAGE_KEY = 'gvPromptItems';
  const SETTINGS_KEY = 'gvPromptSettings';
  const STYLE_ID = 'aisb-gemini-prompt-style';
  const WRAP_ID = 'aisb-gemini-prompt-wrap';

  const state = {
    items: [],
    settings: {
      search: '',
      tagFilter: '',
      categoryFilter: 'all',
      collapsed: false,
    },
    sidebarTimer: null,
    sidebarObserver: null,
    ui: {
      wrap: null,
      trigger: null,
      panel: null,
      list: null,
      search: null,
      tagFilter: null,
      categoryFilter: null,
      textInput: null,
      categoryInput: null,
      tagsInput: null,
      importInput: null,
      notice: null,
    },
  };

  function now() {
    return Date.now();
  }

  function uid() {
    return core.uid('prompt');
  }

  function sanitizeText(text) {
    return String(text || '')
      .replace(/\r\n/g, '\n')
      .trim();
  }

  function parseTags(input) {
    const list = String(input || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(list));
  }

  function ensureStyles() {
    core.dom.ensureStyle(
      STYLE_ID,
      `
      #${WRAP_ID} {
        position: relative;
        z-index: 1;
        width: 100%;
        margin: 8px 0 12px;
      }
      #${WRAP_ID} .aisb-prompt-trigger {
        width: 100%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid oklch(0.7227 0.192 149.5793 / 0.5);
        border-radius: 999px;
        background: linear-gradient(135deg, oklch(0.7227 0.192 149.5793), oklch(0.6959 0.1491 162.4796));
        box-shadow: 0 4px 16px oklch(0.7227 0.192 149.5793 / 0.3), 0 2px 8px oklch(0.7227 0.192 149.5793 / 0.2);
        color: #ffffff;
        padding: 10px 15px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
      }
      #${WRAP_ID} .aisb-prompt-trigger:hover {
        box-shadow: 0 6px 20px oklch(0.7227 0.192 149.5793 / 0.4), 0 4px 12px oklch(0.7227 0.192 149.5793 / 0.3);
        transform: translateY(-1px);
      }
      #${WRAP_ID} .aisb-prompt-trigger:active {
        transform: translateY(0);
      }
      #${WRAP_ID} .aisb-prompt-trigger:focus-visible {
        outline: 2px solid oklch(0.7227 0.192 149.5793 / 0.45);
        outline-offset: 2px;
      }
      #${WRAP_ID} .aisb-prompt-panel {
        width: 100%;
        max-width: 100%;
        max-height: min(75vh, 600px);
        overflow: hidden;
        border-radius: 16px;
        background: oklch(1 0 0);
        border: 1px solid oklch(0.9276 0.0058 264.5313 / 0.5);
        box-shadow: 0 10px 40px oklch(0 0 0 / 0.12), 0 4px 16px oklch(0 0 0 / 0.08);
        color: oklch(0.3729 0.0306 259.7328);
        margin-top: 10px;
        display: none;
      }
      #${WRAP_ID} .aisb-prompt-panel.open {
        display: block;
        animation: aisb-gm-fade-up 0.2s ease;
      }
      #${WRAP_ID} .aisb-prompt-head {
        padding: 14px 16px;
        border-bottom: 1px solid oklch(0.9276 0.0058 264.5313 / 0.5);
        background: linear-gradient(
          to bottom right,
          oklch(0.7227 0.192 149.5793 / 0.08),
          oklch(0.9505 0.0507 163.0508 / 0.04),
          transparent
        );
        display: grid;
        gap: 8px;
        backdrop-filter: blur(8px);
      }
      #${WRAP_ID} .aisb-prompt-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      #${WRAP_ID} .aisb-prompt-title {
        font-size: 17px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: oklch(0.7227 0.192 149.5793);
        text-shadow: 0 1px 2px oklch(0.7227 0.192 149.5793 / 0.1);
      }
      #${WRAP_ID} .aisb-prompt-mini-btn {
        height: 32px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 8px;
        background: transparent;
        color: #1f2937;
        font-size: 12px;
        font-weight: 500;
        padding: 0 12px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        transition: all 0.2s ease;
      }
      #${WRAP_ID} .aisb-prompt-mini-btn:hover {
        background: rgba(0, 0, 0, 0.05);
        border-color: rgba(0, 0, 0, 0.2);
      }
      #${WRAP_ID} .aisb-prompt-mini-btn:focus-visible {
        outline: 2px solid rgba(26, 115, 232, 0.45);
        outline-offset: 2px;
      }
      #${WRAP_ID} .aisb-prompt-input,
      #${WRAP_ID} .aisb-prompt-textarea,
      #${WRAP_ID} .aisb-prompt-select {
        width: 100%;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 10px;
        font-size: 12px;
        padding: 8px 10px;
        background: rgba(243, 244, 246, 0.8);
        color: #1f2937;
        box-sizing: border-box;
      }
      #${WRAP_ID} .aisb-prompt-textarea {
        min-height: 68px;
        max-height: 200px;
        resize: vertical;
      }
      #${WRAP_ID} .aisb-prompt-input::placeholder,
      #${WRAP_ID} .aisb-prompt-textarea::placeholder {
        color: #6b7280;
        opacity: 0.7;
      }
      #${WRAP_ID} .aisb-prompt-input:focus,
      #${WRAP_ID} .aisb-prompt-textarea:focus,
      #${WRAP_ID} .aisb-prompt-select:focus {
        border-color: rgba(26, 115, 232, 0.6);
        box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.12);
        outline: none;
      }
      #${WRAP_ID} .aisb-prompt-form {
        padding: 10px 12px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        display: grid;
        gap: 8px;
      }
      #${WRAP_ID} .aisb-prompt-form-actions {
        display: flex;
        gap: 8px;
      }
      #${WRAP_ID} .aisb-prompt-notice {
        min-height: 16px;
        font-size: 12px;
        color: #22c55e;
      }
      #${WRAP_ID} .aisb-prompt-notice.error { color: #ef4444; }
      #${WRAP_ID} .aisb-prompt-list {
        padding: 8px 12px 10px 12px;
        display: grid;
        gap: 6px;
        overflow: auto;
        max-height: 300px;
      }
      #${WRAP_ID} .aisb-prompt-empty {
        opacity: 0.75;
        font-size: 12px;
        color: #6b7280;
        padding: 12px;
        text-align: center;
      }
      #${WRAP_ID} .aisb-prompt-item {
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 10px;
        padding: 8px;
        background: rgba(243, 244, 246, 0.5);
        position: relative;
        transition: background-color 0.2s ease, border-color 0.2s ease;
      }
      #${WRAP_ID} .aisb-prompt-item:hover {
        border-color: rgba(0, 0, 0, 0.12);
        background: rgba(229, 231, 235, 0.7);
      }
      #${WRAP_ID} .aisb-prompt-item-text {
        font-size: 13px;
        color: #1f2937;
        line-height: 1.45;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      #${WRAP_ID} .aisb-prompt-meta {
        margin-top: 6px;
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      #${WRAP_ID} .aisb-prompt-chip {
        border-radius: 999px;
        font-size: 11px;
        line-height: 1;
        padding: 2px 8px;
        background: rgba(59, 130, 246, 0.12);
        color: #1e40af;
        border: 1px solid rgba(59, 130, 246, 0.30);
      }
      #${WRAP_ID} .aisb-prompt-actions {
        margin-top: 8px;
        display: flex;
        gap: 8px;
      }

      /* 深色模式：系统偏好 */
      @media (prefers-color-scheme: dark) {
        #${WRAP_ID} .aisb-prompt-trigger {
          background: linear-gradient(135deg, oklch(0.7729 0.1535 163.2231), oklch(0.7227 0.192 149.5793));
          border-color: oklch(0.7729 0.1535 163.2231 / 0.5);
          color: #ffffff;
        }
        #${WRAP_ID} .aisb-prompt-panel {
          background: oklch(0.2795 0.0368 260.031);
          color: oklch(0.8717 0.0093 258.3382);
          border-color: oklch(0.4461 0.0263 256.8018 / 0.5);
          box-shadow: 0 10px 40px oklch(0 0 0 / 0.3), 0 4px 16px oklch(0 0 0 / 0.2);
        }
        #${WRAP_ID} .aisb-prompt-head {
          background: linear-gradient(
            to bottom right,
            oklch(0.7729 0.1535 163.2231 / 0.08),
            oklch(0.3729 0.0306 259.7328 / 0.04),
            transparent
          );
          border-bottom-color: oklch(0.4461 0.0263 256.8018 / 0.5);
        }
        #${WRAP_ID} .aisb-prompt-title {
          color: oklch(0.7729 0.1535 163.2231);
          text-shadow: 0 1px 3px oklch(0.7729 0.1535 163.2231 / 0.2);
        }
        #${WRAP_ID} .aisb-prompt-mini-btn {
          border-color: rgba(255, 255, 255, 0.12);
          color: #e5e7eb;
        }
        #${WRAP_ID} .aisb-prompt-mini-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
        }
        #${WRAP_ID} .aisb-prompt-input,
        #${WRAP_ID} .aisb-prompt-textarea,
        #${WRAP_ID} .aisb-prompt-select {
          background: rgba(31, 41, 55, 0.6);
          color: #e5e7eb;
          border-color: rgba(255, 255, 255, 0.12);
        }
        #${WRAP_ID} .aisb-prompt-input::placeholder,
        #${WRAP_ID} .aisb-prompt-textarea::placeholder {
          color: #9ca3af;
        }
        #${WRAP_ID} .aisb-prompt-form {
          border-bottom-color: rgba(255, 255, 255, 0.08);
        }
        #${WRAP_ID} .aisb-prompt-empty {
          color: #9ca3af;
        }
        #${WRAP_ID} .aisb-prompt-item {
          background: rgba(17, 24, 39, 0.4);
          border-color: rgba(255, 255, 255, 0.08);
        }
        #${WRAP_ID} .aisb-prompt-item:hover {
          background: rgba(17, 24, 39, 0.55);
          border-color: rgba(255, 255, 255, 0.12);
        }
        #${WRAP_ID} .aisb-prompt-item-text {
          color: #e5e7eb;
        }
        #${WRAP_ID} .aisb-prompt-chip {
          background: rgba(59, 130, 246, 0.15);
          color: #c7d2fe;
          border-color: rgba(59, 130, 246, 0.35);
        }
      }

      /* 深色模式：显式主题类与属性 */
      html.dark-theme #${WRAP_ID} .aisb-prompt-trigger,
      body.dark-theme #${WRAP_ID} .aisb-prompt-trigger,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-trigger,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-trigger {
        background: linear-gradient(135deg, oklch(0.7729 0.1535 163.2231), oklch(0.7227 0.192 149.5793));
        border-color: oklch(0.7729 0.1535 163.2231 / 0.5);
      }
      html.dark-theme #${WRAP_ID} .aisb-prompt-panel,
      body.dark-theme #${WRAP_ID} .aisb-prompt-panel,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-panel,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-panel {
        background: oklch(0.2795 0.0368 260.031);
        color: oklch(0.8717 0.0093 258.3382);
        border-color: oklch(0.4461 0.0263 256.8018 / 0.5);
        box-shadow: 0 10px 40px oklch(0 0 0 / 0.3), 0 4px 16px oklch(0 0 0 / 0.2);
      }
      html.dark-theme #${WRAP_ID} .aisb-prompt-head,
      body.dark-theme #${WRAP_ID} .aisb-prompt-head,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-head,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-head {
        background: linear-gradient(
          to bottom right,
          oklch(0.7729 0.1535 163.2231 / 0.08),
          oklch(0.3729 0.0306 259.7328 / 0.04),
          transparent
        );
        border-bottom-color: oklch(0.4461 0.0263 256.8018 / 0.5);
      }
      html.dark-theme #${WRAP_ID} .aisb-prompt-title,
      body.dark-theme #${WRAP_ID} .aisb-prompt-title,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-title,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-title {
        color: oklch(0.7729 0.1535 163.2231);
        text-shadow: 0 1px 3px oklch(0.7729 0.1535 163.2231 / 0.2);
      }
      html.dark-theme #${WRAP_ID} .aisb-prompt-mini-btn,
      body.dark-theme #${WRAP_ID} .aisb-prompt-mini-btn,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-mini-btn,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-mini-btn {
        border-color: rgba(255, 255, 255, 0.12);
        color: #e5e7eb;
      }
      html.dark-theme #${WRAP_ID} .aisb-prompt-mini-btn:hover,
      body.dark-theme #${WRAP_ID} .aisb-prompt-mini-btn:hover,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-mini-btn:hover,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-mini-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.2);
      }
      html.dark-theme #${WRAP_ID} .aisb-prompt-input,
      body.dark-theme #${WRAP_ID} .aisb-prompt-input,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-input,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-input,
      html.dark-theme #${WRAP_ID} .aisb-prompt-textarea,
      body.dark-theme #${WRAP_ID} .aisb-prompt-textarea,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-textarea,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-textarea,
      html.dark-theme #${WRAP_ID} .aisb-prompt-select,
      body.dark-theme #${WRAP_ID} .aisb-prompt-select,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-select,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-select {
        background: rgba(31, 41, 55, 0.6);
        color: #e5e7eb;
        border-color: rgba(255, 255, 255, 0.12);
      }
      html.dark-theme #${WRAP_ID} .aisb-prompt-input::placeholder,
      body.dark-theme #${WRAP_ID} .aisb-prompt-input::placeholder,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-input::placeholder,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-input::placeholder,
      html.dark-theme #${WRAP_ID} .aisb-prompt-textarea::placeholder,
      body.dark-theme #${WRAP_ID} .aisb-prompt-textarea::placeholder,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-textarea::placeholder,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-textarea::placeholder {
        color: #9ca3af;
      }
      html.dark-theme #${WRAP_ID} .aisb-prompt-form,
      body.dark-theme #${WRAP_ID} .aisb-prompt-form,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-form,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-form {
        border-bottom-color: rgba(255, 255, 255, 0.08);
      }
      html.dark-theme #${WRAP_ID} .aisb-prompt-empty,
      body.dark-theme #${WRAP_ID} .aisb-prompt-empty,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-empty,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-empty {
        color: #9ca3af;
      }
      html.dark-theme #${WRAP_ID} .aisb-prompt-item,
      body.dark-theme #${WRAP_ID} .aisb-prompt-item,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-item,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-item {
        background: rgba(17, 24, 39, 0.4);
        border-color: rgba(255, 255, 255, 0.08);
      }
      html.dark-theme #${WRAP_ID} .aisb-prompt-item:hover,
      body.dark-theme #${WRAP_ID} .aisb-prompt-item:hover,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-item:hover,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-item:hover {
        background: rgba(17, 24, 39, 0.55);
        border-color: rgba(255, 255, 255, 0.12);
      }
      html.dark-theme #${WRAP_ID} .aisb-prompt-item-text,
      body.dark-theme #${WRAP_ID} .aisb-prompt-item-text,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-item-text,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-item-text {
        color: #e5e7eb;
      }
      html.dark-theme #${WRAP_ID} .aisb-prompt-chip,
      body.dark-theme #${WRAP_ID} .aisb-prompt-chip,
      html[data-theme="dark"] #${WRAP_ID} .aisb-prompt-chip,
      body[data-theme="dark"] #${WRAP_ID} .aisb-prompt-chip {
        background: rgba(59, 130, 246, 0.15);
        color: #c7d2fe;
        border-color: rgba(59, 130, 246, 0.35);
      }

      `,
    );
  }

  async function loadData() {
    const items = await core.storage.get(STORAGE_KEY, []);
    state.items = Array.isArray(items) ? items : [];

    const settings = await core.storage.get(SETTINGS_KEY, null);
    if (settings && typeof settings === 'object') {
      state.settings.search = typeof settings.search === 'string' ? settings.search : '';
      state.settings.tagFilter = typeof settings.tagFilter === 'string' ? settings.tagFilter : '';
      state.settings.categoryFilter =
        typeof settings.categoryFilter === 'string' ? settings.categoryFilter : 'all';
      state.settings.collapsed = Boolean(settings.collapsed);
    }
  }

  async function saveData() {
    await core.storage.set(STORAGE_KEY, state.items);
    core.events.emit('prompt:data-updated', {
      count: state.items.length,
      updatedAt: now(),
    });
  }

  async function saveSettings() {
    await core.storage.set(SETTINGS_KEY, {
      search: state.settings.search,
      tagFilter: state.settings.tagFilter,
      categoryFilter: state.settings.categoryFilter,
      collapsed: state.settings.collapsed,
    });
  }

  function ensureWrapMountedInSidebar() {
    if (!state.ui.wrap) return false;
    return core.dom.mountInGeminiSidebar(state.ui.wrap, { beforeRecent: true });
  }

  // 侧边栏被 Gemini 重绘后，需要把提示词模块重新插回最近会话区域之前。
  function scheduleSidebarRemount(delay) {
    if (state.sidebarTimer) {
      clearTimeout(state.sidebarTimer);
      state.sidebarTimer = null;
    }
    state.sidebarTimer = setTimeout(() => {
      state.sidebarTimer = null;
      ensureWrapMountedInSidebar();
    }, Number(delay) > 0 ? Number(delay) : 220);
  }

  function watchSidebarLifecycle() {
    if (state.sidebarObserver) {
      state.sidebarObserver.disconnect();
      state.sidebarObserver = null;
    }

    state.sidebarObserver = new MutationObserver(() => {
      if (!state.ui.wrap) return;
      if (!state.ui.wrap.isConnected) {
        scheduleSidebarRemount(120);
      }
    });

    state.sidebarObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function setNotice(message, type) {
    if (!state.ui.notice) return;
    state.ui.notice.textContent = message || '';
    state.ui.notice.className = `aisb-prompt-notice ${type || ''}`;

    if (message) {
      setTimeout(() => {
        if (!state.ui.notice) return;
        state.ui.notice.textContent = '';
        state.ui.notice.className = 'aisb-prompt-notice';
      }, 3200);
    }
  }

  function getInputElement() {
    const selectors = [
      'rich-textarea textarea',
      'textarea[aria-label]',
      'textarea',
      'div[contenteditable="true"]',
      '.ql-editor[contenteditable="true"]',
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (node instanceof HTMLElement) {
        return node;
      }
    }

    return null;
  }

  function getCurrentInputText() {
    const input = getInputElement();
    if (!input) return '';

    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      return input.value || '';
    }

    return input.innerText || input.textContent || '';
  }

  function insertPromptText(text) {
    const payload = sanitizeText(text);
    if (!payload) return false;

    const input = getInputElement();
    if (!input) {
      setNotice('未找到输入框，请先聚焦 Gemini 输入区域', 'error');
      return false;
    }

    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      const current = input.value || '';
      const next = current && !current.endsWith('\n') ? `${current}\n${payload}` : `${current}${payload}`;
      input.value = next;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
      setNotice('已插入提示词', '');
      return true;
    }

    input.focus();
    try {
      document.execCommand('insertText', false, `${payload}\n`);
    } catch (_) {
      const current = input.textContent || '';
      input.textContent = current ? `${current}\n${payload}` : payload;
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
    setNotice('已插入提示词', '');
    return true;
  }

  function updateCategoryFilterOptions() {
    if (!state.ui.categoryFilter) return;

    const categories = new Set();
    for (const item of state.items) {
      if (item.category) {
        categories.add(item.category);
      }
    }

    const current = state.settings.categoryFilter;
    state.ui.categoryFilter.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = '全部分类';
    state.ui.categoryFilter.appendChild(allOption);

    Array.from(categories)
      .sort((a, b) => a.localeCompare(b, 'zh-CN'))
      .forEach((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        state.ui.categoryFilter.appendChild(option);
      });

    state.ui.categoryFilter.value = categories.has(current) || current === 'all' ? current : 'all';
  }

  function getFilteredItems() {
    const search = state.settings.search.trim().toLowerCase();
    const tagFilter = state.settings.tagFilter.trim().toLowerCase();
    const categoryFilter = state.settings.categoryFilter;

    return state.items
      .filter((item) => {
        if (categoryFilter !== 'all' && item.category !== categoryFilter) {
          return false;
        }

        if (search) {
          const hitText = String(item.text || '').toLowerCase().includes(search);
          const hitTags = Array.isArray(item.tags)
            ? item.tags.some((tag) => String(tag).toLowerCase().includes(search))
            : false;
          const hitCategory = String(item.category || '').toLowerCase().includes(search);
          if (!hitText && !hitTags && !hitCategory) {
            return false;
          }
        }

        if (tagFilter) {
          if (!Array.isArray(item.tags) || !item.tags.some((tag) => String(tag).toLowerCase().includes(tagFilter))) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
  }

  function renderList() {
    if (!state.ui.list) return;

    updateCategoryFilterOptions();

    const items = getFilteredItems();
    state.ui.list.innerHTML = '';

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'aisb-prompt-empty';
      empty.textContent = '暂无提示词，先保存一条常用提示吧。';
      state.ui.list.appendChild(empty);
      return;
    }

    for (const item of items) {
      const card = document.createElement('article');
      card.className = 'aisb-prompt-item';

      const text = document.createElement('div');
      text.className = 'aisb-prompt-item-text';
      text.textContent = item.text || '';

      const meta = document.createElement('div');
      meta.className = 'aisb-prompt-meta';

      if (item.category) {
        const category = document.createElement('span');
        category.className = 'aisb-prompt-chip';
        category.textContent = `分类: ${item.category}`;
        meta.appendChild(category);
      }

      if (Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          const chip = document.createElement('span');
          chip.className = 'aisb-prompt-chip';
          chip.textContent = `#${tag}`;
          meta.appendChild(chip);
        }
      }

      const actions = document.createElement('div');
      actions.className = 'aisb-prompt-actions';

      const insertBtn = document.createElement('button');
      insertBtn.type = 'button';
      insertBtn.className = 'aisb-prompt-mini-btn';
      insertBtn.textContent = '插入';
      insertBtn.addEventListener('click', () => {
        insertPromptText(item.text || '');
      });

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'aisb-prompt-mini-btn';
      copyBtn.textContent = '复制';
      copyBtn.addEventListener('click', async () => {
        const ok = await core.utils.copyText(item.text || '');
        setNotice(ok ? '已复制提示词' : '复制失败', ok ? '' : 'error');
      });

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'aisb-prompt-mini-btn';
      editBtn.textContent = '编辑';
      editBtn.addEventListener('click', () => {
        if (!state.ui.textInput || !state.ui.categoryInput || !state.ui.tagsInput) return;
        state.ui.textInput.value = item.text || '';
        state.ui.categoryInput.value = item.category || '';
        state.ui.tagsInput.value = Array.isArray(item.tags) ? item.tags.join(', ') : '';

        // 记录编辑上下文。
        state.ui.textInput.dataset.editingId = item.id;
        state.ui.textInput.focus();
        setNotice('已加载到编辑区，保存后将覆盖该条目', '');
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'aisb-prompt-mini-btn';
      deleteBtn.textContent = '删除';
      deleteBtn.addEventListener('click', async () => {
        const ok = confirm('确认删除该提示词？');
        if (!ok) return;
        state.items = state.items.filter((entry) => entry.id !== item.id);
        await saveData();
        renderList();
        setNotice('已删除提示词', '');
      });

      actions.appendChild(insertBtn);
      actions.appendChild(copyBtn);
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      card.appendChild(text);
      card.appendChild(meta);
      card.appendChild(actions);

      state.ui.list.appendChild(card);
    }
  }

  async function saveFromForm() {
    if (!state.ui.textInput || !state.ui.categoryInput || !state.ui.tagsInput) return;

    const text = sanitizeText(state.ui.textInput.value);
    const category = sanitizeText(state.ui.categoryInput.value);
    const tags = parseTags(state.ui.tagsInput.value);

    if (!text) {
      setNotice('提示词内容不能为空', 'error');
      return;
    }

    const editingId = state.ui.textInput.dataset.editingId;
    if (editingId) {
      const target = state.items.find((entry) => entry.id === editingId);
      if (!target) {
        setNotice('未找到要编辑的条目，请重试', 'error');
        return;
      }
      target.text = text;
      target.category = category;
      target.tags = tags;
      target.updatedAt = now();
      delete state.ui.textInput.dataset.editingId;
      setNotice('提示词已更新', '');
    } else {
      const duplicate = state.items.some((entry) => sanitizeText(entry.text) === text);
      if (duplicate) {
        setNotice('相同内容已存在，可直接复用或编辑原条目', 'error');
        return;
      }
      state.items.push({
        id: uid(),
        text,
        category,
        tags,
        createdAt: now(),
        updatedAt: now(),
        source: 'gemini',
      });
      setNotice('提示词已保存', '');
    }

    await saveData();
    renderList();

    state.ui.textInput.value = '';
    state.ui.categoryInput.value = '';
    state.ui.tagsInput.value = '';
  }

  function exportPrompts() {
    const payload = {
      format: 'aisb-gemini.prompts.v1',
      exportedAt: new Date().toISOString(),
      count: state.items.length,
      items: state.items,
    };

    core.utils.downloadText(`prompts-${Date.now()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    setNotice('提示词已导出', '');
  }

  async function importPrompts(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = core.safeParseJSON(text, null);
      if (!parsed || typeof parsed !== 'object') {
        setNotice('导入失败：文件不是有效 JSON', 'error');
        return;
      }

      const items = Array.isArray(parsed.items)
        ? parsed.items
        : Array.isArray(parsed)
          ? parsed
          : null;

      if (!items) {
        setNotice('导入失败：缺少 items 字段', 'error');
        return;
      }

      let added = 0;
      for (const raw of items) {
        const text = sanitizeText(raw && raw.text);
        if (!text) continue;

        const duplicate = state.items.find((item) => sanitizeText(item.text) === text);
        if (duplicate) {
          // 合并标签，避免导入重复污染。
          const mergedTags = Array.from(new Set([...(duplicate.tags || []), ...parseTags((raw && raw.tags) || '')]));
          duplicate.tags = mergedTags;
          duplicate.updatedAt = now();
          continue;
        }

        state.items.push({
          id: uid(),
          text,
          category: sanitizeText(raw && raw.category),
          tags: Array.isArray(raw && raw.tags) ? parseTags(raw.tags.join(',')) : parseTags(raw && raw.tags),
          createdAt: now(),
          updatedAt: now(),
          source: 'import',
        });
        added += 1;
      }

      await saveData();
      renderList();
      setNotice(`导入完成，新增 ${added} 条`, '');
    } catch (error) {
      console.error('[AISB Prompt] 导入失败：', error);
      setNotice('导入失败：解析异常', 'error');
    }
  }

  function togglePanel() {
    if (!state.ui.panel) return;
    const open = state.ui.panel.classList.contains('open');
    state.ui.panel.classList.toggle('open', !open);
    state.settings.collapsed = open;
    void saveSettings();
  }

  function closePanel() {
    if (!state.ui.panel) return;
    state.ui.panel.classList.remove('open');
    state.settings.collapsed = true;
    void saveSettings();
  }

  function mount() {
    ensureStyles();

    const wrap = document.createElement('section');
    wrap.id = WRAP_ID;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'aisb-prompt-trigger';
    trigger.textContent = '提示词';
    trigger.title = '打开提示词库';
    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      togglePanel();
    });

    const panel = document.createElement('div');
    panel.className = `aisb-prompt-panel ${state.settings.collapsed ? '' : 'open'}`;

    const head = document.createElement('div');
    head.className = 'aisb-prompt-head';

    const titleRow = document.createElement('div');
    titleRow.className = 'aisb-prompt-title-row';

    const title = document.createElement('div');
    title.className = 'aisb-prompt-title';
    title.textContent = '提示词库';

    const captureBtn = document.createElement('button');
    captureBtn.type = 'button';
    captureBtn.className = 'aisb-prompt-mini-btn';
    captureBtn.textContent = '抓取输入框';
    captureBtn.addEventListener('click', () => {
      if (!state.ui.textInput) return;
      const current = sanitizeText(getCurrentInputText());
      if (!current) {
        setNotice('当前输入框为空', 'error');
        return;
      }
      state.ui.textInput.value = current;
      state.ui.textInput.focus();
      setNotice('已读取当前输入内容', '');
    });

    titleRow.appendChild(title);
    titleRow.appendChild(captureBtn);

    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'aisb-prompt-input';
    search.placeholder = '搜索内容/标签/分类';
    search.value = state.settings.search;
    search.addEventListener('input', () => {
      state.settings.search = search.value;
      void saveSettings();
      renderList();
    });

    const filterRow = document.createElement('div');
    filterRow.style.display = 'grid';
    filterRow.style.gridTemplateColumns = '1fr 1fr';
    filterRow.style.gap = '8px';

    const tagFilter = document.createElement('input');
    tagFilter.type = 'search';
    tagFilter.className = 'aisb-prompt-input';
    tagFilter.placeholder = '按标签过滤';
    tagFilter.value = state.settings.tagFilter;
    tagFilter.addEventListener('input', () => {
      state.settings.tagFilter = tagFilter.value;
      void saveSettings();
      renderList();
    });

    const categoryFilter = document.createElement('select');
    categoryFilter.className = 'aisb-prompt-select';
    categoryFilter.addEventListener('change', () => {
      state.settings.categoryFilter = categoryFilter.value;
      void saveSettings();
      renderList();
    });

    filterRow.appendChild(tagFilter);
    filterRow.appendChild(categoryFilter);

    head.appendChild(titleRow);
    head.appendChild(search);
    head.appendChild(filterRow);

    const form = document.createElement('div');
    form.className = 'aisb-prompt-form';

    const textInput = document.createElement('textarea');
    textInput.className = 'aisb-prompt-textarea';
    textInput.placeholder = '输入提示词内容';

    const categoryInput = document.createElement('input');
    categoryInput.type = 'text';
    categoryInput.className = 'aisb-prompt-input';
    categoryInput.placeholder = '分类（可选）';

    const tagsInput = document.createElement('input');
    tagsInput.type = 'text';
    tagsInput.className = 'aisb-prompt-input';
    tagsInput.placeholder = '标签，逗号分隔（如 coding, review）';

    const notice = document.createElement('div');
    notice.className = 'aisb-prompt-notice';

    const formActions = document.createElement('div');
    formActions.className = 'aisb-prompt-form-actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'aisb-prompt-mini-btn';
    saveBtn.textContent = '保存';
    saveBtn.addEventListener('click', () => {
      void saveFromForm();
    });

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'aisb-prompt-mini-btn';
    clearBtn.textContent = '清空';
    clearBtn.addEventListener('click', () => {
      textInput.value = '';
      categoryInput.value = '';
      tagsInput.value = '';
      delete textInput.dataset.editingId;
    });

    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json,application/json';
    importInput.style.display = 'none';
    importInput.addEventListener('change', async () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      await importPrompts(file);
      importInput.value = '';
    });

    const importBtn = document.createElement('button');
    importBtn.type = 'button';
    importBtn.className = 'aisb-prompt-mini-btn';
    importBtn.textContent = '导入';
    importBtn.addEventListener('click', () => {
      importInput.click();
    });

    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'aisb-prompt-mini-btn';
    exportBtn.textContent = '导出';
    exportBtn.addEventListener('click', exportPrompts);

    formActions.appendChild(saveBtn);
    formActions.appendChild(clearBtn);
    formActions.appendChild(importBtn);
    formActions.appendChild(exportBtn);

    form.appendChild(textInput);
    form.appendChild(categoryInput);
    form.appendChild(tagsInput);
    form.appendChild(notice);
    form.appendChild(formActions);
    form.appendChild(importInput);

    const list = document.createElement('div');
    list.className = 'aisb-prompt-list';

    panel.appendChild(head);
    panel.appendChild(form);
    panel.appendChild(list);

    wrap.appendChild(trigger);
    wrap.appendChild(panel);

    state.ui.wrap = wrap;
    state.ui.trigger = trigger;
    state.ui.panel = panel;
    state.ui.list = list;
    state.ui.search = search;
    state.ui.tagFilter = tagFilter;
    state.ui.categoryFilter = categoryFilter;
    state.ui.textInput = textInput;
    state.ui.categoryInput = categoryInput;
    state.ui.tagsInput = tagsInput;
    state.ui.importInput = importInput;
    state.ui.notice = notice;

    renderList();

    document.addEventListener('click', (event) => {
      if (!wrap.contains(event.target)) {
        closePanel();
      }
    });

    return ensureWrapMountedInSidebar();
  }

  async function bootstrap() {
    await loadData();
    const mounted = mount();
    watchSidebarLifecycle();

    if (!mounted) {
      let retries = 0;
      const timer = setInterval(() => {
        retries += 1;
        if (ensureWrapMountedInSidebar() || retries > 80) {
          clearInterval(timer);
        }
      }, 320);
    }

    core.route.onChange(() => {
      scheduleSidebarRemount(260);
    });

    core.module.register('prompt', {
      getItems: () => state.items.slice(),
      setItems: async (items) => {
        state.items = Array.isArray(items) ? items : [];
        await saveData();
        renderList();
      },
      exportData: () => ({
        format: 'aisb-gemini.prompts.v1',
        exportedAt: new Date().toISOString(),
        items: state.items.slice(),
      }),
      importData: async (payload) => {
        const list = Array.isArray(payload && payload.items)
          ? payload.items
          : Array.isArray(payload)
            ? payload
            : [];
        for (const raw of list) {
          const text = sanitizeText(raw && raw.text);
          if (!text) continue;
          const duplicate = state.items.find((item) => sanitizeText(item.text) === text);
          if (duplicate) continue;
          state.items.push({
            id: uid(),
            text,
            category: sanitizeText(raw && raw.category),
            tags: Array.isArray(raw && raw.tags)
              ? raw.tags.map((tag) => String(tag).toLowerCase()).filter(Boolean)
              : [],
            createdAt: now(),
            updatedAt: now(),
            source: 'import',
          });
        }
        await saveData();
        renderList();
        return state.items.length;
      },
      insertPromptText,
    });
  }

  bootstrap().catch((error) => {
    console.error('[AISB Prompt] 初始化失败：', error);
  });
})();
