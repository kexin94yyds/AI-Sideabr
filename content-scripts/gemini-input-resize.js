(function () {
  'use strict';

  if (window.__AISB_GEMINI_INPUT_RESIZE_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_INPUT_RESIZE_LOADED__ = true;

  const STYLE_ID = 'aisb-gemini-input-resize-style';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* 缩小 Gemini 输入框 */
      rich-textarea,
      rich-textarea textarea,
      .input-area-container,
      .composer-container,
      mat-form-field.mat-mdc-form-field {
        max-height: 120px !important;
        min-height: 60px !important;
      }

      rich-textarea textarea {
        font-size: 14px !important;
        line-height: 1.5 !important;
        padding: 8px 12px !important;
      }

      /* 调整输入框容器 */
      .input-area,
      .composer-input-wrapper {
        max-height: 120px !important;
      }

      /* 调整按钮区域 */
      .composer-buttons,
      .input-area-buttons {
        padding: 4px 8px !important;
      }

      /* 深色模式适配 */
      html.dark-theme rich-textarea textarea,
      body.dark-theme rich-textarea textarea,
      html[data-theme="dark"] rich-textarea textarea,
      body[data-theme="dark"] rich-textarea textarea {
        background: rgba(31, 41, 55, 0.6) !important;
        color: #e5e7eb !important;
      }
    `;

    document.head.appendChild(style);
    console.log('[AISB Input Resize] 样式已注入');
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
