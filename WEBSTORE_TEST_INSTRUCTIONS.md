# Chrome Web Store Review Instructions

Last updated: April 11, 2026

## Extension purpose

AI Sidebar adds a browser side panel that lets the user open supported AI websites and apply optional page-level productivity enhancements on those sites.

## How to start

1. Load the unpacked extension or install the packaged ZIP build in Chrome.
2. Pin the extension if needed.
3. Click the extension action button.
4. Chrome opens the side panel with the extension UI.

## Core reviewer flow

1. Open the side panel.
2. Select a supported provider from the bottom navigation.
3. Confirm the provider page opens in the side panel.
4. For Gemini, open `https://gemini.google.com/` and confirm the page helper UI appears, including the floating settings entry button.
5. Toggle one or more Gemini page options from the settings panel and confirm the page layout updates.
6. Use the provider switcher to move to another supported provider.

## Sign-in dependent behavior

- Some supported providers require the reviewer to be signed in on the provider website first.
- If a login page cannot be embedded because of provider restrictions, use the extension's open-in-tab flow or open the provider in a normal tab, sign in, then return to the side panel.
- This is expected behavior for providers that restrict iframe login flows.

## Permissions justification

- `sidePanel`: open the extension UI in Chrome side panel.
- `tabs` and `activeTab`: inspect current tab context, support opening provider pages, and enable user-triggered actions such as send-selection and screenshot capture.
- `storage`: persist user settings, provider preferences, history, favorites, and pending side panel payloads.
- `cookies`: detect sign-in state on supported services and preserve supported compatibility behavior such as local Perplexity cookie backup and restore.
- `scripting`: inject helper scripts on supported AI sites.
- `contextMenus`: expose extension actions from the browser context menu.
- `declarativeNetRequest` and `declarativeNetRequestWithHostAccess`: adjust headers for compatibility on supported provider pages that need embedding or layout support.

## Supported host access

Host permissions are limited to supported AI/productivity websites declared in the manifest. The extension does not inject into arbitrary websites except where a feature explicitly requires cross-site support already listed in the manifest.

The `<all_urls>` content script is used only for the user-invoked floating parallel AI panel feature. It injects the panel shell into the current page when the feature is used and does not send browsing data to developer-operated remote servers.

## Optional localhost sync behavior

If a local sync service is running on the user's own device at `http://localhost:3456`, the extension may sync history and favorites to that local service. If the local service is not running, the core extension still works and sync requests are skipped.

## Notes for reviewer

- This extension does not require a separate paid account with the developer.
- Third-party website accounts may be required only to use those third-party AI services.
- Reviewer testing is best performed on at least one signed-in provider account, especially Gemini.
