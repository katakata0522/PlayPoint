'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../js/diary.js'), 'utf8')
  .replace(/^import[^\n]+\n/gm, '')
  .replace(/^export\s+/gm, '');

const toPlain = (value) => JSON.parse(JSON.stringify(value));

function createRuntime({ saveFails = false } = {}) {
  const analyticsEvents = [];
  const dispatchedEvents = [];
  const toastCalls = [];
  const savedValues = [];
  let engagedCalls = 0;
  let summaryCalls = 0;

  const pointsInput = { value: '125' };
  const prizeSelect = { value: 'Silver reward' };
  const button = {
    tagName: 'BUTTON',
    dataset: { week: '1' },
    textContent: '保存',
    disabled: false
  };

  const context = {
    console: { log() {}, warn() {}, error() {} },
    Date,
    CONFIGS: {
      JP: {
        lang: 'ja-JP',
        uiText: {
          toastDiarySaveSuccess: '保存しました',
          toastDiarySaveError: '保存に失敗しました',
          saveButton: '保存'
        }
      }
    },
    STATE: {
      currentRegion: 'JP',
      diaryState: { currentYear: 2026, currentMonth: 8 },
      dom: {
        weekInputs: {
          querySelector(selector) {
            if (selector === '#week1_points') return pointsInput;
            if (selector === '#week1_prize') return prizeSelect;
            return null;
          }
        }
      }
    },
    CONSTANTS: {
      DIARY_DATA_KEY: 'playpointDiaryData',
      SAVE_CONFIRMATION_DURATION: 100,
      CLASS_ACTIVE: 'active',
      CLASS_HIDDEN: 'hidden'
    },
    ANALYTICS: {
      track(name, params) { analyticsEvents.push({ name, params }); },
      markEngaged() { engagedCalls += 1; }
    },
    UI: {
      showToast(message, type) { toastCalls.push({ message, type }); }
    },
    SHARE: {},
    localStorage: {
      getItem() { return null; },
      setItem(key, value) {
        if (saveFails) throw new Error('storage unavailable');
        savedValues.push({ key, value });
      }
    },
    document: {
      dispatchEvent(event) { dispatchedEvents.push(event); },
      createElement() { return {}; }
    },
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    navigator: { clipboard: { writeText: async () => {} } },
    setTimeout(callback) { callback(); return 1; }
  };

  context.window = context;
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__DIARY = DIARY;`, context, { filename: 'diary.js' });
  context.__DIARY.updateSummary = () => { summaryCalls += 1; };

  return {
    analyticsEvents,
    button,
    diary: context.__DIARY,
    dispatchedEvents,
    get engagedCalls() { return engagedCalls; },
    get summaryCalls() { return summaryCalls; },
    savedValues,
    toastCalls
  };
}

test('保存失敗時は成功扱いの計測・通知・UI更新を一切行わない', () => {
  const runtime = createRuntime({ saveFails: true });

  runtime.diary.handleDiarySave({ target: runtime.button });

  assert.deepEqual(runtime.analyticsEvents, []);
  assert.equal(runtime.engagedCalls, 0);
  assert.equal(runtime.summaryCalls, 0);
  assert.deepEqual(runtime.dispatchedEvents, []);
  assert.equal(runtime.button.textContent, '保存');
  assert.equal(runtime.button.disabled, false);
  assert.equal(runtime.toastCalls.some(call => call.message === '保存しました'), false);
  assert.equal(runtime.toastCalls.some(call => call.type === 'error'), true, '保存失敗をユーザーへ通知していません');
});

test('通常保存が成功した時だけ保存データ・計測・成功通知を一度ずつ確定する', () => {
  const runtime = createRuntime();

  runtime.diary.handleDiarySave({ target: runtime.button });

  assert.equal(runtime.savedValues.length, 1);
  assert.equal(runtime.savedValues[0].key, 'playpointDiaryData');
  assert.deepEqual(JSON.parse(runtime.savedValues[0].value), {
    2026: { 8: { 1: { points: '125', prize: 'Silver reward' } } }
  });
  assert.deepEqual(toPlain(runtime.analyticsEvents), [{
    name: 'diary_entry_saved',
    params: { region: 'JP', entry_type: 'weekly_reward' }
  }]);
  assert.equal(runtime.engagedCalls, 1);
  assert.equal(runtime.summaryCalls, 1);
  assert.equal(runtime.dispatchedEvents.length, 1);
  assert.equal(runtime.dispatchedEvents[0].type, 'playpoint:diary-saved');
  assert.deepEqual(toPlain(runtime.dispatchedEvents[0].detail), { region: 'JP' });
  assert.equal(runtime.toastCalls.filter(call => call.message === '保存しました').length, 1);
  assert.equal(runtime.button.textContent, '保存');
  assert.equal(runtime.button.disabled, false);
});

test('サイレント保存はデータと計測を確定するが成功toast・公開イベントを出さない', () => {
  const runtime = createRuntime();

  runtime.diary.handleDiarySave({ target: runtime.button }, true);

  assert.equal(runtime.savedValues.length, 1);
  assert.equal(runtime.analyticsEvents.length, 1);
  assert.equal(runtime.analyticsEvents[0].name, 'diary_entry_saved');
  assert.equal(runtime.engagedCalls, 1);
  assert.equal(runtime.summaryCalls, 1);
  assert.deepEqual(runtime.dispatchedEvents, []);
  assert.equal(runtime.toastCalls.some(call => call.message === '保存しました'), false);
});
