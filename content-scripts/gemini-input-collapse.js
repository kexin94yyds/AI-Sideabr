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
  let collapseButton = null;

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
    return document.querySelector('input-container');
  }

  function shouldDisableAutoCollapse() {
    const path = window.location.pathname;
    return path === '/' || path === '/app' || path.includes('/gem/') || path.includes('/gems');
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
    const attachments = container.querySelectorAll('[data-test-id="attachment"]');
    return attachments.length > 0;
  }

  function createCollapseButton() {
    if (collapseButton) return collapseButton;

    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.className = 'aisb-collapse-trigger';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>给 Gemini 发消息</span>
    `;

    collapseButton = button;
    return button;
  }

  function tryCollapse(container) {
    if (!container || !enabled) return;
    if (shouldDisableAutoCollapse()) return;
    if (!isInputEmpty(container)) return;
    if (hasAttachments(container)) return;

    container.classList.add(COLLAPSED_CLASS);

    const button = createCollapseButton();
    if (!container.contains(button)) {
      container.appendChild(button);
      
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        expand(container, true);
      });
    }
  }

  function expand(container, shouldFocus = true) {
    if (!container) return;
    container.classList.remove(COLLAPSED_CLASS);

    if (collapseButton && collapseButton.parentElement) {
      collapseButton.parentElement.removeChild(collapseButton);
    }

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

    const button = container.querySelector(`#${BUTTON_ID}`);
    if (button) {
      button.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          event.stopPropagation();
          expand(container, true);
        },
        { signal },
      );
    }

    container.addEventListener(
      'click',
      (event) => {
        if (!container.classList.contains(COLLAPSED_CLASS)) return;
        if (event.target.closest(`#${BUTTON_ID}`)) {
          event.preventDefault();
          event.stopPropagation();
          expand(container, true);
        }
      },
      { signal, capture: true },
    );

    container.addEventListener(
      'focusin',
      () => {
        if (container.classList.contains(COLLAPSED_CLASS)) {
          expand(container, false);
        }
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
        position: relative;
        min-height: 56px !important;
        max-height: 56px !important;
      }

      input-container.${COLLAPSED_CLASS} .input-area-container,
      input-container.${COLLAPSED_CLASS} rich-textarea,
      input-container.${COLLAPSED_CLASS} .composer-buttons,
      input-container.${COLLAPSED_CLASS} .input-area-buttons {
        display: none !important;
      }

      #${BUTTON_ID} {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.9);
        color: #5f6368;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 180ms ease;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      }

      #${BUTTON_ID}:hover {
        background: rgba(255, 255, 255, 1);
        border-color: rgba(0, 0, 0, 0.18);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      }

      #${BUTTON_ID} svg {
        width: 20px;
        height: 20px;
        color: #5f6368;
      }

      @media (prefers-color-scheme: dark) {
        #${BUTTON_ID} {
          background: rgba(48, 49, 52, 0.9);
          border-color: rgba(255, 255, 255, 0.12);
          color: #e8eaed;
        }

        #${BUTTON_ID}:hover {
          background: rgba(58, 59, 62, 1);
          border-color: rgba(255, 255, 255, 0.18);
        }

        #${BUTTON_ID} svg {
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
      if (collapseButton && collapseButton.parentElement) {
        collapseButton.parentElement.removeChild(collapseButton);
      }
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
