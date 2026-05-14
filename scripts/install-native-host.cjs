#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const HOST_NAME = 'com.aisidebar.bridge';
const REPO_ROOT = path.resolve(__dirname, '..');
const HOST_SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', 'native-mirror-host.cjs');

const BROWSER_DIRS = {
  chrome: path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts'),
  edge: path.join(os.homedir(), 'Library', 'Application Support', 'Microsoft Edge', 'NativeMessagingHosts'),
  chromium: path.join(os.homedir(), 'Library', 'Application Support', 'Chromium', 'NativeMessagingHosts')
};

function parseArgs(argv) {
  const args = { browser: 'chrome', extensionId: '' };

  for (const arg of argv) {
    if (arg.startsWith('--browser=')) {
      args.browser = arg.slice('--browser='.length).trim();
      continue;
    }
    if (arg.startsWith('--extension-id=')) {
      args.extensionId = arg.slice('--extension-id='.length).trim();
    }
  }

  if (!args.extensionId && process.env.AI_SIDEBAR_EXTENSION_ID) {
    args.extensionId = process.env.AI_SIDEBAR_EXTENSION_ID.trim();
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const hostDir = BROWSER_DIRS[args.browser];

  if (!hostDir) {
    throw new Error(`Unsupported browser: ${args.browser}`);
  }

  if (!args.extensionId) {
    throw new Error('Missing extension ID. Use --extension-id=<your-extension-id>');
  }

  fs.mkdirSync(hostDir, { recursive: true });
  fs.chmodSync(HOST_SCRIPT_PATH, 0o755);

  const manifestPath = path.join(hostDir, `${HOST_NAME}.json`);
  const manifest = {
    name: HOST_NAME,
    description: 'AI Sidebar native markdown mirror host',
    path: HOST_SCRIPT_PATH,
    type: 'stdio',
    allowed_origins: [`chrome-extension://${args.extensionId}/`]
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Installed native host manifest to: ${manifestPath}`);
  console.log(`Extension ID: ${args.extensionId}`);
  console.log(`Host script: ${HOST_SCRIPT_PATH}`);
}

try {
  main();
} catch (error) {
  console.error(error.message || String(error));
  process.exit(1);
}
