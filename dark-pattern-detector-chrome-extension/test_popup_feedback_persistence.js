const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

class Element {
    constructor(id = '') {
        this.id = id;
        this.children = [];
        this.listeners = {};
        this.style = {};
        this.className = '';
        this.textContent = '';
        this.title = '';
        this.disabled = false;
    }

    set innerHTML(_) {
        this.children = [];
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    addEventListener(type, handler) {
        this.listeners[type] = handler;
    }

    async trigger(type) {
        return this.listeners[type]?.({ target: this });
    }
}

function descendants(element) {
    return element.children.flatMap(child => [child, ...descendants(child)]);
}

function createPopup(feedbackById) {
    const ids = ['scanBtn', 'startBtn', 'pauseBtn', 'deleteHistoryBtn', 'status', 'patternCount', 'historyStatus', 'insightsStatus', 'patternsList', 'modeBadge', 'toggleVisual'];
    const elements = Object.fromEntries(ids.map(id => [id, new Element(id)]));
    const domListeners = {};
    const tabMessages = [];
    const document = {
        addEventListener(type, handler) { domListeners[type] = handler; },
        getElementById(id) { return elements[id]; },
        createElement() { return new Element(); }
    };
    const chrome = {
        tabs: {
            query: async () => [{ id: 1 }],
            sendMessage: async (_, request) => {
                tabMessages.push(request);
                if (request.action === 'getResults') {
                    return {
                        count: 1,
                        hasScanned: true,
                        sessionState: 'active',
                        mode: 'Regex only',
                        results: [{
                            detectionId: 'detection-1',
                            type: 'Urgency',
                            text: 'Hurry! Offer ends soon.',
                            explanation: 'Matched a configured local text rule. Review and correct it if it does not fit this page.'
                        }]
                    };
                }
                if (request.action === 'applySafetyAction') return { applied: request.eventIds.length };
                return { sessionState: 'active' };
            }
        },
        storage: { local: { get: (_, callback) => callback({ visualEnabled: false }), set: async () => {} } },
        runtime: {
            onMessage: { addListener: () => {} },
            sendMessage: async request => {
                if (request.action === 'getLocalHistorySummary') return { count: 1 };
                if (request.action === 'getLocalInsights') {
                    return { eventCount: 1, sessionCount: 1, timeBucketCount: 1, topCategories: [{ category: 'Urgency', count: 1 }] };
                }
                if (request.action === 'updateLocalEventFeedback') {
                    request.eventIds.forEach(id => feedbackById.set(id, 'not_relevant'));
                    return { updated: request.eventIds.length };
                }
                if (request.action === 'getLocalEventFeedback') {
                    return {
                        feedbackByEventId: Object.fromEntries(
                            [...feedbackById].map(([id, relevance]) => [id, { relevance }])
                        )
                    };
                }
                return {};
            }
        }
    };
    const source = fs.readFileSync(path.join(__dirname, 'popup.js'), 'utf8');
    vm.runInNewContext(source, { chrome, document, console });
    return {
        async open() { await domListeners.DOMContentLoaded(); },
        feedbackButton() { return descendants(elements.patternsList).find(el => el.className === 'feedback-btn'); },
        safetyButton() { return descendants(elements.patternsList).find(el => el.className === 'safety-btn'); },
        explanationText() { return descendants(elements.patternsList).find(el => el.className === 'pattern-explanation')?.textContent; },
        tabMessages,
        insightsText() { return elements.insightsStatus.textContent; }
    };
}

(async () => {
    const feedbackById = new Map();
    const firstPopup = createPopup(feedbackById);
    await firstPopup.open();
    assert.match(firstPopup.insightsText(), /Local summary: 1 signals across 1 session — Urgency \(1\)\. Observation window: 1 recorded hour\. Stored on this device; Delete Local History removes it\./);
    assert.equal(firstPopup.explanationText(), 'Matched a configured local text rule. Review and correct it if it does not fit this page.');
    assert.equal(firstPopup.safetyButton().textContent, 'Blur', 'a detection should offer a reversible blur action');
    await firstPopup.safetyButton().trigger('click');
    assert.deepEqual(firstPopup.tabMessages.at(-1), {
        action: 'applySafetyAction',
        eventIds: ['detection-1'],
        safetyAction: 'blur'
    }, 'blur should be applied through the active content script only after a person clicks it');
    await firstPopup.feedbackButton().trigger('click');
    assert.equal(feedbackById.get('detection-1'), 'not_relevant', 'click should persist feedback');

    const reopenedPopup = createPopup(feedbackById);
    await reopenedPopup.open();
    assert.equal(reopenedPopup.feedbackButton().textContent, 'Marked', 'reopened popup should restore the persisted feedback state');
    console.log('popup feedback persistence test passed');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
