/**
 * DarkPatternDetector - Offscreen Script
 * 
 * Bridges communication between the background script and the sandboxed iframe.
 */

const iframe = document.getElementById('sandboxFrame');
const pendingRequests = new Map();
let requestIdCounter = 0;

// Listen for messages from the Sandbox (iframe)
window.addEventListener('message', (event) => {
    // Basic check: ensure it matches our protocol
    if (!event.data || !event.data.id) return;

    const { id, result, success, pong } = event.data;

    if (pendingRequests.has(id)) {
        const resolve = pendingRequests.get(id);
        if (result) resolve(result);
        else if (success !== undefined) resolve({ success });
        else if (pong) resolve({ pong: true });
        else resolve({ error: "Unknown response" });

        pendingRequests.delete(id);
    }
});

// Helper to send message to iframe and wait for response
function sendToSandbox(action, data = {}) {
    return new Promise((resolve, reject) => {
        const id = ++requestIdCounter;
        pendingRequests.set(id, resolve);

        // Timeout after 30 seconds
        setTimeout(() => {
            if (pendingRequests.has(id)) {
                pendingRequests.delete(id);
                resolve({ error: "Sandbox timeout" });
            }
        }, 30000);

        if (!iframe.contentWindow) {
            resolve({ error: "Sandbox iframe not found" });
            return;
        }

        iframe.contentWindow.postMessage({
            action,
            id,
            ...data
        }, '*'); // Target origin '*' because sandbox is null
    });
}

// Listen for messages from Background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle specific actions
    if (request.action === 'predict') {
        sendToSandbox('predict', { text: request.text })
            .then(response => sendResponse(response));
        return true; // Async response
    }

    if (request.action === 'initModel') {
        sendToSandbox('init')
            .then(response => sendResponse(response));
        return true; // Async response
    }

    if (request.action === 'ping') {
        sendToSandbox('ping')
            .then(response => sendResponse(response));
        return true;
    }
});

console.log("[Offscreen] Bridge initialized");
