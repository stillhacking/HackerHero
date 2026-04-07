/**
 * @fileoverview TicketsPanel — minimalist ticketing system
 * @module panel-tickets
 */

import {
  State, DB, UI, logChange, showPanel, Lightbox,
  generateId, now, formatDate, formatDateFull, timeAgo, escHtml, qs, qsa,
  readFileAsDataURL, createThumbnail,
  ASSET_ICON_MAP,
  MAX_ATTACHMENT_SIZE,
  renderMarkdown,
} from './core.js?v=20260407g';
import {
  ASSET_ICON, assetIcon, subitemIcon, ASSET_STATUSES,
  AssetsPanel, TICKET_PRIORITIES,
} from './panel-assets.js?v=20260407g';

// ── Forum post avatar helpers ──────────────────────────────────────────────
const _POST_COLORS = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#db2777','#0891b2','#65a30d','#9333ea','#0284c7'];
function _postColor(name) {
  let h = 0;
  for (const c of (name || '?')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return _POST_COLORS[h % _POST_COLORS.length];
}
function _postInitials(name) {
  return (name || '?').split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '?';
}

// ═══════════════════════════════════════════════════════════════════════════
//  TICKETS PANEL
// ═══════════════════════════════════════════════════════════════════════════

export const TicketsPanel = {
  _viewingTicketId: null,

  async render() {
    if (!State.activeMission) {
      qs('#panel-tickets').innerHTML = '<p class="text-muted" style="padding:20px">No active operation.</p>';
      return;
    }
    if (this._viewingTicketId) {
      await this._renderTicketDetail(this._viewingTicketId);
      return;
    }
    await this._renderList();
  },

  async _renderList() {
    const m = State.activeMission;
    const tickets = await DB.getTicketsByMission(m.id);

    for (const t of tickets) {
      t._refName = await this._resolveRefName(t.refType, t.refId);
      t._refIcon = await this._resolveRefIcon(t.refType, t.refId);
    }

    const openTickets  = tickets.filter(t => t.status === 'open');
    const closedTickets = tickets.filter(t => t.status === 'closed');

    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    const bySeverity = (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    openTickets.sort(bySeverity);
    closedTickets.sort(bySeverity);

    const renderTicketRow = (t) => {
      const p = TICKET_PRIORITIES[t.priority] || TICKET_PRIORITIES.medium;
      const statusClass = t.status === 'open' ? 'ticket-open' : 'ticket-closed';
      const refIcon = t._refIcon || (t.refType === 'zone' ? '🌐' : t.refType === 'asset' ? ASSET_ICON : '📄');
      return `
        <div class="ticket-row ${statusClass}" data-ticket-id="${t.id}">
          <span class="ticket-priority" style="color:${p.color}" title="${p.label}">${p.icon}</span>
          <div class="ticket-row-body">
            <div class="ticket-row-title">${escHtml(t.title)}</div>
            <div class="ticket-row-meta">${refIcon} ${escHtml(t._refName || '—')} · by ${escHtml(t.createdBy)} · ${timeAgo(t.createdAt)}</div>
          </div>
          <span class="ticket-status-badge ticket-status-${escHtml(t.status)}">${t.status === 'open' ? '● Open' : '✓ Closed'}</span>
        </div>`;
    };

    qs('#panel-tickets').innerHTML = `
      <div class="panel-header">
        <h2>🎫 Tickets</h2>
        <div class="panel-actions">
          <button class="btn btn-primary" id="btn-new-ticket">+ New Ticket</button>
        </div>
      </div>
      <div class="tickets-filters" style="padding:0 20px 8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input type="search" id="ticket-filter" placeholder="🔍 Filter tickets…" class="filter-input" style="max-width:260px" />
        <select id="ticket-filter-status" class="filter-input" style="max-width:140px;padding:4px 8px;font-size:12px">
          <option value="all" selected>All</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <div id="tickets-list" style="padding:0 20px 20px;display:flex;flex-direction:column;gap:6px;overflow-y:auto;flex:1">
        ${openTickets.length ? `<div class="tickets-section-label">Open (${openTickets.length})</div>` : ''}
        ${openTickets.map(renderTicketRow).join('')}
        ${closedTickets.length ? `<div class="tickets-section-label" style="margin-top:12px">Closed (${closedTickets.length})</div>` : ''}
        ${closedTickets.map(renderTicketRow).join('')}
        ${!tickets.length ? '<div class="empty-state"><div class="empty-state-icon">🎫</div><div class="empty-state-text">No tickets yet</div></div>' : ''}
      </div>`;

    qs('#btn-new-ticket')?.addEventListener('click', () => this.openCreateTicketModal());

    qsa('.ticket-row').forEach(row => {
      row.addEventListener('click', () => {
        this._viewingTicketId = row.dataset.ticketId;
        this.render();
      });
    });

    const filterFn = () => {
      const q = (qs('#ticket-filter')?.value || '').toLowerCase();
      const statusFilter = qs('#ticket-filter-status')?.value || 'all';
      qsa('.ticket-row').forEach(row => {
        const title = row.querySelector('.ticket-row-title')?.textContent.toLowerCase() || '';
        const meta = row.querySelector('.ticket-row-meta')?.textContent.toLowerCase() || '';
        const isOpen = row.classList.contains('ticket-open');
        const matchesText = !q || title.includes(q) || meta.includes(q);
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'open' && isOpen) || (statusFilter === 'closed' && !isOpen);
        row.style.display = matchesText && matchesStatus ? '' : 'none';
      });
      qsa('.tickets-section-label').forEach(lbl => {
        let hasVisible = false;
        let el = lbl.nextElementSibling;
        while (el && !el.classList.contains('tickets-section-label')) {
          if (el.classList.contains('ticket-row') && el.style.display !== 'none') hasVisible = true;
          el = el.nextElementSibling;
        }
        lbl.style.display = hasVisible ? '' : 'none';
      });
    };
    qs('#ticket-filter')?.addEventListener('input', filterFn);
    qs('#ticket-filter-status')?.addEventListener('change', filterFn);
    filterFn();
  },

  async _renderTicketDetail(ticketId) {
    const ticket = await DB.getTicket(ticketId);
    if (!ticket) { this._viewingTicketId = null; await this._renderList(); return; }

    const messages = await DB.getMessagesByTicket(ticketId);
    const p = TICKET_PRIORITIES[ticket.priority] || TICKET_PRIORITIES.medium;
    const refIcon = await this._resolveRefIcon(ticket.refType, ticket.refId);
    const refName = await this._resolveRefName(ticket.refType, ticket.refId);

    const msgAtts = {};
    await Promise.all(messages.map(async (msg) => {
      const atts = await DB.getAttachmentsByRef(msg.id);
      if (atts.length) msgAtts[msg.id] = atts;
    }));

    const msgsHtml = messages.map(msg => {
      const atts = msgAtts[msg.id] || [];
      const isMine = msg.author === State.operatorName;
      const imgsHtml = atts.length ? `
        <div class="forum-post-imgs">
          ${atts.map((att, idx) => `<img class="forum-post-img-thumb" src="${att.thumbnailUrl || att.dataUrl}"
            data-msg-id="${msg.id}" data-att-idx="${idx}" alt="${escHtml(att.fileName || 'image')}" title="${escHtml(att.fileName || '')}" />`).join('')}
        </div>` : '';
      return `
        <div class="forum-post ${isMine ? 'forum-post-mine' : ''}">
          <div class="forum-post-avatar" style="background:${_postColor(msg.author)}">${_postInitials(msg.author)}</div>
          <div class="forum-post-content">
            <div class="forum-post-header">
              <span class="forum-post-author" style="color:${_postColor(msg.author)}">${escHtml(msg.author)}</span>
              <span class="forum-post-time" title="${formatDateFull(msg.createdAt)}">${timeAgo(msg.createdAt)}</span>
              ${isMine ? '<span class="forum-post-me">you</span>' : ''}
            </div>
            ${msg.text ? renderMarkdown(msg.text) : ''}
            ${imgsHtml}
          </div>
        </div>`;
    }).join('') || '<div class="forum-empty">No messages yet — start the conversation below.</div>';

    qs('#panel-tickets').innerHTML = `
      <div class="panel-header" style="gap:8px">
        <button class="btn btn-ghost btn-xs" id="tk-back" title="Back to list">← Back</button>
        <h2 style="flex:1;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(ticket.title)}</h2>
        <span class="ticket-status-badge ticket-status-${escHtml(ticket.status)}">${ticket.status === 'open' ? '● Open' : '✓ Closed'}</span>
      </div>
      <div class="ticket-detail-meta" style="padding:8px 20px;border-bottom:1px solid var(--c-border);font-size:12px;color:var(--c-text3);display:flex;flex-wrap:wrap;gap:12px;align-items:center">
        <span>${p.icon} ${p.label}</span>
        <span>${refIcon} ${escHtml(refName)}</span>
        <span>by <b>${escHtml(ticket.createdBy)}</b> · ${formatDate(ticket.createdAt)}</span>
        <div style="flex:1"></div>
        ${ticket.status === 'open'
          ? `<button class="btn btn-secondary btn-xs" id="tk-close">✓ Close ticket</button>`
          : `<button class="btn btn-secondary btn-xs" id="tk-reopen">↻ Reopen</button>`}
        <button class="btn btn-ghost btn-xs text-danger" id="tk-delete" title="Delete ticket">✕</button>
      </div>
      ${ticket.description ? `<div class="ticket-description">${renderMarkdown(ticket.description)}</div>` : ''}
      <div id="tk-messages" style="flex:1;overflow-y:auto;padding:12px 20px;display:flex;flex-direction:column;gap:0">
        ${msgsHtml}
      </div>
      <div class="ticket-compose">
        <div id="tk-pending-imgs" class="compose-pending-imgs" style="display:none"></div>
        <div class="compose-toolbar">
          <button class="compose-tb-btn" data-wrap="**" title="Bold"><b>B</b></button>
          <button class="compose-tb-btn" data-wrap="*" title="Italic"><i>I</i></button>
          <button class="compose-tb-btn" data-wrap="\`" title="Inline code"><code style="font-size:10px">{}</code></button>
          <div class="compose-toolbar-sep"></div>
          <button class="compose-tb-btn" data-prefix="> " title="Quote">❝</button>
          <button class="compose-tb-btn" data-prefix="- " title="Bullet list">≡</button>
          <button class="compose-tb-btn" data-block="1" title="Code block">⬛</button>
          <div class="compose-toolbar-sep"></div>
          <span class="compose-md-hint">Markdown supported</span>
          <label class="compose-tb-btn" title="Attach image" style="cursor:pointer;margin-left:4px">
            📎<input type="file" id="tk-img-input" accept="image/*" multiple style="display:none" />
          </label>
        </div>
        <div style="display:flex;gap:8px;align-items:flex-end">
          <textarea id="tk-msg-input" placeholder="Write a message… Ctrl+Enter to send" rows="3" class="compose-textarea"></textarea>
          <button class="btn btn-primary btn-sm" id="tk-send" style="align-self:flex-end">Send</button>
        </div>
      </div>`;

    qsa('.forum-post-img-thumb').forEach((img) => {
      img.addEventListener('click', () => {
        const atts = msgAtts[img.dataset.msgId];
        if (atts) Lightbox.open(atts, parseInt(img.dataset.attIdx, 10));
      });
    });

    const msgContainer = qs('#tk-messages');
    if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;

    // Markdown toolbar
    qs('.compose-toolbar')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.compose-tb-btn[data-wrap], .compose-tb-btn[data-prefix], .compose-tb-btn[data-block]');
      if (!btn) return;
      const ta = qs('#tk-msg-input');
      if (!ta) return;
      const start = ta.selectionStart, end = ta.selectionEnd;
      const sel = ta.value.slice(start, end);
      const wrap = btn.dataset.wrap, prefix = btn.dataset.prefix, isBlock = btn.dataset.block;
      let newVal, newStart, newEnd;
      if (wrap) {
        newVal = ta.value.slice(0, start) + wrap + sel + wrap + ta.value.slice(end);
        newStart = start + wrap.length; newEnd = end + wrap.length;
      } else if (prefix) {
        const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
        newVal = ta.value.slice(0, lineStart) + prefix + ta.value.slice(lineStart);
        newStart = start + prefix.length; newEnd = end + prefix.length;
      } else if (isBlock) {
        const inner = sel || 'code';
        const inserted = '```\n' + inner + '\n```';
        newVal = ta.value.slice(0, start) + inserted + ta.value.slice(end);
        newStart = start + 4; newEnd = start + 4 + inner.length;
      }
      ta.value = newVal;
      ta.focus();
      ta.setSelectionRange(newStart, newEnd);
    });

    let _pendingFiles = [];
    const renderPending = () => {
      const box = qs('#tk-pending-imgs');
      if (!box) return;
      if (!_pendingFiles.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
      box.style.display = 'flex';
      box.innerHTML = _pendingFiles.map((f, i) => `
        <div class="compose-thumb">
          <img src="${f._preview}" alt="${escHtml(f.name)}" />
          <span class="compose-thumb-del" data-idx="${i}">✕</span>
        </div>`).join('');
      qsa('.compose-thumb-del', box).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          _pendingFiles.splice(parseInt(btn.dataset.idx, 10), 1);
          renderPending();
        });
      });
    };

    qs('#tk-img-input')?.addEventListener('change', async (e) => {
      for (const file of [...e.target.files]) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > MAX_ATTACHMENT_SIZE) { UI.toast(`"${file.name}" exceeds 10 MB`, 'error'); continue; }
        const dataUrl = await readFileAsDataURL(file);
        file._preview = await createThumbnail(dataUrl, 80);
        file._dataUrl = dataUrl;
        _pendingFiles.push(file);
      }
      renderPending();
      e.target.value = '';
    });

    const doSend = async () => {
      const text = qs('#tk-msg-input')?.value.trim();
      if (!text && !_pendingFiles.length) return;
      const msg = { id: generateId(), ticketId, text: text || '', author: State.operatorName, createdAt: now() };
      await DB.saveTicketMessage(msg);
      for (const file of _pendingFiles) {
        const thumbnailUrl = await createThumbnail(file._dataUrl, 120);
        await DB.saveAttachment({
          id: generateId(),
          missionId: ticket.missionId,
          refType: 'ticket-msg',
          refId: msg.id,
          fileName: file.name,
          mimeType: file.type,
          dataUrl: file._dataUrl,
          thumbnailUrl,
          size: file.size,
          createdAt: now(),
          createdBy: State.operatorName,
        });
      }
      // Clear pending files so they aren't re-attached on next send
      _pendingFiles = [];
      renderPending();
      this.render();
    };

    qs('#tk-send')?.addEventListener('click', doSend);
    qs('#tk-msg-input')?.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doSend(); }
    });

    qs('#tk-back')?.addEventListener('click', () => { this._viewingTicketId = null; this.render(); });
    qs('#tk-close')?.addEventListener('click', async () => {
      ticket.status = 'closed'; ticket.closedAt = now(); ticket.closedBy = State.operatorName;
      await DB.saveTicket(ticket);
      await this._syncTodoStatus(ticket.refType, ticket.refId);
      await logChange('update', 'ticket', ticket.id, ticket.title, `Closed ticket "${ticket.title}"`, null, ticket);
      UI.toast('Ticket closed', 'success'); this.render();
    });
    qs('#tk-reopen')?.addEventListener('click', async () => {
      ticket.status = 'open'; ticket.closedAt = null; ticket.closedBy = null;
      await DB.saveTicket(ticket);
      await this._syncTodoStatus(ticket.refType, ticket.refId);
      await logChange('update', 'ticket', ticket.id, ticket.title, `Reopened ticket "${ticket.title}"`, null, ticket);
      UI.toast('Ticket reopened', 'info'); this.render();
    });
    qs('#tk-delete')?.addEventListener('click', () => {
      UI.confirm(`Delete ticket "${ticket.title}"?`, async () => {
        await DB.deleteTicket(ticket.id);
        await this._syncTodoStatus(ticket.refType, ticket.refId);
        await logChange('delete', 'ticket', ticket.id, ticket.title, `Deleted ticket "${ticket.title}"`, ticket, null);
        UI.toast('Ticket deleted', 'success');
        this._viewingTicketId = null;
        this.render();
      });
    });
  },

  async _resolveRefName(refType, refId) {
    if (!refId) return '—';
    if (refType === 'zone')    { const z = await DB.getZone(refId);   return z ? z.name : '(deleted zone)'; }
    if (refType === 'asset')   { const a = await DB.getAsset(refId);  return a ? a.name : '(deleted asset)'; }
    if (refType === 'subitem') { const s = await DB.getSubitem(refId); return s ? s.name : '(deleted item)'; }
    return '—';
  },

  async _resolveRefIcon(refType, refId) {
    if (refType === 'zone') return '🌐';
    if (refType === 'asset' && refId) { const a = await DB.getAsset(refId); return a ? assetIcon(a) : ASSET_ICON; }
    if (refType === 'subitem' && refId) { const s = await DB.getSubitem(refId); return s ? subitemIcon(s) : '📄'; }
    return '📦';
  },

  async _syncTodoStatus(refType, refId) {
    if (!refId) return;
    const tickets = await DB.getTicketsByRef(refId);
    const hasOpenTickets = tickets.some(t => t.status === 'open');
    if (refType === 'zone') return;

    let obj, saveFn;
    if (refType === 'asset')   { obj = await DB.getAsset(refId);  saveFn = (o) => DB.saveAsset(o); }
    else if (refType === 'subitem') { obj = await DB.getSubitem(refId); saveFn = (o) => DB.saveSubitem(o); }
    if (!obj) return;

    const statuses = new Set(obj.statuses || []);
    if (hasOpenTickets) statuses.add('todo'); else statuses.delete('todo');
    obj.statuses = [...statuses];
    await saveFn(obj);
  },

  async openCreateTicketModal(refType, refId, refName) {
    const m = State.activeMission;
    if (!m) { UI.toast('No active operation', 'error'); return; }

    let refSelectorHtml = '';
    if (!refType) {
      const zones = await DB.getZonesByMission(m.id);
      const assets = await DB.getAssetsByMission(m.id);
      refSelectorHtml = `
        <div class="form-group" style="margin:0">
          <label class="form-label">Linked to</label>
          <select id="tk-ref-select" class="filter-input" style="padding:6px 8px;font-size:13px">
            <option value="">— select —</option>
            ${zones.map(z => `<option value="zone:${z.id}">🌐 ${escHtml(z.name)}</option>`).join('')}
            ${assets.map(a => `<option value="asset:${a.id}">📦 ${escHtml(a.name)}${a.icon && ASSET_ICON_MAP[a.icon] ? ' [' + ASSET_ICON_MAP[a.icon].name + ']' : ''}</option>`).join('')}
          </select>
        </div>`;
    }

    const priorityHtml = Object.entries(TICKET_PRIORITIES).map(([k, p]) =>
      `<option value="${k}" ${k === 'medium' ? 'selected' : ''}>${p.icon} ${p.label}</option>`
    ).join('');

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px">
        ${refType ? `<div style="font-size:12px;color:var(--c-text3)">Linked to: <b>${refType === 'zone' ? '🌐' : refType === 'asset' ? ASSET_ICON : '📄'} ${escHtml(refName || refId)}</b></div>` : refSelectorHtml}
        <div class="form-group" style="margin:0">
          <label class="form-label">Title *</label>
          <input type="text" id="tk-title" placeholder="Short title…" autofocus />
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Description</label>
          <textarea id="tk-desc" rows="3" placeholder="Optional details…"></textarea>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Priority</label>
          <select id="tk-priority" class="filter-input" style="padding:6px 8px;font-size:13px">${priorityHtml}</select>
        </div>
      </div>`;

    UI.openModal({ title: '🎫 New Ticket', bodyHtml: body, confirmLabel: 'Create', onConfirm: async () => {
      const title = qs('#tk-title')?.value.trim();
      if (!title) { UI.toast('Title is required', 'error'); return; }

      let finalRefType = refType;
      let finalRefId = refId;
      if (!refType) {
        const sel = qs('#tk-ref-select')?.value || '';
        if (sel) {
          const [type, id] = sel.split(':');
          finalRefType = type;
          finalRefId = id;
        }
      }

      const ticket = {
        id: generateId(),
        missionId: m.id,
        title,
        description: qs('#tk-desc')?.value.trim() || '',
        priority: qs('#tk-priority')?.value || 'medium',
        status: 'open',
        refType: finalRefType || null,
        refId: finalRefId || null,
        createdAt: now(),
        createdBy: State.operatorName,
        closedAt: null,
        closedBy: null,
      };
      await DB.saveTicket(ticket);

      if (ticket.refType && ticket.refId) {
        await this._syncTodoStatus(ticket.refType, ticket.refId);
      }

      await logChange('create', 'ticket', ticket.id, ticket.title, `Created ticket "${ticket.title}"`, null, ticket);
      UI.toast('Ticket created', 'success');
      UI.closeModal();

      if (qs('#panel-tickets.active')) {
        await this.render();
      }
      if (qs('#panel-assets.active') && State.selectedZoneId) {
        await AssetsPanel.renderAssets(AssetsPanel._zoneForRender());
        if (State.selectedAssetId)  await AssetsPanel.showAssetDetail(State.selectedAssetId);
        if (State.selectedSubitemId) await AssetsPanel.showSubitemContent(State.selectedSubitemId);
      }
    }});
  },
};
