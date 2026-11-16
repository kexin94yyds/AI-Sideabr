// NotebookLM 侧边栏回归保护。
// 2026-10-27：NotebookLM 迁到 notebook.google.com，旧域名规则失效（49a2f98 修复）。
// 2026-11-16：网络出口被 Google 判为“地区不支持”时，iframe 落到
// notebooklm.google/?location=unsupported，Google 对嵌入返回 403，看起来像扩展坏了。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const manifest = JSON.parse(read('manifest.json'));

function loadDynamicRules() {
  const calls = [];
  const event = () => ({ addListener() {} });
  const chrome = {
    runtime: { id: 'b'.repeat(32), getURL: (p = '') => p, onInstalled: event(), onStartup: event(), onMessage: event(), lastError: null },
    declarativeNetRequest: {
      updateDynamicRules: async (payload) => { calls.push(payload); },
      getDynamicRules: async () => [],
      updateSessionRules: async () => {},
      getSessionRules: async () => []
    },
    storage: { local: { get: async () => ({}), set: async () => {} } },
    sidePanel: { setPanelBehavior: async () => {}, open: async () => {} },
    contextMenus: { removeAll: async () => {}, create: () => {}, onClicked: event() },
    cookies: { getAll: async () => [], set: async () => {}, onChanged: event() },
    commands: { onCommand: event() },
    tabs: { query: async () => [], sendMessage: async () => {}, onRemoved: event(), onUpdated: event() },
    windows: { getCurrent: async () => ({ id: 1 }) },
    permissions: { contains: async () => true, request: async () => true },
    scripting: { executeScript: async () => [] }
  };
  vm.runInNewContext(read('js/background.js'), {
    chrome, console, setTimeout, clearTimeout, URL, Blob, structuredClone, btoa, crypto: globalThis.crypto
  }, { filename: 'background.js' });
  return { chrome, calls };
}

test('NotebookLM provider points at the current notebook.google.com domain', () => {
  const popup = read('js/popup.js');
  assert.match(popup, /notebooklm:\s*\{[\s\S]*?baseUrl:\s*'https:\/\/notebook\.google\.com'/);
});

test('both NotebookLM domains keep header-removal rules and content scripts', async () => {
  const { calls } = loadDynamicRules();
  await new Promise(setImmediate);
  const filters = calls[0].addRules.map((rule) => rule.condition.urlFilter).filter(Boolean);
  for (const host of ['notebook.google.com', 'notebooklm.google.com']) {
    assert.ok(filters.includes(`https://${host}/*`), `missing DNR rule for ${host}`);
    assert.ok(manifest.host_permissions.includes(`https://${host}/*`), `missing host permission for ${host}`);
    const matched = manifest.content_scripts.some((cs) => (cs.matches || []).includes(`https://${host}/*`));
    assert.ok(matched, `no content script matches ${host}`);
  }
});

test('location=unsupported subframe is redirected to an explanatory page instead of a Google 403', async () => {
  const { chrome, calls } = loadDynamicRules();
  await new Promise(setImmediate);
  const rule = calls[0].addRules.find((r) => r.action.type === 'redirect');
  assert.ok(rule, 'redirect rule missing');
  assert.deepEqual(Array.from(rule.condition.initiatorDomains), [chrome.runtime.id]);
  assert.deepEqual(Array.from(rule.condition.resourceTypes), ['sub_frame']);
  assert.ok(calls[0].removeRuleIds.includes(rule.id), 'rule must be replaced on every refresh');

  const re = new RegExp(rule.condition.regexFilter);
  for (const url of [
    'https://notebooklm.google/?location=unsupported',
    'https://notebook.google/?location=unsupported',
    'https://notebooklm.google/?hl=zh&location=unsupported'
  ]) assert.ok(re.test(url), `should redirect ${url}`);
  for (const url of [
    'https://notebooklm.google/',
    'https://notebook.google.com/?location=unsupported',
    'https://notebook.google.com/notebook/abc',
    'https://evil.example/?u=https://notebooklm.google/?location=unsupported'
  ]) assert.ok(!re.test(url), `should not redirect ${url}`);

  const page = rule.action.redirect.extensionPath;
  assert.ok(page.startsWith('/'));
  assert.ok(fs.existsSync(path.join(ROOT, page)), `${page} must exist`);
  const exposed = manifest.web_accessible_resources.some((war) => war.resources.includes(page.slice(1)));
  assert.ok(exposed, `${page} must be web accessible for DNR redirect`);
  assert.doesNotMatch(read(page), /<script/i, 'notice page must stay script-free (MV3 CSP)');
  assert.match(read('scripts/build-webstore-package.sh'), /copy_path "notice"/);
});
