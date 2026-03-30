# Chrome Web Store Review Instructions

Last updated: March 26, 2026

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
- `tabs` and `activeTab`: inspect current tab context and open provider pages.
- `storage`: persist user settings and provider preferences.
- `cookies` and `identity`: detect sign-in state or complete supported authentication flows where required.
- `scripting`: inject helper scripts on supported AI sites.
- `contextMenus`: expose extension actions from the browser context menu.
- `declarativeNetRequest` and `declarativeNetRequestWithHostAccess`: adjust request headers for compatibility on supported provider pages.

## Supported host access

Host permissions are limited to supported AI/productivity websites declared in the manifest. The extension does not inject into arbitrary websites except where a feature explicitly requires cross-site support already listed in the manifest.

## Notes for reviewer

- This extension does not require a separate paid account with the developer.
- Third-party website accounts may be required only to use those third-party AI services.
- Reviewer testing is best performed on at least one signed-in provider account, especially Gemini.
