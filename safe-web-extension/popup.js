/**
 * Safe Web - Popup Script (v2.0)
 */

document.addEventListener('DOMContentLoaded', async () => {
    const scanBtn = document.getElementById('scanBtn');
    const statusDiv = document.getElementById('status');
    const patternCountSpan = document.getElementById('patternCount');
    const avgConfidenceSpan = document.getElementById('avgConfidence');
    const confidenceFill = document.getElementById('confidenceFill');
    const aiToggle = document.getElementById('aiToggle');
    const modeLabel = document.getElementById('modeLabel');

    // Load saved settings
    try {
        const settings = await chrome.storage.local.get(['aiEnabled']);
        aiToggle.checked = settings.aiEnabled !== false;
        updateModeLabel();
    } catch (e) {
        console.log("Using default settings");
    }

    // Get current tab and request results
    async function refreshResults() {
        statusDiv.textContent = "Scanning...";
        statusDiv.className = "status scanning";

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            const response = await chrome.tabs.sendMessage(tab.id, { action: "getResults" });
            updateUI(response);
        } catch (e) {
            statusDiv.textContent = "Refresh page to activate";
            statusDiv.className = "status";
            console.log("Could not get results:", e);
        }
    }

    // Update UI with results
    function updateUI(data) {
        if (!data) {
            statusDiv.textContent = "No data";
            return;
        }

        const count = data.count || 0;
        patternCountSpan.textContent = count;

        if (count === 0) {
            statusDiv.textContent = "✓ Page looks clean";
            statusDiv.className = "status";
            confidenceFill.style.width = "0%";
            avgConfidenceSpan.textContent = "-";
        } else {
            statusDiv.textContent = `⚠️ ${count} pattern${count > 1 ? 's' : ''} detected`;
            statusDiv.className = "status warning";

            // Calculate average confidence
            if (data.results && data.results.length > 0) {
                const avgScore = data.results.reduce((sum, r) => sum + (r.score || 0), 0) / data.results.length;
                const avgPercent = Math.round(avgScore * 100);
                avgConfidenceSpan.textContent = `${avgPercent}%`;
                confidenceFill.style.width = `${avgPercent}%`;
            }
        }
    }

    // Update mode label
    function updateModeLabel() {
        if (aiToggle.checked) {
            modeLabel.textContent = "AI";
            modeLabel.className = "badge ai";
        } else {
            modeLabel.textContent = "REGEX";
            modeLabel.className = "badge regex";
        }
    }

    // AI toggle handler
    aiToggle.addEventListener('change', async () => {
        updateModeLabel();

        try {
            // Save setting
            await chrome.storage.local.set({ aiEnabled: aiToggle.checked });

            // Notify content script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.sendMessage(tab.id, {
                action: "setAiEnabled",
                enabled: aiToggle.checked
            });
        } catch (e) {
            console.log("Could not update setting:", e);
        }
    });

    // Scan button handler
    scanBtn.addEventListener('click', async () => {
        statusDiv.textContent = "Scanning...";
        statusDiv.className = "status scanning";
        scanBtn.disabled = true;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            const response = await chrome.tabs.sendMessage(tab.id, { action: "scan" });
            updateUI(response);
        } catch (e) {
            statusDiv.textContent = "Refresh page first";
            statusDiv.className = "status";
            console.log("Scan failed:", e);
        } finally {
            scanBtn.disabled = false;
        }
    });

    // Listen for updates from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "resultsReady") {
            updateUI(request);
        }
    });

    // Initial load
    refreshResults();
});
