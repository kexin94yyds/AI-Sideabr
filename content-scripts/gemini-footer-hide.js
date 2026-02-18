(function () {
  'use strict';

  if (window.__AISB_GEMINI_FOOTER_HIDE_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_FOOTER_HIDE_LOADED__ = true;

  const STYLE_ID = 'aisb-gemini-footer-hide-style';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Hide Gemini disclaimer footer */
      disclaimer,
      [class*="disclaimer"],
      [data-test-id*="disclaimer"],
      .disclaimer-container,
      footer.disclaimer,
      div[class*="disclaimer"][class*="container"],
      div[role="contentinfo"] {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
        opacity: 0 !important;
      }

      /* Hide specific Gemini footer text */
      input-container + div,
      input-container ~ div[class*="text"],
      input-container ~ div[class*="info"],
      input-container ~ div[class*="hint"] {
        display: none !important;
      }

      /* Ensure input container takes full space */
      input-container {
        margin-bottom: 0 !important;
      }
    `;

    document.head.appendChild(style);
    console.log('[AISB Gemini Footer Hide] ✅ 底部提示已隐藏');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles, { once: true });
  } else {
    injectStyles();
  }
})();
