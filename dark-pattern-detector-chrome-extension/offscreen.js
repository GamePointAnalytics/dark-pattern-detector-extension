/**
 * DarkPatternDetector - Offscreen Document
 *
 * Hosts Chrome's built-in AI (Gemini Nano via window.LanguageModel). Runs here
 * because the Prompt API is not visible from content-script isolated worlds or
 * Web Workers. Created lazily by the background service worker.
 *
 * Verdicts are deliberately defensive: any error, timeout, or absence of the API
 * yields { fallback: true } / { unavailable: true } so the content script keeps
 * its regex highlight.
 */

let session = null;
let sessionPromise = null;
let nanoState = 'unknown'; // 'unknown' | 'available' | 'unavailable'

const SYSTEM_PROMPT =
    'You are a dark-pattern detector. Decide whether the given web text is a ' +
    'manipulative "CATEGORY" dark pattern. Be conservative: only flag genuine ' +
    'manipulation, not neutral uses of similar words. ' +
    'Reply with ONLY a compact JSON object, no prose: ' +
    '{"isDarkPattern": true|false, "confidence": "high"|"medium"|"low"}';

async function ensureSession() {
    if (session) return session;
    if (sessionPromise) return sessionPromise;

    sessionPromise = (async () => {
        if (typeof LanguageModel === 'undefined') {
            nanoState = 'unavailable';
            return null;
        }
        let availability;
        try {
            availability = await LanguageModel.availability();
        } catch (e) {
            nanoState = 'unavailable';
            return null;
        }
        // Only proceed when the model is ready or can be downloaded on demand.
        if (availability !== 'available' && availability !== 'downloadable') {
            nanoState = 'unavailable';
            return null;
        }

        try {
            session = await LanguageModel.create({
                temperature: 0.1,
                topK: 1,
                monitor(m) {
                    m.addEventListener('downloadprogress', (e) => {
                        console.log(`[Offscreen] Nano model download: ${Math.round((e.loaded || 0) * 100)}%`);
                    });
                }
            });
            nanoState = 'available';
            console.log("[Offscreen] Gemini Nano session ready");
            return session;
        } catch (e) {
            console.warn("[Offscreen] Failed to create Nano session:", e?.message || e);
            nanoState = 'unavailable';
            return null;
        }
    })();

    const s = await sessionPromise;
    sessionPromise = null;
    return s;
}

function parseVerdict(raw) {
    if (!raw || typeof raw !== 'string') return null;
    // Tolerate prose around the JSON by extracting the first {...} block.
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        const obj = JSON.parse(match[0]);
        if (typeof obj.isDarkPattern === 'boolean') {
            return {
                isDarkPattern: obj.isDarkPattern,
                confidence: ['high', 'medium', 'low'].includes(obj.confidence) ? obj.confidence : 'low'
            };
        }
    } catch (_) {
        return null;
    }
    return null;
}

async function predict(text, category) {
    const s = await ensureSession();
    if (!s) return { unavailable: true };

    try {
        const prompt = SYSTEM_PROMPT.replace('CATEGORY', category || 'dark') +
            '\n\nText: """' + (text || '').slice(0, 500) + '"""';
        const raw = await s.prompt(prompt);
        const verdict = parseVerdict(raw);
        if (!verdict) return { fallback: true };
        return verdict;
    } catch (e) {
        console.warn("[Offscreen] predict error:", e?.message || e);
        // A dead/destroyed session should be cleared so the next call rebuilds.
        session = null;
        return { fallback: true, error: e?.message || String(e) };
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action !== 'offscreenPredict') return;

    predict(request.text, request.category).then(sendResponse);
    return true; // async response
});

console.log("[Offscreen] Offscreen script loaded");
