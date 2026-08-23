const assert = require('node:assert/strict');
const capture = require('./active-tab-capture.js');

let captured = false;
(async () => {
    const receipt = await capture.captureOnce({
        getActiveTab: async () => ({ id: 7, windowId: 4 }),
        ensureReady: async tab => ({ eligible: tab.id === 7 }),
        captureVisibleTab: async () => {
            captured = true;
            return 'data:image/png;base64,temporary-image-bytes';
        },
        decodeImage: async rawCapture => {
            assert.match(rawCapture, /^data:image\/png/);
            return { width: 1280, height: 720 };
        },
        analyzeCapture: async rawCapture => {
            assert.match(rawCapture, /^data:image\/png/);
            return { status: 'available', signals: [{ category: 'graphic_violence', confidence: 0.85, rawDescription: 'never returned' }] };
        }
    });

    assert.equal(captured, true);
    assert.deepEqual(receipt, {
        captureMode: 'active_tab',
        width: 1280,
        height: 720,
        rawCaptureDeleted: true,
        analysis: { status: 'available', signals: [{ category: 'graphic_violence', confidence: 0.85 }] }
    });
    assert.equal('rawCapture' in receipt, false, 'the receipt must never expose raw image data');

    await assert.rejects(
        capture.captureOnce({
            getActiveTab: async () => ({ id: 7, windowId: 4 }),
            ensureReady: async () => ({ eligible: false, reason: 'Unsupported page.' }),
            captureVisibleTab: async () => { throw new Error('capture should not run'); },
            decodeImage: async () => ({})
        }),
        /Unsupported page/
    );

    console.log('active-tab capture tests passed');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
