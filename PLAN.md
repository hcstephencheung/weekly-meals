# Plan: Weekly Meals — Implementation

Implementation plan for the spec in `SPEC.md`. Ordered by dependency. Each phase ends in a runnable, demonstrable state — no half-finished merges.

---

## Architecture at a Glance

```
   data/meals.json  ─┐                    ┌─►  meals.json (download)
                     │                    │
                     ▼                    │
                ┌─────────────────────────┴────┐
                │  persist.js   (import/export)│
                └────────────┬─────────────────┘
                             │
                  ┌──────────▼──────────┐
                  │  state.js           │   ← single source of truth
                  │   __STATE__.meals   │     pure mutators + dirty flag
                  │   subscribers       │
                  └──────────┬──────────┘
                             │ on change → notify
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
   calendar.js         ingredients.js     modal.js
   (week grid +        (aggregation        (add / edit
    meal cards)         panel)              delete form)
            │
            ▼
        drag.js
        (Pointer Events; calls state.moveMeal)
```

`main.js` wires everything together; `dates.js` provides ISO-date helpers used by `state`, `calendar`, and `ingredients`.

---

## Implementation Phases

### Phase A — Skeleton & Aesthetic Shell (no behavior)
**Goal:** open `index.html` on a phone and see the masthead, week navigation, empty 7-day grid, and ingredients panel placeholder. Editorial cream + light-blue look in place. No data flow, no JS state.

Deliverables:
- `index.html` with masthead, weekday header row, 7 day columns × 3 meal-type rows (or stacked on mobile), Save button + dirty indicator, Import/Export buttons, empty Weekly Ingredients aside.
- `styles.css` with palette, fonts, dotted rules, mobile-first layout (390px viewport baseline → desktop).
- `<script defer>` tags for all `src/*.js` files in correct order (even if files are stubs).

Verify: open on iPhone Safari → renders cleanly, scrolls, no overflow, no console errors.

---

### Phase B — State + Persistence Foundations
**Goal:** the app can import a file, render its contents (after Phase C), and export the in-memory state back out. Pure logic; testable by hand in the console.

Sequential within phase:

1. **`src/dates.js`** — pure helpers: `parseISO`, `formatISO`, `addDaysISO`, `weekStartFor(dateISO, weekStartsOn)`, `daysOfWeek(weekStartISO)` → 7 ISO dates, `dayOfWeekLabel(dateISO)`.
2. **`src/state.js`** — `__STATE__ = { meals: [], dirty: false, weekStart: <todayWeekStart>, weekStartsOn: 'sunday' }`. Pub/sub: `subscribe(fn)` / `notify()`. Mutators: `addMeal`, `updateMeal(id, patch)`, `deleteMeal(id)`, `moveMeal(id, day, mealType)`. Each mutator validates, sets `dirty = true`, calls `notify()`. ID generation: timestamp + 4-char random suffix.
3. **`src/persist.js`** — `importFromFile(file)` reads via `FileReader`, validates schema, replaces `__STATE__.meals`, sets `dirty = false`. `exportToDownload()` builds a `Blob`, triggers `<a download="meals.json">` click, sets `dirty = false`. Validation rejects malformed JSON with a user-visible error.

Verify: in console, `__STATE__.addMeal({...})`, `dirty` becomes true, `exportToDownload()` downloads correct JSON. Import the downloaded file — round-trips identically.

---

### Phase C — Calendar Render (read-only)
**Goal:** state is reflected in the DOM. Mutating state in console re-renders the grid.

- **`src/meal-card.js`** — `renderMealCardSmall(meal)` (the chip on the calendar) and `renderMealCardDetail(meal)` (the click-through view).
- **`src/calendar.js`** — `renderCalendar(mountEl)`: reads `__STATE__.meals` + `__STATE__.weekStart` + `__STATE__.weekStartsOn`, builds 7 day columns × 3 meal-type rows, places small cards. Subscribes to state.
- Week navigation: prev/next buttons mutate `__STATE__.weekStart`, "Today" button resets it, week-starts-on toggle (Sun/Mon) updates `weekStartsOn` and re-derives `weekStart`.

Verify: import a sample `meals.json`, see meals on correct day/slot. Use prev/next to scroll weeks. Toggle Sun/Mon, columns reorder.

---

### Phase D — Add / Edit / Delete Modal
**Goal:** all mutations possible through the UI. The bottom-sheet bottom-sheet modal slides up; form validates; cancel discards; save mutates state.

- **`src/modal.js`** — single modal element reused for both Add and Edit. Public API: `openAdd(prefill?)`, `openEdit(meal)`, `close()`. Form fields: name (text), ingredients (textarea, one per line OR comma-separated — pick one and document), day (date picker), mealType (segmented control). In Edit mode, also shows a destructive **Delete** button with confirm.
- Tapping a small meal card on the calendar → opens detail view (Phase C); detail view's **Edit** button → `openEdit(meal)`.
- Add button (FAB-style, bottom-right or in toolbar) → `openAdd({ day: visibleWeek's today, mealType: 'lunch' })`.

