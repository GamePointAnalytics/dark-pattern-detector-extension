/**
 * DarkPatternDetector - Popup Script (v2.2 - Regex Only)
 */

document.addEventListener('DOMContentLoaded', async () => {
    const scanBtn = document.getElementById('scanBtn');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const deleteHistoryBtn = document.getElementById('deleteHistoryBtn');
    const statusDiv = document.getElementById('status');
    const patternCountSpan = document.getElementById('patternCount');
    const historyStatus = document.getElementById('historyStatus');
    let observationState = 'inactive';
    let feedbackByEventId = {};

    // Get current tab
    async function getCurrentTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
    }

    async function sendToCurrentTab(message) {
        const tab = await getCurrentTab();
        if (!tab?.id) return { delivered: false };

        try {
            return { delivered: true, response: await chrome.tabs.sendMessage(tab.id, message) };
        } catch (error) {
            // Chrome's own pages and a page that has not been refreshed after an
            // extension reload do not have a content-script receiver.
            if (error?.message?.includes('Receiving end does not exist')) {
                return { delivered: false };
            }
            throw error;
        }
    }

    async function refreshLocalHistory() {
        try {
            const summary = await chrome.runtime.sendMessage({ action: 'getLocalHistorySummary' });
            const count = summary.count || 0;
            const marked = summary.feedback?.notRelevant || 0;
            historyStatus.textContent = marked > 0 ? `${count} stored · ${marked} marked` : `${count} stored`;
        } catch (_) {
            historyStatus.textContent = 'Unavailable';
        }
    }

    async function refreshFeedbackState(results) {
        const eventIds = (results || []).map(result => result.detectionId).filter(Boolean);
        if (eventIds.length === 0) {
            feedbackByEventId = {};
            return;
        }

        try {
            const response = await chrome.runtime.sendMessage({ action: 'getLocalEventFeedback', eventIds });
            feedbackByEventId = response?.feedbackByEventId || {};
        } catch (_) {
            feedbackByEventId = {};
        }
    }

    function updateObservationControls(state) {
        observationState = state || observationState;
        const inactive = observationState === 'inactive';
        const paused = observationState === 'paused';
        const active = observationState === 'active';

        startBtn.disabled = active;
        startBtn.style.opacity = active ? '0.5' : '1';
        pauseBtn.disabled = inactive;
        pauseBtn.style.opacity = inactive ? '0.5' : '1';
        scanBtn.disabled = !active;
        scanBtn.style.opacity = active ? '1' : '0.5';

        if (paused) {
            pauseBtn.textContent = 'Resume Observation';
            pauseBtn.style.background = '#4caf50';
            pauseBtn.style.color = 'white';
        } else {
            pauseBtn.textContent = 'Pause Observation';
            pauseBtn.style.background = '#f0f0f0';
            pauseBtn.style.color = '#333';
        }
    }

    // Update UI with results
    async function updateUI(data) {
        if (!data) {
            statusDiv.textContent = "No data";
            return;
        }

        const count = data.count || 0;
        await refreshFeedbackState(data.results);
        updateObservationControls(data.sessionState);
        patternCountSpan.textContent = count;
        const patternsList = document.getElementById('patternsList');
        patternsList.innerHTML = '';

        // Update Detection Mode Badge — reflects whether Gemini Nano actually
        // verified hits this scan ("AI-verified") or it ran regex-only.
        const modeBadge = document.getElementById('modeBadge');
        if (modeBadge) {
            if (data.mode === "AI-verified") {
                modeBadge.textContent = "AI-VERIFIED";
                modeBadge.className = "badge ai";
                modeBadge.style.background = ""; // Reset to CSS gradient
                modeBadge.style.color = "";
            } else {
                modeBadge.textContent = "REGEX ONLY";
                modeBadge.className = "badge regex";
                modeBadge.style.background = "#e0e0e0";
                modeBadge.style.color = "#666";
            }
        }

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

            // Aggregate patterns by type with content and frequency
            const details = {};
            if (data.results) {
                data.results.forEach(r => {
                    if (!details[r.type]) details[r.type] = {};

                    // Keep IDs so feedback can update only the matching local events.
                    if (!details[r.type][r.text]) {
                        details[r.type][r.text] = [];
                    }
                    if (r.detectionId) details[r.type][r.text].push(r.detectionId);
                });
            }

            // Display breakdown with Details
            Object.entries(details).forEach(([type, textCounts]) => {
                // Calculate total patterns for this type (sum of all frequencies)
                const totalForType = Object.values(textCounts).reduce((total, ids) => total + ids.length, 0);

                const detailsEl = document.createElement('details');
                detailsEl.className = 'pattern-group';

                // Summary (Header) - Shows total count for this category
                const summary = document.createElement('summary');
                summary.innerHTML = `
                    <span>${type}</span>
                    <span class="badge regex">${totalForType}</span>
                `;
                detailsEl.appendChild(summary);

                // List of found texts with frequency counts
                const ul = document.createElement('ul');
                ul.className = 'pattern-list';

                Object.entries(textCounts).forEach(([text, detectionIds]) => {
                    const li = document.createElement('li');
                    const label = document.createElement('span');
                    label.className = 'pattern-label';
                    const count = detectionIds.length;

                    if (count > 1) {
                        label.textContent = `"${text}" (x${count})`;
                    } else {
                        label.textContent = `"${text}"`;
                    }

                    li.title = text; // Tooltip for full text
                    li.appendChild(label);
                    if (detectionIds.length > 0) {
                        const feedbackBtn = document.createElement('button');
                        feedbackBtn.className = 'feedback-btn';
                        const alreadyMarked = detectionIds.every(id => feedbackByEventId[id]?.relevance === 'not_relevant');
                        feedbackBtn.textContent = alreadyMarked ? 'Marked' : 'Not relevant';
                        feedbackBtn.disabled = alreadyMarked;
                        feedbackBtn.title = 'Mark this detection as a false positive in local history';
                        feedbackBtn.addEventListener('click', async () => {
                            feedbackBtn.disabled = true;
                            try {
                                const response = await chrome.runtime.sendMessage({
                                    action: 'updateLocalEventFeedback',
                                    eventIds: detectionIds,
                                    feedback: { relevance: 'not_relevant' }
                                });
                                if (response?.updated) {
                                    detectionIds.forEach(id => {
                                        feedbackByEventId[id] = { relevance: 'not_relevant' };
                                    });
                                    feedbackBtn.textContent = 'Marked';
                                } else {
                                    feedbackBtn.textContent = 'History cleared';
                                }
                            } catch (_) {
                                feedbackBtn.textContent = 'Try again';
                                feedbackBtn.disabled = false;
                            }
                        });
                        li.appendChild(feedbackBtn);
                    }
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
            void updateUI(message);
            refreshLocalHistory();
        }
    });

    startBtn.addEventListener('click', async () => {
        const tab = await getCurrentTab();
        if (!tab?.id) return;

        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'startObservation' });
            updateObservationControls(response.sessionState);
            statusDiv.textContent = 'Scanning...';
            statusDiv.className = 'status scanning';
        } catch (_) {
            statusDiv.textContent = 'Cannot start on this page';
            statusDiv.className = 'status warning';
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
                // Update mode even while scanning if available
                if (response.mode) {
                    const modeBadge = document.getElementById('modeBadge');
                    if (modeBadge && response.mode !== "AI-verified") {
                        modeBadge.textContent = "REGEX ONLY";
                        modeBadge.className = "badge regex";
                    }
                }
            } else {
                await updateUI(response);
            }
        }
    } catch (e) {
        statusDiv.textContent = "Refresh page to scan";
        statusDiv.className = "status";
    }
    pauseBtn.addEventListener('click', async () => {
        const tab = await getCurrentTab();
        if (!tab?.id || observationState === 'inactive') return;

        const nextPaused = observationState !== 'paused';
        try {
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'togglePause',
                isPaused: nextPaused
            });
            updateObservationControls(response.sessionState);
            statusDiv.textContent = nextPaused ? 'Observation Paused' : 'Scanning...';
            statusDiv.className = nextPaused ? 'status warning' : 'status scanning';
        } catch (_) {
            statusDiv.textContent = 'Cannot update this page';
            statusDiv.className = 'status warning';
        }
    });

    deleteHistoryBtn.addEventListener('click', async () => {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'clearLocalHistory' });
            historyStatus.textContent = response.cleared ? '0 stored' : 'Delete failed';
        } catch (_) {
            historyStatus.textContent = 'Delete failed';
        }
    });
    // Visual Interference Toggle Handler
    const toggleVisual = document.getElementById('toggleVisual');
    if (toggleVisual) {
        // Load saved state
        chrome.storage.local.get(['visualEnabled'], (result) => {
            toggleVisual.checked = result.visualEnabled || false;
        });

        // Save state on change
        toggleVisual.addEventListener('change', async () => {
            const newState = toggleVisual.checked;
            await chrome.storage.local.set({ visualEnabled: newState });

            // Notify active tab to update immediately
            const result = await sendToCurrentTab({
                action: "updateConfig",
                visualEnabled: newState
            });
            if (!result.delivered) {
                statusDiv.textContent = 'Preference saved — open a web page to apply it';
                statusDiv.className = 'status scanning';
            }
        });
    }

    updateObservationControls(observationState);
    refreshLocalHistory();

});
