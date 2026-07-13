# DarkPatternDetector — Walkthrough (v3.0)

## Overview
**DarkPatternDetector** is a Chrome Extension (MV3) that detects and highlights "Dark Patterns" using a hybrid Regex + Visual heuristics engine, with **optional** on-device AI verification via Chrome's built-in Gemini Nano.

| Phase | Features |
|-------|----------|
| Phase 1 | Regex keyword detection |
| Phase 2 | AI verification via TensorFlow.js + Universal Sentence Encoder |
| Phase 3 | Visual heuristics for false-hierarchy detection |
| **v3.0** | **Regex core + WCAG visual heuristics + optional Gemini Nano (built-in AI). TF.js/USE removed.** |

## 📂 Project Location
`C:\Home\Software\Google_Antigravity\CBS_App\dark-pattern-detector-chrome-extension\`

## 🚀 Installation

1.  `chrome://extensions` → Enable **Developer mode**
2.  **Load unpacked** → Select `dark-pattern-detector-chrome-extension` folder
3.  **Refresh** open tabs

## ✨ v3.0: How It Works

### Detection pipeline
1. **Regex Matcher**: Scans visible text nodes against phrase patterns defined in `patterns.txt` (13 categories). Matches are highlighted instantly.
2. **Visual Heuristics**: Analyzes computed styles — WCAG contrast ratios, opacity, font-size — to find **Visual Interference** (e.g. a faint "Reject" button beside a bold "Accept").
3. **Optional AI Verification (Gemini Nano)**: When Chrome's built-in AI (`window.LanguageModel`) is available, regex hits are asynchronously verified on-device. A high-confidence "benign" verdict un-highlights the node. If the API is unavailable, the extension runs fully in **Regex-only** mode — no dependency on AI.

The detection mode for the last scan shows in the popup as **AI-VERIFIED** or **REGEX ONLY**.

### Architecture
```
content.js  ──regex──▶  highlight + detectionResults
   │
   └──(async, optional)──▶ background.js ──▶ offscreen.html (LanguageModel / Gemini Nano)
                                                     │
                                            verdict ─▶ un-highlight if benign
```

The Prompt API is **not visible from content-script isolated worlds or Web Workers**, so AI runs in an offscreen document. The background service worker owns the offscreen lifecycle and routes `predict` requests.

### Why no more TensorFlow.js
The TF.js + USE stack (1.4 MB bundled + a ~30 MB model download from TFHub) was removed in favor of the regex + visual core as the reliable engine, with Gemini Nano as the optional, on-device AI layer where Chrome supports it. This is lighter, faster, and has no external model download.

### Key Files
| File | Purpose |
|------|---------|
| `content.js` | Regex engine, visual heuristics, optional Nano verification, highlighting |
| `patterns.txt` | Configurable keyword/regex patterns per category (13 categories) |
| `background.js` | Offscreen-document lifecycle + predict router |
| `offscreen.html` / `offscreen.js` | Hosts `window.LanguageModel` (Gemini Nano) |
| `popup.html` / `popup.js` | Popup dashboard: counts, breakdown, mode badge, pause/resume, visual toggle |

## 🕵️ Detected Patterns
13 regex categories (Urgency, Scarcity, Social Proof, Confirmshaming, Hidden Costs, Hidden Subscription, Nagging, Obstruction, Preselection, Forced Action, Trick Questions, Click Bait, Curiosity Gap) + 1 visual heuristic (Visual Interference).

## 🔧 Enabling AI Verification (optional)
AI verification uses Chrome's built-in Gemini Nano and is **off by default in Chrome**. To enable:
1. Chrome 127+ (desktop).
2. `chrome://flags/#optimization-guide-on-device-model` → **Enabled**.
3. `chrome://flags/#prompt-api-for-gemini-nano` → **Enabled** (or **Enabled multilingual**).
4. Relaunch Chrome and reload the extension.

See `test_nano.html` for a standalone capability check.

## ⚠️ Notes
- **No model download**: The regex + visual engine needs no external assets. Gemini Nano, when enabled, is managed by Chrome itself.
- **Performance**: Scans run immediately on load and incrementally on DOM mutations (debounced 750ms).
- **Fallback**: If Gemini Nano is unavailable, the extension uses regex-only matching with no loss of core functionality.
