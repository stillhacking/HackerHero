/**
 * @fileoverview ChangelogPanel — audit log with revert capability
 * @module panel-changelog
 */

import {
  State, DB, UI,
  formatDate, formatDateFull, escHtml, qs, qsa, showPanel,
} from './core.js?v=20260406u';
import { AssetsPanel } from './panel-assets.js?v=20260406u';

// ═══════════════════════════════════════════════════════════════════════════
//  CHANGELOG PANEL
// ═══════════════════════════════════════════════════════════════════════════

export const ChangelogPanel = {
  _filterOperator: '',
  _filterAction: '',

  async render() {
    if (!State.activeMission) {
      qs('#panel-changelog').innerHTML = '<p class="text-muted" style="padding:20px">No active operation.</p>';
      return;
    }
    const entries = await DB.getChangelogByMission(State.activeMission.id);

    const operators = [...new Set(entries.map(e => e.operator))].sort();
    const actions   = [...new Set(entries.map(e => e.action))].sort();

    const filtered = entries.filter(e => {
      if (this._filterOperator && e.operator !== this._filterOperator) return false;
      if (this._filterAction   && e.action   !== this._filterAction)   return false;
      return true;
    });

    const rowsHtml = filtered.map((e) => `
      <div class="changelog-entry cl-entry-link" data-cl-id="${e.id}" data-entity-type="${e.entityType}" data-entity-id="${escHtml(e.entityId)}">
        <span class="cl-timestamp mono" title="${formatDateFull(e.timestamp)}">${formatDate(e.timestamp)}</span>
        <span class="cl-operator">${escHtml(e.operator)}</span>
        <span class="cl-action ${escHtml(e.action)}">${escHtml(e.action)}</span>
        <span class="cl-desc">${escHtml(e.description)}</span>
        <button class="cl-delete-btn" data-action="revert-cl" data-cl-id="${e.id}" title="Revert this change">&#9100;</button>
      </div>`).join('');

    const operatorOptions = operators.map(op =>
      `<option value="${escHtml(op)}" ${this._filterOperator === op ? 'selected' : ''}>${escHtml(op)}</option>`
    ).join('');

    const actionOptions = actions.map(a =>
      `<option value="${escHtml(a)}" ${this._filterAction === a ? 'selected' : ''}>${escHtml(a)}</option>`
    ).join('');

    const isFiltered = this._filterOperator || this._filterAction;

    qs('#panel-changelog').innerHTML = `
      <div class="panel-header">
        <h2>&#128220; Changelog</h2>
        <div class="panel-actions">
          <select id="cl-filter-operator" class="input-sm" style="width:auto;min-width:120px" title="Filter by operator">
            <option value="">All operators</option>
            ${operatorOptions}
          </select>
          <select id="cl-filter-action" class="input-sm" style="width:auto;min-width:100px" title="Filter by action">
            <option value="">All actions</option>
            ${actionOptions}
          </select>
          ${isFiltered ? `<button class="btn btn-ghost btn-sm" id="cl-filter-clear" title="Clear filters">✕ Clear</button>` : ''}
          <span class="text-dim" style="font-size:12px">${filtered.length}${isFiltered ? ` / ${entries.length}` : ''} entries</span>
        </div>
      </div>
      ${filtered.length
        ? `<div class="changelog-list">${rowsHtml}</div>`
        : `<div class="empty-state"><div class="empty-state-icon">📜</div><div class="empty-state-text">${isFiltered ? 'No entries match the current filters' : 'No changes recorded yet'}</div></div>`}`;

    this.bindEvents();
  },

  bindEvents() {
    qs('#cl-filter-operator')?.addEventListener('change', async (e) => {
      this._filterOperator = e.target.value;
      await this.render();
    });

    qs('#cl-filter-action')?.addEventListener('change', async (e) => {
      this._filterAction = e.target.value;
      await this.render();
    });

    qs('#cl-filter-clear')?.addEventListener('click', async () => {
      this._filterOperator = '';
      this._filterAction   = '';
      await this.render();
    });

    qsa('[data-action="revert-cl"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const clId = btn.dataset.clId;
        await this.revertEntry(clId);
      });
    });

    // Click on changelog entry → navigate to the entity
    qsa('.cl-entry-link[data-entity-type]').forEach((el) => {
      el.addEventListener('click', async (e) => {
        if (e.target.closest('[data-action]')) return;
        const { entityType, entityId } = el.dataset;
        await AssetsPanel.navigateTo(entityType, entityId);
      });
    });
  },

  async revertEntry(clId) {
    const entries = await DB.getChangelogByMission(State.activeMission.id);
    const entry   = entries.find((e) => e.id === clId);
    if (!entry) return;

    UI.confirm(
      `Revert: "${entry.description}"?\nThis will restore the previous state of this ${entry.entityType}.`,
      async () => {
        try {
          await this._applyRevert(entry);
          await DB.deleteChangelogEntry(clId);
          UI.closeModal();
          UI.toast('Change reverted', 'success');
          await ChangelogPanel.render();
        } catch (err) {
          UI.toast(`Revert failed: ${err.message}`, 'error');
          UI.closeModal();
        }
      },
      { title: 'Revert Change', yesLabel: 'Revert', yesClass: 'btn-danger' }
    );
  },

  async _applyRevert(entry) {
    const { action, entityType, entityId, previousState } = entry;

    if (action === 'create') {
      switch (entityType) {
        case 'mission':  await DB.deleteMission(entityId);  break;
        case 'zone':     await DB.deleteZone(entityId);     break;
        case 'asset':    await DB.deleteAsset(entityId);    break;
        case 'subitem':  await DB.deleteSubitem(entityId);  break;
        case 'ticket':   await DB.deleteTicket(entityId);   break;
        default: throw new Error(`Cannot revert create of type ${entityType}`);
      }
    } else if (action === 'update' && previousState) {
      switch (entityType) {
        case 'mission':  await DB.saveMission(previousState);  if (State.activeMission?.id === entityId) State.activeMission = previousState; break;
        case 'zone':     await DB.saveZone(previousState);     break;
        case 'asset':    await DB.saveAsset(previousState);    break;
        case 'subitem':  await DB.saveSubitem(previousState);  break;
        case 'ticket':   await DB.saveTicket(previousState);   break;
        default: throw new Error(`Cannot revert update of type ${entityType}`);
      }
    } else if (action === 'delete' && previousState) {
      switch (entityType) {
        case 'zone':    await DB.saveZone(previousState);    break;
        case 'asset':   await DB.saveAsset(previousState);   break;
        case 'subitem': await DB.saveSubitem(previousState); break;
        case 'ticket':  await DB.saveTicket(previousState);  break;
        default: throw new Error(`Cannot revert delete of type ${entityType}`);
      }
    } else {
      throw new Error('Cannot revert: missing previous state');
    }

    if (entityType === 'mission' && State.activeMission?.id === entityId) {
      State.activeMission = await DB.getMission(entityId);
      if (State.activeMission) {
        qs('#active-mission-name').textContent = State.activeMission.codename;
      }
    }
  },
};
