/**
 * @fileoverview OverviewPanel — operation dashboard
 *
 * Displays:
 *  - KPI strip (zones, assets, pwned, HVT, open tickets, objectives %)
 *  - 2-column grid:
 *      Left:  Activity sparkline (30 d) + Recent activity feed (last 20)
 *      Right: Objectives progress ring + list, Open tickets, Top operators
 *  - Targets bar, Context / notes editor
 *
 * @module panel-overview
 */

import {
  State, DB, UI, logChange, showPanel,
  generateId, now, formatDate, formatDateFull, timeAgo,
  escHtml, truncate, qs, qsa, deepClone,
  buildTimezoneOptions, renderMarkdown,
} from './core.js?v=20260406u';
import { MissionsPanel } from './panel-missions.js?v=20260406u';
import { TICKET_PRIORITIES, AssetsPanel } from './panel-assets.js?v=20260406u';

// ═══════════════════════════════════════════════════════════════════════════
//  OVERVIEW PANEL
// ═══════════════════════════════════════════════════════════════════════════

export const OverviewPanel = {
  async render() {
    const m = State.activeMission;
    if (!m) { qs('#panel-overview').innerHTML = '<p class="text-muted" style="padding:20px">No active operation.</p>'; return; }

    const [zones, assets, tickets, changelog] = await Promise.all([
      DB.getZonesByMission(m.id),
      DB.getAssetsByMission(m.id),
      DB.getTicketsByMission(m.id),
      DB.getChangelogByMission(m.id),
    ]);

    // Gather all subitems (one query per asset)
    const subitems = [];
    for (const a of assets) subitems.push(...(await DB.getSubitemsByAsset(a.id)));

    // ── Metrics ───────────────────────────────────────────────────────────
    const objectives    = m.objectives || [];
    const objAchieved   = objectives.filter((o) => o.status === 'achieved');
    const objInProgress = objectives.filter((o) => o.status === 'in-progress');
    const objPending    = objectives.filter((o) => o.status === 'pending');
    const openTickets   = tickets.filter((t) => t.status === 'open');
    const pwnedAssets   = assets.filter((a) => (a.statuses || []).includes('pwned'));
    const objPct        = objectives.length ? Math.round((objAchieved.length / objectives.length) * 100) : 0;
    const daysElapsed   = Math.floor((Date.now() - new Date(m.createdAt)) / 86400000);

    // ── Activity timeline (last 30 days) ──────────────────────────────────
    const ago30 = new Date(Date.now() - 30 * 86400000);
    const dayBuckets = {};
    for (let i = 0; i <= 30; i++) {
      const d = new Date(ago30.getTime() + i * 86400000);
      dayBuckets[d.toISOString().slice(0, 10)] = 0;
    }
    for (const e of changelog) {
      const day = (e.timestamp || '').slice(0, 10);
      if (day in dayBuckets) dayBuckets[day]++;
    }
    const timelineDays = Object.keys(dayBuckets);
    const timelineVals = Object.values(dayBuckets);
    const timelineMax  = Math.max(1, ...timelineVals);

    // ── Recent activity (last 20 entries) ─────────────────────────────────
    const recentEntries = changelog.slice(0, 20);
    const actionIcons = { create: '🟢', update: '🔵', delete: '🔴' };

    const recentHtml = recentEntries.length ? recentEntries.map((e) => `
      <div class="ov-feed-item ov-feed-item-link" data-entity-type="${e.entityType}" data-entity-id="${escHtml(e.entityId)}">
        <span class="ov-feed-icon">${actionIcons[e.action] || '⚪'}</span>
        <div class="ov-feed-body">
          <span class="ov-feed-desc">${escHtml(truncate(e.description, 70))}</span>
          <span class="ov-feed-meta">${escHtml(e.operator)} · ${timeAgo(e.timestamp)}</span>
        </div>
      </div>`).join('')
      : '<div class="ov-empty-hint">No activity recorded yet</div>';

    // ── Top operators ─────────────────────────────────────────────────────
    const opCounts = {};
    for (const e of changelog) {
      opCounts[e.operator] = (opCounts[e.operator] || 0) + 1;
    }
    const topOps = Object.entries(opCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topOpsMax = topOps.length ? topOps[0][1] : 1;

    const topOpsHtml = topOps.length ? topOps.map(([op, count], idx) => {
      const pct = Math.round((count / topOpsMax) * 100);
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '·';
      return `
        <div class="ov-op-row">
          <span class="ov-op-medal">${medal}</span>
          <span class="ov-op-name">${escHtml(op)}</span>
          <div class="ov-op-bar"><div class="ov-op-bar-fill" style="width:${pct}%"></div></div>
          <span class="ov-op-count">${count}</span>
        </div>`;
    }).join('')
      : '<div class="ov-empty-hint">No operators yet</div>';

    // ── Open tickets (top 8 by priority) ──────────────────────────────────
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    const sortedTickets = openTickets
      .sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority))
      .slice(0, 8);

    const ticketsHtml = sortedTickets.length ? sortedTickets.map((t) => {
      const p = TICKET_PRIORITIES[t.priority] || TICKET_PRIORITIES.medium;
      return `
        <div class="ov-ticket-row ov-ticket-link" data-entity-type="ticket" data-entity-id="${t.id}" title="${escHtml(t.title)}">
          <span class="ov-ticket-prio" style="color:${p.color}">${p.icon}</span>
          <span class="ov-ticket-title">${escHtml(truncate(t.title, 45))}</span>
          <span class="ov-ticket-age">${timeAgo(t.createdAt)}</span>
        </div>`;
    }).join('')
      : '<div class="ov-empty-hint">No open tickets 🎉</div>';

    // ── Objectives list HTML ──────────────────────────────────────────────
    const objectivesListHtml = objectives.map((o) => {
      const statusIcon  = { pending: '○', 'in-progress': '◐', achieved: '●', dropped: '✕' }[o.status] || '○';
      const statusColor = { pending: 'var(--c-text3)', 'in-progress': '#facc15', achieved: '#4ade80', dropped: 'var(--c-text3)' }[o.status] || 'var(--c-text3)';
      return `
        <div class="ov-obj-item ${o.status === 'achieved' ? 'ov-obj-done' : ''}" data-oid="${o.id}">
          <button class="ov-obj-btn" data-action="cycle-status" data-oid="${o.id}" title="Click to cycle status" style="color:${statusColor}">${statusIcon}</button>
          <span class="ov-obj-text">${escHtml(truncate(o.text, 60))}</span>
          <div class="ov-obj-actions">
            <button class="btn btn-ghost btn-xs" data-action="edit-obj" data-oid="${o.id}" title="Edit">✎</button>
            <button class="btn btn-ghost btn-xs text-danger" data-action="del-obj" data-oid="${o.id}" title="Delete">✕</button>
          </div>
        </div>`;
    }).join('');

    // ── Targets HTML ──────────────────────────────────────────────────────
    const targetsHtml = (m.targets || []).map((t) => `
      <div class="target-chip" data-tid="${t.id}">
        <span>🏢</span><span>${escHtml(t.name)}</span>
        <button class="btn btn-ghost btn-xs" data-action="del-target" data-tid="${t.id}" title="Remove target">×</button>
      </div>`).join('');

    // ════════════════════════════════════════════════════════════════════════
    //  RENDER
    // ════════════════════════════════════════════════════════════════════════
    qs('#panel-overview').innerHTML = `
      <div class="panel-header">
        <h2>📋 ${escHtml(m.codename)}</h2>
        <div class="panel-actions">
          <span class="ov-days-badge">J+${daysElapsed}</span>
          <button class="btn btn-secondary btn-sm" id="btn-edit-mission">✎ Edit</button>
        </div>
      </div>

      <!-- KPI strip -->
      <div class="ov-kpi-strip">
        <div class="ov-kpi card-nav" data-nav="assets">
          <div class="ov-kpi-val" style="color:var(--c-accent)">${zones.length}</div>
          <div class="ov-kpi-lbl">Zones</div>
        </div>
        <div class="ov-kpi card-nav" data-nav="assets" data-zone="__all__">
          <div class="ov-kpi-val" style="color:var(--c-accent2)">${assets.length}</div>
          <div class="ov-kpi-lbl">Assets</div>
        </div>
        <div class="ov-kpi card-nav" data-nav="assets" data-zone="__all__">
          <div class="ov-kpi-val" style="color:#f87171">${pwnedAssets.length}</div>
          <div class="ov-kpi-lbl">Pwned</div>
        </div>
        <div class="ov-kpi card-nav" data-nav="tickets" data-ticket-list="1">
          <div class="ov-kpi-val" style="color:#fb923c">${openTickets.length}</div>
          <div class="ov-kpi-lbl">Open Tickets</div>
        </div>
        <div class="ov-kpi">
          <div class="ov-kpi-val" style="color:#4ade80">${objPct}%</div>
          <div class="ov-kpi-lbl">Objectives</div>
        </div>
        <div class="ov-kpi">
          <div class="ov-kpi-val" style="color:var(--c-text2)">${subitems.length}</div>
          <div class="ov-kpi-lbl">Data Items</div>
        </div>
      </div>

      <!-- 2-column dashboard -->
      <div class="ov-grid">

        <!-- LEFT COLUMN -->
        <div class="ov-col">

          <!-- Activity sparkline -->
          <div class="ov-card">
            <div class="ov-card-hdr">
              <span class="ov-card-title">📈 Activity</span>
              <span class="ov-card-sub">Last 30 days</span>
            </div>
            <div class="ov-spark">
              ${timelineDays.map((d, i) => {
                const h = Math.round((timelineVals[i] / timelineMax) * 100);
                return `<div class="ov-spark-bar" title="${d}: ${timelineVals[i]} changes" style="--h:${Math.max(h, 3)}%"></div>`;
              }).join('')}
            </div>
            <div class="ov-spark-axis">
              <span>${timelineDays[0]?.slice(5) || ''}</span>
              <span>${timelineDays[timelineDays.length - 1]?.slice(5) || ''}</span>
            </div>
          </div>

          <!-- Recent activity feed -->
          <div class="ov-card ov-card-feed">
            <div class="ov-card-hdr">
              <span class="ov-card-title">🕐 Recent Activity</span>
              <button class="btn btn-ghost btn-xs card-nav" data-nav="changelog">View all →</button>
            </div>
            <div class="ov-feed">${recentHtml}</div>
          </div>

          <!-- Open tickets -->
          <div class="ov-card">
            <div class="ov-card-hdr">
              <span class="ov-card-title">🎫 Open Tickets</span>
              ${openTickets.length > 8 ? `<span class="ov-card-sub">+${openTickets.length - 8} more</span>` : ''}
              <button class="btn btn-ghost btn-xs card-nav" data-nav="tickets" data-ticket-list="1">View all →</button>
            </div>
            <div class="ov-tickets">${ticketsHtml}</div>
          </div>

        </div><!-- /LEFT -->

        <!-- RIGHT COLUMN -->
        <div class="ov-col">

          <!-- Objectives -->
          <div class="ov-card">
            <div class="ov-card-hdr">
              <span class="ov-card-title">🎯 Objectives</span>
              <button class="btn btn-ghost btn-xs" id="btn-add-obj">+ Add</button>
            </div>
            ${objectives.length ? `
              <div class="ov-obj-ring-row">
                <svg viewBox="0 0 120 120" class="ov-ring-svg" width="100" height="100">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--c-border)" stroke-width="8"/>
                  ${objInProgress.length ? `<circle cx="60" cy="60" r="50" fill="none" stroke="#facc15" stroke-width="8"
                    stroke-dasharray="${Math.round(((objAchieved.length + objInProgress.length) / objectives.length) * 314)} 314"
                    stroke-linecap="round" transform="rotate(-90 60 60)" />` : ''}
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#4ade80" stroke-width="8"
                    stroke-dasharray="${Math.round((objAchieved.length / objectives.length) * 314)} 314"
                    stroke-linecap="round" transform="rotate(-90 60 60)" />
                  <text x="60" y="56" text-anchor="middle" fill="var(--c-text)" font-size="22" font-weight="700">${objPct}%</text>
                  <text x="60" y="74" text-anchor="middle" fill="var(--c-text3)" font-size="10">${objAchieved.length}/${objectives.length}</text>
                </svg>
                <div class="ov-obj-legend">
                  <span class="ov-legend-item"><span class="ov-dot" style="background:#4ade80"></span> Achieved ${objAchieved.length}</span>
                  <span class="ov-legend-item"><span class="ov-dot" style="background:#facc15"></span> In progress ${objInProgress.length}</span>
                  <span class="ov-legend-item"><span class="ov-dot" style="background:var(--c-text3)"></span> Pending ${objPending.length}</span>
                </div>
              </div>
              <div class="ov-obj-list">${objectivesListHtml}</div>
            ` : '<div class="ov-empty-hint">No objectives defined yet</div>'}
          </div>

          <!-- Targets -->
          <div class="ov-card">
            <div class="ov-card-hdr">
              <span class="ov-card-title">🏢 Targets</span>
              <button class="btn btn-ghost btn-xs" id="btn-add-target">+ Add</button>
            </div>
            <div class="targets-list" id="targets-list">${targetsHtml || '<span class="ov-empty-hint">No targets defined.</span>'}</div>
          </div>

          <!-- Mission Briefing -->
          <div class="ov-card">
            <div class="ov-card-hdr">
              <span class="ov-card-title">📝 Mission Briefing</span>
          <div style="display:flex;gap:4px;align-items:center">
            <div class="md-tab-group">
              <button class="md-tab" id="ctx-tab-edit">Edit</button>
              <button class="md-tab md-tab-active" id="ctx-tab-preview">Preview</button>
            </div>
            <button class="btn btn-primary btn-xs" id="btn-save-context">Save</button>
          </div>
        </div>
        <div id="ctx-edit-pane" style="display:none;margin-top:8px">
          <div class="compose-toolbar">
            <button class="compose-tb-btn" data-wrap="**" title="Bold"><b>B</b></button>
            <button class="compose-tb-btn" data-wrap="*" title="Italic"><i>I</i></button>
            <button class="compose-tb-btn" data-wrap="\`" title="Inline code"><code style="font-size:10px">{}</code></button>
            <div class="compose-toolbar-sep"></div>
            <button class="compose-tb-btn" data-prefix="> " title="Quote">❝</button>
            <button class="compose-tb-btn" data-prefix="- " title="Bullet list">≡</button>
            <button class="compose-tb-btn" data-block="1" title="Code block">⬛</button>
            <div class="compose-toolbar-sep"></div>
            <button class="compose-tb-btn" data-prefix="# " title="Heading 1">H1</button>
            <button class="compose-tb-btn" data-prefix="## " title="Heading 2">H2</button>
            <span class="compose-md-hint">Markdown supported</span>
          </div>
          <textarea id="context-editor" rows="10" class="compose-textarea" style="border-radius:0 0 6px 6px;width:100%;box-sizing:border-box">${escHtml(m.context || '')}</textarea>
        </div>
        <div id="ctx-preview-pane" class="ctx-preview" style="margin-top:8px">${m.context ? renderMarkdown(m.context) : '<span class="ov-empty-hint">No notes yet. Click Edit to add context.</span>'}</div>
      </div>

        </div><!-- /RIGHT -->
      </div><!-- /ov-grid -->`;

    this.bindEvents();
  },

  bindEvents() {
    const m = State.activeMission;

    qs('#btn-edit-mission')?.addEventListener('click', () => MissionsPanel.openMissionForm(m.id));

    // Clickable activity feed items → navigate to entity
    qsa('#panel-overview .ov-feed-item-link[data-entity-type]').forEach((el) => {
      el.addEventListener('click', async () => {
        const { entityType, entityId } = el.dataset;
        await AssetsPanel.navigateTo(entityType, entityId);
      });
    });

    // Clickable ticket rows → navigate directly to the ticket
    qsa('#panel-overview .ov-ticket-link[data-entity-id]').forEach((el) => {
      el.addEventListener('click', async () => {
        await AssetsPanel.navigateTo('ticket', el.dataset.entityId);
      });
    });

    // Clickable overview cards / links → navigate to panel
    qsa('#panel-overview .card-nav[data-nav]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const nav = el.dataset.nav;
        if (nav === 'assets' && el.dataset.zone) {
          State.selectedZoneId = el.dataset.zone;
        }
        if (nav === 'tickets') {
          // Always land on the list, never inside a specific ticket
          import('./panel-tickets.js?v=20260406u').then(({ TicketsPanel }) => {
            TicketsPanel._viewingTicketId = null;
          });
        }
        showPanel(nav);
      });
    });

    qs('#btn-save-context')?.addEventListener('click', async () => {
      const prev = deepClone(m);
      m.context   = qs('#context-editor').value;
      m.updatedAt = now();
      m.updatedBy = State.operatorName;
      await DB.saveMission(m);
      await logChange('update', 'mission', m.id, m.codename, 'Updated context/notes', prev, m);
      UI.toast('Notes saved', 'success');
    });

    // Edit / Preview tabs
    qs('#ctx-tab-edit')?.addEventListener('click', () => {
      // Sync textarea with any saved content before showing it
      const ta = qs('#context-editor');
      if (ta && !ta.value && m.context) ta.value = m.context;
      qs('#ctx-edit-pane').style.display = '';
      qs('#ctx-preview-pane').style.display = 'none';
      qs('#ctx-tab-edit').classList.add('md-tab-active');
      qs('#ctx-tab-preview').classList.remove('md-tab-active');
      ta?.focus();
    });
    qs('#ctx-tab-preview')?.addEventListener('click', () => {
      const text = qs('#context-editor')?.value || '';
      qs('#ctx-preview-pane').innerHTML = text
        ? renderMarkdown(text)
        : '<span class="ov-empty-hint">No notes yet. Click Edit to add context.</span>';
      qs('#ctx-edit-pane').style.display = 'none';
      qs('#ctx-preview-pane').style.display = '';
      qs('#ctx-tab-preview').classList.add('md-tab-active');
      qs('#ctx-tab-edit').classList.remove('md-tab-active');
    });

    // Markdown toolbar for context editor
    qs('#ctx-edit-pane .compose-toolbar')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.compose-tb-btn[data-wrap],.compose-tb-btn[data-prefix],.compose-tb-btn[data-block]');
      if (!btn) return;
      const ta = qs('#context-editor');
      if (!ta) return;
      const start = ta.selectionStart, end = ta.selectionEnd, sel = ta.value.slice(start, end);
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

    qs('#btn-add-target')?.addEventListener('click', () => this.addTargetDialog());
    qs('#btn-add-obj')?.addEventListener('click', () => this.addObjectiveDialog());

    qsa('#panel-overview [data-action]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const { action, oid, tid } = btn.dataset;

        if (action === 'del-target') {
          const prev = deepClone(m);
          m.targets   = (m.targets || []).filter((t) => t.id !== tid);
          m.updatedAt = now(); m.updatedBy = State.operatorName;
          await DB.saveMission(m);
          await logChange('update', 'mission', m.id, m.codename, 'Removed target', prev, m);
          await OverviewPanel.render();
        }

        if (action === 'cycle-status') {
          const statuses = ['pending', 'in-progress', 'achieved', 'dropped'];
          const obj = m.objectives.find((o) => o.id === oid);
          if (!obj) return;
          const prev = deepClone(m);
          obj.status  = statuses[(statuses.indexOf(obj.status) + 1) % statuses.length];
          m.updatedAt = now(); m.updatedBy = State.operatorName;
          await DB.saveMission(m);
          await logChange('update', 'mission', m.id, m.codename, `Objective "${truncate(obj.text,40)}" → ${obj.status}`, prev, m);
          await OverviewPanel.render();
        }

        if (action === 'edit-obj') {
          const obj = m.objectives.find((o) => o.id === oid);
          if (!obj) return;
          UI.openModal({
            title: 'Edit Objective',
            bodyHtml: `<div class="form-group"><label class="form-label">Objective text</label>
              <textarea id="edit-obj-text" rows="3">${escHtml(obj.text)}</textarea></div>`,
            onConfirm: async () => {
              const prev = deepClone(m);
              obj.text = qs('#edit-obj-text').value.trim() || obj.text;
              m.updatedAt = now(); m.updatedBy = State.operatorName;
              await DB.saveMission(m);
              await logChange('update', 'mission', m.id, m.codename, `Updated objective`, prev, m);
              UI.closeModal();
              await OverviewPanel.render();
            },
          });
        }

        if (action === 'del-obj') {
          const obj = m.objectives.find((o) => o.id === oid);
          if (!obj) return;
          UI.confirm(`Delete objective: "${truncate(obj.text, 60)}"?`, async () => {
            const prev = deepClone(m);
            m.objectives = m.objectives.filter((o) => o.id !== oid);
            m.updatedAt  = now(); m.updatedBy = State.operatorName;
            await DB.saveMission(m);
            await logChange('update', 'mission', m.id, m.codename, `Deleted objective`, prev, m);
            UI.closeModal();
            await OverviewPanel.render();
          });
        }
      });
    });
  },

  addTargetDialog() {
    const m = State.activeMission;
    UI.openModal({
      title: 'Add Target',
      bodyHtml: `<div class="form-group"><label class="form-label">Target name / IP / domain</label>
        <input type="text" id="new-target-name" placeholder="AcmeCorp, 10.0.0.1, *.acme.com" /></div>`,
      onConfirm: async () => {
        const name = qs('#new-target-name').value.trim();
        if (!name) return;
        const prev = deepClone(m);
        m.targets = [...(m.targets || []), { id: generateId(), name }];
        m.updatedAt = now(); m.updatedBy = State.operatorName;
        await DB.saveMission(m);
        await logChange('update', 'mission', m.id, m.codename, `Added target: ${name}`, prev, m);
        UI.closeModal();
        await OverviewPanel.render();
      },
    });
  },

  addObjectiveDialog() {
    const m = State.activeMission;
    UI.openModal({
      title: 'Add Objective',
      bodyHtml: `<div class="form-group"><label class="form-label">Objective</label>
        <textarea id="new-obj-text" rows="3" placeholder="e.g. Obtain access to CEO email inbox"></textarea></div>`,
      onConfirm: async () => {
        const text = qs('#new-obj-text').value.trim();
        if (!text) return;
        const prev = deepClone(m);
        const obj  = { id: generateId(), text, status: 'pending', createdAt: now(), createdBy: State.operatorName };
        m.objectives = [...(m.objectives || []), obj];
        m.updatedAt  = now(); m.updatedBy = State.operatorName;
        await DB.saveMission(m);
        await logChange('update', 'mission', m.id, m.codename, `Added objective: "${truncate(text,50)}"`, prev, m);
        UI.closeModal();
        await OverviewPanel.render();
      },
    });
  },
};
