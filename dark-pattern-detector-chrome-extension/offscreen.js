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

const IMAGE_ANALYSIS_OPTIONS = {
    expectedInputs: [
        { type: 'text', languages: ['en'] },
        { type: 'image' }
    ],
    expectedOutputs: [{ type: 'text', languages: ['en'] }]
};

const IMAGE_SYSTEM_PROMPT =
    'Analyze this one screenshot locally and conservatively. Return ONLY compact JSON with this exact shape: ' +
    '{"signals":[{"category":"sexual_nudity"|"graphic_violence"|"visual_dark_pattern","confidence":"high"|"medium"|"low"}]}. ' +
    'Only include a category when clearly supported by visible pixels. Do not infer age, identity, health, emotion, ' +
    'politics, religion, or protected traits. Do not describe or transcribe the image. ' +
    'For visual_dark_pattern, require an obvious unequal presentation of opposing choices such as accept versus reject. ' +
    'If uncertain or no category applies, return {"signals":[]}.';

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

function loadCapturedImage(rawCapture) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('The visible-tab image could not be decoded locally.'));
        image.src = rawCapture;
    });
}

async function analyzeVisibleImage(rawCapture) {
    if (typeof LanguageModel === 'undefined') return { status: 'unavailable', signals: [] };
    let image = null;
    let imageSession = null;
    try {
        const availability = await LanguageModel.availability(IMAGE_ANALYSIS_OPTIONS);
        if (availability !== 'available' && availability !== 'downloadable') {
            return { status: 'unavailable', signals: [] };
        }

        image = await loadCapturedImage(rawCapture);
        imageSession = await LanguageModel.create({
            ...IMAGE_ANALYSIS_OPTIONS,
            temperature: 0,
            topK: 1
        });
        const raw = await imageSession.prompt([{
            role: 'user',
            content: [
                { type: 'text', value: IMAGE_SYSTEM_PROMPT },
                { type: 'image', value: image }
            ]
        }]);
        return {
            status: 'available',
            signals: DarkPatternImageSignalCore.parseModelSignals(raw)
        };
    } catch (error) {
        console.warn('[Offscreen] local image analysis unavailable:', error?.message || error);
        return { status: 'failed', signals: [] };
    } finally {
        if (image) image.src = '';
        if (imageSession?.destroy) imageSession.destroy();
        image = null;
        imageSession = null;
    }
}

async function getImageAnalysisStatus() {
    if (typeof LanguageModel === 'undefined') return { availability: 'unavailable' };
    try {
        const availability = await LanguageModel.availability(IMAGE_ANALYSIS_OPTIONS);
        return {
            availability: ['available', 'downloadable', 'downloading'].includes(availability)
                ? availability
                : 'unavailable'
        };
    } catch (_) {
        return { availability: 'unavailable' };
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'offscreenGetImageAnalysisStatus') {
        getImageAnalysisStatus().then(sendResponse);
        return true;
    }
    if (request.action === 'offscreenAnalyzeVisibleImage') {
        analyzeVisibleImage(request.rawCapture).then(sendResponse);
        return true;
    }
    if (request.action !== 'offscreenPredict') return;

    predict(request.text, request.category).then(sendResponse);
    return true; // async response
});

console.log("[Offscreen] Offscreen script loaded");
