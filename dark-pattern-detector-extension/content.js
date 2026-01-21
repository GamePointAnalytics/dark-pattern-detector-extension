/**
 * DarkPatternDetector - Content Script (v2.2 - Regex Only)
 * 
 * Detects and highlights manipulative design patterns (Dark Patterns) on web pages
 * using regex-based pattern matching across 10 categories.
 */

// Dark Pattern Keywords (Regex) - 10 categories
// broadRegex: Phrase-context patterns to catch candidates for AI verification
// strictRegex: High-precision fallback if AI fails
const PATTERNS = [
    {
        type: "Urgency",
        broadRegex: /\b(hurry|rush|act now|time.{0,5}running out|offer ends|ends soon|ends today|only \d+ left|\d+ left|limited time|limited offer|don't miss|miss a deal|prices may|expires soon|expires today|last day|countdown|flash sale|today only|order now)\b/gi,
        strictRegex: /\b(hurry|rush|act now|time is running out|offer ends in|only \d+ left|limited time|don't miss|miss a deal|prices may go up|expires|ends soon|last day|countdown|flash sale|today only)\b/gi,
        message: "Creates false urgency to rush your decision."
    },
    {
        type: "Scarcity",
        broadRegex: /\b(high demand|in demand|selling fast|almost gone|low stock|few left|only \d+ remaining|last chance|while supplies|limited edition|exclusive offer|exclusive access|running low|almost sold out|selling out)\b/gi,
        strictRegex: /\b(high demand|in high demand|reserved for|selling fast|almost gone|low stock|few left|last chance|while supplies last|limited edition|exclusive|running low|almost sold out)\b/gi,
        message: "Suggests scarcity to trigger FOMO."
    },
    {
        type: "Social Proof",
        broadRegex: /\b(\d+ people viewing|\d+ viewing|people are viewing|just purchased|recently purchased|\d+ bought|people bought|in \d+ carts|other customers|customers also|trending now|bestseller|#1 best|most popular|others looking|people looking)\b/gi,
        strictRegex: /\b(\d+ people are viewing|\d+ people viewing|purchased by \d+ people|in \d+ carts|\d+ customers|trending|bestseller|most popular|people bought|people looking)\b/gi,
        message: "Uses social pressure to influence you."
    },
    {
        type: "Confirmshaming",
        broadRegex: /\b(no thanks.{0,10}don't|no thanks.{0,10}hate|i don't want to save|don't want to save|i prefer paying|prefer paying full|full price|skip this offer|i'll pay more|pay more later|don't care about|i hate saving)\b/gi,
        strictRegex: /\b(no thanks, i don't want|i prefer paying full price|i don't want to save|i hate saving|continue without|skip this offer|i'll pay more|i don't care about)\b/gi,
        message: "Guilts you by shaming the decline option."
    },
    {
        type: "Hidden Costs",
        broadRegex: /\b(service fee|processing fee|booking fee|handling fee|convenience fee|platform fee|admin fee|delivery fee|additional charge|plus taxes|additional taxes|surcharge|added at checkout|extra charge)\b/gi,
        strictRegex: /\b(service fee|processing fee|handling charge|convenience fee|booking fee|additional taxes|platform fee|admin fee|delivery surcharge|added at checkout)\b/gi,
        message: "Reveals unexpected charges late."
    },
    {
        type: "Hidden Subscription",
        broadRegex: /\b(free trial|trial period|trial ends|cancel anytime|cancel before|auto.?renews|subscription.{0,10}(starts|continues|begins)|recurring (payment|charge|billing)|auto.?renewal|billed monthly|billed annually|renews annually|charged after|then \$\d+)\b/gi,
        strictRegex: /\b(free trial.{0,20}then|cancel anytime after|automatically renews|subscription continues|recurring.{0,10}charges|auto-renewal|charged after trial|renews annually|billed monthly until)\b/gi,
        message: "Obscures recurring payment terms."
    },
    {
        type: "Nagging",
        broadRegex: /\b(you haven't|you still haven't|don't forget to|you're missing|missing out|complete your (purchase|order|profile)|your cart|items? in your cart|cart is waiting|left in cart|come back|unfinished|trial (is )?ending|offer ending)\b/gi,
        strictRegex: /\b(you still haven't|don't forget to|you're missing out|complete your purchase|left items in your cart|cart is waiting|come back and|unfinished business|trial is ending)\b/gi,
        message: "Persistently interrupts to pressure you."
    },
    {
        type: "Obstruction",
        broadRegex: /\b(to cancel.{0,10}call|call to cancel|cancel.{0,10}(requires|must)|are you sure\??|before you (go|leave)|sorry to see you|you will lose|lose (your |access|benefits)|lose all|delete your account|giving up|what you're giving up)\b/gi,
        strictRegex: /\b(to cancel.{0,20}call|cancellation requires|are you sure\?|before you go|sorry to see you leave|lose.{0,10}benefits|cancelling will delete|what you're giving up|lose access)\b/gi,
        message: "Makes it difficult to cancel or leave."
    },
    {
        type: "Preselection",
        broadRegex: /\b(sign me up for|agree to receive|agree to (the )?terms|add.{0,10}(protection|insurance|warranty)|include.{0,10}(protection|warranty)|donate \$|priority shipping|subscribe to (our|the)|opt.?in|opted in|pre.?selected)\b/gi,
        strictRegex: /\b(sign me up for|agree to receive|add.{0,10}for \$|include.{0,10}warranty|donate \$|priority shipping|subscribe to our|opt-in to partner)\b/gi,
        message: "Pre-checks boxes that favor the business."
    },
    {
        type: "Forced Action",
        broadRegex: /\b(create (an )?account to|sign up to (view|continue|access)|enter (your )?email to|share (to|with \d+)|download (our |the )?app to|turn on notifications|enable (notifications|location) to|invite friends to)\b/gi,
        strictRegex: /\b(create an account to|sign up to view|enter your email to|share with \d+ friends|download our app to|turn on notifications to|enable location to|invite friends to get)\b/gi,
        message: "Requires unrelated actions to proceed."
    }
];


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

/**
 * Main scanning function
 */
async function scanAndHighlight() {
    if (isScanning) return;
    isScanning = true;
    detectionResults = [];
    let found = false;

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
                    candidates.push({
                        node: node,
                        content: content,
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
                    // console.log(`[DarkPatternDetector] Checking with AI: "${candidate.content.substring(0, 50)}..."`);
                    aiResult = await window.SafeWebAI.predictDarkPattern(candidate.content);
                    // console.log(`[DarkPatternDetector] AI result:`, aiResult);
                } catch (e) {
                    console.warn("[DarkPatternDetector] AI check failed, using regex:", e);
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

    isScanning = false;
    hasScanned = true;

    // Notify popup of results
    try {
        chrome.runtime.sendMessage({
            action: "resultsReady",
            count: detectionResults.length,
            results: detectionResults,
            hasScanned: true
        });
    } catch (e) {
        // Popup not open
    }

    if (detectionResults.length > 0) {
        console.log(`[DarkPatternDetector] Highlighted ${detectionResults.length} dark patterns`);
    } else {
        console.log(`[DarkPatternDetector] No dark patterns found`);
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
        hasScanned: hasScanned
    };
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scan") {
        scanAndHighlight();
        sendResponse({ isScanning: true }); // Return immediately
        return false;
    }
    if (request.action === "getResults") {
        sendResponse(getResults());
    }
});

// Run scan 2 seconds after page load
setTimeout(scanAndHighlight, 2000);

console.log("[DarkPatternDetector] Content script loaded (regex detection)");
