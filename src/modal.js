// modal.js — bottom-sheet modal infrastructure + add/edit forms.

(() => {
  let mountEl, sheetEl;
  let onCloseFn;

  // ============== infrastructure =====================================
  function ensureScaffold() {
    mountEl = document.querySelector('[data-modal]');
    if (!mountEl) return null;
    if (mountEl.dataset.ready === '1') return mountEl;

    mountEl.innerHTML = '';
    const backdrop = document.createElement('div');
    backdrop.className = 'modal__backdrop';
    backdrop.addEventListener('click', close);

    sheetEl = document.createElement('div');
    sheetEl.className = 'modal__sheet';
    sheetEl.setAttribute('role', 'dialog');
    sheetEl.setAttribute('aria-modal', 'true');

    const handle = document.createElement('span');
    handle.className = 'modal__handle';
    handle.setAttribute('aria-hidden', 'true');

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal__close btn btn--ghost';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', close);

    const body = document.createElement('div');
    body.className = 'modal__body';
    body.dataset.modalBody = '';

    sheetEl.append(handle, closeBtn, body);
    mountEl.append(backdrop, sheetEl);
    mountEl.dataset.ready = '1';

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mountEl.classList.contains('is-open')) close();
    });
    return mountEl;
  }

  function show(contentEl, opts = {}) {
    const m = ensureScaffold();
    if (!m) return;
    onCloseFn = opts.onClose || null;
    const body = m.querySelector('[data-modal-body]');
    body.replaceChildren(contentEl);
    m.hidden = false;
    m.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => m.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!mountEl || !mountEl.classList.contains('is-open')) return;
    mountEl.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!mountEl.classList.contains('is-open')) {
        mountEl.hidden = true;
        mountEl.setAttribute('aria-hidden', 'true');
        const body = mountEl.querySelector('[data-modal-body]');
        if (body) body.replaceChildren();
      }
      const cb = onCloseFn; onCloseFn = null;
      if (cb) cb();
    }, 320);
  }

  function isOpen() { return !!mountEl && mountEl.classList.contains('is-open'); }

  // ============== add / edit form ====================================
  function openAdd(prefill = {}) {
    const initial = {
      name: '',
      ingredients: [],
      day: prefill.day || defaultDay(),
      mealType: prefill.mealType || 'lunch',
    };
    show(buildForm(initial, { mode: 'add' }));
    focusFirstField();
  }

  function openEdit(meal) {
    show(buildForm({ ...meal }, { mode: 'edit', mealId: meal.id }));
    focusFirstField();
  }

  function defaultDay() {
    const today = DATES.todayISO();
    const ws = __STATE__.weekStart;
    const we = ws ? DATES.addDaysISO(ws, 6) : null;
    return (ws && today >= ws && today <= we) ? today : (ws || today);
  }

  function focusFirstField() {
    setTimeout(() => {
      const f = document.querySelector('[data-modal-body] [data-field-name]');
      if (f) f.focus();
    }, 350);
  }

  function buildForm(initial, ctx) {
    const wrap = document.createElement('form');
    wrap.className = 'mform';
    wrap.noValidate = true;

    // header
    const kicker = document.createElement('p');
    kicker.className = 'mform__kicker';
    kicker.textContent = ctx.mode === 'add' ? 'Add a Meal' : 'Edit Meal';

    const h = document.createElement('h2');
    h.className = 'mform__title';
    h.textContent = ctx.mode === 'add' ? 'Set the table' : 'Amend the bill';

    wrap.append(kicker, h);

    // ---- Name
    const nameField = field('Name', 'A title fit for the menu.');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.required = true;
    nameInput.maxLength = 120;
    nameInput.dataset.fieldName = '';
    nameInput.placeholder = 'e.g. Chicken & Lemon Tagine';
    nameInput.value = initial.name || '';
    nameField.input.append(nameInput);
    wrap.append(nameField.el);

    // ---- Ingredients
    const ingField = field('Ingredients', 'One per line. Quantities optional.');
    const ingInput = document.createElement('textarea');
    ingInput.rows = 5;
    ingInput.placeholder = 'olive oil\nlemon\nthyme';
    ingInput.value = (initial.ingredients || []).join('\n');
    ingField.input.append(ingInput);
    wrap.append(ingField.el);

    // ---- Day
    const dayField = field('Day', 'Any date — the calendar will move to it.');
    const dayInput = document.createElement('input');
    dayInput.type = 'date';
    dayInput.required = true;
    dayInput.value = initial.day || '';
    dayField.input.append(dayInput);
    wrap.append(dayField.el);

    // ---- Meal type
    const typeField = field('Course', 'Breakfast, lunch, or dinner.');
    const typeSeg = document.createElement('div');
    typeSeg.className = 'seg seg--block';
    typeSeg.setAttribute('role', 'radiogroup');
    let selectedType = initial.mealType || 'lunch';
    for (const t of STORE.MEAL_TYPES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg__btn';
      b.dataset.value = t;
      b.textContent = MEAL_CARD.TYPE_LABEL[t];
      b.setAttribute('role', 'radio');
      const apply = () => {
        selectedType = b.dataset.value;
        for (const x of typeSeg.querySelectorAll('.seg__btn')) {
          const active = x.dataset.value === selectedType;
          x.classList.toggle('is-active', active);
          x.setAttribute('aria-checked', String(active));
        }
      };
      b.addEventListener('click', apply);
      if (t === selectedType) {
        b.classList.add('is-active');
        b.setAttribute('aria-checked', 'true');
      }
      typeSeg.append(b);
    }
    typeField.input.append(typeSeg);
    wrap.append(typeField.el);

    // ---- error line
    const errEl = document.createElement('p');
    errEl.className = 'mform__error';
    errEl.hidden = true;
    wrap.append(errEl);

    // ---- actions
    const actions = document.createElement('div');
    actions.className = 'mform__actions';

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn btn--ghost';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => close());

    const save = document.createElement('button');
    save.type = 'submit';
    save.className = 'btn btn--add';
    save.innerHTML = ctx.mode === 'add'
      ? '<span class="btn__glyph">+</span> Add to Bill'
      : '<span class="btn__glyph">✎</span> Save Changes';

    actions.append(cancel, save);

    if (ctx.mode === 'edit') {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn--danger';
      del.innerHTML = '<span class="btn__glyph">🗑</span> Delete';
      del.addEventListener('click', () => {
        if (!confirm(`Delete "${initial.name}"? This can't be undone.`)) return;
        STORE.deleteMeal(ctx.mealId);
        close();
      });
      actions.prepend(del);
    }

    wrap.append(actions);

    // ---- submit
    wrap.addEventListener('submit', (e) => {
      e.preventDefault();
      const values = {
        name: nameInput.value,
        ingredients: ingInput.value.split('\n'),
        day: dayInput.value,
        mealType: selectedType,
      };
      try {
        if (ctx.mode === 'add') {
          const m = STORE.addMeal(values);
          // jump the calendar to the week containing the new meal so it's visible
          STORE.setWeekStart(DATES.weekStartFor(m.day, __STATE__.weekStartsOn));
        } else {
          STORE.updateMeal(ctx.mealId, values);
          STORE.setWeekStart(DATES.weekStartFor(values.day, __STATE__.weekStartsOn));
        }
        close();
      } catch (err) {
        errEl.textContent = err.message || String(err);
        errEl.hidden = false;
      }
    });

    return wrap;
  }

  function field(label, hint) {
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
    return { el, input: inputWrap };
  }

  window.MODAL = { show, close, isOpen, openAdd, openEdit };
})();
