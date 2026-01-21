/**
 * DarkPatternDetector - Background Service Worker
 * 
 * Manages the offscreen document and routes requests to it.
 */

// Ensure offscreen document is open
async function setupOffscreenDocument(path) {
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length > 0) {
        return;
    }

    // Create offscreen document
    await chrome.offscreen.createDocument({
        url: path,
        reasons: ['DOM_PARSER'], // Justification (we need DOM to host iframe)
        justification: 'Sandboxing TensorFlow.js execution'
    });
}

// Initialize on install/startup
chrome.runtime.onInstalled.addListener(async () => {
    await setupOffscreenDocument('offscreen.html');
    console.log("[Background] Offscreen document created");
});

// Listener for messages from Content Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Only handle messages from content scripts, not from offscreen
    if (!sender.tab) {
        return false; // Ignore messages from extension contexts
    }

    // Ensure offscreen doc exists
    setupOffscreenDocument('offscreen.html').then(async () => {

        if (request.action === 'predict') {
            console.log("[Background] Forwarding prediction to offscreen:", request.text.substring(0, 20) + "...");

            try {
                // Send message to the offscreen document context
                const offscreenContexts = await chrome.runtime.getContexts({
                    contextTypes: ['OFFSCREEN_DOCUMENT']
                });

                if (offscreenContexts.length === 0) {
                    throw new Error("Offscreen document not found");
                }

                // Send message specifically to offscreen document
                const response = await chrome.runtime.sendMessage({
                    action: 'predict',
                    text: request.text
                });

                console.log("[Background] Received response from offscreen:", response);
                sendResponse(response);
            } catch (err) {
                console.error("[Background] Prediction error:", err);
                sendResponse({ error: err.message, fallback: true });
            }

            return true; // Keep channel open
        }

        if (request.action === 'getModelStatus' || request.action === 'initModel') {
            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'initModel'
                });
                sendResponse(response);
            } catch (err) {
                sendResponse({ ready: false, error: err.message });
            }
            return true;
        }
    });

    return true; // Async response
});
