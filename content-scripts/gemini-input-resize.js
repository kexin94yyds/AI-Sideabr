(function () {
  'use strict';

  if (window.__AISB_GEMINI_INPUT_RESIZE_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_INPUT_RESIZE_LOADED__ = true;

  const STYLE_ID = 'aisb-gemini-input-resize-style';
  const WIDTH = '60vw';
  let currentHeight = 58;

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

  function updateInputHeight(value) {
    const height = clamp(Number(value) || 58, 30, 100);
    currentHeight = height;
    let style = document.getElementById(STYLE_ID);
    
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }

    style.textContent = `
      input-container .input-area-container,
      input-area-v2,
      input-area-v2 .input-area {
        min-height: ${height}px !important;
        height: auto !important;
      }

      input-area-v2 rich-textarea,
      input-area-v2 [contenteditable="true"] {
        min-height: ${height}px !important;
        max-height: ${height + 40}px !important;
        overflow-y: auto !important;
      }
    `;

    console.log('[AISB Input Resize] ✅ 输入框高度已更新:', height + 'px');
  }

  let observer = null;

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(() => {
      updateInputHeight(currentHeight);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  async function init() {
    const stored = await storageGet(['geminiInputHeight']);
    updateInputHeight(stored.geminiInputHeight || 58);
    startObserver();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync') return;
        if (changes.geminiInputHeight) {
          updateInputHeight(changes.geminiInputHeight.newValue);
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
