/**
 * DarkPatternDetector - Content Script (v3.0)
 *
 * Detects and highlights manipulative design patterns (Dark Patterns) on web pages
 * using a regex-based pattern matching engine across N categories, plus a visual
 * heuristics module for false-hierarchy detection.
 *
 * Optional: when Chrome's built-in AI (Gemini Nano via window.LanguageModel) is
 * available, regex hits are asynchronously verified on-device to reduce false
 * positives. The extension works fully in regex-only mode when AI is absent.
 */

// Dark Pattern Keywords (Regex) - loaded dynamically from patterns.txt
// broadRegex: phrase-context patterns to catch candidates
// strictRegex: high-precision fallback (same as broad in this text format)
let PATTERNS = [];

// Track scanned text nodes so incremental (mutation) scans skip already-evaluated
// nodes. Cleared on full scans.
const evaluatedTextNodes = new WeakSet();

// Detection state
let detectionResults = [];
let isScanning = false;
let hasScanned = false;
let isPaused = false;
let visualEnabled = false;
let observationActive = false;
let sessionId = null;
let observer = null;

// --- Optional AI (Gemini Nano) state ---
// nanoStatus: 'unknown' | 'available' | 'unavailable'
let nanoStatus = 'unknown';
let lastScanUsedNano = false;     // did any Nano verification actually run in the last scan?
let pendingVerifications = 0;     // outstanding verify requests for the current scan
const MAX_NANO_VERIFICATIONS = 12; // bound LLM cost per scan

function createId(prefix) {
    if (crypto && typeof crypto.randomUUID === 'function') {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function currentHourBucket() {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return now.toISOString();
}

function getObservationState() {
    if (!observationActive) return 'inactive';
    return isPaused ? 'paused' : 'active';
}

function createLocalEvent(detectionId, type, detector) {
    return {
        schemaVersion: '0.1',
        eventId: detectionId,
        occurredAtBucket: currentHourBucket(),
        sessionId: sessionId || createId('session'),
        source: {
            surface: 'browser_tab',
            platformType: 'unknown',
            captureMode: 'dom_text'
        },
        exposure: {
            durationSeconds: 0,
            contentServingCount: 1
        },
        signals: [{
            category: type,
            subtype: null,
            confidence: detector === 'regex' ? 1 : 0.7,
            detector,
            modelVersion: detector === 'regex' ? 'patterns-v3' : 'visual-heuristic-v3'
        }],
        feedback: {
            relevance: 'unknown',
            wantedness: 'unknown',
            safetyAction: 'none'
        },
        privacy: {
            rawCaptureDeleted: true,
            ocrTextDeleted: true,
            researchExportEligible: false
        }
    };
}

function persistLocalEvents(events) {
    if (events.length === 0) return Promise.resolve();
    return chrome.runtime.sendMessage({ action: 'recordLocalEvents', events })
        .catch(error => console.debug('[DarkPatternDetector] Could not record local events:', error));
}

// --- Pattern loading ---

async function loadPatterns() {
    try {
        const url = chrome.runtime.getURL('patterns.txt');
        const response = await fetch(url);
        const text = await response.text();
        if (!globalThis.DarkPatternDetectorCore) {
            throw new Error('Detector core was not loaded.');
        }
        PATTERNS = globalThis.DarkPatternDetectorCore.parsePatterns(text);
        console.log(`[DarkPatternDetector] Loaded ${PATTERNS.length} categories from patterns.txt`);
    } catch (e) {
        if (e.message.includes('Failed to fetch') || !chrome.runtime?.id) {
            console.log("[DarkPatternDetector] Context invalidated (Extension reloaded). Please refresh this page to resume scanning.");
        } else {
            console.error("[DarkPatternDetector] Failed to load patterns.txt:", e);
        }
    }
}

const patternsLoadedPromise = loadPatterns();

// --- Visibility helper ---

function isVisible(element) {
    if (!element) return false;
    if (element.offsetParent === null && element.style.position !== 'fixed') return false;

    const style = window.getComputedStyle(element);
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
    if (style.opacity === '0') return false;

    const rect = element.getBoundingClientRect();
    if (rect.width < 5 || rect.height < 5) return false;

    return true;
}

// --- Color / contrast helpers (for visual interference) ---

function parseColor(rgbStr) {
    if (!rgbStr) return null;
    const m = rgbStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3] };
}

