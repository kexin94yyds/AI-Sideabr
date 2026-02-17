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
      /* Hide NotebookLM top header with title and buttons */
      div.notebook-header-buttons-container,
      [class*="notebook-header"],
      [class*="header-buttons-container"] {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }

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

      /* Expand content area to full height */
      [role="tabpanel"],
      .mat-mdc-tab-body-wrapper {
        height: 100vh !important;
        max-height: 100vh !important;
        display: flex !important;
        flex-direction: column !important;
      }

      main,
      [role="main"],
      .main-content,
      .content-area {
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 auto !important;
        padding-top: 0 !important;
        flex: 1 !important;
        overflow-y: auto !important;
      }

      /* Keep input area at bottom - transparent and non-blocking */
      div.query-box,
      [class*="query-box"],
      [class*="input-container"] {
        position: fixed !important;
        bottom: 0 !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        max-width: 800px !important;
        width: 90% !important;
        background: transparent !important;
        z-index: 100 !important;
        min-height: 48px !important;
        max-height: 48px !important;
        pointer-events: none !important;
        transition: max-height 0.3s ease, background 0.3s ease, pointer-events 0s !important;
      }

      /* Enable interaction and show background on hover */
      div.query-box:hover,
      [class*="query-box"]:hover,
      [class*="input-container"]:hover {
        max-height: 150px !important;
        min-height: auto !important;
        background: var(--surface-container, #1e1e1e) !important;
        pointer-events: auto !important;
      }

      /* Keep enabled when focused */
      div.query-box:focus-within,
      [class*="query-box"]:focus-within,
      [class*="input-container"]:focus-within {
        max-height: 150px !important;
        min-height: auto !important;
        background: var(--surface-container, #1e1e1e) !important;
        pointer-events: auto !important;
      }

      /* Enable pointer events for children */
      div.query-box *,
      [class*="query-box"] *,
      [class*="input-container"] * {
        pointer-events: auto !important;
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
