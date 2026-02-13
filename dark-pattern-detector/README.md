# Dark Pattern Detector — Android App

**An on-device AI app that detects manipulative design patterns (dark patterns) in screenshots.**

Built for Samsung S24 with Gemini Nano. 100% privacy-preserving — no data ever leaves the device.

## How It Works

1. 📸 Take a screenshot of a suspicious app or website
2. 📤 Tap **Share → Dark Pattern Detector**
3. 🧠 Gemini Nano analyzes the screenshot **on-device**
4. 📊 View detected dark patterns with confidence scores
5. ✅ Tap **Done** — screenshot is discarded from memory

## Privacy

- ❌ **No `INTERNET` permission** — cannot make network calls
- ❌ **No storage** — screenshots are never saved to disk
- ❌ **No analytics** — zero tracking or telemetry
- ✅ **100% on-device** — Gemini Nano runs locally via AICore

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Kotlin |
| UI | Jetpack Compose (Material 3) |
| AI (Primary) | ML Kit GenAI + Gemini Nano |
| AI (Fallback) | ML Kit OCR + Regex |
| Architecture | MVVM + Coroutines |

## Building

1. Open `dark-pattern-detector/` in **Android Studio**
2. Sync Gradle
3. Run on Samsung S24 (or any device with Android 8.0+)

## Dark Patterns Detected

| Category | Example |
|----------|---------|
| Fake Urgency | "Offer ends in 00:05:00!" |
| Fake Scarcity | "Only 2 left in stock!" |
| Fake Social Proof | "15 people viewing this" |
| Confirmshaming | "No thanks, I hate saving money" |
| Hidden Costs | "Service fee: $4.99" |
| Hidden Subscription | "Free trial, then $9.99/month" |
| Nagging | "You left items in your cart!" |
| Hard to Cancel | "Call to cancel your subscription" |
| Preselection | "☑ Sign me up for emails" |
| Trick Wording | "Uncheck to not receive emails" |

## License

MIT
