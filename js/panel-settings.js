/**
 * @fileoverview SettingsPanel — operator identity, themes, data management
 * @module panel-settings
 */

import {
  State, DB, UI, ThemeManager, ImportExport,
  showPanel, enableMissionNav, TZClock,
  getRandomCreatureName, escHtml, qs, qsa,
} from './core.js?v=20260407g';
import { loadDemoData, clearDemoData, isDemoLoaded } from './demo-data.js?v=20260407g';

// ═══════════════════════════════════════════════════════════════════════════
//  SETTINGS PANEL
// ═══════════════════════════════════════════════════════════════════════════

export const SettingsPanel = {
  async render() {
    const themes = ThemeManager.themes;
    const themeCards = Object.entries(themes).map(([id, t]) => `
      <div class="theme-card ${State.currentTheme === id ? 'active' : ''}" data-theme-id="${id}">
        <div class="theme-card-swatch" style="background:linear-gradient(135deg,${t.swatch[0]} 50%,${t.swatch[1]} 50%)"></div>
        <div class="theme-card-name">${t.name}</div>
        <div class="theme-card-desc">${t.desc}</div>
      </div>`).join('');

    qs('#panel-settings').innerHTML = `
      <div class="panel-header"><h2>&#9881; Settings</h2></div>

      <div class="settings-section">
        <div class="section-title">Operator Identity</div>
        <p class="text-dim" style="font-size:12px;margin-bottom:10px">
          Your operator name is attached to all changes you make. No authentication is required.
        </p>
        <div class="inline-form" style="max-width:400px">
          <div class="form-group">
            <label class="form-label">Operator Name</label>
            <input type="text" id="settings-op-name" value="${escHtml(State.operatorName || '')}" placeholder="Enter your operator name" />
          </div>
          <button class="btn btn-primary" id="btn-save-operator">Save</button>
          <button class="btn btn-secondary" id="btn-random-operator" title="Pick random Magic creature name">🎲</button>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-title">UI Theme</div>
        <div class="theme-grid">${themeCards}</div>
      </div>

      <div class="settings-section">
        <div class="section-title">Data Management</div>
        <p class="text-dim" style="font-size:12px;margin-bottom:12px">
          Export all operations as a single JSON backup, or clear all application data.
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary" id="btn-export-all">⬇ Export All Operations</button>
          <button class="btn btn-danger"    id="btn-clear-all">⚠ Clear All Data</button>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-title">Demo Mode</div>
        <p class="text-dim" style="font-size:12px;margin-bottom:12px">
          Load realistic sample operations (BLACKOUT, GHOSTWIRE, REDSAND) with zones, assets,
          parsed data, tickets, and changelog entries from multiple operators.
          Demo data can be removed at any time without affecting your real operations.
        </p>
        <div style="display:flex;gap:8px;align-items:center" id="demo-controls">
          <button class="btn btn-secondary" id="btn-load-demo" style="display:none">🎭 Load Demo Data</button>
          <button class="btn btn-danger" id="btn-clear-demo" style="display:none">🗑 Remove Demo Data</button>
          <span id="demo-status" class="text-dim" style="font-size:12px"></span>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-title">Database Reset</div>
        <p class="text-dim" style="font-size:12px;margin-bottom:12px">
          Completely destroy and recreate the local database. This is a nuclear option —
          all operations, assets, settings, and changelog entries are permanently erased.
          The page will reload after reset.
        </p>
        <button class="btn btn-danger" id="btn-reset-db">🗑 Reset Entire Database</button>
      </div>`;

    this.bindEvents();
  },

  bindEvents() {
    qs('#btn-save-operator').addEventListener('click', async () => {
      const name = qs('#settings-op-name').value.trim();
      if (!name) { UI.toast('Operator name cannot be empty', 'error'); return; }
      State.operatorName = name;
      await DB.setSetting('operatorName', name);
      qs('#header-operator-name').textContent = name;
      UI.toast('Operator name saved', 'success');
    });

    qs('#btn-random-operator').addEventListener('click', () => {
      qs('#settings-op-name').value = getRandomCreatureName();
    });

    qsa('.theme-card').forEach((card) => {
      card.addEventListener('click', () => {
        ThemeManager.apply(card.dataset.themeId);
        qsa('.theme-card').forEach((c) => c.classList.toggle('active', c === card));
      });
    });

    qs('#btn-export-all').addEventListener('click', () => ImportExport.exportAll());

    // ── Demo mode controls ──────────────────────────────────────────────
    const updateDemoUI = async () => {
      const loaded = await isDemoLoaded();
      qs('#btn-load-demo').style.display  = loaded ? 'none' : '';
      qs('#btn-clear-demo').style.display = loaded ? '' : 'none';
      qs('#demo-status').textContent = loaded ? '✅ Demo data active (3 operations)' : '';
    };
    updateDemoUI();

    qs('#btn-load-demo').addEventListener('click', async () => {
      qs('#btn-load-demo').disabled = true;
      qs('#btn-load-demo').textContent = '⏳ Generating…';
      try {
        await loadDemoData();
        UI.toast('Demo data loaded — 3 operations created', 'success');
        await updateDemoUI();
        await showPanel('missions');
      } catch (err) {
        UI.toast(`Failed: ${err.message}`, 'error');
      }
      qs('#btn-load-demo').disabled = false;
      qs('#btn-load-demo').textContent = '🎭 Load Demo Data';
    });

    qs('#btn-clear-demo').addEventListener('click', () => {
      UI.confirm('Remove all demo operations? Your real data will not be affected.', async () => {
        qs('#btn-clear-demo').disabled = true;
        const count = await clearDemoData();
        // If the active mission was a demo mission, deactivate it
        const demoIds = (await DB.getSetting('demoMissionIds')) || [];
        if (State.activeMission && demoIds.includes(State.activeMission.id)) {
          State.activeMission = null;
          localStorage.removeItem('hh-activeMissionId');
          enableMissionNav(false);
          TZClock.stop();
          qs('#active-mission-badge')?.classList.add('hidden');
        }
        UI.closeModal();
        UI.toast(`Removed ${count} demo operation(s)`, 'info');
        await updateDemoUI();
        await showPanel('missions');
        qs('#btn-clear-demo').disabled = false;
      }, { title: 'Remove Demo Data', yesLabel: 'Remove' });
    });

    qs('#btn-clear-all').addEventListener('click', () => {
      UI.confirm(
        'This will permanently delete ALL operations and data. Are you absolutely sure?',
        async () => {
          const missions = await DB.getAllMissions();
          for (const m of missions) await DB.deleteMission(m.id);
          State.activeMission = null;
          localStorage.removeItem('hh-activeMissionId');
          enableMissionNav(false);
          TZClock.stop();
          qs('#active-mission-badge').classList.add('hidden');
          await DB.setSetting('operatorName', State.operatorName);
          UI.closeModal();
          UI.toast('All data cleared', 'info');
          await showPanel('missions');
        },
        { title: 'Clear All Data', yesLabel: 'Delete Everything' }
      );
    });

    qs('#btn-reset-db').addEventListener('click', () => {
      UI.confirm(
        'DANGER: This will completely destroy the local database and reload the page. All operations, settings, and history will be permanently lost. Export your data first if needed.',
        () => {
          UI.closeModal();
          UI.confirm(
            'Are you ABSOLUTELY sure? This cannot be undone.',
            async () => {
              try {
                await DB.resetDatabase();
                UI.closeModal();
                window.location.reload();
              } catch (err) {
                UI.toast(`Reset failed: ${err.message}`, 'error');
                UI.closeModal();
              }
            },
            { title: 'Final Confirmation', yesLabel: 'Yes, destroy everything' }
          );
        },
        { title: 'Reset Database', yesLabel: 'Proceed to final confirmation' }
      );
    });
  },
};
