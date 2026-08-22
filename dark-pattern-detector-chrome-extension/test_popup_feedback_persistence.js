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
    const ids = ['scanBtn', 'startBtn', 'pauseBtn', 'deleteHistoryBtn', 'status', 'patternCount', 'historyStatus', 'patternsList', 'modeBadge', 'toggleVisual'];
    const elements = Object.fromEntries(ids.map(id => [id, new Element(id)]));
    const domListeners = {};
    const document = {
        addEventListener(type, handler) { domListeners[type] = handler; },
        getElementById(id) { return elements[id]; },
        createElement() { return new Element(); }
    };
    const chrome = {
        tabs: {
            query: async () => [{ id: 1 }],
            sendMessage: async (_, request) => request.action === 'getResults' ? {
                count: 1,
                hasScanned: true,
                sessionState: 'active',
                mode: 'Regex only',
                results: [{ detectionId: 'detection-1', type: 'Urgency', text: 'Hurry! Offer ends soon.' }]
            } : { sessionState: 'active' }
        },
        storage: { local: { get: (_, callback) => callback({ visualEnabled: false }), set: async () => {} } },
        runtime: {
            onMessage: { addListener: () => {} },
            sendMessage: async request => {
                if (request.action === 'getLocalHistorySummary') return { count: 1 };
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
        feedbackButton() { return descendants(elements.patternsList).find(el => el.className === 'feedback-btn'); }
    };
}

(async () => {
    const feedbackById = new Map();
    const firstPopup = createPopup(feedbackById);
    await firstPopup.open();
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
