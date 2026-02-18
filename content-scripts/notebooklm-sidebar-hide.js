(function () {
  'use strict';

  if (window.__AISB_NOTEBOOKLM_SIDEBAR_HIDE_LOADED__) return;
  if (!location.hostname.includes('notebooklm.google.com')) return;
  window.__AISB_NOTEBOOKLM_SIDEBAR_HIDE_LOADED__ = true;

  const STYLE_ID = 'aisb-notebooklm-sidebar-hide-style';
  const HOVER_ZONE_ID = 'aisb-notebooklm-hover-zone';
  const SHOW_CLASS = 'aisb-tabs-visible';
  const LEAVE_DELAY = 500;
  const ENTER_DELAY = 150;

  let leaveTimer = null;
  let enterTimer = null;

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

      /* Tab area: collapsed by default, slides down on hover */
      [role="tablist"],
      .mat-mdc-tab-labels,
      .mat-mdc-tab-label-container {
        max-height: 0 !important;
        overflow: hidden !important;
        transition: max-height 0.25s ease, opacity 0.2s ease !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      /* Tab area visible state */
      body.${SHOW_CLASS} [role="tablist"],
      body.${SHOW_CLASS} .mat-mdc-tab-labels,
      body.${SHOW_CLASS} .mat-mdc-tab-label-container {
        max-height: 60px !important;
        opacity: 1 !important;
        pointer-events: auto !important;
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

      /* Fix input area at bottom */
      div.query-box,
      [class*="query-box"],
      [class*="input-container"] {
        position: sticky !important;
        bottom: 0 !important;
        background: var(--surface-container, #1e1e1e) !important;
        z-index: 100 !important;
        display: block !important;
        visibility: visible !important;
      }

      /* Hover zone: thin strip at top to trigger tab reveal */
      #${HOVER_ZONE_ID} {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 20px !important;
        z-index: 9999 !important;
        pointer-events: auto !important;
        background: transparent !important;
      }
    `;

    document.head.appendChild(style);
  }

  function showTabs() {
    if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
    enterTimer = setTimeout(() => {
      document.body.classList.add(SHOW_CLASS);
    }, ENTER_DELAY);
  }

  function hideTabs() {
    if (enterTimer) { clearTimeout(enterTimer); enterTimer = null; }
    leaveTimer = setTimeout(() => {
      document.body.classList.remove(SHOW_CLASS);
    }, LEAVE_DELAY);
  }

  function injectHoverZone() {
    if (document.getElementById(HOVER_ZONE_ID)) return;

    const zone = document.createElement('div');
    zone.id = HOVER_ZONE_ID;
    document.body.appendChild(zone);

    zone.addEventListener('mouseenter', showTabs);
    zone.addEventListener('mouseleave', hideTabs);

    const tabAreas = () => document.querySelectorAll('[role="tablist"], .mat-mdc-tab-labels, .mat-mdc-tab-label-container');
    document.addEventListener('mouseover', (e) => {
      for (const el of tabAreas()) {
        if (el.contains(e.target)) { showTabs(); return; }
      }
    });
    document.addEventListener('mouseout', (e) => {
      for (const el of tabAreas()) {
        if (el.contains(e.target) && !el.contains(e.relatedTarget)) { hideTabs(); return; }
      }
    });
  }

  function init() {
    injectStyles();
    injectHoverZone();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
