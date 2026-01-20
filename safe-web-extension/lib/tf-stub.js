/**
 * Safe Web - Universal Sentence Encoder (USE) Loader
 * 
 * This module loads Google's Universal Sentence Encoder via TensorFlow.js
 * to perform semantic similarity-based dark pattern detection.
 * 
 * Model: Universal Sentence Encoder Lite (~30MB)
 * Source: TensorFlow Hub
 */

// Dark pattern examples for similarity matching
// Based on https://www.deceptive.design/types
const DARK_PATTERN_EXAMPLES = {
    // === FAKE URGENCY ===
    // Creates false time pressure to rush decisions
    fakeUrgency: [
        "Hurry! Limited time offer!",
        "Act now before it's too late!",
        "Offer ends soon!",
        "Don't miss out! Time is running out!",
        "Only available for the next hour!",
        "Flash sale ends in minutes!",
        "Order now to guarantee delivery!",
        "This deal expires at midnight!",
        "Sale ends today!",
        "Last day to save!",
        "Countdown: Order in the next 10 minutes"
    ],

    // === FAKE SCARCITY ===
    // False claims about limited availability
    fakeScarcity: [
        "Only 2 left in stock!",
        "Almost sold out!",
        "Limited stock remaining!",
        "Selling fast, don't miss out!",
        "Low inventory warning!",
        "Few items left at this price!",
        "Last chance to buy!",
        "Only 3 available!",
        "While supplies last!",
        "Limited edition - only 100 made",
        "Stock running low",
        "Exclusive limited quantity"
    ],

    // === FAKE SOCIAL PROOF ===
    // False or misleading social validation
    fakeSocialProof: [
        "15 people are viewing this right now",
        "Bought by 100 customers today",
        "20 people have this in their cart",
        "Trending product!",
        "Popular item - selling fast!",
        "Purchased 50 times in the last hour",
        "Join thousands of satisfied customers",
        "Most popular choice!",
        "Bestseller!",
        "5 people just bought this",
        "In high demand right now",
        "Other customers are looking at this"
    ],

    // === CONFIRMSHAMING ===
    // Guilting users into opting in via shame
    confirmshaming: [
        "No thanks, I don't want to save money",
        "I prefer paying full price",
        "Skip this great offer",
        "Continue without protection",
        "No, I don't want free shipping",
        "No thanks, I hate saving money",
        "I don't want to be informed about deals",
        "No, I prefer to miss out on savings",
        "I'll pay more, thanks",
        "No, I don't care about my security",
        "Skip, I don't want exclusive benefits",
        "I don't need help with this"
    ],

    // === HIDDEN COSTS ===
    // Unexpected charges revealed late in checkout
    hiddenCosts: [
        "Service fee added at checkout",
        "Processing fee: $4.99",
        "Handling charges apply",
        "Convenience fee",
        "Booking fee will be added",
        "Additional taxes and fees may apply",
        "Subject to service charges",
        "Platform fee",
        "Admin fee added",
        "Delivery surcharge"
    ],

    // === HIDDEN SUBSCRIPTION ===
    // Obscured recurring payment terms
    hiddenSubscription: [
        "Free trial, then $9.99/month",
        "Cancel anytime after billing starts",
        "Automatically renews at full price",
        "Subscription continues unless cancelled",
        "Recurring monthly charges apply",
        "Auto-renewal enabled by default",
        "You will be charged after trial ends",
        "Membership auto-renews annually",
        "Billed monthly until cancelled"
    ],

    // === NAGGING ===
    // Persistent interruption to pressure action
    nagging: [
        "You still haven't completed your profile!",
        "Don't forget to enable notifications!",
        "You're missing out on exclusive deals!",
        "Complete your purchase before it's gone!",
        "We noticed you left items in your cart",
        "Your cart is waiting for you",
        "Come back and complete your order",
        "You have unfinished business",
        "Reminder: Your trial is ending soon"
    ],

    // === OBSTRUCTION / HARD TO CANCEL ===
    // Making it difficult to leave or cancel
    obstruction: [
        "To cancel, please call our support line",
        "Cancellation requires speaking to a representative",
        "Are you sure? You'll lose all your benefits",
        "Before you go, consider these alternatives",
        "We're sorry to see you leave",
        "You'll lose access to exclusive features",
        "Cancelling will delete all your data",
        "Think about what you're giving up",
        "Your subscription benefits will be lost"
    ],

    // === PRESELECTION ===
    // Pre-checked boxes that favor the business
    preselection: [
        "Yes, sign me up for marketing emails",
        "I agree to receive promotional offers",
        "Add gift wrapping for $5",
        "Include extended warranty",
        "Yes, I want to donate $1 to charity",
        "Add priority shipping",
        "Subscribe to our newsletter",
        "Opt-in to partner offers"
    ],

    // === TRICK WORDING ===
    // Confusing language designed to mislead
    trickWording: [
        "Uncheck to not receive emails",
        "Opt out of not receiving updates",
        "Decline to accept the terms",
        "I do not wish to not be contacted",
        "Untick to disable notifications",
        "Check here if you don't want to opt out"
    ],

    // === FORCED ACTION ===
    // Requiring unrelated action to proceed
    forcedAction: [
        "Create an account to continue",
        "Sign up to view this content",
        "Enter your email to access",
        "Share with 3 friends to unlock",
        "Download our app to continue",
        "Turn on notifications to proceed",
        "Enable location to use this feature",
        "Invite friends to get this discount"
    ],

    // === SNEAKING ===
    // Adding unwanted items or charges sneakily
    sneaking: [
        "We've added product protection for you",
        "Travel insurance has been included",
        "Tip has been pre-calculated",
        "Donation added to your order",
        "Extended warranty included",
        "Premium support added"
    ]
};


