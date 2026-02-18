(function () {
  'use strict';

  if (window.__AISB_GEMINI_FOOTER_HIDE_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_FOOTER_HIDE_LOADED__ = true;

  const STYLE_ID = 'aisb-gemini-footer-hide-style';
  const HIDDEN_CLASS = 'aisb-footer-hidden';

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

      /* Hide specific Gemini footer text below input */
      input-container + div,
      input-container ~ div[class*="text"],
      input-container ~ div[class*="info"],
      input-container ~ div[class*="hint"] {
        display: none !important;
      }

      /* Hide by class added by observer */
      .${HIDDEN_CLASS} {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        overflow: hidden !important;
      }

      /* Ensure input container takes full space */
      input-container {
        margin-bottom: 0 !important;
      }
    `;

    document.head.appendChild(style);
    console.log('[AISB Gemini Footer Hide] ✅ 样式已注入');
  }

  function hideFooterByText(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    
    const text = element.textContent || '';
    const keywords = [
      'Gemini 是一款 AI',
      'can make mistakes',
      '其回答未必',
      '正确无误',
      'AI 工具'
    ];

    if (keywords.some(kw => text.includes(kw))) {
      if (!element.classList.contains(HIDDEN_CLASS)) {
        element.classList.add(HIDDEN_CLASS);
        console.log('[AISB Gemini Footer Hide] ✅ 隐藏底部提示:', text.substring(0, 50));
        return true;
      }
    }
    return false;
  }

  function scanAndHideFooters() {
    const inputContainer = document.querySelector('input-container');
    if (!inputContainer) return;

    let current = inputContainer.nextElementSibling;
    let count = 0;
    
    while (current && count < 5) {
      if (hideFooterByText(current)) {
        break;
      }
      current = current.nextElementSibling;
      count++;
    }

    const allDivs = document.querySelectorAll('div');
    for (const div of allDivs) {
      if (hideFooterByText(div)) {
        break;
      }
    }
  }

  function init() {
    injectStyles();
    scanAndHideFooters();

    const observer = new MutationObserver(() => {
      scanAndHideFooters();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[AISB Gemini Footer Hide] ✅ 监听已启动');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
