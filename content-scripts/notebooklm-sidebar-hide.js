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

      /* Outer box: single visible frame */
      div.query-box,
      [class*="query-box"] {
        position: sticky !important;
        bottom: 0 !important;
        z-index: 100 !important;
        display: flex !important;
        align-items: center !important;
        width: 100% !important;
        height: 40px !important;
        min-height: 40px !important;
        padding: 0 12px !important;
        background: var(--surface-container, #1e1e1e) !important;
        border: 1px solid var(--outline-variant, rgba(255,255,255,.12)) !important;
        border-radius: 8px !important;
        box-shadow: none !important;
      }

      /* Inner layer: remove second frame visual */
      div.query-box .input-group,
      [class*="query-box"] .input-group,
      div.query-box .input-group.aisb-input-collapsed,
      [class*="query-box"] .input-group.aisb-input-collapsed {
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        overflow: visible !important;
      }

      /* Override universal-input-collapse hiding logic */
      div.query-box .input-group.aisb-input-collapsed > *:not(.aisb-collapse-placeholder),
      [class*="query-box"] .input-group.aisb-input-collapsed > *:not(.aisb-collapse-placeholder) {
        visibility: visible !important;
        opacity: 1 !important;
        width: auto !important;
        height: auto !important;
        position: static !important;
        pointer-events: auto !important;
      }

      div.query-box .input-group .aisb-collapse-placeholder,
      [class*="query-box"] .input-group .aisb-collapse-placeholder {
        display: none !important;
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

      /* Input area: fit outer frame directly */
      div.query-box textarea,
      [class*="query-box"] textarea,
      div.query-box [contenteditable="true"],
      [class*="query-box"] [contenteditable="true"] {
        flex: 1 1 auto !important;
        width: 100% !important;
        min-height: 28px !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        outline: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
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
