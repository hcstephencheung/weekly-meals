// ingredients.js — aggregate every ingredient from the visible week.
// Dedupe is case-insensitive on a trimmed/normalized key; the original
// casing of the first occurrence is what gets displayed.

(() => {
  function aggregateWeeklyIngredients(meals, weekStart) {
    if (!weekStart) return [];
    const start = weekStart;
    const end   = DATES.addDaysISO(weekStart, 6);
    const seen  = new Map();    // key (normalized) → display string

    for (const meal of meals) {
      if (meal.day < start || meal.day > end) continue;
      for (const raw of meal.ingredients) {
        const display = String(raw).trim();
        if (!display) continue;
        const key = display.toLowerCase().replace(/\s+/g, ' ');
        if (!seen.has(key)) seen.set(key, display);
      }
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  function render() {
    const mount = document.querySelector('[data-ingredients]');
    if (!mount) return;
    const list = aggregateWeeklyIngredients(__STATE__.meals, __STATE__.weekStart);
    mount.replaceChildren();

    if (list.length === 0) {
      const li = document.createElement('li');
      li.className = 'ledger__empty';
      li.innerHTML = '<em>No ingredients on this week yet.</em>';
      mount.append(li);
      return;
    }

    for (const name of list) {
      const li = document.createElement('li');
      li.textContent = name;
      mount.append(li);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    STORE.subscribe(render);
    render();
  });

  window.INGREDIENTS = { aggregateWeeklyIngredients, render };
})();
