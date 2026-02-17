# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**AI Sidebar** is a Chrome extension that embeds popular AI chat providers (ChatGPT, Perplexity, Gemini, Claude, etc.) directly into the browser's side panel without requiring tab switching. Key features include provider management, link history/favorites, header manipulation for iframe embedding, and persistent session handling.

## Commands

### Development
```bash
npm run dev          # Start Vite dev server (for development builds)
npm run build        # Compile TypeScript to JavaScript
npm run lint         # Run ESLint (max-warnings: 0)
```

### Installation
The extension runs in Manifest V3. To load locally:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the project directory

## Architecture & Key Systems

### Core Structure
- **`js/popup.js`** (1,500+ lines): Main panel UI logic. Handles provider switching, iframe management, history/favorites, provider ordering, drag-and-drop reordering of tabs, and URL tracking from embedded sites.
- **`js/background.js`**: Service worker. Applies Declarative Net Request (DNR) rules to remove security headers (CSP, x-frame-options) for supported domains. Manages dynamic DNR rule registration for custom providers and cookie persistence for Perplexity.
- **`js/history-db.js`**: Manages link history using IndexedDB with fallback to chrome.storage.local (legacy).
- **`content-scripts/url-sync.js`**: Injected into provider iframes. Detects navigation, sends URL/title updates back to the panel via postMessage, enables Tab-based provider switching from within embedded sites.
- **`index.html`**: Minimal HTML; sidebar layout is built by JavaScript (provider tabs, main content, toolbar).
- **`css/panel.css`**: Styles for the side panel UI including provider tabs bar, toolbar buttons, history/favorites panels, and drag-and-drop visual feedback.
- **`manifest.json`**: Specifies permissions, host permissions for supported providers, content scripts, DNR rule resources, and the side panel entry point.

### Data Storage
- **Provider state**: `chrome.storage.local.provider` (current active provider)
- **Provider order**: `chrome.storage.local.providerOrder` (for drag-and-drop reordering)
- **Provider overrides**: `chrome.storage.local.aiProviderOverrides` (per-provider config patches)
- **History**: IndexedDB `aiLinkHistory` table, or fallback `chrome.storage.local.aiLinkHistory` array
- **Favorites**: `chrome.storage.local.aiFavoriteLinks`
- **Perplexity cookies**: `chrome.storage.local.perplexityCookieBackup` (session persistence across restarts)
- **Custom providers**: `chrome.storage.local.customProviders` (user-added AI sites)
- **DNR rules**: `chrome.storage.local.aiDnrRules` (maps origin → dynamic rule ID)

### Provider Definition
In `popup.js`, the `PROVIDERS` object defines each AI service:
```javascript
{
  label: 'Display name',
  icon: 'path/to/icon',
  baseUrl: 'https://provider.com',
  iframeUrl: 'https://provider.com/initial-path',
  authCheck: async () => { /* optional session validation */ }
}
```
- **authCheck** is mainly used for ChatGPT (403 Cloudflare handling, unauthorized redirect).
- Most providers skip authCheck and load directly in the iframe.

### Iframe & Frame Caching
- Frames are created once per provider and cached in `cachedFrames[key]`.
- Uses `<iframe>` by default; can use `<webview>` via provider override (Electron-style embedding).
- Content Security Policy and X-Frame-Options headers are removed via DNR at the service worker layer.
- Frame visibility is managed: only one frame is visible at a time; others are `display: none` to preserve state.

### Header Removal Mechanism (DNR)
- **Background**: Applies hardcoded DNR rules (IDs 1–17) on install/startup for known providers (ChatGPT, Perplexity, Gemini, Claude, etc.).
- **Dynamic**: When a new provider is selected or a custom one is added, `ensureAccessFor(url)` triggers a message to the background service worker to register a new dynamic rule (ID ≥ 1000).
- **Removed headers**: CSP, CSP-Report-Only, X-Frame-Options, COEP, COOP, CORP, Permissions-Policy.

