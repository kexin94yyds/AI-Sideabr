(function () {
  'use strict';

  if (window.__AISB_NOTEBOOKLM_SIDEBAR_HIDE_LOADED__) return;
  if (!location.hostname.includes('notebooklm.google.com')) return;
  window.__AISB_NOTEBOOKLM_SIDEBAR_HIDE_LOADED__ = true;

  const STYLE_ID = 'aisb-notebooklm-sidebar-hide-style';
  const TOGGLE_ID = 'aisb-notebooklm-tab-toggle';
  const SHOW_CLASS = 'aisb-tabs-visible';
  const LEAVE_DELAY = 600;
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

      /* Tab area: collapsed by default */
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

      /* Tab toggle button: sits below AI Sidebar toolbar */
      #${TOGGLE_ID} {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        width: 100% !important;
        height: 24px !important;
        background: var(--surface-container-low, rgba(255,255,255,0.04)) !important;
        border: none !important;
        border-bottom: 1px solid rgba(255,255,255,0.08) !important;
        color: var(--on-surface-variant, #aaa) !important;
        font-size: 11px !important;
        cursor: pointer !important;
        user-select: none !important;
        transition: background 0.15s !important;
        position: relative !important;
        z-index: 200 !important;
      }
      #${TOGGLE_ID}:hover {
        background: var(--surface-container, rgba(255,255,255,0.08)) !important;
        color: var(--on-surface, #fff) !important;
      }
    `;

    document.head.appendChild(style);
  }

  function showTabs() {
    if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
    enterTimer = setTimeout(() => {
      document.body.classList.add(SHOW_CLASS);
      const btn = document.getElementById(TOGGLE_ID);
      if (btn) btn.textContent = '▲ 来源 · 对话 · Studio';
    }, ENTER_DELAY);
  }

  function hideTabs() {
    if (enterTimer) { clearTimeout(enterTimer); enterTimer = null; }
    leaveTimer = setTimeout(() => {
      document.body.classList.remove(SHOW_CLASS);
      const btn = document.getElementById(TOGGLE_ID);
      if (btn) btn.textContent = '▼ 来源 · 对话 · Studio';
    }, LEAVE_DELAY);
  }

  function injectToggleButton() {
    if (document.getElementById(TOGGLE_ID)) return;

    const btn = document.createElement('button');
    btn.id = TOGGLE_ID;
    btn.textContent = '▼ 来源 · 对话 · Studio';
    btn.title = '悬停展开标签栏';

    btn.addEventListener('mouseenter', showTabs);
    btn.addEventListener('mouseleave', hideTabs);

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

    const tryInsert = () => {
      const body = document.querySelector('mat-tab-group, [role="tabpanel"]')?.closest('mat-tab-group')?.parentElement
        || document.querySelector('.mat-mdc-tab-body-wrapper')?.parentElement
        || document.body;

      const tabGroup = document.querySelector('mat-tab-group');
      if (tabGroup && tabGroup.parentElement) {
        tabGroup.parentElement.insertBefore(btn, tabGroup);
        return true;
      }
      return false;
    };

    if (!tryInsert()) {
      const obs = new MutationObserver(() => {
        if (tryInsert()) obs.disconnect();
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  function init() {
    injectStyles();
    injectToggleButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
