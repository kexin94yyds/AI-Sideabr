// ToBooks account panel: toolbar button, consent screen, connection states, Free / Pro switches.
// All text is set with textContent; nothing from the server is inserted as HTML.
// If anything here throws, the rest of the side panel keeps working (see boot() at the bottom).
(function (root) {
  'use strict';

  var EN = !/^zh\b/i.test((root.navigator && root.navigator.language) || 'zh');
  var L = function (zh, en) { return EN ? en : zh; };
  var TOGGLES_KEY = 'tbProToggles';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function button(text, className, onClick) {
    var b = el('button', 'tbpro-btn' + (className ? ' ' + className : ''), text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  var REVOKED_TEXT = {
    evicted: ['你的账号已在其他设备上连接到上限，这台被自动断开。可以重新连接。', 'Your account reached its device limit, so this device was disconnected. You can connect again.'],
    idle: ['长时间未使用，连接已失效。可以重新连接。', 'The connection expired after a long time without use. You can connect again.'],
    user: ['连接已被取消。', 'The connection was removed.'],
    admin: ['连接已被取消。', 'The connection was removed.'],
    unknown: ['连接已失效，请重新连接。', 'The connection is no longer valid. Please connect again.']
  };

  function mount(options) {
    var pro = options.pro, cfg = options.config, kv = options.kv;
    var openUrl = options.openUrl;
    var modal = options.modal;
    var view = 'main';          // 'main' | 'consent'
    var busy = false;
    var open = false;

    function close() { open = false; view = 'main'; modal.style.display = 'none'; modal.replaceChildren(); }

    function planText(ent) {
      if (ent.reason === 'legacy_grace') return EN ? cfg.legacyGraceNote.en : cfg.legacyGraceNote.zh;
      var model = ent.billingModel || cfg.billingModel;
      if (model === 'lifetime') return L('ToBooks 会员（买断）', 'ToBooks membership (lifetime)');
      if (model === 'subscription') return L('ToBooks 会员（订阅）', 'ToBooks membership (subscription)');
      return L('ToBooks 会员', 'ToBooks membership'); // billing model undecided: neutral wording
    }

    function upgradeRow(ent) {
      var row = el('div', 'tbpro-row');
      var price = (ent && ent.priceLabel) || cfg.pricing.priceLabel; // null while pricing is undecided
      row.appendChild(el('div', 'tbpro-note', price
        ? L('开通 ToBooks 会员即可使用 Pro：' + price, 'Pro comes with a ToBooks membership: ' + price)
        : L('开通 ToBooks 会员即可使用 Pro。价格以 ToBooks 网站为准。', 'Pro comes with a ToBooks membership. See the ToBooks site for pricing.')));
      row.appendChild(button(L('去 ToBooks 了解会员', 'See ToBooks membership'), '', function () {
        openUrl((ent && ent.purchaseUrl) || cfg.pricing.purchaseUrl);
      }));
      return row;
    }

    async function featureList(isPro) {
      var toggles = (await kv.get(TOGGLES_KEY)) || {};
      var box = el('div', 'tbpro-features');
      box.appendChild(el('div', 'tbpro-label', isPro ? L('当前：Pro', 'Current plan: Pro') : L('当前：免费版', 'Current plan: Free')));
      cfg.features.forEach(function (feature) {
        var locked = feature.tier === 'pro' && !isPro;
        var row = el('label', 'tbpro-feature' + (locked ? ' locked' : ''));
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.dataset.feature = feature.id;
        if (feature.tier === 'free') { input.checked = true; input.disabled = true; }
        else { input.checked = !locked && toggles[feature.id] === true; input.disabled = locked; }
        input.addEventListener('change', async function () {
          var next = (await kv.get(TOGGLES_KEY)) || {};
          next[feature.id] = input.checked;
          await kv.set(TOGGLES_KEY, next);
        });
        row.appendChild(input);
        row.appendChild(el('span', 'tbpro-feature-name', EN ? feature.en : feature.zh));
        row.appendChild(el('span', 'tbpro-badge ' + feature.tier, feature.tier === 'pro' ? (locked ? 'Pro 🔒' : 'Pro') : L('免费', 'Free')));
        box.appendChild(row);
      });
      return box;
    }

    function consentView(body) {
      body.appendChild(el('div', 'tbpro-title', L('连接前请确认', 'Before you connect')));
      var list = el('ul', 'tbpro-list');
      [
        L('会在新标签页打开 tobooks.xin，由你在网页上登录并点「允许」。插件拿不到你的 ToBooks 密码、验证码或登录状态。', 'A new tab opens tobooks.xin, where you sign in and click Allow. The extension never receives your ToBooks password, code or session.'),
        L('发送给 tobooks.xin：设备名（如 Chrome · macOS）和插件版本号。', 'Sent to tobooks.xin: a device name (such as Chrome · macOS) and the extension version.'),
        L('从 tobooks.xin 取回：会员状态和打码后的邮箱（如 y***@gmail.com）。', 'Received from tobooks.xin: your membership status and a masked e-mail (such as y***@gmail.com).'),
        L('本机保存：一个只能查询会员状态的连接令牌。', 'Stored on this device: a connection token that can only read membership status.'),
        L('不发送：浏览记录、对话内容、收藏、任何网站的登录信息。', 'Not sent: browsing history, conversations, favorites, or any site sign-in data.'),
        L('随时可以在这里点「断开」。不连接时，插件和以前完全一样。', 'You can disconnect here at any time. Without a connection the extension works exactly as before.')
      ].forEach(function (text) { list.appendChild(el('li', '', text)); });
      body.appendChild(list);
      var actions = el('div', 'tbpro-actions');
      actions.appendChild(button(L('取消', 'Cancel'), '', function () { view = 'main'; render(); }));
      actions.appendChild(button(L('同意并继续', 'Agree and continue'), 'primary', async function () {
        if (busy) return;
        busy = true;
        try {
          await pro.beginConnect();
          view = 'main';
          pro.waitForLink().then(render, render);
        } finally { busy = false; }
        render();
      }));
      body.appendChild(actions);
    }

    async function mainView(body) {
      var state = await pro.getState();
      body.dataset.state = state.state;

      if (state.notice) {
        var text = REVOKED_TEXT[state.notice.reason] || REVOKED_TEXT.unknown;
        var notice = el('div', 'tbpro-notice', L(text[0], text[1]));
        notice.appendChild(button('×', 'link', function () { pro.dismissNotice(); }));
        body.appendChild(notice);
      }

      if (state.state === 'unlinked') {
        body.appendChild(el('div', 'tbpro-title', L('未连接 ToBooks 账号', 'No ToBooks account connected')));
        body.appendChild(el('div', 'tbpro-note', L('用 ToBooks 登录后，ToBooks 会员可以使用 Pro。不连接也可以继续使用全部现有功能。', 'Sign in with ToBooks to use Pro with a ToBooks membership. Everything the extension does today stays available without connecting.')));
        var actions = el('div', 'tbpro-actions');
        actions.appendChild(button(L('用 ToBooks 登录', 'Sign in with ToBooks'), 'primary', function () { view = 'consent'; render(); }));
        body.appendChild(actions);
        body.appendChild(await featureList(false));
        body.appendChild(upgradeRow(null));
        return;
      }

      if (state.state === 'connecting') {
        body.appendChild(el('div', 'tbpro-title', L('等待你在网页上确认…', 'Waiting for you to confirm on the web page…')));
        body.appendChild(el('div', 'tbpro-note', L('请核对网页上的确认码和这里一致，再点「允许」。', 'Check that the confirmation code on the web page matches this one, then click Allow.')));
        body.appendChild(el('div', 'tbpro-code', state.confirmCode));
        var cancel = el('div', 'tbpro-actions');
        cancel.appendChild(button(L('取消', 'Cancel'), '', function () { pro.cancelConnect(); }));
        body.appendChild(cancel);
        return;
      }

      var ent = state.entitlement || {};
      var title = state.state === 'linked_pro' ? L('已连接 ', 'Connected ') + (state.accountHint || '') + ' · Pro'
        : state.state === 'offline_grace' ? L('已连接 ', 'Connected ') + (state.accountHint || '') + L(' · Pro（离线，还能用 ' + state.graceDaysLeft + ' 天）', ' · Pro (offline, ' + state.graceDaysLeft + ' more days)')
        : L('已连接 ', 'Connected ') + (state.accountHint || '') + L(' · 还不是会员', ' · no membership yet');
      body.appendChild(el('div', 'tbpro-title', title));
      if (state.pro) body.appendChild(el('div', 'tbpro-note', planText(ent)));
      else if (state.graceExpired) body.appendChild(el('div', 'tbpro-note', L('需要联网确认会员状态。', 'Go online to confirm your membership.')));
      else if (ent.reason === 'expired') body.appendChild(el('div', 'tbpro-note', L('会员已过期或已取消。', 'The membership has expired or was cancelled.')));

      body.appendChild(await featureList(state.pro));
      if (!state.pro) body.appendChild(upgradeRow(ent));

      var row = el('div', 'tbpro-actions');
      var status = el('span', 'tbpro-status');
      row.appendChild(button(L('刷新会员状态', 'Refresh status'), '', async function () {
        if (busy) return;
        busy = true; status.textContent = L('正在检查…', 'Checking…');
        var result;
        try { result = await pro.refresh(); } finally { busy = false; }
        if (result === 'offline') { await render(); var s = modal.querySelector('.tbpro-status'); if (s) s.textContent = L('暂时连不上，稍后再试。', 'Could not reach ToBooks. Try again later.'); }
      }));
      row.appendChild(button(L('断开', 'Disconnect'), '', function () { pro.disconnect(); }));
      row.appendChild(status);
      body.appendChild(row);
    }

    async function render() {
      if (!open) return;
      var content = el('div', 'settings-modal-content tbpro-panel');
      var header = el('div', 'settings-header');
      header.appendChild(el('h2', '', L('ToBooks 账号', 'ToBooks account')));
      var x = el('button', 'settings-close-btn', '×');
      x.type = 'button'; x.title = 'Close';
      x.addEventListener('click', close);
      header.appendChild(x);
      var body = el('div', 'settings-body tbpro-body');
      content.appendChild(header);
      content.appendChild(body);
      try {
        if (view === 'consent') consentView(body); else await mainView(body);
      } catch (_) {
        body.replaceChildren(el('div', 'tbpro-note', L('账号面板暂时不可用，其他功能不受影响。', 'The account panel is unavailable right now. Everything else keeps working.')));
      }
      if (!open) return;
      var backdrop = el('div', 'settings-modal-backdrop');
      backdrop.addEventListener('click', close);
      modal.replaceChildren(backdrop, content);
      modal.style.display = 'flex';
    }

    pro.onChange(function () { render(); });

    return {
      open: function () { open = true; view = 'main'; return render(); },
      close: close,
      render: render
    };
  }

  // ---- Chrome adapters ---------------------------------------------------------------------------
  function storageArea(area) {
    return {
      get: async function (key) { return (await area.get(key))[key]; },
      set: async function (key, value) { var o = {}; o[key] = value; await area.set(o); },
      remove: async function (key) { await area.remove(key); }
    };
  }

  // Extension-origin IndexedDB: readable by extension pages only, not by content scripts.
  function indexedDbTokenStore(idb) {
    function withStore(mode, fn) {
      return new Promise(function (resolve, reject) {
        var open = idb.open('AISidebarAuth', 1);
        open.onupgradeneeded = function () { open.result.createObjectStore('kv'); };
        open.onerror = function () { reject(open.error); };
        open.onsuccess = function () {
          var db = open.result;
          var tx = db.transaction('kv', mode);
          var request = fn(tx.objectStore('kv'));
          tx.oncomplete = function () { db.close(); resolve(request && request.result); };
          tx.onerror = tx.onabort = function () { db.close(); reject(tx.error); };
        };
      });
    }
    return {
      get: function () { return withStore('readonly', function (s) { return s.get('deviceToken'); }).then(function (v) { return v || null; }); },
      set: function (token) { return withStore('readwrite', function (s) { return s.put(token, 'deviceToken'); }); },
      clear: function () { return withStore('readwrite', function (s) { return s.delete('deviceToken'); }); }
    };
  }

  function clientLabel() {
    var ua = (root.navigator && root.navigator.userAgent) || '';
    var os = /Mac/i.test(ua) ? 'macOS' : /Windows/i.test(ua) ? 'Windows' : /CrOS/i.test(ua) ? 'ChromeOS' : /Linux/i.test(ua) ? 'Linux' : '';
    return 'Chrome' + (os ? ' · ' + os : '');
  }

  function boot() {
    var chromeApi = root.chrome;
    if (!root.TBPro || !root.TB_PRO_CONFIG || !chromeApi || !chromeApi.storage || !chromeApi.storage.session) return;
    var modal = document.getElementById('settingsModal');
    var toolbar = document.querySelector('.toolbar');
    if (!modal || !toolbar) return;

    var kv = storageArea(chromeApi.storage.local);
    var pro = root.TBPro.createPro({
      config: root.TB_PRO_CONFIG,
      kv: kv,
      session: storageArea(chromeApi.storage.session),
      tokenStore: indexedDbTokenStore(root.indexedDB),
      fetch: root.fetch.bind(root),
      crypto: root.crypto,
      openTab: function (url) { return chromeApi.tabs.create({ url: url }); },
      clientInfo: function () { return { version: chromeApi.runtime.getManifest().version, label: clientLabel() }; }
    });
    var ui = mount({
      pro: pro, config: root.TB_PRO_CONFIG, kv: kv, modal: modal,
      openUrl: function (url) { chromeApi.tabs.create({ url: url }); }
    });

    var btn = document.createElement('button');
    btn.id = 'tobooksAccountBtn';
    btn.type = 'button';
    btn.title = L('ToBooks 账号与 Pro', 'ToBooks account and Pro');
    btn.textContent = 'ToBooks';
    btn.addEventListener('click', function () { ui.open(); });
    toolbar.appendChild(btn);

    root.TBProInstance = pro; // features call TBProInstance.has('<feature id>')
    // Resume a connection that was in progress when the side panel closed; otherwise a due re-check.
    // Neither does anything (no request) for users who never connected.
    pro.getState().then(function (state) {
      if (state.state === 'connecting') pro.waitForLink();
      else pro.maybeRefresh();
    }).catch(function () {});
  }

  root.TBProUI = { mount: mount, storageArea: storageArea, indexedDbTokenStore: indexedDbTokenStore };
  if (!root.__TB_PRO_NO_AUTOBOOT) {
    try {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { try { boot(); } catch (_) { /* free features keep working */ } });
      else boot();
    } catch (_) { /* free features keep working */ }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