function luminance(c) {
    const a = [c.r, c.g, c.b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrastRatio(c1, c2) {
    if (!c1 || !c2) return null;
    const l1 = luminance(c1), l2 = luminance(c2);
    const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
}

// Resolve a button's effective opaque background by walking up ancestors (transparent
// backgrounds inherit visually from behind). Bounded to 4 levels for performance.
function resolveBackground(el) {
    let node = el;
    for (let i = 0; i < 4 && node; i++) {
        const bg = window.getComputedStyle(node).backgroundColor;
        const c = parseColor(bg);
        if (c) return c;
        node = node.parentElement;
    }
    return parseColor('rgb(255, 255, 255)'); // assume white page bg
}

// --- Main scanning ---

/**
 * Scan one or more roots and highlight matches.
 * @param {Node|Node[]} roots root node(s) to scan (defaults to document.body)
 * @param {boolean} incremental if true, do not reset detectionResults (mutation scan)
 */
async function scanAndHighlight(roots, incremental = false) {
    if (!observationActive || isPaused || isScanning) return;
    isScanning = true;
    const localEvents = [];

    if (!incremental) {
        detectionResults = [];
        lastScanUsedNano = false;
    }
    let found = false;

    try {
        await patternsLoadedPromise;

        if (PATTERNS.length === 0) {
            console.warn("[DarkPatternDetector] No patterns available. Scan aborted.");
            return;
        }

        // On a full scan, re-count any existing highlights so detectionResults
        // reflects the whole page (highlights may persist across scans).
        if (!incremental) {
            document.querySelectorAll('.safe-web-highlight').forEach(el => {
                const detectionId = el.dataset.safeWebDetectionId || createId('detection');
                const type = el.dataset.safeWebType || "Unknown";
                el.dataset.safeWebDetectionId = detectionId;
                detectionResults.push({
                    detectionId,
                    type,
                    text: (el.textContent || "").substring(0, 50)
                });
                // Re-submit existing highlights. The background deduplicates by
                // detection ID, while a just-cleared history is repopulated.
                localEvents.push(createLocalEvent(detectionId, type, 'regex'));
            });
        }

        const rootList = Array.isArray(roots) ? roots : [roots || document.body];

        // Collect matching text-node candidates
        const candidates = [];

        function findCandidates(node) {
            if (node.nodeType === 3) { // Text node
                const parent = node.parentNode;
                if (!parent) return;
                if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' ||
                    parent.tagName === 'NOSCRIPT' ||
                    (parent.classList && parent.classList.contains('safe-web-highlight'))) {
                    return;
                }
                if (evaluatedTextNodes.has(node)) return;

                const content = node.nodeValue;
                if (!content || content.trim().length < 3) return;
                if (!isVisible(parent)) return;

                // Build surrounding context using textContent (cheap — innerText
                // forces a layout reflow which is expensive per candidate).
                let context = content;
                if (parent.textContent) {
                    context = parent.textContent.replace(/\s+/g, ' ').trim();
                    if (context.length > 300) context = context.substring(0, 300) + "...";
                }
                const landmarkElement = parent.closest?.('nav, footer, [role="navigation"], [role="contentinfo"]');

                const matchingPatterns = globalThis.DarkPatternDetectorCore.findMatchingPatterns({
                    text: content,
                    context,
                    patterns: PATTERNS,
                    element: {
                        tagName: parent.tagName || '',
                        className: typeof parent.className === 'string' ? parent.className : '',
                        landmark: landmarkElement?.tagName || landmarkElement?.getAttribute?.('role') || ''
                    }
                });

                if (matchingPatterns.length > 0) {
                    matchingPatterns.forEach(pattern => candidates.push({ node, content, context, pattern }));
                }

                evaluatedTextNodes.add(node);
            } else if (node.nodeType === 1 && node.childNodes &&
                !['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'IMG'].includes(node.tagName)) {
                Array.from(node.childNodes).forEach(child => findCandidates(child));
            }
        }

        rootList.forEach(root => {
            if (root && root.isConnected) findCandidates(root);
        });

        console.log(`[DarkPatternDetector] Found ${candidates.length} new candidates (${incremental ? 'incremental' : 'full'} scan)`);

        // Highlight candidates (regex verified)
        let nanoSentThisScan = 0;
        candidates.forEach(candidate => {
            candidate.pattern.strictRegex.lastIndex = 0;
            if (candidate.pattern.strictRegex.test(candidate.content)) {
                const detectionId = createId('detection');
                const span = highlightTextNode(candidate.node, candidate.pattern, null, detectionId);
                found = true;
                detectionResults.push({
                    detectionId,
                    type: candidate.pattern.type,
                    text: candidate.content.substring(0, 50),
                    aiScore: "Regex"
                });
                localEvents.push(createLocalEvent(detectionId, candidate.pattern.type, 'regex'));

                // Optional, non-blocking Nano verification. Only send a bounded
                // number per scan and stop if Nano is known unavailable.
                if (nanoStatus !== 'unavailable' && nanoSentThisScan < MAX_NANO_VERIFICATIONS && span) {
                    nanoSentThisScan++;
                    verifyWithNano(span, candidate.context, candidate.pattern.type);
                }
            }
        });

        // Visual interference check
        if (visualEnabled) {
            const visualCandidates = checkVisualInterference();
            visualCandidates.forEach(cand => {
                const detectionId = cand.node.dataset.safeWebDetectionId || createId('detection');
                cand.node.dataset.safeWebDetectionId = detectionId;
                cand.node.style.border = "2px solid #ff9800";
                cand.node.style.boxShadow = "0 0 5px #ff9800";
                cand.node.title = "Dark Pattern: Visual Interference (False Hierarchy)";
                found = true;
                detectionResults.push({
                    detectionId,
                    type: "Visual Interference",
                    text: cand.text.substring(0, 50),
                    aiScore: "Heuristic"
                });
                localEvents.push(createLocalEvent(detectionId, 'Visual Interference', 'heuristic'));
            });
            console.log(`[DarkPatternDetector] Found ${visualCandidates.length} visual interference patterns`);
        }

        await persistLocalEvents(localEvents);

        return found;
    } catch (err) {
        console.error("[DarkPatternDetector] Scan error:", err);
    } finally {
        isScanning = false;
        hasScanned = true;

        // If Nano verifications are still outstanding, the final resultsReady will
        // be sent when they drain (see verifyWithNano). Otherwise notify now.
        if (pendingVerifications === 0) {
            notifyResultsReady();
        } else {
            lastScanUsedNano = true; // at least one verification was dispatched
        }
    }

    return found;
}

function notifyResultsReady() {
    try {
        chrome.runtime.sendMessage({
            action: "resultsReady",
            count: detectionResults.length,
            results: detectionResults,
            hasScanned: true,
            sessionState: getObservationState(),
            mode: lastScanUsedNano && nanoStatus === 'available' ? "AI-verified" : "Regex only"
        });
    } catch (e) {
        // Popup not open
    }
}

/**
 * Highlight a text node with the dark pattern warning. Returns the created span
 * (or null) so callers can later un-highlight it if Nano disagrees.
 */
function highlightTextNode(textNode, pattern, aiResult, detectionId) {
    if (!textNode || !textNode.parentNode) {
        console.debug("[DarkPatternDetector] Skipping highlight - node detached");
        return null;
    }
    const span = document.createElement('span');
    span.className = 'safe-web-highlight';
    span.dataset.safeWebType = pattern.type;
    span.dataset.safeWebDetectionId = detectionId || createId('detection');

    let title = `Dark Pattern: ${pattern.type}\n${pattern.message}`;
    if (aiResult && aiResult.score) {
        title += `\nAI Confidence: ${(aiResult.score * 100).toFixed(0)}%`;
    }
    span.title = title;
    span.textContent = textNode.nodeValue;

    textNode.parentNode.replaceChild(span, textNode);
    return span;
}

/**
 * Restore a highlighted span back to a plain text node (Nano said it's benign).
 */
function unhighlight(span) {
    if (!span || !span.parentNode) return;
    const text = document.createTextNode(span.textContent || '');
    span.parentNode.replaceChild(text, span);
    // Remove this entry from detectionResults
    const idx = detectionResults.findIndex(r => r.detectionId === span.dataset.safeWebDetectionId);
    if (idx !== -1) detectionResults.splice(idx, 1);
}

/**
 * Ask the background (which proxies to the offscreen document) to verify a
 * candidate with Gemini Nano. Non-blocking: never throws into the scan loop.
 */
function verifyWithNano(span, text, category) {
    pendingVerifications++;
    chrome.runtime.sendMessage(
        { action: 'predict', text, category },
        (response) => {
            try {
                if (chrome.runtime.lastError && !response) {
                    // background unreachable
                }
                if (!response) {
                    if (nanoStatus === 'unknown') nanoStatus = 'unavailable';
                } else if (response.unavailable) {
                    nanoStatus = 'unavailable';
                } else if (response.fallback) {
                    // keep regex highlight; Nano couldn't decide
                    if (nanoStatus === 'unknown') nanoStatus = 'available';
                } else if (response.isDarkPattern === false && response.confidence === 'high') {
                    // High-confidence benign → undo the regex highlight
                    unhighlight(span);
                    if (nanoStatus === 'unknown') nanoStatus = 'available';
                    lastScanUsedNano = true;
                } else {
                    // Confirmed dark pattern or low confidence → keep highlight
                    if (nanoStatus === 'unknown') nanoStatus = 'available';
                    lastScanUsedNano = true;
                }
            } catch (e) {
                console.debug("[DarkPatternDetector] Nano verify error:", e);
            } finally {
                pendingVerifications--;
                if (pendingVerifications === 0 && !isScanning) {
                    notifyResultsReady();
                }
            }
        }
    );
}

/**
 * Get current detection results
 */
function getResults() {
    if (detectionResults.length === 0) {
        document.querySelectorAll('.safe-web-highlight').forEach(el => {
            detectionResults.push({
                detectionId: el.dataset.safeWebDetectionId || createId('detection'),
                type: el.dataset.safeWebType || "Unknown",
                text: (el.textContent || "").substring(0, 50)
            });
        });
    }
    return {
        count: detectionResults.length,
        results: detectionResults,
        isScanning: isScanning,
        hasScanned: hasScanned,
        sessionState: getObservationState(),
        mode: lastScanUsedNano && nanoStatus === 'available' ? "AI-verified" : "Regex only"
    };
}

// --- Message listeners ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startObservation") {
        observationActive = true;
        isPaused = false;
        sessionId = sessionId || createId('session');
        chrome.storage.local.set({ isPaused: false });
        ensureObserver();
        scanAndHighlight(document.body, false);
        sendResponse({ sessionState: getObservationState() });
        return false;
    } else if (request.action === "scan") {
        if (observationActive && !isPaused) {
            scanAndHighlight(document.body, false);
        } else {
            alert("Observation is not active. Click 'Start Observation' in the extension popup.");
        }
        sendResponse({ isScanning: isScanning, sessionState: getObservationState() });
        return false;
    } else if (request.action === "getResults") {
        sendResponse(getResults());
    } else if (request.action === "togglePause") {
        isPaused = request.isPaused;
        observationActive = true;
        chrome.storage.local.set({ isPaused });
        if (!isPaused) {
            sessionId = sessionId || createId('session');
            ensureObserver();
            scanAndHighlight(document.body, false);
        }
        sendResponse({ sessionState: getObservationState() });
        return false;
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateConfig") {
        visualEnabled = request.visualEnabled;
        console.log(`[DarkPatternDetector] Config updated. Visual: ${visualEnabled}`);
        if (visualEnabled) scanAndHighlight(document.body, false);
    }
});

