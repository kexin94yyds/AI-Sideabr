(function () {
  'use strict';

  if (window.__AISB_GEMINI_EXPORT_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_EXPORT_LOADED__ = true;

  const core = window.__AISB_GEMINI__;
  if (!core) {
    console.error('[AISB Export] 缺少 gemini-common.js。');
    return;
  }

  const STYLE_ID = 'aisb-gemini-export-style';
  const TRIGGER_ID = 'aisb-gemini-export-trigger';
  const EXPORT_FORMAT = 'gemini-voyager.export.v1';

  const state = {
    mounted: false,
    menuOpen: false,
    sidebarTimer: null,
    sidebarObserver: null,
    outsideClickBound: false,
    ui: {
      host: null,
      trigger: null,
      menu: null,
      progress: null,
      batchDialog: null,
    },
  };

  function now() {
    return Date.now();
  }

  function pad(num) {
    return String(num).padStart(2, '0');
  }

  function timestamp() {
    const d = new Date();
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(
      d.getMinutes(),
    )}${pad(d.getSeconds())}`;
  }

  function sanitizeFilename(name) {
    return String(name || 'gemini-chat')
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, 72) || 'gemini-chat';
  }

  function normalizeText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function ensureStyles() {
    core.dom.ensureStyle(
      STYLE_ID,
      `
      #${TRIGGER_ID} {
        position: relative;
        z-index: 1;
        width: 100%;
        margin: 8px 0 12px;
      }
      #${TRIGGER_ID} .aisb-export-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        justify-content: center;
        width: 100%;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.95);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        color: #1f2937;
        font-size: 14px;
        font-weight: 500;
        line-height: 1;
        padding: 10px 14px;
        cursor: pointer;
        transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
      }
      #${TRIGGER_ID} .aisb-export-btn:hover {
        background: linear-gradient(135deg, rgba(16, 163, 127, 0.12), rgba(59, 130, 246, 0.08));
      }
      #${TRIGGER_ID} .aisb-export-btn:active {
        background: linear-gradient(135deg, rgba(16, 163, 127, 0.2), rgba(59, 130, 246, 0.12));
        transform: translateY(1px);
      }
      #${TRIGGER_ID} .aisb-export-btn:focus-visible {
        outline: 2px solid rgba(26, 115, 232, 0.45);
        outline-offset: 2px;
      }
      #${TRIGGER_ID} .aisb-export-menu {
        position: static;
        margin-top: 8px;
        width: 100%;
        max-height: min(72vh, 680px);
        overflow: auto;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
        padding: 4px;
        display: none;
      }
      #${TRIGGER_ID} .aisb-export-menu.open {
        display: block;
        animation: aisb-export-fade-up 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      #${TRIGGER_ID} .aisb-export-title {
        margin: 0;
        padding: 8px 12px 4px 12px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #5f6368;
        border-bottom: 1px solid #dadce0;
        margin-bottom: 4px;
      }
      #${TRIGGER_ID} .aisb-export-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        text-align: left;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: #1f2937;
        font-size: 14px;
        font-weight: 500;
        padding: 10px 14px;
        cursor: pointer;
        margin-bottom: 0;
        transition: background-color 0.15s ease, color 0.15s ease;
      }
      #${TRIGGER_ID} .aisb-export-item:hover {
        background: linear-gradient(135deg, rgba(16, 163, 127, 0.12), rgba(59, 130, 246, 0.08));
      }
      #${TRIGGER_ID} .aisb-export-item:active {
        background: linear-gradient(135deg, rgba(16, 163, 127, 0.2), rgba(59, 130, 246, 0.12));
      }
      #${TRIGGER_ID} .aisb-export-item:focus-visible {
        outline: 2px solid rgba(26, 115, 232, 0.45);
        outline-offset: -2px;
      }
      #${TRIGGER_ID} .aisb-export-sep {
        border-top: 1px solid rgba(0, 0, 0, 0.08);
        margin: 4px 0;
      }
      .aisb-export-progress {
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        top: 12px;
        z-index: 2147483645;
        pointer-events: none;
      }
      .aisb-export-progress-card {
        min-width: 220px;
        max-width: min(360px, calc(100vw - 24px));
        padding: 9px 12px;
        border-radius: 999px;
        border: 1px solid rgba(15, 23, 42, 0.12);
        background: rgba(255, 255, 255, 0.92);
        color: #0f172a;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(15, 23, 42, 0.08);
        backdrop-filter: blur(10px);
        display: grid;
        grid-template-columns: auto 1fr;
        grid-template-areas:
          'spinner title'
          'spinner desc';
        align-items: center;
        column-gap: 10px;
        row-gap: 1px;
      }
      .aisb-export-progress-spinner {
        grid-area: spinner;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        border: 2px solid rgba(100, 116, 139, 0.32);
        border-top-color: #2563eb;
        animation: aisb-export-progress-spin 0.8s linear infinite;
      }
      .aisb-export-progress-title {
        grid-area: title;
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.2;
      }
      .aisb-export-progress-desc {
        grid-area: desc;
        margin-top: 0;
        font-size: 12px;
        color: #475569;
        line-height: 1.2;
      }
      .aisb-export-batch-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: aisb-export-fade-in 0.2s ease-out;
      }
      .aisb-export-batch-dialog {
        width: min(560px, calc(100vw - 28px));
        max-height: min(82vh, 780px);
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        display: flex;
        flex-direction: column;
        animation: aisb-export-slide-up 0.3s ease-out;
      }
      .aisb-export-batch-head {
        padding: 24px 24px 16px;
        border-bottom: 1px solid #dadce0;
      }
      .aisb-export-batch-head h3 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
        color: #202124;
      }
      .aisb-export-batch-head p {
        margin: 8px 0 0;
        font-size: 14px;
        color: #5f6368;
      }
      .aisb-export-batch-list {
        overflow: auto;
        padding: 12px 24px;
        flex: 1;
      }
      .aisb-export-batch-row {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: start;
        gap: 8px;
        border: 2px solid #dadce0;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 10px;
        background: #ffffff;
        transition: all 0.2s ease;
      }
      .aisb-export-batch-row:hover {
        background: #f8f9fa;
        border-color: #1a73e8;
      }
      .aisb-export-batch-row input[type='checkbox'] {
        margin-top: 2px;
        width: 18px;
        height: 18px;
        accent-color: #1a73e8;
        cursor: pointer;
      }
      .aisb-export-batch-row-title {
        font-size: 15px;
        font-weight: 500;
        color: #202124;
        line-height: 1.35;
      }
      .aisb-export-batch-row-url {
        font-size: 13px;
        color: #5f6368;
        margin-top: 4px;
        word-break: break-all;
      }
      .aisb-export-batch-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 12px 24px 24px;
        border-top: 1px solid #dadce0;
      }
      .aisb-export-batch-btn {
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        padding: 10px 24px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .aisb-export-batch-btn:hover {
        transform: translateY(-1px);
      }
      .aisb-export-batch-btn:focus-visible {
        outline: 2px solid rgba(26, 115, 232, 0.45);
        outline-offset: 2px;
      }
      .aisb-export-batch-btn:not(.primary) {
        background: transparent;
        color: #1a73e8;
        border: 1px solid #dadce0;
      }
      .aisb-export-batch-btn:not(.primary):hover {
        background: #f8f9fa;
      }
      .aisb-export-batch-btn.primary {
        background: #1a73e8;
        color: #ffffff;
      }
      .aisb-export-batch-btn.primary:hover {
        background: #1765cc;
        box-shadow: 0 2px 8px rgba(26, 115, 232, 0.3);
      }

      @keyframes aisb-export-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes aisb-export-fade-up {
        from { opacity: 0; transform: translateY(-8px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes aisb-export-slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes aisb-export-progress-spin {
        from { transform: rotate(0); }
        to { transform: rotate(360deg); }
      }

      /* 深色模式：系统偏好 */
      @media (prefers-color-scheme: dark) {
        #${TRIGGER_ID} .aisb-export-btn,
        #${TRIGGER_ID} .aisb-export-menu {
          background: rgba(30, 30, 30, 0.95);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        #${TRIGGER_ID} .aisb-export-btn,
        #${TRIGGER_ID} .aisb-export-item {
          color: #e5e7eb;
        }
        #${TRIGGER_ID} .aisb-export-btn:hover,
        #${TRIGGER_ID} .aisb-export-item:hover {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(59, 130, 246, 0.12));
        }
        #${TRIGGER_ID} .aisb-export-btn:active,
        #${TRIGGER_ID} .aisb-export-item:active {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.24), rgba(59, 130, 246, 0.16));
        }
        #${TRIGGER_ID} .aisb-export-title {
          color: #9aa0a6;
          border-bottom-color: #3c4043;
        }
        #${TRIGGER_ID} .aisb-export-sep {
          border-top-color: #3c4043;
        }
        .aisb-export-progress-card {
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(10, 16, 24, 0.86);
          color: #e5ecf5;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.32), 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .aisb-export-progress-spinner {
          border: 2px solid rgba(148, 163, 184, 0.35);
          border-top-color: #3b82f6;
        }
        .aisb-export-progress-title {
          color: #f8fbff;
        }
        .aisb-export-progress-desc {
          color: #aebfd2;
        }
        .aisb-export-batch-dialog {
          background: #1e1e1e;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .aisb-export-batch-head,
        .aisb-export-batch-actions {
          border-color: #3c4043;
        }
        .aisb-export-batch-head h3,
        .aisb-export-batch-row-title {
          color: #e8eaed;
        }
        .aisb-export-batch-head p,
        .aisb-export-batch-row-url {
          color: #9aa0a6;
        }
        .aisb-export-batch-row {
          border-color: #3c4043;
          background: #1e1e1e;
        }
        .aisb-export-batch-row:hover {
          background: #2d2e30;
          border-color: #8ab4f8;
        }
        .aisb-export-batch-btn:not(.primary) {
          color: #8ab4f8;
          border-color: #3c4043;
        }
        .aisb-export-batch-btn:not(.primary):hover {
          background: #2d2e30;
        }
      }

      /* 深色模式：显式主题类与属性 */
      html.dark-theme #${TRIGGER_ID} .aisb-export-btn,
      body.dark-theme #${TRIGGER_ID} .aisb-export-btn,
      html[data-theme="dark"] #${TRIGGER_ID} .aisb-export-btn,
      body[data-theme="dark"] #${TRIGGER_ID} .aisb-export-btn,
      html.dark-theme #${TRIGGER_ID} .aisb-export-menu,
      body.dark-theme #${TRIGGER_ID} .aisb-export-menu,
      html[data-theme="dark"] #${TRIGGER_ID} .aisb-export-menu,
      body[data-theme="dark"] #${TRIGGER_ID} .aisb-export-menu {
        background: rgba(30, 30, 30, 0.95);
        border-color: rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3);
      }
      html.dark-theme #${TRIGGER_ID} .aisb-export-btn,
      body.dark-theme #${TRIGGER_ID} .aisb-export-btn,
      html[data-theme="dark"] #${TRIGGER_ID} .aisb-export-btn,
      body[data-theme="dark"] #${TRIGGER_ID} .aisb-export-btn,
      html.dark-theme #${TRIGGER_ID} .aisb-export-item,
      body.dark-theme #${TRIGGER_ID} .aisb-export-item,
      html[data-theme="dark"] #${TRIGGER_ID} .aisb-export-item,
      body[data-theme="dark"] #${TRIGGER_ID} .aisb-export-item {
        color: #e5e7eb;
      }
      html.dark-theme #${TRIGGER_ID} .aisb-export-btn:hover,
      body.dark-theme #${TRIGGER_ID} .aisb-export-btn:hover,
      html[data-theme="dark"] #${TRIGGER_ID} .aisb-export-btn:hover,
      body[data-theme="dark"] #${TRIGGER_ID} .aisb-export-btn:hover,
      html.dark-theme #${TRIGGER_ID} .aisb-export-item:hover,
      body.dark-theme #${TRIGGER_ID} .aisb-export-item:hover,
      html[data-theme="dark"] #${TRIGGER_ID} .aisb-export-item:hover,
      body[data-theme="dark"] #${TRIGGER_ID} .aisb-export-item:hover {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(59, 130, 246, 0.12));
      }
      html.dark-theme #${TRIGGER_ID} .aisb-export-title,
      body.dark-theme #${TRIGGER_ID} .aisb-export-title,
      html[data-theme="dark"] #${TRIGGER_ID} .aisb-export-title,
      body[data-theme="dark"] #${TRIGGER_ID} .aisb-export-title {
        color: #9aa0a6;
        border-bottom-color: #3c4043;
      }
      html.dark-theme #${TRIGGER_ID} .aisb-export-sep,
      body.dark-theme #${TRIGGER_ID} .aisb-export-sep,
      html[data-theme="dark"] #${TRIGGER_ID} .aisb-export-sep,
      body[data-theme="dark"] #${TRIGGER_ID} .aisb-export-sep {
        border-top-color: #3c4043;
      }
      html.dark-theme .aisb-export-progress-card,
      body.dark-theme .aisb-export-progress-card,
      html[data-theme="dark"] .aisb-export-progress-card,
      body[data-theme="dark"] .aisb-export-progress-card {
        border: 1px solid rgba(148, 163, 184, 0.3);
        background: rgba(10, 16, 24, 0.86);
        color: #e5ecf5;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.32), 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      html.dark-theme .aisb-export-progress-spinner,
      body.dark-theme .aisb-export-progress-spinner,
      html[data-theme="dark"] .aisb-export-progress-spinner,
      body[data-theme="dark"] .aisb-export-progress-spinner {
        border: 2px solid rgba(148, 163, 184, 0.35);
        border-top-color: #3b82f6;
      }
      html.dark-theme .aisb-export-progress-title,
      body.dark-theme .aisb-export-progress-title,
      html[data-theme="dark"] .aisb-export-progress-title,
      body[data-theme="dark"] .aisb-export-progress-title {
        color: #f8fbff;
      }
      html.dark-theme .aisb-export-progress-desc,
      body.dark-theme .aisb-export-progress-desc,
      html[data-theme="dark"] .aisb-export-progress-desc,
      body[data-theme="dark"] .aisb-export-progress-desc {
        color: #aebfd2;
      }
      html.dark-theme .aisb-export-batch-dialog,
      body.dark-theme .aisb-export-batch-dialog,
      html[data-theme="dark"] .aisb-export-batch-dialog,
      body[data-theme="dark"] .aisb-export-batch-dialog {
        background: #1e1e1e;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      }
      html.dark-theme .aisb-export-batch-head,
      body.dark-theme .aisb-export-batch-head,
      html[data-theme="dark"] .aisb-export-batch-head,
      body[data-theme="dark"] .aisb-export-batch-head,
      html.dark-theme .aisb-export-batch-actions,
      body.dark-theme .aisb-export-batch-actions,
      html[data-theme="dark"] .aisb-export-batch-actions,
      body[data-theme="dark"] .aisb-export-batch-actions {
        border-color: #3c4043;
      }
      html.dark-theme .aisb-export-batch-head h3,
      body.dark-theme .aisb-export-batch-head h3,
      html[data-theme="dark"] .aisb-export-batch-head h3,
      body[data-theme="dark"] .aisb-export-batch-head h3,
      html.dark-theme .aisb-export-batch-row-title,
      body.dark-theme .aisb-export-batch-row-title,
      html[data-theme="dark"] .aisb-export-batch-row-title,
      body[data-theme="dark"] .aisb-export-batch-row-title {
        color: #e8eaed;
      }
      html.dark-theme .aisb-export-batch-head p,
      body.dark-theme .aisb-export-batch-head p,
      html[data-theme="dark"] .aisb-export-batch-head p,
      body[data-theme="dark"] .aisb-export-batch-head p,
      html.dark-theme .aisb-export-batch-row-url,
      body.dark-theme .aisb-export-batch-row-url,
      html[data-theme="dark"] .aisb-export-batch-row-url,
      body[data-theme="dark"] .aisb-export-batch-row-url {
        color: #9aa0a6;
      }
      html.dark-theme .aisb-export-batch-row,
      body.dark-theme .aisb-export-batch-row,
      html[data-theme="dark"] .aisb-export-batch-row,
      body[data-theme="dark"] .aisb-export-batch-row {
        border-color: #3c4043;
        background: #1e1e1e;
      }
      html.dark-theme .aisb-export-batch-row:hover,
      body.dark-theme .aisb-export-batch-row:hover,
      html[data-theme="dark"] .aisb-export-batch-row:hover,
      body[data-theme="dark"] .aisb-export-batch-row:hover {
        background: #2d2e30;
        border-color: #8ab4f8;
      }
      html.dark-theme .aisb-export-batch-btn:not(.primary),
      body.dark-theme .aisb-export-batch-btn:not(.primary),
      html[data-theme="dark"] .aisb-export-batch-btn:not(.primary),
      body[data-theme="dark"] .aisb-export-batch-btn:not(.primary) {
        color: #8ab4f8;
        border-color: #3c4043;
      }
      html.dark-theme .aisb-export-batch-btn:not(.primary):hover,
      body.dark-theme .aisb-export-batch-btn:not(.primary):hover,
      html[data-theme="dark"] .aisb-export-batch-btn:not(.primary):hover,
      body[data-theme="dark"] .aisb-export-batch-btn:not(.primary):hover {
        background: #2d2e30;
      }
      @media (max-width: 1024px) {
        #${TRIGGER_ID} {
          right: 10px;
          top: 84px;
        }
        #${TRIGGER_ID} .aisb-export-menu {
          width: min(300px, calc(100vw - 20px));
        }
      }
      `,
    );
  }

  function ensureHostMountedInSidebar() {
    if (!state.ui.host) return false;
    return core.dom.mountInGeminiSidebar(state.ui.host, { beforeRecent: true });
  }

  function scheduleSidebarRemount(delay) {
    if (state.sidebarTimer) {
      clearTimeout(state.sidebarTimer);
      state.sidebarTimer = null;
    }
    state.sidebarTimer = setTimeout(() => {
      state.sidebarTimer = null;
      state.mounted = ensureHostMountedInSidebar();
    }, Number(delay) > 0 ? Number(delay) : 220);
  }

  function watchSidebarLifecycle() {
    if (state.sidebarObserver) {
      state.sidebarObserver.disconnect();
      state.sidebarObserver = null;
    }

    state.sidebarObserver = new MutationObserver(() => {
      if (!state.ui.host) return;
      if (!state.ui.host.isConnected) {
        scheduleSidebarRemount(120);
      }
    });

    state.sidebarObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function findCurrentConversationTitle() {
    const selectors = [
      'h1',
      '[data-test-id="conversation-title"]',
      'mat-list-item[aria-current="page"] [mat-line]',
      'title',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const text = normalizeText(el.textContent);
      if (!text) continue;
      if (text === 'Gemini' || text === 'Google Gemini') continue;
      return text;
    }

    return 'Gemini Conversation';
  }

  function inferRole(element) {
    const roleAttr = (element.getAttribute('data-message-author-role') || '').toLowerCase();
    if (roleAttr.includes('user')) return 'user';
    if (roleAttr.includes('assistant') || roleAttr.includes('model')) return 'assistant';

    const tag = element.tagName.toLowerCase();
    if (tag.includes('user')) return 'user';
    if (tag.includes('model')) return 'assistant';

    const classText = (element.className || '').toLowerCase();
    if (classText.includes('user')) return 'user';
    if (classText.includes('assistant') || classText.includes('model')) return 'assistant';

    return 'assistant';
  }

  function collectTurnElements() {
    const selectors = [
      'user-query',
      'model-response',
      '[data-message-author-role]',
      '[data-test-id="conversation-turn"]',
      '.conversation-turn',
      'message-content[data-turn-id]',
    ];

    const set = new Set();
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (!node.isConnected) return;
        if (node.closest('#aisb-gemini-export-trigger')) return;
        if (node.closest('#aisb-gemini-folder-panel')) return;
        if (node.closest('#aisb-gemini-timeline-bar')) return;
        if (!normalizeText(node.textContent)) return;

        const root =
          node.closest('user-query, model-response, [data-test-id="conversation-turn"], .conversation-turn') || node;
        if (root instanceof HTMLElement) {
          set.add(root);
        }
      });
    }

    const list = Array.from(set);
    list.sort((a, b) => {
      if (a === b) return 0;
      const pos = a.compareDocumentPosition(b);
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      return 0;
    });

    return list;
  }

  function extractImagesFromElement(element) {
    const images = [];
    const seen = new Set();

    element.querySelectorAll('img[src]').forEach((img, idx) => {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) return;
      if (seen.has(src)) return;
      seen.add(src);

      const alt = normalizeText(img.getAttribute('alt') || '') || `image-${idx + 1}`;
      const extMatch = src.match(/\.([a-z0-9]{3,4})(?:$|[?#])/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : 'png';
      images.push({
        src,
        alt,
        ext,
      });
    });

    return images;
  }

  function htmlToMarkdown(html) {
    if (!html) return '';

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;

    wrapper.querySelectorAll('br').forEach((br) => {
      br.replaceWith(document.createTextNode('\n'));
    });

    wrapper.querySelectorAll('pre').forEach((pre) => {
      const code = pre.textContent || '';
      pre.replaceWith(document.createTextNode(`\n\n\`\`\`\n${code}\n\`\`\`\n\n`));
    });

    wrapper.querySelectorAll('code').forEach((code) => {
      if (code.closest('pre')) return;
      const text = code.textContent || '';
      code.replaceWith(document.createTextNode(`\`${text}\``));
    });

    wrapper.querySelectorAll('strong,b').forEach((el) => {
      const text = normalizeText(el.textContent || '');
      el.replaceWith(document.createTextNode(`**${text}**`));
    });

    wrapper.querySelectorAll('em,i').forEach((el) => {
      const text = normalizeText(el.textContent || '');
      el.replaceWith(document.createTextNode(`*${text}*`));
    });

    wrapper.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const text = normalizeText(a.textContent || href);
      a.replaceWith(document.createTextNode(`[${text}](${href})`));
    });

    const text = wrapper.textContent || '';
    return text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\t/g, '  ')
      .trim();
  }

  function collectTurns() {
    const elements = collectTurnElements();
    const turns = [];

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const role = inferRole(element);
      const text = normalizeText(element.innerText || element.textContent || '');
      const html = element.innerHTML || '';

      if (!text && !html) continue;

      const images = extractImagesFromElement(element);

      turns.push({
        id: element.getAttribute('data-turn-id') || core.uid('turn'),
        index: i,
        role,
        text,
        html,
        markdown: htmlToMarkdown(html) || text,
        images,
      });
    }

    return turns;
  }

  function buildMetadata(turns) {
    const title = findCurrentConversationTitle();
    return {
      format: EXPORT_FORMAT,
      exportedAt: new Date().toISOString(),
      url: location.href,
      title,
      accountId: core.getCurrentAccountId(),
      turnCount: turns.length,
      imageCount: turns.reduce((sum, turn) => sum + turn.images.length, 0),
    };
  }

  function buildJsonPayload() {
    const turns = collectTurns();
    const metadata = buildMetadata(turns);

    return {
      ...metadata,
      turns,
    };
  }

  function buildMarkdownPayload(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const includeImages = opts.includeImages !== false;
    const turns = collectTurns();
    const metadata = buildMetadata(turns);

    const lines = [];
    lines.push(`# ${metadata.title}`);
    lines.push('');
    lines.push(`- 导出时间: ${metadata.exportedAt}`);
    lines.push(`- 会话地址: ${metadata.url}`);
    lines.push(`- 消息数量: ${metadata.turnCount}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    let imageCounter = 0;

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const roleLabel = turn.role === 'user' ? '用户' : 'Gemini';
      lines.push(`## ${i + 1}. ${roleLabel}`);
      lines.push('');
      lines.push(turn.markdown || turn.text || '');
      lines.push('');

      if (includeImages && turn.images.length) {
        lines.push('图片引用:');
        for (const image of turn.images) {
          imageCounter += 1;
          const filename = `images/image-${String(imageCounter).padStart(3, '0')}.${image.ext || 'png'}`;
          lines.push(`![${image.alt || `image-${imageCounter}`}](${filename})`);
        }
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }

    return {
      metadata,
      turns,
      markdown: lines.join('\n').trim() + '\n',
    };
  }

  function openPrintWindow(title, htmlContent) {
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      alert('浏览器阻止了弹窗，请允许弹窗后重试。');
      return;
    }

    win.document.open();
    win.document.write(`
      <!doctype html>
      <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 28px; color: #202124; line-height: 1.6; }
          h1 { font-size: 22px; margin-bottom: 10px; }
          h2 { margin-top: 24px; font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
          pre { background: #f6f8fa; padding: 10px; border-radius: 8px; overflow: auto; }
          img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
          hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
        </style>
      </head>
      <body>${htmlContent}</body>
      </html>
    `);
    win.document.close();

    const doPrint = () => {
      win.focus();
      win.print();
    };

    if (win.document.readyState === 'complete') {
      doPrint();
    } else {
      win.addEventListener('load', doPrint, { once: true });
    }
  }

  function turnsToPrintHtml(metadata, turns) {
    const parts = [];
    parts.push(`<h1>${escapeHtml(metadata.title)}</h1>`);
    parts.push(`<p>导出时间：${escapeHtml(metadata.exportedAt)}</p>`);
    parts.push(`<p>来源：<a href="${escapeHtml(metadata.url)}">${escapeHtml(metadata.url)}</a></p>`);
    parts.push('<hr/>');

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const roleLabel = turn.role === 'user' ? '用户' : 'Gemini';
      parts.push(`<h2>${i + 1}. ${roleLabel}</h2>`);
      parts.push(`<div>${renderTextAsHtml(turn.markdown || turn.text)}</div>`);

      if (turn.images && turn.images.length) {
        for (const img of turn.images) {
          parts.push(`<img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt || '')}"/>`);
        }
      }
      parts.push('<hr/>');
    }

    return parts.join('\n');
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderTextAsHtml(text) {
    const lines = String(text || '').split(/\n/);
    return lines
      .map((line) => {
        if (/^```/.test(line)) {
          return `<pre>${escapeHtml(line.replace(/^```/, '').trim())}</pre>`;
        }
        return `<p>${escapeHtml(line)}</p>`;
      })
      .join('');
  }

  function showProgress(title, desc) {
    hideProgress();

    const overlay = document.createElement('div');
    overlay.className = 'aisb-export-progress';

    const card = document.createElement('div');
    card.className = 'aisb-export-progress-card';

    const spinner = document.createElement('div');
    spinner.className = 'aisb-export-progress-spinner';

    const titleEl = document.createElement('h4');
    titleEl.className = 'aisb-export-progress-title';
    titleEl.textContent = title || '处理中';

    const descEl = document.createElement('div');
    descEl.className = 'aisb-export-progress-desc';
    descEl.textContent = desc || '请稍候...';

    card.appendChild(spinner);
    card.appendChild(titleEl);
    card.appendChild(descEl);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    state.ui.progress = overlay;

    return {
      setDescription(next) {
        descEl.textContent = next || '';
      },
      close: hideProgress,
    };
  }

  function hideProgress() {
    if (state.ui.progress && state.ui.progress.parentElement) {
      state.ui.progress.parentElement.removeChild(state.ui.progress);
    }
    state.ui.progress = null;
  }

  async function fetchImageByRuntime(url) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ type: 'gv.fetchImage', url }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response || !response.ok || !response.base64) {
            reject(new Error(response && response.error ? response.error : 'gv.fetchImage failed'));
            return;
          }

          const binary = atob(response.base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }

          resolve(new Blob([bytes], { type: response.contentType || 'image/png' }));
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async function fetchImageBlob(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.blob();
    } catch (_) {
      // 失败后尝试通过 background 获取，兼容跨域。
      return await fetchImageByRuntime(url);
    }
  }

  async function exportAsZipBundle() {
    const progress = showProgress('打包导出', '收集会话内容...');

    try {
      const md = buildMarkdownPayload({ includeImages: true });
      const json = buildJsonPayload();
      const metadata = md.metadata;

      const zip = new core.utils.SimpleZipBuilder();
      zip.addText('conversation.md', md.markdown);
      zip.addText('conversation.json', JSON.stringify(json, null, 2));

      let imageIndex = 0;
      const allImages = [];
      for (const turn of md.turns) {
        for (const image of turn.images) {
          allImages.push(image);
        }
      }

      for (const image of allImages) {
        imageIndex += 1;
        const filename = `images/image-${String(imageIndex).padStart(3, '0')}.${image.ext || 'png'}`;
        progress.setDescription(`下载图片 ${imageIndex}/${allImages.length} ...`);

        try {
          const blob = await fetchImageBlob(image.src);
          await zip.addBlob(filename, blob);
        } catch (error) {
          console.warn('[AISB Export] 图片下载失败，已跳过：', image.src, error);
        }
      }

      progress.setDescription('生成 ZIP ...');
      const blob = await zip.build();

      const base = sanitizeFilename(metadata.title);
      core.utils.downloadBlob(`${base}-${timestamp()}.zip`, blob);
      core.utils.toast('已完成 Markdown + JSON + 图片 ZIP 导出', 'success', 2600);
    } catch (error) {
      console.error('[AISB Export] ZIP 导出失败：', error);
      core.utils.toast('ZIP 导出失败，请稍后重试', 'error', 3600);
    } finally {
      progress.close();
    }
  }

  function exportJson() {
    const payload = buildJsonPayload();
    const base = sanitizeFilename(payload.title);
    core.utils.downloadText(`${base}-${timestamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    core.utils.toast('JSON 导出完成', 'success');
  }

  function exportMarkdown() {
    const payload = buildMarkdownPayload({ includeImages: true });
    const base = sanitizeFilename(payload.metadata.title);
    core.utils.downloadText(`${base}-${timestamp()}.md`, payload.markdown, 'text/markdown;charset=utf-8');
    core.utils.toast('Markdown 导出完成', 'success');
  }

  function exportPdf() {
    const turns = collectTurns();
    const metadata = buildMetadata(turns);
    const html = turnsToPrintHtml(metadata, turns);
    openPrintWindow(`${metadata.title} - PDF`, html);
    core.utils.toast('已打开 PDF 打印窗口', 'success');
  }

  function findDeepResearchReportRoot() {
    const panel = document.querySelector('deep-research-immersive-panel');
    if (!panel) return null;

    const candidates = Array.from(
      panel.querySelectorAll('.markdown, .markdown-main-panel, message-content'),
    ).filter((el) => !el.closest('thinking-panel'));

    let best = null;
    let bestLen = 0;

    for (const el of candidates) {
      const len = normalizeText(el.textContent).length;
      if (len > bestLen) {
        bestLen = len;
        best = el;
      }
    }

    return best;
  }

  function exportDeepResearchMarkdown() {
    const root = findDeepResearchReportRoot();
    if (!root) {
      core.utils.toast('当前不是 Deep Research 报告页面', 'warn');
      return;
    }

    const title = findCurrentConversationTitle();
    const text = normalizeText(root.innerText || root.textContent || '');

    const lines = [];
    lines.push(`# ${title}`);
    lines.push('');
    lines.push(`导出时间: ${new Date().toISOString()}`);
    lines.push('');
    lines.push(text);
    lines.push('');

    const md = lines.join('\n');
    core.utils.downloadText(`deep-research-report-${timestamp()}.md`, md, 'text/markdown;charset=utf-8');
    core.utils.toast('Deep Research 报告已导出为 Markdown', 'success');
  }

  function exportDeepResearchPdf() {
    const root = findDeepResearchReportRoot();
    if (!root) {
      core.utils.toast('当前不是 Deep Research 报告页面', 'warn');
      return;
    }

    const title = findCurrentConversationTitle();
    openPrintWindow(`${title} - Deep Research`, root.innerHTML || '');
    core.utils.toast('已打开 Deep Research PDF 打印窗口', 'success');
  }

  function collectSidebarConversations() {
    const refs = core.dom.getGeminiSidebarRefs();
    if (!refs || !refs.sidebar) return [];

    const nodes = refs.sidebar.querySelectorAll('[data-test-id="conversation"]');
    const list = [];
    const dedupe = new Set();

    nodes.forEach((node) => {
      const conversation = core.dom.extractConversationFromElement(node);
      if (!conversation || !conversation.conversationId) return;
      if (dedupe.has(conversation.conversationId)) return;
      dedupe.add(conversation.conversationId);
      list.push(conversation);
    });

    return list;
  }

  function closeBatchDialog() {
    if (state.ui.batchDialog && state.ui.batchDialog.parentElement) {
      state.ui.batchDialog.parentElement.removeChild(state.ui.batchDialog);
    }
    state.ui.batchDialog = null;
  }

  function openBatchExportDialog() {
    closeBatchDialog();

    const conversations = collectSidebarConversations();
    if (!conversations.length) {
      core.utils.toast('未在左侧会话列表中找到可批量导出的会话', 'warn');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'aisb-export-batch-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'aisb-export-batch-dialog';

    const head = document.createElement('div');
    head.className = 'aisb-export-batch-head';

    const title = document.createElement('h3');
    title.textContent = '批量导出会话';

    const subtitle = document.createElement('p');
    subtitle.textContent = `共 ${conversations.length} 条会话，勾选后导出为 JSON 清单。`;

    head.appendChild(title);
    head.appendChild(subtitle);

    const list = document.createElement('div');
    list.className = 'aisb-export-batch-list';

    for (const conversation of conversations) {
      const row = document.createElement('label');
      row.className = 'aisb-export-batch-row';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = conversation.conversationId;
      checkbox.checked = true;

      const content = document.createElement('div');
      const titleEl = document.createElement('div');
      titleEl.className = 'aisb-export-batch-row-title';
      titleEl.textContent = conversation.title || conversation.conversationId;

      const urlEl = document.createElement('div');
      urlEl.className = 'aisb-export-batch-row-url';
      urlEl.textContent = conversation.url || '';

      content.appendChild(titleEl);
      content.appendChild(urlEl);

      row.appendChild(checkbox);
      row.appendChild(content);

      list.appendChild(row);
    }

    const actions = document.createElement('div');
    actions.className = 'aisb-export-batch-actions';

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'aisb-export-batch-btn';
    cancel.textContent = '取消';
    cancel.addEventListener('click', closeBatchDialog);

    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'aisb-export-batch-btn primary';
    exportBtn.textContent = '导出清单';
    exportBtn.addEventListener('click', () => {
      const checkedIds = Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(
        (el) => el.value,
      );

      if (!checkedIds.length) {
        core.utils.toast('请至少选择一条会话', 'warn');
        return;
      }

      const selected = conversations.filter((item) => checkedIds.includes(item.conversationId));
      const payload = {
        format: 'gemini-voyager.batch-export.v1',
        exportedAt: new Date().toISOString(),
        accountId: core.getCurrentAccountId(),
        sourceUrl: location.href,
        count: selected.length,
        conversations: selected,
      };

      core.utils.downloadText(
        `gemini-batch-export-${timestamp()}.json`,
        JSON.stringify(payload, null, 2),
        'application/json',
      );

      closeBatchDialog();
      core.utils.toast(`已导出 ${selected.length} 条会话清单`, 'success');
    });

    actions.appendChild(cancel);
    actions.appendChild(exportBtn);

    dialog.appendChild(head);
    dialog.appendChild(list);
    dialog.appendChild(actions);

    overlay.appendChild(dialog);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeBatchDialog();
    });

    document.body.appendChild(overlay);
    state.ui.batchDialog = overlay;
  }

  function closeMenu() {
    state.menuOpen = false;
    if (state.ui.menu) {
      state.ui.menu.classList.remove('open');
    }
  }

  function openMenu() {
    state.menuOpen = true;
    if (state.ui.menu) {
      state.ui.menu.classList.add('open');
    }
  }

  function toggleMenu() {
    if (state.menuOpen) closeMenu();
    else openMenu();
  }

  function createMenuItem(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'aisb-export-item';
    button.textContent = label;
    button.addEventListener('click', async () => {
      closeMenu();
      await onClick();
    });
    return button;
  }

  function createSeparator() {
    const sep = document.createElement('div');
    sep.className = 'aisb-export-sep';
    return sep;
  }

  function mount() {
    ensureStyles();

    if (state.ui.host) {
      state.mounted = ensureHostMountedInSidebar();
      return state.mounted;
    }

    const host = document.createElement('div');
    host.id = TRIGGER_ID;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'aisb-export-btn';
    trigger.textContent = '导出';
    trigger.title = '导出当前会话';
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleMenu();
    });

    const menu = document.createElement('div');
    menu.className = 'aisb-export-menu';

    const title = document.createElement('h4');
    title.className = 'aisb-export-title';
    title.textContent = '聊天导出';
    menu.appendChild(title);

    menu.appendChild(createMenuItem('导出 JSON（完整结构）', async () => exportJson()));
    menu.appendChild(createMenuItem('导出 Markdown（含图片引用）', async () => exportMarkdown()));
    menu.appendChild(createMenuItem('导出 PDF（打印样式）', async () => exportPdf()));
    menu.appendChild(createMenuItem('导出 ZIP（Markdown + JSON + 图片）', async () => exportAsZipBundle()));

    menu.appendChild(createSeparator());
    menu.appendChild(createMenuItem('深度研究报告导出 Markdown', async () => exportDeepResearchMarkdown()));
    menu.appendChild(createMenuItem('深度研究报告导出 PDF', async () => exportDeepResearchPdf()));

    menu.appendChild(createSeparator());
    menu.appendChild(createMenuItem('批量导出（会话清单）', async () => openBatchExportDialog()));

    host.appendChild(trigger);
    host.appendChild(menu);
    state.ui.host = host;
    state.ui.trigger = trigger;
    state.ui.menu = menu;
    state.mounted = ensureHostMountedInSidebar();

    // 点击外部关闭菜单。
    if (!state.outsideClickBound) {
      state.outsideClickBound = true;
      document.addEventListener('click', (event) => {
        if (state.ui.host && !state.ui.host.contains(event.target)) {
          closeMenu();
        }
      });
    }

    core.module.register('export', {
      exportJson: () => buildJsonPayload(),
      exportMarkdown: () => buildMarkdownPayload({ includeImages: true }),
      exportBatchList: () => collectSidebarConversations(),
    });

    return state.mounted;
  }

  function bootstrap() {
    watchSidebarLifecycle();
    core.route.onChange(() => {
      scheduleSidebarRemount(260);
    });

    // 等待正文 DOM 稳定后挂载。
    const tryMount = () => {
      if (!document.body) return false;
      return mount();
    };

    if (tryMount()) return;

    let retries = 0;
    const timer = setInterval(() => {
      retries += 1;
      if (tryMount()) {
        clearInterval(timer);
        return;
      }
      if (retries > 60) {
        clearInterval(timer);
      }
    }, 300);
  }

  bootstrap();
})();
