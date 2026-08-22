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

    function splitKeywords(line) {
        const keywords = [];
        let current = '';
        let braceDepth = 0;

        for (const character of String(line || '')) {
            if (character === '{') braceDepth++;
            if (character === '}' && braceDepth > 0) braceDepth--;

            if (character === ',' && braceDepth === 0) {
                if (current.trim()) keywords.push(current.trim());
                current = '';
            } else {
                current += character;
            }
        }
        if (current.trim()) keywords.push(current.trim());
        return keywords;
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

            keywords.push(...splitKeywords(line));
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

    function isBoilerplateElement(element) {
        const tagName = String(element && element.tagName || '').toUpperCase();
        const landmark = String(element && element.landmark || '').toLowerCase();
        return ['NAV', 'FOOTER'].includes(tagName) || /\b(navigation|nav|contentinfo|footer)\b/.test(landmark);
    }

    function isNegatedMatch(text, matchIndex) {
        const precedingText = String(text || '').slice(Math.max(0, matchIndex - 36), matchIndex).toLowerCase();
        return /\b(?:not|never|no|without)\s+(?:(?:a|an|the)\s+)?$/.test(precedingText) ||
            /\b(?:do not|don't)\s+(?:(?:a|an|the)\s+)?$/.test(precedingText);
    }

    function isQuotedEducationalExample(text, matchIndex, matchedText) {
        const source = String(text || '');
        const matchEnd = matchIndex + String(matchedText || '').length;
        const educationalContext = /\b(?:example|examples|phrase|term|label|copy|wording|definition|defined|guide|tutorial|avoid(?:\s+using)?|do not use|don't use)\b/i;
        if (!educationalContext.test(source)) return false;

        const quotedRanges = [
            /"[^"\n]{0,160}"/g,
            /“[^”\n]{0,160}”/g
        ];
        return quotedRanges.some(expression => {
            let quote;
            while ((quote = expression.exec(source)) !== null) {
                const quoteEnd = quote.index + quote[0].length;
                if (matchIndex >= quote.index && matchEnd <= quoteEnd) return true;
            }
            return false;
        });
    }

    function isBusinessCapabilityStatement(context, matchedText) {
        if (String(matchedText || '').toLowerCase() !== 'selling fast') return false;
        return /\b(?:we|i|our company)\s+(?:specialize in|focus on|are known for|help(?:ing)?[^.]{0,45})\s+selling fast\b/i.test(String(context || ''));
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

    function findMatchingPatterns({ text, context, patterns, element }) {
        if (!text || !Array.isArray(patterns) || isIgnoredText(text) || isBoilerplateElement(element)) return [];

        return patterns.filter(pattern => {
            if (!isEligibleForPattern(pattern, element)) return false;
            const expression = new RegExp(pattern.broadRegex.source, pattern.broadRegex.flags);
            let match;
            while ((match = expression.exec(text)) !== null) {
                if (!isNegatedMatch(text, match.index) &&
                    !isQuotedEducationalExample(text, match.index, match[0]) &&
                    !isBusinessCapabilityStatement(context, match[0])) {
                    return true;
                }
            }
            return false;
        });
    }

    const detectorCore = {
        parsePatterns,
        splitKeywords,
        findMatchingPatterns,
        isIgnoredText,
        isEligibleForPattern,
        isBoilerplateElement,
        isNegatedMatch,
        isQuotedEducationalExample,
        isBusinessCapabilityStatement
    };

    root.DarkPatternDetectorCore = detectorCore;
    if (typeof module !== 'undefined' && module.exports) module.exports = detectorCore;
})(globalThis);
