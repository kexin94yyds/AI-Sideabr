const fs = require('fs');
const path = require('path');

const ROOT = '/Users/apple/gemini/AI-Sidebar 2';
const VOYAGER = '/Users/apple/gemini/gemini-voyager';
const TARGET = path.join(ROOT, 'content-scripts/gemini-timeline.js');

// 检查 esbuild 是否存在
let esbuild;
try {
  esbuild = require('esbuild');
} catch (e) {
  console.error('esbuild not found, installing...');
  require('child_process').execSync('npm install esbuild', { cwd: ROOT, stdio: 'inherit' });
  esbuild = require('esbuild');
}

const cssFull = fs.readFileSync(path.join(VOYAGER, 'public/contentStyle.css'), 'utf8');
const cssMatch = cssFull.match(/\/\* Gemini-like timeline styling[\s\S]*?(?=\/\* Prompt Manager styles)/);
if (!cssMatch) throw new Error('Timeline CSS section not found in contentStyle.css');
const timelineCss = cssMatch[0];

const entry = `
import { startTimeline } from '${VOYAGER}/src/pages/content/timeline/index.ts';

const TIMELINE_STYLE_ID = 'aisb-gemini-timeline-style';
const TIMELINE_CSS = ${JSON.stringify(timelineCss)};

const ensureTimelineStyles = () => {
  if (document.getElementById(TIMELINE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = TIMELINE_STYLE_ID;
  style.textContent = TIMELINE_CSS;
  document.head.appendChild(style);
};

if (location.hostname === 'gemini.google.com') {
  if (!window.__AISB_GEMINI_TIMELINE_LOADED__) {
    window.__AISB_GEMINI_TIMELINE_LOADED__ = true;
    ensureTimelineStyles();
    startTimeline();
  }
}
`;

const polyfillPlugin = {
  name: 'polyfill-browser',
  setup(build) {
    build.onResolve({ filter: /^webextension-polyfill$/ }, () => ({
      path: 'webextension-polyfill',
      namespace: 'shim',
    }));
    build.onLoad({ filter: /^webextension-polyfill$/, namespace: 'shim' }, () => ({
      contents: "const api=(typeof browser!=='undefined'&&browser)?browser:(typeof chrome!=='undefined'?chrome:{});export default api;",
      loader: 'js',
    }));
  },
};

esbuild.build({
  stdin: {
    contents: entry,
    resolveDir: VOYAGER,
    sourcefile: 'aisb-timeline-entry.ts',
    loader: 'ts',
  },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  tsconfig: path.join(VOYAGER, 'tsconfig.json'),
  write: false,
  plugins: [polyfillPlugin],
  logLevel: 'silent',
}).then((result) => {
  const out = result.outputFiles[0].text;
  fs.writeFileSync(TARGET, out, 'utf8');
  console.log('[AISB Timeline] rebuilt:', TARGET);
  console.log('[AISB Timeline] size:', out.length);
}).catch((e) => {
  console.error('[AISB Timeline] rebuild failed:', e.errors || e);
  process.exit(1);
});
