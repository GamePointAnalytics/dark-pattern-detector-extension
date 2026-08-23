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
    const insightsStatus = document.getElementById('insightsStatus');
    const insightsTrend = document.getElementById('insightsTrend');
    const toggleVisual = document.getElementById('toggleVisual');
    const toggleProtection = document.getElementById('toggleProtection');
    const consentPanel = document.getElementById('consentPanel');
    const consentCheckbox = document.getElementById('consentCheckbox');
    const dataScopeEvents = document.getElementById('dataScopeEvents');
    const analyzeActiveTabBtn = document.getElementById('analyzeActiveTabBtn');
    const activeTabCapturePanel = document.getElementById('activeTabCapturePanel');
    const confirmActiveTabCaptureBtn = document.getElementById('confirmActiveTabCaptureBtn');
    const cancelActiveTabCaptureBtn = document.getElementById('cancelActiveTabCaptureBtn');
    const activeTabCaptureStatus = document.getElementById('activeTabCaptureStatus');
    let observationState = 'inactive';
    let feedbackByEventId = {};
    let personalProtectionEnabled = false;
    let productConsentGranted = false;
    let lastResultData = null;

    const preferencesLoaded = new Promise(resolve => {
        chrome.storage.local.get(['visualEnabled', 'personalProtectionEnabled', 'productConsentVersion'], result => {
            if (toggleVisual) toggleVisual.checked = result.visualEnabled || false;
            personalProtectionEnabled = result.personalProtectionEnabled || false;
            if (toggleProtection) toggleProtection.checked = personalProtectionEnabled;
            productConsentGranted = result.productConsentVersion === '1';
            if (consentPanel) consentPanel.hidden = productConsentGranted;
            if (consentCheckbox) consentCheckbox.checked = productConsentGranted;
            resolve();
        });
    });

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

    function decodeCapturedImage(rawCapture) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
                image.src = '';
                resolve(dimensions);
            };
            image.onerror = () => reject(new Error('The visible-tab image could not be decoded locally.'));
            image.src = rawCapture;
        });
    }

    async function recordActiveTabSignals(signals) {
        if (!Array.isArray(signals) || signals.length === 0) return 0;
        const event = {
            eventId: crypto.randomUUID(),
            occurredAtBucket: new Date().toISOString(),
            sessionId: 'active-tab-once',
            source: { surface: 'browser_tab', platformType: 'unknown', captureMode: 'active_tab' },
            exposure: { durationSeconds: 0, contentServingCount: 1 },
            signals: signals.map(signal => ({
                category: signal.category,
                confidence: signal.confidence,
                detector: 'on-device-image-model',
                modelVersion: 'chrome-prompt-image-v1'
            })),
            feedback: { relevance: 'unknown', wantedness: 'unknown', safetyAction: 'none' },
            privacy: { rawCaptureDeleted: true, ocrTextDeleted: true, researchExportEligible: false }
        };
        const result = await chrome.runtime.sendMessage({ action: 'recordLocalEvents', events: [event] });
        return result?.added ? signals.length : 0;
    }

    function summarizeActiveTabAnalysis(receipt, storedSignalCount) {
        const { analysis } = receipt;
        const captureReceipt = `Captured ${receipt.width}×${receipt.height} locally and discarded it.`;
        if (analysis.status === 'unavailable') {
            return `${captureReceipt} On-device image analysis is not available in this Chrome installation, so no image signal was stored.`;
        }
        if (analysis.status === 'failed') {
            return `${captureReceipt} On-device image analysis could not run, so no image signal was stored.`;
        }
        if (!analysis.signals.length) {
            return `${captureReceipt} The local model found no high-confidence supported category; no image signal was stored.`;
        }
        const labels = analysis.signals
            .map(signal => globalThis.DarkPatternImageSignalCore?.labelFor(signal.category) || signal.category)
            .join(' · ');
        return `${captureReceipt} Stored ${storedSignalCount} minimized local image signal${storedSignalCount === 1 ? '' : 's'}: ${labels}.`;
    }

    async function runActiveDomAnalysis() {
        const result = await sendToCurrentTab({ action: 'analyzeVisibleDom' });
        if (!result.delivered || result.response?.error) {
            return 'Rendered-page rules are unavailable for this tab.';
        }
        await updateUI(result.response);
        const count = Number(result.response?.count) || 0;
        return count === 1
            ? 'Local page rules found 1 possible signal.'
            : `Local page rules found ${count} possible signals.`;
    }

    async function showActiveTabModelStatus() {
        activeTabCaptureStatus.textContent = 'Checking on-device image analysis…';
        try {
            const result = await chrome.runtime.sendMessage({ action: 'getActiveTabImageAnalysisStatus' });
            const availability = result?.availability;
            if (availability === 'available') {
                activeTabCaptureStatus.textContent = 'On-device image analysis is ready. Capture remains one-time and local.';
            } else if (availability === 'downloadable') {
                activeTabCaptureStatus.textContent = 'On-device image analysis can download in Chrome. Capture may take longer the first time; no image is retained.';
            } else if (availability === 'downloading') {
                activeTabCaptureStatus.textContent = 'Chrome is downloading its on-device image model. Wait for it to finish, then capture.';
            } else {
                activeTabCaptureStatus.textContent = 'On-device image analysis is unavailable in this Chrome installation. You can still test capture-and-discard; no image signal will be saved.';
            }
        } catch (_) {
            activeTabCaptureStatus.textContent = 'Could not check on-device image analysis. A capture will still be discarded if analysis is unavailable.';
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

    async function refreshLocalInsights() {
        try {
            const insights = await chrome.runtime.sendMessage({ action: 'getLocalInsights' });
            if (!insights.eventCount) {
                insightsStatus.textContent = 'No local insight yet — scan a supported page to create your first local signal.';
                insightsTrend.textContent = '';
                return;
            }

            const categories = (insights.topCategories || [])
                .map(item => `${item.category} (${item.count})`)
                .join(' · ');
            const sessions = insights.sessionCount === 1 ? '1 session' : `${insights.sessionCount} sessions`;
            const recordedHours = insights.timeBucketCount === 1 ? '1 recorded hour' : `${insights.timeBucketCount || 0} recorded hours`;
            const observedMinutes = Math.max(0, Math.round((Number(insights.observedSeconds) || 0) / 60));
            const observedTime = observedMinutes === 1 ? '1 minute observed' : `${observedMinutes} minutes observed`;
            insightsStatus.textContent = `Local summary: ${insights.eventCount} signals across ${sessions}${categories ? ` — ${categories}` : ''}. Observation window: ${recordedHours}; ${observedTime}. Stored on this device; Delete Local History removes it.`;
            const recentHours = (insights.recentHours || []).map((hour, index) => {
                const position = index === 0 ? 'Latest' : `Earlier ${index}`;
                const categorySummary = hour.topCategories.map(item => `${item.category} (${item.count})`).join(' · ');
                const signalLabel = hour.count === 1 ? 'signal' : 'signals';
                return `${position}: ${hour.count} ${signalLabel}${categorySummary ? ` — ${categorySummary}` : ''}`;
            });
            insightsTrend.textContent = recentHours.length ? `Recent recorded hours: ${recentHours.join('; ')}.` : '';
        } catch (_) {
            insightsStatus.textContent = 'Local insight is unavailable.';
            insightsTrend.textContent = '';
        }
    }

    async function refreshLocalDataSummary() {
        try {
            const summary = await chrome.runtime.sendMessage({ action: 'getLocalDataSummary' });
            dataScopeEvents.textContent = summary.localEventCount || 0;
        } catch (_) {
            dataScopeEvents.textContent = 'Unavailable';
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

        startBtn.disabled = active || !productConsentGranted;
        startBtn.style.opacity = active || !productConsentGranted ? '0.5' : '1';
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

        lastResultData = data;
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
                        details[r.type][r.text] = { detectionIds: [], safetyActions: [], explanations: [] };
                    }
                    if (r.detectionId) {
                        details[r.type][r.text].detectionIds.push(r.detectionId);
                        details[r.type][r.text].safetyActions.push(r.safetyAction || 'none');
                        details[r.type][r.text].explanations.push(r.explanation || 'Matched a local detection rule. Review it before acting.');
                    }
                });
            }

            // Display breakdown with Details
            Object.entries(details).forEach(([type, textCounts]) => {
                // Calculate total patterns for this type (sum of all frequencies)
                const totalForType = Object.values(textCounts).reduce((total, group) => total + group.detectionIds.length, 0);

                const detailsEl = document.createElement('details');
                detailsEl.className = 'pattern-group';

                // Summary (Header) - Shows total count for this category
                const summary = document.createElement('summary');
                summary.innerHTML = `
                    <span>${type}</span>
                    <span class="badge regex">${totalForType}</span>
                `;
                detailsEl.appendChild(summary);

                const explanation = [...new Set(Object.values(textCounts)
                    .flatMap(group => group.explanations))][0];
                if (explanation) {
                    const explanationEl = document.createElement('p');
                    explanationEl.className = 'pattern-explanation';
                    explanationEl.textContent = explanation;
                    detailsEl.appendChild(explanationEl);
                }

                // List of found texts with frequency counts
                const ul = document.createElement('ul');
                ul.className = 'pattern-list';

                Object.entries(textCounts).forEach(([text, group]) => {
                    const { detectionIds, safetyActions } = group;
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
                    if (personalProtectionEnabled && detectionIds.length > 0) {
                        const safetyBtn = document.createElement('button');
                        safetyBtn.className = 'safety-btn';
                        const isBlurred = safetyActions.length > 0 && safetyActions.every(action => action === 'blur');
                        safetyBtn.textContent = isBlurred ? 'Unblur' : 'Blur';
                        safetyBtn.title = isBlurred ? 'Restore highlighted text on this page' : 'Blur highlighted text on this page';
                        safetyBtn.addEventListener('click', async () => {
                            safetyBtn.disabled = true;
                            const safetyAction = isBlurred ? 'none' : 'blur';
                            try {
                                const tabResult = await sendToCurrentTab({ action: 'applySafetyAction', eventIds: detectionIds, safetyAction });
                                if (!tabResult.delivered || !tabResult.response?.applied) {
                                    safetyBtn.textContent = 'Page unavailable';
                                    return;
                                }
                                await chrome.runtime.sendMessage({
                                    action: 'updateLocalEventFeedback',
                                    eventIds: detectionIds,
                                    feedback: { safetyAction }
                                });
                                safetyBtn.textContent = safetyAction === 'blur' ? 'Blurred' : 'Unblurred';
                            } catch (_) {
                                safetyBtn.textContent = 'Try again';
                                safetyBtn.disabled = false;
                            }
                        });
                        li.appendChild(safetyBtn);
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
            refreshLocalInsights();
            refreshLocalDataSummary();
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

    await preferencesLoaded;

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
            refreshLocalInsights();
            refreshLocalDataSummary();
        } catch (_) {
            historyStatus.textContent = 'Delete failed';
        }
    });
    if (toggleVisual) {
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

    if (toggleProtection) {
        toggleProtection.addEventListener('change', async () => {
            personalProtectionEnabled = toggleProtection.checked;
            await chrome.storage.local.set({ personalProtectionEnabled });
            if (lastResultData) await updateUI(lastResultData);
        });
    }

    if (consentCheckbox) {
        consentCheckbox.addEventListener('change', async () => {
            if (!consentCheckbox.checked) return;
            productConsentGranted = true;
            await chrome.storage.local.set({ productConsentVersion: '1' });
            consentPanel.hidden = true;
            updateObservationControls(observationState);
            statusDiv.textContent = 'Ready to start local observation';
            statusDiv.className = 'status scanning';
        });
    }

    if (analyzeActiveTabBtn) {
        analyzeActiveTabBtn.addEventListener('click', () => {
            if (!productConsentGranted) {
                statusDiv.textContent = 'Review and accept local observation before using active-tab analysis.';
                statusDiv.className = 'status warning';
                return;
            }
            activeTabCapturePanel.hidden = false;
            void showActiveTabModelStatus();
        });
    }

    if (cancelActiveTabCaptureBtn) {
        cancelActiveTabCaptureBtn.addEventListener('click', () => {
            activeTabCapturePanel.hidden = true;
            activeTabCaptureStatus.textContent = '';
        });
    }

    if (confirmActiveTabCaptureBtn) {
        confirmActiveTabCaptureBtn.addEventListener('click', async () => {
            confirmActiveTabCaptureBtn.disabled = true;
            activeTabCaptureStatus.textContent = 'Capturing and processing locally…';
            try {
                let domAnalysisSummary;
                try {
                    domAnalysisSummary = await runActiveDomAnalysis();
                } catch (_) {
                    domAnalysisSummary = 'Rendered-page rules could not run for this tab.';
                }
                const receipt = await globalThis.DarkPatternActiveTabCapture.captureOnce({
                    getActiveTab: getCurrentTab,
                    ensureReady: async tab => {
                        // Screenshot analysis operates on rendered pixels, not the
                        // page DOM. This keeps one-shot analysis available for an
                        // image or a PDF rendered in the active tab, where a content
                        // script may not have a receiver.
                        if (!tab?.active) return { eligible: false, reason: 'Keep the tab visible before capturing.' };
                        return { eligible: true };
                    },
                    captureVisibleTab: tab => chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }),
                    decodeImage: decodeCapturedImage,
                    analyzeCapture: rawCapture => chrome.runtime.sendMessage({ action: 'analyzeActiveTabImage', rawCapture })
                });
                const storedSignalCount = await recordActiveTabSignals(receipt.analysis.signals);
                activeTabCaptureStatus.textContent = `${domAnalysisSummary} ${summarizeActiveTabAnalysis(receipt, storedSignalCount)}`;
                await refreshLocalHistory();
                await refreshLocalInsights();
                refreshLocalDataSummary();
            } catch (error) {
                activeTabCaptureStatus.textContent = error?.message || 'Visible-tab capture could not be completed.';
            } finally {
                confirmActiveTabCaptureBtn.disabled = false;
            }
        });
    }

    updateObservationControls(observationState);
    await refreshLocalHistory();
    await refreshLocalInsights();
    await refreshLocalDataSummary();

});
