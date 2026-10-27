const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const test = require('node:test');

const ROOT = `${path.resolve(__dirname, '..')}${path.sep}`;

function loadBackgroundHarness(options = {}) {
  const storage = structuredClone(options.storage || {});
  const dnrCalls = [];
  let dynamicRules = structuredClone(options.dynamicRules || []);
  let sessionRules = structuredClone(options.sessionRules || []);
  let onMessage;
  let onTabUpdated;
  const event = (capture) => ({ addListener(fn) { if (capture) capture(fn); } });
  const updateRules = (current, payload) => [
    ...current.filter((rule) => !(payload.removeRuleIds || []).includes(rule.id)),
    ...(payload.addRules || []).map((rule) => structuredClone(rule))
  ];
  const extensionId = 'a'.repeat(32);
  const chrome = {
    runtime: {
      id: extensionId,
      getURL: (path = '') => `chrome-extension://${extensionId}/${path}`,
      onInstalled: event(),
      onStartup: event(),
      onMessage: event((fn) => { onMessage = fn; }),
      sendMessage: async () => ({}),
      sendNativeMessage: async () => ({}),
      lastError: null
    },
    declarativeNetRequest: {
      updateDynamicRules: async (payload) => {
        dnrCalls.push({ scope: 'dynamic', payload: structuredClone(payload) });
        dynamicRules = updateRules(dynamicRules, payload);
      },
      getDynamicRules: async () => structuredClone(dynamicRules),
      updateSessionRules: async (payload) => {
        dnrCalls.push({ scope: 'session', payload: structuredClone(payload) });
        sessionRules = updateRules(sessionRules, payload);
      },
      getSessionRules: async () => structuredClone(sessionRules)
    },
    storage: { local: {
      async get(keys) {
        return Object.fromEntries(keys.map((key) => [key, storage[key]]));
      },
      async set(values) {
        await Promise.resolve();
        Object.assign(storage, structuredClone(values));
      }
    } },
    sidePanel: { setPanelBehavior: async () => {}, open: async () => {} },
    contextMenus: { removeAll: async () => {}, create: () => {}, onClicked: event() },
    cookies: { getAll: async () => [], set: async () => {}, onChanged: event() },
    commands: { onCommand: event() },
    tabs: {
      query: async () => [],
      sendMessage: async () => {},
      captureVisibleTab: async () => '',
      onRemoved: event(),
      onUpdated: event((fn) => { onTabUpdated = fn; })
    },
    windows: { getCurrent: async () => ({ id: 1 }) },
    permissions: { contains: async () => true, request: async () => true },
    scripting: { executeScript: async () => [] }
  };

  const context = {
    chrome,
    console,
    setTimeout,
    clearTimeout,
    URL,
    Blob,
    crypto: webcrypto,
    structuredClone,
    btoa
  };
  const source = fs.readFileSync(`${ROOT}js/background.js`, 'utf8');
  vm.runInNewContext(source, context, { filename: 'background.js' });
  const send = (message, sender = { url: 'https://example.test/' }) => new Promise((resolve) => {
    onMessage(message, sender, resolve);
  });
  return {
    chrome,
    dnrCalls,
    send,
    storage,
    getDynamicRules: () => structuredClone(dynamicRules),
    getSessionRules: () => structuredClone(sessionRules),
    emitTabUpdated: (tabId, changeInfo) => onTabUpdated?.(tabId, changeInfo, {})
  };
}

test('DNR header removal is scoped to extension-owned subframes', async () => {
  const { chrome, dnrCalls } = loadBackgroundHarness();
  await new Promise(setImmediate);
  const rules = dnrCalls.find((call) => call.scope === 'dynamic').payload.addRules;
  assert.ok(rules.length > 0);
  for (const rule of rules) {
    assert.deepEqual(Array.from(rule.condition.initiatorDomains), [chrome.runtime.id]);
    assert.deepEqual(Array.from(rule.condition.resourceTypes), ['sub_frame']);
  }
  const manifest = JSON.parse(fs.readFileSync(`${ROOT}manifest.json`, 'utf8'));
  assert.equal(manifest.declarative_net_request, undefined);
});

test('legacy custom DNR rules are migrated to extension-only subframes', async () => {
  const extensionId = 'a'.repeat(32);
  const origin = 'https://custom.example';
  const legacyRule = {
    id: 1000,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      responseHeaders: [{ header: 'x-frame-options', operation: 'remove' }]
    },
    condition: { urlFilter: `${origin}/*`, resourceTypes: ['main_frame', 'sub_frame'] }
  };
  const harness = loadBackgroundHarness({
    storage: { aiDnrRules: { [origin]: legacyRule.id } },
    dynamicRules: [legacyRule]
  });
  await new Promise(setImmediate);

  const migrated = harness.getDynamicRules().find((rule) => rule.id === legacyRule.id);
  assert.deepEqual(migrated.condition.initiatorDomains, [extensionId]);
  assert.deepEqual(migrated.condition.resourceTypes, ['sub_frame']);
  assert.equal(harness.storage.aiDnrRules[origin], legacyRule.id);
});

