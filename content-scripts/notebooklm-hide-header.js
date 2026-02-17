(function () {
  'use strict';

  if (window.__AISB_NOTEBOOKLM_HIDE_HEADER_LOADED__) return;
  if (!location.hostname.includes('notebooklm.google.com')) return;
  window.__AISB_NOTEBOOKLM_HIDE_HEADER_LOADED__ = true;

  const STYLE_ID = 'aisb-notebooklm-hide-header-style';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Hide NotebookLM header area */
      [class*="header"],
      [class*="top-bar"],
      [class*="toolbar"]:first-child {
        display: none !important;
      }

      /* Expand content area */
      [class*="content"],
      [class*="main-content"] {
        height: 100vh !important;
        max-height: 100vh !important;
      }
    `;

    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles, { once: true });
  } else {
    injectStyles();
  }
})();
