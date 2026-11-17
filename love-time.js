/*
 * Calendar arithmetic for Tempo apaixonado. No dependencies or browser storage.
 *
 * LoveTime.calculate(startDate, startTime?, nowMs = Date.now())
 *   startDate: YYYY-MM-DD; startTime: HH:mm, or null/empty for 00:00.
 *   Both the starting time and calendar anniversaries use fixed UTC-03:00.
 *   Returns {valid:false} for invalid input. Otherwise returns:
 *   {valid, future, startMs, years, months, days, hours, minutes, seconds,
 *    totalDays, totalHours, totalMinutes, totalSeconds,
 *    nextMonthDate, nextMonthMs, daysToNextMonth}.
 *
 * Calendar months are anchored to the original date and clamp to the last day
 * when necessary (31 January -> 28 February -> 31 March). Years are complete
 * groups of twelve such months, so a leap-day anniversary never goes backwards.
 * Totals count full elapsed units; components and totals are zero before start.
 * nextMonthDate is the next strictly future monthly anniversary (YYYY-MM-DD),
 * excluding the starting instant itself. daysToNextMonth rounds remaining days up.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LoveTime = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const OFFSET = 3 * HOUR;
  const invalid = () => ({ valid: false });
  const pad = (number, size = 2) => String(number).padStart(size, '0');
  const daysInMonth = (year, month) => [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];

  function instant(year, month, day, hour, minute) {
    // setUTCFullYear avoids Date.UTC's special interpretation of years 0–99.
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(hour, minute, 0, 0);
    return date.getTime() + OFFSET;
  }

  function calculate(startDate, startTime, nowMs = Date.now()) {
    if (typeof startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isFinite(nowMs)) return invalid();
    const [year, month, day] = startDate.split('-').map(Number);
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return invalid();
    const time = startTime === undefined || startTime === null || startTime === '' ? '00:00' : startTime;
    if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) return invalid();
    const [hour, minute] = time.split(':').map(Number);
    if (hour > 23 || minute > 59) return invalid();
    const startMs = instant(year, month, day, hour, minute);
    const localNow = new Date(nowMs - OFFSET);
    if (!Number.isFinite(startMs) || !Number.isFinite(localNow.getTime())) return invalid();

    function anniversary(monthsAfterStart) {
      const monthIndex = year * 12 + month - 1 + monthsAfterStart;
      const anniversaryYear = Math.floor(monthIndex / 12);
      const anniversaryMonth = monthIndex % 12 + 1;
      const anniversaryDay = Math.min(day, daysInMonth(anniversaryYear, anniversaryMonth));
      return {
        ms: instant(anniversaryYear, anniversaryMonth, anniversaryDay, hour, minute),
        date: `${pad(anniversaryYear, 4)}-${pad(anniversaryMonth)}-${pad(anniversaryDay)}`
      };
    }

    const future = nowMs < startMs;
    let fullMonths = 0;
    let anchorMs = startMs;
    if (!future) {
      fullMonths = Math.max(0, (localNow.getUTCFullYear() - year) * 12 + localNow.getUTCMonth() + 1 - month);
      const candidate = anniversary(fullMonths);
      if (candidate.ms > nowMs) fullMonths -= 1;
      anchorMs = anniversary(fullMonths).ms;
    }
    const next = anniversary(fullMonths + 1);
    if (!Number.isFinite(anchorMs) || !Number.isFinite(next.ms)) return invalid();
    const elapsed = Math.max(0, nowMs - startMs);
    const remainder = Math.max(0, nowMs - anchorMs);
    return {
      valid: true,
      future,
      startMs,
      years: future ? 0 : Math.floor(fullMonths / 12),
      months: future ? 0 : fullMonths % 12,
      days: future ? 0 : Math.floor(remainder / DAY),
      hours: future ? 0 : Math.floor(remainder / HOUR) % 24,
      minutes: future ? 0 : Math.floor(remainder / MINUTE) % 60,
      seconds: future ? 0 : Math.floor(remainder / SECOND) % 60,
      totalDays: Math.floor(elapsed / DAY),
      totalHours: Math.floor(elapsed / HOUR),
      totalMinutes: Math.floor(elapsed / MINUTE),
      totalSeconds: Math.floor(elapsed / SECOND),
      nextMonthDate: next.date,
      nextMonthMs: next.ms,
      daysToNextMonth: Math.ceil((next.ms - nowMs) / DAY)
    };
  }

  return Object.freeze({ calculate });
});
