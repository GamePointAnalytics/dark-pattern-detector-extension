# Product Consent and Local Data View

Browser Observation requires a person to acknowledge the local data boundary before Start Observation becomes available.

## Current acknowledgement

The popup explains that Browser Observation:

- analyzes supported page text locally for possible signals;
- stores only minimized local events and optional feedback;
- does not capture screenshots, video, audio, URLs, account names, or raw page text in this mode; and
- can be paused, while Delete Local History removes retained local events.

The acknowledgement is stored as `productConsentVersion: "1"` in extension-local storage. It is product consent only; it is not research consent.

## Inspectable local data

The popup exposes the local count for minimized detection events. It also explicitly states that raw captures, raw text, URLs, and account names are not stored. It does not display raw data in the popup.

## Research boundary

Research participation, research export, and any capture-capable mode require their own separate consent and approval gates. Product consent cannot enable them.
