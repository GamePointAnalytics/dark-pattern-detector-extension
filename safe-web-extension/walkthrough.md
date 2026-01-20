# Safe Web - Walkthrough (Phases 1, 2, 2.5)

## Overview
**Safe Web** is a Chrome Extension that detects and highlights "Dark Patterns" using AI.

| Phase | Features |
|-------|----------|
| Phase 1 | Regex keyword detection |
| Phase 2 | Mock AI with confidence scores |
| **Phase 2.5** | **Real TensorFlow.js + Universal Sentence Encoder** |

## 📂 Project Location
`C:\Home\Software\Google_Antigravity\CBS_App\safe-web-extension\`

## 🚀 Installation

1.  `chrome://extensions` → Enable **Developer mode**
2.  **Load unpacked** → Select `safe-web-extension` folder
3.  **Refresh** open tabs

## ✨ Phase 2.5: USE-Based Detection

### How It Works
1. **TensorFlow.js** + **Universal Sentence Encoder** load from CDN (~30MB)
2. 30+ **example dark patterns** are pre-embedded
3. Page text is embedded and **compared via cosine similarity**
4. Similarity > 0.6 → Flagged as dark pattern

### Example Categories
| Type | Example Phrase |
|------|----------------|
| Urgency | "Hurry! Limited time offer!" |
| Scarcity | "Only 2 left in stock!" |
| Social Proof | "15 people are viewing this" |
| Misdirection | "No thanks, I don't want to save money" |

### Key Files
| File | Purpose |
|------|---------|
| `lib/tf-stub.js` | USE loader, examples, similarity matching |
| `content.js` | Hybrid pipeline (regex → AI) |

## ⚠️ Notes
- **First load is slow:** ~30MB model download
- **Offline:** Subsequent loads use browser cache
- **Fallback:** If CDN fails, uses keyword heuristics

## 🔜 Next: Phase 3 (Android)
