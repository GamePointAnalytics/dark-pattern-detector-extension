const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('./detector-core.js');

const patterns = core.parsePatterns(fs.readFileSync(path.join(__dirname, 'patterns.txt'), 'utf8'));

assert.equal(patterns.length, 13, 'all configured categories should load');
assert.deepEqual(
    core.findMatchingPatterns({
        text: 'Hurry! Offer ends in 10 minutes!',
        patterns,
        element: { tagName: 'P', className: '' }
    }).map(pattern => pattern.type),
    ['Urgency']
);
assert.deepEqual(
    core.findMatchingPatterns({
        text: 'Privacy policy and terms of service',
        patterns,
        element: { tagName: 'P', className: '' }
    }),
    [],
    'known footer/legal text should be ignored'
);
assert.deepEqual(
    core.findMatchingPatterns({
        text: "You won't believe why this happened",
        patterns,
        element: { tagName: 'P', className: '' }
    }).map(pattern => pattern.type),
    ['Click Bait'],
    'curiosity-gap phrases should be excluded from ordinary body text while click-bait phrases still match'
);
assert.deepEqual(
    core.findMatchingPatterns({
        text: "You won't believe why this happened",
        patterns,
        element: { tagName: 'H2', className: '' }
    }).map(pattern => pattern.type),
    ['Click Bait', 'Curiosity Gap']
);

console.log('detector-core tests passed');
