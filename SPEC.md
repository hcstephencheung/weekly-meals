# Spec: Weekly Meals

A static, mobile-first weekly meal planner. Single-user, no backend, no build step. Persistence is by exporting/importing a JSON file kept in a shared cloud folder (e.g. iCloud Drive).

---

## Objective

Help one cook plan a week of meals on a phone. The user opens `index.html` locally, sees a calendar of the current week, taps to add/edit/delete meals, drags meals to move them between days or meal slots, and reviews the aggregated weekly ingredient list. All edits happen in memory; on every change the app prompts a download of the updated `meals.json` so the user replaces the file in their cloud folder.

**Primary user.** A single home cook on an iPhone, opening the file from the iCloud Drive Files app.

**Acceptance criteria — v1 is "done" when:**
- Opening `index.html` on iPhone Safari renders a usable weekly calendar (Mon–Sun) with no console errors.
- The user can import a `meals.json` file via a file picker on first load.
- The user can add a meal via a bottom-sheet modal with fields: name, ingredients, day, meal type.
- The user can tap a meal to view it as a card, and tap "Edit" to reopen the modal pre-filled.
- The user can delete a meal from the edit modal.
- The user can drag a meal onto another day/slot and the data updates accordingly (touch + mouse).
- A "Weekly Ingredients" panel aggregates all unique ingredients across the visible week.
- Mutations stay in memory and mark state as dirty. An "unsaved changes" indicator is visible while dirty. A manual **Save** button downloads an updated `meals.json` and clears the indicator.
- The user can choose which day the week starts on (Sunday or Monday), defaulting to Sunday.
- The whole experience is laid out for a 390×844 viewport (iPhone 14) and degrades gracefully to desktop.

---

## Tech Stack

- **HTML/CSS/JS, vanilla, no build step, no bundler, no framework.**
- No `localStorage`, no `IndexedDB`, no backend.
- Persistence: JSON file (`meals.json`) read via `<input type="file">` on import, written via `Blob` + `<a download>` on export.
- Drag-and-drop: HTML5 Drag and Drop API for desktop, **Pointer Events** with manual hit-testing for touch (HTML5 DnD is unreliable on iOS Safari).
- Fonts: Google Fonts (Fraunces, Newsreader, optional DM Mono / Caveat). Hosted via `<link>` — acceptable for a personal-use static page on a phone with internet.
- Target browsers: iOS Safari 16+, modern Chrome/Safari/Firefox on desktop.

---

## Commands

No build, no package manager. Development is "open the file."

```
# Develop / use
open index.html                       # macOS — opens in default browser

# Optional: serve locally so you can test in a real network context
python3 -m http.server 8000           # then visit http://localhost:8000

# No tests, no lint, no build in v1.
```

If a linter/formatter is added later, document the command here.

---

## Project Structure

```
weekly-meals/
├── index.html                  # Single-page entry. Loads CSS, then JS.
├── styles.css                  # All styles. No preprocessor.
├── src/
│   ├── state.js                # In-memory store, mutators, "dirty" flag, export/import
│   ├── calendar.js             # Week navigation, render the 7-day grid
│   ├── meal-card.js            # Render meal card / detail view
│   ├── modal.js                # Bottom-sheet modal: add/edit/delete
│   ├── drag.js                 # Pointer-events drag-and-drop (touch + mouse)
│   ├── ingredients.js          # Weekly ingredients aggregation + render
│   ├── persist.js              # Import (file picker) + export (download blob)
│   └── main.js                 # Wire everything together on DOMContentLoaded
├── data/
│   └── meals.json              # Sample / seed data. Real data lives wherever the user puts it.
├── SPEC.md
├── README.md
└── .claude/                    # tooling — ignored
```

JS files are loaded as `<script defer>` in dependency order in `index.html`. No modules (`type="module"` requires a server for `file://` on some setups).

---

## Data Model

`meals.json` is an array of meal objects.

