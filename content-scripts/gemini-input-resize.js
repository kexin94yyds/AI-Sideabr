(function () {
  'use strict';

  if (window.__AISB_GEMINI_INPUT_RESIZE_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_INPUT_RESIZE_LOADED__ = true;

  const STYLE_ID = 'aisb-gemini-input-resize-style';
  const WIDTH = '60vw';

  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .content-wrapper:has(input-container),
    .main-content:has(input-container),
    .content-container:has(input-container),
    [role="main"]:has(input-container),
    main > div:has(input-container) {
      max-width: none !important;
      width: 100% !important;
    }

    input-container {
      max-width: ${WIDTH} !important;
      width: min(100%, ${WIDTH}) !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    input-container .input-area-container,
    input-area-v2,
    input-area-v2 .input-area {
      max-width: 100% !important;
      width: 100% !important;
    }

    input-area-v2 .input-area {
      min-height: 44px !important;
    }

    input-area-v2 rich-textarea,
    input-area-v2 [contenteditable="true"] {
      max-height: 72px !important;
      overflow-y: auto !important;
    }
  `;

  (document.head || document.documentElement).appendChild(style);
  console.log('[AISB Input Resize] ✅ 样式已注入 - 宽度:', WIDTH);
})();
