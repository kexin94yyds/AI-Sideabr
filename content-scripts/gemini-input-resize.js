(function () {
  'use strict';

  if (window.__AISB_GEMINI_INPUT_RESIZE_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_INPUT_RESIZE_LOADED__ = true;

  const STYLE_ID = 'aisb-gemini-input-resize-style';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      console.log('[AISB Input Resize] 样式已存在，跳过注入');
      return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* 缩小 Gemini 输入框 - 超强选择器 */
      rich-textarea,
      rich-textarea *,
      [role="textbox"],
      .input-area-container,
      .composer-container {
        max-height: 90px !important;
      }

      rich-textarea textarea,
      rich-textarea div[contenteditable="true"],
      rich-textarea [contenteditable="true"] {
        max-height: 70px !important;
        min-height: 35px !important;
        font-size: 13px !important;
        line-height: 1.3 !important;
        padding: 6px 10px !important;
        overflow-y: auto !important;
      }
    `;

    document.head.appendChild(style);
    console.log('[AISB Input Resize] ✅ 样式已成功注入到页面');
    console.log('[AISB Input Resize] Style element:', style);
  }

  function init() {
    injectStyles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
