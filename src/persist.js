// persist.js — JSON file I/O.
// Import: read a user-picked file and replace state.
// Export: serialize state and trigger a download of meals.json.

(() => {
  function exportToDownload() {
    const json = JSON.stringify(__STATE__.meals, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'meals.json';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    __STATE__.dirty = false;
    STORE.notify();
  }

  function importFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) { reject(new Error('No file selected.')); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read the file.'));
      reader.onload = () => {
        let parsed;
        try { parsed = JSON.parse(reader.result); }
        catch (e) { reject(new Error('That file is not valid JSON.')); return; }
        if (!Array.isArray(parsed)) {
          reject(new Error('Expected a JSON array of meals.'));
          return;
        }
        try {
          STORE.replaceAllMeals(parsed);
          // Jump to the week of the earliest upcoming meal so the import is
          // visible on screen. Falls back to the most recent meal if all are
          // in the past.
          const today = DATES.todayISO();
          const sorted = [...__STATE__.meals].sort((a, b) => a.day.localeCompare(b.day));
          const target = sorted.find(m => m.day >= today) || sorted[sorted.length - 1];
          if (target) {
            STORE.setWeekStart(DATES.weekStartFor(target.day, __STATE__.weekStartsOn));
          }
          resolve(parsed.length);
        } catch (e) {
          reject(new Error(`Import failed: ${e.message}`));
        }
      };
      reader.readAsText(file);
    });
  }

  window.PERSIST = { exportToDownload, importFromFile };
})();