// --- MutationObserver for dynamic content (Infinite Scroll / SPA) ---
let scanTimeout = null;
const pendingMutationRoots = new Set();

observer = new MutationObserver((mutations) => {
    if (!observationActive || isPaused || isScanning) return;

    mutations.forEach(m => {
        if (m.type === 'childList') {
            m.addedNodes.forEach(n => {
                if (n.nodeType === 1) pendingMutationRoots.add(n);
                else if (n.nodeType === 3 && n.parentNode) pendingMutationRoots.add(n.parentNode);
            });
        } else if (m.type === 'characterData' && m.target.parentNode) {
            pendingMutationRoots.add(m.target.parentNode);
        }
    });

    // Debounce: wait 750ms after the last DOM change to avoid thrashing.
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => {
        const roots = Array.from(pendingMutationRoots).filter(r => r.isConnected);
        pendingMutationRoots.clear();
        if (roots.length === 0) return;
        // Many roots usually means a full page/route change — scan body instead.
        const target = roots.length > 20 ? document.body : roots;
        console.log(`[DarkPatternDetector] DOM changed, triggering incremental scan on ${Array.isArray(target) ? target.length : 1} root(s)`);
        scanAndHighlight(target, true);
    }, 750);
});

function ensureObserver() {
    if (observer && document.body) {
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
}

// --- Unified initialization ---
Promise.all([
    patternsLoadedPromise,
    new Promise(resolve => chrome.storage.local.get(['visualEnabled', 'isPaused'], resolve))
]).then(([_, config]) => {
    isPaused = config.isPaused || false;
    visualEnabled = config.visualEnabled || false;
    observationActive = false;

    console.log(`[DarkPatternDetector] Initialized. Visual: ${visualEnabled}, Observation: ${getObservationState()}`);

});

/**
 * Visual Interference Detection (False Hierarchy)
 * Finds button pairs where one is significantly less visible than the other
 * (e.g. a faint "Reject" next to a bold "Accept" in a cookie banner).
 */
function checkVisualInterference() {
    if (!visualEnabled) return [];

    const results = [];
    const containers = document.querySelectorAll('div, form, section, footer, header');

    // Opposing-action pairs (lowercased substrings)
    const PAIRS = [
        ['accept', 'reject'], ['agree', 'reject'], ['allow', 'reject'],
        ['yes', 'no'], ['accept all', 'reject all'], ['subscribe', 'decline'],
        ['agree', 'disagree'], ['got it', 'no thanks']
    ];

    const flagged = new Set();

    containers.forEach(container => {
        // Skip oversized layout wrappers
        if (container.scrollHeight > 600 || container.scrollWidth > 800) return;

        const buttons = Array.from(container.querySelectorAll(
            'button, a.btn, a[class*="btn"], a[class*="button"], input[type="submit"], input[type="button"]'
        )).filter(b => isVisible(b));

        if (buttons.length < 2 || buttons.length > 6) return;

        const texts = buttons.map(b => (b.innerText || b.value || '').toLowerCase().trim());

        PAIRS.forEach(([a, b]) => {
            const ai = texts.findIndex(t => t.includes(a));
            const bi = texts.findIndex(t => t.includes(b));
            if (ai === -1 || bi === -1 || ai === bi) return;

            const btnA = buttons[ai], btnB = buttons[bi];
            if (flagged.has(btnA) || flagged.has(btnB)) return;

            const styleA = window.getComputedStyle(btnA);
            const styleB = window.getComputedStyle(btnB);

            const contrastA = contrastRatio(parseColor(styleA.color), resolveBackground(btnA));
            const contrastB = contrastRatio(parseColor(styleB.color), resolveBackground(btnB));
            if (contrastA == null || contrastB == null) return;

            const opacityA = parseFloat(styleA.opacity);
            const opacityB = parseFloat(styleB.opacity);
            const sizeA = parseFloat(styleA.fontSize);
            const sizeB = parseFloat(styleB.fontSize);

            // A button is "weak" if its contrast < 3:1, opacity < 0.6, or font < 11px.
            // The other must be clearly strong (contrast >= 4.5:1, opacity >= 0.9).
            const weakA = contrastA < 3 || opacityA < 0.6 || sizeA < 11;
            const strongA = contrastA >= 4.5 && opacityA >= 0.9;
            const weakB = contrastB < 3 || opacityB < 0.6 || sizeB < 11;
            const strongB = contrastB >= 4.5 && opacityB >= 0.9;

            let weakBtn = null;
            if (weakA && strongB) weakBtn = btnA;
            else if (weakB && strongA) weakBtn = btnB;
            // Also flag a large contrast disparity even if neither is "strong"
            else if (Math.abs(contrastA - contrastB) >= 3.5 &&
                ((contrastA < 3) || (contrastB < 3))) {
                weakBtn = contrastA < contrastB ? btnA : btnB;
            }

            if (weakBtn && !flagged.has(weakBtn)) {
                flagged.add(weakBtn);
                results.push({
                    node: weakBtn,
                    type: 'Visual Interference',
                    text: weakBtn.innerText || weakBtn.value || 'button'
                });
            }
        });
    });

    return results;
}

console.log("[DarkPatternDetector] Content script loaded (detector core + optional Nano)");
