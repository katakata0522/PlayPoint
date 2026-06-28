const fs = require('fs');
const path = require('path');
const assert = require('assert');

// テスト用のグローバルモック環境の構築
function setupMockEnvironment() {
    const elements = {};
    
    class MockElement {
        constructor(id, tagName = 'div') {
            this.id = id;
            this.tagName = tagName;
            this._value = '';
            this.textContent = '';
            this.className = '';
            this.style = {
                setProperty: (key, val) => {
                    this.style[key] = val;
                }
            };
            this.listeners = {};
            this.classList = {
                classes: new Set(),
                add: (c) => this.classList.classes.add(c),
                remove: (c) => this.classList.classes.delete(c),
                contains: (c) => this.classList.classes.has(c),
                toggle: (c) => {
                    if (this.classList.classes.has(c)) {
                        this.classList.classes.delete(c);
                        return false;
                    }
                    this.classList.classes.add(c);
                    return true;
                }
            };
            this.nextElementSibling = null;
            this.options = [
                { value: 'business', text: 'ビジネス' },
                { value: 'comic', text: 'コミック' },
                { value: 'magazine', text: '雑誌' },
                { value: 'novel', text: '小説' },
                { value: 'other', text: 'その他' }
            ];
        }

        get value() {
            return this._value;
        }

        set value(val) {
            this._value = val !== undefined && val !== null ? String(val) : '';
        }

        getContext(type) {
            return {
                clearRect: () => {},
                beginPath: () => {},
                arc: () => {},
                fill: () => {},
                stroke: () => {},
                fillText: () => {},
                measureText: () => ({ width: 10 }),
                save: () => {},
                restore: () => {},
                translate: () => {},
                rotate: () => {},
                fillRect: () => {},
                scale: () => {}
            };
        }

        querySelector(selector) {
            return new MockElement('inner-' + selector.replace(/[^a-zA-Z0-9-]/g, ''));
        }

        querySelectorAll(selector) {
            return [];
        }

        focus() {}
        toDataURL(type) { return 'data:image/png;base64,dummy'; }
        remove() {}
        appendChild(child) { return child; }
        removeChild(child) { return child; }
        replaceChild(n, o) { return n; }
        insertBefore(n, r) { return n; }

        addEventListener(event, callback) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(callback);
        }

        dispatchEvent(event) {
            const type = typeof event === 'string' ? event : event.type;
            if (this.listeners[type]) {
                this.listeners[type].forEach(cb => cb(event));
            }
        }

        getAttribute(attr) {
            if (attr === 'data-period') return this.id === 'tab-all' ? 'all' : 'month-current';
            if (attr === 'data-category') return this.id === 'tab-filter-business' ? 'business' : 'all';
            if (attr === 'data-price') return '1000';
            return '';
        }

        setAttribute(attr, value) {
            this[attr] = value;
        }

        scrollIntoViewIfNeeded() {}
    }

    const mockDocument = {
        addEventListener: (event, callback) => {
            if (event === 'DOMContentLoaded') {
                mockDocument.onDOMContentLoaded = callback;
            }
        },
        getElementById: (id) => {
            if (!elements[id]) {
                const el = new MockElement(id);
                if (id === 'subscription-type') el.value = 'kindle';
                if (id === 'monthly-fee') el.value = '980';
                if (id === 'duration') el.value = '3';
                elements[id] = el;
            }
            return elements[id];
        },
        querySelector: (selector) => {
            if (selector.startsWith('input[name="rating"]')) {
                const mockRadio = new MockElement('rating-radio');
                mockRadio.checked = true;
                mockRadio.value = '4.5';
                return mockRadio;
            }
            if (selector.startsWith('.filter-tab')) {
                return new MockElement('filter-tab');
            }
            const idMatch = selector.match(/#([\w-]+)/);
            if (idMatch) {
                return mockDocument.getElementById(idMatch[1]);
            }
            return new MockElement('generic');
        },
        querySelectorAll: (selector) => {
            if (selector === '.period-tab') {
                return [
                    mockDocument.getElementById('tab-all'),
                    mockDocument.getElementById('tab-month')
                ];
            }
            if (selector === '.filter-tab') {
                return [
                    mockDocument.getElementById('tab-filter-all'),
                    mockDocument.getElementById('tab-filter-business')
                ];
            }
            if (selector === '.btn-quick-price') {
                return [new MockElement('btn-quick-1000')];
            }
            if (selector.startsWith('input[name="rating"]')) {
                const radio3 = new MockElement('star3_0');
                radio3.value = '3.0';
                return [radio3];
            }
            return [];
        },
        createElementNS(ns, tag) {
            return new MockElement('svg-' + tag);
        },
        createTextNode(text) {
            const mockTextNode = new MockElement('text-node');
            mockTextNode.textContent = text;
            return mockTextNode;
        },
        documentElement: {
            clientWidth: 1024,
            clientHeight: 768
        },
        body: new MockElement('body'),
        onDOMContentLoaded: null
    };

    const mockLocalStorage = {
        store: {},
        getItem(key) {
            return this.store[key] || null;
        },
        setItem(key, value) {
            this.store[key] = String(value);
        },
        removeItem(key) {
            delete this.store[key];
        },
        clear() {
            this.store = {};
        }
    };

    global.window = {
        addEventListener: () => {},
        location: { reload: () => {} },
        navigator: { serviceWorker: { register: () => Promise.resolve() } },
        innerWidth: 1024,
        innerHeight: 768
    };
    global.document = mockDocument;
    global.localStorage = mockLocalStorage;
    global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);
    
    global.HTMLCanvasElement = class {};
    global.document.createElement = (tag) => {
        if (tag === 'canvas') {
            return {
                getContext: () => ({
                    clearRect: () => {},
                    beginPath: () => {},
                    arc: () => {},
                    fill: () => {},
                    stroke: () => {},
                    fillText: () => {},
                    measureText: () => ({ width: 10 })
                }),
                toDataURL: (type) => 'data:image/png;base64,dummy'
            };
        }
        return new MockElement('created-' + tag);
    };

    global.Event = class {
        constructor(type) {
            this.type = type;
        }
    };

    return {
        elements,
        mockLocalStorage,
        mockDocument
    };
}

