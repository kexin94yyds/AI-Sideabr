(function () {
  'use strict';

  if (window.__AISB_SIDEBAR_WIDTH_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_SIDEBAR_WIDTH_LOADED__ = true;

  const STYLE_ID = 'aisb-sidebar-width-style';
  const DEFAULT_WIDTH = 312;
  const MIN_WIDTH = 180;
  const MAX_WIDTH = 540;

  let currentWidth = DEFAULT_WIDTH;

  function storageGet(keys) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
        resolve({});
        return;
      }
      chrome.storage.sync.get(keys, resolve);
    });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function applyWidth() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    style.textContent = `
      :root {
        --bard-sidenav-open-width: ${currentWidth}px !important;
      }
      
      bard-sidenav-container[data-sidenav-state="open"],
      aside[role="navigation"] {
        width: ${currentWidth}px !important;
        min-width: ${currentWidth}px !important;
        max-width: ${currentWidth}px !important;
      }
    `;
  }

  async function init() {
    const stored = await storageGet(['geminiSidebarWidth']);
    currentWidth = clamp(Number(stored.geminiSidebarWidth) || DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH);
    applyWidth();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync') return;
        
        if (changes.geminiSidebarWidth) {
          currentWidth = clamp(Number(changes.geminiSidebarWidth.newValue) || DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH);
          applyWidth();
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
