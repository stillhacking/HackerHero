/**
 * @fileoverview HackerHero — Thin orchestrator
 *
 * Imports core infrastructure and all panel modules, wires routing
 * callbacks, and runs the init() bootstrap.
 *
 * @module app
 */

// ── Core infrastructure ────────────────────────────────────────────────────
import {
  State, DB, UI, ThemeManager,
  showPanel, setPanelRouter, setSkipHistoryPush,
  enableMissionNav, bindModalButtons, Lightbox, TZClock,
  setOnImportDone,
  getRandomCreatureName, logChange, now, qs, qsa,
} from './core.js?v=20260407g';

// ── Panel modules ──────────────────────────────────────────────────────────
import { MissionsPanel }  from './panel-missions.js?v=20260407g';
import { OverviewPanel }  from './panel-overview.js?v=20260407g';
import { AssetsPanel, setTicketsPanelRef } from './panel-assets.js?v=20260407g';
import { SearchPanel }    from './panel-search.js?v=20260407g';
import { ChangelogPanel } from './panel-changelog.js?v=20260407g';
import { TicketsPanel }   from './panel-tickets.js?v=20260407g';
import { SettingsPanel }  from './panel-settings.js?v=20260407g';
import { DocsPanel }      from './panel-docs.js?v=20260407g';

// ── Wire cross-module references ───────────────────────────────────────────
// AssetsPanel needs TicketsPanel for creating tickets from asset/zone detail.
// This avoids a hard circular import — the reference is set once at startup.
setTicketsPanelRef(TicketsPanel);

// After import completes, refresh missions list.
setOnImportDone(() => MissionsPanel.render());

// ── Panel router ───────────────────────────────────────────────────────────
setPanelRouter(async (panelId) => {
  switch (panelId) {
    case 'missions':  await MissionsPanel.render();  break;
    case 'overview':  await OverviewPanel.render();  break;
    case 'assets':    await AssetsPanel.render();    break;
    case 'search':    await SearchPanel.render();    break;
    case 'changelog': await ChangelogPanel.render(); break;
    case 'tickets':   await TicketsPanel.render();   break;
    case 'settings':  await SettingsPanel.render();  break;
    case 'docs':      await DocsPanel.render();      break;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

async function init() {
  try {
    // Load persisted settings
    const [savedName, savedTheme] = await Promise.all([
      DB.getSetting('operatorName'),
      DB.getSetting('theme'),
    ]);

    // Operator name — use saved or generate a random Magic creature name
    State.operatorName = savedName || getRandomCreatureName();
    if (!savedName) await DB.setSetting('operatorName', State.operatorName);
    qs('#header-operator-name').textContent = State.operatorName;

    // Theme
    ThemeManager.apply(savedTheme || 'dark');

    // Bind global navigation
    qsa('.nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        const panel = item.dataset.panel;
        if (!item.classList.contains('mission-only') || item.classList.contains('enabled')) {
          showPanel(panel);
        }
      });
    });

    // Header logo → go back to missions
    qs('#btn-go-home').addEventListener('click', () => showPanel('missions'));

    // Docs button in header
    qs('#btn-open-docs').addEventListener('click', () => showPanel('docs'));

    // Theme select dropdown (header)
    qs('#theme-select').addEventListener('change', (e) => ThemeManager.apply(e.target.value));

    // Operator chip in header
    qs('#operator-chip').addEventListener('click', () => showPanel('settings'));

    // Inline rename: click on operation name in header badge
    qs('#active-mission-name').addEventListener('click', async () => {
      if (!State.activeMission) return;
      const span = qs('#active-mission-name');
      if (span.querySelector('input')) return; // already editing

      const oldName = State.activeMission.codename;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = oldName;
      input.className = 'inline-rename-input';
      span.textContent = '';
      span.appendChild(input);
      input.focus();
      input.select();

      const finish = async (save) => {
        const newName = input.value.trim();
        input.removeEventListener('keydown', onKey);
        input.removeEventListener('blur', onBlur);

        if (save && newName && newName !== oldName) {
          // Prevent duplicate codenames
          const all = await DB.getAllMissions();
          const dup = all.find(m => m.codename.toLowerCase() === newName.toLowerCase() && m.id !== State.activeMission.id);
          if (dup) {
            UI.toast(`An operation named "${dup.codename}" already exists`, 'error');
            span.textContent = oldName;
            return;
          }
          const prev = { ...State.activeMission };
          State.activeMission.codename  = newName;
          State.activeMission.updatedAt = now();
          State.activeMission.updatedBy = State.operatorName;
          await DB.saveMission(State.activeMission);
          await logChange('update', 'mission', State.activeMission.id, newName, `Renamed operation "${oldName}" → "${newName}"`, prev, State.activeMission);
          span.textContent = newName;
          UI.toast('Operation renamed', 'success');
        } else {
          span.textContent = oldName;
        }
      };

      const onKey = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); finish(true); }
        if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      };
      const onBlur = () => finish(true);
      input.addEventListener('keydown', onKey);
      input.addEventListener('blur', onBlur);
    });

    // Modal buttons
    bindModalButtons();

    // Lightbox (image gallery overlay)
    Lightbox.init();

    // Initial panel
    const hashPanel = location.hash?.slice(1);
    const validPanels = ['missions', 'overview', 'assets', 'search', 'changelog', 'tickets', 'settings', 'docs'];
    const missionOnlyPanels = ['overview', 'assets', 'search', 'changelog', 'tickets'];

    // Restore active mission from previous session (survives Ctrl+R refresh)
    const savedMissionId = localStorage.getItem('hh-activeMissionId');
    if (savedMissionId) {
      await MissionsPanel.enterMission(savedMissionId, { silent: true });
    }

    const targetPanel = validPanels.includes(hashPanel) ? hashPanel : 'missions';
    if (missionOnlyPanels.includes(targetPanel) && !State.activeMission) {
      await showPanel('missions');
    } else {
      await showPanel(targetPanel);
    }

    // Handle browser Back / Forward buttons
    window.addEventListener('popstate', async (e) => {
      const panel = e.state?.panel || 'missions';
      setSkipHistoryPush(true);
      await showPanel(panel);
      setSkipHistoryPush(false);
    });

    console.info('[HackerHero] Initialized. Operator:', State.operatorName);
    console.log('%c ███ HackerHero ███', 'color:#7c3aed;font-weight:bold;font-size:14px;font-family:monospace;background:#0d0d0d;padding:4px 10px;border-radius:4px');
    console.log('%cPowered by Meskal  —  hello, curious mind 👋', 'color:#a78bfa;font-family:monospace;font-size:11px');
  } catch (err) {
    console.error('[HackerHero] Initialization error:', err);
    const safeMsg = (err.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    document.body.innerHTML = `<div style="color:#f85149;font-family:monospace;padding:40px">
      <h2>HackerHero failed to start</h2>
      <p style="margin-top:10px">${safeMsg}</p>
      <p style="margin-top:8px;opacity:.6">Make sure you are serving this app via HTTP (e.g. python3 -m http.server 8080)</p>
    </div>`;
  }
}

// Bootstrap
init();