test('parallel panel DNR access is tab, page-origin, and session scoped', async () => {
  const harness = loadBackgroundHarness();
  await new Promise(setImmediate);
  const sender = {
    url: 'https://workspace.example/page',
    tab: { id: 42, url: 'https://workspace.example/page' }
  };

  const enabled = await harness.send({ type: 'AI_SIDEBAR_SET_PARALLEL_EMBED', enabled: true }, sender);
  assert.equal(enabled.ok, true);
  const rules = harness.getSessionRules();
  assert.ok(rules.length > 0);
  for (const rule of rules) {
    assert.deepEqual(rule.condition.tabIds, [42]);
    assert.deepEqual(rule.condition.initiatorDomains, ['workspace.example']);
    assert.deepEqual(rule.condition.resourceTypes, ['sub_frame']);
  }

  harness.emitTabUpdated(42, { url: 'https://workspace.example/page#next' });
  await new Promise(setImmediate);
  assert.equal(harness.getSessionRules().length, rules.length, 'same-document navigation keeps active rules');

  harness.emitTabUpdated(42, { status: 'loading', url: 'https://workspace.example/other' });
  await new Promise(setImmediate);
  assert.deepEqual(harness.getSessionRules(), [], 'full document navigation clears active rules');

  await harness.send({ type: 'AI_SIDEBAR_SET_PARALLEL_EMBED', enabled: true }, sender);

  const disabled = await harness.send({ type: 'AI_SIDEBAR_SET_PARALLEL_EMBED', enabled: false }, sender);
  assert.equal(disabled.ok, true);
  assert.deepEqual(harness.getSessionRules(), []);

  const contentSource = fs.readFileSync(`${ROOT}content-scripts/parallel-panel.js`, 'utf8');
  assert.ok(contentSource.indexOf('await setParallelEmbedEnabled(true)') < contentSource.indexOf('togglePanel(provider, providerUrl)'));
  assert.match(contentSource, /if \(!isVisible\) await setParallelEmbedEnabled\(false\)/);
});

test('save queue preserves concurrent producers and acknowledgement', async () => {
  const { chrome, send, storage } = loadBackgroundHarness();
  await Promise.all([
    send({ type: 'AI_SIDEBAR_SAVE_TO_LIBRARY', data: { title: 'A' }, content: 'A' }),
    send({ type: 'AI_SIDEBAR_SAVE_TO_LIBRARY', data: { title: 'B' }, content: 'B' })
  ]);
  assert.equal(storage.__saveQueue.length, 2);

  const sender = { url: chrome.runtime.getURL('index.html') };
  const snapshot = await send({ type: 'AI_SIDEBAR_GET_SAVE_QUEUE' }, sender);
  await Promise.all([
    send({ type: 'AI_SIDEBAR_ACK_SAVE_QUEUE_ITEMS', queueIds: [snapshot.items[0].queueId] }, sender),
    send({ type: 'AI_SIDEBAR_SAVE_TO_LIBRARY', data: { title: 'C' }, content: 'C' })
  ]);
  assert.deepEqual(storage.__saveQueue.map((item) => item.data.title).sort(), ['B', 'C']);
});

function request(server, { method = 'GET', path = '/sync/history', origin, host = 'localhost:3456', body }) {
  const address = server.address();
  const headers = { Host: host };
  if (origin) headers.Origin = origin;
  if (body != null) {
    headers['Content-Type'] = 'text/plain';
    headers['Content-Length'] = Buffer.byteLength(body);
  }
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: address.port, method, path, headers }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    if (body != null) req.write(body);
    req.end();
  });
}

test('sync server rejects web origins and rebinding hosts', async (t) => {
  const { createSyncServer } = require('../scripts/sync-server.cjs');
  const server = createSyncServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, 'localhost', resolve);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  assert.equal(await request(server, { path: '/ping' }), 200);
  assert.equal(await request(server, { origin: 'https://attacker.example' }), 403);
  assert.equal(await request(server, { method: 'POST', origin: 'https://attacker.example', body: '[]' }), 403);
  assert.equal(await request(server, { origin: `chrome-extension://${'a'.repeat(32)}` }), 200);
  assert.equal(await request(server, { host: 'attacker.example' }), 403);
});

test('history page uses the shared DB and CSP-safe delegated events', () => {
  const html = fs.readFileSync(`${ROOT}history/history.html`, 'utf8');
  const source = fs.readFileSync(`${ROOT}history/history.js`, 'utf8');
  assert.doesNotMatch(`${html}\n${source}`, /\sonclick\s*=/i);
  assert.match(source, /window\.ChatHistoryDB/);
  assert.doesNotMatch(source, /\bgetAllConversations\b|\bclearAllConversations\b|\bexportAllData\b/);
  assert.match(source, /addEventListener\('click', handleConversationAction\)/);
});

test('export bridge authenticates commands and never posts sensitive data to wildcard origins', () => {
  const source = fs.readFileSync(`${ROOT}js/plugins/exporter-logic.js`, 'utf8');
  assert.match(source, /event\.source === window\.parent/);
  assert.match(source, /event\.origin === SIDEBAR_ORIGIN/);
  assert.match(source, /window\.parent\.postMessage\(payload, SIDEBAR_ORIGIN\)/);
  assert.doesNotMatch(source, /window\.parent\.postMessage\([\s\S]{0,400},\s*['"]\*['"]\s*\)/);
});
