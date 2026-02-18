(function () {
  'use strict';

  if (window.__AISB_GEMINI_INPUT_COLLAPSE_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_INPUT_COLLAPSE_LOADED__ = true;

  const COLLAPSED_CLASS = 'aisb-input-collapsed';
  const STYLE_ID = 'aisb-gemini-input-collapse-style';
  const BUTTON_ID = 'aisb-input-collapse-button';

  let enabled = false;
  let observer = null;
  let eventController = null;
  let lastPathname = window.location.pathname;

  function storageGet(keys) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
        resolve({});
        return;
      }
      chrome.storage.sync.get(keys, resolve);
    });
  }

  function getInputContainer() {
    const direct = document.querySelector('input-container');
    if (direct) return direct;

    const textarea = document.querySelector('rich-textarea');
    if (!textarea) return null;

    let current = textarea.parentElement;
    for (let i = 0; i < 8; i++) {
      if (!current) break;
      if (current.tagName && current.tagName.toLowerCase() === 'input-container') return current;
      if (current.tagName === 'MAIN' || current.tagName === 'BODY') break;
      current = current.parentElement;
    }

    return null;
  }

  function isHomepageOrNewConversation() {
    const pathname = window.location.pathname;
    return /^\/(?:u\/\d+\/)?app\/?$/.test(pathname);
  }

  function isGemsEditorPage() {
    const pathname = window.location.pathname;
    return /^\/(?:u\/\d+\/)?gems\/(?:create|edit)\/?/.test(pathname);
  }

  function shouldDisableAutoCollapse() {
    return isHomepageOrNewConversation() || isGemsEditorPage();
  }

  function isInputEmpty(container) {
    if (!container) return true;
    const textarea = container.querySelector('rich-textarea [contenteditable="true"]');
    if (!textarea) return true;
    const text = (textarea.textContent || '').trim();
    return text.length === 0;
  }

  function hasAttachments(container) {
    if (!container) return false;
    const attachmentsArea = container.querySelector('uploader-file-preview') || 
                            container.querySelector('.file-preview-wrapper') ||
                            container.querySelector('[data-test-id="attachment"]');
    return !!attachmentsArea;
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

    const placeholder = document.createElement('div');
    placeholder.className = placeholderClass;
    placeholder.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>给 Gemini 发消息</span>
    `;
    container.appendChild(placeholder);
  }

  function expand(container, shouldFocus = true) {
    if (!container) return;
    container.classList.remove(COLLAPSED_CLASS);

    if (shouldFocus) {
      setTimeout(() => {
        const textarea = container.querySelector('rich-textarea [contenteditable="true"]');
        if (textarea) {
          textarea.focus();
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

    const textarea = container.querySelector('rich-textarea [contenteditable="true"]');
    if (textarea) {
      textarea.addEventListener(
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
      input-container.${COLLAPSED_CLASS} {
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
        background-color: var(--gm3-sys-color-surface-container, #f0f4f9) !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
        border: none !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        position: relative !important;
        z-index: 999 !important;
        gap: 0 !important;
        transform: none !important;
      }

      input-container.${COLLAPSED_CLASS} > *:not(.aisb-collapse-placeholder) {
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

      input-container.${COLLAPSED_CLASS} > .aisb-collapse-placeholder {
        visibility: visible !important;
        opacity: 1 !important;
        display: flex !important;
        position: relative !important;
        color: var(--gm3-sys-color-on-surface, #1f1f1f);
        font-family: Google Sans, Roboto, sans-serif;
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
      }

      @media (prefers-color-scheme: dark) {
        input-container.${COLLAPSED_CLASS} {
          background-color: var(--gm3-sys-color-surface-container-high, #2b2b2b) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        }

        input-container.${COLLAPSED_CLASS} > .aisb-collapse-placeholder {
          color: var(--gm3-sys-color-on-surface, #e8eaed);
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

    const onRouteMaybeChanged = () => {
      const pathname = window.location.pathname;
      if (pathname === lastPathname) return;
      lastPathname = pathname;

      const container = getInputContainer();
      if (!container) return;

      if (shouldDisableAutoCollapse()) {
        expand(container, false);
      } else {
        tryCollapse(container);
      }
    };

    window.addEventListener('popstate', onRouteMaybeChanged, { signal });
    window.addEventListener('hashchange', onRouteMaybeChanged, { signal });

    observer = new MutationObserver(() => {
      onRouteMaybeChanged();

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
    const stored = await storageGet(['gvInputCollapseEnabled']);
    applyFeatureState(Boolean(stored.gvInputCollapseEnabled));

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync') return;

        if (changes.gvInputCollapseEnabled) {
          applyFeatureState(Boolean(changes.gvInputCollapseEnabled.newValue));
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    void init();
  }
})();
