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
      /* Hide NotebookLM top tab area based on actual DOM structure */
      /* Target the mat-tab-group container */
      div[id^="mat-tab-group-"][id$="-label"],
      [role="tablist"],
      .mat-mdc-tab-labels,
      .mat-mdc-tab-label-container,
      div[class*="mat-mdc-tab"]:has([role="tab"]) {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }

      /* Expand content area */
      [role="tabpanel"],
      .mat-mdc-tab-body-wrapper,
      main,
      [role="main"],
      .main-content,
      .content-area {
        height: 100vh !important;
        max-height: 100vh !important;
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 auto !important;
        padding-top: 0 !important;
      }

      /* Adjust body */
      body {
        padding-top: 0 !important;
        margin-top: 0 !important;
      }
    `;

    document.head.appendChild(style);
    console.log('[AISB NotebookLM] ✅ 顶部标签区域已隐藏');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles, { once: true });
  } else {
    injectStyles();
  }
})();
