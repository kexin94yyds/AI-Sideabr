(function () {
  'use strict';

  if (window.__AISB_FOLDER_LAYOUT_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_FOLDER_LAYOUT_LOADED__ = true;

  const STYLE_ID = 'aisb-folder-layout-style';
  const PANEL_ID = 'aisb-gemini-folder-panel';

  let spacing = 2;
  let indent = -8;

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

  function applyLayout() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    const vPad = Math.max(4, Math.round(4 + spacing * 0.5));
    const childFolderIndent = Math.max(0, 8 + indent);
    const childConvIndent = Math.max(0, 24 + indent);
    const dialogChildIndent = Math.max(0, 12 + indent);

    style.textContent = `
      #${PANEL_ID} .aisb-folder-row {
        padding-top: ${vPad}px !important;
        padding-bottom: ${vPad}px !important;
      }
      
      #${PANEL_ID} .aisb-folder-row.level-1 {
        padding-left: ${childFolderIndent}px !important;
      }
      
      #${PANEL_ID} .aisb-folder-row.level-2 {
        padding-left: ${childFolderIndent * 2}px !important;
      }
      
      #${PANEL_ID} .aisb-folder-conversation {
        padding-left: ${childConvIndent}px !important;
      }
      
      #${PANEL_ID} .aisb-folder-conversation.level-1 {
        padding-left: ${childConvIndent + childFolderIndent}px !important;
      }
      
      .aisb-folder-dialog .aisb-folder-row.level-1 {
        padding-left: ${dialogChildIndent}px !important;
      }
      
      .aisb-folder-dialog .aisb-folder-row.level-2 {
        padding-left: ${dialogChildIndent * 2}px !important;
      }
    `;
  }

  async function init() {
    const stored = await storageGet(['gvFolderSpacing', 'gvFolderTreeIndent']);
    spacing = Number.isFinite(stored.gvFolderSpacing) ? clamp(stored.gvFolderSpacing, 0, 16) : 2;
    indent = Number.isFinite(stored.gvFolderTreeIndent) ? clamp(stored.gvFolderTreeIndent, -8, 32) : -8;
    applyLayout();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync') return;
        
        if (changes.gvFolderSpacing) {
          const newValue = changes.gvFolderSpacing.newValue;
          spacing = Number.isFinite(newValue) ? clamp(newValue, 0, 16) : 2;
          applyLayout();
        }
        
        if (changes.gvFolderTreeIndent) {
          const newValue = changes.gvFolderTreeIndent.newValue;
          indent = Number.isFinite(newValue) ? clamp(newValue, -8, 32) : -8;
          applyLayout();
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
