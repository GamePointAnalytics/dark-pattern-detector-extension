/**
 * DarkPatternDetector - AI Stub (Client)
 * 
 * Client-side interface that `content.js` uses. 
 * Sends messages to the background script, which routes them to the sandbox.
 */

async function predictDarkPattern(text) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: "predict",
            text: text
        });

        if (response?.error) {
            console.warn("[Client] Prediction error:", response.error);
            return { error: response.error, fallback: true };
        }

        return response.result || response;
    } catch (e) {
        console.warn("[Client] Message failed:", e);
        return { error: e.message, fallback: true };
    }
}

async function getModelStatus() {
    try {
        return await chrome.runtime.sendMessage({ action: "getModelStatus" });
    } catch (e) {
        return { ready: false };
    }
}

// Expose to content script
window.SafeWebAI = {
    isReady: true, // Assuming background handles readiness
    modelName: "UniversalSentenceEncoder_v1_Sandbox",
    predictDarkPattern,
    getModelStatus
};

console.log("[Client] AI Stub ready");
