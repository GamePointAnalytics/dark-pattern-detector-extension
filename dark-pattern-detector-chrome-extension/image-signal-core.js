/**
 * Normalizes the only image-model output the extension is allowed to retain.
 * Model prose, captions, OCR, and raw image material are intentionally excluded.
 */
(function exposeImageSignalCore(root) {
    const CATEGORY_LABELS = {
        sexual_nudity: 'Sexual or nudity content',
        graphic_violence: 'Graphic violence',
        visual_dark_pattern: 'Possible visual dark pattern'
    };
    const CONFIDENCE = { high: 0.85, medium: 0.6, low: 0.35 };

    function parseModelSignals(raw) {
        if (!raw || typeof raw !== 'string') return [];
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return [];
        try {
            const parsed = JSON.parse(match[0]);
            const seen = new Set();
            return (Array.isArray(parsed.signals) ? parsed.signals : []).reduce((signals, signal) => {
                if (!signal || !CATEGORY_LABELS[signal.category] || seen.has(signal.category) || signals.length >= 3) {
                    return signals;
                }
                seen.add(signal.category);
                    const confidence = Object.prototype.hasOwnProperty.call(CONFIDENCE, signal.confidence)
                        ? signal.confidence
                        : 'low';
                signals.push({
                        category: signal.category,
                        confidence: CONFIDENCE[confidence]
                });
                return signals;
            }, []);
        } catch (_) {
            return [];
        }
    }

    function labelFor(category) {
        return CATEGORY_LABELS[category] || 'Unclassified image signal';
    }

    const imageSignalCore = { parseModelSignals, labelFor, CATEGORY_LABELS };
    root.DarkPatternImageSignalCore = imageSignalCore;
    if (typeof module !== 'undefined' && module.exports) module.exports = imageSignalCore;
})(globalThis);
