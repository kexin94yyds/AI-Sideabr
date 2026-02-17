(function () {
  'use strict';

  if (window.__AISB_NOTEBOOKLM_SIDEBAR_HIDE_LOADED__) return;
  if (!location.hostname.includes('notebooklm.google.com')) return;
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
      /* Hide NotebookLM top tab area */
      div[id^="mat-tab-group-"][id$="-label"],
      [role="tablist"],
      .mat-mdc-tab-labels,
      .mat-mdc-tab-label-container {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }

      /* Hide NotebookLM top header and buttons container */
      [role="tab"],
      .tabs-container,
      [class*="tab"][class*="container"],
      header nav,
      nav[role="navigation"]:has([role="tab"]),
      .notebook-header,
      [class*="notebook-header"],
      [class*="header-buttons"],
      div[class*="notebook-header-buttons-container"] {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* Expand content area but keep input at bottom */
      [role="tabpanel"],
      .mat-mdc-tab-body-wrapper {
        height: calc(100vh - 80px) !important;
        max-height: calc(100vh - 80px) !important;
      }

      main,
      [role="main"],
      .main-content,
      .content-area {
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 auto !important;
        padding-top: 0 !important;
      }

      /* Ensure input area stays visible at bottom */
      [class*="input"],
      [class*="composer"],
      textarea,
      [contenteditable="true"] {
        display: block !important;
        visibility: visible !important;
      }
    `;

    document.head.appendChild(style);
    console.log('[AISB NotebookLM] ✅ 顶部标签区域已隐藏');
  }

  function removeStyles() {
    const style = document.getElementById(STYLE_ID);
    if (style) {
      style.remove();
      console.log('[AISB NotebookLM] ❌ 样式已移除');
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

    console.log('[AISB NotebookLM] ✅ 已加载');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    void init();
  }
})();