```json
[
  {
    "id": "01HW6Z8K5T-3F7Q",
    "name": "Chicken Noodle Soup",
    "ingredients": ["egg noodles", "chicken breast", "carrot", "celery", "thyme"],
    "day": "2026-04-30",
    "mealType": "lunch"
  }
]
```

**Field rules:**
- `id` — string, unique. Generated client-side (timestamp + random suffix). Required for edit/move/delete.
- `name` — string, required, non-empty after trim.
- `ingredients` — string[]. May be empty. Trimmed, lowercased for aggregation but stored as the user typed them.
- `day` — ISO date string `YYYY-MM-DD` (no time, no timezone). Day-of-week is derived.
- `mealType` — one of `"breakfast" | "lunch" | "dinner"`.

**Why `YYYY-MM-DD` rather than a `Date` object:** JSON has no native `Date`. ISO date strings parse trivially, sort lexicographically, and avoid all timezone hazards for a calendar.

**Globals exposed by the in-memory store:**
- `__STATE__.meals` — array of meal objects above.
- `__STATE__.dirty` — boolean, `true` between a mutation and the user accepting the download.
- `__STATE__.weekStart` — `YYYY-MM-DD` of the visible week's Monday.

Mutators (`addMeal`, `updateMeal`, `deleteMeal`, `moveMeal`) all set `dirty = true` and re-render the affected views. They do **not** trigger a download. The user clicks **Save** to call `persist.export()`, which downloads `meals.json` and sets `dirty = false`.

**User preferences (in-memory only, not persisted to `meals.json`):**
- `__STATE__.weekStartsOn` — `"sunday" | "monday"`. Defaults to `"sunday"`. Toggle exposed in the UI; resets to default on reload.

---

## Code Style

Plain ES2022 in browser. No transpiling, no JSX. Prefer pure functions; pass state in, return new state or DOM nodes out. Keep files under ~200 lines.

```js
// src/ingredients.js — example of style
//
// Pure helper: given meals + a week range, return a sorted, deduped list.

function aggregateWeeklyIngredients(meals, weekStart) {
  const start = weekStart;                            // "2026-04-27"
  const end   = addDaysISO(weekStart, 6);             // "2026-05-03"
  const seen  = new Set();

  for (const meal of meals) {
    if (meal.day < start || meal.day > end) continue;
    for (const raw of meal.ingredients) {
      const key = raw.trim().toLowerCase();
      if (key) seen.add(key);
    }
  }
  return [...seen].sort();
}

function renderWeeklyIngredients(meals, weekStart, mountEl) {
  const list = aggregateWeeklyIngredients(meals, weekStart);
  mountEl.replaceChildren(
    ...list.map(name => {
      const li = document.createElement('li');
      li.className = 'ingredient';
      li.textContent = name;
      return li;
    }),
  );
}
```

**Conventions:**
- File names: `kebab-case.js`. Function names: `camelCase`. Constants exposed globally: `SCREAMING_SNAKE_CASE` with `__` prefix where it represents shared state.
- 2-space indent. Single quotes for strings. Trailing commas on multi-line.
- No comments restating what the code does. A short `// Why:` comment is fine when the *reason* is non-obvious.
- DOM building: `document.createElement` + `replaceChildren`. No template strings injected via `innerHTML` for user data.
- No third-party JS dependencies in v1.

---

## Aesthetic

**Editorial bistro broadsheet, modernized; cream paper with light-blue pastel accents.**

