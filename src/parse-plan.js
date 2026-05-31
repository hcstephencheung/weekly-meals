// parse-plan.js — free-form weekly meal text → meal objects. Pure.
//
// Recognized lines:
//   "Meal planning Jun 1-7"          → header, skipped
//   "Weekend meal-prep:"             → opens a prep section, items skipped w/ warning
//   "Monday June 1 (notes…)"         → day header; trailing ":,()" tolerated
//   "Lunch - body"                   → slot line; "+" splits ingredients
//   "Lunch - (eat out)"              → skipped w/ warning
//   "Lunch - "                       → empty body, skipped silently

(() => {
  const WEEKDAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const WEEKDAY_ALIASES = {
    sun: 'sunday', mon: 'monday', tue: 'tuesday', tues: 'tuesday',
    wed: 'wednesday', weds: 'wednesday',
    thu: 'thursday', thur: 'thursday', thurs: 'thursday',
    fri: 'friday', sat: 'saturday',
  };
  const MONTHS = ['january','february','march','april','may','june',
                  'july','august','september','october','november','december'];
  const MONTH_INDEX = {};
  for (let i = 0; i < MONTHS.length; i++) {
    MONTH_INDEX[MONTHS[i]]            = i + 1;
    MONTH_INDEX[MONTHS[i].slice(0, 3)] = i + 1;
  }
  MONTH_INDEX.sept = 9;

  const SLOT_RE     = /^(breakfast|lunch|dinner)\s*[-–—:]\s*(.*)$/i;
  const DAY_LINE_RE = /^([a-z]+)[,]?\s+([a-z]+)\.?\s+(\d{1,2})/i;
  const EAT_OUT_RE  = /^(eat(ing)?\s*out|leftovers?|take[-\s]?out|tbd|n\/a)$/i;
  const PREP_RE     = /^(weekend\s+)?meal[-\s]?prep\b/i;
  const HEADER_RE   = /^meal\s*planning\b/i;

  function parsePlanText(text, opts = {}) {
    const today = opts.today || DATES.todayISO();
    const lines = String(text || '').split(/\r?\n/);
    const warnings = [];
    const meals = [];

    let currentDayISO = null;
    let currentDayLabel = null;
    let inPrep = false;

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;

      if (HEADER_RE.test(line)) { inPrep = false; currentDayISO = null; continue; }

      if (PREP_RE.test(line)) {
        inPrep = true;
        currentDayISO = null;
        warnings.push(`Ignored meal-prep section: "${line}"`);
        continue;
      }

      const day = tryParseDayLine(line, today);
      if (day) {
        inPrep = false;
        if (day.warning) warnings.push(day.warning);
        currentDayISO   = day.iso;
        currentDayLabel = `${capitalize(day.weekday)} ${DATES.monthDayLabel(day.iso)}`;
        continue;
      }

      if (inPrep) {
        warnings.push(`Skipped meal-prep item: "${line}"`);
        continue;
      }
      if (!currentDayISO) {
        warnings.push(`Skipped (no day header yet): "${line}"`);
        continue;
      }

      const slot = line.match(SLOT_RE);
      if (!slot) {
        warnings.push(`Unrecognized line: "${line}"`);
        continue;
      }
      const mealType = slot[1].toLowerCase();
      let body = slot[2].trim();
      const parens = body.match(/^\(\s*(.*?)\s*\)$/);
      if (parens) body = parens[1];
      if (!body) continue;
      if (EAT_OUT_RE.test(body)) {
        warnings.push(`${currentDayLabel} ${mealType}: skipped (eat out)`);
        continue;
      }

      const tokens = body.split(/\s*\+\s*/).map(s => s.trim()).filter(Boolean);
      meals.push({
        name:        tokens.map(titleCase).join(' + '),
        ingredients: tokens.map(s => s.toLowerCase()),
        day:         currentDayISO,
        mealType,
      });
    }

    const sorted = meals.map(m => m.day).sort();
    const dateRange = sorted.length
      ? { start: sorted[0], end: sorted[sorted.length - 1] }
      : null;

    return { meals, warnings, dateRange };
  }

  function tryParseDayLine(line, today) {
    const cleaned = line.replace(/[:,]\s*$/, '');
    const m = cleaned.match(DAY_LINE_RE);
    if (!m) return null;
    const weekday = expandWeekday(m[1].toLowerCase());
    const month   = MONTH_INDEX[m[2].toLowerCase()];
    const day     = +m[3];
    if (!weekday || !month) return null;
    const iso = resolveYear(month, day, today);
    if (!iso) return null;
    let warning = null;
    const actual = WEEKDAYS[DATES.dayOfWeekIndex(iso)];
    if (actual !== weekday) {
      warning = `"${line}" — ${capitalize(weekday)} ≠ actual ${capitalize(actual)} (${iso}). Using ${iso}.`;
    }
    return { weekday, iso, warning };
  }

  // Pick the year (current ±1) that lands the date nearest to today.
  function resolveYear(month, day, todayISO) {
    const todayYear = +todayISO.slice(0, 4);
    const candidates = [todayYear, todayYear + 1, todayYear - 1]
      .map(y => DATES.formatISO(y, month, day))
      .filter(DATES.isValidISO);
    if (!candidates.length) return null;
    let best = candidates[0];
    let bestDiff = Math.abs(daysBetween(best, todayISO));
    for (const iso of candidates.slice(1)) {
      const diff = Math.abs(daysBetween(iso, todayISO));
      if (diff < bestDiff) { best = iso; bestDiff = diff; }
    }
    return best;
  }

  function daysBetween(a, b) {
    const pa = DATES.parseISO(a);
    const pb = DATES.parseISO(b);
    const ta = Date.UTC(pa.y, pa.m - 1, pa.d);
    const tb = Date.UTC(pb.y, pb.m - 1, pb.d);
    return Math.round((ta - tb) / 86_400_000);
  }

  function expandWeekday(raw) {
    if (WEEKDAYS.includes(raw)) return raw;
    return WEEKDAY_ALIASES[raw] || null;
  }

  function titleCase(s) {
    return s.replace(/\b([a-z])/g, (_, c) => c.toUpperCase());
  }
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  window.PARSE_PLAN = { parsePlanText };
})();
