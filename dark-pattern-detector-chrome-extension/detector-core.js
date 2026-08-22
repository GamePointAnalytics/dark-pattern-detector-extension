/**
 * Pure text-detection module for DarkPatternDetector.
 *
 * Its interface deliberately accepts plain text and lightweight element metadata,
 * so it can be tested with Node and reused by future page, OCR, or image adapters.
 */
(function exposeDetectorCore(root) {
    const IGNORED_PATTERNS = [
        /all rights reserved/gi,
        /privacy policy/gi,
        /terms (of|and) (use|service|conditions)/gi,
        /copyright/gi,
        /trademarks?/gi,
        /\d+-star prices/gi,
        /responsible for content/gi,
        /mobile app/gi
    ];

    function createPattern(type, keywordList) {
        const broadPattern = `\\b(${keywordList.join('|')})\\b`;
        return {
            type,
            broadRegex: new RegExp(broadPattern, 'gi'),
            strictRegex: new RegExp(broadPattern, 'gi'),
            message: `Potential ${type} pattern detected.`
        };
    }

    function parsePatterns(text) {
        const lines = String(text || '').split('\n');
        const categories = [];
        let currentCategory = null;
        let keywords = [];

        lines.forEach(rawLine => {
            const line = rawLine.trim();
            if (!line || line.startsWith('#')) return;

            const categoryMatch = line.match(/^\[(.*)\]$/);
            if (categoryMatch) {
                if (currentCategory) categories.push(createPattern(currentCategory, keywords));
                currentCategory = categoryMatch[1];
                keywords = [];
                return;
            }

            keywords.push(...line.split(',').map(part => part.trim()).filter(Boolean));
        });

        if (currentCategory) categories.push(createPattern(currentCategory, keywords));
        return categories;
    }

    function isIgnoredText(text) {
        return IGNORED_PATTERNS.some(pattern => {
            pattern.lastIndex = 0;
            return pattern.test(text);
        });
    }

    function isEligibleForPattern(pattern, element) {
        if (pattern.type !== 'Curiosity Gap') return true;

        const tagName = String(element && element.tagName || '').toUpperCase();
        const className = String(element && element.className || '').toLowerCase();
        const isHeading = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName);
        const isTitleClass = ['title', 'headline', 'heading', 'article']
            .some(token => className.includes(token));
        return isHeading || tagName === 'A' || isTitleClass;
    }

    function findMatchingPatterns({ text, patterns, element }) {
        if (!text || !Array.isArray(patterns) || isIgnoredText(text)) return [];

        return patterns.filter(pattern => {
            if (!isEligibleForPattern(pattern, element)) return false;
            pattern.broadRegex.lastIndex = 0;
            return pattern.broadRegex.test(text);
        });
    }

    const detectorCore = {
        parsePatterns,
        findMatchingPatterns,
        isIgnoredText,
        isEligibleForPattern
    };

    root.DarkPatternDetectorCore = detectorCore;
    if (typeof module !== 'undefined' && module.exports) module.exports = detectorCore;
})(globalThis);
