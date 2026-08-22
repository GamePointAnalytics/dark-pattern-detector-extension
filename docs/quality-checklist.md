# MVP Quality Checklist

Use this checklist before each test build. It is a development QA pass, not a compliance certification.

## Automated checks

- Run `node dark-pattern-detector-chrome-extension/test_detector_core.js`.
- Run `node dark-pattern-detector-chrome-extension/test_popup_feedback_persistence.js`.
- Run `node dark-pattern-detector-chrome-extension/evaluate_detector.js` and review any non-zero false positives or false negatives.
- Run `node --check` on each edited JavaScript file.

## Accessibility and interaction

- Tab through every popup control; each must have a visible focus state and an understandable label.
- Verify status and local-summary updates are announced by assistive technology.
- Confirm controls do not rely only on color to convey their state.
- Verify Blur/Unblur and feedback buttons remain understandable at browser zoom levels of 100%, 200%, and 400%.

## Failure modes and privacy

- Open the popup on `chrome://extensions`; preference changes must not create an uncaught connection error.
- Reload the extension while a test page is open; refresh the page and verify scanning resumes cleanly.
- Clear Local History, then scan again; the history must repopulate only from the new/current local detections.
- Confirm Delete Local History removes the summary and feedback state.
- Confirm no URL, page text, screenshot, account name, or raw media appears in local event storage.

## Performance smoke test

- Scan a page with at least 100 text nodes and verify the popup remains responsive.
- Scroll or update a dynamic page repeatedly; confirm duplicate local events are not created.
- Toggle Visual Interference on and off; confirm it only runs when enabled.
