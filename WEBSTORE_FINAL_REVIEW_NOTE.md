# Chrome Web Store Final Review Note

Last updated: April 11, 2026

## Before You Resubmit

Do not resubmit until the public privacy policy URL serves the latest privacy text.

Current target URL:

- `https://aibar.xin/privacy`

## Ready-to-paste reviewer note

Use this in the reviewer comments field:

> We updated this item to align the extension behavior, the privacy policy, and the Chrome Web Store privacy disclosures. The extension primarily stores data locally in the browser. It may process authentication information on supported services, supported website content needed for user-facing helpers, browsing history used for saved history/favorites features, and user-triggered content such as selected text, screenshots, and saved/exported conversation content. Core functionality does not send this data to developer-operated remote servers. Third-party AI providers receive user input directly when the user chooses to use those services. An optional localhost sync feature may sync history and favorites only to a local service running on the user's own device.

## Updated permission justifications

Use these as the final dashboard justifications if you need to rewrite the existing fields.

### `sidePanel`

Required to display the extension UI in Chrome's side panel so users can access supported AI websites without leaving their current page.

### `declarativeNetRequest`

Used to adjust response headers for compatibility on supported provider pages opened through the extension. This is used for embedding and layout compatibility, not for unrelated background traffic.

### `declarativeNetRequestWithHostAccess`

Used together with declarativeNetRequest on supported hosts so the extension can apply compatibility rules only where the user-facing side panel or supported helper features require them.

### `tabs`

Used to read current tab context, open supported providers, and coordinate user-facing actions between the active tab and the side panel.

### `activeTab`

Used for user-triggered actions such as sending selected text or a screenshot from the current tab into the side panel.

### `storage`

Used to store settings, preferences, history, favorites, pending side panel payloads, and other locally saved extension state.

### `cookies`

Used to detect sign-in state on supported services and preserve supported compatibility behavior such as local backup and restore of Perplexity session cookies inside browser storage.

### `scripting`

Used to inject helper scripts on supported AI pages for user-facing features such as layout controls, input helpers, export helpers, and side panel integration.

### `contextMenus`

Used to add the "Send to AI Sidebar" action to the browser context menu for selected text.

### Host permissions

Host permissions are limited to supported AI and productivity websites where the extension provides side panel access or page-level helper features. The extension does not use these hosts for unrelated data collection.

## Final privacy practice choices

Recommended choices in the Privacy practices form:

- Handles personal or sensitive user data: `Yes`
- Data types:
  - `Authentication information`
  - `Website content`
  - `Web history`
  - `Personal communications`
- Sells data to third parties: `No`
- Uses/transfers data for unrelated purposes: `No`
- Uses/transfers data for creditworthiness or lending: `No`
- Uses/transfers data for personalized advertising: `No`
