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
      /* 缩小 Gemini 输入框 - 使用更强的选择器 */
      rich-textarea {
        max-height: 100px !important;
        min-height: 50px !important;
      }

      rich-textarea textarea,
      rich-textarea div[contenteditable="true"] {
        max-height: 80px !important;
        min-height: 40px !important;
        font-size: 13px !important;
        line-height: 1.4 !important;
        padding: 6px 10px !important;
      }

      /* 输入框容器 */
      .input-area-container,
      .composer-container,
      mat-form-field.mat-mdc-form-field,
      .mdc-text-field {
        max-height: 100px !important;
      }

      /* 调整文本区域 */
      .input-area,
      .composer-input-wrapper,
      .mat-mdc-form-field-infix {
        max-height: 80px !important;
      }

      /* 调整按钮区域 */
      .composer-buttons,
      .input-area-buttons,
      .mat-mdc-form-field-subscript-wrapper {
        padding: 2px 6px !important;
        min-height: auto !important;
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
