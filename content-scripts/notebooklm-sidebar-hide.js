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
      [class*="header-buttons-container"],
      div.configure-settings-button-tab-view-container,
      [class*="configure-settings-button"] {
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

      /* Keep input area at bottom - minimal height and transparent */
      div.query-box,
      [class*="query-box"],
      [class*="input-container"] {
        position: sticky !important;
        bottom: 0 !important;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        z-index: 100 !important;
        height: 30px !important;
        min-height: 30px !important;
        max-height: 30px !important;
        overflow: visible !important;
        transition: background 0.3s ease !important;
      }

      /* Hide container padding and borders */
      div.query-box > *,
      [class*="query-box"] > *,
      [class*="input-container"] > * {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* Hide input-group container */
      div.query-box .input-group,
      [class*="query-box"] .input-group,
      [class*="input-group"] {
        background: transparent !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
      }

      /* Force hide all container visual elements */
      div.query-box::before,
      div.query-box::after,
      [class*="query-box"]::before,
      [class*="query-box"]::after {
        display: none !important;
      }

      /* Hide specific Material Design container elements */
      div.query-box .mat-mdc-form-field,
      [class*="query-box"] .mat-mdc-form-field {
        background: transparent !important;
        border: none !important;
      }

      /* Show background on hover or focus */
      div.query-box:hover,
      div.query-box:focus-within,
      [class*="query-box"]:hover,
      [class*="query-box"]:focus-within,
      [class*="input-container"]:hover,
      [class*="input-container"]:focus-within {
        background: var(--surface-container, #1e1e1e) !important;
      }

      /* Hide prompt button */
      div.query-box button[aria-label*="开始"],
      div.query-box button[aria-label*="输入"],
      div.query-box button:not([type="submit"]),
      [class*="query-box"] button[aria-label*="开始"],
      [class*="query-box"] button[aria-label*="输入"],
      [class*="query-box"] button:not([type="submit"]),
      div.query-box > button:first-child,
      [class*="query-box"] > button:first-child {
        display: none !important;
      }

      /* Show textarea directly */
      div.query-box textarea,
      [class*="query-box"] textarea,
      div.query-box [contenteditable="true"],
      [class*="query-box"] [contenteditable="true"] {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      /* Hide footer disclaimer */
      footer.footer,
      footer[class*="mat-body"],
      [class*="footer"][class*="mat-body"] {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
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
