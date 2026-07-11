# Dark Pattern Detector (Chrome Extension)

A privacy-focused Chrome extension that automatically detects and highlights manipulative design patterns ("Dark Patterns") on web pages using a hybrid Regex + Visual heuristics engine, with **optional** on-device AI verification via Chrome's built-in Gemini Nano.

## 🛠️ How It Works

The extension uses a **Hybrid Detection Engine** that runs entirely on your device (Local-First):

1.  **Regex Matcher**: Instantly scans the DOM for known manipulative phrases defined in `patterns.txt` (13 categories).
2.  **Visual Heuristics**: Analyzes computed styles (opacity, color contrast via WCAG ratios, font size) to detect **Visual Interference** — e.g. a faint "Reject" button hidden next to a bold "Accept".
3.  **Optional AI Verification (Gemini Nano)**: When Chrome's built-in AI (`window.LanguageModel`) is available, regex hits are asynchronously verified on-device to reduce false positives. A high-confidence "benign" verdict un-highlights the node. When the API is unavailable, the extension runs fully in **Regex-only** mode — no dependency on AI.

The detection mode for the last scan is shown in the popup as **AI-VERIFIED** or **REGEX ONLY**.

## 🕵️ Detected Patterns

The extension detects **13 regex categories** plus **1 visual heuristic** (14 signals total):

**Regex categories** (defined in `patterns.txt`):
1.  **Urgency**: Fake countdowns or "limited time" claims.
2.  **Scarcity**: "Only 2 left at this price!"
3.  **Social Proof**: "18 people are viewing this right now."
4.  **Confirmshaming**: "No thanks, I hate saving money."
5.  **Hidden Costs**: Surprise fees added at the very last step.
6.  **Hidden Subscription**: "Free trial" that quietly converts to a paid plan.
7.  **Nagging**: Repeated popups asking you to enable notifications or install apps.
8.  **Obstruction**: Making it hard to cancel or unsubscribe (e.g., "Call to cancel").
9.  **Preselection**: Checkboxes for newsletters/insurance pre-ticked by default.
10. **Forced Action**: Forcing you to sign up just to view content.
11. **Trick Questions**: Confusing double-negatives ("Uncheck to not receive").
12. **Click Bait**: "You won't believe what happens next."
13. **Curiosity Gap**: "The real reason…", "What they aren't telling you" (restricted to titles/headings/links to reduce false positives).

**Visual heuristic**:
14. **Visual Interference**: "Ghost buttons" that are hard to see or click (weak contrast/opacity vs. a clearly stronger paired action).

## 🤖 Enabling AI Verification (optional)

AI verification uses Chrome's built-in Gemini Nano (Prompt API). It is **off by default in Chrome** and entirely optional — the extension works without it.

To enable:
1.  Chrome 127+ (desktop).
2.  Enable `chrome://flags/#optimization-guide-on-device-model` → **Enabled**.
3.  Enable `chrome://flags/#prompt-api-for-gemini-nano` → **Enabled** (or **Enabled multilingual**).
4.  Relaunch Chrome and reload the extension.

When enabled, the popup badge shows **AI-VERIFIED** after a scan; otherwise **REGEX ONLY**.

## ⚠️ Current Limitations

*   **Dynamic Content**: The MutationObserver performs incremental scans on changed subtrees (debounced 750ms), but very rapidly changing SPAs may occasionally lag.
*   **Context Understanding**: Regex/AI may misinterpret benign text (e.g., a "Limited Time" article headline vs. a sale).
*   **Visual Analysis**: Focuses on button-pair contrast; it does not yet detect complex layout shifts or "roach motel" sub-menus.

## 🚀 Next Steps

*   **Performance**: Further reduce scan overhead on heavy pages.
*   **Advanced Visuals**: Detect "roach motel" layouts where options are buried in sub-menus.
*   **Community Reporting**: Allow users to flag missed patterns to improve the global dataset.
