/**
 * DarkPatternDetector - Sandbox Script
 * 
 * Runs inside a sandboxed iframe where 'unsafe-eval' is allowed.
 * Handles TensorFlow.js model execution and communication with the parent frame.
 */

// Global state
let useModel = null;
let exampleEmbeddings = null;
let modelReady = false;
let loadingPromise = null;

// Dark pattern examples
const DARK_PATTERN_EXAMPLES = {
    fakeUrgency: [
        "Hurry! Limited time offer!", "Act now!", "Offer ends soon!", "Time is running out!",
        "Flash sale ends in minutes!", "Order now to guarantee delivery!", "Ends in 24h"
    ],
    fakeScarcity: [
        "Only 2 left in stock!", "Almost sold out!", "High demand!",
        "30 people are looking at this!", "Selling fast!", "Last chance to buy!"
    ],
    fakeSocialProof: [
        "1000+ people bought this", "Trending now", "Bestseller", "Highly rated by 500 users",
        "Join 10,000 satisfied customers", "Most popular choice"
    ],
    confirmshaming: [
        "No thanks, I hate saving money", "I don't want protection", "Skip the discount",
        "I like paying full price"
    ],
    hiddenCosts: [
        "Handling fee", "Service charge", "Processing fee", "Administrative fee"
    ],
    hiddenSubscription: [
        "Free trial then $9.99/month", "Auto-renews annually", "Subscription starts after trial"
    ],
    nagging: [
        "Are you sure?", "Don't leave yet!", "Complete your profile", "Turn on notifications"
    ],
    obstruction: [
        "Call to cancel", "Cancellation available via phone", "Hard to find unsubscribe"
    ],
    preselection: [
        "Sign me up for newsletter (checked)", "Add insurance (checked)"
    ],
    forcedAction: [
        "Create account to view", "Download app to continue", "Register to read more"
    ]
};

// Flatten examples
const ALL_EXAMPLES = [];
const EXAMPLE_LABELS = [];
Object.entries(DARK_PATTERN_EXAMPLES).forEach(([type, examples]) => {
    examples.forEach(example => {
        ALL_EXAMPLES.push(example);
        EXAMPLE_LABELS.push(type);
    });
});

async function initModel() {
    if (modelReady) return { success: true };
    if (loadingPromise) return loadingPromise;

    console.log("[Sandbox] Loading TensorFlow.js model...");

    loadingPromise = (async () => {
        try {
            if (typeof tf === 'undefined' || typeof use === 'undefined') {
                throw new Error("Libraries not loaded");
            }

            // Load USE model
            useModel = await use.load();
            console.log("[Sandbox] Model loaded");

            // Embed examples
            exampleEmbeddings = await useModel.embed(ALL_EXAMPLES);
            console.log("[Sandbox] Examples embedded");

            modelReady = true;
            return { success: true };
        } catch (e) {
            console.error("[Sandbox] Init error:", e);
            modelReady = false;
            return { success: false, error: e.toString() };
        } finally {
            loadingPromise = null;
        }
    })();

    return loadingPromise;
}

function cosineSimilarity(vecA, vecB) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function predict(text) {
    if (!modelReady) {
        const result = await initModel();
        if (!result.success) return { error: "Model failed to load: " + result.error };
    }

    try {
        const inputEmbedding = await useModel.embed([text]);
        const inputVec = await inputEmbedding.array();
        const exampleVecs = await exampleEmbeddings.array();

        inputEmbedding.dispose();

        let maxSim = 0;
        let bestIdx = -1;

        for (let i = 0; i < exampleVecs.length; i++) {
            const sim = cosineSimilarity(inputVec[0], exampleVecs[i]);
            if (sim > maxSim) {
                maxSim = sim;
                bestIdx = i;
            }
        }

        const type = bestIdx >= 0 ? EXAMPLE_LABELS[bestIdx] : "Unknown";
        return {
            score: maxSim,
            type: type.charAt(0).toUpperCase() + type.slice(1),
            confidence: maxSim > 0.7 ? "High" : "Medium",
            modelUsed: "USE"
        };
    } catch (e) {
        return { error: e.message };
    }
}

// Message Listener
window.addEventListener('message', async (event) => {
    // Basic security check - in production verify origin, but sandbox has null origin
    const { action, text, id } = event.data;

    if (action === 'init') {
        const result = await initModel();
        event.source.postMessage({ id, success: result.success, error: result.error }, event.origin);
    }
    else if (action === 'predict') {
        const result = await predict(text);
        event.source.postMessage({ id, result }, event.origin);
    }
    else if (action === 'ping') {
        event.source.postMessage({ id, pong: true }, event.origin);
    }
});

console.log("[Sandbox] Script loaded");