### Content Script (`url-sync.js`)
- Injected into all provider iframe loads.
- Detects `window.location` changes and posts `ai-url-changed` messages (URL, title) back to the main panel.
- Enables provider cycling (Tab/Shift+Tab) by listening for `ai-tab-cycle` messages.
- Gracefully ignores internal utility frames (e.g., Gemini's `/_/` paths).

### History & Favorites
- **History** auto-saves deep links when the user navigates within a provider (e.g., ChatGPT `/c/...`, Gemini `/app/...`).
- **Favorites** are manually starred by the user from the History panel.
- Both support inline title editing, copy-to-clipboard, search filtering, and open-in-tab actions.
- Data persists across browser restarts in IndexedDB or fallback storage.

### Provider Tab Management
- **Left sidebar**: Vertical buttons showing provider icons; drag-and-drop reordering.
- **Collapse toggle**: Collapses to show only provider icons; stored in `tabsCollapsed` setting.
- **Active state**: Current provider button is highlighted with `.active` class.
- **Tab cycling**: Press Tab/Shift+Tab to cycle through providers; focus stays in the panel.

### Toolbar & Main Controls
- **Open in Tab**: Updates based on current iframe URL; clicking opens that URL in the active browser tab (or new tab if unavailable).
- **Copy Link**: Copies the current URL to clipboard with a "Copied" confirmation.
- **History**: Opens a dropdown panel with saved links, inline edit, search filter.
- **Add Current**: Saves current iframe URL to history and opens inline rename.
- **Favorites (★ Star)**: Opens favorites panel; clicking the Star button auto-adds current URL with inline rename.
- **Toolbar visibility**: Hidden by default; appears on hover near the top of the content area.

## Important Implementation Details

### Session & Auth
- **ChatGPT**: Checks `/api/auth/session` endpoint; returns error if 403 (Cloudflare) or no accessToken.
- **Others**: Load directly; sites handle login flows within the iframe (redirects, popups).

### URL Normalization
- `normalizeUrlForMatch()` removes hash, lowercases hostname, sorts query params for robust deduplication in history.
- Deep links are detected per-provider (e.g., ChatGPT `/c/...` pattern) to avoid saving generic URLs.

### Perplexity Cookie Persistence
- On startup, attempts to restore Perplexity cookies from backup.
- On cookie change for Perplexity domains, debounces and backs up cookies.
- Helps maintain session across browser restarts; best-effort (may not work in all scenarios).

### Custom Providers (Extensibility)
- Users can add custom AI sites via the "Add AI" option in the provider dropdown.
- Stored in `customProviders` array with a unique key.
- Each custom provider gets its own iframe, DNR rule, and history entry.

### Error Handling
- Frames that fail to load due to embedding restrictions show a friendly message: "This site refused to load in the panel (blocked). Click Open in Tab to use it directly."
- Stray postMessages from unknown sources are ignored (security).

## Key Files & Their Responsibilities

| File | Purpose |
|------|---------|
| `manifest.json` | Extension metadata, permissions, content scripts, DNR config |
| `js/background.js` | Service worker; DNR rules, cookie persistence, host permission management |
| `js/popup.js` | Main UI logic; iframe lifecycle, provider switching, history/favorites, drag-drop |
| `js/history-db.js` | IndexedDB management with storage.local fallback |
| `content-scripts/url-sync.js` | Runs in iframes; detects navigation, sends updates to panel |
| `css/panel.css` | Styling for side panel, toolbar, history/favorites panels, provider tabs |
| `index.html` | Entry point; minimal HTML markup |

## Common Development Tasks

### Adding a New Provider
1. Add entry to `PROVIDERS` object in `js/popup.js` with label, icon, URLs, and optional authCheck function.
2. If provider requires header removal, add a DNR rule in `js/background.js` (or rely on dynamic rule via `ensureAccessFor`).
3. Ensure the provider's domain is in `manifest.json` → `host_permissions` and `content_scripts` → `matches`.
4. Test iframe loads without CSP/X-Frame-Options blocking (check `chrome://net-internals/#dns` and DevTools Network tab).

### Debugging iframe Issues
- **Chrome DevTools**: Right-click iframe in DevTools → "Inspect frame" to debug content inside.
- **Messages not received**: Check that `event.source === cachedFrames[key].contentWindow` in `window.addEventListener('message')`.
- **DNR not working**: Confirm rule ID is unique, rule is in dynamic set or hardcoded, and provider URL matches the rule's `urlFilter`.

### Testing History/Favorites
- Open DevTools → Application → Indexed DB or Local Storage to inspect stored entries.
- Clear storage for a fresh start: `await chrome.storage.local.clear()` in background console.
- For IndexedDB, check the `aiLinkHistory` table schema: `{ url, title, provider, time, needsTitle }`.

### Provider Ordering & Drag-Drop
- Drag-and-drop reordering is only active when tabs are expanded (not collapsed).
- Order is persisted in `providerOrder` in chrome.storage.local.
- On app startup, order is loaded and merged with any new built-in providers.

## Testing & Validation

- **ESLint**: Run `npm run lint` with zero warnings enforced.
- **Browser compatibility**: Tested on Chrome/Chromium. Manifest V3 required.
- **Extension reload**: After code changes, reload the extension via `chrome://extensions/` or F5 in the side panel.
- **Performance**: Large history (500+ links) may cause slowdown; consider pagination or virtualization.

## Notes for Future Development

- **Security**: All iframe communication uses origin validation; untrusted messages are ignored.
- **Storage limits**: Chrome storage has ~10MB limit; history/favorites are capped at 500 entries per list.
- **Cookie partitioning**: Newer Chrome versions may partition cookies; Perplexity backup may not fully restore in all scenarios.
- **Header removal trade-offs**: Removing CSP can expose some sites to XSS if not careful; currently applied only to trusted providers.
