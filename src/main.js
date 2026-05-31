// main.js — wires DOM controls to state + persistence on DOMContentLoaded.

(() => {
  document.addEventListener('DOMContentLoaded', () => {
    wireToolbar();
    STORE.subscribe(render);
    render(__STATE__);
  });

  // -------------------------------------------------------------------------
  function wireToolbar() {
    document.querySelector('[data-action="prev-week"]')?.addEventListener('click', () => STORE.shiftWeek(-1));
    document.querySelector('[data-action="next-week"]')?.addEventListener('click', () => STORE.shiftWeek(+1));
    document.querySelector('[data-action="today"]')?.addEventListener('click', () => STORE.goToToday());

    for (const btn of document.querySelectorAll('[data-week-start]')) {
      btn.addEventListener('click', () => STORE.setWeekStartsOn(btn.dataset.weekStart));
    }

    const importInput = document.getElementById('import-input');
    importInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const n = await PERSIST.importFromFile(file);
        flash(`Imported ${n} meal${n === 1 ? '' : 's'}.`);
      } catch (err) {
        alert(err.message || 'Import failed.');
      } finally {
        e.target.value = ''; // allow re-import of same filename
      }
    });

    document.querySelector('[data-action="save"]')?.addEventListener('click', () => {
      PERSIST.exportToDownload();
      flash('Saved meals.json — replace it in your iCloud folder.');
    });

    document.querySelector('[data-action="add-meal"]')?.addEventListener('click', () => {
      MODAL.openAdd();
    });

    document.querySelector('[data-action="paste-plan"]')?.addEventListener('click', () => {
      PLAN_IMPORT.open();
    });

    document.querySelector('[data-action="start-fresh"]')?.addEventListener('click', () => {
      heroDismissed = true;
      render(__STATE__);
    });
  }

  let heroDismissed = false;

  // -------------------------------------------------------------------------
  function render(state) {
    // masthead
    const label = document.querySelector('[data-week-label]');
    if (label && state.weekStart) {
      label.textContent = `Week of ${DATES.weekRangeLabel(state.weekStart)}`;
    }

    // Sun/Mon toggle active state
    for (const btn of document.querySelectorAll('[data-week-start]')) {
      const active = btn.dataset.weekStart === state.weekStartsOn;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', String(active));
    }

    // Save button + status banner
    const saveBtn = document.querySelector('[data-action="save"]');
    if (saveBtn) {
      saveBtn.disabled = !state.dirty;
      saveBtn.classList.toggle('is-dirty', state.dirty);
    }
    const status = document.querySelector('[data-status]');
    if (status) status.hidden = !state.dirty;

    // Empty-state hero — shown when nothing is loaded and the user hasn't
    // dismissed it. Once dismissed (or once a meal exists) it stays hidden.
    const hero = document.querySelector('[data-hero]');
    if (hero) hero.hidden = heroDismissed || state.meals.length > 0;
  }

  // -------------------------------------------------------------------------
  // Tiny ephemeral status line — replaces the "saved!" / "imported!" alerts.
  function flash(msg) {
    let el = document.querySelector('[data-flash]');
    if (!el) {
      el = document.createElement('div');
      el.dataset.flash = '';
      el.style.cssText = `
        position: fixed; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
        transform: translateX(-50%);
        background: #1F2A38; color: #F6EFE2;
        font: 500 13px/1.4 'DM Mono', ui-monospace, Menlo, monospace;
        letter-spacing: 0.06em;
        padding: 10px 14px; border-radius: 999px;
        box-shadow: 0 12px 28px -10px rgba(0,0,0,0.4);
        z-index: 1500; opacity: 0;
        transition: opacity 220ms ease, transform 220ms ease;
        max-width: calc(100vw - 32px); text-align: center;
      `;
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateX(-50%) translateY(-4px)';
    });
    clearTimeout(flash._t);
    flash._t = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(0)';
    }, 2400);
  }
})();
