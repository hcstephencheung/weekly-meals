// calendar.js — renders the 7-day week grid from __STATE__.

(() => {
  const SLOT_ORDER = ['breakfast', 'lunch', 'dinner'];
  const NUMERALS   = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  function render() {
    const grid = document.querySelector('[data-week-grid]');
    if (!grid || !__STATE__.weekStart) return;
    grid.innerHTML = '';

    const today = DATES.todayISO();
    const days = DATES.daysOfWeek(__STATE__.weekStart);

    days.forEach((iso, idx) => {
      const dayEl = renderDay(iso, idx, today);
      grid.append(dayEl);
    });
  }

  function renderDay(iso, idx, today) {
    const article = document.createElement('article');
    article.className = 'day';
    if (iso === today) article.classList.add('is-today');
    article.dataset.day = iso;

    const head = document.createElement('header');
    head.className = 'day__head';
    const name = document.createElement('h3');
    name.className = 'day__name';
    name.textContent = DATES.longDow(iso);
    const date = document.createElement('span');
    date.className = 'day__date';
    date.textContent = DATES.monthDayLabel(iso);
    head.append(name, date);
    article.append(head);

    for (const type of SLOT_ORDER) {
      article.append(renderSlot(iso, type));
    }
    return article;
  }

  function renderSlot(iso, mealType) {
    const slot = document.createElement('section');
    slot.className = `slot slot--${mealType}`;
    slot.dataset.day = iso;
    slot.dataset.mealType = mealType;

    const label = document.createElement('span');
    label.className = 'slot__label';
    label.textContent = MEAL_CARD.TYPE_LABEL[mealType];

    const body = document.createElement('div');
    body.className = 'slot__body';

    const meals = __STATE__.meals.filter(m => m.day === iso && m.mealType === mealType);
    if (meals.length === 0) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'slot__add';
      addBtn.setAttribute('aria-label', `Add ${MEAL_CARD.TYPE_LABEL[mealType]} on ${DATES.longDow(iso)}`);
      addBtn.innerHTML = '<span class="slot__add-plus" aria-hidden="true">+</span><span class="slot__add-label">add</span>';
      addBtn.addEventListener('click', () => MODAL.openAdd({ day: iso, mealType }));
      body.append(addBtn);
    } else {
      for (const m of meals) {
        const chip = MEAL_CARD.renderChip(m);
        chip.addEventListener('click', () => openDetail(m.id));
        body.append(chip);
      }
    }

    slot.append(label, body);
    return slot;
  }

  function openDetail(id) {
    const meal = STORE.findMealById(id);
    if (!meal) return;
    STORE.setSelectedMeal(id);
    MODAL.show(MEAL_CARD.renderDetail(meal), {
      onClose: () => STORE.setSelectedMeal(null),
    });
  }

  // Subscribe; wait until DOM ready before first paint.
  document.addEventListener('DOMContentLoaded', () => {
    STORE.subscribe(render);
    render();
  });

  window.CALENDAR = { render };
})();
