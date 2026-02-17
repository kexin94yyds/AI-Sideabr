// Robust URL + title reporter for provider iframes (ChatGPT, Gemini, etc.)
// Posts { type: 'ai-url-changed', href, title, origin } to the top window.

(function () {
  try {
    const dbg = (...args) => {
      try {
        if (localStorage.getItem('insidebar_debug') === '1' || localStorage.getItem('insidebar_debug_gemini') === '1') {
          console.log('[insidebar][url-sync]', ...args);
        }
      } catch (_) {}
    };

    // BFS across DOM + open shadow roots (helps with web components)
    const deepFind = (root, predicate, max = 2000) => {
      try {
        const q = [root];
        let seen = 0;
        while (q.length && seen < max) {
          const n = q.shift();
          seen++;
          if (!n) continue;
          try { if (predicate(n)) return n; } catch (_) {}
          try { if (n.shadowRoot) q.push(n.shadowRoot); } catch (_) {}
          try { if (n.children && n.children.length) q.push(...n.children); } catch (_) {}
        }
      } catch (_) {}
      return null;
    };

    // Gemini helpers
    const resolveGeminiHref = () => {
      try {
        if (location.origin !== 'https://gemini.google.com') return null;
        const anchor = deepFind(document, (el) => {
          if (!(el && el.tagName === 'A')) return false;
          const h = el.getAttribute('href') || '';
          if (!h) return false;
          const abs = h.startsWith('http') ? h : new URL(h, location.origin).href;
          return /^https:\/\/gemini\.google\.com\/app\//.test(abs) && abs !== 'https://gemini.google.com/app';
        });
        if (anchor) {
          const h = anchor.getAttribute('href');
          const abs = h && h.startsWith('http') ? h : (h ? new URL(h, location.origin).href : '');
          dbg('gemini.resolveHref.anchor', abs);
          return abs || null;
        }
        const share = deepFind(document, (n)=> n && (n.getAttribute && (n.getAttribute('data-clipboard-text') || n.getAttribute('data-share-url'))));
        if (share) {
          const v = share.getAttribute('data-clipboard-text') || share.getAttribute('data-share-url');
          if (v && /^https:\/\/gemini\.google\.com\/app\//.test(v)) return v;
        }
      } catch (_) {}
      return null;
    };
    const geminiIdFromUrl = (uStr) => {
      try {
        const u = new URL(uStr || location.href, location.origin);
        const m = u.pathname.match(/\/app\/(?:conversation\/)?([^\/?#]+)/);
        return m && m[1] ? m[1] : '';
      } catch (_) { return ''; }
    };
    const resolveGeminiTitle = () => {
      try {
        if (location.origin !== 'https://gemini.google.com') return null;
        const canonical = resolveGeminiHref() || location.href;
        const convId = geminiIdFromUrl(canonical);
        dbg('gemini.title.canonical', canonical, 'convId', convId);
        const notUseful = (t) => {
          if (!t) return true;
          const s = t.trim().toLowerCase();
          return (
            s.length === 0 ||
            s === 'recent' || s === 'gemini' || s === 'google gemini' ||
            s === 'conversation with gemini' ||
            s === 'new chat' || s === 'start a new chat' ||
            /^(新?聊天|新?对话|最近)$/.test(s)
          );
        };
        if (convId) {
          const link = deepFind(document, (el)=> el && el.tagName === 'A' && (el.getAttribute('href')||'').includes(`/app/${convId}`));
          if (link && link.textContent) {
            dbg('gemini.title.navMatch', (link.getAttribute && link.getAttribute('href')) || '', (link.textContent||'').trim());
            if (!notUseful(link.textContent)) return link.textContent.trim();
          }
        }

        // 1b) Some Gemini UIs render a non-anchor conversation title element
        // Example: <div class="conversation-title gds-label-l">学术论文修改与投稿指导</div>
        // Try within navigation first, then globally.
        const hasConvTitleClass = (el) => {
          try { return el && el.classList && Array.from(el.classList).some(c => /conversation-title/i.test(c)); } catch (_) { return false; }
        };
        // Search inside nav scope, prefer the ACTIVE item (selected/current)
        const navScope = deepFind(document, (el)=> el && (el.tagName==='NAV' || el.tagName==='ASIDE' || (el.getAttribute && el.getAttribute('role')==='navigation')));
        if (navScope) {
          const activeTitle = deepFind(navScope, (el)=> {
            if (!hasConvTitleClass(el) || !el.textContent || !el.textContent.trim()) return false;
            const container = el.closest('[aria-selected="true"], [aria-current="page"], [data-active="true"], [data-selected="true"], [class*="active"], [class*="selected"]');
            return !!container;
          });
          if (activeTitle && activeTitle.textContent) {
            const txt = activeTitle.textContent.trim();
            dbg('gemini.title.convTitleClass.nav.active', txt);
            if (!notUseful(txt)) return txt;
          }
          // Fallback: first conversation-title in nav
          const inNav = deepFind(navScope, (el)=> hasConvTitleClass(el) && el.textContent && el.textContent.trim().length > 0);
          if (inNav && inNav.textContent) {
            const txt = inNav.textContent.trim();
            dbg('gemini.title.convTitleClass.nav.first', txt);
            if (!notUseful(txt)) return txt;
          }
        }
        // Global search as a fallback
        const globalTitle = deepFind(document, (el)=> hasConvTitleClass(el) && el.textContent && el.textContent.trim().length > 0);
        if (globalTitle && globalTitle.textContent) {
          const txt = globalTitle.textContent.trim();
          dbg('gemini.title.convTitleClass.global', txt);
          if (!notUseful(txt)) return txt;
        }
        const selected = deepFind(document, (el)=> el && el.getAttribute && (el.getAttribute('aria-selected')==='true' || el.getAttribute('aria-current')==='page'));
        if (selected && selected.textContent) {
          dbg('gemini.title.selected', selected.tagName, (selected.textContent||'').trim());
          if (!notUseful(selected.textContent)) return selected.textContent.trim();
        }
        const header = deepFind(document, (el)=>{
          if (!el) return false;
          const role = el.getAttribute && el.getAttribute('role');
          const tag = (el.tagName||'').toLowerCase();
          if (tag === 'h1') return true;
          if (role === 'heading' && (el.getAttribute('aria-level')==='1' || el.getAttribute('aria-level')==='2')) return true;
          if (tag === 'h2' && el.closest && el.closest('header')) return true;
          return false;
        });
        if (header && header.textContent) {
          dbg('gemini.title.header', (header.textContent||'').trim());
          if (!notUseful(header.textContent)) return header.textContent.trim();
        }
        const og = document.querySelector('meta[property="og:title"], meta[name="og:title"]');
        if (og && og.content) {
          dbg('gemini.title.og', og.content.trim());
          if (!notUseful(og.content)) return og.content.trim();
        }

        // 5) Heuristic: first meaningful line in the main conversation area
        const roots = Array.from(document.querySelectorAll('main, [role="main"], body'));
        const goodText = (txt) => {
          if (!txt) return false;
          const t = txt.replace(/\s+/g, ' ').trim();
          if (t.length < 8) return false;
          if (t.length > 140) return false;
          if (notUseful(t)) return false;
          // avoid obvious boilerplate
          if (/^gemini\s+for\s+/i.test(t)) return false;
          return true;
        };
        for (const r of roots) {
          try {
            const walker = document.createTreeWalker(r, NodeFilter.SHOW_ELEMENT, null);
            let count = 0;
            while (walker.nextNode() && count < 800) {
              count++;
              const el = walker.currentNode;
              if (!el) continue;
              const tag = (el.tagName||'').toLowerCase();
              // skip nav/aside/button controls
              if (['nav','aside','button','svg','img','input','textarea','select','script','style'].includes(tag)) continue;
              // Prefer likely message containers
              if (el.getAttribute && (el.getAttribute('role') === 'listitem' || el.getAttribute('role') === 'article')) {
                const t = (el.textContent||'').trim();
                if (goodText(t)) { dbg('gemini.title.firstLine.listitem', t); return t; }
              }
              if (tag === 'p' || tag === 'li') {
                const t = (el.textContent||'').trim();
                if (goodText(t)) { dbg('gemini.title.firstLine.p', t); return t; }
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
      return null;
    };

    // ChatGPT helpers
    const chatgptIdFromUrl = (uStr) => {
      try {
        const u = new URL(uStr || location.href, location.origin);
        const m = u.pathname.match(/\/c\/([\w-]+)/i);
        return m && m[1] ? m[1] : (u.searchParams.get('conversationId') || '');
      } catch (_) { return ''; }
    };
    const resolveChatGPTTitle = () => {
      try {
        if (location.origin !== 'https://chatgpt.com') return null;
        const cid = chatgptIdFromUrl(location.href);
        const notUseful = (t) => !t || /^(new\s*chat|chatgpt)$/i.test(t.trim());
        if (cid) {
          const a = document.querySelector(`a[href*="/c/${cid}"]`);
          if (a && a.textContent && !notUseful(a.textContent)) return a.textContent.trim();
        }
        const head = document.querySelector('h1,[data-testid="conversation-title"], header h2');
        if (head && head.textContent && !notUseful(head.textContent)) return head.textContent.trim();
        const og = document.querySelector('meta[property="og:title"], meta[name="og:title"]');
        if (og && og.content && !notUseful(og.content)) return og.content.trim();
      } catch (_) {}
      return null;
    };

    // Perplexity helpers
    const resolvePerplexityHref = () => {
      try {
        if (!/\.perplexity\.ai$|^https:\/\/(www\.)?perplexity\.ai$/.test(location.hostname)) return null;
        // Prefer deep link under /search/<id>
        const a = deepFind(document, (el)=> el && el.tagName==='A' && /\/search\//.test(el.getAttribute('href')||''));
        if (a) {
          const h = a.getAttribute('href');
          return h.startsWith('http') ? h : new URL(h, location.origin).href;
        }
      } catch (_) {}
      return null;
    };
    const resolvePerplexityTitle = () => {
      try {
        if (!/\.perplexity\.ai$|^https:\/\/(www\.)?perplexity\.ai$/.test(location.hostname)) return null;
        const h1 = document.querySelector('h1,[data-testid="thread-title"],[data-qa="thread-title"]');
        if (h1 && h1.textContent && h1.textContent.trim()) return h1.textContent.trim();
        const og = document.querySelector('meta[property="og:title"], meta[name="og:title"]');
        if (og && og.content && og.content.trim()) return og.content.trim();
      } catch (_) {}
      return null;
    };

    // DeepSeek helpers
    const resolveDeepseekHref = () => {
      try {
        if (location.hostname !== 'chat.deepseek.com') return null;
        const a = deepFind(document, (el)=> el && el.tagName==='A' && /\/(sessions|s)\//.test(el.getAttribute('href')||''));
        if (a) {
          const h = a.getAttribute('href');
          return h.startsWith('http') ? h : new URL(h, location.origin).href;
        }
      } catch (_) {}
      return null;
    };
    const resolveDeepseekTitle = () => {
      try {
        if (location.hostname !== 'chat.deepseek.com') return null;
        const notUseful = (t) => {
          if (!t) return true;
          const s = t.trim().toLowerCase();
          return s.length === 0 || s === 'deepseek' || s === 'new chat' || s === 'start new chat' || s === 'chat';
        };

        // Prefer the selected item in a left navigation if present
        const navScope = deepFind(document, (el)=> el && (el.tagName==='NAV' || el.tagName==='ASIDE' || (el.getAttribute && el.getAttribute('role')==='navigation')));
        if (navScope) {
          // (a) selected/current item text
          const sel = deepFind(navScope, (el)=> el && el.getAttribute && (el.getAttribute('aria-current')==='page' || el.getAttribute('aria-selected')==='true' || /\bactive\b|\bselected\b/.test((el.className||''))) && el.textContent && el.textContent.trim());
          if (sel && sel.textContent && !notUseful(sel.textContent)) {
            const txt = sel.textContent.trim();
            dbg('deepseek.title.nav.selected', txt);
            return txt;
          }
          // (b) anchor for current session id
          const a = deepFind(navScope, (el)=> el && el.tagName==='A' && /\/(sessions|s)\//.test(el.getAttribute('href')||'') && el.textContent && el.textContent.trim());
          if (a && a.textContent && !notUseful(a.textContent)) {
            const txt = a.textContent.trim();
            dbg('deepseek.title.nav.anchor', (a.getAttribute && a.getAttribute('href'))||'', txt);
            return txt;
          }
          // (c) any element with a likely title class
          const hasLikelyTitleClass = (el) => {
            try {
              const names = Array.from(el.classList || []).map(c => c.toLowerCase());
              const hasTitle = names.some(c => /title/.test(c));
              const hasDomain = names.some(c => /(conv|conversation|session|chat|thread)/.test(c));
              return hasTitle && hasDomain;
            } catch (_) { return false; }
          };
          const tEl = deepFind(navScope, (el)=> hasLikelyTitleClass(el) && el.textContent && el.textContent.trim());
          if (tEl && tEl.textContent && !notUseful(tEl.textContent)) {
            const txt = tEl.textContent.trim();
            dbg('deepseek.title.nav.class', txt);
            return txt;
          }
        }

        // Page header
        const h = document.querySelector('h1, header h2, [data-testid="conversation-title"]');
        if (h && h.textContent && !notUseful(h.textContent)) {
          const txt = h.textContent.trim();
          dbg('deepseek.title.header', txt);
          return txt;
        }
        // OpenGraph title
        const og = document.querySelector('meta[property="og:title"], meta[name="og:title"]');
        if (og && og.content && !notUseful(og.content)) {
          const txt = og.content.trim();
          dbg('deepseek.title.og', txt);
          return txt;
        }
        // First meaningful line in main content as last resort
        const main = document.querySelector('main, [role="main"], body');
        if (main) {
          const good = (txt) => {
            if (!txt) return false;
            const t = txt.replace(/\s+/g,' ').trim();
            if (t.length < 4 || t.length > 140) return false; // allow shorter than Gemini for CJK
            if (notUseful(t)) return false;
            return true;
          };
          const p = deepFind(main, (el)=> {
            if (!el) return false;
            const tag = (el.tagName||'').toLowerCase();
            if (['nav','aside','button','svg','img','input','textarea','select','script','style'].includes(tag)) return false;
            return ((tag==='p' || tag==='li' || (el.getAttribute && (el.getAttribute('role')==='listitem' || el.getAttribute('role')==='article'))) && el.textContent && good(el.textContent));
          });
          if (p && p.textContent) {
            const txt = p.textContent.trim();
            dbg('deepseek.title.firstLine', txt);
            return txt;
          }
        }
      } catch (_) {}
      return null;
    };

    // NotebookLM helpers
    const resolveNotebookLMHref = () => {
      try {
        if (location.hostname !== 'notebooklm.google.com') return null;
        // Prefer links containing /project/ or /c/
        const a = deepFind(document, (el)=> el && el.tagName==='A' && /\/(project|c)\//.test(el.getAttribute('href')||''));
        if (a) {
          const h = a.getAttribute('href');
          return h.startsWith('http') ? h : new URL(h, location.origin).href;
        }
      } catch (_) {}
      return null;
    };
    const resolveNotebookLMTitle = () => {
      try {
        if (location.hostname !== 'notebooklm.google.com') return null;
        
        const notUseful = (t) => {
          if (!t) return true;
          const s = t.trim().toLowerCase();
          return s.length === 0 || s === 'notebooklm' || s === 'notebook' || s === 'untitled' || s === 'new notebook';
        };
        
        // Priority 1: Use deepFind to locate .title-label-inner anywhere in DOM (handles Angular shadow DOM)
        const titleInner = deepFind(document, (el) => {
          if (!el || !el.classList) return false;
          return Array.from(el.classList).some(c => c === 'title-label-inner');
        });
        if (titleInner && titleInner.textContent && !notUseful(titleInner.textContent)) {
          const title = titleInner.textContent.trim();
          dbg('notebooklm.title.titleInner', title);
          return title;
        }
        
        // Priority 2: Search for mat-title-large spans in title containers
        const matTitle = deepFind(document, (el) => {
          if (!el || el.tagName !== 'SPAN' || !el.classList) return false;
          const hasMatClass = Array.from(el.classList).some(c => /mat-title-large/i.test(c));
          if (!hasMatClass) return false;
          // Must be inside a title-related container
          const parent = el.parentElement;
          if (!parent) return false;
          const inTitle = parent.className && /title/i.test(parent.className);
          return inTitle && el.textContent && el.textContent.trim();
        });
        if (matTitle && matTitle.textContent && !notUseful(matTitle.textContent)) {
          const title = matTitle.textContent.trim();
          dbg('notebooklm.title.matTitle', title);
          return title;
        }
        
        // Priority 3: Search for editable-project-title custom element
        const editableTitle = deepFind(document, (el) => {
          if (!el) return false;
          const tag = (el.tagName || '').toLowerCase();
          return tag === 'editable-project-title' && el.textContent && el.textContent.trim();
        });
        if (editableTitle && editableTitle.textContent && !notUseful(editableTitle.textContent)) {
          const title = editableTitle.textContent.trim();
          dbg('notebooklm.title.editableElement', title);
          return title;
        }
        
        // Priority 4: Look for input.title-input with value
        const titleInput = deepFind(document, (el) => {
          if (!el || el.tagName !== 'INPUT' || !el.classList) return false;
          return Array.from(el.classList).some(c => /title-input/i.test(c)) && el.value && el.value.trim();
        });
        if (titleInput && titleInput.value && !notUseful(titleInput.value)) {
          const title = titleInput.value.trim();
          dbg('notebooklm.title.input', title);
          return title;
        }
        
        // Priority 5: Standard heading elements
        const h = document.querySelector('h1, header h2, [role="heading"][aria-level="1"], [role="heading"][aria-level="2"]');
        if (h && h.textContent && !notUseful(h.textContent)) {
          const title = h.textContent.trim();
          dbg('notebooklm.title.heading', title);
          return title;
        }
        
        // Priority 6: OpenGraph meta tag
        const og = document.querySelector('meta[property="og:title"], meta[name="og:title"]');
        if (og && og.content && !notUseful(og.content)) {
          dbg('notebooklm.title.og', og.content.trim());
          return og.content.trim();
        }
      } catch (_) {}
      return null;
    };

    // Google Search helpers (provider 'google')
    const resolveGoogleTitle = () => {
      try {
        if (location.hostname !== 'www.google.com') return null;
        const notUseful = (t) => !t || /^google$/i.test(String(t).trim());
        // 1) Input box value (name=q)
        const qInput = document.querySelector('input[name="q"]');
        if (qInput && qInput.value && !notUseful(qInput.value)) return qInput.value.trim();
        // 2) URL param q
        const qp = new URL(location.href).searchParams.get('q');
        if (qp && !notUseful(qp)) return qp.trim();
        // 3) h1 header if present
        const h1 = document.querySelector('h1');
        if (h1 && h1.textContent && !notUseful(h1.textContent)) return h1.textContent.trim();
        // 4) og:title
        const og = document.querySelector('meta[property="og:title"], meta[name="og:title"]');
        if (og && og.content && !notUseful(og.content)) return og.content.trim();
      } catch (_) {}
      return null;
    };

    // Sender
    let lastSent = '';
    let timer = null;
    const send = (immediate = false, reason = 'tick') => {
      const maybeGemini = resolveGeminiHref();
      const maybePplx = resolvePerplexityHref();
      const maybeDeep = resolveDeepseekHref();
      const maybeLM = resolveNotebookLMHref();
      const hrefNow = String(maybeGemini || maybePplx || maybeDeep || maybeLM || location.href);
      const title = String(
        resolveChatGPTTitle() ||
        resolveGeminiTitle() ||
        resolvePerplexityTitle() ||
        resolveDeepseekTitle() ||
        resolveNotebookLMTitle() ||
        resolveGoogleTitle() ||
        document.title || ''
      );
      const payload = { type: 'ai-url-changed', href: hrefNow, title, origin: String(location.origin) };
      const toSend = JSON.stringify(payload);
      const doPost = () => {
        try {
          if (window.top) window.top.postMessage(payload, '*');
          else if (window.parent) window.parent.postMessage(payload, '*');
          lastSent = toSend;
          dbg('post', payload, 'reason:', reason);
        } catch (_) {}
      };
      if (immediate) return doPost();
      if (toSend === lastSent) return;
      clearTimeout(timer);
      timer = setTimeout(doPost, 100);
    };

    // Intercept Tab inside embedded provider frame to cycle providers in side panel
    try {
      // Only when this frame is embedded (running inside the side panel iframe)
      if (window.top && window.top !== window) {
        window.addEventListener('keydown', (e) => {
          try {
            if (e.key !== 'Tab') return;
            // Always capture; optional future: allow pass-through via modifier
            e.preventDefault();
            e.stopPropagation();
            const dir = e.shiftKey ? 'prev' : 'next';
            const payload = { type: 'ai-tab-cycle', dir };
            try { window.top.postMessage(payload, '*'); } catch (_) {}
          } catch (_) {}
        }, true);
      }
    } catch (_) {}


    // Initial emit
    send(true, 'init');

    // Hook History API and typical navigation events
    const wrapHistory = (method) => {
      const orig = history[method];
      if (typeof orig !== 'function') return;
      history[method] = function () {
        const ret = orig.apply(this, arguments);
        try { window.dispatchEvent(new Event('locationchange')); } catch (_) {}
        send(false, method);
        return ret;
      };
    };
    wrapHistory('pushState');
    wrapHistory('replaceState');
    window.addEventListener('popstate', () => send(false, 'popstate'));
    window.addEventListener('hashchange', () => send(false, 'hashchange'));
    window.addEventListener('locationchange', () => send(false, 'locationchange'));

    // Title mutation observer
    try {
      const titleEl = document.querySelector('title');
      if (titleEl && window.MutationObserver) {
        const mo = new MutationObserver(() => send(false, 'title-mutation'));
        mo.observe(titleEl, { subtree: true, characterData: true, childList: true });
      }
    } catch (_) {}

    // Provider-specific DOM observers
    try {
      if (window.MutationObserver && (location.origin === 'https://gemini.google.com' || location.origin === 'https://chatgpt.com' || location.origin === 'https://chat.deepseek.com')) {
        const root = document.querySelector('main,[role="main"],#app,body');
        if (root) {
          const moDom = new MutationObserver(() => send(false, 'dom-mutation'));
          moDom.observe(root, { childList: true, subtree: true, attributes: false });
        }
      }
    } catch (_) {}

    // NotebookLM-specific title observer (watches for changes in project title)
    try {
      if (window.MutationObserver && location.origin === 'https://notebooklm.google.com') {
        // Wait for DOM to be ready, then find and observe title elements
        const observeNotebookLMTitle = () => {
          const titleInner = deepFind(document, (el) => {
            if (!el || !el.classList) return false;
            return Array.from(el.classList).some(c => c === 'title-label-inner');
          });
          if (titleInner) {
            const moTitle = new MutationObserver(() => send(false, 'notebooklm-title-change'));
            moTitle.observe(titleInner, { subtree: true, characterData: true, childList: true });
            dbg('notebooklm: observing title-label-inner for changes');
            return true;
          }
          return false;
        };
        // Try immediately
        if (!observeNotebookLMTitle()) {
          // If not found, wait for DOM to load and retry
          setTimeout(() => {
            if (!observeNotebookLMTitle()) {
              // Last attempt after longer delay (Angular app init)
              setTimeout(observeNotebookLMTitle, 2000);
            }
          }, 500);
        }
        // Also observe main container for when title element is added dynamically
        const mainContainer = document.querySelector('body');
        if (mainContainer) {
          const moContainer = new MutationObserver(() => {
            observeNotebookLMTitle(); // Re-attempt to find and observe title
            send(false, 'notebooklm-dom-mutation');
          });
          moContainer.observe(mainContainer, { childList: true, subtree: true });
        }
      }
    } catch (_) {}

    // Optional request-response interface for explicit polling
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request && request.action === 'REQUEST_TAB_INFO') {
        try {
          send(true, 'request');
          sendResponse({ title: document.title || '', url: location.href });
        } catch (_) { sendResponse({ title: document.title || '', url: location.href }); }
      }
    });
  } catch (_) {}
})();

// ============== 页面内搜索功能 ==============
(function initContentSearch() {
  let currentSearchTerm = '';
  let currentIndex = 0;
  let totalMatches = 0;
  let highlightedElements = [];
  
  // 监听来自sidebar的搜索请求
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'AI_SIDEBAR_SEARCH') {
      const { action, term } = event.data;
      
      if (action === 'findNext' || action === 'findPrevious') {
        performSearch(term, action === 'findPrevious');
      } else if (action === 'clear') {
        clearHighlights();
      }
    }
  });
  
  // 执行搜索
  function performSearch(term, backwards = false) {
    // 如果是新的搜索词，重新高亮
    if (term !== currentSearchTerm) {
      clearHighlights();
      currentSearchTerm = term;
      
      if (term) {
        highlightMatches(term);
      }
    }
    
    // 如果没有匹配项
    if (totalMatches === 0) {
      sendSearchResult(false, 0, 0);
      return;
    }
    
    // 导航到下一个/上一个匹配项
    if (backwards) {
      currentIndex--;
      if (currentIndex < 0) currentIndex = totalMatches - 1;
    } else {
      currentIndex++;
      if (currentIndex >= totalMatches) currentIndex = 0;
    }
    
    // 滚动到当前匹配项
    scrollToMatch(currentIndex);
    
    // 发送结果
    sendSearchResult(true, totalMatches, currentIndex + 1);
  }
  
  // 高亮所有匹配项
  function highlightMatches(term) {
    if (!term) return;
    
    const searchRegex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // 跳过脚本、样式等元素
          if (node.parentElement) {
            const tagName = node.parentElement.tagName.toUpperCase();
            if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT'].includes(tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
          }
          // 检查是否包含搜索词
          if (searchRegex.test(node.textContent)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    const matchNodes = [];
    let node;
    
    while (node = walker.nextNode()) {
      matchNodes.push(node);
    }
    
    // 高亮所有匹配的文本节点
    matchNodes.forEach((textNode) => {
      const text = textNode.textContent;
      const matches = [...text.matchAll(searchRegex)];
      
      if (matches.length > 0) {
        const parent = textNode.parentNode;
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        
        matches.forEach((match) => {
          const matchIndex = match.index;
          
          // 添加匹配前的文本
          if (matchIndex > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, matchIndex)));
          }
          
          // 创建高亮元素
          const highlight = document.createElement('mark');
          highlight.textContent = match[0];
          highlight.className = 'ai-sidebar-search-highlight';
          highlight.style.cssText = 'background-color: #ffeb3b; color: #000; padding: 0; margin: 0;';
          fragment.appendChild(highlight);
          highlightedElements.push(highlight);
          
          lastIndex = matchIndex + match[0].length;
        });
        
        // 添加匹配后的文本
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        
        parent.replaceChild(fragment, textNode);
      }
    });
    
    totalMatches = highlightedElements.length;
    
    if (totalMatches > 0) {
      currentIndex = 0;
      highlightCurrentMatch();
      sendSearchResult(true, totalMatches, currentIndex + 1);
    } else {
      sendSearchResult(false, 0, 0);
    }
  }
  
  // 高亮当前匹配项
  function highlightCurrentMatch() {
    // 清除之前的当前高亮
    highlightedElements.forEach((el, idx) => {
      if (idx === currentIndex) {
        el.style.cssText = 'background-color: #ff9800; color: #000; padding: 0; margin: 0; outline: 2px solid #f57c00;';
      } else {
        el.style.cssText = 'background-color: #ffeb3b; color: #000; padding: 0; margin: 0;';
      }
    });
  }
  
  // 滚动到匹配项
  function scrollToMatch(index) {
    if (index >= 0 && index < highlightedElements.length) {
      const element = highlightedElements[index];
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightCurrentMatch();
    }
  }
  
  // 清除高亮
  function clearHighlights() {
    highlightedElements.forEach(el => {
      try {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent), el);
          parent.normalize();
        }
      } catch (_) {}
    });
    highlightedElements = [];
    totalMatches = 0;
    currentIndex = 0;
    currentSearchTerm = '';
    
    // 清除window.find的选择
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }
  
  // 发送搜索结果到sidebar
  function sendSearchResult(found, total, current) {
    window.parent.postMessage({
      type: 'AI_SIDEBAR_SEARCH_RESULT',
      found: found,
      total: total,
      current: current
    }, '*');
  }
})();

// ============== 从侧边栏注入提示文本 ==============
(function initPromptInjection() {
  function isVisible(el) {
    try {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    } catch (_) { return false; }
  }
  function candidateScore(el) {
    try {
      const r = el.getBoundingClientRect();
      // Prefer elements near bottom and wider
      const vpH = window.innerHeight || 800;
      const bottomBias = Math.max(0, r.top) / Math.max(1, vpH);
      const size = Math.min(r.width * r.height, 1e6);
      const role = (el.getAttribute && (el.getAttribute('role')||'')).toLowerCase();
      const isTextRole = role === 'textbox' || role === 'combobox';
      const tag = (el.tagName||'').toLowerCase();
      const tagScore = (tag === 'textarea') ? 2 : (isTextRole ? 1.5 : 1);
      return size * (0.5 + bottomBias) * tagScore;
    } catch (_) { return 0; }
  }
  function findPromptElement() {
    try {
      const els = [];
      // Common inputs
      els.push(...document.querySelectorAll('textarea'));
      els.push(...document.querySelectorAll('div[contenteditable="true"]'));
      els.push(...document.querySelectorAll('[role="textbox"], [aria-label*="prompt" i], [data-testid*="prompt" i], [data-testid*="textbox" i]'));
      // Filter visible and enabled
      const cand = els.filter((el)=> isVisible(el) && !el.disabled);
      if (!cand.length) return null;
      cand.sort((a,b)=> candidateScore(b) - candidateScore(a));
      return cand[0] || null;
    } catch (_) { return null; }
  }
  function placeCaretAtEnd(el) {
    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {}
  }
  function setElementText(el, text, mode = 'append') {
    try {
      const val = String(text || '');
      const tag = (el.tagName||'').toLowerCase();
      const doAppend = (mode !== 'replace');
      if (tag === 'textarea' || (el.value !== undefined && typeof el.value === 'string')) {
        el.focus();
        const cur = String(el.value || '');
        const sep = doAppend && cur && !/\n\s*$/.test(cur) ? '\n' : '';
        const next = doAppend ? (cur + sep + val) : val;
        el.value = next;
        try { el.selectionStart = el.selectionEnd = next.length; } catch(_) {}
        try { el.scrollTop = el.scrollHeight; } catch(_) {}
        el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: val }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      if (el.isContentEditable || (el.getAttribute && el.getAttribute('contenteditable') === 'true')) {
        el.focus();
        if (!doAppend) {
          try { el.innerHTML = ''; } catch (_) {}
        } else {
          // Move caret to end for appending
          placeCaretAtEnd(el);
        }
        let insertText = val;
        try {
          const endsWithNL = /\n\s*$/.test(String(el.innerText || ''));
          if (doAppend && (el.innerText || el.textContent || '').length > 0 && !endsWithNL) {
            insertText = '\n' + insertText;
          }
        } catch (_) {}
        // Prefer execCommand for better site compatibility
        let ok = false;
        try { ok = document.execCommand('insertText', false, insertText); } catch (_) { ok = false; }
        if (!ok) {
          try { ok = document.execCommand('insertHTML', false, insertText.replace(/\n/g, '<br>')); } catch (_) { ok = false; }
        }
        if (!ok) {
          try { el.appendChild(document.createTextNode(insertText)); } catch (_) {}
        }
        placeCaretAtEnd(el);
        try { el.lastChild && el.lastChild.scrollIntoView({ block: 'nearest' }); } catch(_) {}
        el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: insertText }));
        return true;
      }
      // last resort
      try { el.focus(); } catch (_) {}
      try { el.textContent = doAppend ? (String(el.textContent||'') + (String(el.textContent||'').endsWith('\n') ? '' : '\n') + val) : val; } catch (_) {}
      try { el.value = doAppend ? (String(el.value||'') + (String(el.value||'').endsWith('\n') ? '' : '\n') + val) : val; } catch (_) {}
      return true;
    } catch (_) { return false; }
  }

  window.addEventListener('message', (event) => {
    try {
      const data = event.data || {};
      if (!data || (data.type !== 'AI_SIDEBAR_INSERT' && data.type !== 'AI_SIDEBAR_FOCUS')) return;
      const el = findPromptElement();
      if (!el) return;
      if (data.type === 'AI_SIDEBAR_INSERT') {
        setElementText(el, data.text || '', data.mode || 'append');
        if (data.focus !== false) { try { el.focus(); placeCaretAtEnd(el); } catch (_) {} }
      } else if (data.type === 'AI_SIDEBAR_FOCUS') {
        try { el.focus(); placeCaretAtEnd(el); } catch (_) {}
      }
    } catch (_) {}
  });
  
  // 代理键入：从左侧页面捕获键盘并注入当前输入框
  window.addEventListener('message', (event) => {
    try {
      const data = event.data || {};
      if (!data || data.type !== 'AI_SIDEBAR_PROXY_TYPE') return;
      const el = findPromptElement();
      if (!el) return;
      const payload = data.payload || {};
      if (payload.kind === 'text' && typeof payload.text === 'string') {
        setElementText(el, payload.text, 'append');
        try { el.focus(); placeCaretAtEnd(el); } catch (_) {}
      } else if (payload.kind === 'newline') {
        setElementText(el, '\n', 'append');
        try { el.focus(); placeCaretAtEnd(el); } catch (_) {}
      } else if (payload.kind === 'submit') {
        try {
          el.focus(); placeCaretAtEnd(el);
        } catch (_) {}
        // Provider-specific send button attempts
        try {
          const candidates = [
            // ChatGPT
            'button[data-testid="send-button"]:not([disabled])',
            'button[aria-label*="Send"]:not([disabled])',
            // Claude
            'button[type="submit"]:not([disabled])',
            'button[aria-label*="发送"]:not([disabled])',
            // Perplexity / Gemini (best-effort)
            'button[aria-label*="send"]:not([disabled])',
            'button[aria-label*="Send message"]:not([disabled])'
          ];
          let btn = null;
          for (const sel of candidates) {
            try { btn = document.querySelector(sel); } catch (_) { btn = null; }
            if (btn) break;
          }
          if (btn) {
            try { btn.click(); return; } catch (_) {}
          }
        } catch (_) {}
        // Fallback: synthesize Enter key on element
        try {
          const evOpts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
          el.dispatchEvent(new KeyboardEvent('keydown', evOpts));
          el.dispatchEvent(new KeyboardEvent('keypress', evOpts));
          el.dispatchEvent(new KeyboardEvent('keyup', evOpts));
        } catch (_) {}
      } else if (payload.kind === 'backspace') {
        try {
          const tag = (el.tagName||'').toLowerCase();
          if (tag === 'textarea' || (el.value !== undefined && typeof el.value === 'string')) {
            el.focus();
            const start = el.selectionStart ?? (el.value || '').length;
            const end = el.selectionEnd ?? start;
            let s = String(el.value || '');
            if (start !== end) {
              s = s.slice(0, start) + s.slice(end);
              el.value = s; el.selectionStart = el.selectionEnd = start;
            } else if (start > 0) {
              s = s.slice(0, start - 1) + s.slice(end);
              el.value = s; el.selectionStart = el.selectionEnd = start - 1;
            }
            el.dispatchEvent(new InputEvent('input', { bubbles: true }));
          } else {
            el.focus();
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) { placeCaretAtEnd(el); }
            try { sel.modify && sel.modify('extend', 'backward', 'character'); } catch (_) {}
            try { document.execCommand('delete'); } catch (_) {}
          }
        } catch (_) {}
      }
    } catch (_) {}
  });

  // ============== 图片插入功能 ==============
  // 处理来自侧边栏的截图插入请求
  window.addEventListener('message', async (event) => {
    try {
      const data = event.data || {};
      if (!data || data.type !== 'AI_SIDEBAR_INSERT_IMAGE') return;
      
      const el = findPromptElement();
      if (!el) {
        console.warn('[AI Sidebar] 未找到输入框元素');
        return;
      }
      
      // 将 dataUrl 转换为 Blob
      const dataUrl = data.dataUrl;
      if (!dataUrl || typeof dataUrl !== 'string') return;
      
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], 'screenshot.png', { type: 'image/png' });
        
        // 尝试多种方式插入图片
        let success = false;
        
        // 方法1: 模拟粘贴事件 (最通用的方法，ChatGPT/Claude/Gemini 都支持)
        try {
          const clipboardData = new DataTransfer();
          clipboardData.items.add(file);
          
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: clipboardData
          });
          
          // 先聚焦输入框
          el.focus();
          
          // 触发粘贴事件在输入框上
          if (el.dispatchEvent(pasteEvent)) {
            success = true;
            console.log('[AI Sidebar] 图片通过粘贴事件插入成功');
          }
          
          // 有些网站在 document 级别监听粘贴
          if (!success) {
            document.dispatchEvent(pasteEvent);
            success = true;
            console.log('[AI Sidebar] 图片通过 document 粘贴事件插入成功');
          }
        } catch (e) {
          console.warn('[AI Sidebar] 粘贴事件失败:', e);
        }
        
        // 方法2: 模拟拖放事件
        if (!success) {
          try {
            const dropZone = findDropZone();
            if (dropZone) {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              
              // 触发拖放事件序列
              ['dragenter', 'dragover', 'drop'].forEach(eventType => {
                const event = new DragEvent(eventType, {
                  bubbles: true,
                  cancelable: true,
                  dataTransfer: dataTransfer
                });
                dropZone.dispatchEvent(event);
              });
              
              success = true;
              console.log('[AI Sidebar] 图片通过拖放事件插入成功');
            }
          } catch (e) {
            console.warn('[AI Sidebar] 拖放事件失败:', e);
          }
        }
        
        // 方法3: 查找并触发文件上传按钮
        if (!success) {
          try {
            const uploadInput = findUploadInput();
            if (uploadInput) {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              uploadInput.files = dataTransfer.files;
              
              uploadInput.dispatchEvent(new Event('change', { bubbles: true }));
              success = true;
              console.log('[AI Sidebar] 图片通过文件上传按钮插入成功');
            }
          } catch (e) {
            console.warn('[AI Sidebar] 文件上传失败:', e);
          }
        }
        
        if (success) {
          // 聚焦输入框
          try { el.focus(); placeCaretAtEnd(el); } catch (_) {}
        } else {
          console.warn('[AI Sidebar] 所有图片插入方法均失败');
        }
        
      } catch (e) {
        console.error('[AI Sidebar] 图片处理失败:', e);
      }
    } catch (_) {}
  });

  // 查找拖放区域
  function findDropZone() {
    // ChatGPT 的主内容区域
    const chatgptMain = document.querySelector('main') || document.querySelector('[role="main"]');
    if (chatgptMain) return chatgptMain;
    
    // Claude 的输入区域
    const claudeInput = document.querySelector('[contenteditable="true"]');
    if (claudeInput) return claudeInput;
    
    // Gemini 的输入区域
    const geminiInput = document.querySelector('.ql-editor');
    if (geminiInput) return geminiInput;
    
    // 通用：查找输入框的父容器
    const promptEl = findPromptElement();
    if (promptEl && promptEl.parentElement) return promptEl.parentElement;
    
    // 最后降级到 body
    return document.body;
  }

  // 查找文件上传输入框
  function findUploadInput() {
    // 常见的文件上传 input 选择器
    const selectors = [
      'input[type="file"][accept*="image"]',
      'input[type="file"]',
      'input[name="file"]',
      'input[name="upload"]'
    ];
    
    for (const selector of selectors) {
      const input = document.querySelector(selector);
      if (input) return input;
    }
    
    return null;
  }
})();

