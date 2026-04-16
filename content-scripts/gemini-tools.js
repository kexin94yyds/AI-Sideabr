(function () {
  'use strict';

  if (window.__AISB_GEMINI_TOOLS_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_TOOLS_LOADED__ = true;

  const core = window.__AISB_GEMINI__;
  if (!core) {
    console.error('[AISB Tools] 缺少 gemini-common.js。');
    return;
  }

  const STORAGE_KEY = 'gvToolsSettings';
  const STYLE_ID = 'aisb-gemini-tools-style';
  const PANEL_ID = 'aisb-gemini-tools-panel';

  const state = {
    settings: {
      titleSyncEnabled: true,
      hideRecents: false,
      inputCollapsed: false,
      defaultModelName: '',
    },
    ui: {
      panel: null,
      quoteBtn: null,
      batchBar: null,
      modelInput: null,
    },
    batch: {
      active: false,
      selected: new Set(),
    },
    sidebarTimer: null,
    observers: {
      title: null,
      batch: null,
      input: null,
      sidebar: null,
    },
  };

  function ensureStyles() {
    core.dom.ensureStyle(
      STYLE_ID,
      `
      #${PANEL_ID} {
        position: relative;
        z-index: 1;
        width: 100%;
        margin: 8px 0 12px;
        border-radius: 16px;
        border: 1px solid var(--aisb-gm-color-outline-variant, rgba(0, 0, 0, 0.12));
        background: var(--aisb-gm-color-surface, #ffffff);
        color: var(--aisb-gm-color-on-surface, #1f2937);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08);
        padding: 12px;
        animation: aisb-gm-fade-up 0.2s ease;
      }
      #${PANEL_ID} * {
        box-sizing: border-box;
      }
      #${PANEL_ID} .aisb-tools-title {
        margin: 0 0 10px;
        font-size: 13px;
        color: var(--aisb-gm-color-on-surface-variant, #5f6368);
        font-weight: 600;
        letter-spacing: 0.01em;
      }
      #${PANEL_ID} .aisb-tools-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      #${PANEL_ID} .aisb-tools-btn {
        height: 32px;
        min-height: 32px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 8px;
        background: transparent;
        color: #1f2937;
        font-size: 12px;
        font-weight: 500;
        line-height: 1;
        padding: 0 10px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        transition: all 0.2s ease;
      }
      #${PANEL_ID} .aisb-tools-btn:hover {
        background: rgba(0, 0, 0, 0.05);
        border-color: rgba(0, 0, 0, 0.2);
      }
      #${PANEL_ID} .aisb-tools-btn.active {
        background: rgba(59, 130, 246, 0.12);
        border-color: rgba(59, 130, 246, 0.3);
        color: #1e40af;
      }
      #${PANEL_ID} .aisb-tools-model-row {
        margin-top: 10px;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
      }
      #${PANEL_ID} .aisb-tools-input {
        height: 32px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 8px;
        background: transparent;
        color: #1f2937;
        font-size: 12px;
        padding: 0 10px;
      }
      #${PANEL_ID} .aisb-tools-input::placeholder {
        color: #6b7280;
        opacity: 0.85;
      }
      #${PANEL_ID} .aisb-tools-input:focus {
        border-color: rgba(26, 115, 232, 0.6);
        box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.18);
        outline: none;
      }
      #${PANEL_ID} .aisb-tools-note {
        margin-top: 8px;
        font-size: 12px;
        color: #6b7280;
        line-height: 1.35;
      }
      .aisb-tools-quote-btn {
        position: fixed;
        z-index: 9999;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        background-color: #1e1e1e;
        color: #ffffff;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .aisb-tools-quote-btn:hover {
        background-color: #2d2d2d;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }
      .aisb-tools-batchbar {
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        top: 10px;
        z-index: 2147483645;
        border-radius: 10px;
        border: 1px solid #10b981;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(16, 185, 129, 0.25) 100%);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.16), 0 2px 4px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(16, 185, 129, 0.35);
        padding: 8px 10px;
        display: none;
        align-items: center;
        gap: 6px;
        animation: aisb-gm-fade-up 0.2s ease;
      }
      .aisb-tools-batchbar.show {
        display: flex;
      }
      .aisb-tools-batchbar .label {
        font-size: 12px;
        font-weight: 500;
        color: #065f46;
        margin-right: 2px;
      }
      .aisb-tools-batchbar button {
        height: 28px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 7px;
        background: rgba(255, 255, 255, 0.72);
        color: #1f2937;
        font-size: 12px;
        line-height: 1;
        padding: 0 10px;
        cursor: pointer;
      }
      .aisb-tools-batchbar button:hover {
        background: #ffffff;
        border-color: rgba(0, 0, 0, 0.2);
      }
      [data-test-id="conversation"].aisb-tools-batch-item {
        position: relative;
      }
      [data-test-id="conversation"].aisb-tools-batch-item .aisb-tools-batch-check {
        position: absolute;
        left: 6px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 3;
      }
      [data-test-id="conversation"].aisb-tools-batch-item.aisb-tools-selected {
        outline: none;
        box-shadow: inset 3px 0 0 #34d399;
        background: linear-gradient(to right, rgba(16, 185, 129, 0.12) 0%, transparent 100%);
      }
      .aisb-tools-input-collapsed {
        max-height: 44px !important;
        overflow: hidden !important;
      }

      @media (prefers-color-scheme: light) {
        .aisb-tools-quote-btn {
          background-color: #ffffff;
          color: #1f1f1f;
          border-color: rgba(0, 0, 0, 0.08);
        }
        .aisb-tools-quote-btn:hover {
          background-color: #f5f5f5;
        }
      }

      /* 显式浅色主题 */
      .theme-host.light-theme .aisb-tools-quote-btn,
      html.light-theme .aisb-tools-quote-btn,
      body.light-theme .aisb-tools-quote-btn,
      html[data-theme="light"] .aisb-tools-quote-btn,
      body[data-theme="light"] .aisb-tools-quote-btn {
        background-color: #ffffff;
        color: #1f1f1f;
        border-color: rgba(0, 0, 0, 0.08);
      }
      .theme-host.light-theme .aisb-tools-quote-btn:hover,
      html.light-theme .aisb-tools-quote-btn:hover,
      body.light-theme .aisb-tools-quote-btn:hover,
      html[data-theme="light"] .aisb-tools-quote-btn:hover,
      body[data-theme="light"] .aisb-tools-quote-btn:hover {
        background-color: #f5f5f5;
      }

      @media (prefers-color-scheme: dark) {
        #${PANEL_ID} {
          border-color: rgba(255, 255, 255, 0.18);
          background: #1f2937;
          color: #e5e7eb;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2);
        }
        #${PANEL_ID} .aisb-tools-title,
        #${PANEL_ID} .aisb-tools-note {
          color: #9ca3af;
        }
        #${PANEL_ID} .aisb-tools-btn {
          border-color: rgba(255, 255, 255, 0.12);
          color: #e5e7eb;
        }
        #${PANEL_ID} .aisb-tools-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
        }
        #${PANEL_ID} .aisb-tools-btn.active {
          background: rgba(59, 130, 246, 0.24);
          border-color: rgba(96, 165, 250, 0.52);
          color: #dbeafe;
        }
        #${PANEL_ID} .aisb-tools-input {
          background: rgba(31, 41, 55, 0.72);
          color: #e5e7eb;
          border-color: rgba(255, 255, 255, 0.12);
        }
        #${PANEL_ID} .aisb-tools-input::placeholder {
          color: #9ca3af;
        }
        .aisb-tools-batchbar {
          border-color: rgba(16, 185, 129, 0.72);
          background: linear-gradient(135deg, rgba(6, 78, 59, 0.88) 0%, rgba(4, 120, 87, 0.9) 100%);
          box-shadow: 0 8px 18px rgba(2, 6, 23, 0.38), 0 0 0 1px rgba(16, 185, 129, 0.42);
        }
        .aisb-tools-batchbar .label {
          color: #d1fae5;
        }
        .aisb-tools-batchbar button {
          border-color: rgba(255, 255, 255, 0.14);
          background: rgba(2, 6, 23, 0.36);
          color: #e5e7eb;
        }
        .aisb-tools-batchbar button:hover {
          background: rgba(15, 23, 42, 0.52);
          border-color: rgba(255, 255, 255, 0.24);
        }
        [data-test-id="conversation"].aisb-tools-batch-item.aisb-tools-selected {
          box-shadow: inset 3px 0 0 #6ee7b7;
          background: linear-gradient(to right, rgba(16, 185, 129, 0.1) 0%, transparent 100%);
        }
      }

      /* 显式深色主题 */
      .theme-host.dark-theme #${PANEL_ID},
      html.dark-theme #${PANEL_ID},
      body.dark-theme #${PANEL_ID},
      html[data-theme="dark"] #${PANEL_ID},
      body[data-theme="dark"] #${PANEL_ID} {
        border-color: rgba(255, 255, 255, 0.18);
        background: #1f2937;
        color: #e5e7eb;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2);
      }
      .theme-host.dark-theme #${PANEL_ID} .aisb-tools-title,
      .theme-host.dark-theme #${PANEL_ID} .aisb-tools-note,
      html.dark-theme #${PANEL_ID} .aisb-tools-title,
      body.dark-theme #${PANEL_ID} .aisb-tools-title,
      html[data-theme="dark"] #${PANEL_ID} .aisb-tools-title,
      body[data-theme="dark"] #${PANEL_ID} .aisb-tools-title,
      html.dark-theme #${PANEL_ID} .aisb-tools-note,
      body.dark-theme #${PANEL_ID} .aisb-tools-note,
      html[data-theme="dark"] #${PANEL_ID} .aisb-tools-note,
      body[data-theme="dark"] #${PANEL_ID} .aisb-tools-note {
        color: #9ca3af;
      }
      .theme-host.dark-theme #${PANEL_ID} .aisb-tools-btn,
      html.dark-theme #${PANEL_ID} .aisb-tools-btn,
      body.dark-theme #${PANEL_ID} .aisb-tools-btn,
      html[data-theme="dark"] #${PANEL_ID} .aisb-tools-btn,
      body[data-theme="dark"] #${PANEL_ID} .aisb-tools-btn {
        border-color: rgba(255, 255, 255, 0.12);
        color: #e5e7eb;
      }
      .theme-host.dark-theme #${PANEL_ID} .aisb-tools-btn:hover,
      html.dark-theme #${PANEL_ID} .aisb-tools-btn:hover,
      body.dark-theme #${PANEL_ID} .aisb-tools-btn:hover,
      html[data-theme="dark"] #${PANEL_ID} .aisb-tools-btn:hover,
      body[data-theme="dark"] #${PANEL_ID} .aisb-tools-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.2);
      }
      .theme-host.dark-theme #${PANEL_ID} .aisb-tools-btn.active,
      html.dark-theme #${PANEL_ID} .aisb-tools-btn.active,
      body.dark-theme #${PANEL_ID} .aisb-tools-btn.active,
      html[data-theme="dark"] #${PANEL_ID} .aisb-tools-btn.active,
      body[data-theme="dark"] #${PANEL_ID} .aisb-tools-btn.active {
        background: rgba(59, 130, 246, 0.24);
        border-color: rgba(96, 165, 250, 0.52);
        color: #dbeafe;
      }
      .theme-host.dark-theme #${PANEL_ID} .aisb-tools-input,
      html.dark-theme #${PANEL_ID} .aisb-tools-input,
      body.dark-theme #${PANEL_ID} .aisb-tools-input,
      html[data-theme="dark"] #${PANEL_ID} .aisb-tools-input,
      body[data-theme="dark"] #${PANEL_ID} .aisb-tools-input {
        background: rgba(31, 41, 55, 0.72);
        color: #e5e7eb;
        border-color: rgba(255, 255, 255, 0.12);
      }
      .theme-host.dark-theme #${PANEL_ID} .aisb-tools-input::placeholder,
      html.dark-theme #${PANEL_ID} .aisb-tools-input::placeholder,
      body.dark-theme #${PANEL_ID} .aisb-tools-input::placeholder,
      html[data-theme="dark"] #${PANEL_ID} .aisb-tools-input::placeholder,
      body[data-theme="dark"] #${PANEL_ID} .aisb-tools-input::placeholder {
        color: #9ca3af;
      }
      .theme-host.dark-theme .aisb-tools-batchbar,
      html.dark-theme .aisb-tools-batchbar,
      body.dark-theme .aisb-tools-batchbar,
      html[data-theme="dark"] .aisb-tools-batchbar,
      body[data-theme="dark"] .aisb-tools-batchbar {
        border-color: rgba(16, 185, 129, 0.72);
        background: linear-gradient(135deg, rgba(6, 78, 59, 0.88) 0%, rgba(4, 120, 87, 0.9) 100%);
        box-shadow: 0 8px 18px rgba(2, 6, 23, 0.38), 0 0 0 1px rgba(16, 185, 129, 0.42);
      }
      .theme-host.dark-theme .aisb-tools-batchbar .label,
      html.dark-theme .aisb-tools-batchbar .label,
      body.dark-theme .aisb-tools-batchbar .label,
      html[data-theme="dark"] .aisb-tools-batchbar .label,
      body[data-theme="dark"] .aisb-tools-batchbar .label {
        color: #d1fae5;
      }
      .theme-host.dark-theme .aisb-tools-batchbar button,
      html.dark-theme .aisb-tools-batchbar button,
      body.dark-theme .aisb-tools-batchbar button,
      html[data-theme="dark"] .aisb-tools-batchbar button,
      body[data-theme="dark"] .aisb-tools-batchbar button {
        border-color: rgba(255, 255, 255, 0.14);
        background: rgba(2, 6, 23, 0.36);
        color: #e5e7eb;
      }
      .theme-host.dark-theme .aisb-tools-batchbar button:hover,
      html.dark-theme .aisb-tools-batchbar button:hover,
      body.dark-theme .aisb-tools-batchbar button:hover,
      html[data-theme="dark"] .aisb-tools-batchbar button:hover,
      body[data-theme="dark"] .aisb-tools-batchbar button:hover {
        background: rgba(15, 23, 42, 0.52);
        border-color: rgba(255, 255, 255, 0.24);
      }
      .theme-host.dark-theme [data-test-id="conversation"].aisb-tools-batch-item.aisb-tools-selected,
      html.dark-theme [data-test-id="conversation"].aisb-tools-batch-item.aisb-tools-selected,
      body.dark-theme [data-test-id="conversation"].aisb-tools-batch-item.aisb-tools-selected,
      html[data-theme="dark"] [data-test-id="conversation"].aisb-tools-batch-item.aisb-tools-selected,
      body[data-theme="dark"] [data-test-id="conversation"].aisb-tools-batch-item.aisb-tools-selected {
        box-shadow: inset 3px 0 0 #6ee7b7;
        background: linear-gradient(to right, rgba(16, 185, 129, 0.1) 0%, transparent 100%);
      }

      @media (max-width: 640px) {
        #${PANEL_ID} .aisb-tools-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      `,
    );
  }

  async function loadSettings() {
    const settings = await core.storage.get(STORAGE_KEY, null);
    if (settings && typeof settings === 'object') {
      state.settings.titleSyncEnabled = settings.titleSyncEnabled !== false;
      state.settings.hideRecents = Boolean(settings.hideRecents);
      state.settings.inputCollapsed = Boolean(settings.inputCollapsed);
      state.settings.defaultModelName = typeof settings.defaultModelName === 'string' ? settings.defaultModelName : '';
    }
  }

  async function saveSettings() {
    await core.storage.set(STORAGE_KEY, {
      titleSyncEnabled: state.settings.titleSyncEnabled,
      hideRecents: state.settings.hideRecents,
      inputCollapsed: state.settings.inputCollapsed,
      defaultModelName: state.settings.defaultModelName,
    });
  }

  function ensurePanelMountedInSidebar() {
    if (!state.ui.panel) return false;
    return core.dom.mountInGeminiSidebar(state.ui.panel, { beforeRecent: true });
  }

  // Gemini 是 SPA，侧边栏经常重建，这里统一做一次防抖重挂载。
  function scheduleSidebarRemount(delay) {
    if (state.sidebarTimer) {
      clearTimeout(state.sidebarTimer);
      state.sidebarTimer = null;
    }
    state.sidebarTimer = setTimeout(() => {
      state.sidebarTimer = null;
      ensurePanelMountedInSidebar();
    }, Number(delay) > 0 ? Number(delay) : 220);
  }

  function watchSidebarLifecycle() {
    if (state.observers.sidebar) {
      state.observers.sidebar.disconnect();
      state.observers.sidebar = null;
    }

    state.observers.sidebar = new MutationObserver(() => {
      if (!state.ui.panel) return;
      if (!state.ui.panel.isConnected) {
        scheduleSidebarRemount(120);
      }
    });

    state.observers.sidebar.observe(document.body, {
      childList: true,
      subtree: true,
    });
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
      if (node instanceof HTMLElement) return node;
    }
    return null;
  }

  function insertQuoteReply(text) {
    const quote = String(text || '').trim();
    if (!quote) return false;

    const input = getInputElement();
    if (!input) return false;

    const quoteText = quote
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');

    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      const current = input.value || '';
      const prefix = current && !current.endsWith('\n') ? '\n\n' : '';
      input.value = `${current}${prefix}${quoteText}\n\n`;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
      return true;
    }

    input.focus();
    try {
      document.execCommand('insertText', false, `${quoteText}\n\n`);
    } catch (_) {
      const current = input.textContent || '';
      input.textContent = `${current}\n${quoteText}\n\n`;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  function setupQuoteReply() {
    let hideTimer = null;

    const quoteBtn = document.createElement('button');
    quoteBtn.type = 'button';
    quoteBtn.className = 'aisb-tools-quote-btn';
    quoteBtn.textContent = '引用回复';
    quoteBtn.style.display = 'none';
    quoteBtn.addEventListener('click', () => {
      const selection = window.getSelection();
      const text = selection ? selection.toString() : '';
      if (!text.trim()) return;
      const ok = insertQuoteReply(text);
      quoteBtn.style.display = 'none';
      core.utils.toast(ok ? '已插入引用回复' : '插入失败，请先聚焦输入框', ok ? 'success' : 'warn');
    });

    quoteBtn.addEventListener('mouseenter', () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    });

    quoteBtn.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(() => {
        quoteBtn.style.display = 'none';
      }, 260);
    });

    document.body.appendChild(quoteBtn);
    state.ui.quoteBtn = quoteBtn;

    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';
      if (!text) {
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
          quoteBtn.style.display = 'none';
        }, 140);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect || (!rect.width && !rect.height)) return;

      quoteBtn.style.left = `${Math.max(8, rect.left + window.scrollX)}px`;
      quoteBtn.style.top = `${Math.max(8, rect.top + window.scrollY - 34)}px`;
      quoteBtn.style.display = 'inline-block';
    });
  }

  function getConversationTitle() {
    const selectors = ['h1', '[data-test-id="conversation-title"]', 'title'];
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (!node) continue;
      const text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || text === 'Gemini' || text === 'Google Gemini') continue;
      return text;
    }
    return '';
  }

  function applyTitleSync() {
    if (!state.settings.titleSyncEnabled) return;
    const title = getConversationTitle();
    if (!title) return;
    if (document.title !== title) {
      document.title = title;
    }
  }

  function setupTitleSync() {
    if (state.observers.title) {
      state.observers.title.disconnect();
      state.observers.title = null;
    }

    state.observers.title = new MutationObserver(() => {
      applyTitleSync();
    });

    state.observers.title.observe(document.body, {
      childList: true,
      subtree: true,
    });

    applyTitleSync();
  }

  function applyHideRecents() {
    const refs = core.dom.getGeminiSidebarRefs();
    if (!refs || !refs.sidebar) return;

    const selectors = [
      '[data-test-id="all-conversations"]',
      '.chat-history',
      'mat-nav-list',
    ];

    selectors.forEach((selector) => {
      refs.sidebar.querySelectorAll(selector).forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        node.style.display = state.settings.hideRecents ? 'none' : '';
      });
    });
  }

  function findInputContainer() {
    const input = getInputElement();
    if (!input) return null;

    const container =
      input.closest('mat-form-field, .input-area, .composer, .prompt-container') || input.parentElement;
    return container instanceof HTMLElement ? container : null;
  }

  function applyInputCollapsed() {
    const container = findInputContainer();
    if (!container) return;

    container.classList.toggle('aisb-tools-input-collapsed', state.settings.inputCollapsed);
  }

  function getBatchConversationNodes() {
    const refs = core.dom.getGeminiSidebarRefs();
    if (!refs || !refs.sidebar) return [];
    return Array.from(refs.sidebar.querySelectorAll('[data-test-id="conversation"]')).filter(
      (node) => node instanceof HTMLElement,
    );
  }

  function updateBatchBarLabel() {
    if (!state.ui.batchBar) return;
    const label = state.ui.batchBar.querySelector('.label');
    if (!label) return;
    label.textContent = `已选 ${state.batch.selected.size} 项`;
  }

  function cleanupBatchSelectionUI() {
    getBatchConversationNodes().forEach((node) => {
      node.classList.remove('aisb-tools-batch-item', 'aisb-tools-selected');
      const check = node.querySelector('.aisb-tools-batch-check');
      if (check) check.remove();
    });
  }

  function stopBatchMode() {
    state.batch.active = false;
    state.batch.selected.clear();
    cleanupBatchSelectionUI();

    if (state.ui.batchBar) {
      state.ui.batchBar.classList.remove('show');
    }

    if (state.observers.batch) {
      state.observers.batch.disconnect();
      state.observers.batch = null;
    }
  }

  function bindBatchCheckbox(node) {
    if (!(node instanceof HTMLElement)) return;
    if (node.dataset.aisbBatchBound === '1') return;
    node.dataset.aisbBatchBound = '1';

    node.classList.add('aisb-tools-batch-item');

    let check = node.querySelector('.aisb-tools-batch-check');
    if (!check) {
      check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'aisb-tools-batch-check';
      node.appendChild(check);
    }

    check.checked = state.batch.selected.has(core.dom.extractConversationId(node));
    check.addEventListener('change', () => {
      const id = core.dom.extractConversationId(node);
      if (!id) return;

      if (check.checked) {
        state.batch.selected.add(id);
        node.classList.add('aisb-tools-selected');
      } else {
        state.batch.selected.delete(id);
        node.classList.remove('aisb-tools-selected');
      }

      updateBatchBarLabel();
    });
  }

  function startBatchMode() {
    if (state.batch.active) {
      stopBatchMode();
      return;
    }

    state.batch.active = true;

    const nodes = getBatchConversationNodes();
    nodes.forEach(bindBatchCheckbox);

    if (state.ui.batchBar) {
      state.ui.batchBar.classList.add('show');
    }
    updateBatchBarLabel();

    state.observers.batch = new MutationObserver(() => {
      if (!state.batch.active) return;
      getBatchConversationNodes().forEach(bindBatchCheckbox);
    });

    state.observers.batch.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  async function clickDeleteForConversationNode(node) {
    if (!(node instanceof HTMLElement)) return false;

    // 尝试打开会话的“更多”菜单。
    const moreButton =
      node.querySelector('button[aria-label*="More"],button[aria-label*="更多"],button[aria-label*="选项"]') ||
      node.querySelector('button[jslog*="more"],button[jsname*="more"]');

    if (!(moreButton instanceof HTMLElement)) {
      return false;
    }

    moreButton.click();
    await wait(140);

    const menuItems = Array.from(document.querySelectorAll('[role="menuitem"],button,div')).filter((el) => {
      if (!(el instanceof HTMLElement)) return false;
      const text = String(el.textContent || '').trim();
      if (!text) return false;
      return /delete|删除|移除/i.test(text);
    });

    const target = menuItems[0];
    if (!target) {
      return false;
    }

    target.click();
    await wait(180);

    // 处理二次确认。
    const confirmCandidates = Array.from(document.querySelectorAll('button,[role="button"]')).filter((el) => {
      if (!(el instanceof HTMLElement)) return false;
      const text = String(el.textContent || '').trim();
      return /confirm|delete|删除|确认/i.test(text);
    });

    if (confirmCandidates.length) {
      confirmCandidates[0].click();
      await wait(180);
    }

    return true;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function runBatchDelete() {
    if (!state.batch.selected.size) {
      core.utils.toast('请先选择会话', 'warn');
      return;
    }

    const ok = confirm(`确认批量删除 ${state.batch.selected.size} 条会话？此操作不可撤销。`);
    if (!ok) return;

    const nodes = getBatchConversationNodes();
    const selectedNodes = nodes.filter((node) => state.batch.selected.has(core.dom.extractConversationId(node)));

    let success = 0;

    for (const node of selectedNodes) {
      const done = await clickDeleteForConversationNode(node);
      if (done) success += 1;
      await wait(220);
    }

    core.utils.toast(`批量删除完成：成功 ${success}/${selectedNodes.length}`, success ? 'success' : 'warn', 3600);
    stopBatchMode();
  }

  async function applyDefaultModel() {
    const targetModel = (state.settings.defaultModelName || '').trim();
    if (!targetModel) {
      core.utils.toast('请先输入默认模型名称', 'warn');
      return;
    }

    const modelButton = document.querySelector(
      'button[data-test-id="model-selector"],button[aria-label*="Model"],button[aria-label*="模型"]',
    );

    if (!(modelButton instanceof HTMLElement)) {
      core.utils.toast('未找到模型选择器按钮', 'warn');
      return;
    }

    const currentText = String(modelButton.textContent || '').toLowerCase();
    if (currentText.includes(targetModel.toLowerCase())) {
      core.utils.toast('当前模型已符合默认设置', 'success');
      return;
    }

    modelButton.click();
    await wait(180);

    const options = Array.from(document.querySelectorAll('[role="menuitem"],button,div')).filter((el) => {
      if (!(el instanceof HTMLElement)) return false;
      const text = String(el.textContent || '').trim();
      if (!text) return false;
      return text.toLowerCase().includes(targetModel.toLowerCase());
    });

    if (!options.length) {
      core.utils.toast(`未找到模型：${targetModel}`, 'warn');
      return;
    }

    options[0].click();
    core.utils.toast(`已尝试切换到默认模型：${targetModel}`, 'success');
  }

  function mountPanel() {
    const panel = document.createElement('section');
    panel.id = PANEL_ID;

    const title = document.createElement('h3');
    title.className = 'aisb-tools-title';
    title.textContent = '工具集';

    const grid = document.createElement('div');
    grid.className = 'aisb-tools-grid';

    const batchBtn = createButton('批量删除', () => {
      startBatchMode();
      batchBtn.classList.toggle('active', state.batch.active);
    });

    const quoteBtn = createButton('引用回复', () => {
      core.utils.toast('选中文本后会显示“引用回复”按钮', 'success');
    });

    const titleBtn = createButton('标题同步', async () => {
      state.settings.titleSyncEnabled = !state.settings.titleSyncEnabled;
      titleBtn.classList.toggle('active', state.settings.titleSyncEnabled);
      await saveSettings();
      applyTitleSync();
    });
    titleBtn.classList.toggle('active', state.settings.titleSyncEnabled);

    const inputBtn = createButton('输入框折叠', async () => {
      state.settings.inputCollapsed = !state.settings.inputCollapsed;
      inputBtn.classList.toggle('active', state.settings.inputCollapsed);
      await saveSettings();
      applyInputCollapsed();
    });
    inputBtn.classList.toggle('active', state.settings.inputCollapsed);

    const recentsBtn = createButton('隐藏最近项', async () => {
      state.settings.hideRecents = !state.settings.hideRecents;
      recentsBtn.classList.toggle('active', state.settings.hideRecents);
      await saveSettings();
      applyHideRecents();
      core.utils.toast(state.settings.hideRecents ? '已隐藏最近项目' : '已恢复最近项目', 'success');
    });
    recentsBtn.classList.toggle('active', state.settings.hideRecents);

    const modelBtn = createButton('应用默认模型', () => {
      void applyDefaultModel();
    });

    grid.appendChild(batchBtn);
    grid.appendChild(quoteBtn);
    grid.appendChild(titleBtn);
    grid.appendChild(inputBtn);
    grid.appendChild(recentsBtn);
    grid.appendChild(modelBtn);

    const modelRow = document.createElement('div');
    modelRow.className = 'aisb-tools-model-row';

    const modelInput = document.createElement('input');
    modelInput.type = 'text';
    modelInput.className = 'aisb-tools-input';
    modelInput.placeholder = '默认模型名（例如 Gemini 2.5 Pro）';
    modelInput.value = state.settings.defaultModelName || '';
    modelInput.addEventListener('change', async () => {
      state.settings.defaultModelName = modelInput.value.trim();
      await saveSettings();
    });

    const saveModelBtn = createButton('保存', async () => {
      state.settings.defaultModelName = modelInput.value.trim();
      await saveSettings();
      core.utils.toast('默认模型设置已保存', 'success');
    });

    modelRow.appendChild(modelInput);
    modelRow.appendChild(saveModelBtn);

    const note = document.createElement('div');
    note.className = 'aisb-tools-note';
    note.textContent = '提示：批量删除依赖 Gemini 当前 DOM 结构，若失败可手动重试。';

    panel.appendChild(title);
    panel.appendChild(grid);
    panel.appendChild(modelRow);
    panel.appendChild(note);

    state.ui.panel = panel;
    state.ui.modelInput = modelInput;
    return ensurePanelMountedInSidebar();
  }

  function createBatchBar() {
    const bar = document.createElement('div');
    bar.className = 'aisb-tools-batchbar';

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = '已选 0 项';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = '确认删除';
    deleteBtn.addEventListener('click', () => {
      void runBatchDelete();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = '退出';
    cancelBtn.addEventListener('click', () => {
      stopBatchMode();
    });

    bar.appendChild(label);
    bar.appendChild(deleteBtn);
    bar.appendChild(cancelBtn);

    document.body.appendChild(bar);
    state.ui.batchBar = bar;
  }

  function createButton(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'aisb-tools-btn';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function bindAutoModelOnRoute() {
    core.route.onChange(() => {
      scheduleSidebarRemount(260);
      applyHideRecents();
      applyInputCollapsed();
      applyTitleSync();

      if (state.settings.defaultModelName) {
        setTimeout(() => {
          void applyDefaultModel();
        }, 800);
      }
    });
  }

  async function bootstrap() {
    ensureStyles();
    await loadSettings();

    const mounted = mountPanel();
    createBatchBar();
    setupQuoteReply();
    setupTitleSync();
    watchSidebarLifecycle();

    if (!mounted) {
      let retries = 0;
      const timer = setInterval(() => {
        retries += 1;
        if (ensurePanelMountedInSidebar() || retries > 80) {
          clearInterval(timer);
        }
      }, 320);
    }

    applyHideRecents();
    applyInputCollapsed();
    bindAutoModelOnRoute();

    core.module.register('tools', {
      startBatchMode,
      stopBatchMode,
      applyDefaultModel,
      insertQuoteReply,
      getSettings: () => ({ ...state.settings }),
    });
  }

  bootstrap().catch((error) => {
    console.error('[AISB Tools] 初始化失败：', error);
  });
})();
