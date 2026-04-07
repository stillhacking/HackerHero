/**
 * @fileoverview MissionsPanel — CRUD for red team operations
 * @module panel-missions
 */

import {
  State, DB, UI, logChange, showPanel, enableMissionNav, TZClock, ImportExport,
  generateId, now, formatDate, escHtml, qs, qsa,
  buildTimezoneOptions, renderMarkdown,
} from './core.js?v=20260407g';

// ═══════════════════════════════════════════════════════════════════════════
//  MISSIONS PANEL
// ═══════════════════════════════════════════════════════════════════════════

export const MissionsPanel = {
  _showArchived: false,

  async render() {
    const panel = qs('#panel-missions');
    const allMissions = await DB.getAllMissions();

    // Sort: currently-entered first, then active by updatedAt desc, archived last
    const active   = allMissions
      .filter(m => m.status !== 'archived')
      .sort((a, b) => {
        const aIsEntered = State.activeMission?.id === a.id;
        const bIsEntered = State.activeMission?.id === b.id;
        if (aIsEntered !== bIsEntered) return aIsEntered ? -1 : 1;
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      });
    const archived = allMissions
      .filter(m => m.status === 'archived')
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    const ticketCounts = {};
    await Promise.all(allMissions.map(async (m) => {
      const tickets = await DB.getTicketsByMission(m.id);
      ticketCounts[m.id] = tickets.filter(t => t.status === 'open').length;
    }));

    let grid = '';
    if (allMissions.length === 0) {
      grid = `<div class="empty-state">
        <div class="empty-state-icon">🎯</div>
        <div class="empty-state-text">No operations yet</div>
        <div class="empty-state-hint">Create your first red team operation to get started.</div>
      </div>`;
    } else {
      const activeGrid = active.length
        ? `<div class="card-grid">${active.map(m => this._missionCard(m, ticketCounts[m.id] || 0)).join('')}</div>`
        : `<p class="text-dim" style="padding:12px 0">No active operations.</p>`;

      const archivedSection = archived.length ? `
        <div class="missions-section-header">
          <span class="text-dim" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Archived (${archived.length})</span>
          <button class="btn btn-ghost btn-xs" id="btn-toggle-archived">${this._showArchived ? '▲ Hide' : '▼ Show'}</button>
        </div>
        ${this._showArchived
          ? `<div class="card-grid">${archived.map(m => this._missionCard(m, ticketCounts[m.id] || 0)).join('')}</div>`
          : ''}` : '';

      grid = activeGrid + archivedSection;
    }

    panel.innerHTML = `
      <div class="panel-header">
        <h2>Operations</h2>
        <div class="panel-actions">
          <button class="btn btn-ghost btn-sm" id="btn-merge-missions" title="Merge two operations">🔀 Merge</button>
          <button class="btn btn-secondary" id="btn-import-mission">⬆ Import</button>
          <button class="btn btn-primary"   id="btn-new-mission">+ New Operation</button>
        </div>
      </div>
      ${grid}`;

    this.bindEvents();
  },

  _missionCard(m, openTickets = 0) {
    const targets = (m.targets || []).map((t) => `<span class="badge badge-neutral">${escHtml(t.name)}</span>`).join('');
    const objs = m.objectives || [];
    const objAchieved = objs.filter(o => o.status === 'achieved').length;
    const objInProgress = objs.filter(o => o.status === 'in-progress').length;
    const daysElapsed = Math.floor((Date.now() - new Date(m.createdAt)) / 86400000);
    const isActive   = State.activeMission && State.activeMission.id === m.id;
    const isArchived = m.status === 'archived';
    return `
      <div class="mission-card${isActive ? ' mission-card--active' : ''}${isArchived ? ' mission-card--archived' : ''}" data-id="${m.id}">
        <button class="mission-card-delete" data-action="delete" data-id="${m.id}" title="Delete">✕</button>
        <div class="mission-card-header">
          <div class="mission-codename">${escHtml(m.codename)}</div>
          ${isActive   ? '<span class="badge badge-success">ACTIVE</span>' : ''}
          ${isArchived ? '<span class="badge badge-neutral">ARCHIVED</span>' : ''}
        </div>
        <div class="mission-targets">${targets}</div>
        <div class="mission-meta">
          <span>📅 J+${daysElapsed}</span>
          <span>👤 ${escHtml(m.createdBy)}</span>
          <span>● ${objAchieved} done · ◐ ${objInProgress} in progress</span>
          <span>🎫 ${openTickets} open ticket${openTickets !== 1 ? 's' : ''}</span>
        </div>
        <div class="mission-card-footer">
          <button class="btn btn-ghost btn-sm" data-action="export" data-id="${m.id}" title="Export JSON">⬇ Export</button>
          <button class="btn btn-ghost btn-sm" data-action="update" data-id="${m.id}" title="Update from file">⬆ Update</button>
          <button class="btn btn-ghost btn-sm" data-action="edit"   data-id="${m.id}">✎ Edit</button>
          <button class="btn btn-ghost btn-sm" data-action="${isArchived ? 'unarchive' : 'archive'}" data-id="${m.id}" title="${isArchived ? 'Restore' : 'Archive'}">${isArchived ? '↩ Restore' : '📦 Archive'}</button>
          ${!isArchived ? `<button class="btn btn-primary btn-sm" data-action="enter" data-id="${m.id}">→ Enter</button>` : ''}
        </div>
      </div>`;
  },

  bindEvents() {
    qs('#btn-new-mission').addEventListener('click', () => this.openMissionForm());
    qs('#btn-import-mission').addEventListener('click', () => ImportExport.openImportDialog());
    qs('#btn-merge-missions')?.addEventListener('click', () => ImportExport.openMergeDialog());
    qs('#btn-toggle-archived')?.addEventListener('click', async () => {
      this._showArchived = !this._showArchived;
      await this.render();
    });

    qsa('#panel-missions [data-action]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const { action, id } = btn.dataset;
        if (action === 'enter')     await this.enterMission(id);
        if (action === 'edit')      await this.openMissionForm(id);
        if (action === 'delete')    await this.deleteMission(id);
        if (action === 'export')    await ImportExport.exportMission(id);
        if (action === 'update')    ImportExport.openUpdateDialog(id);
        if (action === 'archive')   await this.archiveMission(id, true);
        if (action === 'unarchive') await this.archiveMission(id, false);
      });
    });

    // Click on card body also enters the mission (only if not archived)
    qsa('#panel-missions .mission-card:not(.mission-card--archived)').forEach((card) => {
      card.addEventListener('click', async (e) => {
        if (e.target.closest('[data-action]')) return;
        await this.enterMission(card.dataset.id);
      });
    });
  },

  openMissionForm(id = null) {
    (id ? DB.getMission(id) : Promise.resolve(null)).then((existing) => {
      const m = existing || {};
      const targets = (m.targets || []).map((t) => t.name).join(', ');
      const objs    = (m.objectives || []).map((o) => o.text).join('\n');

      UI.openModal({
        title: id ? 'Edit Operation' : 'New Operation',
        bodyHtml: `
          <div class="form-group">
            <label class="form-label">Code Name *</label>
            <input type="text" id="fm-codename" placeholder="e.g. IRON VEIL" value="${escHtml(m.codename || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Targets *  <span class="form-hint">(comma-separated: company, IP, domain…)</span></label>
            <input type="text" id="fm-targets" placeholder="AcmeCorp, 192.168.1.0/24, acme.com" value="${escHtml(targets)}" />
          </div>
          <div class="form-group">
            <label class="form-label">Objectives  <span class="form-hint">(one per line)</span></label>
            <textarea id="fm-objectives" rows="4" placeholder="Obtain access to CEO mailbox\nExfiltrate files containing keywords: confidential">${escHtml(objs)}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="display:flex;align-items:center;justify-content:space-between">
              <span>Mission Briefing</span>
              <div class="md-tab-group" style="font-weight:normal">
                <button type="button" class="md-tab md-tab-active" id="fmctx-tab-edit">Edit</button>
                <button type="button" class="md-tab" id="fmctx-tab-preview">Preview</button>
              </div>
            </label>
            <div id="fmctx-edit-pane">
              <div class="compose-toolbar">
                <button type="button" class="compose-tb-btn" data-target="fm-context" data-wrap="**" title="Bold"><b>B</b></button>
                <button type="button" class="compose-tb-btn" data-target="fm-context" data-wrap="*" title="Italic"><i>I</i></button>
                <button type="button" class="compose-tb-btn" data-target="fm-context" data-wrap="\`" title="Code"><code style="font-size:10px">{}</code></button>
                <div class="compose-toolbar-sep"></div>
                <button type="button" class="compose-tb-btn" data-target="fm-context" data-prefix="> " title="Quote">❝</button>
                <button type="button" class="compose-tb-btn" data-target="fm-context" data-prefix="- " title="List">≡</button>
                <button type="button" class="compose-tb-btn" data-target="fm-context" data-prefix="# " title="Heading">H</button>
                <span class="compose-md-hint">Markdown</span>
              </div>
              <textarea id="fm-context" rows="8" class="compose-textarea" style="border-radius:0 0 0 4px;width:100%;box-sizing:border-box;resize:vertical;min-height:120px" placeholder="Target description, attack surface notes, OSINT findings…">${escHtml(m.context || '')}</textarea>
            </div>
            <div id="fmctx-preview-pane" class="ctx-preview" style="display:none;min-height:80px"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Timezone  <span class="form-hint">(displayed in the header while the operation is active)</span></label>
            <select id="fm-timezone">${buildTimezoneOptions(m.timezone || '')}</select>
          </div>`,
        confirmLabel: id ? 'Save Changes' : 'Create Operation',
        onOpen: () => {
          // Tab switching for mission briefing markdown editor
          const switchTab = (mode) => {
            const editPane    = qs('#fmctx-edit-pane');
            const previewPane = qs('#fmctx-preview-pane');
            const tabEdit     = qs('#fmctx-tab-edit');
            const tabPreview  = qs('#fmctx-tab-preview');
            if (mode === 'edit') {
              editPane.style.display = '';
              previewPane.style.display = 'none';
              tabEdit.classList.add('md-tab-active');
              tabPreview.classList.remove('md-tab-active');
              qs('#fm-context')?.focus();
            } else {
              const text = qs('#fm-context')?.value || '';
              previewPane.innerHTML = text
                ? renderMarkdown(text)
                : '<span class="ov-empty-hint">Nothing to preview yet.</span>';
              editPane.style.display = 'none';
              previewPane.style.display = '';
              tabPreview.classList.add('md-tab-active');
              tabEdit.classList.remove('md-tab-active');
            }
          };
          qs('#fmctx-tab-edit')?.addEventListener('click',    () => switchTab('edit'));
          qs('#fmctx-tab-preview')?.addEventListener('click', () => switchTab('preview'));

          // Toolbar buttons
          qs('#fmctx-edit-pane .compose-toolbar')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-wrap],[data-prefix],[data-block]');
            if (!btn) return;
            const ta = qs('#fm-context');
            if (!ta) return;
            const start = ta.selectionStart, end = ta.selectionEnd, sel = ta.value.slice(start, end);
            const wrap = btn.dataset.wrap, prefix = btn.dataset.prefix, isBlock = btn.dataset.block;
            let newVal, ns, ne;
            if (wrap) {
              newVal = ta.value.slice(0, start) + wrap + sel + wrap + ta.value.slice(end);
              ns = start + wrap.length; ne = end + wrap.length;
            } else if (prefix) {
              const ls = ta.value.lastIndexOf('\n', start - 1) + 1;
              newVal = ta.value.slice(0, ls) + prefix + ta.value.slice(ls);
              ns = start + prefix.length; ne = end + prefix.length;
            } else if (isBlock) {
              const inner = sel || 'code';
              const ins = '```\n' + inner + '\n```';
              newVal = ta.value.slice(0, start) + ins + ta.value.slice(end);
              ns = start + 4; ne = start + 4 + inner.length;
            }
            ta.value = newVal;
            ta.focus();
            ta.setSelectionRange(ns, ne);
          });
        },
        onConfirm: async () => {
          const codename = qs('#fm-codename').value.trim();
          if (!codename) { UI.toast('Code name is required', 'error'); return; }

          // Prevent duplicate codenames
          const allMissions = await DB.getAllMissions();
          const duplicate = allMissions.find(m => m.codename.toLowerCase() === codename.toLowerCase() && m.id !== id);
          if (duplicate) { UI.toast(`An operation named "${duplicate.codename}" already exists`, 'error'); return; }

          const targetsInput = qs('#fm-targets').value.split(',').map((s) => s.trim()).filter(Boolean);
          if (!targetsInput.length) { UI.toast('At least one target is required', 'error'); return; }

          const targets = targetsInput.map((name) => ({ id: generateId(), name }));
          const objLines = qs('#fm-objectives').value.split('\n').map((s) => s.trim()).filter(Boolean);
          const objectives = objLines.map((text) => ({
            id: generateId(), text,
            status: 'pending', createdAt: now(), createdBy: State.operatorName,
          }));

          const mission = {
            id:         id || generateId(),
            codename,
            targets,
            objectives: id ? (existing.objectives || []) : objectives, // keep existing objectives on edit
            context:    qs('#fm-context').value.trim(),
            timezone:   qs('#fm-timezone').value.trim() || null,
            createdAt:  m.createdAt  || now(),
            createdBy:  m.createdBy  || State.operatorName,
            updatedAt:  now(),
            updatedBy:  State.operatorName,
          };

          // On edit, merge new objectives
          if (id && objectives.length) {
            const existingTexts = (existing.objectives || []).map((o) => o.text);
            const newObjs = objectives.filter((o) => !existingTexts.includes(o.text));
            mission.objectives = [...(existing.objectives || []), ...newObjs];
          }

          await DB.saveMission(mission);
          if (!id) await logChange('create', 'mission', mission.id, mission.codename, `Created operation "${mission.codename}"`, null, mission);
          else      await logChange('update', 'mission', mission.id, mission.codename, `Updated operation "${mission.codename}"`, existing, mission);

          UI.closeModal();
          UI.toast(id ? 'Operation updated' : 'Operation created', 'success');

          if (State.activeMission && State.activeMission.id === mission.id) {
            State.activeMission = mission;
            qs('#active-mission-name').textContent = mission.codename;
            TZClock.start(mission.timezone || '');
          }
          await MissionsPanel.render();
        },
      });
    });
  },

  async enterMission(id, { silent = false } = {}) {
    const mission = await DB.getMission(id);
    if (!mission) return;
    State.activeMission   = mission;
    State.selectedZoneId  = null;
    State.selectedAssetId = null;
    State.selectedSubitemId = null;
    localStorage.setItem('hh-activeMissionId', id);
    enableMissionNav(true);
    qs('#active-mission-badge').classList.remove('hidden');
    qs('#active-mission-name').textContent = mission.codename;
    TZClock.start(mission.timezone || '');
    if (!silent) {
      UI.toast(`Entered operation: ${mission.codename}`, 'success');
      await showPanel('overview');
    }
  },

  async archiveMission(id, archive = true) {
    const m = await DB.getMission(id);
    if (!m) return;
    if (!archive) {
      // Restore: no confirmation needed
      const updated = { ...m, status: 'active', updatedAt: now(), updatedBy: State.operatorName };
      await DB.saveMission(updated);
      UI.toast(`"${m.codename}" restored`, 'info');
      await MissionsPanel.render();
      return;
    }
    UI.confirm(
      `Archive operation "${m.codename}"?\nIt will be hidden from the main list and can be restored later.`,
      async () => {
        const updated = { ...m, status: 'archived', updatedAt: now(), updatedBy: State.operatorName };
        await DB.saveMission(updated);
        if (State.activeMission?.id === id) {
          State.activeMission = null;
          localStorage.removeItem('hh-activeMissionId');
          enableMissionNav(false);
          TZClock.stop();
          qs('#active-mission-badge').classList.add('hidden');
        }
        UI.closeModal();
        UI.toast(`"${m.codename}" archived`, 'info');
        await MissionsPanel.render();
      },
      { title: 'Archive Operation', yesLabel: '📦 Archive', yesClass: 'btn-warning' }
    );
  },

  async deleteMission(id) {
    const m = await DB.getMission(id);
    if (!m) return;
    UI.confirm(
      `Delete operation "${m.codename}" and ALL associated data? This cannot be undone.`,
      async () => {
        if (State.activeMission && State.activeMission.id === id) {
          State.activeMission = null;
          localStorage.removeItem('hh-activeMissionId');
          enableMissionNav(false);
          TZClock.stop();
          qs('#active-mission-badge').classList.add('hidden');
        }
        await DB.deleteMission(id);
        UI.closeModal();
        UI.toast('Operation deleted', 'info');
        await MissionsPanel.render();
      },
      { title: 'Delete Operation' }
    );
  },
};