- **Palette:** cream paper `#F6EFE2`, ink `#1F2A38`, dusty light-blue accent `#A9C3D8`, secondary blue `#7FA1BA`, soft rose `#E8C9C0` for dinner, sage `#C8D6BF` for breakfast (meal-type pills only). All pastel, never saturated.
- **Type:** Fraunces (display, italic for accents) + Newsreader (body) + DM Mono (times, dates) + Caveat (chef's annotations, sparingly).
- **Layout:** masthead, dotted-rule dividers, small-caps day labels, section numerals (I–VII).
- **Modal:** bottom sheet with rounded top corners, slides up with a soft easing curve, dims the page behind.
- **Motion:** restrained. Modal slide-up, drag lift (slight rotate + shadow), and a subtle "unsaved" pulse on the save indicator. No scroll-triggered fluff.

---

## Testing Strategy

**No automated tests in v1.** Manual checklist before declaring v1 done:

- [ ] iPhone Safari (real device or simulator): import a sample `meals.json`, add a meal, edit, delete, drag across days, drag across meal-types.
- [ ] Add a meal with no ingredients — accepted, counts toward week.
- [ ] Navigate prev/next week — meals on those weeks render; weekly ingredients recompute.
- [ ] Reload the page — empty state is shown; importing the most recent `meals.json` restores the data.
- [ ] Trigger 5 changes in a row — no downloads happen, indicator stays "unsaved", clicking Save once writes a single up-to-date file and clears the indicator.
- [ ] Run on desktop Chrome and Safari — drag-and-drop with mouse works.
- [ ] No console errors at any point.

If the project grows past v1, add Vitest or `node --test` for pure helpers in `src/state.js`, `src/ingredients.js`, and a date-helpers module.

---

## Boundaries

**Always:**
- Keep edits in memory; downloads only happen when the user clicks Save. Show an "unsaved changes" indicator while dirty.
- Treat `meals.json` as the only source of truth; never silently inject data the user didn't import.
- Keep `index.html` openable as a plain `file://` page on mobile.
- Generate a unique `id` for every new meal.
- Build DOM from data — never `innerHTML` user-supplied strings.

**Ask first:**
- Adding any third-party JS/CSS dependency.
- Adding a build step, bundler, or `type="module"`.
- Adding a second JSON file (e.g., `recipes.json`, `pantry.json`) — design implication.
- Storing anything in `localStorage` / `IndexedDB` even as a cache.
- Auth, sync, or any networked persistence.
- Changing the data model (field names, types, ID scheme).

**Never:**
- Use a framework (React, Vue, Svelte, Astro, etc.).
- Use a CSS preprocessor or PostCSS.
- Commit a `meals.json` containing real personal data — only sample data goes in `data/`.
- Edit files under `.claude/`.

---

## Success Criteria

A first-time user, on an iPhone, can:

1. Open `index.html` from iCloud Drive.
2. Tap **Import** and pick `meals.json`.
3. See the current week with their meals laid out by day and meal type.
4. Tap **+** to add a meal — modal slides up, fields fill, the meal appears on the right day/slot, and the "unsaved changes" indicator appears.
5. Tap a meal → see the card → tap **Edit** → change the day → save the form → the meal moves; indicator stays "unsaved".
6. Long-press a meal and drag it to Tuesday's dinner slot — it lands there.
7. See the **Weekly Ingredients** panel update as meals change.
8. Tap the global **Save** button once — `meals.json` downloads, indicator clears.

All of the above with no console errors and acceptable performance (sub-100ms interaction feedback) on an iPhone 12-class device.

---

## Resolved Decisions

- **Week starts Sunday by default**, user-toggleable to Monday. Preference is in-memory only (not persisted to `meals.json`); resets on reload.
- **First-load UX:** no file imported → show an empty week with a prominent **Import meals.json** CTA and a **Start fresh (skip import)** secondary action.
- **Save cadence:** mutations stay in memory; an "unsaved changes" indicator appears while dirty; user clicks the global **Save** button to download an up-to-date `meals.json`.
- **Ingredient normalization:** trim + lowercase + dedupe for the weekly aggregation; original case preserved on the meal card.
- **Drag-and-drop on touch:** long-press ~250ms to start; lift visual = small scale + soft shadow + ~1° rotation.

## Out of Scope (v2+)

Shopping list (purchase-tracking on top of the weekly ingredient list), quantities/units, recipe library, multi-user, cloud sync, undo/redo, search.
