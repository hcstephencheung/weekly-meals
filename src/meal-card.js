// meal-card.js — chip (small) + detail card (modal contents).

(() => {
  const TYPE_LABEL = {
    breakfast: 'Breakfast',
    lunch:     'Luncheon',
    dinner:    'Supper',
  };

  function renderChip(meal) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `chip chip--${meal.mealType}`;
    el.dataset.mealId = meal.id;
    el.setAttribute('aria-label', `${meal.name}, ${TYPE_LABEL[meal.mealType]}`);

    const name = document.createElement('span');
    name.className = 'chip__name';
    name.textContent = meal.name;

    el.append(name);
    return el;
  }

  function renderDetail(meal) {
    const wrap = document.createElement('article');
    wrap.className = `detail detail--${meal.mealType}`;

    // header
    const kicker = document.createElement('p');
    kicker.className = 'detail__kicker';
    kicker.textContent = `${TYPE_LABEL[meal.mealType]}  ·  ${DATES.longDow(meal.day)}, ${DATES.monthDayLabel(meal.day)}`;

    const h = document.createElement('h2');
    h.className = 'detail__name';
    h.textContent = meal.name;

    // ingredients
    const list = document.createElement('ul');
    list.className = 'detail__list';
    if (meal.ingredients.length === 0) {
      const li = document.createElement('li');
      li.className = 'detail__list-empty';
      li.innerHTML = '<em>No ingredients listed.</em>';
      list.append(li);
    } else {
      for (const ing of meal.ingredients) {
        const li = document.createElement('li');
        li.textContent = ing;
        list.append(li);
      }
    }

    // actions
    const actions = document.createElement('div');
    actions.className = 'detail__actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn--add';
    editBtn.innerHTML = '<span class="btn__glyph">✎</span> Edit Meal';
    editBtn.addEventListener('click', () => {
      if (window.MODAL?.openEdit) MODAL.openEdit(meal);
      else alert('Edit modal arrives in the next phase.');
    });

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn btn--ghost';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => MODAL.close());

    actions.append(editBtn, closeBtn);

    wrap.append(kicker, h, list, actions);
    return wrap;
  }

  window.MEAL_CARD = { renderChip, renderDetail, TYPE_LABEL };
})();
