# Dark Pattern Detector Chrome Extension

## 1. Purpose
The Dark Pattern Detector is a Chrome extension designed to help users navigate the web safely by identifying and highlighting deceptive design patterns (dark patterns) in real-time. It serves as a web-based prototype for a future mobile application.

The extension aims to protect users from manipulative texts and interface designs that utilize psychology to trick them into taking unintended actions, such as making impulsive purchases, signing up for unwanted newsletters, or facing difficulties in cancelling subscriptions.

It employs a Hybrid Detection Engine that combines:
*   **Regex Matcher**: Instantly scans visible text nodes for manipulative phrases across 13 distinct categories. The patterns are stored in `patterns.txt` and are loaded into memory when the extension loads. Users can add or remove patterns from the file to customize the detection engine.
*   **Visual Heuristics**: Analyzes computed styles — WCAG contrast ratios, opacity, and font-size — to detect **Visual Interference** (false hierarchy), e.g. a faint "Reject" button placed beside a bold "Accept".
*   **Optional On-Device AI (Gemini Nano)**: When Chrome's built-in AI (`window.LanguageModel`) is available, regex hits are asynchronously verified on-device to reduce false positives. A high-confidence "benign" verdict removes the highlight. The AI runs in an offscreen document (the Prompt API is not visible from content scripts or Web Workers), with the background service worker managing its lifecycle. If built-in AI is unavailable, the extension runs fully in Regex-only mode with no loss of core functionality.
*   **Visibility Filters**: Ensures that only text currently visible to the user is flagged.

## 2. Limitations
*   **Prototype Status**: This is a prototype and may not catch every instance of a dark pattern or may occasionally flag benign text (false positives).
*   **Language Support**: Currently optimized for English language patterns.
*   **Desktop Only**: As a Chrome extension, it currently runs only on desktop versions of the Chrome browser, not on mobile devices (though it prototypes mobile app logic).
*   **Performance**: While optimized, heavy pages with massive amounts of text might experience slight delays during the initial scan.
*   **Optional AI Overhead**: When Gemini Nano is enabled, AI verification adds a small async communication overhead (content → background → offscreen document); it never blocks the synchronous regex scan.
*   **Interpretation Accuracy**: The system may interpret benign language or user interface elements as dark patterns (false positives) in ambiguous contexts.

## 3. Privacy & AI Architecture
**Local Processing**
The "thinking" (inference) happens 100% on your device inside the Chrome browser.
*   **Privacy**: The text from the websites you visit is **never** sent to a cloud server for analysis. Regex and visual detection run locally in the content script; optional AI verification runs on-device via Chrome's built-in Gemini Nano.
*   **No External Downloads**: The regex + visual engine ships with the extension and needs no external assets. Gemini Nano, when enabled, is downloaded and managed by Chrome itself (not the extension) on first use.

**Optional AI: Gemini Nano**
When Chrome's built-in AI is available (`window.LanguageModel`), the extension uses it to verify borderline regex hits on-device. This is a progressive enhancement: if the API is absent (most installs), the extension operates in Regex-only mode. The AI inference runs inside an offscreen document hosted by the extension; the background service worker creates and manages that document.

## 4. How to install
1.  **Clone the Repository**:
    Download the project source code to your local machine.
    ```bash
    git clone https://github.com/GamePointAnalytics/dark-pattern-detector.git
    ```
    Or download the zip file from the repository (https://github.com/GamePointAnalytics/dark-pattern-detector/raw/main/dark-pattern-detector-chrome-extension/zip/DarkPatternDetectorChromeExtension.zip) and extract it to your local machine.
2.  **Open Extensions Management**:
    Open Google Chrome and navigate to `chrome://extensions/` in the address bar.
3.  **Enable Developer Mode**:
    Toggle the switch for **Developer mode** located in the top right corner of the page.
4.  **Load Unpacked Extension**:
    Click the **Load unpacked** button that appears in the top left.
5.  **Select Folder**:
    Browse to and select the `dark-pattern-detector-chrome-extension` folder from the cloned repository.
6.  **Confirmation**:
    The extension should now appear in your list of installed extensions and be active.

## 5. How to use
1.  **Browse Normally**:
    Visit any website, particularly e-commerce sites where dark patterns are common. The extension automatically scans the page on load and re-scans incrementally as the DOM changes (e.g. infinite scroll, SPA navigation).
2.  **Visual Indicators**:
    *   **Highlights**: Suspicious text will be highlighted directly on the page.
    *   **Tooltips**: Hover over a highlight to see the type of dark pattern detected (e.g., "Urgency", "Scarcity").
3.  **Popup Dashboard**:
    Click the extension icon in the Chrome toolbar to open the popup.
    *   **Status**: See if the page is "Clean" or how many patterns were detected.
    *   **Detailed Breakdown**: View a list of all detected patterns grouped by category.
    *   **Pause/Resume**: Use the "Pause Detection" button to temporarily disable the extension if it interferes with a specific site.
4.  **Dynamic Content**:
    The extension monitors for changes (like scrolling or loading new content) and will automatically scan new text as it appears.
