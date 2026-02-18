(function () {
  'use strict';

  if (window.__AISB_UNIVERSAL_INPUT_COLLAPSE_LOADED__) return;
  window.__AISB_UNIVERSAL_INPUT_COLLAPSE_LOADED__ = true;

  const COLLAPSED_CLASS = 'aisb-input-collapsed';
  const STYLE_ID = 'aisb-universal-input-collapse-style';

  let enabled = false;
  let observer = null;
  let eventController = null;

  const PLATFORM_CONFIGS = {
    'notebooklm.google.com': {
      inputSelector: 'textarea, [contenteditable="true"][role="textbox"], [role="textbox"]',
      containerSelector: 'form, .input-wrap, .chat-input, [class*="input"]',
      placeholderText: '给 NotebookLM 发消息',
      shouldAutoCollapse: () => true,
    },
    'chatgpt.com': {
      inputSelector: '#prompt-textarea, textarea[data-id="root"]',
      containerSelector: 'form:has(textarea), .composer-parent',
      placeholderText: '给 ChatGPT 发消息',
      shouldAutoCollapse: () => true,
    },
    'claude.ai': {
      inputSelector: '[contenteditable="true"][role="textbox"], textarea',
      containerSelector: '.ProseMirror-parent, form:has([contenteditable])',
      placeholderText: '给 Claude 发消息',
      shouldAutoCollapse: () => true,
    },
    'chat.deepseek.com': {
      inputSelector: 'textarea, [contenteditable="true"]',
      containerSelector: '.input-wrap, form:has(textarea)',
      placeholderText: '给 DeepSeek 发消息',
      shouldAutoCollapse: () => true,
    },
    'kimi.moonshot.cn': {
      inputSelector: 'textarea, [contenteditable="true"]',
      containerSelector: '.chat-input, form:has(textarea)',
      placeholderText: '给 Kimi 发消息',
      shouldAutoCollapse: () => true,
    },
    'tongyi.com': {
      inputSelector: 'textarea, [contenteditable="true"]',
      containerSelector: '.input-box, form:has(textarea)',
      placeholderText: '给通义千问发消息',
      shouldAutoCollapse: () => true,
    },
    'doubao.com': {
      inputSelector: 'textarea, [contenteditable="true"]',
      containerSelector: '.chat-input, form:has(textarea)',
      placeholderText: '给豆包发消息',
      shouldAutoCollapse: () => true,
    },
    'perplexity.ai': {
      inputSelector: 'textarea[placeholder*="Ask"], textarea',
      containerSelector: 'form:has(textarea), .search-bar',
      placeholderText: '给 Perplexity 发消息',
      shouldAutoCollapse: () => true,
    },
    'copilot.microsoft.com': {
      inputSelector: 'textarea, [contenteditable="true"]',
      containerSelector: '.input-container, form:has(textarea)',
      placeholderText: '给 Copilot 发消息',
      shouldAutoCollapse: () => true,
    },
    'grok.com': {
      inputSelector: 'textarea, [contenteditable="true"]',
      containerSelector: 'form:has(textarea), .composer',
      placeholderText: '给 Grok 发消息',
      shouldAutoCollapse: () => true,
    },
  };

  function storageGet(keys) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
        resolve({});
        return;
      }
      chrome.storage.sync.get(keys, resolve);
    });
  }

  function getCurrentConfig() {
    const hostname = location.hostname;
    return PLATFORM_CONFIGS[hostname] || null;
  }

  function getInputContainer() {
    const config = getCurrentConfig();
    if (!config) {
      console.log('[AISB] No config for', location.hostname);
      return null;
    }

    const containers = document.querySelectorAll(config.containerSelector);
    console.log('[AISB] Found', containers.length, 'potential containers');
    
    for (const container of containers) {
      const input = container.querySelector(config.inputSelector);
      if (input) {
        console.log('[AISB] Found input container:', container, 'input:', input);
        return container;
      }
    }
    
    console.log('[AISB] No valid input container found');
    return null;
  }

  function getInput(container) {
    if (!container) return null;
    const config = getCurrentConfig();
    if (!config) return null;
    return container.querySelector(config.inputSelector);
  }

  function shouldDisableAutoCollapse() {
    const config = getCurrentConfig();
    if (!config || !config.shouldAutoCollapse) return false;
    return !config.shouldAutoCollapse(window.location.pathname);
  }

  function isInputEmpty(container) {
    if (!container) return true;
    const input = getInput(container);
    if (!input) return true;

    const text = input.value || input.textContent || '';
    return text.trim().length === 0;
  }

  function hasAttachments(container) {
    if (!container) return false;
    const attachments = container.querySelectorAll('[data-test-id="attachment"], .attachment, .file-item, input[type="file"] + *');
    return attachments.length > 0;
  }

  function tryCollapse(container) {
    if (!container || !enabled) return;
    if (shouldDisableAutoCollapse()) return;
    if (!isInputEmpty(container)) return;
    if (hasAttachments(container)) return;

    container.classList.add(COLLAPSED_CLASS);
    ensurePlaceholder(container);
  }

  function ensurePlaceholder(container) {
    const placeholderClass = 'aisb-collapse-placeholder';
    if (container.querySelector(`.${placeholderClass}`)) return;

    const config = getCurrentConfig();
    if (!config) return;

    const placeholder = document.createElement('div');
    placeholder.className = placeholderClass;
    placeholder.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>${config.placeholderText}</span>
    `;
    container.appendChild(placeholder);
  }

  function expand(container, shouldFocus = true) {
    if (!container) return;
    container.classList.remove(COLLAPSED_CLASS);

    if (shouldFocus) {
      setTimeout(() => {
        const input = getInput(container);
        if (input) {
          input.focus();
        }
      }, 100);
    }
  }

  function hasDraggedFiles(dataTransfer) {
    if (!dataTransfer || !dataTransfer.types) return false;
    return dataTransfer.types.includes('Files');
  }

  function bindContainerEvents(container, signal) {
    if (!container) return;
    if (container.dataset.aisbCollapseEventsBound) return;
    container.dataset.aisbCollapseEventsBound = '1';

    container.addEventListener(
      'click',
      () => {
        expand(container, true);
      },
      { signal },
    );

    container.addEventListener(
      'focusin',
      () => {
        expand(container, true);
      },
      { signal },
    );

    container.addEventListener(
      'focusout',
      () => {
        setTimeout(() => {
          if (document.activeElement && container.contains(document.activeElement)) {
            return;
          }
          tryCollapse(container);
        }, 150);
      },
      { signal },
    );

    const input = getInput(container);
    if (input) {
      input.addEventListener(
        'input',
        () => {
          if (!isInputEmpty(container)) {
            container.classList.remove(COLLAPSED_CLASS);
          }
        },
        { signal },
      );
    }
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${COLLAPSED_CLASS} {
        height: 48px !important;
        min-height: 48px !important;
        max-height: 48px !important;
        border-radius: 24px !important;
        width: auto !important;
        min-width: 200px !important;
        max-width: 600px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        padding: 0 24px !important;
        overflow: hidden !important;
        background-color: #f0f4f9 !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
        border: 1px solid transparent !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        position: relative !important;
        z-index: 999 !important;
        gap: 0 !important;
        transform: none !important;
        transition: all 0.2s ease !important;
      }

      .${COLLAPSED_CLASS}:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12) !important;
        transform: translateY(-1px) !important;
      }

      .${COLLAPSED_CLASS} > *:not(.aisb-collapse-placeholder) {
        visibility: hidden !important;
        opacity: 0 !important;
        width: 0 !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        position: absolute !important;
        pointer-events: none !important;
      }

      .aisb-collapse-placeholder {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }

      .${COLLAPSED_CLASS} > .aisb-collapse-placeholder {
        visibility: visible !important;
        opacity: 1 !important;
        display: flex !important;
        position: relative !important;
        color: #1f1f1f;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 15px;
        font-weight: 500;
        white-space: nowrap;
        align-items: center;
        gap: 10px;
        pointer-events: none;
      }

      .aisb-collapse-placeholder svg {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }

      @media (prefers-color-scheme: dark) {
        .${COLLAPSED_CLASS} {
          background-color: #2b2b2b !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        }

        .${COLLAPSED_CLASS}:hover {
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4) !important;
        }

        .${COLLAPSED_CLASS} > .aisb-collapse-placeholder {
          color: #e8eaed;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function cleanup() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (eventController) {
      eventController.abort();
      eventController = null;
    }
    const container = getInputContainer();
    if (container) {
      container.classList.remove(COLLAPSED_CLASS);
      delete container.dataset.aisbCollapseEventsBound;
    }
  }

  function initInputCollapse() {
    cleanup();
    injectStyles();

    eventController = new AbortController();
    const signal = eventController.signal;

    document.addEventListener(
      'dragenter',
      (event) => {
        if (!hasDraggedFiles(event.dataTransfer)) return;
        const container = getInputContainer();
        if (container && container.classList.contains(COLLAPSED_CLASS)) {
          expand(container, false);
        }
      },
      { signal, capture: true },
    );

    observer = new MutationObserver(() => {
      const container = getInputContainer();
      if (!container) return;

      bindContainerEvents(container, signal);

      if (!shouldDisableAutoCollapse() && isInputEmpty(container) && !hasAttachments(container)) {
        tryCollapse(container);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const container = getInputContainer();
    if (container) {
      bindContainerEvents(container, signal);
      if (!shouldDisableAutoCollapse()) {
        tryCollapse(container);
      }
    }
  }

  function applyFeatureState(nextEnabled) {
    enabled = !!nextEnabled;

    if (enabled) {
      initInputCollapse();
    } else {
      cleanup();
    }
  }

  async function init() {
    if (location.hostname.includes('notebooklm.google.com')) {
      return;
    }

    const config = getCurrentConfig();
    if (!config) {
      console.log('[AISB Universal Input Collapse] ⚠️ 当前平台不支持:', location.hostname);
      return;
    }

    console.log('[AISB Universal Input Collapse] 🔧 配置:', config);

    const stored = await storageGet(['universalInputCollapseEnabled']);
    const isEnabled = Boolean(stored.universalInputCollapseEnabled);
    console.log('[AISB Universal Input Collapse] 设置状态:', isEnabled);
    
    applyFeatureState(isEnabled);

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync') return;

        if (changes.universalInputCollapseEnabled) {
          const newValue = Boolean(changes.universalInputCollapseEnabled.newValue);
          console.log('[AISB Universal Input Collapse] 设置变更:', newValue);
          applyFeatureState(newValue);
        }
      });
    }

    console.log('[AISB Universal Input Collapse] ✅ 已加载 -', location.hostname);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    void init();
  }
})();
