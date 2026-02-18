(function () {
  'use strict';

  if (window.__AISB_SIDEBAR_AUTO_HIDE_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_SIDEBAR_AUTO_HIDE_LOADED__ = true;

  const STYLE_ID = 'aisb-sidebar-auto-hide-style';
  const LEAVE_DELAY_MS = 500;
  const ENTER_DELAY_MS = 300;
  const SIDENAV_CHECK_INTERVAL_MS = 1000;
  const RESIZE_DEBOUNCE_MS = 200;
  const MENU_CLICK_PAUSE_MS = 1500;
  const CUSTOM_POPUP_SELECTORS = [
    '.aisb-folder-dialog',
    '.aisb-folder-dialog-overlay',
    '.aisb-folder-context-menu',
    '.aisb-folder-color-picker',
    '.mat-mdc-dialog-container',
    '.mat-mdc-menu-panel',
  ];

  let enabled = false;
  let leaveTimeoutId = null;
  let enterTimeoutId = null;
  let sidenavElement = null;
  let observer = null;
  let resizeHandler = null;
  let resizeDebounceTimer = null;
  let sidenavCheckTimer = null;
  let menuClickHandler = null;
  let autoCollapsed = false;
  let pausedUntil = 0;

  function isElementVisible(element) {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  }

  function insertTransitionStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      bard-sidenav,
      bard-sidenav side-navigation-content,
      bard-sidenav side-navigation-content > div {
        transition: width 0.25s ease, transform 0.25s ease !important;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function removeTransitionStyle() {
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
  }

  function findToggleButton() {
    const btn = document.querySelector('button[data-test-id="side-nav-menu-button"]');
    if (btn) return btn;
    const sideNavMenuButton = document.querySelector('side-nav-menu-button');
    if (sideNavMenuButton) return sideNavMenuButton.querySelector('button');
    return null;
  }

  function isSidebarCollapsed() {
    if (document.body.classList.contains('mat-sidenav-opened')) return false;
    const sideContent = document.querySelector('bard-sidenav side-navigation-content > div');
    if (sideContent && sideContent.classList.contains('collapsed')) return true;
    const sidenav = document.querySelector('bard-sidenav');
    if (sidenav) {
      const width = sidenav.getBoundingClientRect().width;
      if (width < 80) return true;
    }
    return false;
  }

  function isInIframe() {
    try { return window.self !== window.top; } catch (e) { return true; }
  }

  function isSidebarVisible() {
    const sidenav = document.querySelector('bard-sidenav');
    if (!sidenav) return false;
    if (isInIframe()) return true;
    const rect = sidenav.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isPaused() {
    return Date.now() < pausedUntil;
  }

  function pauseAutoCollapse(durationMs) {
    pausedUntil = Date.now() + durationMs;
  }

  function isPopupOrDialogOpen() {
    for (const selector of CUSTOM_POPUP_SELECTORS) {
      const els = document.querySelectorAll(selector);
      for (const el of els) {
        if (isElementVisible(el)) return true;
      }
    }
    return false;
  }

  function isMouseOverSidebarArea() {
    if (sidenavElement && sidenavElement.matches(':hover')) return true;
    for (const selector of CUSTOM_POPUP_SELECTORS) {
      const els = document.querySelectorAll(selector);
      for (const el of els) {
        if (el.matches(':hover')) return true;
      }
    }
    return false;
  }

  function handleMenuClick(e) {
    if (!enabled) return;
    const target = e.target;
    if (target.closest('[role="menuitem"], [role="menuitemradio"], .mat-mdc-menu-item')) {
      pauseAutoCollapse(MENU_CLICK_PAUSE_MS);
      return;
    }
    if (target.closest('bard-sidenav button, bard-sidenav [role="button"]')) {
      pauseAutoCollapse(MENU_CLICK_PAUSE_MS);
      return;
    }
    if (target.closest('[data-test-id*="options"], [aria-label*="选项"], [aria-label*="Options"], [aria-label*="More"]')) {
      pauseAutoCollapse(MENU_CLICK_PAUSE_MS);
    }
  }

  function clickToggleButton() {
    const btn = findToggleButton();
    if (!btn) return false;
    btn.click();
    return true;
  }

  function collapseSidebar() {
    if (isPaused()) return;
    if (isPopupOrDialogOpen()) return;
    if (isMouseOverSidebarArea()) return;
    if (!isSidebarCollapsed()) {
      if (clickToggleButton()) autoCollapsed = true;
    }
  }

  function expandSidebar() {
    if (isSidebarCollapsed()) {
      clickToggleButton();
      autoCollapsed = false;
    }
  }

  function handleMouseEnter() {
    if (!enabled) return;
    if (leaveTimeoutId !== null) { window.clearTimeout(leaveTimeoutId); leaveTimeoutId = null; }
    if (enterTimeoutId !== null) window.clearTimeout(enterTimeoutId);
    enterTimeoutId = window.setTimeout(() => {
      enterTimeoutId = null;
      if (!enabled) return;
      expandSidebar();
    }, ENTER_DELAY_MS);
  }

  function handleMouseLeave() {
    if (!enabled) return;
    if (enterTimeoutId !== null) { window.clearTimeout(enterTimeoutId); enterTimeoutId = null; }
    if (leaveTimeoutId !== null) window.clearTimeout(leaveTimeoutId);
    leaveTimeoutId = window.setTimeout(() => {
      leaveTimeoutId = null;
      if (!enabled) return;
      collapseSidebar();
    }, LEAVE_DELAY_MS);
  }

  function getSidenavElement() {
    return document.querySelector('bard-sidenav');
  }

  function attachEventListeners() {
    const sidenav = getSidenavElement();
    if (!sidenav) return false;
    if (!isSidebarVisible()) return false;
    if (sidenav === sidenavElement) return true;
    if (sidenavElement) {
      sidenavElement.removeEventListener('mouseenter', handleMouseEnter);
      sidenavElement.removeEventListener('mouseleave', handleMouseLeave);
    }
    sidenavElement = sidenav;
    sidenav.addEventListener('mouseenter', handleMouseEnter);
    sidenav.addEventListener('mouseleave', handleMouseLeave);
    return true;
  }

  function detachEventListeners() {
    if (sidenavElement) {
      sidenavElement.removeEventListener('mouseenter', handleMouseEnter);
      sidenavElement.removeEventListener('mouseleave', handleMouseLeave);
      sidenavElement = null;
    }
  }

  function checkAndReattach() {
    if (!enabled) return;
    if (sidenavElement && !sidenavElement.isConnected) {
      detachEventListeners();
      autoCollapsed = false;
    }
    if (sidenavElement && !isSidebarVisible()) {
      detachEventListeners();
      return;
    }
    const currentSidenav = getSidenavElement();
    if (currentSidenav && isSidebarVisible() && currentSidenav !== sidenavElement) {
      attachEventListeners();
    }
  }

  function handleResize() {
    if (!enabled) return;
    if (resizeDebounceTimer !== null) window.clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = window.setTimeout(() => {
      resizeDebounceTimer = null;
      checkAndReattach();
      setTimeout(() => { if (enabled) checkAndReattach(); }, 600);
    }, RESIZE_DEBOUNCE_MS);
  }

  function startSidenavCheck() {
    if (sidenavCheckTimer !== null) return;
    sidenavCheckTimer = window.setInterval(() => { checkAndReattach(); }, SIDENAV_CHECK_INTERVAL_MS);
  }

  function stopSidenavCheck() {
    if (sidenavCheckTimer !== null) { window.clearInterval(sidenavCheckTimer); sidenavCheckTimer = null; }
  }

  function enable() {
    if (enabled) return;
    enabled = true;
    autoCollapsed = false;
    pausedUntil = 0;
    insertTransitionStyle();
    attachEventListeners();
    if (!observer) {
      observer = new MutationObserver(() => { if (enabled) checkAndReattach(); });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    if (!resizeHandler) {
      resizeHandler = handleResize;
      window.addEventListener('resize', resizeHandler);
    }
    if (!menuClickHandler) {
      menuClickHandler = handleMenuClick;
      document.addEventListener('click', menuClickHandler, true);
    }
    startSidenavCheck();
    setTimeout(() => {
      if (enabled && sidenavElement && !sidenavElement.matches(':hover') && !isPopupOrDialogOpen()) {
        collapseSidebar();
      }
    }, 500);
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    if (enterTimeoutId !== null) { window.clearTimeout(enterTimeoutId); enterTimeoutId = null; }
    if (leaveTimeoutId !== null) { window.clearTimeout(leaveTimeoutId); leaveTimeoutId = null; }
    if (resizeDebounceTimer !== null) { window.clearTimeout(resizeDebounceTimer); resizeDebounceTimer = null; }
    stopSidenavCheck();
    if (autoCollapsed && isSidebarCollapsed()) clickToggleButton();
    autoCollapsed = false;
    pausedUntil = 0;
    detachEventListeners();
    removeTransitionStyle();
    if (observer) { observer.disconnect(); observer = null; }
    if (resizeHandler) { window.removeEventListener('resize', resizeHandler); resizeHandler = null; }
    if (menuClickHandler) { document.removeEventListener('click', menuClickHandler, true); menuClickHandler = null; }
  }

  function init() {
    try {
      chrome.storage.sync.get({ gvSidebarAutoHide: false }, (res) => {
        if (res && res.gvSidebarAutoHide === true) enable();
      });
    } catch (e) {}

    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.gvSidebarAutoHide) {
          if (changes.gvSidebarAutoHide.newValue === true) enable();
          else disable();
        }
      });
    } catch (e) {}

    window.addEventListener('beforeunload', () => { disable(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
