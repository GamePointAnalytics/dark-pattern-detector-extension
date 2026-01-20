/**
 * Safe Web - Dark Pattern Detector (v2.0 - AI Enhanced)
 * Content Script
 */

// Dark Pattern Keywords (Regex) - Used for candidate selection
const PATTERNS = [
    {
        type: "Urgency",
        regex: /\b(hurry|rush|act now|time is running out|offer ends in|only \d+ left|limited time|don't miss|expires)\b/gi,
        message: "This attempts to create false urgency to make you buy faster."
    },
    {
        type: "Scarcity",
        regex: /\b(in high demand|reserved for|selling fast|almost gone|low stock|few left|last chance)\b/gi,
        message: "This suggests scarcity to trigger fear of missing out (FOMO)."
    },
    {
        type: "Social Proof",
        regex: /\b(\d+ people are viewing|\d+ people viewing|purchased by \d+ people|in \d+ carts|\d+ customers)\b/gi,
        message: "This uses social pressure to influence your decision."
    }
];

// Detection results storage
let detectionResults = [];
let aiEnabled = true;
const AI_THRESHOLD = 0.6;

// Initialize
async function init() {
    // Load settings
    try {
        const settings = await chrome.storage.local.get(['aiEnabled']);
        aiEnabled = settings.aiEnabled !== false; // Default to true
    } catch (e) {
        console.log("[Safe Web] Using default settings");
    }

    // Wait for AI model to be ready
    if (window.SafeWebAI && window.SafeWebAI.isReady) {
        console.log("[Safe Web] AI Model ready:", window.SafeWebAI.modelName);
    }
}

/**
 * Main scanning function with AI integration
 */
async function scanAndHighlight() {
    detectionResults = [];
    let found = false;

    // Collect all text nodes that match regex patterns
    const candidates = [];

    function findCandidates(node) {
        if (node.nodeType === 3) { // Text node
            const parent = node.parentNode;
            if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' ||
                parent.tagName === 'NOSCRIPT' || parent.classList?.contains('safe-web-highlight'))) {
                return;
            }

            const content = node.nodeValue;
            if (!content || content.trim().length < 3) return;

            PATTERNS.forEach(pattern => {
                // Reset regex lastIndex
                pattern.regex.lastIndex = 0;
                if (pattern.regex.test(content)) {
                    candidates.push({
                        node: node,
                        content: content,
                        pattern: pattern
                    });
                }
            });
        } else if (node.nodeType === 1 && node.childNodes &&
            !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName)) {
            Array.from(node.childNodes).forEach(child => findCandidates(child));
        }
    }

    findCandidates(document.body);
    console.log(`[Safe Web] Found ${candidates.length} regex candidates`);

    // Process candidates with AI (if enabled)
    for (const candidate of candidates) {
        let aiResult = null;

        if (aiEnabled && window.SafeWebAI) {
            try {
                aiResult = await window.SafeWebAI.predictDarkPattern(candidate.content);
            } catch (e) {
                console.warn("[Safe Web] AI prediction failed:", e);
            }
        }

        // Determine if we should highlight
        const shouldHighlight = !aiEnabled || !aiResult || aiResult.score >= AI_THRESHOLD;

        if (shouldHighlight) {
            highlightTextNode(candidate.node, candidate.pattern, aiResult);
            found = true;

            detectionResults.push({
                type: aiResult?.type || candidate.pattern.type,
                score: aiResult?.score || 0.5,
                confidence: aiResult?.confidence || "Regex Only",
                text: candidate.content.substring(0, 50)
            });
        }
    }

    // Notify popup of results
    if (detectionResults.length > 0) {
        try {
            await chrome.runtime.sendMessage({
                action: "resultsReady",
                count: detectionResults.length,
                results: detectionResults
            });
        } catch (e) {
            // Popup not open, that's fine
        }
        console.log(`[Safe Web] Highlighted ${detectionResults.length} patterns`);
    }

    return found;
}

/**
 * Highlight a text node with the detected pattern
 */
function highlightTextNode(node, pattern, aiResult) {
    const parent = node.parentNode;
    if (!parent) return;

    const content = node.nodeValue;
    pattern.regex.lastIndex = 0;
    const parts = content.split(pattern.regex);

    if (parts.length <= 1) return;

    const fragment = document.createDocumentFragment();

    parts.forEach((part) => {
        pattern.regex.lastIndex = 0;
        if (pattern.regex.test(part)) {
            const span = document.createElement('span');
            span.className = 'safe-web-highlight';
            span.textContent = part;

            // Build tooltip
            let tooltip = `Safe Web: ${pattern.message}`;
            if (aiResult) {
                tooltip += `\n\nAI Confidence: ${(aiResult.score * 100).toFixed(0)}%`;
                tooltip += `\nType: ${aiResult.type}`;
            }
            span.title = tooltip;

            span.dataset.safeWebType = aiResult?.type || pattern.type;
            span.dataset.safeWebScore = aiResult?.score || "N/A";

            // Add AI badge if AI is enabled
            if (aiResult && aiResult.score >= AI_THRESHOLD) {
                span.dataset.safeWebAi = "true";
            }

            fragment.appendChild(span);
        } else if (part) {
            fragment.appendChild(document.createTextNode(part));
        }
    });

    if (fragment.childNodes.length > 0) {
        parent.replaceChild(fragment, node);
    }
}

/**
 * Get current detection results
 */
function getResults() {
    return {
        count: detectionResults.length,
        results: detectionResults,
        aiEnabled: aiEnabled
    };
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scan") {
        scanAndHighlight().then(() => {
            sendResponse(getResults());
        });
        return true; // Async response
    }
    if (request.action === "getResults") {
        sendResponse(getResults());
    }
    if (request.action === "setAiEnabled") {
        aiEnabled = request.enabled;
        chrome.storage.local.set({ aiEnabled: aiEnabled });
        sendResponse({ success: true });
    }
});

// Initialize and run
init().then(() => {
    // Run 2 seconds after load
    setTimeout(scanAndHighlight, 2000);
});
