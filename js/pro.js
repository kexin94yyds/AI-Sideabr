// ToBooks account link + Pro state. The single source of truth for "is this Pro?".
//
// How it works (PKCE-like):
//   1. verifier = 32 random bytes; challenge = SHA-256(verifier). The verifier never leaves the extension
//      until step 3.
//   2. A normal browser tab opens https://tobooks.xin/ext-link.html#c=<challenge>. The user signs in there
//      (ToBooks' own page) and clicks Allow. The extension never sees a ToBooks password, code or session.
//   3. The extension polls /api/ext-link-exchange with the verifier and receives a device token that can
//      only read membership status.
//
// Rules:
//   - Nothing is sent to tobooks.xin before the user starts a connection.
//   - The device token lives in the extension origin's IndexedDB (content scripts cannot read it), never in
//     chrome.storage.local. Non-sensitive status lives in chrome.storage.local under "tbLink".
//   - 401 from the server → drop the token. Network errors / 5xx → keep it and use the offline grace.
//   - Local Pro gating is an honour system (the extension is open source). Anything that must really be
//     locked has to be enforced by the server.
//   - Every public method is safe to call when this module is broken: free features must keep working.
(function (root) {
  'use strict';

  var LINK_KEY = 'tbLink';
  var PENDING_KEY = 'tbLinkPending';
  var NOTICE_KEY = 'tbLinkNotice';
  var B64URL_43 = /^[A-Za-z0-9_-]{43}$/;
  var TOKEN_RE = /^tbx_[A-Za-z0-9_-]{43}$/;

  function base64url(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Pure: what the UI should show, from what is stored. No I/O, so every edge is unit-tested.
  function deriveState(input) {
    var link = input.link, now = input.now, cfg = input.config;
    if (!input.hasToken) {
      return { state: input.pending ? 'connecting' : 'unlinked', pro: false };
    }
    var ent = (link && link.entitlement) || { pro: false, reason: 'none' };
    var out = { state: 'linked_free', pro: false, accountHint: (link && link.accountHint) || null, entitlement: ent };
    if (!ent.pro) return out;

    var graceMs = ((link && link.graceS) != null ? link.graceS : cfg.graceS) * 1000;
    var lastOk = (link && link.lastOkAt) || 0;
    var graceLeftMs = lastOk + graceMs - now;
    if (graceLeftMs <= 0) {
      // Could not confirm the membership for longer than the grace period.
      out.graceExpired = true;
      return out;
    }
    out.pro = true;
    if (link && link.lastCheckFailed) {
      out.state = 'offline_grace';
      out.graceDaysLeft = Math.max(1, Math.ceil(graceLeftMs / 86400000));
    } else {
      out.state = 'linked_pro';
    }
    return out;
  }

  function createPro(deps) {
    var cfg = deps.config;
    var kv = deps.kv;               // { get(key), set(key, value), remove(key) } → chrome.storage.local
    var session = deps.session;     // same shape → chrome.storage.session
    var tokens = deps.tokenStore;   // { get(), set(token), clear() } → extension-origin IndexedDB
    var now = deps.now || function () { return Date.now(); };
    var doFetch = deps.fetch;
    var cryptoImpl = deps.crypto;
    var sleep = deps.sleep || function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var listeners = [];
    var polling = null;

    function emit() { listeners.slice().forEach(function (fn) { try { fn(); } catch (_) { /* a listener must not break the link */ } }); }

    async function call(path, options) {
      // Only ever this origin and these paths.
      var url = cfg.apiBase + '/api/' + path;
      var headers = { 'Content-Type': 'application/json' };
      if (options && options.token) headers.Authorization = 'Bearer ' + options.token;
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, cfg.requestTimeoutMs) : null;
      try {
        var res = await doFetch(url, {
          method: 'POST', headers: headers, body: JSON.stringify((options && options.body) || {}),
          credentials: 'omit', cache: 'no-store', signal: controller ? controller.signal : undefined
        });
        var data = null;
        try { data = await res.json(); } catch (_) { data = null; }
        return { status: res.status, data: data };
      } catch (_) {
        return { status: 0, data: null }; // offline, DNS, timeout
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    async function challengeFor(verifier) {
      var digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      return base64url(new Uint8Array(digest));
    }

    async function saveLink(data, previous) {
      var ent = data.entitlement || {};
      var link = {
        deviceId: data.device_id || (previous && previous.deviceId) || null,
        accountHint: data.account_hint || (previous && previous.accountHint) || null,
        scopes: data.scopes || (previous && previous.scopes) || [],
        entitlement: {
          pro: ent.pro === true, reason: ent.reason || 'none', plan: ent.plan || null,
          billingModel: ent.billing_model || null, expiresAt: ent.expires_at || null,
          priceLabel: (ent.offer && ent.offer.price_label) || null,
          purchaseUrl: (ent.offer && ent.offer.purchase_url) || null
        },
        lastOkAt: now(),
        lastCheckFailed: false,
        recheckAfterS: Number.isFinite(ent.recheck_after_s) ? ent.recheck_after_s : cfg.recheckAfterS,
        graceS: Number.isFinite(ent.grace_s) ? ent.grace_s : cfg.graceS
      };
      await kv.set(LINK_KEY, link);
      return link;
    }

    async function forget(reason) {
      await tokens.clear();
      await kv.remove(LINK_KEY);
      if (reason) await kv.set(NOTICE_KEY, { reason: reason, at: now() });
    }

    var api = {
      onChange: function (fn) { listeners.push(fn); },

      async getState() {
        var token = await tokens.get();
        var pending = await session.get(PENDING_KEY);
        if (pending && now() - pending.startedAt > cfg.linkTimeoutMs) { await session.remove(PENDING_KEY); pending = null; }
        var out = deriveState({ link: await kv.get(LINK_KEY), hasToken: !!token, pending: !!pending, now: now(), config: cfg });
        if (out.state === 'connecting') out.confirmCode = pending.challenge.slice(0, 6);
        var notice = await kv.get(NOTICE_KEY);
        if (notice) out.notice = notice;
        return out;
      },

      async dismissNotice() { await kv.remove(NOTICE_KEY); emit(); },

      // Call only after the user agreed on the consent screen. This is the first moment anything about this
      // extension reaches tobooks.xin.
      async beginConnect() {
        var bytes = new Uint8Array(32);
        cryptoImpl.getRandomValues(bytes);
        var verifier = base64url(bytes);
        var challenge = await challengeFor(verifier);
        await session.set(PENDING_KEY, { verifier: verifier, challenge: challenge, startedAt: now() });
        await kv.remove(NOTICE_KEY);
        var info = (deps.clientInfo && deps.clientInfo()) || {};
        var hash = new URLSearchParams({ c: challenge, k: cfg.clientKind, v: info.version || '', l: info.label || '' }).toString();
        await deps.openTab(cfg.apiBase + cfg.linkPagePath + '#' + hash);
        emit();
        return { confirmCode: challenge.slice(0, 6) };
      },

      async cancelConnect() { await session.remove(PENDING_KEY); emit(); },

      // One poll. → 'linked' | 'pending' | 'expired' | 'idle' | 'retry'
      async pollOnce() {
        var pending = await session.get(PENDING_KEY);
        if (!pending || !B64URL_43.test(pending.verifier || '')) return 'idle';
        if (now() - pending.startedAt > cfg.linkTimeoutMs) { await session.remove(PENDING_KEY); emit(); return 'expired'; }
        var res = await call('ext-link-exchange', { body: { verifier: pending.verifier } });
        if (res.status === 200 && res.data && res.data.success && TOKEN_RE.test(res.data.token || '')) {
          await tokens.set(res.data.token);
          await saveLink(res.data, null);
          await session.remove(PENDING_KEY);
          emit();
          return 'linked';
        }
        if (res.status === 400) { await session.remove(PENDING_KEY); emit(); return 'expired'; }
        return res.status === 404 ? 'pending' : 'retry';
      },

      // Polls until linked, expired or cancelled. Safe to call again after the side panel reopens.
      waitForLink() {
        if (polling) return polling;
        polling = (async function () {
          try {
            for (;;) {
              var result = await api.pollOnce();
              if (result !== 'pending' && result !== 'retry') return result;
              await sleep(cfg.pollIntervalMs);
            }
          } finally { polling = null; }
        })();
        return polling;
      },

      // Ask the server. → 'ok' | 'revoked' | 'offline' | 'unlinked'
      async refresh() {
        var token = await tokens.get();
        if (!token) return 'unlinked'; // never contacts the server for users who did not connect
        var previous = await kv.get(LINK_KEY);
        var info = (deps.clientInfo && deps.clientInfo()) || {};
        var res = await call('ext-entitlement', { token: token, body: { client_version: info.version || null } });
        if (res.status === 200 && res.data && res.data.success && res.data.entitlement) {
          await saveLink(res.data, previous);
          emit();
          return 'ok';
        }
        if (res.status === 401) {
          await forget((res.data && res.data.revoked_reason) || 'unknown');
          emit();
          return 'revoked';
        }
        // Anything else (offline, timeout, 5xx, 503 link_disabled): keep the token, remember the failure.
        if (previous) { previous.lastCheckFailed = true; await kv.set(LINK_KEY, previous); }
        emit();
        return 'offline';
      },

      // On side panel open: check only when the last successful check is older than the server's interval.
      async maybeRefresh() {
        var link = await kv.get(LINK_KEY);
        if (!link || !(await tokens.get())) return 'skipped';
        var due = (link.lastOkAt || 0) + (link.recheckAfterS != null ? link.recheckAfterS : cfg.recheckAfterS) * 1000;
        return now() >= due || link.lastCheckFailed ? api.refresh() : 'fresh';
      },

      async disconnect() {
        var token = await tokens.get();
        await forget(null); // local state goes first; the server call is best effort
        await session.remove(PENDING_KEY);
        emit();
        if (token) await call('ext-unlink', { token: token });
      },

      // The one gate features call. Free features are always on, even if everything above is broken.
      async has(featureId) {
        var feature = null;
        try { feature = cfg.features.filter(function (f) { return f.id === featureId; })[0] || null; } catch (_) { feature = null; }
        if (feature && feature.tier === 'free') return true;
        try {
          var state = await api.getState();
          if (!state.pro && state.state === 'linked_free' && !state.graceExpired) {
            // Just bought? Ask once before saying no.
            if ((await api.refresh()) === 'ok') state = await api.getState();
          }
          return state.pro === true;
        } catch (_) { return false; }
      }
    };
    return api;
  }

  var exported = { createPro: createPro, deriveState: deriveState, LINK_KEY: LINK_KEY, PENDING_KEY: PENDING_KEY, NOTICE_KEY: NOTICE_KEY };
  root.TBPro = exported;
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this);
