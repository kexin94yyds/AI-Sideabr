(function () {
  'use strict';

  if (window.__AISB_CHAT_WIDTH_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_CHAT_WIDTH_LOADED__ = true;

  const STYLE_ID = 'aisb-chat-width-style';
  const DEFAULT_WIDTH = 70;
  const MIN_WIDTH = 30;
  const MAX_WIDTH = 100;

  let currentWidth = DEFAULT_WIDTH;
  let observer = null;

  function storageGet(keys) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
        resolve({});
        return;
      }
      chrome.storage.sync.get(keys, resolve);
    });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function applyWidth() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    const widthValue = `${currentWidth}vw`;

    style.textContent = `
      /* Remove outer container width limits */
      .content-wrapper:has(chat-window),
      .main-content:has(chat-window),
      .content-container:has(chat-window),
      .content-container:has(.conversation-container),
      [role="main"]:has(chat-window),
      [role="main"]:has(.conversation-container) {
        max-width: none !important;
      }

      chat-window,
      .chat-container,
      chat-window-content,
      .chat-history-scroll-container,
      .chat-history,
      .conversation-container {
        max-width: none !important;
      }

      main > div:has(user-query),
      main > div:has(model-response),
      main > div:has(.conversation-container) {
        max-width: none !important;
        width: 100% !important;
      }

      /* User message containers */
      .user-query-bubble-container,
      .user-query-container,
      user-query-content,
      user-query,
      div[aria-label="User message"],
      article[data-author="user"],
      [data-message-author-role="user"] {
        max-width: ${widthValue} !important;
        width: min(100%, ${widthValue}) !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      /* Model response containers */
      model-response,
      .model-response,
      response-container,
      .response-container,
      .presented-response-container,
      [aria-label="Gemini response"],
      [data-message-author-role="assistant"],
      [data-message-author-role="model"],
      article[data-author="assistant"] {
        max-width: ${widthValue} !important;
        width: min(100%, ${widthValue}) !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      /* Fallback for browsers without :has() support */
      @supports not selector(:has(*)) {
        .content-wrapper,
        .main-content,
        .content-container {
          max-width: none !important;
        }

        main > div:not(:has(button)):not(.main-menu-button) {
          max-width: none !important;
          width: 100% !important;
        }
      }
    `;
  }

  function startObserver() {
    if (observer) return;

    observer = new MutationObserver(() => {
      applyWidth();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
    });
  }

  async function init() {
    const stored = await storageGet(['geminiChatWidth']);
    currentWidth = clamp(Number(stored.geminiChatWidth) || DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH);
    applyWidth();
    startObserver();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync') return;
        
        if (changes.geminiChatWidth) {
          currentWidth = clamp(Number(changes.geminiChatWidth.newValue) || DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH);
          applyWidth();
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
