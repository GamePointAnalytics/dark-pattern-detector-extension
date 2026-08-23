const assert = require('node:assert/strict');
const core = require('./image-signal-core.js');

assert.deepEqual(core.parseModelSignals(JSON.stringify({
    signals: [
        { category: 'sexual_nudity', confidence: 'high', description: 'must not survive parsing' },
        { category: 'graphic_violence', confidence: 'medium' },
        { category: 'unknown', confidence: 'high' },
        { category: 'sexual_nudity', confidence: 'low' }
    ]
})), [
    { category: 'sexual_nudity', confidence: 0.85 },
    { category: 'graphic_violence', confidence: 0.6 }
]);
assert.deepEqual(core.parseModelSignals('not JSON'), []);
assert.equal(core.labelFor('visual_dark_pattern'), 'Possible visual dark pattern');

console.log('image-signal core tests passed');
