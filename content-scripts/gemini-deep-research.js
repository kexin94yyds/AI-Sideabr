(function () {
  'use strict';

  if (window.__AISB_GEMINI_DEEP_RESEARCH_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_DEEP_RESEARCH_LOADED__ = true;

  const core = window.__AISB_GEMINI__;
  if (!core) {
    console.error('[AISB DeepResearch] 缺少 gemini-common.js。');
    return;
  }

  const STYLE_ID = 'aisb-gemini-deep-research-style';
  const FLOAT_ID = 'aisb-gemini-deep-research-float';

  const state = {
    observer: null,
    menuObserver: null,
    routeUnsub: null,
    mounted: false,
    sidebarTimer: null,
  };

  function ensureStyles() {
    core.dom.ensureStyle(
      STYLE_ID,
      `
      #${FLOAT_ID} {
        position: relative;
        z-index: 1;
        width: 100%;
        margin: 8px 0 12px;
        border-radius: 12px;
        border: 1px solid rgba(229, 231, 235, 0.9);
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(12px);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.16);
        padding: 7px;
        display: none;
        gap: 7px;
        flex-wrap: wrap;
        max-width: 100%;
      }
      #${FLOAT_ID}.show {
        display: flex;
        animation: aisb-gm-fade-up 200ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      #${FLOAT_ID} .aisb-dr-btn {
        flex: 1 1 calc(50% - 7px);
        min-width: 132px;
        border: 1px solid rgba(229, 231, 235, 0.9);
        border-radius: 8px;
        background: #ffffff;
        color: #6b7280;
        font-size: 12px;
        font-weight: 600;
        line-height: 1;
        padding: 7px 10px;
        cursor: pointer;
      }
      #${FLOAT_ID} .aisb-dr-btn:hover {
        background: rgba(0, 0, 0, 0.06);
        color: #1f2937;
      }
      .aisb-dr-menu-item {
        display: block;
        width: 100%;
        text-align: left;
        border: none;
        border-radius: 6px;
        background: transparent;
        padding: 8px 10px;
        color: #1f2937;
        font-size: 13px;
        cursor: pointer;
      }
      .aisb-dr-menu-item:hover {
        background: rgba(0, 0, 0, 0.06);
      }
      `,
    );
  }

  function mountBarInSidebar(bar) {
    if (!(bar instanceof HTMLElement)) return false;
    return core.dom.mountInGeminiSidebar(bar, { beforeRecent: true });
  }

  function scheduleSidebarRemount(delay) {
    if (state.sidebarTimer) {
      clearTimeout(state.sidebarTimer);
      state.sidebarTimer = null;
    }
    state.sidebarTimer = setTimeout(() => {
      state.sidebarTimer = null;
      const bar = document.getElementById(FLOAT_ID);
      if (bar) {
        mountBarInSidebar(bar);
      }
    }, Number(delay) > 0 ? Number(delay) : 220);
  }

  function isDeepResearchConversation() {
    return Boolean(document.querySelector('deep-research-immersive-panel'));
  }

  function getConversationTitle() {
    const selectors = ['h1', 'title', '[data-test-id="conversation-title"]'];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const text = String(el.textContent || '').trim();
      if (!text) continue;
      if (text === 'Gemini' || text === 'Google Gemini') continue;
      return text;
    }
    return 'Deep Research Conversation';
  }

  function formatTimestamp(value) {
    const date = value ? new Date(value) : new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function extractBrowseChips(browseListElement) {
    const chips = [];

    browseListElement
      .querySelectorAll('browse-web-chip a[data-test-id="browse-chip-link"], a[data-test-id="browse-chip-link"]')
      .forEach((chipEl) => {
        const url = chipEl.getAttribute('href') || '';
        const domainEl = chipEl.querySelector('[data-test-id="domain-name"]');
        const titleEl = chipEl.querySelector('[data-test-id="title"]');

        const domain = domainEl ? String(domainEl.textContent || '').trim() : '';
        const title = titleEl ? String(titleEl.textContent || '').trim() : '';

        if (url && domain) {
          chips.push({ url, domain, title });
        }
      });

    return chips;
  }

  function extractThinkingPanels() {
    const root = document.querySelector('deep-research-immersive-panel');
    if (!root) return null;

    const sections = [];
    const panels = root.querySelectorAll('thinking-panel');

    panels.forEach((panel) => {
      const items = [];

      panel.querySelectorAll('.item-container').forEach((container) => {
        const thought = container.querySelector('thought-item');
        if (thought) {
          const headerEl = thought.querySelector('.thought-header');
          const contentEl = thought.querySelector('.gds-body-m.gds-italic:not(.thought-header)');

          const header = headerEl ? String(headerEl.textContent || '').trim() : '';
          const content = contentEl ? String(contentEl.textContent || '').trim() : '';

          if (header || content) {
            items.push({
              type: 'thought',
              header,
              content,
            });
          }
        }

        const browseList = container.querySelector('browse-chip-list');
        if (browseList) {
          const chips = extractBrowseChips(browseList);
          if (chips.length) {
            items.push({
              type: 'browse-chips',
              chips,
            });
          }
        }
      });

      if (items.length) {
        sections.push({ items });
      }
    });

    if (!sections.length) {
      return null;
    }

    return {
      title: getConversationTitle(),
      exportedAt: new Date().toISOString(),
      sections,
    };
  }

  function formatThinkingMarkdown(content) {
    const lines = [];
    lines.push(`# ${content.title}`);
    lines.push('');
    lines.push(`**导出时间 / Exported At:** ${formatTimestamp(content.exportedAt)}`);
    lines.push(`**总思考阶段 / Total Phases:** ${content.sections.length}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    content.sections.forEach((section, index) => {
      lines.push(`## 思考阶段 ${index + 1} / Thinking Phase ${index + 1}`);
      lines.push('');

      section.items.forEach((item) => {
        if (item.type === 'thought') {
          if (item.header) {
            lines.push(`### ${item.header}`);
            lines.push('');
          }
          if (item.content) {
            lines.push(item.content);
            lines.push('');
          }
        }

        if (item.type === 'browse-chips') {
          lines.push('#### 研究网站 / Researched Websites');
          lines.push('');
          item.chips.forEach((chip) => {
            const suffix = chip.title ? ` - ${chip.title}` : '';
            lines.push(`- [${chip.domain}](${chip.url})${suffix}`);
          });
          lines.push('');
        }
      });

      if (index !== content.sections.length - 1) {
        lines.push('---');
        lines.push('');
      }
    });

    lines.push('---');
    lines.push('');
    lines.push('*Generated by AI Sidebar SR8*');

    return lines.join('\n').trim() + '\n';
  }

  function downloadThinkingMarkdown() {
    const content = extractThinkingPanels();
    if (!content) {
      core.utils.toast('未检测到 Thinking 内容', 'warn');
      return;
    }

    const markdown = formatThinkingMarkdown(content);
    const stamp = formatTimestamp(new Date()).replace(/[-: ]/g, '').slice(0, 14);
    core.utils.downloadText(`deep-research-thinking-${stamp}.md`, markdown, 'text/markdown;charset=utf-8');
    core.utils.toast('Thinking 内容已导出', 'success');
  }

  function findReportRoot() {
    const panel = document.querySelector('deep-research-immersive-panel');
    if (!panel) return null;

    const candidates = Array.from(
      panel.querySelectorAll('.markdown, .markdown-main-panel, message-content'),
    ).filter((el) => !el.closest('thinking-panel'));

    let best = null;
    let bestScore = 0;

    candidates.forEach((el) => {
      const score = String(el.textContent || '').trim().length;
      if (score > bestScore) {
        best = el;
        bestScore = score;
      }
    });

    return best;
  }

  function exportReportJson() {
    const root = findReportRoot();
    if (!root) {
      core.utils.toast('未检测到 Deep Research 报告区域', 'warn');
      return;
    }

    const payload = {
      format: 'gemini-voyager.deep-research.report.v1',
      exportedAt: new Date().toISOString(),
      title: getConversationTitle(),
      url: location.href,
      text: String(root.innerText || '').trim(),
      html: root.innerHTML || '',
    };

    core.utils.downloadText(
      `deep-research-report-${Date.now()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json',
    );
    core.utils.toast('报告 JSON 已导出', 'success');
  }

  function exportReportPdf() {
    const root = findReportRoot();
    if (!root) {
      core.utils.toast('未检测到 Deep Research 报告区域', 'warn');
      return;
    }

    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      core.utils.toast('浏览器阻止了弹窗，请允许后重试', 'error');
      return;
    }

    const title = getConversationTitle();
    win.document.open();
    win.document.write(`
      <!doctype html>
      <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 26px; color: #202124; line-height: 1.65; }
          img { max-width: 100%; border-radius: 8px; }
          h1,h2,h3 { page-break-after: avoid; }
          pre { background: #f6f8fa; padding: 10px; border-radius: 8px; overflow: auto; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>导出时间: ${formatTimestamp(new Date())}</p>
        <hr/>
        ${root.innerHTML || ''}
      </body>
      </html>
    `);
    win.document.close();

    const onLoad = () => {
      win.focus();
      win.print();
    };

    if (win.document.readyState === 'complete') {
      onLoad();
    } else {
      win.addEventListener('load', onLoad, { once: true });
    }

    core.utils.toast('Deep Research 报告 PDF 已打开打印窗口', 'success');
  }

  function ensureFloatBar() {
    let bar = document.getElementById(FLOAT_ID);
    if (!bar) {
      bar = document.createElement('div');
      bar.id = FLOAT_ID;

      const thinkingBtn = document.createElement('button');
      thinkingBtn.type = 'button';
      thinkingBtn.className = 'aisb-dr-btn';
      thinkingBtn.textContent = '导出 Thinking(MD)';
      thinkingBtn.addEventListener('click', downloadThinkingMarkdown);

      const reportJsonBtn = document.createElement('button');
      reportJsonBtn.type = 'button';
      reportJsonBtn.className = 'aisb-dr-btn';
      reportJsonBtn.textContent = '导出报告(JSON)';
      reportJsonBtn.addEventListener('click', exportReportJson);

      const reportPdfBtn = document.createElement('button');
      reportPdfBtn.type = 'button';
      reportPdfBtn.className = 'aisb-dr-btn';
      reportPdfBtn.textContent = '导出报告(PDF)';
      reportPdfBtn.addEventListener('click', exportReportPdf);

      bar.appendChild(thinkingBtn);
      bar.appendChild(reportJsonBtn);
      bar.appendChild(reportPdfBtn);
    }

    mountBarInSidebar(bar);

    bar.classList.toggle('show', isDeepResearchConversation());
    return bar;
  }

  function injectMenuItems(menuPanel) {
    if (!menuPanel || !(menuPanel instanceof HTMLElement)) return;
    if (!isDeepResearchConversation()) return;

    if (menuPanel.querySelector('[data-aisb-dr-menu="1"]')) return;

    const thinkingItem = document.createElement('button');
    thinkingItem.type = 'button';
    thinkingItem.className = 'aisb-dr-menu-item';
    thinkingItem.dataset.aisbDrMenu = '1';
    thinkingItem.textContent = '下载 Thinking 内容 (MD)';
    thinkingItem.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      downloadThinkingMarkdown();
    });

    const reportItem = document.createElement('button');
    reportItem.type = 'button';
    reportItem.className = 'aisb-dr-menu-item';
    reportItem.dataset.aisbDrMenu = '1';
    reportItem.textContent = '导出 Deep Research 报告 (JSON)';
    reportItem.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      exportReportJson();
    });

    menuPanel.appendChild(thinkingItem);
    menuPanel.appendChild(reportItem);
  }

  function observeMenuOpening() {
    if (state.menuObserver) {
      state.menuObserver.disconnect();
      state.menuObserver = null;
    }

    state.menuObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;

          const panels = [];
          if (node.matches('.mat-mdc-menu-panel[role="menu"]')) {
            panels.push(node);
          }

          node
            .querySelectorAll('.mat-mdc-menu-panel[role="menu"]')
            .forEach((panel) => panels.push(panel));

          panels.forEach((panel) => {
            setTimeout(() => injectMenuItems(panel), 30);
          });
        });
      }
    });

    state.menuObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function observePanel() {
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    state.observer = new MutationObserver(() => {
      ensureFloatBar();
    });

    state.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function start() {
    ensureStyles();
    ensureFloatBar();
    observePanel();
    observeMenuOpening();

    if (!state.routeUnsub) {
      state.routeUnsub = core.route.onChange(() => {
        ensureFloatBar();
        scheduleSidebarRemount(260);
      });
    }

    state.mounted = true;

    core.module.register('deepResearch', {
      extractThinkingPanels,
      exportThinkingMarkdown: downloadThinkingMarkdown,
      exportReportJson,
      exportReportPdf,
    });
  }

  start();
})();
