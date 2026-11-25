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
//   - Pro is decided ONLY by a credential the server signed (review P1-1, 2026-11-25). Format
//     "tbe1.<kid>.<payload>.<sig>", ECDSA P-256 / SHA-256, checked with WebCrypto against a public key built
//     into this extension (pro-config.js → entitlementKeys). Editing chrome.storage.local (e.g. setting
//     entitlement.pro = true) does not verify, so it unlocks nothing. No key configured → never Pro.
//   - The credential is bound to this device token (payload.tkh) and to the device id (payload.did).
//   - Offline grace is computed and signed by the server (payload.exp). This file never adds grace itself.
//   - Clock: the grace is measured in SERVER time. At every successful check the extension stores
//     skew = signed iat − system clock, and afterwards uses system clock + skew. A clock that is wrong by a
//     constant amount therefore changes nothing.
//   - Clock roll-back: the highest system-clock value seen is saved (CLOCK_KEY.hw). If the clock is ever more
//     than 10 minutes below it, the extension treats the clock as set back and stops giving Pro until the
//     next successful server check (which re-anchors hw and skew). That decision is sticky: letting the
//     clock run until it catches up again does not bring Pro back. So setting the clock back neither
//     extends nor freezes the grace (beyond the time since the extension last looked at the clock).
//   - Limit (stated, not hidden): someone who edits the saved clock record in DevTools AND sets the clock
//     back can still stretch the offline period, because a purely local check cannot tell. That is why
//     features that must be really locked have to be checked by the server with the device token
//     (POST /api/ext-entitlement or a future server endpoint) before it hands out data.
//   - Every public method is safe to call when this module is broken: free features must keep working.
(function (root) {
  'use strict';

  var LINK_KEY = 'tbLink';
  var PENDING_KEY = 'tbLinkPending';
  var NOTICE_KEY = 'tbLinkNotice';
  var CLOCK_KEY = 'tbClockHW';
  var ROLLBACK_TOLERANCE_MS = 10 * 60 * 1000;
  var CRED_PREFIX = 'tbe1';
  var CRED_AUDIENCE = 'ai-sidebar';
  var B64URL_43 = /^[A-Za-z0-9_-]{43}$/;
  var TOKEN_RE = /^tbx_[A-Za-z0-9_-]{43}$/;

  function base64url(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function base64urlToBytes(text) {
    var b64 = String(text).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // 6-digit code shown in the extension; the user TYPES it on ext-link.html (review P2-1). Same formula as
  // ToBooks api/_ext/core.mjs confirmCodeFor and ext-link.html: first 4 challenge bytes, big-endian, mod 10^6.
  function confirmCodeFor(challenge) {
    var b = base64urlToBytes(String(challenge).slice(0, 8));
    var n = ((b[0] << 24) >>> 0) + (b[1] << 16) + (b[2] << 8) + b[3];
    return String(n % 1000000).padStart(6, '0');
  }

  // Pure: what the UI should show. `verified` is the payload of a credential whose signature, audience, device
  // and token binding already checked out (verifyCredential), or null. Only `verified` can make it Pro; the
  // plain `link.entitlement` is display text. `now` is the roll-back-resistant clock (see header).
  function deriveState(input) {
    var link = input.link, now = input.now, v = input.verified || null;
    if (input.hasToken && input.clockRolledBack && v && v.pro) {
      // The system clock went backwards since the last server check: no Pro until the server confirms again.
      return { state: 'linked_free', pro: false, accountHint: link.accountHint || null,
        entitlement: link.entitlement || { pro: false, reason: 'none' }, clockRolledBack: true };
    }
    if (!input.hasToken) {
      return { state: input.pending ? 'connecting' : 'unlinked', pro: false };
    }
    var ent = (link && link.entitlement) || { pro: false, reason: 'none' };
    var out = { state: 'linked_free', pro: false, accountHint: (link && link.accountHint) || null, entitlement: ent };
    if (!v) {
      // Stored text claims Pro but nothing signed says so: tampered, unsigned server, or no key built in.
      if (ent.pro) out.unverified = true;
      return out;
    }
    if (!v.pro) {
      if (ent.pro) out.unverified = true;
      return out;
    }
    var leftMs = v.exp - now;
    if (leftMs <= 0) {
      // The signed validity (online interval + offline grace, capped by the membership end) is over.
      out.graceExpired = true;
      return out;
    }
    out.pro = true;
    if (link && link.lastCheckFailed) {
      out.state = 'offline_grace';
      out.graceDaysLeft = Math.max(1, Math.ceil(leftMs / 86400000));
    } else {
      out.state = 'linked_pro';
    }
    return out;
  }

  // → payload or null. Never throws. `keys` = { kid: {kty:'EC', crv:'P-256', x, y} } from pro-config.js.
  async function verifyCredential(cryptoImpl, keys, credential, expect) {
    try {
      var parts = String(credential || '').split('.');
      if (parts.length !== 4 || parts[0] !== CRED_PREFIX) return null;
      var jwk = keys && Object.prototype.hasOwnProperty.call(keys, parts[1]) ? keys[parts[1]] : null;
      if (!jwk || jwk.kty !== 'EC' || jwk.crv !== 'P-256' || jwk.d) return null;
      var key = await cryptoImpl.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, ext: true },
        { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      var ok = await cryptoImpl.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key,
        base64urlToBytes(parts[3]), new TextEncoder().encode(parts.slice(0, 3).join('.')));
      if (!ok) return null;
      var payload = JSON.parse(new TextDecoder().decode(base64urlToBytes(parts[2])));
      if (!payload || payload.v !== 1 || payload.aud !== CRED_AUDIENCE) return null;
      if (!Number.isFinite(payload.iat) || !Number.isFinite(payload.exp)) return null;
      if (expect.deviceId && payload.did !== expect.deviceId) return null;
      if (payload.tkh !== expect.tokenBinding) return null;
      return payload;
    } catch (_) { return null; }
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

    async function tokenBindingFor(token) {
      return (await challengeFor(token)).slice(0, 22); // = base64url(SHA-256(token)).slice(0, 22), as on the server
    }

    // → { now: estimated server time, rolledBack }. See the header for the rules.
    async function readClock() {
      var saved = null;
      try { saved = await kv.get(CLOCK_KEY); } catch (_) { saved = null; }
      var hw = saved && Number.isFinite(saved.hw) ? saved.hw : 0;
      var skew = saved && Number.isFinite(saved.skew) ? saved.skew : 0;
      var sticky = !!(saved && saved.rolledBack);
      var raw = now();
      var rolledBack = sticky || raw < hw - ROLLBACK_TOLERANCE_MS;
      if (raw > hw || rolledBack !== sticky) {
        try { await kv.set(CLOCK_KEY, { hw: Math.max(raw, hw), skew: skew, rolledBack: rolledBack }); } catch (_) { /* best effort */ }
      }
      return { now: raw + skew, rolledBack: rolledBack };
    }

    // After a credential verified online: server time is known, so re-anchor.
    async function anchorClock(iat) {
      var raw = now();
      try { await kv.set(CLOCK_KEY, { hw: raw, skew: iat - raw, rolledBack: false }); } catch (_) { /* best effort */ }
    }

    async function verifiedFor(link, token) {
      if (!link || !link.credential || !token) return null;
      return verifyCredential(cryptoImpl, cfg.entitlementKeys, link.credential,
        { deviceId: link.deviceId, tokenBinding: await tokenBindingFor(token) });
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
        // The only thing that can make this Pro. Text above is for display.
        credential: typeof data.credential === 'string' ? data.credential : null,
        lastOkAt: now(),
        lastCheckFailed: false,
        recheckAfterS: Number.isFinite(ent.recheck_after_s) ? ent.recheck_after_s : cfg.recheckAfterS,
        graceS: Number.isFinite(ent.grace_s) ? ent.grace_s : null // display only; the signed exp decides
      };
      await kv.set(LINK_KEY, link);
      // Anchor the local clock to the server's signed time, so a clock set back later cannot go below it.
      var token = await tokens.get();
      var v = await verifiedFor(link, token);
      if (v) await anchorClock(v.iat);
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
        var link = await kv.get(LINK_KEY);
        var verified = await verifiedFor(link, token);
        var clock = await readClock();
        var out = deriveState({ link: link, verified: verified, hasToken: !!token, pending: !!pending, now: clock.now, clockRolledBack: clock.rolledBack, config: cfg });
        if (out.state === 'connecting') out.confirmCode = confirmCodeFor(pending.challenge);
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
        return { confirmCode: confirmCodeFor(challenge) };
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
        // A clock set back cannot postpone the next check either.
        var clock = await readClock();
        return now() >= due || clock.rolledBack || link.lastCheckFailed ? api.refresh() : 'fresh';
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

  var exported = {
    createPro: createPro, deriveState: deriveState, verifyCredential: verifyCredential, confirmCodeFor: confirmCodeFor,
    LINK_KEY: LINK_KEY, PENDING_KEY: PENDING_KEY, NOTICE_KEY: NOTICE_KEY, CLOCK_KEY: CLOCK_KEY
  };
  root.TBPro = exported;
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this);
