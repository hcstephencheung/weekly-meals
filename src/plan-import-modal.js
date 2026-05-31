// plan-import-modal.js — paste-a-week-plan flow.
// Step 1: textarea. Step 2: preview + warnings. Apply replaces existing meals
// inside the parsed date range with the parsed meals.

(() => {
  function open() {
    MODAL.show(buildStepInput(''));
  }

  // ---- step 1: textarea ----
  function buildStepInput(initialText) {
    const wrap = document.createElement('form');
    wrap.className = 'mform';
    wrap.noValidate = true;

    wrap.append(
      header('Import from text', 'Paste the week’s plan'),
      field(
        'Plan',
        'Day headers + lunch/dinner lines. "+" splits ingredients. "(eat out)" is skipped.',
        (input) => {
          const ta = document.createElement('textarea');
          ta.rows = 14;
          ta.dataset.fieldName = '';
          ta.placeholder = SAMPLE_HINT;
          ta.value = initialText || '';
          input.append(ta);
          return ta;
        },
      ).el,
    );

    const errEl = document.createElement('p');
    errEl.className = 'mform__error';
    errEl.hidden = true;
    wrap.append(errEl);

    const ta = wrap.querySelector('textarea');
    const actions = document.createElement('div');
    actions.className = 'mform__actions';
    actions.append(
      button('Cancel', 'btn--ghost', () => MODAL.close()),
      button('Preview ›', 'btn--add', () => {
        const result = PARSE_PLAN.parsePlanText(ta.value, { today: DATES.todayISO() });
        if (!result.meals.length) {
          errEl.textContent = result.warnings.length
            ? `No meals parsed. ${result.warnings[0]}`
            : 'No meals parsed. Check the format and try again.';
          errEl.hidden = false;
          return;
        }
        MODAL.show(buildStepPreview(ta.value, result));
      }),
    );
    wrap.append(actions);
    return wrap;
  }

  // ---- step 2: preview ----
  function buildStepPreview(originalText, result) {
    const wrap = document.createElement('div');
    wrap.className = 'mform';

    const count = result.meals.length;
    wrap.append(header('Preview', `${count} meal${count === 1 ? '' : 's'} ready to add`));

    const { start, end } = result.dateRange;
    const existing = __STATE__.meals.filter(m => m.day >= start && m.day <= end);
    const range = document.createElement('p');
    range.className = 'mform__hint';
    range.textContent =
      `Range: ${DATES.monthDayLabel(start)} – ${DATES.monthDayLabel(end)}. ` +
      (existing.length
        ? `This will replace ${existing.length} existing meal${existing.length === 1 ? '' : 's'}.`
        : 'No existing meals in that range.');
    wrap.append(range);

    wrap.append(buildPreviewList(result.meals));

    if (result.warnings.length) {
      wrap.append(buildWarnings(result.warnings));
    }

    const actions = document.createElement('div');
    actions.className = 'mform__actions';
    actions.append(
      button('‹ Back', 'btn--ghost', () => MODAL.show(buildStepInput(originalText))),
      button('Apply', 'btn--add', () => {
        try {
          applyResult(result);
          MODAL.close();
        } catch (err) {
          alert(`Apply failed: ${err.message || err}`);
        }
      }),
    );
    wrap.append(actions);
    return wrap;
  }

  function buildPreviewList(meals) {
    const list = document.createElement('div');
    list.className = 'plan-preview';

    const byDay = new Map();
    for (const m of meals) {
      if (!byDay.has(m.day)) byDay.set(m.day, []);
      byDay.get(m.day).push(m);
    }
    for (const [day, items] of [...byDay.entries()].sort()) {
      const dayEl = document.createElement('div');
      dayEl.className = 'plan-preview__day';
      const head = document.createElement('p');
      head.className = 'plan-preview__head';
      head.textContent = `${DATES.longDow(day)} · ${DATES.monthDayLabel(day)}`;
      dayEl.append(head);

      const ul = document.createElement('ul');
      ul.className = 'plan-preview__list';
      for (const m of items) {
        const li = document.createElement('li');
        const t = document.createElement('span');
        t.className = `plan-preview__type plan-preview__type--${m.mealType}`;
        t.textContent = m.mealType;
        const n = document.createElement('span');
        n.className = 'plan-preview__name';
        n.textContent = m.name;
        li.append(t, n);
        ul.append(li);
      }
      dayEl.append(ul);
      list.append(dayEl);
    }
    return list;
  }

  function buildWarnings(warnings) {
    const wrap = document.createElement('div');
    wrap.className = 'plan-preview__warnings-wrap';
    const head = document.createElement('p');
    head.className = 'mform__hint';
    head.textContent = `Notes (${warnings.length}):`;
    const ul = document.createElement('ul');
    ul.className = 'plan-preview__warnings';
    for (const w of warnings) {
      const li = document.createElement('li');
      li.textContent = w;
      ul.append(li);
    }
    wrap.append(head, ul);
    return wrap;
  }

  function applyResult(result) {
    const { start, end } = result.dateRange;
    const toDelete = __STATE__.meals
      .filter(m => m.day >= start && m.day <= end)
      .map(m => m.id);
    for (const id of toDelete) STORE.deleteMeal(id);
    for (const m of result.meals) STORE.addMeal(m);
    STORE.setWeekStart(DATES.weekStartFor(start, __STATE__.weekStartsOn));
  }

  // ---- shared helpers ----
  function header(kicker, title) {
    const frag = document.createDocumentFragment();
    const k = document.createElement('p');
    k.className = 'mform__kicker';
    k.textContent = kicker;
    const h = document.createElement('h2');
    h.className = 'mform__title';
    h.textContent = title;
    frag.append(k, h);
    return frag;
  }

  function field(label, hint, buildInput) {
    const el = document.createElement('label');
    el.className = 'mform__field';
    const head = document.createElement('span');
    head.className = 'mform__label';
    head.textContent = label;
    el.append(head);
    if (hint) {
      const h = document.createElement('span');
      h.className = 'mform__hint';
      h.textContent = hint;
      el.append(h);
    }
    const inputWrap = document.createElement('span');
    inputWrap.className = 'mform__input';
    el.append(inputWrap);
    const inputEl = buildInput ? buildInput(inputWrap) : null;
    return { el, input: inputWrap, inputEl };
  }

  function button(label, kind, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${kind}`;
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  const SAMPLE_HINT = [
    'Meal planning Jun 1-7',
    '',
    'Monday June 1',
    'Lunch - korean spicy chicken stir-fry + rice',
    'Dinner - ',
    '',
    'Tuesday June 2',
    'Lunch - dumplings',
    'Dinner - salad mix + chicken',
  ].join('\n');

  window.PLAN_IMPORT = { open };
})();
