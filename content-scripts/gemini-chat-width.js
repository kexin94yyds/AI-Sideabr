(function () {
  'use strict';

  if (window.__AISB_CHAT_WIDTH_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_CHAT_WIDTH_LOADED__ = true;

  const STYLE_ID = 'aisb-chat-width-style';
  const DEFAULT_WIDTH = 70;
  const MIN_WIDTH = 20;
  const MAX_WIDTH = 100;

  let currentWidth = DEFAULT_WIDTH;

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

    style.textContent = `
      chat-window,
      main.main {
        max-width: ${currentWidth}% !important;
      }
      
      @media (min-width: 1024px) {
        chat-window,
        main.main {
          max-width: ${currentWidth}% !important;
        }
      }
    `;
  }

  async function init() {
    const stored = await storageGet(['geminiChatWidth']);
    currentWidth = clamp(Number(stored.geminiChatWidth) || DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH);
    applyWidth();

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
