/**
 * DarkPatternDetector - Content Script (v2.2 - Regex Only)
 * 
 * Detects and highlights manipulative design patterns (Dark Patterns) on web pages
 * using regex-based pattern matching across 10 categories.
 */

// Dark Pattern Keywords (Regex) - 10 categories
// broadRegex: Phrase-context patterns to catch candidates for AI verification
// strictRegex: High-precision fallback if AI fails
// Dark Pattern Keywords (Regex) - 10 categories
let PATTERNS = []; // Loaded dynamically from patterns.txt

// Initialize patterns
async function loadPatterns() {
    try {
        const url = chrome.runtime.getURL('patterns.txt');
        const response = await fetch(url);
        const text = await response.text();
        PATTERNS = parsePatterns(text);
        console.log(`[DarkPatternDetector] Loaded ${PATTERNS.length} categories from patterns.txt`);
    } catch (e) {
        if (e.message.includes('Failed to fetch') || !chrome.runtime?.id) {
            console.log("[DarkPatternDetector] Context invalidated (Extension reloaded). Please refresh this page to resume scanning.");
        } else {
            console.error("[DarkPatternDetector] Failed to load patterns.txt:", e);
        }
    }
}

// Parse the text file format
function parsePatterns(text) {
    const lines = text.split('\n');
    const categories = [];
    let currentCategory = null;
    let keywords = [];

    lines.forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return; // Skip comments/empty

        // Check for [Category Name]
        const categoryMatch = line.match(/^\[(.*)\]$/);
        if (categoryMatch) {
            // Save previous category
            if (currentCategory) {
                categories.push(createPatternObject(currentCategory, keywords));
            }
            currentCategory = categoryMatch[1];
            keywords = [];
        } else {
            // Add keywords (split by comma)
            const parts = line.split(',').map(p => p.trim()).filter(p => p.length > 0);
            keywords.push(...parts);
        }
    });

    // Save last category
    if (currentCategory) {
        categories.push(createPatternObject(currentCategory, keywords));
    }

    return categories;
}

// Helper to build the regex object
function createPatternObject(type, keywordList) {
    // Join all keywords with OR logic: (keyword1|keyword2|...)
    // We escape special chars EXCEPT keys like \d, ., ?, *, +, (, ), | which are needed for regex logic
    // Since user inputs raw regex fragments in text file (e.g. \d+), we generally TRUST their input.
    // Ideally we'd have a flag for "isRegex", but for simplicity here we assume fragments are valid regex parts.

    const broadPattern = `\\b(${keywordList.join('|')})\\b`;

    // For now, Strict Regex is just a stricter subset (or same) since we lost the manual separation in text file.
    // In a sophisticated text format, we could have [Urgency-Strict]. 
    // For now, we reuse the same regex for strictly matching or rely on AI confidence.

    return {
        type: type,
        broadRegex: new RegExp(broadPattern, 'gi'),
        // Strict fallback is same as broad for now in this simple text format
        // This relies more heavily on AI for refinement
        strictRegex: new RegExp(broadPattern, 'gi'),
        message: `Potential ${type} pattern detected.`
    };
}

// Initialize patterns - Store promise to avoid race conditions
const patternsLoadedPromise = loadPatterns();


// Common benign patterns to ignore (Legalese, footers, etc.)
const IGNORED_PATTERNS = [
    /all rights reserved/gi,
    /privacy policy/gi,
    /terms (of|and) (use|service|conditions)/gi,
    /copyright/gi,
    /trademarks?/gi,
    /\d+-star prices/gi, // Specific fix for user's feedback
    /responsible for content/gi,
    /mobile app/gi
];

// Detection results storage
let detectionResults = [];
let isScanning = false;
let hasScanned = false;
let isPaused = false;
let lastScanUsedAI = false; // Tracks if AI was actually used in the last scan

// Initialize Pause State
chrome.storage.local.get(['isPaused'], (result) => {
    isPaused = result.isPaused || false;
});

/**
 * Main scanning function
 */
// Helper for AI timeout
const timeoutPromise = (ms) => new Promise((resolve) => setTimeout(() => resolve(null), ms));

