// Unit tests for the ToBooks account link (js/pro.js, js/pro-config.js). No network: fetch is a stub.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto, createHash } = require('node:crypto');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

function loadModules() {
  const context = { btoa, TextEncoder, URLSearchParams, AbortController, setTimeout, clearTimeout, console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(read('js/pro-config.js'), context, { filename: 'js/pro-config.js' });
  vm.runInContext(read('js/pro.js'), context, { filename: 'js/pro.js' });
  return { TBPro: context.TBPro, config: context.TB_PRO_CONFIG };
}

const DAY = 86400000;
const TOKEN = `tbx_${'A'.repeat(43)}`;
const entitlement = (pro, reason = pro ? 'paid' : 'none', extra = {}) => ({
  pro, reason, plan: pro ? 'tobooks_member' : null, billing_model: 'undecided', expires_at: null,
  recheck_after_s: 86400, grace_s: 14 * 86400, offer: { price_label: null, purchase_url: 'https://tobooks.xin/?from=ai-sidebar' }, ...extra
});

function harness(options = {}) {
  const { TBPro, config } = loadModules();
  const local = structuredClone(options.local || {});
  const sessionData = {};
  const calls = [];
  const opened = [];
  let token = options.token || null;
  let clock = options.now || Date.parse('2026-12-01T00:00:00Z');
  const area = (data) => ({
    get: async (key) => structuredClone(data[key]),
    set: async (key, value) => { data[key] = structuredClone(value); },
    remove: async (key) => { delete data[key]; }
  });
  // respond(path, request) → { status, body } | 'network-error'
  let respond = options.respond || (() => ({ status: 404, body: { success: false, code: 'link_pending' } }));
  const pro = TBPro.createPro({
    config,
    kv: area(local),
    session: area(sessionData),
    tokenStore: { get: async () => token, set: async (value) => { token = value; }, clear: async () => { token = null; } },
    now: () => clock,
    crypto: webcrypto,
    sleep: async () => { clock += 3000; },
    openTab: async (url) => { opened.push(url); },
    clientInfo: () => ({ version: '0.1.0', label: 'Chrome · macOS' }),
    fetch: async (url, init) => {
      const request = { url, path: new URL(url).pathname.replace('/api/', ''), headers: init.headers, body: JSON.parse(init.body), credentials: init.credentials };
      calls.push(request);
      const answer = respond(request.path, request);
      if (answer === 'network-error') throw new TypeError('Failed to fetch');
      return { status: answer.status, json: async () => answer.body };
    }
  });
  return {
    pro, TBPro, config, local, sessionData, calls, opened,
    getToken: () => token,
    advance: (ms) => { clock += ms; },
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
  assert.equal(confirmCode, params.get('c').slice(0, 6));

  let state = await h.pro.getState();
  assert.deepEqual([state.state, state.confirmCode, state.pro], ['connecting', confirmCode, false]);
  assert.equal(await h.pro.pollOnce(), 'pending');
  assert.deepEqual(h.calls[0].body, { verifier: pending.verifier });
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
    assert.deepEqual([state.state, state.pro, state.graceDaysLeft], ['offline_grace', true, 14]);
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

test('offline grace: Pro on day 13, Free on day 15, Pro again once the server confirms', async () => {
  const h = await linked();
  h.setRespond(() => 'network-error');
  h.advance(13 * DAY);
  assert.equal(await h.pro.maybeRefresh(), 'offline');
  let state = await h.pro.getState();
  assert.deepEqual([state.state, state.pro, state.graceDaysLeft], ['offline_grace', true, 1]);
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
  assert.ok(h.calls.length >= 3);
  for (const call of h.calls) assert.match(call.url, /^https:\/\/tobooks\.xin\/api\/ext-(link-exchange|entitlement|unlink)$/);
});

test('a broken Pro module never blocks a free feature', async () => {
  const { TBPro, config } = loadModules();
  const boom = async () => { throw new Error('storage unavailable'); };
  const pro = TBPro.createPro({
    config, kv: { get: boom, set: boom, remove: boom }, session: { get: boom, set: boom, remove: boom },
    tokenStore: { get: boom, set: boom, clear: boom }, crypto: webcrypto, fetch: boom, openTab: boom
  });
  assert.equal(await pro.has('core'), true);
  assert.equal(await pro.has('proPlaceholder'), false);
  assert.equal(await pro.has('no-such-feature'), false);
  for (const feature of config.features.filter((f) => f.tier === 'free')) assert.equal(await pro.has(feature.id), true);
});

test('deriveState covers every state', () => {
  const { TBPro, config } = loadModules();
  const now = 1_000_000_000_000;
  const d = (input) => TBPro.deriveState({ now, config, ...input });
  const link = (ent, extra = {}) => ({ entitlement: ent, lastOkAt: now, lastCheckFailed: false, graceS: 14 * 86400, accountHint: 'y***@gmail.com', ...extra });
  assert.deepEqual({ ...d({ hasToken: false, pending: false }) }, { state: 'unlinked', pro: false });
  assert.deepEqual({ ...d({ hasToken: false, pending: true }) }, { state: 'connecting', pro: false });
  assert.equal(d({ hasToken: true, link: link({ pro: true, reason: 'paid' }) }).state, 'linked_pro');
  assert.equal(d({ hasToken: true, link: link({ pro: false, reason: 'none' }) }).state, 'linked_free');
  assert.equal(d({ hasToken: true, link: link({ pro: true, reason: 'paid' }, { lastCheckFailed: true }) }).state, 'offline_grace');
  assert.equal(d({ hasToken: true, link: link({ pro: true, reason: 'paid' }, { lastOkAt: now - 15 * DAY }) }).pro, false);
  assert.equal(d({ hasToken: true, link: null }).state, 'linked_free', 'a token without status is Free until the next check');
  assert.equal(d({ hasToken: true, link: link({ pro: true, reason: 'legacy_grace' }) }).pro, true);
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
