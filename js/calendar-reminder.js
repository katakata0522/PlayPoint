'use strict';

import { CONFIGS, STATE, ANALYTICS, getNextFridayCalendarWindow } from './config.js';

export function bindCalendarReminderEvents() {
    if (STATE.dom.downloadIcalBtn) {
        STATE.dom.downloadIcalBtn.addEventListener('click', () => downloadICS());
    }
    if (STATE.dom.registerGoogleCalBtn) {
        STATE.dom.registerGoogleCalBtn.addEventListener('click', () => {
            ANALYTICS.track('calendar_reminder_added', {
                region: STATE.currentRegion,
                calendar_type: 'google'
            });
        });
    }
}

// ICSファイルのダウンロードロジック
export function downloadICS() {
    const config = CONFIGS[STATE.currentRegion];
    const texts = config.uiText;
    const summary = texts.calSubject;
    const description = texts.calDetails.replace(/\n/g, '\\n');

    const calendarWindow = getNextFridayCalendarWindow(STATE.currentRegion === 'US');

    const icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//PlayPoint//NONSGML Calendar//EN',
        'BEGIN:VEVENT',
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `DTSTART:${calendarWindow.start}`,
        `DTEND:${calendarWindow.end}`,
        'RRULE:FREQ=WEEKLY;BYDAY=FR',
        'SEQUENCE:0',
        'STATUS:CONFIRMED',
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
        'END:VCALENDAR'
    ];
    const icsString = icsLines.join('\r\n');
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = texts.icsFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ANALYTICS.track('calendar_reminder_added', {
        region: STATE.currentRegion,
        calendar_type: 'ical'
    });
}