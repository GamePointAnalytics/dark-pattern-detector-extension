# Dark Pattern Detector

Privacy-focused Chrome extension that detects and highlights manipulative interface patterns while you browse.

## Current implementation

The extension is a Manifest V3 prototype built around a local-first detection pipeline:

- Regex matching against configurable phrases in `patterns.txt`
- 13 text categories, including urgency, scarcity, social proof, hidden costs, forced action, trick questions, click bait, and curiosity gaps
- Optional visual-interference detection for weakly presented opposing actions such as a faint “Reject” button beside a prominent “Accept” button
- Optional on-device Gemini Nano verification through Chrome’s Prompt API
- Automatic scanning on page load and incremental scanning of dynamically added page content
- Popup dashboard with counts, category details, pause/resume, and detection-mode status

When Gemini Nano is unavailable, the extension continues to work in regex-only mode. Website text is not sent to a project-operated cloud service.

## Install locally

1. Clone the repository:

   ```bash
   git clone https://github.com/GamePointAnalytics/dark-pattern-detector.git
   ```

2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the `dark-pattern-detector-chrome-extension` directory.
6. Refresh any already-open tabs you want to scan.

The extension works without Gemini Nano. Experimental Chrome AI features must be enabled separately if you want optional AI verification; see the extension [README](dark-pattern-detector-chrome-extension/README.md) for current setup notes.

## Project structure

```text
dark-pattern-detector-chrome-extension/
├── content.js       DOM scanning, highlighting, heuristics, and AI requests
├── patterns.txt     Detection categories and regex fragments
├── popup.html/js    Extension dashboard and controls
├── background.js    Service-worker router and offscreen lifecycle
├── offscreen.js     Optional Gemini Nano integration
├── styles.css       Highlight styles
├── test_*.html      Manual test fixtures
└── report/          Design and implementation notes
```

## Development and testing

There is currently no build step. The pure detector and popup feedback paths have lightweight Node regression tests. For basic validation:

- Run `node --check` on the JavaScript files after edits.
- Run `node dark-pattern-detector-chrome-extension/test_detector_core.js` to verify the pure text-detection module.
- Run `node dark-pattern-detector-chrome-extension/test_popup_feedback_persistence.js` to verify feedback survives popup reopening.
- Run `node dark-pattern-detector-chrome-extension/test_active_tab_capture.js` to verify the consent-gated, one-shot active-tab capture boundary without retaining an image.
- Run `node dark-pattern-detector-chrome-extension/test_image_signal_core.js` to verify that only approved image-signal categories and confidence values can be retained.
- Run `node dark-pattern-detector-chrome-extension/evaluate_detector.js` to print category-level development-fixture precision and recall.
- Load the extension unpacked in Chrome.
- Use `test_page.html` and `test_context.html` to exercise regex detection and context handling.
- Use `test_active_tab.html` to exercise the explicit active-tab screenshot and on-device image-analysis flow with safe visual examples.
- Use `test_nano.html` only when testing Chrome’s optional built-in AI capability.

Detection patterns can be edited directly in `dark-pattern-detector-chrome-extension/patterns.txt`; reload the extension and refresh the test page after changing them.

## Current limitations

- English-language patterns only
- Regex matching can produce false positives for benign text
- Visual analysis currently focuses on selected opposing-action button pairs
- Rapidly changing single-page applications may not be scanned immediately
- Gemini Nano availability depends on the Chrome version, device, flags, and model state
- This is a prototype and should not be treated as a complete accessibility, safety, or legal compliance tool

## Documentation

- [Product direction research](docs/product-direction-research.md)
- [Capture modes and consent spec](docs/capture-modes-and-consent.md)
- [Legal and research readiness](docs/legal-readiness.md)
- [Product frames](docs/product-frames.md)
- [Threat model](docs/threat-model.md)
- [Data inventory](docs/data-inventory.md)
- [Local event schema](docs/event-schema.md)
- [Product consent and local data view](docs/product-consent.md)
- [Active-tab analysis beta](docs/active-tab-analysis.md)
- [Secure AI analysis options](docs/secure-ai-analysis-options.md)
- [Classifier evaluation plan](docs/classifier-evaluation.md)
- [MVP quality checklist](docs/quality-checklist.md)
- [Product roadmap](docs/roadmap.md)
- [Research backlog](docs/backlog/research.md)
- [Domain context](CONTEXT.md)
- [Architecture decision: local-first analysis](docs/adr/0001-local-first-content-analysis.md)
- [Architecture decision: user-controlled capture modes](docs/adr/0002-user-controlled-capture-modes.md)
- [Extension documentation](dark-pattern-detector-chrome-extension/README.md)
- [Walkthrough](dark-pattern-detector-chrome-extension/walkthrough.md)
- [Implementation report](dark-pattern-detector-chrome-extension/report/dark_pattern_extension_report.md)
- [Resources and references](dark-pattern-detector-chrome-extension/RESOURCES.md)

## License

The repository currently does not include a license file. Licensing should be added before distributing the project publicly.
