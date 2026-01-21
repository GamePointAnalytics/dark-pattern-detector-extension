/**
 * DarkPatternDetector - Popup Script (v2.2 - Regex Only)
 */

document.addEventListener('DOMContentLoaded', async () => {
    const scanBtn = document.getElementById('scanBtn');
    const statusDiv = document.getElementById('status');
    const patternCountSpan = document.getElementById('patternCount');

    // Get current tab
    async function getCurrentTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
    }

    // Update UI with results
    function updateUI(data) {
        if (!data) {
            statusDiv.textContent = "No data";
            return;
        }

        const count = data.count || 0;
        patternCountSpan.textContent = count;
        const patternsList = document.getElementById('patternsList');
        patternsList.innerHTML = '';

        if (count === 0) {
            if (data.hasScanned) {
                statusDiv.textContent = "Page looks clean";
                statusDiv.className = "status";
            } else {
                statusDiv.textContent = "Ready to Scan";
                statusDiv.className = "status scanning";
            }
        } else {
            statusDiv.textContent = `${count} Dark Patterns Detected`;
            statusDiv.className = "status warning";

            // Aggregate patterns by type with content
            const details = {};
            if (data.results) {
                data.results.forEach(r => {
                    if (!details[r.type]) details[r.type] = [];
                    // Only add unique texts per type to avoid clutter
                    if (!details[r.type].includes(r.text)) {
                        details[r.type].push(r.text);
                    }
                });
            }

            // Display breakdown with Details
            Object.entries(details).forEach(([type, texts]) => {
                const typeCount = texts.length;
                const detailsEl = document.createElement('details');
                detailsEl.className = 'pattern-group';

                // Summary (Header)
                const summary = document.createElement('summary');
                summary.innerHTML = `
                    <span>${type}</span>
                    <span class="badge regex">${typeCount}</span>
                `;
                detailsEl.appendChild(summary);

                // List of found texts
                const ul = document.createElement('ul');
                ul.className = 'pattern-list';
                texts.forEach(text => {
                    const li = document.createElement('li');
                    li.textContent = `"${text}"`;
                    li.title = text; // Tooltip for full text
                    ul.appendChild(li);
                });
                detailsEl.appendChild(ul);

                patternsList.appendChild(detailsEl);
            });
        }
    }

    // Listen for progress updates
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "scanProgress") {
            statusDiv.textContent = `Scanning... (${message.progress}%)`;
            statusDiv.className = "status";
            patternCountSpan.textContent = message.found || 0;
        } else if (message.action === "resultsReady") {
            updateUI(message);
        }
    });

    // Scan button click handler
    scanBtn.addEventListener('click', async () => {
        const tab = await getCurrentTab();
        if (!tab?.id) return;

        statusDiv.textContent = "Scanning...";
        statusDiv.className = "status";

        try {
            await chrome.tabs.sendMessage(tab.id, { action: "scan" });
        } catch (e) {
            statusDiv.textContent = "Cannot scan this page";
            statusDiv.className = "status";
        }
    });

    // Get initial results on popup open
    try {
        const tab = await getCurrentTab();
        if (tab?.id) {
            const response = await chrome.tabs.sendMessage(tab.id, { action: "getResults" });

            if (response.isScanning) {
                statusDiv.textContent = "Scanning..."; // Or "Scanning in progress..."
                statusDiv.className = "status";
                patternCountSpan.textContent = response.count || 0;
            } else {
                updateUI(response);
            }
        }
    } catch (e) {
        statusDiv.textContent = "Refresh page to scan";
        statusDiv.className = "status";
    }
});