async function scanAndHighlight() {
    if (isScanning) return;
    isScanning = true;
    detectionResults = [];
    let found = false;
    lastScanUsedAI = false; // Reset for this scan

    try {
        // Ensure patterns are fully loaded before proceeding
        await patternsLoadedPromise;

        if (PATTERNS.length === 0) {
            console.warn("[DarkPatternDetector] No patterns available. Scan aborted.");
            return;
        }

        // First, count any already-highlighted elements from previous scans
        const existingHighlights = document.querySelectorAll('.safe-web-highlight');
        existingHighlights.forEach(el => {
            detectionResults.push({
                type: el.dataset.safeWebType || "Unknown",
                text: el.textContent.substring(0, 50)
            });
        });

        // Collect all text nodes that match regex patterns
        // Collect all text nodes that match regex patterns
        const candidates = [];

        function isVisible(element) {
            if (!element) return false;

            // Fast checks
            if (element.offsetParent === null && element.style.position !== 'fixed') return false; // Hidden (display: none)

            // Detailed style checks
            const style = window.getComputedStyle(element);
            if (style.display === 'none') return false;
            if (style.visibility === 'hidden') return false;
            if (style.opacity === '0') return false;

            // Size check (skip 1x1 tracking pixels etc)
            const rect = element.getBoundingClientRect();
            if (rect.width < 5 || rect.height < 5) return false;

            return true;
        }

        function findCandidates(node) {
            if (node.nodeType === 3) { // Text node
                const parent = node.parentNode;
                if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' ||
                    parent.tagName === 'NOSCRIPT' || parent.classList?.contains('safe-web-highlight'))) {
                    return;
                }

                // Text content check
                const content = node.nodeValue;
                if (!content || content.trim().length < 3) return;

                // Visibility check: Only scan what the user can see
                if (!isVisible(parent)) return;

                // Check if content matches any ignore patterns
                for (const ignorePattern of IGNORED_PATTERNS) {
                    if (ignorePattern.test(content)) return;
                }

                PATTERNS.forEach(pattern => {
                    // Use BROAD regex to find ANY potential candidate for the AI
                    pattern.broadRegex.lastIndex = 0;
                    if (pattern.broadRegex.test(content)) {
                        // Start with the text node content
                        let context = content;

                        // Try to get surrounding context from parent (up to 300 chars)
                        // This helps the AI understand "annual event" vs "billed annually"
                        if (parent && parent.innerText) {
                            context = parent.innerText;
                            // Collapse whitespace
                            context = context.replace(/\s+/g, ' ').trim();
                            // Truncate if too long to prevent performance issues
                            if (context.length > 300) {
                                context = context.substring(0, 300) + "...";
                            }
                        }

                        candidates.push({
                            node: node,
                            content: content,
                            context: context,
                            pattern: pattern
                        });
                    }
                });
            } else if (node.nodeType === 1 && node.childNodes &&
                !['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'IMG'].includes(node.tagName)) {
                // Basic optimization: Don't traverse into obviously hidden containers
                // (Limited depth check could be added here for performance)
                Array.from(node.childNodes).forEach(child => findCandidates(child));
            }
        }

        findCandidates(document.body);
        console.log(`[DarkPatternDetector] Found ${candidates.length} new candidates, ${existingHighlights.length} existing`);

        // Process candidates in batches to avoid overloading the sandbox (prevent timeouts)
        const BATCH_SIZE = 3;
        const results = [];

        for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
            // Send progress update
            try {
                chrome.runtime.sendMessage({
                    action: "scanProgress",
                    progress: Math.round((i / candidates.length) * 100),
                    found: detectionResults.length + existingHighlights.length
                });
            } catch (e) { /* Popup closed */ }

            const batch = candidates.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (candidate) => {
                let aiResult = null;

                // Try AI prediction if available
                if (window.SafeWebAI && window.SafeWebAI.isReady) {
                    try {
                        // Log the exact context being sent to AI
                        console.log(`%c[DarkPatternDetector] 🤖 AI Request:`, "color: #667eea; font-weight: bold;");
                        console.log(`   📝 Context: "${candidate.context}"`);
                        console.log(`   🔑 Matched: "${candidate.content}"`);

                        // Race against timeout (5 seconds)
                        aiResult = await Promise.race([
                            window.SafeWebAI.predictDarkPattern(candidate.context),
                            timeoutPromise(5000)
                        ]);

                        if (!aiResult) throw new Error("AI Timeout");

                        if (aiResult && aiResult.score) {
                            const style = aiResult.score > 0.6 ? "color: #e53e3e; font-weight: bold;" : "color: #38a169;";
                            console.log(`   🎯 Result: %c${aiResult.type} (${(aiResult.score * 100).toFixed(1)}%)`, style);
                        } else {
                            console.log(`   ❓ Result: Low Confidence / Unknown`);
                        }
                    } catch (e) {
                        console.log("[DarkPatternDetector] AI check timeout/failed, using regex:", e.message);
                    }
                } else {
                    console.log("[DarkPatternDetector] AI not ready, using regex fallback");
                }

                return { candidate, aiResult };
            });

            // Wait for current batch to finish before starting next
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Update results immediately for found items in this batch
            for (const { candidate, aiResult } of batchResults) {
                let shouldHighlight = false;
                let finalScore = "Regex";

                if (aiResult && !aiResult.fallback && !aiResult.error) {
                    // AI is working: Trust the AI score (Broad Match + AI Verification)
                    if (aiResult.score && aiResult.score > 0.6) {
                        shouldHighlight = true;
                        finalScore = aiResult.score;
                        lastScanUsedAI = true; // Mark that AI was successfully used
                    }
                } else {
                    // AI failed/unavailable: Fallback to STRICT Regex (High Precision)
                    // We re-check the content against the STRICT regex to avoid false positives
                    candidate.pattern.strictRegex.lastIndex = 0;
                    if (candidate.pattern.strictRegex.test(candidate.content)) {
                        shouldHighlight = true;
                        finalScore = "Regex Fallback";
                    }
                }

                if (shouldHighlight) {
                    highlightTextNode(candidate.node, candidate.pattern, aiResult);
                    found = true;
                    detectionResults.push({
                        type: candidate.pattern.type,
                        text: candidate.content.substring(0, 50),
                        aiScore: finalScore
                    });
                }
            }
        }

        return found;
    } catch (err) {
        console.error("[DarkPatternDetector] Scan error:", err);
    } finally {
        isScanning = false;
        hasScanned = true;

        // Notify popup of results
        try {
            if (PATTERNS.length === 0) {
                console.warn("[DarkPatternDetector] Scan finished with 0 results because PATTERNS list is empty/failed to load.");
            }

            chrome.runtime.sendMessage({
                action: "resultsReady",
                count: detectionResults.length,
                results: detectionResults,
                hasScanned: true
            });
        } catch (e) {
            // Popup not open
        }
    }

    return found;
}

