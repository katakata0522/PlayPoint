(function (root) {
  'use strict';
  const ARTICLE = 'https://playpoint-sim.com/articles/2026-09-19-play-points-calendar-schedule-guide.html';
  const SCHEDULES = {
    ticket: { day: 2, rule: 'FREQ=WEEKLY;BYDAY=TU;COUNT=3', title: 'Super Ticketを確認', condition: 'プラチナ・ダイヤモンド向け。Playストアの特典画面で対象・保存期限を確認。' },
    pass: { day: 4, rule: 'FREQ=WEEKLY;BYDAY=TH;COUNT=3', title: 'Play Passの週次特典を確認', condition: '対象のPlay Pass利用者向け。PlayストアのPlay Pass画面で今週の条件を確認。' },
    weekly: { day: 5, rule: 'FREQ=WEEKLY;BYDAY=FR;COUNT=3', title: 'ウィークリーリワードを確認', condition: 'シルバー以上向け。Playストアの特典画面で受取条件・期限を確認。受取後の記録：https://playpoint-sim.com/?mode=diary&week=current' },
    monthly: { rule: 'FREQ=MONTHLY;BYMONTHDAY=1;COUNT=3', title: '月初のポイント増量案内を確認', condition: '開催・倍率を保証する予定ではありません。自分のPlayストアの「貯める」で対象・獲得率・開始操作・期限を確認。' }
  };
  function nextDate(schedule, now) {
    // 日本向けの確認日を、端末の地域設定に依存しない終日予定へ変換する。
    const date = new Date(new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10) + 'T00:00:00Z');
    if (schedule.day !== undefined) date.setUTCDate(date.getUTCDate() + (schedule.day - date.getUTCDay() + 7) % 7);
    else if (date.getUTCDate() !== 1) { date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + 1); }
    return date;
  }
  const dateValue = date => date.toISOString().slice(0, 10).replaceAll('-', '');
  const textValue = value => value.replaceAll('\\', '\\\\').replace(/\r?\n/g, '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');
  function foldLine(line) {
    let output = '', part = '', bytes = 0;
    for (const char of line) {
      const size = new TextEncoder().encode(char).length;
      if (bytes + size > 75) { output += part + '\r\n'; part = ' '; bytes = 1; }
      part += char; bytes += size;
    }
    return output + part;
  }
  function createCalendar(ids, now = new Date()) {
    const selected = [...new Set(ids)].filter(id => Object.hasOwn(SCHEDULES, id));
    if (!selected.length) throw new Error('確認日を選んでください。');
    const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PlayPoint//Reader check dates//JA', 'CALSCALE:GREGORIAN'];
    for (const id of selected) {
      const schedule = SCHEDULES[id], start = nextDate(schedule, now), end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      lines.push('BEGIN:VEVENT', 'UID:' + id + '-' + dateValue(start) + '@playpoint-sim.com', 'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + dateValue(start), 'DTEND;VALUE=DATE:' + dateValue(end), 'RRULE:' + schedule.rule,
        'SUMMARY:' + textValue(schedule.title), 'DESCRIPTION:' + textValue(schedule.condition + '\n日本向けの確認日です。特典の提供・終了日時は実際の表示で確認してください。\n' + ARTICLE),
        'URL:' + ARTICLE, 'TRANSP:TRANSPARENT', 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.map(foldLine).join('\r\n') + '\r\n';
  }
  if (typeof module === 'object' && module.exports) module.exports = { SCHEDULES, nextDate, createCalendar };
  if (!root.document) return;
  function init() {
    const form = root.document.querySelector('[data-reader-calendar]');
    if (!form) return;
    form.hidden = false;
    const status = form.querySelector('[role="status"]');
    form.addEventListener('submit', event => {
      event.preventDefault();
      const ids = [...form.querySelectorAll('input:checked')].map(input => input.value);
      if (!ids.length) { status.textContent = '保存したい確認日を1つ以上選んでください。'; form.querySelector('input').focus(); return; }
      try {
        const file = new Blob([createCalendar(ids)], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(file), link = root.document.createElement('a');
        link.href = url; link.download = 'playpoint-check-dates.ics'; form.append(link); link.click(); link.remove();
        root.setTimeout(() => URL.revokeObjectURL(url), 30000);
        status.textContent = '確認日のファイルを作成しました。ダウンロードしたファイルをカレンダーで開き、追加してください。';
        root.PlayPointAnalytics?.track('reader_calendar_download', { results_count: ids.length });
      } catch { status.textContent = 'ファイルを作成できませんでした。下の確認日をカレンダーに手動で追加してください。'; }
    });
  }
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})(typeof globalThis === 'object' ? globalThis : this);
