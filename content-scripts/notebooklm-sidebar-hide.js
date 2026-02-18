(function () {
  'use strict';

  if (window.__AISB_NOTEBOOKLM_SIDEBAR_HIDE_LOADED__) return;
  if (!location.hostname.includes('notebooklm.google.com')) return;
  window.__AISB_NOTEBOOKLM_SIDEBAR_HIDE_LOADED__ = true;

  const STYLE_ID = 'aisb-notebooklm-sidebar-hide-style';
  const SHOW_CLASS = 'aisb-header-visible';
  const HOVER_ZONE_PX = 56;
  const LEAVE_DELAY = 600;
  const IS_IFRAME = window.self !== window.top;

  let leaveTimer = null;
  let pinnedOpen = false;

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

      /* Restore header containers when toggled on */
      body.${SHOW_CLASS} div.notebook-header-buttons-container,
      body.${SHOW_CLASS} [class*="notebook-header"],
      body.${SHOW_CLASS} [class*="header-buttons-container"],
      body.${SHOW_CLASS} .configure-settings-button-tab-view-container {
        display: flex !important;
        height: revert !important;
        min-height: revert !important;
        overflow: revert !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }

      /* Restore tab list as horizontal flex row */
      body.${SHOW_CLASS} [role="tablist"],
      body.${SHOW_CLASS} .mat-mdc-tab-labels,
      body.${SHOW_CLASS} .mat-mdc-tab-label-container {
        display: flex !important;
        flex-direction: row !important;
        height: revert !important;
        min-height: revert !important;
        overflow: revert !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }


      /* Native page left toggle strip */
      #aisb-native-left-strip {
        position: fixed !important;
        left: 0 !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        width: 12px !important;
        height: 48px !important;
        background: rgba(128,128,128,0.25) !important;
        border: none !important;
        border-radius: 0 6px 6px 0 !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 10px !important;
        color: currentColor !important;
        z-index: 2147483647 !important;
        padding: 0 !important;
        line-height: 1 !important;
        transition: background 0.15s !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        clip: auto !important;
        clip-path: none !important;
        overflow: visible !important;
      }
      #aisb-native-left-strip:hover {
        background: rgba(128,128,128,0.45) !important;
      }
    `;

    document.head.appendChild(style);
  }

  function showHeader() {
    if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
    document.body.classList.add(SHOW_CLASS);
  }

  function hideHeader() {
    if (pinnedOpen) return;
    if (leaveTimer) clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => {
      document.body.classList.remove(SHOW_CLASS);
    }, LEAVE_DELAY);
  }

  function setupHoverZone() {
    document.addEventListener('mousemove', (e) => {
      if (pinnedOpen) return;
      if (e.clientY <= HOVER_ZONE_PX) {
        showHeader();
      } else if (document.body.classList.contains(SHOW_CLASS)) {
        hideHeader();
      }
    });
  }

  function injectNativeStrip() {
    if (IS_IFRAME) return;

    const doInject = () => {
      if (document.getElementById('aisb-native-left-strip')) return;

      const strip = document.createElement('button');
      strip.id = 'aisb-native-left-strip';
      strip.textContent = pinnedOpen ? '‹' : '›';
      strip.title = '展开/收起标签栏';

      strip.addEventListener('click', () => {
        pinnedOpen = !pinnedOpen;
        strip.textContent = pinnedOpen ? '‹' : '›';
        if (pinnedOpen) {
          showHeader();
        } else {
          if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
          document.body.classList.remove(SHOW_CLASS);
        }
      });

      document.body.appendChild(strip);
    };

    setTimeout(doInject, 800);

    setInterval(() => {
      if (!document.getElementById('aisb-native-left-strip')) {
        doInject();
      }
    }, 1000);
  }

  function listenForParentMessages() {
    if (!IS_IFRAME) return;
    window.addEventListener('message', (e) => {
      if (e.data === 'aisb-notebooklm-show-tabs') {
        pinnedOpen = true;
        showHeader();
      }
      if (e.data === 'aisb-notebooklm-hide-tabs') {
        pinnedOpen = false;
        if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
        document.body.classList.remove(SHOW_CLASS);
      }
    });
  }

  function init() {
    injectStyles();
    setupHoverZone();
    injectNativeStrip();
    listenForParentMessages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
