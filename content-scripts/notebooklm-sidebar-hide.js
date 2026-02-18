(function () {
  'use strict';

  if (window.__AISB_NOTEBOOKLM_SIDEBAR_HIDE_LOADED__) return;
  if (!location.hostname.includes('notebooklm.google.com')) return;
  window.__AISB_NOTEBOOKLM_SIDEBAR_HIDE_LOADED__ = true;

  const STYLE_ID = 'aisb-notebooklm-sidebar-hide-style';
  const SHOW_CLASS = 'aisb-tabs-visible';
  const NEW_BTN_ID = 'aisb-notebooklm-new-btn';
  const LEAVE_DELAY = 600;
  const ENTER_DELAY = 150;

  let leaveTimer = null;
  let enterTimer = null;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Hide NotebookLM top header with title and buttons,
         but keep the Create Notebook button visible */
      div.notebook-header-buttons-container,
      [class*="notebook-header"],
      [class*="header-buttons-container"] {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }

      /* Cloned Create Notebook button */
      #aisb-create-notebook-clone {
        position: fixed !important;
        top: 8px !important;
        right: 60px !important;
        z-index: 9999 !important;
        display: none !important;
      }
      body.${SHOW_CLASS} #aisb-create-notebook-clone {
        display: inline-flex !important;
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

      /* Tab area visible when triggered from parent frame */
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

  function clickTab(tabIndex) {
    const tabs = document.querySelectorAll('[role="tab"]');
    if (tabs[tabIndex]) {
      tabs[tabIndex].click();
    }
  }

  function clickCreateNotebook() {
    const btn = document.querySelector(
      'button[aria-label*="Create"], button[aria-label*="新建"], ' +
      'button[data-mat-icon-name*="add"], a[href*="/notebook/new"], ' +
      '.new-notebook-button, [data-test-id="new-notebook"]'
    );
    if (btn) {
      btn.click();
      return;
    }
    const allBtns = Array.from(document.querySelectorAll('button'));
    const found = allBtns.find(b => /create|新建|new notebook/i.test(b.textContent));
    if (found) found.click();
  }

  function findCreateNotebookBtn() {
    const candidates = [
      ...document.querySelectorAll('button'),
      ...document.querySelectorAll('a'),
    ];
    return candidates.find(el => {
      const label = (el.getAttribute('aria-label') || el.textContent || '').toLowerCase();
      return /new notebook|create notebook|新建笔记|新建 notebook/i.test(label);
    }) || null;
  }

  function injectCreateNotebookClone() {
    if (document.getElementById('aisb-create-notebook-clone')) return;

    const tryClone = () => {
      const original = findCreateNotebookBtn();
      if (!original) return false;

      const clone = original.cloneNode(true);
      clone.id = 'aisb-create-notebook-clone';
      clone.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        original.click();
      });
      document.body.appendChild(clone);
      return true;
    };

    if (!tryClone()) {
      const obs = new MutationObserver(() => {
        if (tryClone()) obs.disconnect();
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => obs.disconnect(), 10000);
    }
  }

  function listenForParentMessages() {
    window.addEventListener('message', (e) => {
      if (e.data === 'aisb-notebooklm-show-tabs') showTabs();
      if (e.data === 'aisb-notebooklm-hide-tabs') hideTabs();
      if (e.data === 'aisb-notebooklm-create-notebook') clickCreateNotebook();
      if (e.data && typeof e.data === 'object' && e.data.type === 'aisb-notebooklm-switch-tab') {
        showTabs();
        setTimeout(() => clickTab(e.data.tab), 200);
      }
    });
  }

  function init() {
    injectStyles();
    injectCreateNotebookClone();
    listenForParentMessages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
