// Unit tests for the ToBooks account link (js/pro.js, js/pro-config.js). No network: fetch is a stub.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto, createHash, generateKeyPairSync, sign: nodeSign } = require('node:crypto');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

// Test-only signing key. The shipped pro-config.js has NO key (entitlementKeys = {}), so tests put the public
// half in, exactly as the owner would after generating the real pair.
const SERVER_KEY = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const OTHER_KEY = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const PUBLIC_JWK = SERVER_KEY.publicKey.export({ format: 'jwk' });
const KID = 'test1';

// Same format as ToBooks api/_ext/credential.mjs (the cross-repo e2e checks the two agree).
function signCredential({ did = 'dev-1', token, pro, reason = pro ? 'paid' : 'none', iat, exp, kid = KID, key = SERVER_KEY.privateKey, aud = 'ai-sidebar', n }) {
  const tkh = createHash('sha256').update(token).digest('base64url').slice(0, 22);
  const payload = { v: 1, aud, did, tkh, pro, reason, plan: pro ? 'tobooks_member' : null, iat, exp };
  if (n !== undefined) payload.n = n; // the nonce the extension sent with the request (review r2 P2-A)
  const head = `tbe1.${kid}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
  return `${head}.${nodeSign('sha256', Buffer.from(head), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}

function loadModules({ keys = { [KID]: PUBLIC_JWK } } = {}) {
  const context = { btoa, atob, TextEncoder, TextDecoder, URLSearchParams, AbortController, setTimeout, clearTimeout, console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(read('js/pro-config.js'), context, { filename: 'js/pro-config.js' });
  vm.runInContext(read('js/pro.js'), context, { filename: 'js/pro.js' });
  if (keys) context.TB_PRO_CONFIG.entitlementKeys = keys;
  return { TBPro: context.TBPro, config: context.TB_PRO_CONFIG };
}

const DAY = 86400000;
const TOKEN_LIKE = /^tbx_[A-Za-z0-9_-]{43}$/;
const TOKEN = `tbx_${'A'.repeat(43)}`;
const entitlement = (pro, reason = pro ? 'paid' : 'none', extra = {}) => ({
  pro, reason, plan: pro ? 'tobooks_member' : null, billing_model: 'undecided', expires_at: null,
  recheck_after_s: 86400, grace_s: 14 * 86400, offer: { price_label: null, purchase_url: 'https://tobooks.xin/?from=ai-sidebar' }, ...extra
});

function harness(options = {}) {
  const { TBPro, config } = loadModules(options.keys === undefined ? {} : { keys: options.keys });
  const local = structuredClone(options.local || {});
  const sessionData = {};
  const calls = [];
  const opened = [];
  let token = options.token || null;
  let meta = null; // { deviceId, iat } — lives next to the token (IndexedDB in the real extension)
  let clock = options.now || Date.parse('2026-12-01T00:00:00Z');
  const area = (data) => ({
    get: async (key) => structuredClone(data[key]),
    set: async (key, value) => { data[key] = structuredClone(value); },
    remove: async (key) => { delete data[key]; }
  });
  // respond(path, request) → { status, body } | 'network-error'
  let respond = options.respond || (() => ({ status: 404, body: { success: false, code: 'link_pending' } }));
  // /api/ext-link-start (registering the pairing) succeeds unless a test says otherwise.
  let start = options.start || (() => ({ status: 200, body: { success: true, expires_in: 600 } }));
  const pro = TBPro.createPro({
    config,
    kv: area(local),
    session: area(sessionData),
    tokenStore: {
      get: async () => token, set: async (value) => { token = value; }, clear: async () => { token = null; meta = null; },
      getMeta: async () => structuredClone(meta), setMeta: async (value) => { meta = structuredClone(value); }
    },
    now: () => clock,
    crypto: webcrypto,
    sleep: async () => { clock += 3000; },
    openTab: async (url) => { opened.push(url); },
    clientInfo: () => ({ version: '0.1.0', label: 'Chrome · macOS' }),
    fetch: async (url, init) => {
      const request = { url, path: new URL(url).pathname.replace('/api/', ''), headers: init.headers, body: JSON.parse(init.body), credentials: init.credentials };
      calls.push(request);
      const answer = request.path === 'ext-link-start' ? start(request) : respond(request.path, request);
      if (answer === 'network-error') throw new TypeError('Failed to fetch');
      // Fake server: sign like api/_ext/credential.mjs, with the SERVER's clock (serverNow, default = clock).
      const body = answer.body && typeof answer.body === 'object' ? { ...answer.body } : answer.body;
      if (body && body.success && body.entitlement && !('credential' in body)) {
        const ent = body.entitlement;
        const iat = options.serverNow ? options.serverNow() : clock;
        const tok = body.token || token || '';
        const windowEnd = iat + (ent.recheck_after_s + ent.grace_s) * 1000;
        const mexp = ent.expires_at ? Date.parse(ent.expires_at) : NaN;
        const exp = !ent.pro ? iat + ent.recheck_after_s * 1000 : Number.isFinite(mexp) ? Math.min(mexp, windowEnd) : windowEnd;
        if (TOKEN_LIKE.test(tok)) body.credential = signCredential({ did: body.device_id || 'dev-1', token: tok, pro: ent.pro, reason: ent.reason, iat, exp, n: request.body.nonce });
      }
      return { status: answer.status, json: async () => body };
    }
  });
  return {
    pro, TBPro, config, local, sessionData, calls, opened,
    getToken: () => token,
    getMeta: () => meta,
    setMeta: (value) => { meta = value; },
    setStart: (fn) => { start = fn; },
    advance: (ms) => { clock += ms; },
    setClock: (ms) => { clock = ms; },
    now: () => clock,
    setRespond: (fn) => { respond = fn; }
  };
}

async function linked(options = {}) {
  const h = harness(options);
  h.setRespond((p) => p === 'ext-link-exchange'
    ? { status: 200, body: { success: true, token: TOKEN, device_id: 'dev-1', account_hint: 'y***@gmail.com', scopes: ['entitlement:read'], entitlement: entitlement(options.pro !== false) } }
    : { status: 500, body: null });
  await h.pro.beginConnect();
  assert.equal(await h.pro.pollOnce(), 'linked');
  h.calls.length = 0;
  return h;
}

test('a user who never connects causes no request at all', async () => {
  const h = harness();
  assert.equal((await h.pro.getState()).state, 'unlinked');
  assert.equal(await h.pro.refresh(), 'unlinked');
  assert.equal(await h.pro.maybeRefresh(), 'skipped');
  assert.equal(await h.pro.pollOnce(), 'idle');
  assert.equal(await h.pro.has('core'), true);
  assert.equal(await h.pro.has('proPlaceholder'), false);
  await h.pro.disconnect();
  assert.equal(h.calls.length, 0);
  assert.equal(h.opened.length, 0);
});

test('connect: only the challenge goes into the URL; the token never lands in chrome.storage', async () => {
  const h = harness();
  const { confirmCode } = await h.pro.beginConnect();
  assert.equal(h.opened.length, 1);
  const url = new URL(h.opened[0]);
  assert.equal(url.origin + url.pathname, 'https://tobooks.xin/ext-link.html');
  assert.equal(url.search, '', 'parameters belong after #');
  const params = new URLSearchParams(url.hash.slice(1));
  const pending = h.sessionData.tbLinkPending;
  assert.match(pending.verifier, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(params.get('c'), createHash('sha256').update(pending.verifier).digest('base64url'));
  assert.ok(!h.opened[0].includes(pending.verifier), 'the verifier must not be in the URL');
  assert.deepEqual([params.get('k'), params.get('v'), params.get('l')], ['chrome', '0.1.0', 'Chrome · macOS']);
  assert.match(confirmCode, /^\d{6}$/, 'a 6-digit code the user types on the web page');
  assert.ok(!h.opened[0].includes(confirmCode) || params.get('c').includes(confirmCode), 'the code is not a URL parameter');
  // The pairing is registered before the tab opens: challenge + code, nothing else, no credentials.
  assert.deepEqual([h.calls.length, h.calls[0].path], [1, 'ext-link-start']);
  assert.deepEqual(h.calls[0].body, { challenge: params.get('c'), confirm_code: confirmCode });
  assert.equal(h.calls[0].headers.Authorization, undefined);
  h.calls.length = 0;

  let state = await h.pro.getState();
  assert.deepEqual([state.state, state.confirmCode, state.pro], ['connecting', confirmCode, false]);
  assert.equal(await h.pro.pollOnce(), 'pending');
  assert.deepEqual(Object.keys(h.calls[0].body).sort(), ['nonce', 'verifier']);
  assert.equal(h.calls[0].body.verifier, pending.verifier);
  assert.match(h.calls[0].body.nonce, /^[A-Za-z0-9_-]{22}$/);
  assert.equal(h.calls[0].headers.Authorization, undefined);
  assert.equal(h.calls[0].credentials, 'omit');

  h.setRespond(() => ({ status: 200, body: { success: true, token: TOKEN, device_id: 'dev-1', account_hint: 'y***@gmail.com', scopes: ['entitlement:read'], entitlement: entitlement(true) } }));
  assert.equal(await h.pro.waitForLink(), 'linked');
  state = await h.pro.getState();
  assert.deepEqual([state.state, state.pro, state.accountHint], ['linked_pro', true, 'y***@gmail.com']);
  assert.equal(h.getToken(), TOKEN);
  assert.ok(!JSON.stringify(h.local).includes(TOKEN), 'token must not be in chrome.storage.local');
  assert.ok(!JSON.stringify(h.sessionData).includes(TOKEN));
  assert.equal(h.sessionData.tbLinkPending, undefined, 'verifier is dropped after linking');
  assert.ok(!JSON.stringify(h.local).includes('@gmail.com') || JSON.stringify(h.local).includes('y***@gmail.com'));
});

test('connect: non-member lands on Free; times out after 10 minutes; cancel works; bad token is refused', async () => {
  const free = await linked({ pro: false });
  assert.deepEqual([(await free.pro.getState()).state, await free.pro.has('proPlaceholder')], ['linked_free', false]);

  const slow = harness();
  await slow.pro.beginConnect();
  slow.advance(10 * 60 * 1000 + 1);
  assert.equal(await slow.pro.pollOnce(), 'expired');
  assert.equal((await slow.pro.getState()).state, 'unlinked');

  const cancelled = harness();
  await cancelled.pro.beginConnect();
  await cancelled.pro.cancelConnect();
  assert.equal(await cancelled.pro.pollOnce(), 'idle');

  const odd = harness({ respond: () => ({ status: 200, body: { success: true, token: 'not-a-device-token', entitlement: entitlement(true) } }) });
  await odd.pro.beginConnect();
  assert.equal(await odd.pro.pollOnce(), 'retry');
  assert.equal(odd.getToken(), null);

  const outage = harness({ respond: () => 'network-error' });
  await outage.pro.beginConnect();
  assert.equal(await outage.pro.pollOnce(), 'retry', 'a network error keeps the pending connection');
  assert.equal((await outage.pro.getState()).state, 'connecting');
});

test('re-check: 200 updates, a server "no" downgrades at once (no grace)', async () => {
  const h = await linked();
  assert.equal(await h.pro.maybeRefresh(), 'fresh');
  assert.equal(h.calls.length, 0, 'no request inside the re-check interval');

  h.advance(DAY + 1);
  h.setRespond(() => ({ status: 200, body: { success: true, entitlement: entitlement(false, 'expired'), account_hint: 'y***@gmail.com', device_id: 'dev-1', scopes: ['entitlement:read'] } }));
  assert.equal(await h.pro.maybeRefresh(), 'ok');
  assert.equal(h.calls[0].path, 'ext-entitlement');
  assert.equal(h.calls[0].headers.Authorization, `Bearer ${TOKEN}`);
  const state = await h.pro.getState();
  assert.deepEqual([state.state, state.pro, state.entitlement.reason], ['linked_free', false, 'expired']);
  assert.equal(h.getToken(), TOKEN, 'still connected, just not Pro');

  // Bought a membership: the next Pro click asks once and unlocks without reconnecting.
  h.setRespond(() => ({ status: 200, body: { success: true, entitlement: entitlement(true), account_hint: 'y***@gmail.com', device_id: 'dev-1', scopes: ['entitlement:read'] } }));
  assert.equal(await h.pro.has('proPlaceholder'), true);
});

test('401 drops the token and says why; 5xx and network errors never do', async () => {
  for (const answer of [{ status: 503, body: { success: false, code: 'service_unavailable' } }, { status: 500, body: null }, { status: 503, body: { success: false, code: 'link_disabled' } }, 'network-error']) {
    const h = await linked();
    h.setRespond(() => answer);
    assert.equal(await h.pro.refresh(), 'offline');
    assert.equal(h.getToken(), TOKEN);
    const state = await h.pro.getState();
    assert.deepEqual([state.state, state.pro, state.graceDaysLeft], ['offline_grace', true, 15], 'signed exp = iat + 1 day re-check + 14 days grace');
  }

  const h = await linked();
  h.setRespond(() => ({ status: 401, body: { success: false, code: 'token_invalid', revoked_reason: 'evicted' } }));
  assert.equal(await h.pro.refresh(), 'revoked');
  assert.equal(h.getToken(), null);
  const state = await h.pro.getState();
  assert.deepEqual([state.state, state.pro, state.notice.reason], ['unlinked', false, 'evicted']);
  assert.equal(h.local.tbLink, undefined);
  await h.pro.dismissNotice();
  assert.equal((await h.pro.getState()).notice, undefined);
});

test('offline grace: Pro on day 13, Free on day 15 (signed exp), Pro again once the server confirms', async () => {
  const h = await linked();
  h.setRespond(() => 'network-error');
  h.advance(13 * DAY);
  assert.equal(await h.pro.maybeRefresh(), 'offline');
  let state = await h.pro.getState();
  assert.deepEqual([state.state, state.pro, state.graceDaysLeft], ['offline_grace', true, 2]);
  assert.equal(await h.pro.has('proPlaceholder'), true);

  h.advance(2 * DAY);
  await h.pro.maybeRefresh();
  state = await h.pro.getState();
  assert.deepEqual([state.state, state.pro, state.graceExpired], ['linked_free', false, true]);
  assert.equal(h.getToken(), TOKEN, 'grace running out does not disconnect');

  h.setRespond(() => ({ status: 200, body: { success: true, entitlement: entitlement(true), account_hint: 'y***@gmail.com', device_id: 'dev-1', scopes: ['entitlement:read'] } }));
  assert.equal(await h.pro.maybeRefresh(), 'ok');
  assert.equal((await h.pro.getState()).state, 'linked_pro');
});

test('the server controls the re-check interval and the grace length', async () => {
  const h = await linked();
  h.setRespond(() => ({ status: 200, body: { success: true, entitlement: entitlement(true, 'paid', { recheck_after_s: 3600, grace_s: 2 * 86400 }) } }));
  await h.pro.refresh();
  h.calls.length = 0;
  h.advance(3600 * 1000 + 1);
  h.setRespond(() => 'network-error');
  assert.equal(await h.pro.maybeRefresh(), 'offline');
  assert.equal((await h.pro.getState()).graceDaysLeft, 2);
  h.advance(2 * DAY);
  assert.equal((await h.pro.getState()).pro, false);
});

test('disconnect clears local state even when the server is unreachable', async () => {
  const h = await linked();
  h.setRespond(() => 'network-error');
  await h.pro.disconnect();
  assert.equal(h.getToken(), null);
  assert.equal(h.local.tbLink, undefined);
  assert.equal((await h.pro.getState()).state, 'unlinked');
  assert.deepEqual(h.calls.map((c) => [c.path, c.headers.Authorization]), [['ext-unlink', `Bearer ${TOKEN}`]]);
});

test('every request goes to https://tobooks.xin/api/ext-* and nowhere else', async () => {
  const h = await linked();
  h.setRespond(() => ({ status: 200, body: { success: true, entitlement: entitlement(true) } }));
  await h.pro.refresh();
  await h.pro.disconnect();
  await h.pro.beginConnect();
  await h.pro.pollOnce();
  assert.ok(h.calls.length >= 4);
  for (const call of h.calls) assert.match(call.url, /^https:\/\/tobooks\.xin\/api\/ext-(link-start|link-exchange|entitlement|unlink)$/);
});

test('a broken Pro module never blocks a free feature', async () => {
  const { TBPro, config } = loadModules();
  const boom = async () => { throw new Error('storage unavailable'); };
  const pro = TBPro.createPro({
    config, kv: { get: boom, set: boom, remove: boom }, session: { get: boom, set: boom, remove: boom },
    tokenStore: { get: boom, set: boom, clear: boom, getMeta: boom, setMeta: boom }, crypto: webcrypto, fetch: boom, openTab: boom
  });
  assert.equal(await pro.has('core'), true);
  assert.equal(await pro.has('proPlaceholder'), false);
  assert.equal(await pro.has('no-such-feature'), false);
  for (const feature of config.features.filter((f) => f.tier === 'free')) assert.equal(await pro.has(feature.id), true);
});

test('deriveState covers every state (only a verified credential can say Pro)', () => {
  const { TBPro, config } = loadModules();
  const now = 1_000_000_000_000;
  const d = (input) => TBPro.deriveState({ now, config, ...input });
  const link = (ent, extra = {}) => ({ entitlement: ent, lastOkAt: now, lastCheckFailed: false, accountHint: 'y***@gmail.com', ...extra });
  const v = (pro, extra = {}) => ({ v: 1, pro, reason: pro ? 'paid' : 'none', iat: now, exp: now + 15 * DAY, ...extra });
  assert.deepEqual({ ...d({ hasToken: false, pending: false }) }, { state: 'unlinked', pro: false });
  assert.deepEqual({ ...d({ hasToken: false, pending: true }) }, { state: 'connecting', pro: false });
  assert.equal(d({ hasToken: true, link: link({ pro: true, reason: 'paid' }), verified: v(true) }).state, 'linked_pro');
  assert.equal(d({ hasToken: true, link: link({ pro: false, reason: 'none' }), verified: v(false) }).state, 'linked_free');
  assert.equal(d({ hasToken: true, link: link({ pro: true, reason: 'paid' }, { lastCheckFailed: true }), verified: v(true) }).state, 'offline_grace');
  assert.equal(d({ hasToken: true, link: link({ pro: true }), verified: v(true, { exp: now }) }).pro, false, 'signed exp reached');
  const unsigned = d({ hasToken: true, link: link({ pro: true, reason: 'paid' }), verified: null });
  assert.deepEqual([unsigned.state, unsigned.pro, unsigned.unverified], ['linked_free', false, true], 'plain stored pro:true is not Pro');
  assert.equal(d({ hasToken: true, link: null }).state, 'linked_free', 'a token without status is Free until the next check');
  assert.equal(d({ hasToken: true, link: link({ pro: true, reason: 'legacy_grace' }), verified: v(true, { reason: 'legacy_grace' }) }).pro, true);
});

// ---- Review P1-1 (2026-11-25): local entitlement must be signed --------------------------------------------

const offline = (h) => h.setRespond(() => 'network-error');

test('P1-1: editing chrome.storage.local to pro:true does not unlock anything', async () => {
  const h = await linked({ pro: false });
  offline(h);
  h.local.tbLink.entitlement.pro = true;            // what someone would do in DevTools
  h.local.tbLink.entitlement.reason = 'paid';
  h.local.tbLink.lastOkAt = h.now();
  let state = await h.pro.getState();
  assert.deepEqual([state.state, state.pro, state.unverified], ['linked_free', false, true]);
  assert.equal(await h.pro.has('proPlaceholder'), false);

  // Delete the credential, or replace it with garbage: still Free.
  for (const credential of [null, 'tbe1.test1.e30.AAAA', 'not-a-credential']) {
    h.local.tbLink.credential = credential;
    assert.equal((await h.pro.getState()).pro, false, String(credential));
  }
});

test('P1-1: a credential with an edited payload, another key, unknown kid or wrong audience fails to verify', async () => {
  const h = await linked({ pro: false });
  offline(h);
  const good = h.local.tbLink.credential;
  const [prefix, kid, payloadB64, sig] = good.split('.');
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  assert.equal(payload.pro, false);
  const edited = Buffer.from(JSON.stringify({ ...payload, pro: true, reason: 'paid' })).toString('base64url');
  const base = { token: TOKEN, pro: true, iat: h.now(), exp: h.now() + 15 * DAY };
  const cases = {
    'payload edited, old signature kept': [prefix, kid, edited, sig].join('.'),
    'signed with a key the extension does not know': signCredential({ ...base, key: OTHER_KEY.privateKey }),
    'unknown kid': signCredential({ ...base, kid: 'nope' }),
    'wrong audience': signCredential({ ...base, aud: 'someone-else' }),
    'signature of another credential': [prefix, kid, edited, signCredential(base).split('.')[3].replace(/^./, (c) => (c === 'A' ? 'B' : 'A'))].join('.')
  };
  for (const [name, credential] of Object.entries(cases)) {
    h.local.tbLink.credential = credential;
    h.local.tbLink.entitlement.pro = true;
    const state = await h.pro.getState();
    assert.equal(state.pro, false, name);
    assert.equal(await h.pro.has('proPlaceholder'), false, name);
  }
  // Control: the same signer with the right key does verify (so the cases above fail for the right reason).
  h.local.tbLink.credential = signCredential(base);
  assert.equal((await h.pro.getState()).pro, true);
});

test('P1-1: a valid Pro credential copied from another install (other token or device) does not verify', async () => {
  const h = await linked({ pro: false });
  offline(h);
  const otherToken = `tbx_${'B'.repeat(43)}`;
  h.local.tbLink.credential = signCredential({ token: otherToken, pro: true, iat: h.now(), exp: h.now() + 15 * DAY });
  assert.equal((await h.pro.getState()).pro, false, 'bound to another device token');
  h.local.tbLink.credential = signCredential({ token: TOKEN, did: 'dev-OTHER', pro: true, iat: h.now(), exp: h.now() + 15 * DAY });
  assert.equal((await h.pro.getState()).pro, false, 'bound to another device id');
});

test('P1-1: the shipped config has no key, so nothing can be Pro until the owner adds one', async () => {
  const shipped = loadModules({ keys: null }).config;
  assert.deepEqual(JSON.parse(JSON.stringify(shipped.entitlementKeys)), {});
  const h = harness({ keys: null });
  h.setRespond(() => ({ status: 200, body: { success: true, token: TOKEN, device_id: 'dev-1', scopes: ['entitlement:read'], entitlement: entitlement(true) } }));
  await h.pro.beginConnect();
  assert.equal(await h.pro.pollOnce(), 'linked');
  const state = await h.pro.getState();
  assert.deepEqual([state.state, state.pro], ['linked_free', false]);
  assert.ok(!/tbx_|"d":/.test(read('js/pro-config.js')), 'no token or private key material in the config');
});

test('P1-1: setting the system clock back does not extend the offline grace', async () => {
  // The server has its own clock: setting the computer's clock back does not move it.
  let serverTime = Date.parse('2026-12-01T00:00:00Z');
  const h = await linked({ serverNow: () => serverTime }); // Pro, signed at T0, exp = T0 + 15 days
  offline(h);
  h.advance(14 * DAY);
  await h.pro.maybeRefresh();
  let state = await h.pro.getState();
  assert.deepEqual([state.state, state.pro, state.graceDaysLeft], ['offline_grace', true, 1]);

  h.advance(-10 * DAY);                           // clock set back 10 days
  state = await h.pro.getState();
  assert.deepEqual([state.pro, state.clockRolledBack], [false, true], 'set back → no offline Pro at all (not 11 days left, not frozen)');
  assert.equal(await h.pro.has('proPlaceholder'), false);
  assert.equal(await h.pro.maybeRefresh(), 'offline', 'a clock set back forces a re-check instead of postponing it');

  h.advance(9 * DAY);                             // still behind the highest time seen
  assert.equal((await h.pro.getState()).pro, false);
  h.advance(-30 * DAY);                           // set back even further
  assert.equal((await h.pro.getState()).pro, false);

  // Small backwards jumps (NTP corrections) under 10 minutes are tolerated.
  const g = await linked();
  offline(g);
  g.advance(DAY);
  await g.pro.getState();
  g.advance(-5 * 60 * 1000);
  assert.equal((await g.pro.getState()).pro, true);

  // Back online: the server re-anchors the clock and Pro returns, even with the clock still wrong.
  serverTime += 23 * DAY;                         // 14 + 9 real days have passed for the server
  h.setRespond(() => ({ status: 200, body: { success: true, entitlement: entitlement(true), account_hint: 'y***@gmail.com', device_id: 'dev-1', scopes: ['entitlement:read'] } }));
  assert.equal(await h.pro.refresh(), 'ok');
  assert.equal((await h.pro.getState()).state, 'linked_pro');
});

test('P1-1: without touching storage, setting the clock back after going offline never yields more Pro time', async () => {
  // Sweep: go offline at day 0, at day k set the clock back by b days, then let time run; count Pro days.
  for (const k of [1, 7, 13, 14]) {
    for (const back of [1, 5, 30]) {
      const h = await linked();
      offline(h);
      let proMs = 0;
      const STEP = 6 * 3600 * 1000;                     // the extension looks at the clock every 6 hours
      for (let t = 0; t < 40 * DAY; t += STEP) {
        h.advance(STEP);
        if ((await h.pro.getState()).pro) proMs += STEP;
        if (t + STEP === k * DAY) h.advance(-back * DAY); // right after a look, the clock is set back
      }
      // Without any roll-back: Pro for 15 days minus the last step (signed exp = 15 days after linking).
      assert.ok(proMs <= 15 * DAY, `k=${k} back=${back}: ${proMs / DAY} Pro days`);
      assert.ok(proMs <= k * DAY + STEP, `k=${k} back=${back}: Pro must stop at the roll-back, got ${proMs / DAY} days`);
    }
  }
});

test('P1-1: a clock that was already behind uses the signed server time as its floor', async () => {
  // The machine's clock is 30 days behind the server when it links.
  const serverOffset = 30 * DAY;
  const h = harness({ serverNow: () => h.now() + serverOffset });
  h.setRespond(() => ({ status: 200, body: { success: true, token: TOKEN, device_id: 'dev-1', scopes: ['entitlement:read'], entitlement: entitlement(true) } }));
  await h.pro.beginConnect();
  assert.equal(await h.pro.pollOnce(), 'linked');
  offline(h);
  assert.equal((await h.pro.getState()).graceDaysLeft, undefined, 'online, linked_pro');
  h.advance(15 * DAY);                            // 15 real days later; local clock still 30 days behind
  await h.pro.maybeRefresh();
  const state = await h.pro.getState();
  assert.equal(state.pro, false, 'grace measured from the server time, not from the slow local clock + 30 days');
});

test('P1-1: membership end inside the grace window wins (signed exp = min of the two)', async () => {
  const h = harness();
  const ends = new Date(h.now() + 2 * DAY).toISOString();
  h.setRespond(() => ({ status: 200, body: { success: true, token: TOKEN, device_id: 'dev-1', scopes: ['entitlement:read'], entitlement: entitlement(true, 'paid', { expires_at: ends }) } }));
  await h.pro.beginConnect();
  await h.pro.pollOnce();
  offline(h);
  h.advance(2 * DAY + 1);
  await h.pro.maybeRefresh();
  assert.equal((await h.pro.getState()).pro, false, 'subscription ended on day 2; no 14 extra days');
});

// ---- Review round 2 (2026-11-26): P2-A replay / iat, P2-1 random code, P3-1/2/4 ---------------------------------

const answerPro = () => ({ status: 200, body: { success: true, entitlement: entitlement(true), account_hint: 'y***@gmail.com', device_id: 'dev-1', scopes: ['entitlement:read'] } });
const answerFree = () => ({ status: 200, body: { success: true, entitlement: entitlement(false, 'expired'), account_hint: 'y***@gmail.com', device_id: 'dev-1', scopes: ['entitlement:read'] } });

test('P2-A: an old Pro credential put back into storage after the server said "not Pro" unlocks nothing', async () => {
  const h = await linked();                          // Pro, signed at T0
  const oldLink = structuredClone(h.local.tbLink);   // the user backs up chrome.storage.local
  const oldClock = structuredClone(h.local.tbClockHW);
  assert.equal((await h.pro.getState()).pro, true);
  const t0 = h.now();
  assert.deepEqual(h.getMeta(), { deviceId: 'dev-1', iat: t0 }, 'the newest accepted iat is kept next to the token');

  h.advance(DAY);
  h.setRespond(answerFree);                          // refund: the server signs pro:false at T0 + 1 day
  assert.equal(await h.pro.refresh(), 'ok');
  assert.equal((await h.pro.getState()).pro, false);
  assert.equal(h.getMeta().iat, t0 + DAY);

  offline(h);
  h.local.tbLink = structuredClone(oldLink);         // restore the whole backed-up record
  let state = await h.pro.getState();
  assert.deepEqual([state.state, state.pro, state.unverified], ['linked_free', false, true], 'older than the newest accepted credential');
  assert.equal(await h.pro.has('proPlaceholder'), false);
  h.local.tbClockHW = structuredClone(oldClock);     // and the clock record too: still nothing
  assert.equal((await h.pro.getState()).pro, false);
  assert.equal(await h.pro.maybeRefresh(), 'offline');
  assert.equal((await h.pro.getState()).pro, false);

  // Why it holds: the floor lives with the token. This is the stated limit — whoever also rewrites that
  // record (DevTools on the extension's own page) gets the old credential back until its signed exp.
  h.setMeta({ deviceId: 'dev-1', iat: 0 });
  assert.equal((await h.pro.getState()).pro, true, 'control: without the floor the old credential would verify');
});

test('P2-A: a recorded old server response is refused (nonce), and never moves the clock or the floor', async () => {
  const h = await linked();
  let recorded = null;
  h.setRespond((path, request) => {
    const answer = answerPro();
    recorded = { request, answer };
    return answer;
  });
  h.advance(DAY + 1);
  assert.equal(await h.pro.refresh(), 'ok');
  // The harness signs inside fetch; what was stored is exactly what the server sent.
  const recordedBody = { ...recorded.answer.body, credential: h.local.tbLink.credential };
  const nonce1 = recorded.request.body.nonce;
  assert.match(nonce1, /^[A-Za-z0-9_-]{22}$/);

  h.advance(DAY + 1);
  h.setRespond(answerFree);
  assert.equal(await h.pro.refresh(), 'ok');
  assert.equal((await h.pro.getState()).pro, false);
  const floor = h.getMeta().iat;
  const clockBefore = structuredClone(h.local.tbClockHW);

  // Someone in the middle answers every later request with the recorded "Pro" response.
  let nonce2 = null;
  h.setRespond((path, request) => { nonce2 = request.body.nonce; return { status: 200, body: structuredClone(recordedBody) }; });
  h.advance(3600 * 1000);
  assert.equal(await h.pro.refresh(), 'unverified');
  assert.notEqual(nonce2, nonce1, 'a new nonce for every request');
  const state = await h.pro.getState();
  assert.deepEqual([state.state, state.pro], ['linked_free', false]);
  assert.equal(await h.pro.has('proPlaceholder'), false);
  assert.equal(h.getMeta().iat, floor, 'the floor did not move');
  assert.equal(h.local.tbClockHW.skew, clockBefore.skew, 'the clock was not re-anchored to the old iat');
  assert.equal(h.local.tbLink.entitlement.pro, false, 'not even the display text was replaced');

  // A credential with the right nonce but an iat below the floor (server clock stepped back, or a second
  // signer that lags) is refused as well.
  const lag = harness({ serverNow: () => lagNow });
  let lagNow = lag.now();
  lag.setRespond((p) => p === 'ext-link-exchange'
    ? { status: 200, body: { success: true, token: TOKEN, device_id: 'dev-1', scopes: ['entitlement:read'], entitlement: entitlement(false) } } : answerPro());
  await lag.pro.beginConnect();
  assert.equal(await lag.pro.pollOnce(), 'linked');
  lagNow -= 60 * 1000;
  assert.equal(await lag.pro.refresh(), 'unverified');
  assert.equal((await lag.pro.getState()).pro, false);
  lagNow += 120 * 1000;
  assert.equal(await lag.pro.refresh(), 'ok');
  assert.equal((await lag.pro.getState()).pro, true);
});

test('P2-A: a credential without the nonce, or with another nonce, is not accepted', async () => {
  for (const n of [undefined, 'A'.repeat(22)]) {
    const h = await linked({ pro: false });
    h.setRespond(() => {
      const body = answerPro().body;
      body.credential = signCredential({ token: TOKEN, pro: true, iat: h.now(), exp: h.now() + 15 * DAY, n });
      return { status: 200, body };
    });
    h.advance(1000);
    assert.equal(await h.pro.refresh(), 'unverified', String(n));
    assert.equal((await h.pro.getState()).pro, false, String(n));
    assert.equal(await h.pro.has('proPlaceholder'), false, String(n));
  }
  // At link time too: an exchange answer whose credential lacks the nonce links the device but is not Pro.
  const h = harness();
  h.setRespond(() => ({ status: 200, body: { success: true, token: TOKEN, device_id: 'dev-1', scopes: ['entitlement:read'], entitlement: entitlement(true),
    credential: signCredential({ token: TOKEN, pro: true, iat: h.now(), exp: h.now() + 15 * DAY }) } }));
  await h.pro.beginConnect();
  assert.equal(await h.pro.pollOnce(), 'linked');
  offline(h);
  const state = await h.pro.getState();
  assert.deepEqual([state.state, state.pro, state.unverified], ['linked_free', false, true]);
  assert.equal(h.local.tbLink.credential, null, 'an unverified credential is not even stored');
});

test('P3-1: the device id is checked strictly and comes from the token store, not from chrome.storage.local', async () => {
  const h = await linked();
  offline(h);
  assert.equal((await h.pro.getState()).pro, true);
  // Round 2 finding: emptying link.deviceId used to skip the device check. It no longer takes part.
  h.local.tbLink.deviceId = null;
  h.local.tbLink.credential = signCredential({ token: TOKEN, did: 'dev-OTHER', pro: true, iat: h.now(), exp: h.now() + 15 * DAY });
  assert.equal((await h.pro.getState()).pro, false, 'another device id, link.deviceId emptied');
  h.local.tbLink.deviceId = 'dev-OTHER';
  assert.equal((await h.pro.getState()).pro, false, 'another device id, link.deviceId edited to match');
  h.local.tbLink.credential = signCredential({ token: TOKEN, did: 'dev-1', pro: true, iat: h.now(), exp: h.now() + 15 * DAY });
  assert.equal((await h.pro.getState()).pro, true, 'control');
  for (const meta of [null, {}, { deviceId: '', iat: 0 }, { deviceId: 42, iat: 0 }]) {
    h.setMeta(meta);
    assert.equal((await h.pro.getState()).pro, false, `no usable device id (${JSON.stringify(meta)}) → not verified`);
  }
  const { TBPro, config } = loadModules();
  const cred = signCredential({ token: TOKEN, pro: true, iat: 1, exp: 2 });
  const tkh = createHash('sha256').update(TOKEN).digest('base64url').slice(0, 22);
  assert.equal(await TBPro.verifyCredential(webcrypto, config.entitlementKeys, cred, { tokenBinding: tkh }), null, 'no expected device id');
  assert.equal(await TBPro.verifyCredential(webcrypto, config.entitlementKeys, cred, { deviceId: 'dev-1' }), null, 'no expected token binding');
  assert.equal((await TBPro.verifyCredential(webcrypto, config.entitlementKeys, cred, { deviceId: 'dev-1', tokenBinding: tkh })).pro, true);
});

test('P3-2: an answer that cannot be verified (unsigned server, rotated key) does not turn a paying user Free at once', async () => {
  const unsigned = () => ({ status: 200, body: { ...answerPro().body, credential: null } });
  const rotated = (h) => (path, request) => ({ status: 200, body: { ...answerPro().body,
    credential: signCredential({ token: TOKEN, pro: true, iat: h.now(), exp: h.now() + 15 * DAY, kid: 'next', key: OTHER_KEY.privateKey, n: request.body.nonce }) } });
  for (const make of [() => unsigned, rotated]) {
    const h = await linked();
    const before = h.local.tbLink.credential;
    h.advance(DAY + 1);
    h.setRespond(make(h));
    assert.equal(await h.pro.maybeRefresh(), 'unverified');
    let state = await h.pro.getState();
    assert.deepEqual([state.state, state.pro, state.graceDaysLeft], ['offline_grace', true, 14], 'kept, shown like an offline check');
    assert.equal(h.local.tbLink.credential, before);
    assert.equal(await h.pro.has('proPlaceholder'), true);
    // Bounded by the signed exp of the credential that was kept: no free extension.
    h.advance(14 * DAY);
    await h.pro.maybeRefresh();
    state = await h.pro.getState();
    assert.deepEqual([state.pro, state.graceExpired], [false, true]);
    // The server signs properly again → back to normal.
    h.setRespond(answerPro);
    assert.equal(await h.pro.refresh(), 'ok');
    assert.equal((await h.pro.getState()).state, 'linked_pro');
  }
  // A signed "not Pro" is still obeyed at once (this is not a way to ignore a refund).
  const h = await linked();
  h.advance(1000);
  h.setRespond(answerFree);
  assert.equal(await h.pro.refresh(), 'ok');
  assert.equal((await h.pro.getState()).pro, false);
});

test('P3-4: has() re-checks after the signed validity ran out; overlapping refreshes share one request', async () => {
  const h = await linked();
  h.advance(15 * DAY + 1);                           // panel left open past exp; no maybeRefresh ran
  let state = await h.pro.getState();
  assert.deepEqual([state.pro, state.graceExpired], [false, true]);
  h.setRespond(answerPro);                           // the user is online and still a member
  assert.equal(await h.pro.has('proPlaceholder'), true, 'asks the server instead of refusing a paying user');
  assert.equal(h.calls.filter((c) => c.path === 'ext-entitlement').length, 1);

  h.calls.length = 0;
  const results = await Promise.all([h.pro.refresh(), h.pro.refresh(), h.pro.has('core'), h.pro.refresh()]);
  assert.deepEqual(results, ['ok', 'ok', true, 'ok']);
  assert.equal(h.calls.length, 1, 'one request in flight at a time, so an older answer cannot land after a newer one');
  assert.equal(await h.pro.refresh(), 'ok');
  assert.equal(h.calls.length, 2, 'a later call asks again');
});

test('P2-1: the confirmation code is random, registered with the server first, and not derived from the challenge', async () => {
  const codes = new Set();
  for (let i = 0; i < 40; i++) {
    const h = harness();
    const { confirmCode } = await h.pro.beginConnect();
    assert.match(confirmCode, /^\d{6}$/);
    assert.equal((await h.pro.getState()).confirmCode, confirmCode);
    assert.equal(h.calls[0].body.confirm_code, confirmCode);
    codes.add(confirmCode);
  }
  assert.ok(codes.size >= 38, `40 connections gave ${codes.size} different codes`);

  // Same verifier and challenge (random bytes pinned), different code source → different code: no formula links them.
  const { TBPro } = loadModules();
  const feed = (values) => ({ getRandomValues: (buf) => { buf[0] = values.shift(); return buf; } });
  assert.equal(TBPro.randomConfirmCode(feed([123])), '000123');
  assert.equal(TBPro.randomConfirmCode(feed([4294967295, 4294000000, 999999])), '999999', 'values that would bias the modulo are drawn again');
  assert.equal(TBPro.randomConfirmCode(feed([4293999999])), '999999');
  assert.equal(TBPro.confirmCodeFor, undefined, 'the challenge-derived formula is gone');

  // Registration fails → nothing opens, nothing is pending, and the caller is told why.
  for (const [start, error] of [[() => 'network-error', 'offline'], [() => ({ status: 503, body: { success: false, code: 'link_disabled' } }), 'unavailable'],
    [() => ({ status: 409, body: { success: false, code: 'challenge_used' } }), 'unavailable'], [() => ({ status: 200, body: null }), 'unavailable']]) {
    const h = harness({ start });
    assert.deepEqual({ ...(await h.pro.beginConnect()) }, { error });
    assert.equal(h.opened.length, 0);
    assert.equal(h.sessionData.tbLinkPending, undefined);
    assert.equal((await h.pro.getState()).state, 'unlinked');
    assert.equal(await h.pro.pollOnce(), 'idle');
  }
  const ui = read('js/pro-ui.js');
  assert.match(ui, /started\.error/);
  assert.match(ui, /clockRolledBack/, 'P3-3: the panel says why Pro is paused after a clock roll-back');
});

test('undecided business rules are placeholders in one file, not decisions', () => {
  const { config } = loadModules();
  assert.equal(config.pricing.priceLabel, null);
  assert.equal(config.billingModel, 'undecided');
  assert.ok(config.legacyGraceNote.zh && config.legacyGraceNote.en);
  const proFeatures = config.features.filter((f) => f.tier === 'pro');
  assert.ok(proFeatures.length >= 1 && proFeatures.every((f) => f.placeholder === true), 'no real feature is declared Pro yet');
  const ui = read('js/pro-ui.js');
  assert.ok(!/\$\s?\d|¥\s?\d|US\$/.test(ui + read('js/pro.js')), 'no price is hard-coded outside pro-config.js');
});

test('wiring: no new permissions, scripts load after the app, UI builds DOM without innerHTML', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.deepEqual(manifest.permissions, ['sidePanel', 'declarativeNetRequest', 'declarativeNetRequestWithHostAccess', 'tabs', 'activeTab', 'storage', 'nativeMessaging', 'cookies', 'scripting', 'contextMenus']);
  const html = read('index.html');
  const order = ['js/popup.js', 'js/pro-config.js', 'js/pro.js', 'js/pro-ui.js'].map((file) => html.indexOf(`<script src="${file}"></script>`));
  assert.ok(order.every((index) => index > 0) && order.join() === [...order].sort((a, b) => a - b).join());
  const ui = read('js/pro-ui.js');
  assert.ok(!/innerHTML|insertAdjacentHTML|document\.write/.test(ui));
  assert.ok(!/chrome\.storage\.local[\s\S]{0,80}token/i.test(read('js/pro.js').replace(/\/\/.*$/gm, '')));
  // Content scripts must not learn about the link.
  for (const file of fs.readdirSync(path.join(ROOT, 'content-scripts')).filter((name) => name.endsWith('.js'))) {
    assert.ok(!/tbLink|AISidebarAuth|tbx_/.test(read(`content-scripts/${file}`)), file);
  }
});
