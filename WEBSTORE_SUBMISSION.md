# Chrome Web Store Submission Pack

Last updated: April 11, 2026

## Ready-to-submit basics

- Extension name: `AI Sidebar`
- Version: `0.0.3`
- Manifest version: `3`
- Primary category suggestion: `Productivity`
- Single purpose summary: Open supported AI websites in Chrome side panel and add optional page productivity tools.
- Privacy policy URL field: use a public HTTPS URL such as `https://aibar.xin/privacy`

## Recommended store description

AI Sidebar brings supported AI websites into Chrome's side panel so you can switch between assistants without leaving your current page. It also includes optional page-level tools for supported sites such as Gemini layout controls, quick access helpers, and workflow utilities.

## One-line short description

Use AI websites in Chrome side panel with optional productivity tools for supported pages.

## Privacy disclosure baseline

- User data is primarily stored locally in Chrome extension storage.
- Core functionality does not send browsing data to the developer's own servers.
- Third-party AI websites receive data directly from the user when those sites are used.
- Optional local sync may send history and favorites to `http://localhost:3456` only when that local service is running on the user's own device.
- Publish a support contact before submitting.

## Recommended privacy practices answers

Use these answers as the baseline for the Chrome Web Store Privacy practices form:

- Handles personal or sensitive user data: `Yes`
- Data types to disclose:
  - `Authentication information`
  - `Website content`
  - `Web history`
  - `Personal communications` for saved or exported conversation content
- Purpose of use: provide the side panel, detect sign-in state, inject user-facing helpers on supported pages, save history and favorites, support user-triggered send-selection or screenshot actions, and save or export conversation content at the user's request.
- Sold to third parties: `No`
- Used or transferred for creditworthiness or lending purposes: `No`
- Used or transferred for purposes unrelated to the item's single purpose: `No`
- Used for personalized advertising: `No`

## Ready-to-paste resubmission note

Use a note like this in the reviewer comments or appeal text:

> We updated the item to include a public privacy policy URL in the designated Chrome Web Store privacy policy field and aligned the privacy policy, privacy practices disclosures, and extension behavior. The extension primarily stores data locally in the browser. It may process authentication state, supported page content, browsing history for user-facing features, and user-triggered content such as saved/exported conversations, selections, and screenshots. Core functionality does not send this data to developer-operated remote servers. Third-party AI providers receive user inputs directly when the user chooses to use those providers. An optional localhost sync feature may sync history and favorites only to a local service on the user's own device.

## Submission checklist

1. Upload the ZIP generated from `scripts/build-webstore-package.sh`.
2. Set the store name to `AI Sidebar`.
3. Paste the short description and full description.
4. Upload store screenshots and icons.
5. Paste the public privacy policy URL into the dedicated `Privacy policy URL` field. Do not rely only on the description or support links.
6. Paste reviewer notes from `WEBSTORE_TEST_INSTRUCTIONS.md`.
7. Double-check the "single purpose" statement matches the listing.
8. Confirm all declared permissions are explained in the privacy and reviewer notes.

## High-risk review items

- Broad host access across many AI websites.
- Cookie and identity access.
- Declarative net request permissions used for compatibility behavior.
- Any feature that changes page layout or injects controls into third-party sites.
- Optional localhost sync behavior.

These items are defensible, but the listing and reviewer notes must explain them clearly and consistently.

## Before upload

1. Verify extension name, icon, and description are not placeholders.
2. Verify no local-only files are included in the ZIP.
3. Verify screenshots match the current UI.
4. Verify any optional remote sync or analytics claims are accurately disclosed.
