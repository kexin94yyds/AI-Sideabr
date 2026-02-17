(function () {
  'use strict';

  if (window.__AISB_GEMINI_INPUT_COLLAPSE_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_INPUT_COLLAPSE_LOADED__ = true;

  const SETTINGS_KEY = 'gvToolsSettings';
  const SETTINGS_FLAG = 'inputCollapsed';
  const COLLAPSED_CLASS = 'aisb-tools-input-collapsed';
  const STYLE_ID = 'aisb-gemini-input-collapse-style';

  let observer = null;
  let eventController = null;
  let lastPathname = window.location.pathname;

  function parseSettings(raw) {
    if (!raw || typeof raw !== 'object') return {};
    return raw;
  }

  function getFeatureEnabled(callback) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      callback(false);
      return;
    }
    chrome.storage.local.get(SETTINGS_KEY, (result) => {
      const settings = parseSettings(result[SETTINGS_KEY]);
      callback(Boolean(settings[SETTINGS_FLAG]));
    });
  }

  function getInputContainer() {
    return document.querySelector('input-container');
  }

  function stripLegacyClass(container) {
    if (!container) return;
    container.classList.remove('gv-input-collapsed');
  }

  function shouldDisableAutoCollapse() {
    const path = window.location.pathname;
    return path.includes('/gem/') || path.includes('/gems');
  }

  function isInputEmpty(container) {
    if (!container) return true;
    const textarea = container.querySelector('rich-textarea [contenteditable="true"]');
    if (!textarea) return true;
    const text = (textarea.textContent || '').trim();
    return text.length === 0;
  }

  function tryCollapse(container) {
    if (!container) return;
    if (shouldDisableAutoCollapse()) return;
    if (!isInputEmpty(container)) return;
    container.classList.add(COLLAPSED_CLASS);
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
      }, 80);
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
      (event) => {
        if (!container.classList.contains(COLLAPSED_CLASS)) return;
        event.preventDefault();
        event.stopPropagation();
        expand(container, true);
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
        }, 120);
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
        max-height: 48px !important;
        min-height: 48px !important;
        cursor: pointer;
        transition: max-height 200ms cubic-bezier(0.4, 0, 0.2, 1);
      }

      input-container.${COLLAPSED_CLASS} .input-area-container {
        max-height: 48px !important;
        overflow: hidden;
      }

      input-container.${COLLAPSED_CLASS} rich-textarea,
      input-container.${COLLAPSED_CLASS} rich-textarea [contenteditable="true"] {
        max-height: 32px !important;
        min-height: 32px !important;
        overflow: hidden;
        cursor: pointer;
      }

      input-container.${COLLAPSED_CLASS} rich-textarea [contenteditable="true"]::before {
        content: '点击展开输入框...';
        color: #9ca3af;
        pointer-events: none;
      }

      input-container.${COLLAPSED_CLASS} .composer-buttons,
      input-container.${COLLAPSED_CLASS} .input-area-buttons {
        opacity: 0.6;
      }
    `;

    (document.head || document.documentElement).appendChild(style);
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

      stripLegacyClass(container);

      if (shouldDisableAutoCollapse()) {
        container.classList.remove(COLLAPSED_CLASS);
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

      stripLegacyClass(container);
      bindContainerEvents(container, signal);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const container = getInputContainer();
    if (container) {
      bindContainerEvents(container, signal);
    }
  }

  function applyFeatureState(enabled) {
    if (enabled) {
      initInputCollapse();
    } else {
      cleanup();
    }
  }

  function handleStorageChange(changes, areaName) {
    if (areaName !== 'local') return;
    if (!changes || !changes[SETTINGS_KEY]) return;
    const settings = parseSettings(changes[SETTINGS_KEY].newValue);
    applyFeatureState(Boolean(settings[SETTINGS_FLAG]));
  }

  function bootstrap() {
    getFeatureEnabled((enabled) => {
      applyFeatureState(enabled);
    });

    if (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.onChanged &&
      typeof chrome.storage.onChanged.addListener === 'function'
    ) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }
  }

  bootstrap();
})();
