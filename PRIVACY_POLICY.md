# AI Sidebar Privacy Policy

Last updated: April 11, 2026

## Overview

AI Sidebar is a Chrome extension that opens supported AI websites inside Chrome's side panel and adds optional productivity features on supported pages. Most data handling happens locally in the user's browser.

## Data We Process

AI Sidebar may process the following categories of data to provide its user-facing features:

- Extension settings, UI preferences, and feature state stored in `chrome.storage.local`.
- Saved history and favorites used for sidebar navigation and quick access features.
- Saved conversation exports and related metadata that the user chooses to save, export, or re-open. This data may be stored in browser storage or IndexedDB.
- Authentication state on supported services, including cookies needed to detect sign-in state. For Perplexity compatibility, the extension may back up and restore Perplexity cookies locally in browser storage.
- Current tab information and supported page structure, including URLs, titles, and page DOM needed to render the side panel, inject helpers, or adjust layout behavior on supported websites.
- User-triggered content such as selected text, HTML selection snippets, and screenshots when the user explicitly invokes features like "Send selection" or "Capture screenshot".
- Optional local sync data. If a local sync service is available on the user's device at `http://localhost:3456`, the extension may sync history and favorites to that local service.

## How We Use Data

We use this data only to provide the extension's disclosed features, including:

- rendering the side panel and switching between supported providers;
- remembering settings and UI preferences;
- detecting sign-in state on supported services;
- injecting user-facing helpers on supported pages;
- saving history, favorites, and exported conversations at the user's request;
- sending user-selected text or screenshots into the side panel at the user's request; and
- optionally syncing local history and favorites to a local service running on the user's own device.

## Sharing and Transfers

AI Sidebar does not sell user data.

AI Sidebar does not transfer core extension data to developer-operated remote servers for core functionality.

When the user opens or interacts with third-party AI services such as ChatGPT, Claude, Gemini, Perplexity, or other supported providers, user inputs and related content are sent directly from the user's browser to those third-party services and are governed by those services' own terms and privacy policies.

If the optional local sync feature is active, history and favorites may be sent to a local sync service running on the user's own device at `http://localhost:3456`.

## Storage and Retention

Most extension data is stored locally in the browser using Chrome storage APIs or IndexedDB. Data remains there until the user clears it, deletes specific items, or removes the extension.

Authentication data used by supported websites remains subject to the browser and those websites' own authentication mechanisms.

## Permissions

AI Sidebar requests the following permissions for its disclosed functionality:

- `sidePanel` to open the extension UI in Chrome's side panel.
- `tabs` and `activeTab` to read current tab context and support user-triggered actions such as sending selected text or screenshots.
- `storage` to save settings, history, favorites, and feature state.
- `cookies` to detect sign-in state on supported services and preserve supported compatibility behavior such as local Perplexity session backup and restore.
- `scripting` to inject user-facing helper scripts on supported pages.
- `contextMenus` to expose extension actions from the browser context menu.
- `declarativeNetRequest` and `declarativeNetRequestWithHostAccess` to modify headers needed for compatibility on supported sites embedded or opened through the extension.
- Host permissions on supported AI and productivity domains, plus optional host permissions used only when the user chooses cross-site features such as the floating parallel panel, sending selected text from arbitrary pages, or capturing screenshots into the side panel.

## User Controls

Users can:

- remove the extension at any time through Chrome's extension manager;
- clear local extension data through Chrome browser settings;
- delete saved history, favorites, or exported conversation data;
- avoid using optional local sync by not running the local sync service; and
- stop using any supported third-party website at any time.

## Chrome Web Store Limited Use Disclosure

AI Sidebar uses data from Chrome permissions that can access personal or sensitive user data only to provide the extension's single purpose and user-facing features described on its Chrome Web Store page and in the product UI.

AI Sidebar does not use or transfer this data for advertising, data brokerage, creditworthiness, or any unrelated purpose.

AI Sidebar does not allow humans to read user data except when the user explicitly provides specific information for support or where required by law.

## Children's Privacy

AI Sidebar is not directed to children under 13.

## Changes

This policy may be updated when the extension's features or data practices change. Any material change should be reflected in the Chrome Web Store privacy disclosures and public privacy policy before release.

## Contact

For privacy questions, contact: `ymx94yyds@qq.com`