// ============== 选区发送到输入框（右侧面板内） ==============
(function enableSelectionToPrompt() {
  try {
    // 主动请求：从上层侧栏请求当前 frame 返回选区
    window.addEventListener('message', (event) => {
      try {
        const data = event.data || {};
        if (!data || data.type !== 'AI_SIDEBAR_REQUEST_SELECTION') return;
        const sel = window.getSelection && window.getSelection();
        const text = sel ? String(sel.toString() || '').trim() : '';
        try { window.parent.postMessage({ type: 'AI_SIDEBAR_SELECTION_RESULT', text }, '*'); } catch (_) {}
      } catch (_) {}
    });
    
    // 快捷键：Cmd/Ctrl+Shift+Y 将选区直接追加到输入框
    document.addEventListener('keydown', (e) => {
      try {
        const isY = (e.key === 'y' || e.key === 'Y');
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && isY) {
          const sel = window.getSelection && window.getSelection();
          const text = sel ? String(sel.toString() || '').trim() : '';
          if (!text) return;
          e.preventDefault(); e.stopPropagation();
          const el = (typeof findPromptElement === 'function') ? findPromptElement() : null;
          if (!el) return;
          (typeof setElementText === 'function') && setElementText(el, text, 'append');
          try { el.focus && el.focus(); } catch (_) {}
          (typeof placeCaretAtEnd === 'function') && placeCaretAtEnd(el);
        }
      } catch (_) {}
    }, true);
  } catch (_) {}
})(); 
