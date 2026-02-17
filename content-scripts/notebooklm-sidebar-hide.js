(function () {
  'use strict';

  if (window.__AISB_NOTEBOOKLM_SIDEBAR_HIDE_LOADED__) return;
  if (location.hostname !== 'notebooklm.google.com') return;
  window.__AISB_NOTEBOOKLM_SIDEBAR_HIDE_LOADED__ = true;

  const STYLE_ID = 'aisb-notebooklm-sidebar-hide-style';

  let enabled = false;

  function storageGet(keys) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
        resolve({});
        return;
      }
      chrome.storage.sync.get(keys, resolve);
    });
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      [role="tablist"],
      [role="tab"],
      .tabs-container,
      [class*="tab"][class*="container"],
      header nav,
      nav[role="navigation"]:has([role="tab"]) {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        overflow: hidden !important;
      }

      main,
      [role="main"],
      .main-content,
      .content-area {
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 auto !important;
      }
    `;

    document.head.appendChild(style);
    console.log('[AISB NotebookLM Sidebar Hide] ✅ 样式已注入');
  }

  function removeStyles() {
    const style = document.getElementById(STYLE_ID);
    if (style) {
      style.remove();
      console.log('[AISB NotebookLM Sidebar Hide] ❌ 样式已移除');
    }
  }

  function applyFeatureState(nextEnabled) {
    enabled = !!nextEnabled;

    if (enabled) {
      injectStyles();
    } else {
      removeStyles();
    }
  }

  async function init() {
    const stored = await storageGet(['notebooklmSidebarHideEnabled']);
    applyFeatureState(Boolean(stored.notebooklmSidebarHideEnabled));

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync') return;

        if (changes.notebooklmSidebarHideEnabled) {
          applyFeatureState(Boolean(changes.notebooklmSidebarHideEnabled.newValue));
        }
      });
    }

    console.log('[AISB NotebookLM Sidebar Hide] ✅ 已加载');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    void init();
  }
})();
