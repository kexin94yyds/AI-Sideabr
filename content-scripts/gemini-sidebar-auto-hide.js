(function () {
  'use strict';

  if (window.__AISB_SIDEBAR_AUTO_HIDE_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_SIDEBAR_AUTO_HIDE_LOADED__ = true;

  let enabled = false;
  let sidebarContainer = null;
  let toggleButton = null;
  let autoCollapsed = false;
  let mouseOverSidebar = false;
  let paused = false;
  let expandTimer = null;
  let collapseTimer = null;

  const EXPAND_DELAY = 100;
  const COLLAPSE_DELAY = 300;

  function storageGet(keys) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
        resolve({});
        return;
      }
      chrome.storage.sync.get(keys, resolve);
    });
  }

  function findSidebarElements() {
    sidebarContainer = document.querySelector('bard-sidenav');
    
    toggleButton = document.querySelector('button[data-test-id="side-nav-menu-button"]') ||
                   document.querySelector('side-nav-menu-button button');
  }

  function isSidebarCollapsed() {
    if (document.body.classList.contains('mat-sidenav-opened')) return false;

    const sideContent = document.querySelector('bard-sidenav side-navigation-content > div');
    if (sideContent?.classList.contains('collapsed')) return true;

    const sidenav = document.querySelector('bard-sidenav');
    if (sidenav) {
      const width = sidenav.getBoundingClientRect().width;
      if (width < 80) return true;
    }

    return false;
  }

  function isSidebarVisible() {
    const sidenav = document.querySelector('bard-sidenav');
    if (!sidenav) return false;
    const rect = sidenav.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isPopupOrDialogOpen() {
    const selectors = [
      '.aisb-folder-dialog',
      '.aisb-folder-dialog-overlay',
      '.aisb-folder-context-menu',
      '.aisb-folder-color-picker',
      '[role="dialog"]',
      '[role="alertdialog"]',
    ];
    
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.offsetParent !== null) {
        return true;
      }
    }
    
    return false;
  }

  function clickToggleButton() {
    if (!toggleButton) {
      findSidebarElements();
    }
    
    if (toggleButton) {
      toggleButton.click();
      return true;
    }
    
    return false;
  }

  function expandSidebar() {
    if (paused || !enabled) return;
    
    if (isSidebarCollapsed()) {
      clickToggleButton();
    }
    
    autoCollapsed = false;
  }

  function collapseSidebar() {
    if (paused || !enabled) return;
    
    if (isPopupOrDialogOpen()) return;
    
    if (mouseOverSidebar) return;
    
    if (!isSidebarCollapsed()) {
      if (clickToggleButton()) {
        autoCollapsed = true;
      }
    }
  }

  function handleMouseEnter() {
    mouseOverSidebar = true;
    
    if (expandTimer) {
      clearTimeout(expandTimer);
    }
    
    if (collapseTimer) {
      clearTimeout(collapseTimer);
      collapseTimer = null;
    }
    
    expandTimer = setTimeout(() => {
      expandSidebar();
      expandTimer = null;
    }, EXPAND_DELAY);
  }

  function handleMouseLeave() {
    mouseOverSidebar = false;
    
    if (expandTimer) {
      clearTimeout(expandTimer);
      expandTimer = null;
    }
    
    if (collapseTimer) {
      clearTimeout(collapseTimer);
    }
    
    collapseTimer = setTimeout(() => {
      collapseSidebar();
      collapseTimer = null;
    }, COLLAPSE_DELAY);
  }

  function attachListeners() {
    findSidebarElements();
    
    if (!sidebarContainer) return;
    
    sidebarContainer.addEventListener('mouseenter', handleMouseEnter);
    sidebarContainer.addEventListener('mouseleave', handleMouseLeave);
  }

  function detachListeners() {
    if (!sidebarContainer) return;
    
    sidebarContainer.removeEventListener('mouseenter', handleMouseEnter);
    sidebarContainer.removeEventListener('mouseleave', handleMouseLeave);
    
    if (expandTimer) {
      clearTimeout(expandTimer);
      expandTimer = null;
    }
    
    if (collapseTimer) {
      clearTimeout(collapseTimer);
      collapseTimer = null;
    }
  }

  function applyFeatureState(nextEnabled) {
    enabled = !!nextEnabled;
    
    if (enabled) {
      attachListeners();
    } else {
      detachListeners();
      if (autoCollapsed && !isSidebarCollapsed()) {
        expandSidebar();
      }
    }
  }

  async function init() {
    const stored = await storageGet(['gvSidebarAutoHide']);
    applyFeatureState(Boolean(stored.gvSidebarAutoHide));

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync') return;
        
        if (changes.gvSidebarAutoHide) {
          applyFeatureState(Boolean(changes.gvSidebarAutoHide.newValue));
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    void init();
  }
})();
