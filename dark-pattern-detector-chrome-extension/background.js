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
const LOCAL_EVENT_STORE_KEY = 'localEventsV1';
const MAX_LOCAL_EVENTS = 2000;
let eventWriteChain = Promise.resolve();

chrome.runtime.onInstalled.addListener(() => {
    console.log("[Background] Extension installed.");
});

function sanitizeLocalEvent(event) {
    const source = event && event.source ? event.source : {};
    const exposure = event && event.exposure ? event.exposure : {};
    const feedback = event && event.feedback ? event.feedback : {};
    const signals = Array.isArray(event && event.signals) ? event.signals : [];

    return {
        schemaVersion: '0.1',
        eventId: String(event && event.eventId || crypto.randomUUID()),
        occurredAtBucket: String(event && event.occurredAtBucket || new Date().toISOString()),
        sessionId: String(event && event.sessionId || 'unknown'),
        source: {
            surface: source.surface === 'browser_tab' ? 'browser_tab' : 'browser_tab',
            platformType: String(source.platformType || 'unknown'),
            captureMode: String(source.captureMode || 'dom_text')
        },
        exposure: {
            durationSeconds: Number(exposure.durationSeconds) || 0,
            contentServingCount: Number(exposure.contentServingCount) || 1
        },
        signals: signals.slice(0, 10).map(signal => ({
            category: String(signal.category || 'unknown'),
            subtype: signal.subtype ? String(signal.subtype) : null,
            confidence: Math.max(0, Math.min(1, Number(signal.confidence) || 0)),
            detector: String(signal.detector || 'unknown'),
            modelVersion: String(signal.modelVersion || 'unknown')
        })),
        feedback: {
            relevance: ['relevant', 'not_relevant', 'unknown'].includes(feedback.relevance) ? feedback.relevance : 'unknown',
            wantedness: ['wanted', 'not_wanted', 'unknown'].includes(feedback.wantedness) ? feedback.wantedness : 'unknown',
            safetyAction: ['none', 'dismiss', 'blur', 'hide', 'mute', 'block', 'pause'].includes(feedback.safetyAction) ? feedback.safetyAction : 'none'
        },
        privacy: {
            rawCaptureDeleted: true,
            ocrTextDeleted: true,
            researchExportEligible: false
        }
    };
}

function appendLocalEvents(events) {
    const safeEvents = Array.isArray(events) ? events.map(sanitizeLocalEvent) : [];
    if (safeEvents.length === 0) return Promise.resolve({ count: 0 });

    eventWriteChain = eventWriteChain.catch(() => undefined).then(async () => {
        const stored = await chrome.storage.local.get(LOCAL_EVENT_STORE_KEY);
        const current = Array.isArray(stored[LOCAL_EVENT_STORE_KEY]) ? stored[LOCAL_EVENT_STORE_KEY] : [];
        const existingIds = new Set(current.map(event => event.eventId));
        const additions = safeEvents.filter(event => !existingIds.has(event.eventId));
        const next = current.concat(additions).slice(-MAX_LOCAL_EVENTS);
        await chrome.storage.local.set({ [LOCAL_EVENT_STORE_KEY]: next });
        return { count: next.length, added: additions.length };
    });

    return eventWriteChain;
}

function sanitizeFeedback(feedback) {
    const value = feedback || {};
    return {
        relevance: ['relevant', 'not_relevant', 'unknown'].includes(value.relevance) ? value.relevance : 'unknown',
        wantedness: ['wanted', 'not_wanted', 'unknown'].includes(value.wantedness) ? value.wantedness : 'unknown',
        safetyAction: ['none', 'dismiss', 'blur', 'hide', 'mute', 'block', 'pause'].includes(value.safetyAction) ? value.safetyAction : 'none'
    };
}

function updateLocalEventFeedback(eventIds, feedback) {
    const ids = new Set(Array.isArray(eventIds) ? eventIds.map(String) : []);
    if (ids.size === 0) return Promise.resolve({ updated: 0 });

    const safeFeedback = sanitizeFeedback(feedback);
    eventWriteChain = eventWriteChain.catch(() => undefined).then(async () => {
        const stored = await chrome.storage.local.get(LOCAL_EVENT_STORE_KEY);
        const current = Array.isArray(stored[LOCAL_EVENT_STORE_KEY]) ? stored[LOCAL_EVENT_STORE_KEY] : [];
        let updated = 0;
        const next = current.map(event => {
            if (!ids.has(event.eventId)) return event;
            updated++;
            return { ...event, feedback: { ...(event.feedback || {}), ...safeFeedback } };
        });
        await chrome.storage.local.set({ [LOCAL_EVENT_STORE_KEY]: next });
        return { updated };
    });

    return eventWriteChain;
}

async function getLocalHistorySummary() {
    const stored = await chrome.storage.local.get(LOCAL_EVENT_STORE_KEY);
    const events = Array.isArray(stored[LOCAL_EVENT_STORE_KEY]) ? stored[LOCAL_EVENT_STORE_KEY] : [];
    return { count: events.length };
}

async function getLocalEventFeedback(eventIds) {
    const ids = new Set(Array.isArray(eventIds) ? eventIds.map(String) : []);
    if (ids.size === 0) return { feedbackByEventId: {} };

    const stored = await chrome.storage.local.get(LOCAL_EVENT_STORE_KEY);
    const events = Array.isArray(stored[LOCAL_EVENT_STORE_KEY]) ? stored[LOCAL_EVENT_STORE_KEY] : [];
    const feedbackByEventId = {};
    events.forEach(event => {
        if (ids.has(event.eventId)) {
            feedbackByEventId[event.eventId] = sanitizeFeedback(event.feedback);
        }
    });
    return { feedbackByEventId };
}

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
    if (request.action === 'recordLocalEvents') {
        appendLocalEvents(request.events)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message || String(error) }));
        return true;
    }

    if (request.action === 'getLocalHistorySummary') {
        getLocalHistorySummary()
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message || String(error), count: 0 }));
        return true;
    }

    if (request.action === 'getLocalEventFeedback') {
        getLocalEventFeedback(request.eventIds)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message || String(error), feedbackByEventId: {} }));
        return true;
    }

    if (request.action === 'clearLocalHistory') {
        chrome.storage.local.remove(LOCAL_EVENT_STORE_KEY)
            .then(() => sendResponse({ cleared: true, count: 0 }))
            .catch(error => sendResponse({ cleared: false, error: error.message || String(error) }));
        return true;
    }

    if (request.action === 'updateLocalEventFeedback') {
        updateLocalEventFeedback(request.eventIds, request.feedback)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message || String(error), updated: 0 }));
        return true;
    }

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