function runTests() {
    console.log('Running Kindle Tracker core logic unit tests...');

    const env = setupMockEnvironment();
    
    const appJsPath = path.join(__dirname, '..', 'kindle-tracker', 'app.js');
    const appJsCode = fs.readFileSync(appJsPath, 'utf8');
    
    try {
        eval(appJsCode);
    } catch (e) {
        assert.fail(`app.js loading error: ${e.message}`);
    }

    assert.ok(typeof env.mockDocument.onDOMContentLoaded === 'function', 'DOMContentLoaded listener should be registered');
    env.mockDocument.onDOMContentLoaded();

    console.log('  ok - app.js loaded and DOMContentLoaded initialized successfully');

    const titleInput = env.elements['book-title'];
    const priceInput = env.elements['book-price'];
    const notesInput = env.elements['book-notes'];
    const categorySelect = env.elements['book-category'];
    const dateInput = env.elements['read-date'];
    const form = env.elements['book-form'];

    titleInput.value = 'テスト駆動開発';
    priceInput.value = '3200';
    notesInput.value = '単体テストの重要性についての学び。';
    categorySelect.value = 'business';
    dateInput.value = '2026-06-28';

    const submitEvent = { preventDefault: () => {} };
    assert.ok(form.listeners['submit'] && form.listeners['submit'].length > 0, 'Submit listener should be registered');
    
    form.listeners['submit'][0](submitEvent);

    const storedBooksStr = env.mockLocalStorage.getItem('ku_tracker_books');
    assert.ok(storedBooksStr, 'Books should be saved to localStorage');
    const storedBooks = JSON.parse(storedBooksStr);
    
    assert.strictEqual(storedBooks.length, 1, 'There should be exactly 1 book in localStorage');
    assert.strictEqual(storedBooks[0].title, 'テスト駆動開発', 'Book title should match input');
    assert.strictEqual(storedBooks[0].price, 3200, 'Book price should match input');
    assert.strictEqual(storedBooks[0].rating, 4.5, 'Book rating should be parsed from radio (4.5)');
    assert.strictEqual(storedBooks[0].notes, '単体テストの重要性についての学び。', 'Book notes should match input');
    assert.strictEqual(storedBooks[0].category, 'business', 'Book category should match input');

    console.log('  ok - Book addition and validation logic (including ratings) passes');

    assert.strictEqual(notesInput.value, '', 'Notes input should be reset to empty after submit');
    const charCounter = env.elements['notes-char-counter'];
    assert.strictEqual(charCounter.textContent, '0 / 500', 'Character counter should reset to "0 / 500"');

    notesInput.value = 'A'.repeat(460);
    notesInput.dispatchEvent('input');
    assert.strictEqual(charCounter.textContent, '460 / 500', 'Character counter should update dynamically');
    assert.ok(charCounter.classList.contains('warning'), 'Warning class should be applied when text length >= 450');

    console.log('  ok - Auto-resizing textarea reset and character counter logic passes');

    const subTypeSelect = env.elements['subscription-type'];
    const subNameInput = env.elements['subscription-name'];
    const monthlyFeeInput = env.elements['monthly-fee'];
    const durationInput = env.elements['duration'];

    assert.strictEqual(subTypeSelect.value, 'kindle', 'Initial subscription type should be kindle');

    subTypeSelect.value = 'custom';
    subTypeSelect.dispatchEvent('change');

    subNameInput.value = 'マイカスタムサービス';
    monthlyFeeInput.value = '1500';
    durationInput.value = '6';
    
    monthlyFeeInput.dispatchEvent('change');

    const storedSettingsStr = env.mockLocalStorage.getItem('ku_tracker_settings');
    assert.ok(storedSettingsStr, 'Settings should be saved to localStorage');
    const storedSettings = JSON.parse(storedSettingsStr);
    
    assert.strictEqual(storedSettings.subscriptionType, 'custom');
    assert.strictEqual(storedSettings.customMonthlyFee, 1500, 'Custom fee should be backed up');
    assert.strictEqual(storedSettings.customDuration, 6, 'Custom duration should be backed up');
    assert.strictEqual(storedSettings.customSubscriptionName, 'マイカスタムサービス', 'Custom subscription name should be backed up');

    subTypeSelect.value = 'prime';
    subTypeSelect.dispatchEvent('change');
    
    assert.strictEqual(monthlyFeeInput.value, '600', 'Preset monthly fee should be applied');
    assert.strictEqual(subNameInput.value, 'Amazon Prime', 'Preset name should be applied');

    subTypeSelect.value = 'custom';
    subTypeSelect.dispatchEvent('change');

    assert.strictEqual(monthlyFeeInput.value, '1500', 'Custom monthly fee should be restored from backup');
    assert.strictEqual(durationInput.value, '6', 'Custom duration should be restored from backup');
    assert.strictEqual(subNameInput.value, 'マイカスタムサービス', 'Custom subscription name should be restored from backup');

    console.log('  ok - Custom settings backup and restore logic passes');
    console.log('All Kindle Tracker core logic unit tests passed successfully!');
}

runTests();
process.exit(0);
