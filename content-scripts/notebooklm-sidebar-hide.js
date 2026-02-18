(function () {
  'use strict';

  if (window.__AISB_NOTEBOOKLM_SIDEBAR_HIDE_LOADED__) return;
  if (!location.hostname.includes('notebooklm.google.com')) return;
  window.__AISB_NOTEBOOKLM_SIDEBAR_HIDE_LOADED__ = true;

  const STYLE_ID = 'aisb-notebooklm-sidebar-hide-style';
  const SHOW_CLASS = 'aisb-header-visible';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Hide entire NotebookLM top header by default */
      div.notebook-header-buttons-container,
      [class*="notebook-header"],
      [class*="header-buttons-container"],
      .configure-settings-button-tab-view-container,
      [role="tablist"],
      .mat-mdc-tab-labels,
      .mat-mdc-tab-label-container {
        display: none !important;
        height: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      /* Restore entire header when toggled on */
      body.${SHOW_CLASS} div.notebook-header-buttons-container,
      body.${SHOW_CLASS} [class*="notebook-header"],
      body.${SHOW_CLASS} [class*="header-buttons-container"],
      body.${SHOW_CLASS} .configure-settings-button-tab-view-container,
      body.${SHOW_CLASS} [role="tablist"],
      body.${SHOW_CLASS} .mat-mdc-tab-labels,
      body.${SHOW_CLASS} .mat-mdc-tab-label-container {
        display: revert !important;
        height: revert !important;
        min-height: revert !important;
        overflow: revert !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }
    `;

    document.head.appendChild(style);
  }

  function showHeader() {
    document.body.classList.add(SHOW_CLASS);
  }

  function hideHeader() {
    document.body.classList.remove(SHOW_CLASS);
  }

  function listenForParentMessages() {
    window.addEventListener('message', (e) => {
      if (e.data === 'aisb-notebooklm-show-tabs') showHeader();
      if (e.data === 'aisb-notebooklm-hide-tabs') hideHeader();
    });
  }

  function init() {
    injectStyles();
    listenForParentMessages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
