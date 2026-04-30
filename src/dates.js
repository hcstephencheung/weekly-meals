// dates.js — pure ISO-date helpers.
//
// All dates are "YYYY-MM-DD" strings. Day-of-week math goes through UTC so
// DST and timezone offsets can never shift a calendar day.

(() => {
  const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const LONG  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function isValidISO(s) {
    if (typeof s !== 'string' || !ISO_RE.test(s)) return false;
    const [, y, m, d] = s.match(ISO_RE);
    const yy = +y, mm = +m, dd = +d;
    if (mm < 1 || mm > 12) return false;
    const dt = new Date(Date.UTC(yy, mm - 1, dd));
    return dt.getUTCFullYear() === yy
        && dt.getUTCMonth() === mm - 1
        && dt.getUTCDate() === dd;
  }

  function parseISO(s) {
    if (!isValidISO(s)) return null;
    const [, y, m, d] = s.match(ISO_RE);
    return { y: +y, m: +m, d: +d };
  }

  function formatISO(y, m, d) {
    return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function todayISO() {
    const d = new Date();
    return formatISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  function addDaysISO(s, n) {
    const p = parseISO(s);
    if (!p) throw new Error(`addDaysISO: bad ISO "${s}"`);
    const t = Date.UTC(p.y, p.m - 1, p.d) + n * 86_400_000;
    const d = new Date(t);
    return formatISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  // Returns 0 (Sunday) .. 6 (Saturday).
  function dayOfWeekIndex(s) {
    const p = parseISO(s);
    if (!p) throw new Error(`dayOfWeekIndex: bad ISO "${s}"`);
    return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  }

  // Given a date and the user's "week starts on" preference, return the ISO
  // of that week's first day.
  function weekStartFor(iso, weekStartsOn /* 'sunday' | 'monday' */) {
    const dow = dayOfWeekIndex(iso);                 // 0..6, Sun=0
    const target = weekStartsOn === 'monday' ? 1 : 0;
    const back = (dow - target + 7) % 7;
    return addDaysISO(iso, -back);
  }

  function daysOfWeek(weekStartISO) {
    return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStartISO, i));
  }

  function shortDow(iso)  { return SHORT[dayOfWeekIndex(iso)]; }
  function longDow(iso)   { return LONG[dayOfWeekIndex(iso)]; }

  function monthDayLabel(iso) {
    const p = parseISO(iso);
    return `${p.d} ${MONTHS[p.m - 1]}`;
  }

  function weekRangeLabel(weekStartISO) {
    const start = parseISO(weekStartISO);
    const end   = parseISO(addDaysISO(weekStartISO, 6));
    const sameMonth = start.m === end.m && start.y === end.y;
    const sameYear  = start.y === end.y;
    if (sameMonth) {
      return `${start.d} – ${end.d} ${MONTHS[end.m - 1]} ${end.y}`;
    }
    if (sameYear) {
      return `${start.d} ${MONTHS[start.m - 1]} – ${end.d} ${MONTHS[end.m - 1]} ${end.y}`;
    }
    return `${start.d} ${MONTHS[start.m - 1]} ${start.y} – ${end.d} ${MONTHS[end.m - 1]} ${end.y}`;
  }

  // Single global namespace for date helpers.
  window.DATES = {
    isValidISO, parseISO, formatISO, todayISO, addDaysISO,
    dayOfWeekIndex, weekStartFor, daysOfWeek,
    shortDow, longDow, monthDayLabel, weekRangeLabel,
  };
})();
