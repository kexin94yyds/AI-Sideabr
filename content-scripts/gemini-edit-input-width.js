(function () {
  'use strict';

  if (window.__AISB_EDIT_INPUT_WIDTH_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_EDIT_INPUT_WIDTH_LOADED__ = true;

  const STYLE_ID = 'aisb-edit-input-width-style';
  const DEFAULT_WIDTH = 60;
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

    style.textContent = `
      /* Edit mode containers */
      .query-content.edit-mode,
      div.edit-mode,
      [class*="edit-mode"] {
        max-width: ${currentWidth}vw !important;
        width: ${currentWidth}vw !important;
      }

      .edit-mode .edit-container,
      .query-content.edit-mode .edit-container {
        max-width: ${currentWidth}vw !important;
        width: ${currentWidth}vw !important;
      }

      .edit-mode .mat-mdc-form-field,
      .edit-container .mat-mdc-form-field,
      .edit-mode .edit-form {
        max-width: ${currentWidth}vw !important;
        width: 100% !important;
      }

      .edit-mode textarea,
      .edit-container textarea,
      .edit-mode .mat-mdc-input-element,
      .edit-mode .cdk-textarea-autosize {
        max-width: ${currentWidth}vw !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

      /* Main chat input area */
      input-container {
        max-width: ${currentWidth}vw !important;
        width: ${currentWidth}vw !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      input-container .input-area-container {
        max-width: 100% !important;
        width: 100% !important;
      }

      input-area-v2 {
        max-width: 100% !important;
        width: 100% !important;
      }

      input-area-v2 .input-area {
        max-width: 100% !important;
        width: 100% !important;
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
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  async function init() {
    const stored = await storageGet(['geminiEditInputWidth']);
    currentWidth = clamp(Number(stored.geminiEditInputWidth) || DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH);
    applyWidth();
    startObserver();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync') return;
        
        if (changes.geminiEditInputWidth) {
          currentWidth = clamp(Number(changes.geminiEditInputWidth.newValue) || DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH);
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
