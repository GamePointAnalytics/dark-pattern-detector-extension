# Dark Pattern Detector Extension

## 1. Purpose
The Dark Pattern Detector is a Chrome extension designed to help users navigate the web safely by identifying and highlighting deceptive design patterns (dark patterns) in real-time. It serves as a web-based prototype for a future mobile application.

The extension aims to protect users from manipulative texts and interface designs that utilize psychology to trick them into taking unintended actions, such as making impulsive purchases, signing up for unwanted newsletters, or facing difficulties in cancelling subscriptions.

It employs a Hybrid Detection Engine that combines:
*   **Broad Match Regex**: Instantly scans for over 120 suspicion keywords across 10 distinct categories. The keywords are stored in a text file and are loaded into memory when the extension is loaded. Users can add or remove keywords from the file to customize the detection engine.
*   **On-Device AI**: Uses TensorFlow.js and the Universal Sentence Encoder (USE, a pre-trained AI model by Google) running in a secure sandbox to analyze the context of detected text, reducing false positives. Once a keyword is detected, the program retrieves surrounding text and sends it to the AI for analysis. The AI then returns a confidence score and the type of dark pattern detected. If the confidence score is above a threshold, the text is flagged. If the AI model fails to load, the extension will default to using only the simpler Regex regular expression keyword matching.
*   **Visibility Filters**: Ensures that only text currently visible to the user is flagged.

## 2. Limitations
*   **Prototype Status**: This is a prototype and may not catch every instance of a dark pattern or may occasionally flag benign text (false positives).
*   **Language Support**: Currently optimized for English language patterns.
*   **Desktop Only**: As a Chrome extension, it currently runs only on desktop versions of the Chrome browser, not on mobile devices (though it prototypes mobile app logic).
*   **Performance**: While optimized, heavy pages with massive amounts of text might experience slight delays during the initial scan.
*   **AI Sandbox**: The AI runs in an isolated sandbox for security, which adds a small communication overhead compared to running directly in the main context.
*   **Interpretation Accuracy**: The system may interpret benign language or user interface elements as dark patterns (false positives) in ambiguous contexts.

## 3. How to install
1.  **Clone the Repository**:
    Download the project source code to your local machine.
    ```bash
    git clone https://github.com/GamePointAnalytics/dark-pattern-detector-extension.git
    ```
    Or download the zip file from the repository (https://github.com/GamePointAnalytics/dark-pattern-detector-extension/raw/main/dark-pattern-detector-chrome-extension/zip/DarkPatternDetectorExtension.zip) and extract it to your local machine.
2.  **Open Extensions Management**:
    Open Google Chrome and navigate to `chrome://extensions/` in the address bar.
3.  **Enable Developer Mode**:
    Toggle the switch for **Developer mode** located in the top right corner of the page.
4.  **Load Unpacked Extension**:
    Click the **Load unpacked** button that appears in the top left.
5.  **Select Folder**:
    Browse to and select the `dark-pattern-detector-extension` folder from the cloned repository.
6.  **Confirmation**:
    The extension should now appear in your list of installed extensions and be active.

## 4. How to use
1.  **Browse Normally**:
    Visit any website, particularly e-commerce sites where dark patterns are common. The extension automatically scans the page 2 seconds after it loads.
2.  **Visual Indicators**:
    *   **Highlights**: Suspicious text will be highlighted directly on the page.
    *   **Tooltips**: Hover over a highlight to see the type of dark pattern detected (e.g., "Urgency", "Scarcity") and the AI confidence score.
3.  **Popup Dashboard**:
    Click the extension icon in the Chrome toolbar to open the popup.
    *   **Status**: See if the page is "Clean" or how many patterns were detected.
    *   **Detailed Breakdown**: View a list of all detected patterns grouped by category.
    *   **Pause/Resume**: Use the "Pause Detection" button to temporarily disable the extension if it interferes with a specific site.
4.  **Dynamic Content**:
    The extension monitors for changes (like scrolling or loading new content) and will automatically scan new text as it appears.