Verify: add → save → meal appears, dirty indicator on. Edit → change day → save → meal moves. Delete → confirm → meal gone, dirty indicator on.

---

### Phase E — Drag-and-Drop
**Goal:** drag any meal chip onto another day/meal-type slot.

- **`src/drag.js`** — Pointer Events (`pointerdown` → start timer for long-press → `pointerdown`+250ms still down → enter drag mode → follow `pointermove` → on `pointerup`, hit-test against drop slots → call `state.moveMeal`). Lift visual: scale 1.04, shadow, ~1° rotation. Drop targets light up via a CSS class on hover.
- Cancel drag if pointer leaves window or `pointercancel` fires.
- Desktop fallback: same Pointer Events code path covers mouse.

Verify: on iPhone Safari, long-press a meal, drag to a different slot, drop. Confirm `__STATE__.meals` updated, dirty indicator on, calendar re-rendered. Cross-week drag NOT supported in v1 (drop outside grid = no-op + spring back animation).

---

### Phase F — Weekly Ingredients Aggregation
**Goal:** the side panel shows a deduped, sorted list of ingredients across the visible week.

- **`src/ingredients.js`** — `aggregateWeeklyIngredients(meals, weekStart, weekStartsOn)` (pure), `renderWeeklyIngredients(mountEl)` (subscribes to state). Trim + lowercase for dedupe, render in original case from first occurrence.

Verify: add meals across the week with overlapping ingredients → list dedupes. Move a meal in/out of the visible week → list updates.

---

### Phase G — Save Flow & Polish
**Goal:** the dirty/Save UX feels right; the page is mobile-quality.

- Dirty indicator: small pulsing blue dot next to the Save button while `__STATE__.dirty === true`.
- Save button: disabled when not dirty; on click → `persist.exportToDownload()` → indicator clears.
- First-load UX: empty `__STATE__.meals` → render an inviting empty state with **Import meals.json** (primary) + **Start fresh** (secondary).
- Mobile QA pass: tap targets ≥ 44pt, modal can be dismissed by drag-down or backdrop tap, no horizontal scroll, font sizes readable at iPhone scale.
- Motion polish: modal slide-up easing, drag lift, dirty pulse. Restrained.

Verify: full Acceptance Criteria checklist in `SPEC.md` passes on a real iPhone (or simulator).

---

## What Can Be Parallel

Within a phase, work is sequential. **Across phases**, after Phase B is done:

- Phase D (modal) and Phase F (ingredients panel) are independent — both depend only on state + calendar render. Could be built in parallel.
- Phase E (drag) depends on Phase D's drop targets being concrete (it reuses the calendar's slot DOM).

In a single-developer / single-agent workflow, doing them in the listed order is fine and simpler. Don't optimize for parallelism here.

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| iOS Safari HTML5 drag-and-drop is broken | High | Already chosen Pointer Events. Test Phase E on a real device, not just desktop. |
| `<input type="file">` UX on iOS is confusing (Files app picker) | Medium | Add a one-line instruction near the import button. Test early in Phase B. |
| Download triggers a save sheet on every Save click | Low | Acceptable — the user controls when to Save. Documented in spec. |
| `file://` + `<script defer>` loading order surprises | Low | Use `defer` consistently and load all scripts from root-relative paths. Test Phase A on `file://` directly, not via dev server. |
| Date math drifts across DST or timezones | Medium | Pure ISO-string arithmetic (`addDaysISO` adds days as strings, never via `Date`). No `getTimezoneOffset` anywhere. |
| Modal keyboard interactions on iOS push viewport | Medium | Use `position: fixed` with `100dvh`, scroll modal content not the body. Test in Phase D. |
| Ingredients with trailing whitespace or punctuation create dupes | Low | Normalize: `trim`, lowercase, collapse internal whitespace. Document. |
| Sample `meals.json` has bad data and breaks first-load | Low | `persist.importFromFile` validates strictly and rejects with a visible error rather than partial-loading. |

---

## Verification Checkpoints (between phases)

- ✅ **After A:** loads on iPhone Safari, no console errors, layout looks right at 390×844.
- ✅ **After B:** `__STATE__` mutators work in console, export downloads valid JSON, import round-trips.
- ✅ **After C:** meals render at correct day/slot; week nav and Sun/Mon toggle work.
- ✅ **After D:** add/edit/delete work end-to-end via the modal.
- ✅ **After E:** drag works on a real iPhone, not just desktop.
- ✅ **After F:** weekly ingredients aggregate and dedupe correctly.
- ✅ **After G:** the SPEC.md Acceptance Criteria checklist passes.

Each checkpoint = a stoppable, demoable state. If we ship after any checkpoint past D, the app is genuinely usable (drag and ingredients are quality-of-life on top of a working CRUD planner).

---

## Out of Scope for This Plan

Anything in `SPEC.md` "Out of Scope (v2+)": shopping list, quantities, recipes, multi-user, sync, undo/redo, search.
