'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { SCHEDULES, nextDate, createCalendar } = require('../js/reader-calendar.js');

test('確認日は日本時間の日付を使い、曜日・月末・年末をまたいでも次の該当日になる', () => {
  const next = (id, date) => nextDate(SCHEDULES[id], new Date(date)).toISOString().slice(0, 10);
  assert.equal(next('weekly', '2026-10-08T15:00:00Z'), '2026-10-09');
  assert.equal(next('weekly', '2026-10-09T15:00:00Z'), '2026-10-16');
  assert.equal(next('ticket', '2026-10-05T12:00:00Z'), '2026-10-06');
  assert.equal(next('pass', '2026-12-31T15:00:00Z'), '2027-01-07');
  assert.equal(next('monthly', '2026-12-31T14:59:00Z'), '2027-01-01');
  assert.equal(next('monthly', '2026-12-31T15:00:00Z'), '2027-01-01');
  assert.equal(next('monthly', '2028-02-28T15:00:00Z'), '2028-03-01');
});
test('選択した確認日だけを有限回の終日予定として書き出し、未選択では作成しない', () => {
  assert.throws(() => createCalendar([]), /選んで/);
  assert.throws(() => createCalendar(['invalid']), /選んで/);
  const data = createCalendar(['weekly', 'monthly', 'weekly', 'invalid'], new Date('2026-10-05T00:00:00Z'));
  const unfolded = data.replace(/\r\n /g, '');
  assert.equal((data.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.match(unfolded, /DTSTART;VALUE=DATE:20261009\r\nDTEND;VALUE=DATE:20261010/);
  assert.match(unfolded, /FREQ=MONTHLY;BYMONTHDAY=1;COUNT=3/);
  assert.match(unfolded, /FREQ=WEEKLY;BYDAY=FR;COUNT=3/);
  assert.match(unfolded, /提供・終了日時は実際の表示で確認/);
  assert.doesNotMatch(data, /VALARM|ATTENDEE|ORGANIZER|FREQ=DAILY/);
  assert.ok(data.split('\r\n').every(line => Buffer.byteLength(line, 'utf8') <= 75));
  assert.equal(data.replaceAll('\r\n', '').includes('\n'), false);
});
