/**
 * DarkPatternDetector - Background Service Worker
 *
 * Owns the lifecycle of the offscreen document that hosts Chrome's built-in AI
 * (Gemini Nano / window.LanguageModel). Content scripts ask the background to
 * "predict"; the background lazily creates the offscreen document (if needed)
 * and forwards the request. If built-in AI is unavailable, callers fall back
 * to the regex result — the extension keeps working.
 */

let offscreenCreating = null;

chrome.runtime.onInstalled.addListener(() => {
    console.log("[Background] Extension installed.");
});

// Ensure exactly one offscreen document exists. Resolves once it's ready.
async function ensureOffscreen() {
    // Already exists?
    const existing = await chrome.offscreen.hasDocument?.();
    if (existing) return;

    if (offscreenCreating) return offscreenCreating;

    offscreenCreating = chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AI_LANGUAGE_MODEL'],
        justification: 'Verify dark-pattern candidates on-device with Gemini Nano to reduce false positives.'
    });

    try {
        await offscreenCreating;
    } finally {
        offscreenCreating = null;
    }
}

// Route predict requests from content -> offscreen document.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action !== 'predict') return;

    (async () => {
        try {
            await ensureOffscreen();
            const verdict = await chrome.runtime.sendMessage({
                action: 'offscreenPredict',
                text: request.text,
                category: request.category
            });
            sendResponse(verdict || { fallback: true });
        } catch (e) {
            console.warn("[Background] predict failed:", e?.message || e);
            sendResponse({ fallback: true, error: e?.message || String(e) });
        }
    })();

    return true; // async response
});
