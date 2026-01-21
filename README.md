# Dark Pattern Detector

**An AI-powered Chrome Extension that detects and highlights manipulative user interface designs (Dark Patterns) in real-time.**

## Overview

The **Dark Pattern Detector** helps users navigate the web safely by identifying deceptive design patterns designed to trick them into taking actions they didn't intend to (like buying insurance, signing up for a newsletter, or rushing a purchase).

It uses a **Hybrid Detection Engine** combining:
1.  **Broad Match Regex**: Instantly scans for 120+ suspicion keywords across 10 distinct categories.
2.  **On-Device AI (TensorFlow.js)**: A sandboxed AI model (Universal Sentence Encoder) verifies the context of detected text to reduce false positives.
3.  **Visibility Filters**: Ensures only text actually visible to the user is flagged.

## Key Features

*   **Real-time Detection**: Scans pages automatically as you browse.
*   **10 Detection Categories**:
    *   **Urgency**: "Offer ends in 00:05:00!"
    *   **Scarcity**: "Only 2 items left in stock."
    *   **Social Proof**: "15 people are viewing this right now."
    *   **Confirmshaming**: "No thanks, I like paying full price."
    *   **Hidden Costs**: Unexpected fees revealed at checkout.
    *   **Hidden Subscription**: Hard-to-cancel auto-renewals.
    *   **Nagging**: Popups that won't go away.
    *   **Obstruction**: Making it hard to delete accounts.
    *   **Preselection**: Pre-checked newsletter boxes.
    *   **Forced Action**: "Download the app to continue."
*   **Privacy First**: **100% On-Device Processing.** No data is ever sent to a cloud server.
*   **Visual Highlights**: Suspicious text is highlighted directly on the page.
*   **Detailed Analytics**: Click the extension popup to see exactly *what* text triggered the alert and *why*.

## Installation (Developer Mode)

1.  Clone this repository:
    ```bash
    git clone https://github.com/GamePointAnalytics/dark-pattern-detector-extension.git
    ```
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (toggle in the top right).
4.  Click **Load unpacked**.
5.  Select the `dark-pattern-detector-extension` folder from this repository.
6.  The extension is now active! Visit any e-commerce site to test it out.

## Architecture

This extension is built on **Manifest V3** and utilizes a unique architecture to run AI models within the strict security constraints of modern browsers:

*   **Content Script**: Scans the DOM for candidate text nodes.
*   **Background Worker**: Acts as a router/controller.
*   **Offscreen Document**: Bridges the communication gap between the background worker and the sandbox.
*   **Sandboxed Iframe**: Hosts the **TensorFlow.js** runtime and the **Universal Sentence Encoder (USE)** model, allowing for safe execution of `unsafe-eval` code required by the WASM backend.

## License

Distributed under the MIT License. See `LICENSE` for more information.
