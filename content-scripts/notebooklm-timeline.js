(function () {
  'use strict';

  if (window.__AISB_NOTEBOOKLM_TIMELINE_LOADED__) return;
  if (!location.hostname.includes('notebooklm.google.com')) return;
  if (window.self !== window.top) return;
  window.__AISB_NOTEBOOKLM_TIMELINE_LOADED__ = true;

  const BAR_ID = 'aisb-nblm-timeline-bar';
  const STYLE_ID = 'aisb-nblm-timeline-style';

  const USER_SELECTORS = [
    'chat-message',
    '.chat-message',
    '[class*="chat-message"]',
    '[data-role="user"]',
    '.user-message',
    '.query-text',
    '.human-turn',
  ];

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BAR_ID} {
        position: fixed;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 14px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        z-index: 99998;
        padding: 6px 0;
        background: rgba(128,128,128,0.15);
        border-radius: 7px 0 0 7px;
        max-height: 60vh;
        overflow: hidden;
      }
      #${BAR_ID}:hover {
        width: 200px;
        background: var(--mat-sys-surface-container, #2a2a2a);
        box-shadow: -2px 0 8px rgba(0,0,0,0.2);
        overflow-y: auto;
        padding: 6px 4px;
      }
      .aisb-nblm-tl-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(128,128,128,0.5);
        flex-shrink: 0;
        cursor: pointer;
        transition: background 0.15s, transform 0.15s;
      }
      #${BAR_ID}:hover .aisb-nblm-tl-dot {
        display: none;
      }
      .aisb-nblm-tl-item {
        display: none;
        width: 100%;
        padding: 4px 6px;
        font-size: 11px;
        color: var(--mat-sys-on-surface, #e0e0e0);
        cursor: pointer;
        border-radius: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.4;
        transition: background 0.1s;
      }
      #${BAR_ID}:hover .aisb-nblm-tl-item {
        display: block;
      }
      .aisb-nblm-tl-item:hover {
        background: rgba(128,128,128,0.2);
      }
      .aisb-nblm-tl-item.user {
        color: var(--mat-sys-primary, #8ab4f8);
        font-weight: 500;
      }
      .aisb-nblm-tl-item.ai {
        color: var(--mat-sys-on-surface-variant, #aaa);
        padding-left: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  function findTurns() {
    const chatPanel = document.querySelector(
      'mat-tab-body.mat-mdc-tab-body-active, [role="tabpanel"]:not([hidden])'
    );
    const root = chatPanel || document;

    let turns = [];

    for (const sel of USER_SELECTORS) {
      try {
        const nodes = root.querySelectorAll(sel);
        if (nodes.length) {
          nodes.forEach((n) => turns.push({ node: n, type: 'user' }));
          break;
        }
      } catch (_) {}
    }

    if (turns.length > 1) {
      turns.sort((a, b) => {
        const pos = a.node.compareDocumentPosition(b.node);
        return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
    }

    return turns;
  }

  function truncate(text, max = 40) {
    const t = (text || '').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max) + '…' : t;
  }

  function buildBar(turns) {
    let bar = document.getElementById(BAR_ID);
    if (!bar) {
      bar = document.createElement('div');
      bar.id = BAR_ID;
      document.body.appendChild(bar);
    }
    bar.innerHTML = '';

    if (!turns.length) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'flex';

    turns.forEach(({ node, type }, idx) => {
      const dot = document.createElement('div');
      dot.className = 'aisb-nblm-tl-dot';
      dot.title = truncate(node.textContent);

      const item = document.createElement('div');
      item.className = `aisb-nblm-tl-item ${type}`;
      item.textContent = (type === 'user' ? '▶ ' : '  ') + truncate(node.textContent);
      item.title = node.textContent.trim();

      const onClick = () => {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      dot.addEventListener('click', onClick);
      item.addEventListener('click', onClick);

      bar.appendChild(dot);
      bar.appendChild(item);
    });
  }

  let rebuildTimer = null;
  let lastTurnCount = 0;

  function scheduleRebuild() {
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      rebuildTimer = null;
      const turns = findTurns();
      if (turns.length !== lastTurnCount) {
        lastTurnCount = turns.length;
        buildBar(turns);
      }
    }, 1500);
  }

  function init() {
    injectStyles();
    scheduleRebuild();

    const obs = new MutationObserver(scheduleRebuild);
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
