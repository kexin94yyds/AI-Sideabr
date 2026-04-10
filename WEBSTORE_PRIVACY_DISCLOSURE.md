# Chrome Web Store Privacy Disclosure Draft

Last updated: April 11, 2026

## Privacy policy URL

Use a public HTTPS URL in the dedicated dashboard field:

- `https://aibar.xin/privacy`

Do not leave this only in the description, support links, or reviewer notes.

## Recommended dashboard disclosures

### Does the item handle personal or sensitive user data?

`Yes`

### Data types to select

- `Authentication information`
- `Website content`
- `Web history`
- `Personal communications`

### How the data is used

Use wording like this:

> AI Sidebar uses this data only for user-facing features. The extension opens supported AI websites in Chrome's side panel, detects sign-in state, injects page helpers on supported sites, stores settings/history/favorites locally, supports user-triggered selection and screenshot actions, and allows users to save or export conversation content. Core functionality does not send this data to developer-operated remote servers.

### Data sale or unrelated transfer

- Sold to third parties: `No`
- Used or transferred for personalized advertising: `No`
- Used or transferred for creditworthiness or lending decisions: `No`
- Used or transferred for purposes unrelated to the extension's single purpose: `No`

## Reviewer note draft

> We fixed the privacy issue by adding a public privacy policy URL in the dedicated Chrome Web Store field and by aligning the privacy policy, dashboard disclosures, and extension behavior. The extension primarily stores data locally in the browser. It may process authentication information, supported website content, browsing history used for user-facing features, and user-triggered content such as saved/exported conversations, selections, and screenshots. The extension does not send core user data to developer-operated remote servers. Third-party AI providers receive user input directly when the user chooses to use those services. If a localhost sync service is running on the user's device, the extension may sync history and favorites only to that local service.
