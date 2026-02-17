(function () {
  'use strict';

  if (window.__AISB_NOTEBOOKLM_SIDEBAR_HIDE_LOADED__) return;
  if (!location.hostname.includes('notebooklm.google.com')) return;
  window.__AISB_NOTEBOOKLM_SIDEBAR_HIDE_LOADED__ = true;

  const STYLE_ID = 'aisb-notebooklm-sidebar-hide-style';

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
      [role="tablist"],
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
    console.log('[AISB NotebookLM] 顶部标签区域已隐藏');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles, { once: true });
  } else {
    injectStyles();
  }
})();
