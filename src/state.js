// state.js — single in-memory store. Mutators set dirty=true and notify.
// Persistence is the user's job (Save button → persist.exportToDownload).

(() => {
  const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];

  const __STATE__ = {
    meals: [],
    dirty: false,
    weekStart: DATES.weekStartFor(DATES.todayISO(), 'sunday'),
    weekStartsOn: 'sunday',    // 'sunday' | 'monday'
    selectedMealId: null,      // for the detail card
  };
  window.__STATE__ = __STATE__;

  // ---- pub/sub --------------------------------------------------------------
  const subs = new Set();
  function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
  function notify() { for (const fn of subs) { try { fn(__STATE__); } catch (e) { console.error(e); } } }

  // ---- helpers --------------------------------------------------------------
  function genId() {
    const t = Date.now().toString(36).toUpperCase();
    const r = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${t}-${r}`;
  }

  function cleanIngredients(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(s => String(s ?? '').trim()).filter(Boolean);
  }

  function validateMeal(m) {
    if (!m || typeof m !== 'object') throw new Error('Meal must be an object.');
    if (typeof m.name !== 'string' || !m.name.trim()) throw new Error('Meal name is required.');
    if (!DATES.isValidISO(m.day)) throw new Error(`Meal day "${m.day}" is not a valid YYYY-MM-DD date.`);
    if (!MEAL_TYPES.includes(m.mealType)) throw new Error(`Meal type "${m.mealType}" must be one of: ${MEAL_TYPES.join(', ')}.`);
  }

  // Coerce a raw object (from JSON import) into a valid meal record.
  // Generates an id if missing. Throws on irreparable data.
  function coerceMeal(raw) {
    const meal = {
      id:          (typeof raw?.id === 'string' && raw.id.trim()) ? raw.id.trim() : genId(),
      name:        String(raw?.name ?? '').trim(),
      ingredients: cleanIngredients(raw?.ingredients),
      day:         String(raw?.day ?? '').trim(),
      mealType:    String(raw?.mealType ?? '').trim().toLowerCase(),
    };
    validateMeal(meal);
    return meal;
  }

  // ---- mutators -------------------------------------------------------------
  function addMeal(input) {
    const meal = coerceMeal({ ...input, id: undefined }); // always assign new id
    __STATE__.meals.push(meal);
    __STATE__.dirty = true;
    notify();
    return meal;
  }

  function updateMeal(id, patch) {
    const i = __STATE__.meals.findIndex(m => m.id === id);
    if (i < 0) throw new Error(`updateMeal: no meal with id ${id}`);
    const next = { ...__STATE__.meals[i], ...patch };
    if ('ingredients' in patch) next.ingredients = cleanIngredients(patch.ingredients);
    if ('name' in patch) next.name = String(patch.name).trim();
    if ('mealType' in patch) next.mealType = String(patch.mealType).trim().toLowerCase();
    if ('day' in patch) next.day = String(patch.day).trim();
    validateMeal(next);
    __STATE__.meals[i] = next;
    __STATE__.dirty = true;
    notify();
    return next;
  }

  function deleteMeal(id) {
    const i = __STATE__.meals.findIndex(m => m.id === id);
    if (i < 0) return false;
    __STATE__.meals.splice(i, 1);
    if (__STATE__.selectedMealId === id) __STATE__.selectedMealId = null;
    __STATE__.dirty = true;
    notify();
    return true;
  }

  function moveMeal(id, day, mealType) {
    return updateMeal(id, { day, mealType });
  }

  // ---- bulk + view setters --------------------------------------------------
  function replaceAllMeals(meals) {
    __STATE__.meals = meals.map(coerceMeal);
    __STATE__.dirty = false;
    notify();
  }

  function setWeekStart(iso) {
    if (!DATES.isValidISO(iso)) throw new Error(`setWeekStart: bad ISO "${iso}"`);
    __STATE__.weekStart = iso;
    notify();
  }

  function shiftWeek(deltaWeeks) {
    setWeekStart(DATES.addDaysISO(__STATE__.weekStart, deltaWeeks * 7));
  }

  function goToToday() {
    setWeekStart(DATES.weekStartFor(DATES.todayISO(), __STATE__.weekStartsOn));
  }

  function setWeekStartsOn(value) {
    if (value !== 'sunday' && value !== 'monday') throw new Error(`setWeekStartsOn: invalid "${value}"`);
    __STATE__.weekStartsOn = value;
    // Realign the visible week: take a midweek date and recompute its week start.
    const midweek = __STATE__.weekStart ? DATES.addDaysISO(__STATE__.weekStart, 3) : DATES.todayISO();
    __STATE__.weekStart = DATES.weekStartFor(midweek, value);
    notify();
  }

  function setSelectedMeal(id) {
    __STATE__.selectedMealId = id;
    notify();
  }

  function getMealsForDay(iso) {
    return __STATE__.meals.filter(m => m.day === iso);
  }

  function findMealById(id) {
    return __STATE__.meals.find(m => m.id === id) || null;
  }

  // expose
  window.STORE = {
    subscribe, notify,
    addMeal, updateMeal, deleteMeal, moveMeal,
    replaceAllMeals,
    setWeekStart, shiftWeek, goToToday, setWeekStartsOn,
    setSelectedMeal, getMealsForDay, findMealById,
    coerceMeal, validateMeal,
    MEAL_TYPES,
  };
})();
