/**
 * One-shot active-tab capture module.
 *
 * The interface accepts browser adapters so callers can test it without Chrome.
 * It returns only a capture receipt; the raw image data URL is discarded before
 * the promise resolves.
 */
(function exposeActiveTabCapture(root) {
    function sanitizeAnalysis(analysis) {
        const status = ['available', 'unavailable', 'failed'].includes(analysis?.status)
            ? analysis.status
            : 'unavailable';
        const signals = Array.isArray(analysis?.signals) ? analysis.signals.slice(0, 3).map(signal => ({
            category: String(signal.category || 'unknown'),
            confidence: Math.max(0, Math.min(1, Number(signal.confidence) || 0))
        })) : [];
        return { status, signals };
    }

    async function captureOnce({ getActiveTab, ensureReady, captureVisibleTab, decodeImage, analyzeCapture }) {
        const tab = await getActiveTab();
        if (!tab?.id || typeof tab.windowId !== 'number') {
            throw new Error('No active tab is available for capture.');
        }

        const readiness = await ensureReady(tab);
        if (!readiness?.eligible) {
            throw new Error(readiness?.reason || 'This page cannot be captured.');
        }

        let rawCapture = await captureVisibleTab(tab);
        try {
            const image = await decodeImage(rawCapture);
            const analysis = analyzeCapture
                ? sanitizeAnalysis(await analyzeCapture(rawCapture))
                : { status: 'unavailable', signals: [] };
            return {
                captureMode: 'active_tab',
                width: Number(image.width) || 0,
                height: Number(image.height) || 0,
                rawCaptureDeleted: true,
                analysis
            };
        } finally {
            rawCapture = null;
        }
    }

    const activeTabCapture = { captureOnce };
    root.DarkPatternActiveTabCapture = activeTabCapture;
    if (typeof module !== 'undefined' && module.exports) module.exports = activeTabCapture;
})(globalThis);
