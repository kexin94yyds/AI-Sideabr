(function () {
  'use strict';

  if (window.__AISB_GEMINI_MARKDOWN_PATCHER_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_MARKDOWN_PATCHER_LOADED__ = true;

  const core = window.__AISB_GEMINI__;
  if (!core) {
    console.error('[AISB MarkdownPatcher] 缺少 gemini-common.js。');
    return;
  }

  function shouldSkipTextNode(node) {
    const parent = node.parentElement;
    if (!parent) return false;

    const skipTags = ['CODE', 'PRE', 'MATH-BLOCK', 'MATH-INLINE', 'SCRIPT', 'STYLE'];
    if (skipTags.includes(parent.tagName)) return true;

    if (
      parent.closest('code') ||
      parent.closest('pre') ||
      parent.closest('code-block') ||
      parent.closest('.math-block') ||
      parent.closest('.math-inline')
    ) {
      return true;
    }

    return false;
  }

  // 修复同一文本节点中的 **bold**。
  function fixInlineBold(node) {
    const text = node.textContent || '';
    if (!text.includes('**')) return null;

    const matches = Array.from(text.matchAll(/\*\*([^\s].*?[^\s]|[^\s])\*\*/g));
    if (!matches.length) return null;

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    let trailingTextNode = null;

    for (const match of matches) {
      const start = match.index;
      const end = start + match[0].length;
      const content = match[1];

      if (start > cursor) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, start)));
      }

      const strong = document.createElement('strong');
      strong.textContent = content;
      fragment.appendChild(strong);

      cursor = end;
    }

    if (cursor < text.length) {
      trailingTextNode = document.createTextNode(text.slice(cursor));
      fragment.appendChild(trailingTextNode);
    }

    if (node.parentNode) {
      node.parentNode.replaceChild(fragment, node);
    }

    return trailingTextNode;
  }

  // 修复被引用块/标记节点打断的 ** ... **。
  function fixSplitBold(node) {
    const startText = node.textContent || '';
    const startIdx = startText.lastIndexOf('**');
    if (startIdx < 0) return;

    const middle = node.nextSibling;
    if (!middle || middle.nodeType !== Node.ELEMENT_NODE) return;

    const middleElement = middle;
    const hasInjectedMarker =
      middleElement.hasAttribute('data-path-to-node') ||
      middleElement.matches('sup, cite, mark, source-list, .citation, .source-chip');
    if (!hasInjectedMarker) return;

    const endNode = middle.nextSibling;
    if (!endNode || endNode.nodeType !== Node.TEXT_NODE) return;

    const endText = endNode.textContent || '';
    const endIdx = endText.indexOf('**');
    if (endIdx < 0) return;

    const strong = document.createElement('strong');
    const before = startText.substring(startIdx + 2);
    const after = endText.substring(0, endIdx);

    if (before) strong.appendChild(document.createTextNode(before));
    strong.appendChild(middleElement);
    if (after) strong.appendChild(document.createTextNode(after));

    if (node.parentNode) {
      node.parentNode.insertBefore(strong, endNode);
      node.textContent = startText.substring(0, startIdx);
      endNode.textContent = endText.substring(endIdx + 2);
    }
  }

  function fixBrokenBoldTags(root) {
    if (!root || !(root instanceof HTMLElement)) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let node = null;

    while ((node = walker.nextNode())) {
      if (!(node instanceof Text)) continue;
      if (!node.textContent || !node.textContent.includes('**')) continue;
      if (shouldSkipTextNode(node)) continue;
      textNodes.push(node);
    }

    for (const textNode of textNodes) {
      if (!textNode.isConnected) continue;
      let candidate = textNode;

      const trailing = fixInlineBold(candidate);
      if (trailing instanceof Text) {
        candidate = trailing;
      } else if (trailing === null) {
        candidate = textNode;
      } else {
        continue;
      }

      if (candidate.isConnected) {
        fixSplitBold(candidate);
      }
    }
  }

  function bootstrap() {
    // 首次扫描。
    fixBrokenBoldTags(document.body);

    const observer = new MutationObserver((mutations) => {
      const nodes = [];
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            nodes.push(node);
          }
        });
      }
      nodes.forEach((node) => fixBrokenBoldTags(node));
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    core.module.register('markdownPatcher', {
      fixNow: () => fixBrokenBoldTags(document.body),
      stop: () => observer.disconnect(),
    });
  }

  bootstrap();
})();