// Flatten examples for embedding
const ALL_EXAMPLES = [];
const EXAMPLE_LABELS = [];
Object.entries(DARK_PATTERN_EXAMPLES).forEach(([type, examples]) => {
    examples.forEach(example => {
        ALL_EXAMPLES.push(example);
        EXAMPLE_LABELS.push(type);
    });
});

// Global state
let useModel = null;
let exampleEmbeddings = null;
let isModelLoading = false;
let modelLoadError = null;

/**
 * Load the Universal Sentence Encoder model
 */
async function loadUSEModel() {
    if (useModel) return useModel;
    if (isModelLoading) {
        // Wait for ongoing load
        while (isModelLoading) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return useModel;
    }

    isModelLoading = true;
    console.log("[Safe Web] Loading Universal Sentence Encoder...");

    try {
        // Load TensorFlow.js USE from CDN
        // Note: In production, bundle these files locally
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/universal-sentence-encoder@1.3.3/dist/universal-sentence-encoder.min.js');

        // Load the model
        useModel = await use.load();
        console.log("[Safe Web] USE model loaded successfully");

        // Pre-compute embeddings for dark pattern examples
        console.log("[Safe Web] Computing example embeddings...");
        exampleEmbeddings = await useModel.embed(ALL_EXAMPLES);
        console.log("[Safe Web] Example embeddings ready:", ALL_EXAMPLES.length, "examples");

        isModelLoading = false;
        return useModel;
    } catch (error) {
        console.error("[Safe Web] Failed to load USE model:", error);
        modelLoadError = error;
        isModelLoading = false;
        throw error;
    }
}

/**
 * Helper to load external scripts
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Predict if text is a dark pattern using semantic similarity
 * @param {string} text - Text to analyze
 * @returns {Promise<{score: number, type: string, confidence: string, matchedExample: string}>}
 */
async function predictDarkPattern(text) {
    if (!useModel || !exampleEmbeddings) {
        try {
            await loadUSEModel();
        } catch (e) {
            // Fallback to mock if model fails
            return fallbackPredict(text);
        }
    }

    try {
        // Embed the input text
        const inputEmbedding = await useModel.embed([text]);
        const inputVec = await inputEmbedding.array();
        const exampleVecs = await exampleEmbeddings.array();

        // Find most similar example
        let maxSimilarity = 0;
        let bestMatchIndex = -1;

        for (let i = 0; i < exampleVecs.length; i++) {
            const similarity = cosineSimilarity(inputVec[0], exampleVecs[i]);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                bestMatchIndex = i;
            }
        }

        // Clean up tensors
        inputEmbedding.dispose();

        const score = maxSimilarity;
        const type = bestMatchIndex >= 0 ? EXAMPLE_LABELS[bestMatchIndex] : "Unknown";
        const matchedExample = bestMatchIndex >= 0 ? ALL_EXAMPLES[bestMatchIndex] : "";

        return {
            score: parseFloat(score.toFixed(3)),
            type: capitalizeFirst(type),
            confidence: score > 0.7 ? "High" : score > 0.5 ? "Medium" : "Low",
            matchedExample: matchedExample,
            modelUsed: "USE"
        };
    } catch (error) {
        console.warn("[Safe Web] USE prediction failed:", error);
        return fallbackPredict(text);
    }
}

/**
 * Fallback prediction when USE fails
 */
function fallbackPredict(text) {
    const lowerText = text.toLowerCase();
    let score = 0;
    let type = "Unknown";

    // Simple keyword matching as fallback
    if (/hurry|rush|limited time|act now|expires/i.test(text)) {
        score = 0.6;
        type = "Urgency";
    } else if (/only \d+ left|low stock|almost gone|selling fast/i.test(text)) {
        score = 0.6;
        type = "Scarcity";
    } else if (/\d+ people|viewing|in cart|customers/i.test(text)) {
        score = 0.55;
        type = "SocialProof";
    }

    return {
        score: score,
        type: type,
        confidence: score > 0.5 ? "Medium" : "Low",
        matchedExample: "",
        modelUsed: "Fallback"
    };
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Batch prediction
 */
async function predictBatch(texts) {
    const results = [];
    for (const text of texts) {
        results.push(await predictDarkPattern(text));
    }
    return results;
}

/**
 * Check if model is ready
 */
function isModelReady() {
    return useModel !== null && exampleEmbeddings !== null;
}

/**
 * Get model status
 */
function getModelStatus() {
    return {
        isReady: isModelReady(),
        isLoading: isModelLoading,
        error: modelLoadError ? modelLoadError.message : null,
        exampleCount: ALL_EXAMPLES.length
    };
}

// Expose to global scope
window.SafeWebAI = {
    isReady: false, // Will be updated after load
    modelName: "UniversalSentenceEncoder_v1",
    predictDarkPattern,
    predictBatch,
    loadModel: loadUSEModel,
    getModelStatus,
    isModelReady
};

// Auto-load model in background
setTimeout(() => {
    loadUSEModel().then(() => {
        window.SafeWebAI.isReady = true;
        console.log("[Safe Web] AI ready for inference");
    }).catch(e => {
        console.warn("[Safe Web] Model load failed, using fallback");
    });
}, 1000);

console.log("[Safe Web] USE loader initialized");
