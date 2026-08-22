const fs = require('node:fs');
const path = require('node:path');
const core = require('./detector-core.js');

const patterns = core.parsePatterns(fs.readFileSync(path.join(__dirname, 'patterns.txt'), 'utf8'));
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'detection-context-cases.json'), 'utf8'));
const metrics = new Map(patterns.map(pattern => [pattern.type, { truePositive: 0, falsePositive: 0, falseNegative: 0 }]));

for (const testCase of cases) {
    const expected = new Set(testCase.expectedTypes);
    const actual = new Set(core.findMatchingPatterns({
        text: testCase.text,
        context: testCase.context,
        patterns,
        element: testCase.element
    }).map(pattern => pattern.type));

    for (const category of new Set([...expected, ...actual])) {
        const score = metrics.get(category);
        if (!score) continue;
        if (expected.has(category) && actual.has(category)) score.truePositive++;
        else if (actual.has(category)) score.falsePositive++;
        else score.falseNegative++;
    }
}

const rows = [...metrics.entries()].map(([category, score]) => {
    const precision = score.truePositive + score.falsePositive === 0 ? 0 : score.truePositive / (score.truePositive + score.falsePositive);
    const recall = score.truePositive + score.falseNegative === 0 ? 0 : score.truePositive / (score.truePositive + score.falseNegative);
    return {
        category,
        precision: precision.toFixed(2),
        recall: recall.toFixed(2),
        truePositive: score.truePositive,
        falsePositive: score.falsePositive,
        falseNegative: score.falseNegative
    };
});

console.table(rows);
console.log(`Evaluated ${cases.length} labeled development cases locally.`);