/**
 * Highlight a text node with the dark pattern warning
 */
function highlightTextNode(textNode, pattern, aiResult) {
    const span = document.createElement('span');
    span.className = 'safe-web-highlight';
    span.dataset.safeWebType = pattern.type;

    let title = `Dark Pattern: ${pattern.type}\n${pattern.message}`;
    if (aiResult && aiResult.score) {
        title += `\nAI Confidence: ${(aiResult.score * 100).toFixed(0)}%`;
    }
    span.title = title;

    const text = textNode.nodeValue;
    span.textContent = text;

    if (textNode.parentNode) {
        textNode.parentNode.replaceChild(span, textNode);
    } else {
        // Node was detached from DOM during async processing
        console.debug("Skipping highlight - node detached");
    }
}

/**
 * Get current detection results
 */
function getResults() {
    // If detectionResults is empty, count existing highlights
    if (detectionResults.length === 0) {
        const existingHighlights = document.querySelectorAll('.safe-web-highlight');
        existingHighlights.forEach(el => {
            detectionResults.push({
                type: el.dataset.safeWebType || "Unknown",
                text: el.textContent.substring(0, 50)
            });
        });
    }
    return {
        count: detectionResults.length,
        results: detectionResults,
        isScanning: isScanning,
        hasScanned: hasScanned,
        mode: lastScanUsedAI ? "Hybrid AI" : "Fallback Regex"
    };
}

// Listen for messages from Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scan") {
        if (!isPaused) {
            scanAndHighlight();
        } else {
            alert("Detection is paused. Click 'Resume Detection' in the extension popup to scan.");
        }
        sendResponse({ isScanning: true }); // Return immediately
        return false;
    } else if (request.action === "getResults") {
        sendResponse(getResults());
    } else if (request.action === "togglePause") {
        isPaused = request.isPaused;
        if (!isPaused) {
            // Auto-resume scan if unpaused
            scanAndHighlight();
        }
    }
});

// Run scan 2 seconds after page load
// Setup MutationObserver for dynamic content (Infinite Scroll / SPA)
let scanTimeout = null;
const observer = new MutationObserver((mutations) => {
    if (isPaused || isScanning) return;

    // Debounce: Wait 1.5s after last DOM change to avoid performance issues
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => {
        console.log("[DarkPatternDetector] DOM changed (scroll/nav), triggering auto-scan...");
        scanAndHighlight();
    }, 750);
});

// Run observer & initial scan
patternsLoadedPromise.then(() => {
    if (!isPaused) {
        // Start observing
        observer.observe(document.body, { childList: true, subtree: true });
        // Initial Scan
        scanAndHighlight();
    }
});

console.log("[DarkPatternDetector] Content script loaded (regex detection)");
