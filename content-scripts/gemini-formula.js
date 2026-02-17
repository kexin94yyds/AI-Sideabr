(function () {
  'use strict';

  if (window.__AISB_GEMINI_FORMULA_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_FORMULA_LOADED__ = true;

  const core = window.__AISB_GEMINI__;
  if (!core) {
    console.error('[AISB Formula] 缺少 gemini-common.js。');
    return;
  }

  const STYLE_ID = 'aisb-gemini-formula-style';
  const TOOLBAR_ID = 'aisb-gemini-formula-toolbar';
  const MATHML_NS = 'http://www.w3.org/1998/Math/MathML';

  const state = {
    toolbar: null,
    target: null,
    hideTimer: null,
  };

  function ensureStyles() {
    core.dom.ensureStyle(
      STYLE_ID,
      `
      #${TOOLBAR_ID} {
        position: fixed;
        z-index: 2147483640;
        display: none;
        align-items: center;
        gap: 6px;
        border-radius: 8px;
        border: 1px solid rgba(229, 231, 235, 0.9);
        background: rgba(255, 255, 255, 0.96);
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        padding: 5px;
        animation: aisb-gm-fade-up 200ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      #${TOOLBAR_ID} .aisb-formula-btn {
        border: 1px solid rgba(229, 231, 235, 0.9);
        border-radius: 6px;
        background: #ffffff;
        color: #6b7280;
        font-size: 12px;
        font-weight: 600;
        line-height: 1;
        padding: 6px 8px;
        cursor: pointer;
      }
      #${TOOLBAR_ID} .aisb-formula-btn:hover {
        background: rgba(0, 0, 0, 0.06);
        color: #1f2937;
        transform: translateY(-1px);
      }
      `,
    );
  }

  function clearHideTimer() {
    if (state.hideTimer) {
      clearTimeout(state.hideTimer);
      state.hideTimer = null;
    }
  }

  function scheduleHideToolbar() {
    clearHideTimer();
    state.hideTimer = setTimeout(() => {
      hideToolbar();
    }, 180);
  }

  function hideToolbar() {
    if (state.toolbar) {
      state.toolbar.style.display = 'none';
    }
    state.target = null;
  }

  function findMathElement(target) {
    if (!(target instanceof HTMLElement)) return null;

    const direct = target.closest('[data-math]');
    if (direct instanceof HTMLElement) return direct;

    const geminiContainer = target.closest('.math-inline, .math-block');
    if (geminiContainer instanceof HTMLElement) {
      const nested = geminiContainer.querySelector('[data-math]');
      if (nested instanceof HTMLElement) return nested;
      return geminiContainer;
    }

    const aiStudioContainer = target.closest('ms-katex');
    if (aiStudioContainer instanceof HTMLElement) return aiStudioContainer;

    const katex = target.closest('.katex');
    if (katex instanceof HTMLElement) {
      const parent = katex.closest('ms-katex');
      if (parent instanceof HTMLElement) return parent;
      return katex;
    }

    return null;
  }

  function extractLatex(element) {
    if (!element) return '';

    const dataMath = element.getAttribute('data-math');
    if (dataMath && dataMath.trim()) return dataMath.trim();

    const annotation = element.querySelector('annotation[encoding="application/x-tex"]');
    if (annotation && annotation.textContent && annotation.textContent.trim()) {
      return annotation.textContent.trim();
    }

    const anyAnnotation = element.querySelector('annotation');
    if (anyAnnotation && anyAnnotation.textContent && anyAnnotation.textContent.trim()) {
      return anyAnnotation.textContent.trim();
    }

    const text = (element.textContent || '').trim();
    if (text) return text;
    return '';
  }

  function cloneNodeWithPrefix(targetDoc, sourceNode) {
    if (sourceNode.nodeType === Node.TEXT_NODE) {
      return targetDoc.createTextNode(sourceNode.nodeValue || '');
    }

    if (sourceNode.nodeType !== Node.ELEMENT_NODE) {
      return targetDoc.importNode(sourceNode, true);
    }

    const sourceElement = sourceNode;
    const namespaceUri = sourceElement.namespaceURI;
    const localName = sourceElement.localName;

    const isMathMl = namespaceUri === MATHML_NS || namespaceUri == null;
    const qualifiedName = isMathMl ? `mml:${localName}` : sourceElement.tagName;

    const element = isMathMl
      ? targetDoc.createElementNS(MATHML_NS, qualifiedName)
      : targetDoc.createElement(qualifiedName);

    Array.from(sourceElement.attributes).forEach((attr) => {
      if (attr.name.startsWith('xmlns')) return;
      if (attr.name === 'class' || attr.name === 'style') return;
      element.setAttribute(attr.name, attr.value);
    });

    Array.from(sourceElement.childNodes).forEach((child) => {
      element.appendChild(cloneNodeWithPrefix(targetDoc, child));
    });

    return element;
  }

  function createWordMathML(mathElement, latexFallback) {
    if (!mathElement) {
      return `<mml:math xmlns:mml="${MATHML_NS}"><mml:mtext>${escapeXml(
        latexFallback || '',
      )}</mml:mtext></mml:math>`;
    }

    const doc = document.implementation.createDocument(MATHML_NS, 'mml:math', null);
    const root = doc.documentElement;

    Array.from(mathElement.attributes).forEach((attr) => {
      if (attr.name.startsWith('xmlns')) return;
      if (attr.name === 'class' || attr.name === 'style') return;
      root.setAttribute(attr.name, attr.value);
    });

    const semantics = mathElement.querySelector('semantics');
    const sourceRoot = semantics && semantics.firstElementChild ? semantics.firstElementChild : null;

    const children = sourceRoot ? Array.from(sourceRoot.childNodes) : Array.from(mathElement.childNodes);

    children.forEach((child) => {
      const node = cloneNodeWithPrefix(doc, child);
      root.appendChild(node);
    });

    return new XMLSerializer().serializeToString(root);
  }

  function wrapMathMLHtml(mathml) {
    return [
      `<html xmlns:mml="${MATHML_NS}">`,
      '<head><meta charset="utf-8"></head>',
      '<body><!--StartFragment-->',
      mathml,
      '<!--EndFragment--></body></html>',
    ].join('');
  }

  function escapeXml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function copyLegacy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (_) {}
    textarea.remove();
    return ok;
  }

  async function copyLatex(target) {
    const latex = extractLatex(target);
    if (!latex) {
      core.utils.toast('未找到可复制的 LaTeX 内容', 'warn');
      return;
    }

    const displayMode = target.closest('.math-block') != null;
    const wrapped = displayMode ? `$$${latex}$$` : `$${latex}$`;

    const ok = await core.utils.copyText(wrapped);
    core.utils.toast(ok ? '已复制 LaTeX' : '复制失败', ok ? 'success' : 'error');
  }

  async function copyMathML(target) {
    const latex = extractLatex(target);
    const math = target.querySelector('math');
    const mathml = createWordMathML(math, latex);
    const html = wrapMathMLHtml(mathml);

    // 优先写入 text/html + application/mathml+xml，兼容 Word。
    if (navigator.clipboard && navigator.clipboard.write) {
      try {
        const payload = {
          'text/plain': new Blob([mathml], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
          'application/mathml+xml': new Blob([mathml], { type: 'application/mathml+xml' }),
        };
        await navigator.clipboard.write([new ClipboardItem(payload)]);
        core.utils.toast('已复制 MathML（Word 兼容）', 'success');
        return;
      } catch (error) {
        console.warn('[AISB Formula] Clipboard.write 失败，回退文本复制：', error);
      }
    }

    // 回退：仅复制 MathML 文本。
    const ok = await core.utils.copyText(mathml);
    if (!ok) {
      const legacy = copyLegacy(mathml);
      core.utils.toast(legacy ? '已复制 MathML' : '复制失败', legacy ? 'success' : 'error');
      return;
    }
    core.utils.toast('已复制 MathML', 'success');
  }

  function positionToolbar(target) {
    const toolbar = state.toolbar;
    if (!toolbar || !target) return;

    const rect = target.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();

    let left = rect.right - toolbarRect.width;
    let top = rect.top - toolbarRect.height - 6;

    if (left < 8) left = 8;
    if (left + toolbarRect.width > window.innerWidth - 8) {
      left = window.innerWidth - toolbarRect.width - 8;
    }

    if (top < 8) {
      top = rect.bottom + 6;
    }

    toolbar.style.left = `${left}px`;
    toolbar.style.top = `${top}px`;
  }

  function showToolbar(target) {
    if (!state.toolbar) return;

    state.target = target;
    clearHideTimer();

    state.toolbar.style.display = 'flex';
    positionToolbar(target);
  }

  function createToolbar() {
    if (state.toolbar && document.body.contains(state.toolbar)) {
      return state.toolbar;
    }

    const toolbar = document.createElement('div');
    toolbar.id = TOOLBAR_ID;

    const latexBtn = document.createElement('button');
    latexBtn.type = 'button';
    latexBtn.className = 'aisb-formula-btn';
    latexBtn.textContent = '复制 LaTeX';
    latexBtn.addEventListener('click', () => {
      if (!state.target) return;
      void copyLatex(state.target);
    });

    const mathmlBtn = document.createElement('button');
    mathmlBtn.type = 'button';
    mathmlBtn.className = 'aisb-formula-btn';
    mathmlBtn.textContent = '复制 MathML';
    mathmlBtn.addEventListener('click', () => {
      if (!state.target) return;
      void copyMathML(state.target);
    });

    toolbar.appendChild(latexBtn);
    toolbar.appendChild(mathmlBtn);

    toolbar.addEventListener('mouseenter', clearHideTimer);
    toolbar.addEventListener('mouseleave', scheduleHideToolbar);

    document.body.appendChild(toolbar);
    state.toolbar = toolbar;
    return toolbar;
  }

  function bindHoverEvents() {
    document.addEventListener(
      'mousemove',
      (event) => {
        const target = findMathElement(event.target);
        if (!target) {
          scheduleHideToolbar();
          return;
        }

        createToolbar();
        showToolbar(target);
      },
      true,
    );

    window.addEventListener('scroll', () => {
      if (state.toolbar && state.toolbar.style.display !== 'none' && state.target) {
        positionToolbar(state.target);
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (state.toolbar && state.toolbar.style.display !== 'none' && state.target) {
        positionToolbar(state.target);
      }
    });
  }

  function bootstrap() {
    ensureStyles();
    createToolbar();
    bindHoverEvents();

    core.module.register('formula', {
      copyLatexFromCurrent: () => {
        if (!state.target) return false;
        void copyLatex(state.target);
        return true;
      },
      copyMathMLFromCurrent: () => {
        if (!state.target) return false;
        void copyMathML(state.target);
        return true;
      },
    });
  }

  bootstrap();
})();
