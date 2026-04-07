/**
 * @fileoverview AssetsPanel — network zones & asset tree
 *
 * Also exports shared helpers used by SearchPanel, TicketsPanel, and OverviewPanel:
 *  - ASSET_ICON, assetIcon, subitemIcon, detectIpIcon, openIconPicker
 *  - ASSET_STATUSES, normalizeStatuses
 *  - QUERY_KEYWORDS, parseQuery, matchDescriptor, descriptorFromEl
 *
 * @module panel-assets
 */

import {
  State, DB, UI, logChange, showPanel,
  ASSET_ICONS, ICON_CATEGORIES, ASSET_ICON_MAP, PARSER_ICON_MAP, getAssetIconSvg,
  PARSERS, detectParsers, runParser,
  generateId, now, formatDate, formatDateFull, timeAgo,
  truncate, escHtml, highlight, matchesQuery,
  debounce, qs, qsa, el, deepClone,
  readFileAsDataURL, createThumbnail,
  renderAttachmentStrip, Lightbox,
} from './core.js?v=20260407g';

// ── Lazy reference to TicketsPanel (set by app.js after import) ─────────
let _TicketsPanel = null;
export function setTicketsPanelRef(tp) { _TicketsPanel = tp; }

// ═══════════════════════════════════════════════════════════════════════════
//  SHARED ASSET HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Default asset icon (fallback when no icon is assigned) */
export const ASSET_ICON = '📦';

/** Resolve the display icon for an asset object (returns SVG span or emoji) */
export function assetIcon(asset) {
  return (asset && asset.icon) ? getAssetIconSvg(asset.icon) : ASSET_ICON;
}

/** Resolve the display icon for a data item (returns SVG span or emoji) */
export function subitemIcon(item) {
  if (!item) return '📄';
  if (item.icon) return getAssetIconSvg(item.icon);
  // Fall back to the auto-detected parser icon (stored in parsedType)
  const parsedIcon = item.parsedType && PARSER_ICON_MAP[item.parsedType];
  if (parsedIcon) return getAssetIconSvg(parsedIcon);
  return '📄';
}

/**
 * Returns 'ipv4' or 'ipv6' if text is a bare IP address (with optional CIDR/prefix).
 */
export function detectIpIcon(text) {
  const t = (text || '').trim();
  if (!t) return null;
  if (/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(t)) return 'ipv4';
  if (/^[0-9a-f:%]+(?:\/\d{1,3})?$/i.test(t) && t.includes(':') && /[0-9a-f]/i.test(t)) return 'ipv6';
  return null;
}

/**
 * Open a filterable icon picker dropdown anchored to an element.
 */
export function openIconPicker(anchor, currentId, onSelect) {
  document.querySelectorAll('.icon-picker-overlay').forEach(e => e.remove());

  const overlay = el('div', { className: 'icon-picker-overlay' });
  const picker = el('div', { className: 'icon-picker-dropdown' });

  picker.innerHTML = `
    <div class="icon-picker-search-wrap">
      <input type="text" class="icon-picker-search" placeholder="Search icons…" autofocus />
    </div>
    <div class="icon-picker-grid">${_renderIconGrid('', currentId)}</div>`;

  overlay.appendChild(picker);
  document.body.appendChild(overlay);

  const rect = anchor.getBoundingClientRect();
  picker.style.top = Math.min(rect.bottom + 4, window.innerHeight - 360) + 'px';
  picker.style.left = Math.max(4, Math.min(rect.left, window.innerWidth - 340)) + 'px';

  const searchInput = picker.querySelector('.icon-picker-search');
  const grid = picker.querySelector('.icon-picker-grid');

  searchInput.addEventListener('input', () => {
    grid.innerHTML = _renderIconGrid(searchInput.value.trim().toLowerCase(), currentId);
  });

  picker.addEventListener('click', (e) => {
    const item = e.target.closest('.icon-picker-item');
    if (!item) return;
    const iconId = item.dataset.iconId;
    onSelect(iconId === 'default' ? null : iconId);
    overlay.remove();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const onKey = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);

  setTimeout(() => searchInput.focus(), 50);
}

function _renderIconGrid(filter, currentId) {
  let html = '';
  for (const [catId, cat] of Object.entries(ICON_CATEGORIES)) {
    const icons = ASSET_ICONS.filter(i =>
      i.category === catId &&
      (!filter || i.name.toLowerCase().includes(filter) || i.keywords.some(k => k.includes(filter)))
    );
    if (!icons.length) continue;
    html += `<div class="icon-picker-cat">${cat.icon} ${cat.label}</div>`;
    html += icons.map(i => `
      <div class="icon-picker-item ${i.id === (currentId || 'default') ? 'selected' : ''}" data-icon-id="${i.id}" title="${escHtml(i.name)}">
        <span class="icon-picker-item-svg">${i.id === 'default' ? '📦' : i.svg}</span>
        <span class="icon-picker-item-label">${escHtml(i.name)}</span>
      </div>`).join('');
  }
  return html;
}

/** Available asset statuses (multi-select) */
export const ASSET_STATUSES = {
  pwned:       { label: 'Pwned',        icon: '🔓', color: '#f87171' },
  hvt:         { label: 'HVT',         icon: '🎯', color: '#facc15' },
  interesting: { label: 'Interesting',  icon: '👁',  color: '#38bdf8' },
  todo:        { label: 'Todo',         icon: '📌', color: '#fb923c' },
  done:        { label: 'Done',         icon: '✅', color: '#4ade80' },
};
const STATUS_ALIASES = { owned: 'pwned' };
export function normalizeStatuses(arr) {
  return (arr || []).map(s => STATUS_ALIASES[s] || s);
}

// ── Shared query language (used by AssetsPanel filter AND SearchPanel) ──
export const QUERY_KEYWORDS = {
  'HVT':         { desc: 'High-Value Target status',  test: d => d.statuses.includes('hvt') },
  'TODO':        { desc: 'Todo status',               test: d => d.statuses.includes('todo') },
  'PWNED':       { desc: 'Pwned status',              test: d => d.statuses.includes('pwned') },
  'Interesting': { desc: 'Interesting status',         test: d => d.statuses.includes('interesting') },
  'Done':        { desc: 'Done status',               test: d => d.statuses.includes('done') },
  'hasTickets':  { desc: 'Has open tickets',          test: d => d.hasTickets },
  'isKey':       { desc: 'Key asset',                 test: d => d.isKey },
  'isAsset':     { desc: 'Asset node (not data item)', test: d => d.type === 'asset' },
  'isData':      { desc: 'Data item (not asset)',     test: d => d.type === 'data' },
  'isZone':      { desc: 'Zone result',               test: d => d.type === 'zone' },
  'inZone':      { desc: 'In zone (inZone=name)',      test: d => !!d.zoneName },
};

/** Split raw query string into OR/AND branches */
export function parseQuery(raw) {
  const orParts = raw.split(/\s+OR\s+/i);
  return orParts.map(part => part.split(/\s+AND\s+/i).map(t => t.trim()).filter(Boolean));
}

/**
 * Match a plain data descriptor against pre-parsed orBranches.
 */
export function matchDescriptor(desc, orBranches) {
  return orBranches.some(andTerms =>
    andTerms.every(term => {
      const inZoneMatch = term.match(/^inZone=(.+)$/i);
      if (inZoneMatch) return (desc.zoneName || '').toLowerCase().includes(inZoneMatch[1].trim().toLowerCase());
      const kw = Object.keys(QUERY_KEYWORDS).find(k => k.toLowerCase() === term.toLowerCase());
      if (kw) return QUERY_KEYWORDS[kw].test(desc);
      const t = term.toLowerCase();
      return (desc.name || '').toLowerCase().includes(t)
          || (desc.content || '').toLowerCase().includes(t);
    })
  );
}

/** Build a descriptor from a DOM tree element (for AssetsPanel filter) */
export function descriptorFromEl(domEl) {
  const name = (domEl.querySelector('.tree-label, .data-tree-label')?.textContent || '');
  const statusesRaw = domEl.dataset.statuses || '';
  return {
    name,
    content: '',
    statuses: statusesRaw ? statusesRaw.split(',').filter(Boolean) : [],
    hasTickets: domEl.dataset.hasTickets === '1',
    isKey: domEl.dataset.isKey === '1',
    type: domEl.classList.contains('data-tree-item') ? 'data' : 'asset',
    zoneName: domEl.dataset.zoneName || '',
  };
}

export const TICKET_PRIORITIES = {
  low:    { label: 'Low',    color: '#4ade80', icon: '🟢' },
  medium: { label: 'Medium', color: '#facc15', icon: '🟡' },
  high:   { label: 'High',   color: '#fb923c', icon: '🟠' },
  critical: { label: 'Critical', color: '#f87171', icon: '🔴' },
};

// ═══════════════════════════════════════════════════════════════════════════
//  ASSETS PANEL
// ═══════════════════════════════════════════════════════════════════════════

export const AssetsPanel = {
  /** Persist current selection to localStorage (scoped by mission) */
  _persistSelection() {
    const mid = State.activeMission?.id;
    if (!mid) return;
    const data = {
      zoneId:    State.selectedZoneId    || null,
      assetId:   State.selectedAssetId   || null,
      subitemId: State.selectedSubitemId || null,
    };
    try { localStorage.setItem(`hh-sel-${mid}`, JSON.stringify(data)); } catch (_) {}
  },

  _keyboardNav: false,
  _zoneForRender() {
    return State.selectedZoneId === '__all__' ? null : State.selectedZoneId;
  },

  _restoreSelection() {
    const mid = State.activeMission?.id;
    if (!mid) return;
    try {
      const raw = localStorage.getItem(`hh-sel-${mid}`);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!State.selectedZoneId    && data.zoneId)    State.selectedZoneId    = data.zoneId;
      if (!State.selectedAssetId   && data.assetId)   State.selectedAssetId   = data.assetId;
      if (!State.selectedSubitemId && data.subitemId)  State.selectedSubitemId = data.subitemId;
    } catch (_) {}
  },

  async render() {
    if (!State.activeMission) {
      qs('#panel-assets').innerHTML = '<p class="text-muted" style="padding:20px">No active operation.</p>';
      return;
    }

    this._restoreSelection();

    const zones = await DB.getZonesByMission(State.activeMission.id);

    // Ensure "Internet" zone always exists
    if (!zones.find((z) => z.name === 'Internet')) {
      const internet = {
        id: generateId(), missionId: State.activeMission.id,
        name: 'Internet', description: 'External internet-facing zone',
        color: '#22d3ee', mapX: null, mapY: null,
        createdAt: now(), createdBy: State.operatorName,
      };
      await DB.saveZone(internet);
      zones.unshift(internet);
    }

    const isAllZones  = State.selectedZoneId === '__all__';
    const isOrphanZone = State.selectedZoneId === '__orphan__';

    // Count assets with no zone for the orphan badge
    const allMissionAssets = await DB.getAssetsByMission(State.activeMission.id);
    const orphanCount = allMissionAssets.filter(a => !a.zoneIds || a.zoneIds.length === 0).length;

    const zonesHtml = `
      <div class="zone-item ${isAllZones ? 'selected' : ''}" data-zid="__all__" title="All zones" tabindex="0">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="zone-dot" style="background:linear-gradient(135deg,#f87171,#facc15,#4ade80,#38bdf8,#a78bfa)" title="All zones"></div>
          <span class="zone-name">All zones</span>
        </div>
      </div>
      <div class="zone-item ${isOrphanZone ? 'selected' : ''}" data-zid="__orphan__" title="Unzoned assets" tabindex="0">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="zone-dot" style="background:#6b7280" title="Unzoned"></div>
          <span class="zone-name" style="color:var(--c-text3);font-style:italic">Unzoned${orphanCount ? ` <span style="opacity:.7">(${orphanCount})</span>` : ''}</span>
        </div>
      </div>
    ` + zones.map((z) => `
      <div class="zone-item ${State.selectedZoneId === z.id ? 'selected' : ''}" data-zid="${z.id}" title="${escHtml(z.name)}" tabindex="0">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="zone-dot" style="background:${z.color || '#7c3aed'}" title="${escHtml(z.name)}"></div>
          <div style="display:flex;flex-direction:column;gap:1px;min-width:0">
            <span class="zone-name">${escHtml(z.name)}</span>
            ${z.ipRange ? `<span class="zone-iprange">${escHtml(z.ipRange)}</span>` : ''}
          </div>
        </div>
        <div class="zone-actions">
          <button class="btn btn-ghost btn-xs" data-action="ticket-zone" data-zid="${z.id}" title="Create ticket">🎫</button>
          <button class="btn btn-ghost btn-xs" data-action="edit-zone" data-zid="${z.id}" title="Edit zone">✎</button>
          ${z.name !== 'Internet' ? `<button class="btn btn-ghost btn-xs text-danger" data-action="del-zone" data-zid="${z.id}" title="Delete zone">✕</button>` : ''}
        </div>
      </div>`).join('');

    const hasZoneSelected = State.selectedZoneId;
    qs('#panel-assets').innerHTML = `
      <div class="assets-layout-3col" id="assets-layout">
        <div class="zones-sidebar ${State.zonesCollapsed ? 'collapsed' : ''}" id="zones-sidebar">
          <div class="zones-sidebar-header">
            <span class="section-title" style="margin:0">Zones</span>
            <div style="display:flex;gap:4px;align-items:center">
              <button class="btn btn-ghost btn-xs" id="btn-add-zone" title="Add zone">+Z</button>
              <button class="btn btn-ghost btn-xs" id="btn-toggle-zones" title="Toggle zones">${State.zonesCollapsed ? '▶' : '◀'}</button>
            </div>
          </div>
          <div class="col-filter" style="padding:4px 8px"><input type="text" id="filter-zones" placeholder="🔍 Filter zones…" class="filter-input" /></div>
          <div class="zones-list">${zonesHtml}</div>
        </div>
        <div class="col-resize-handle" id="resize-handle-zones" title="Drag to resize"></div>
        <div class="assets-pane ${State.assetsCollapsed ? 'collapsed' : ''}" id="assets-pane">
          <div class="zones-sidebar-header">
            <span class="section-title" style="margin:0" id="assets-pane-title">Assets</span>
            <div style="display:flex;gap:4px;align-items:center">
              <button class="btn btn-ghost btn-xs" id="btn-add-asset-inline" title="Add asset" style="color:var(--c-accent)">+A</button>
              <button class="btn btn-ghost btn-xs" id="btn-toggle-assets" title="Toggle assets">${State.assetsCollapsed ? '▶' : '◀'}</button>
            </div>
          </div>
          <div id="assets-pane-body">
            ${State.selectedZoneId ? '' : '<p class="text-dim" style="padding:20px">← Select a zone to view its assets</p>'}
          </div>
        </div>
        <div class="col-resize-handle" id="resize-handle-assets" title="Drag to resize"></div>
        <div class="data-viewer-pane" id="data-viewer-pane">
          ${State.selectedSubitemId ? '' : '<p class="text-dim" style="padding:20px">← Select a data item to view its content</p>'}
        </div>
      </div>`;

    // Toggle zones sidebar
    qs('#btn-toggle-zones')?.addEventListener('click', () => {
      State.zonesCollapsed = !State.zonesCollapsed;
      const sidebar = qs('#zones-sidebar');
      if (sidebar) sidebar.classList.toggle('collapsed', State.zonesCollapsed);
      qs('#btn-toggle-zones').textContent = State.zonesCollapsed ? '▶' : '◀';
    });

    // Toggle assets pane
    qs('#btn-toggle-assets')?.addEventListener('click', () => {
      State.assetsCollapsed = !State.assetsCollapsed;
      const pane = qs('#assets-pane');
      if (pane) pane.classList.toggle('collapsed', State.assetsCollapsed);
      qs('#btn-toggle-assets').textContent = State.assetsCollapsed ? '▶' : '◀';
    });

    this._initColumnResize('resize-handle-zones',  'zones-sidebar', 'left');
    this._initColumnResize('resize-handle-assets', 'assets-pane',   'left');

    this.bindEvents();

    // Zone filter
    qs('#filter-zones')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      qsa('.zones-list .zone-item').forEach((item) => {
        const name = item.querySelector('.zone-name')?.textContent?.toLowerCase() || '';
        item.style.display = name.includes(q) ? '' : 'none';
      });
    });

    // Keyboard nav for zones
    const zonesList = qs('.zones-list');
    if (zonesList) {
      zonesList.addEventListener('keydown', (e) => {
        const focused = document.activeElement;
        if (!focused?.classList.contains('zone-item')) return;

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const visible = [...zonesList.querySelectorAll('.zone-item')].filter((el) => el.style.display !== 'none');
          const idx = visible.indexOf(focused);
          const next = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
          if (next >= 0 && next < visible.length) visible[next].focus();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          focused.click();
          setTimeout(() => {
            const firstItem = qs('#asset-tree .tree-item[tabindex], #asset-tree .data-tree-item[tabindex]');
            if (firstItem) firstItem.focus();
          }, 150);
        } else if (e.key === 'Tab' && !e.shiftKey) {
          e.preventDefault();
          const firstItem = qs('#asset-tree .tree-item[tabindex], #asset-tree .data-tree-item[tabindex]');
          if (firstItem) { firstItem.focus(); }
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          const filterInput = qs('#filter-zones');
          if (filterInput) {
            filterInput.focus();
            filterInput.value += e.key;
            filterInput.dispatchEvent(new Event('input'));
          }
        }
      });
    }

    // Default: auto-select first zone (or '__all__' if no zones exist)
    if (!State.selectedZoneId) {
      State.selectedZoneId = zones[0]?.id || '__all__';
      this._persistSelection();
      const selItem = qs(`.zone-item[data-zid="${State.selectedZoneId}"]`);
      if (selItem) selItem.classList.add('selected');
    }

    try {
      if (State.selectedZoneId) await this.renderAssets(this._zoneForRender());
      if (State.selectedSubitemId) await this.showSubitemContent(State.selectedSubitemId);
      else if (State.selectedAssetId) await this.showAssetDetail(State.selectedAssetId);
    } catch (err) {
      console.error('[AssetsPanel] render error:', err);
      const pane = qs('#assets-pane');
      if (pane) pane.innerHTML = '<p class="text-dim" style="padding:20px;color:var(--c-danger)">⚠ Error loading assets. Try selecting the zone again.</p>';
    }

    const focusedZone = qs('.zone-item.selected');
    if (focusedZone) focusedZone.focus();
  },

  _saveTreeState() {
    const expanded = new Set();
    qsa('[data-children]').forEach(n => {
      if (n.style.display !== 'none') expanded.add('c:' + n.dataset.children);
    });
    qsa('[data-dchildren]').forEach(n => {
      if (n.style.display !== 'none') expanded.add('d:' + n.dataset.dchildren);
    });
    return { expanded, filter: qs('#filter-assets')?.value || '' };
  },

  _restoreTreeState(state) {
    if (!state) return;
    state.expanded.forEach(key => {
      if (key.startsWith('c:')) {
        const id = key.slice(2);
        const node = qs(`[data-children="${id}"]`);
        const btn  = qs(`[data-toggle="${id}"]`);
        if (node) { node.style.display = 'block'; if (btn) btn.classList.add('open'); }
      } else if (key.startsWith('d:')) {
        const id = key.slice(2);
        const node = qs(`[data-dchildren="${id}"]`);
        const btn  = qs(`[data-dtoggle="${id}"]`);
        if (node) { node.style.display = 'block'; if (btn) btn.classList.add('open'); }
      }
    });
    if (state.filter) {
      const fi = qs('#filter-assets');
      if (fi) { fi.value = state.filter; fi.dispatchEvent(new Event('input')); }
    }
  },

  async renderAssets(zoneId) {
    const _savedTreeState = this._saveTreeState();
    const isOrphan = zoneId === '__orphan__';
    const zone     = (isOrphan || !zoneId) ? null : await DB.getZone(zoneId);
    let assets;
    if (isOrphan) {
      const all = await DB.getAssetsByMission(State.activeMission.id);
      assets = all.filter(a => !a.zoneIds || a.zoneIds.length === 0);
    } else if (zoneId) {
      assets = await DB.getAssetsByZone(zoneId);
    } else {
      assets = await DB.getAssetsByMission(State.activeMission.id);
    }
    const allZones = await DB.getZonesByMission(State.activeMission.id);
    this._zoneNameMap = Object.fromEntries(allZones.map(z => [z.id, z.name]));
    const rootAssets = assets.filter((a) => !a.parentId);

    const pane = qs('#assets-pane');
    if (!pane) return;

    let treeHtml = '';
    for (const a of rootAssets) {
      treeHtml += await this._assetNode(a, assets);
    }

    const title = isOrphan ? 'Unzoned' : (zone ? zone.name : 'All zones');
    const titleEl = qs('#assets-pane-title');
    if (titleEl) titleEl.textContent = `${title} — Assets (${rootAssets.length})`;

    const body = qs('#assets-pane-body');
    if (!body) return;
    body.innerHTML = `
      <div class="col-filter" style="padding:0 8px 6px;position:relative">
        <input type="text" id="filter-assets" placeholder="🔍 Filter… (HVT, PWNED AND hasTickets…)" class="filter-input" autocomplete="off" />
        <div id="filter-autocomplete" class="filter-autocomplete" style="display:none"></div>
      </div>
      <div class="tree-node tree-node-root" id="asset-tree">${treeHtml || '<p class="text-dim" style="padding:20px">No assets yet. Click <b>+A</b> above.</p>'}</div>`;

    // Re-bind +A in case it was re-rendered (first load the pane-level handler suffices,
    // but guard against edge cases by refreshing the listener via event delegation in bindEvents)

    this.bindTreeEvents();

    // ── Query-aware filter with autocomplete ──
    const filterInput = qs('#filter-assets');
    const acBox = qs('#filter-autocomplete');

    function applyFilterCompletion(kw) {
      const parts = filterInput.value.split(/\s+(AND|OR)\s+/i);
      parts[parts.length - 1] = kw;
      filterInput.value = parts.join(' ');
      acBox.style.display = 'none';
      filterInput.dispatchEvent(new Event('input'));
      filterInput.focus();
    }
    function updateAutocomplete() {
      const val = filterInput.value;
      const lastToken = val.split(/\s+(?:AND|OR)\s+/i).pop().trim();
      if (!lastToken) { acBox.style.display = 'none'; return; }

      const inZoneMatch = lastToken.match(/^inZone=(.*)$/i);
      if (inZoneMatch) {
        const typed = inZoneMatch[1].toLowerCase();
        const zoneMatches = allZones.filter(z => !typed || z.name.toLowerCase().includes(typed));
        if (!zoneMatches.length) { acBox.style.display = 'none'; return; }
        acBox.innerHTML = zoneMatches.slice(0, 8).map(z =>
          `<div class="filter-ac-item" data-kw="${escHtml('inZone=' + z.name)}"><b>inZone=</b>${escHtml(z.name)}</div>`
        ).join('') + `<div class="filter-ac-hint">Use <b>AND</b> / <b>OR</b> to combine</div>`;
        acBox.style.display = 'block';
        acBox.querySelectorAll('.filter-ac-item').forEach(item =>
          item.addEventListener('mousedown', (e) => { e.preventDefault(); applyFilterCompletion(item.dataset.kw); })
        );
        return;
      }

      const lastTokenLower = lastToken.toLowerCase();
      const matches = Object.entries(QUERY_KEYWORDS).filter(([k]) =>
        k.toLowerCase().startsWith(lastTokenLower) && k.toLowerCase() !== lastTokenLower
      );
      if (!matches.length) { acBox.style.display = 'none'; return; }
      acBox.innerHTML = matches.map(([k, v]) => {
        const completion = k === 'inZone' ? 'inZone=' : k;
        return `<div class="filter-ac-item" data-kw="${escHtml(completion)}"><b>${escHtml(completion)}</b> <span style="color:var(--c-text3);font-size:11px">${escHtml(v.desc)}</span></div>`;
      }).join('') + `<div class="filter-ac-hint">Use <b>AND</b> / <b>OR</b> to combine</div>`;
      acBox.style.display = 'block';
      acBox.querySelectorAll('.filter-ac-item').forEach(item =>
        item.addEventListener('mousedown', (e) => { e.preventDefault(); applyFilterCompletion(item.dataset.kw); })
      );
    }

    filterInput?.addEventListener('input', (e) => {
      const raw = e.target.value.trim();
      updateAutocomplete();
      if (!raw) {
        qsa('#asset-tree .tree-item').forEach((t) => t.style.display = '');
        qsa('#asset-tree .data-tree-item').forEach((t) => t.style.display = '');
        qsa('#asset-tree .tree-node[data-children]').forEach((n) => n.style.display = 'none');
        qsa('#asset-tree .data-tree-node[data-dchildren]').forEach((n) => n.style.display = 'none');
        return;
      }
      const orBranches = parseQuery(raw);

      function filterAssetNode(assetEl, parentMatched) {
        const selfMatch = matchDescriptor(descriptorFromEl(assetEl), orBranches);
        const dominated = parentMatched || selfMatch;
        const aid = assetEl.dataset.assetId;
        const childrenNode = document.querySelector(`[data-children="${aid}"]`);

        let anyDescendantMatch = false;
        if (childrenNode) {
          const directSubAssets = [];
          for (const child of childrenNode.children) {
            if (child.classList.contains('tree-item') && child.dataset.assetId) {
              directSubAssets.push(child);
            }
          }
          for (const subEl of directSubAssets) {
            if (filterAssetNode(subEl, dominated)) anyDescendantMatch = true;
          }

          const dataItems = [];
          for (const child of childrenNode.children) {
            if (child.classList.contains('data-tree-item')) {
              const diMatch = matchDescriptor(descriptorFromEl(child), orBranches);
              if (diMatch) anyDescendantMatch = true;
              dataItems.push(child);
            }
          }

          if (dominated) {
            childrenNode.querySelectorAll('.tree-item').forEach(el => el.style.display = '');
            childrenNode.querySelectorAll('.data-tree-item').forEach(el => el.style.display = '');
          } else if (anyDescendantMatch) {
            for (const subEl of directSubAssets) subEl.style.display = '';
            for (const el of dataItems) el.style.display = '';
          } else {
            for (const subEl of directSubAssets) subEl.style.display = 'none';
            for (const el of dataItems) el.style.display = 'none';
          }
        }

        const show = dominated || anyDescendantMatch;
        assetEl.style.display = show ? '' : 'none';
        if (childrenNode) childrenNode.style.display = anyDescendantMatch ? 'block' : 'none';
        return selfMatch || anyDescendantMatch;
      }

      const tree = qs('#asset-tree');
      if (tree) {
        for (const el of tree.children) {
          if (el.classList.contains('tree-item') && el.dataset.assetId) {
            filterAssetNode(el, false);
          }
        }
      }
    });
    filterInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && acBox && acBox.style.display !== 'none') {
        e.preventDefault();
        const first = acBox.querySelector('.filter-ac-item');
        if (first) applyFilterCompletion(first.dataset.kw);
      }
    });
    filterInput?.addEventListener('focus', () => updateAutocomplete());
    filterInput?.addEventListener('blur', () => setTimeout(() => { if (acBox) acBox.style.display = 'none'; }, 150));
    this._restoreTreeState(_savedTreeState);
  },

  async _assetNode(asset, allAssets) {
    const children = allAssets.filter((a) => a.parentId === asset.id);
    const isSelected = State.selectedAssetId === asset.id;
    const subitems = await DB.getSubitemsByAsset(asset.id);
    const hasContent = children.length > 0 || subitems.length > 0;
    const assetTickets = await DB.getTicketsByRef(asset.id);
    const assetHasTickets = assetTickets.some(t => t.status === 'open');
    const nStatuses = normalizeStatuses(asset.statuses);

    let childHtml = '';
    for (const c of children) {
      childHtml += await this._assetNode(c, allAssets);
    }

    const dataTreeHtml = subitems.length ? await this._buildDataTree(subitems, null, asset.id, (asset.zoneIds || []).map(zid => this._zoneNameMap?.[zid]).filter(Boolean).join(', ')) : '';

    return `
      <div class="tree-item ${isSelected ? 'selected' : ''} ${asset.isKey ? 'tree-item-key' : ''}"
           data-asset-id="${asset.id}" data-statuses="${nStatuses.join(',')}" data-is-key="${asset.isKey ? '1' : ''}" data-has-tickets="${assetHasTickets ? '1' : ''}" data-zone-name="${escHtml((asset.zoneIds || []).map(zid => this._zoneNameMap?.[zid]).filter(Boolean).join(', '))}">
        <span class="tree-toggle ${hasContent ? 'has-children' : 'invisible'}" data-toggle="${asset.id}">▶</span>
        <span class="tree-icon ${hasContent ? 'has-children' : ''}">${assetIcon(asset)}</span>
        <span class="tree-label"
              data-tooltip="Added by ${escHtml(asset.createdBy)} on ${formatDate(asset.createdAt)}">${escHtml(asset.name)}</span>
        ${asset.isKey ? '<span class="key-star" title="Key asset">★</span>' : ''}
        ${nStatuses.map(st => { const s = ASSET_STATUSES[st]; return s ? `<span class="asset-status-badge" style="background:${s.color}22;color:${s.color};border:1px solid ${s.color}44" title="${s.label}">${s.icon}</span>` : ''; }).join('')}
        <div class="tree-item-actions">
          <button class="btn btn-ghost btn-xs" data-action="add-subitem" data-asset-id="${asset.id}" title="Add data item">+</button>
        </div>
      </div>
      ${hasContent ? `<div class="tree-node" data-children="${asset.id}" style="display:none">${childHtml}${dataTreeHtml}</div>` : ''}`;
  },

  async _buildDataTree(allItems, parentId, assetId, zoneName = '') {
    const items = allItems.filter((s) => (s.parentId || null) === parentId);
    if (!items.length) return '';
    const parts = [];
    for (const s of items) {
      const children = allItems.filter((c) => c.parentId === s.id);
      const childrenHtml = children.length ? await this._buildDataTree(allItems, s.id, assetId, zoneName) : '';
      const siTickets = await DB.getTicketsByRef(s.id);
      const siHasTickets = siTickets.some(t => t.status === 'open');
      const nSt = normalizeStatuses(s.statuses);
      parts.push(`
        <div class="data-tree-item ${State.selectedSubitemId === s.id ? 'selected' : ''}" data-sid="${s.id}" data-asset-id="${assetId}" data-statuses="${nSt.join(',')}" data-has-tickets="${siHasTickets ? '1' : ''}" data-zone-name="${escHtml(zoneName)}">
          <span class="data-tree-toggle ${children.length ? 'has-children' : 'invisible'}" data-dtoggle="${s.id}">▶</span>
          <span class="tree-icon tree-icon-sm ${children.length ? 'has-children' : ''}">${subitemIcon(s)}</span>
          ${nSt.map(st => { const st2 = ASSET_STATUSES[st]; return st2 ? `<span class="asset-status-badge" style="background:${st2.color}22;color:${st2.color};border:1px solid ${st2.color}44" title="${st2.label}">${st2.icon}</span>` : ''; }).join('')}${s.mergeConflict ? '<span style="color:#facc15;font-size:12px;margin-left:2px" title="Merge conflict — click to review">⚠️</span>' : ''}<span class="data-tree-label">${escHtml(s.name)}</span>
          <div class="data-tree-actions">
            <button class="btn btn-ghost btn-xs" data-action="add-subdata" data-sid="${s.id}" data-asset-id="${assetId}" title="Add sub-data">+</button>
            <button class="btn btn-ghost btn-xs" data-action="edit-subitem" data-sid="${s.id}" data-asset-id="${assetId}" title="Edit">✎</button>
            <button class="btn btn-ghost btn-xs text-danger" data-action="del-subitem" data-sid="${s.id}" data-asset-id="${assetId}" title="Delete">✕</button>
          </div>
        </div>
        ${children.length ? `<div class="data-tree-node" data-dchildren="${s.id}" style="display:none">${childrenHtml}</div>` : ''}`);
    }
    return parts.join('');
  },

  _initColumnResize(handleId, targetId, side) {
    const handle = qs(`#${handleId}`);
    const target = qs(`#${targetId}`);
    if (!handle || !target) return;

    let startX, startW;

    const onMouseMove = (e) => {
      const dx = e.clientX - startX;
      const newW = side === 'left' ? startW + dx : startW - dx;
      const min = parseInt(getComputedStyle(target).minWidth, 10) || 42;
      const max = parseInt(getComputedStyle(target).maxWidth, 10) || window.innerWidth * 0.6;
      target.style.width = `${Math.max(min, Math.min(max, newW))}px`;
    };

    const onMouseUp = () => {
      handle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      target.style.transition = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
    };

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (targetId === 'zones-sidebar' && State.zonesCollapsed) {
        State.zonesCollapsed = false;
        target.classList.remove('collapsed');
        const btn = qs('#btn-toggle-zones');
        if (btn) btn.textContent = '◀';
      }
      startX = e.clientX;
      startW = target.getBoundingClientRect().width;
      target.style.transition = 'none';
      handle.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup',   onMouseUp);
    });
  },

  bindEvents() {
    qs('#btn-add-zone')?.addEventListener('click', () => this.openZoneForm());
    qs('#btn-add-asset-inline')?.addEventListener('click', () => {
      const zid = State.selectedZoneId;
      const preselect = (zid && zid !== '__all__' && zid !== '__orphan__') ? zid : null;
      this.openAssetForm(null, preselect);
    });

    qsa('#panel-assets [data-zid]').forEach((elem) => {
      if (!elem.classList.contains('zone-item')) return;
      elem.addEventListener('click', async (e) => {
        if (e.target.closest('[data-action]')) return;
        const zid = elem.dataset.zid;
        State.selectedZoneId = zid;
        State.selectedAssetId = null;
        State.selectedSubitemId = null;
        this._persistSelection();
        await AssetsPanel.render();
      });
    });

    qsa('#panel-assets [data-action]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const { action, zid } = btn.dataset;
        if (action === 'edit-zone') await this.openZoneForm(zid);
        if (action === 'del-zone')  await this.deleteZone(zid);
        if (action === 'ticket-zone') {
          const z = await DB.getZone(zid);
          if (_TicketsPanel) await _TicketsPanel.openCreateTicketModal('zone', zid, z?.name);
        }
      });
    });

    // Drag-and-drop: zones as drop targets
    qsa('.zones-list .zone-item').forEach((zoneEl) => {
      const zid = zoneEl.dataset.zid;
      if (zid === '__all__') return;

      zoneEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        zoneEl.classList.add('zone-drop-target');
      });
      zoneEl.addEventListener('dragleave', () => {
        zoneEl.classList.remove('zone-drop-target');
      });
      zoneEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        zoneEl.classList.remove('zone-drop-target');
        const assetId = e.dataTransfer.getData('text/asset-id');
        if (!assetId) return;
        const asset = await DB.getAsset(assetId);
        if (!asset) return;
        const zoneIds = asset.zoneIds || [];
        if (zoneIds.includes(zid)) return;
        const zone = await DB.getZone(zid);
        const zoneName = escHtml(zone?.name || zid);
        const currentZoneNames = [];
        for (const z of zoneIds) { const zObj = await DB.getZone(z); if (zObj) currentZoneNames.push(escHtml(zObj.name)); }
        UI.openModal({
          title: `Move "${escHtml(asset.name)}" to zone?`,
          bodyHtml: `
            <p style="padding:4px 0 8px;color:var(--c-text2)">
              Target zone&nbsp;: <strong>${zoneName}</strong>
            </p>
            ${currentZoneNames.length ? `<p style="padding:0 0 12px;color:var(--c-text3);font-size:12px">Currently in&nbsp;: ${currentZoneNames.join(', ')}</p>` : ''}
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary" id="zone-move-btn">📦 Move here only</button>
              <button class="btn btn-secondary" id="zone-add-btn">📌 Add to this zone too</button>
            </div>`,
          confirmLabel: '',
          cancelLabel: 'Cancel',
          onOpen: () => {
            qs('#zone-move-btn').onclick = async () => {
              await this._moveAssetToZone(assetId, zid);
              UI.closeModal();
              UI.toast(`Moved: ${asset.name} → ${zone?.name || zid}`, 'success');
              await this.render();
            };
            qs('#zone-add-btn').onclick = async () => {
              await this._addAssetToZone(assetId, zid);
              UI.closeModal();
              UI.toast(`${asset.name} also added to ${zone?.name || zid}`, 'success');
              await this.render();
            };
          },
        });
      });
    });
  },

  async _moveAssetToZone(assetId, newZoneId) {
    const asset = await DB.getAsset(assetId);
    if (!asset) return;
    asset.zoneIds = [newZoneId];
    await DB.saveAsset(asset);
    const allAssets = await DB.getAssetsByMission(asset.missionId);
    const children = allAssets.filter(a => a.parentId === assetId);
    for (const child of children) {
      await this._moveAssetToZone(child.id, newZoneId);
    }
  },

  /** Add newZoneId to the asset's zoneIds (multi-zone membership) */
  async _addAssetToZone(assetId, newZoneId) {
    const asset = await DB.getAsset(assetId);
    if (!asset) return;
    const zids = asset.zoneIds || [];
    if (!zids.includes(newZoneId)) {
      zids.push(newZoneId);
      asset.zoneIds = zids;
      await DB.saveAsset(asset);
    }
    const allAssets = await DB.getAssetsByMission(asset.missionId);
    const children = allAssets.filter(a => a.parentId === assetId);
    for (const child of children) {
      await this._addAssetToZone(child.id, newZoneId);
    }
  },

  bindTreeEvents() {
    qsa('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const childrenDiv = qs(`[data-children="${btn.dataset.toggle}"]`);
        if (childrenDiv) {
          const hidden = childrenDiv.style.display === 'none';
          childrenDiv.style.display = hidden ? 'block' : 'none';
          btn.classList.toggle('open', hidden);
        }
      });
    });

    qsa('[data-dtoggle]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const childrenDiv = qs(`[data-dchildren="${btn.dataset.dtoggle}"]`);
        if (childrenDiv) {
          const hidden = childrenDiv.style.display === 'none';
          childrenDiv.style.display = hidden ? 'block' : 'none';
          btn.classList.toggle('open', hidden);
        }
      });
    });

    // Asset click
    qsa('[data-asset-id]').forEach((item) => {
      if (!item.classList.contains('tree-item')) return;
      item.addEventListener('click', async (e) => {
        if (e.target.closest('[data-action]') || e.target.closest('[data-toggle]')) return;
        const assetId = item.dataset.assetId;
        State.selectedAssetId = assetId;
        State.selectedSubitemId = null;
        this._persistSelection();
        qsa('.tree-item').forEach((t) => t.classList.remove('selected'));
        qsa('.data-tree-item').forEach((d) => d.classList.remove('selected'));
        item.classList.add('selected');
        const childrenDiv = qs(`[data-children="${assetId}"]`);
        const toggleBtn = qs(`[data-toggle="${assetId}"]`);
        if (childrenDiv && childrenDiv.style.display === 'none') {
          childrenDiv.style.display = 'block';
          if (toggleBtn) toggleBtn.classList.add('open');
        }
        await this.showAssetDetail(assetId);
      });
    });

    // Data tree item click
    qsa('.data-tree-item').forEach((item) => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (e.target.closest('[data-action]') || e.target.closest('[data-dtoggle]')) return;
        const sid = item.dataset.sid;
        State.selectedSubitemId = sid;
        this._persistSelection();
        qsa('.data-tree-item').forEach((d) => d.classList.remove('selected'));
        item.classList.add('selected');
        await this.showSubitemContent(sid);
      });
    });

    // Asset action buttons
    qsa('#asset-tree [data-action]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const { action, assetId, sid } = btn.dataset;
        const resolveZone = async () => {
          if (State.selectedZoneId && State.selectedZoneId !== '__all__') return State.selectedZoneId;
          if (assetId) { const a = await DB.getAsset(assetId); return a?.zoneIds?.[0]; }
          return null;
        };
        if (action === 'add-child')   { const z = await resolveZone(); await this.openAssetForm(null, z || null, assetId); }
        if (action === 'edit-asset')  await this.openAssetForm(assetId);
        if (action === 'del-asset')   await this.deleteAsset(assetId);
        if (action === 'add-subitem') await this.openSubitemForm(assetId);
        if (action === 'add-subdata') await this.openSubitemForm(assetId, null, sid);
        if (action === 'edit-subitem') await this.openSubitemForm(assetId, sid);
        if (action === 'del-subitem')  await this.deleteSubitem(sid, assetId);
      });
    });

    // Tooltip on tree labels
    qsa('[data-tooltip]').forEach((elem) => {
      elem.addEventListener('mouseenter', (e) => UI.showTooltip(elem.dataset.tooltip, e.clientX, e.clientY));
      elem.addEventListener('mousemove',  (e) => UI.showTooltip(elem.dataset.tooltip, e.clientX, e.clientY));
      elem.addEventListener('mouseleave', ()  => UI.hideTooltip());
    });

    // Drag-and-drop: make assets draggable
    qsa('#asset-tree > .tree-item, #asset-tree .tree-node > .tree-item').forEach((item) => {
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', (e) => {
        const assetId = item.dataset.assetId;
        if (!assetId) return;
        e.dataTransfer.setData('text/asset-id', assetId);
        e.dataTransfer.effectAllowed = 'move';
        item.classList.add('dragging');
        qsa('.zones-list .zone-item').forEach(z => {
          if (z.dataset.zid !== '__all__') z.classList.add('zone-drop-hint');
        });
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        qsa('.zone-item').forEach(z => z.classList.remove('zone-drop-hint', 'zone-drop-target'));
      });
    });

    // Keyboard navigation for assets tree
    qsa('#asset-tree .tree-item, #asset-tree .data-tree-item').forEach((el) => {
      el.setAttribute('tabindex', '0');
    });

    const assetTree = qs('#asset-tree');
    if (assetTree) {
      assetTree.addEventListener('keydown', (e) => {
        const focused = document.activeElement;
        if (!focused || !assetTree.contains(focused)) return;

        const isTreeItem = focused.classList.contains('tree-item');
        const isDataItem = focused.classList.contains('data-tree-item');
        if (!isTreeItem && !isDataItem) return;

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const all = [...assetTree.querySelectorAll('.tree-item[tabindex], .data-tree-item[tabindex]')]
            .filter((el) => el.offsetParent !== null);
          const idx = all.indexOf(focused);
          const next = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
          if (next >= 0 && next < all.length) {
            const target = all[next];
            target.focus();
            AssetsPanel._keyboardNav = true;
            if (target.classList.contains('data-tree-item') && target.dataset.sid) {
              qsa('.tree-item').forEach((t) => t.classList.remove('selected'));
              qsa('.data-tree-item').forEach((d) => d.classList.remove('selected'));
              target.classList.add('selected');
              State.selectedSubitemId = target.dataset.sid;
              AssetsPanel._persistSelection();
              AssetsPanel.showSubitemContent(target.dataset.sid).then(() => { AssetsPanel._keyboardNav = false; target.focus(); });
            } else if (target.classList.contains('tree-item') && target.dataset.assetId) {
              qsa('.tree-item').forEach((t) => t.classList.remove('selected'));
              qsa('.data-tree-item').forEach((d) => d.classList.remove('selected'));
              target.classList.add('selected');
              State.selectedAssetId = target.dataset.assetId;
              State.selectedSubitemId = null;
              AssetsPanel._persistSelection();
              AssetsPanel.showAssetDetail(target.dataset.assetId).then(() => { AssetsPanel._keyboardNav = false; target.focus(); });
            } else {
              AssetsPanel._keyboardNav = false;
            }
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (isTreeItem) {
            const aid = focused.dataset.assetId;
            const childrenDiv = qs(`[data-children="${aid}"]`);
            const toggleBtn = qs(`[data-toggle="${aid}"]`);
            if (childrenDiv) {
              const hidden = childrenDiv.style.display === 'none';
              childrenDiv.style.display = hidden ? 'block' : 'none';
              if (toggleBtn) toggleBtn.classList.toggle('open', hidden);
            }
          } else if (isDataItem) {
            focused.click();
          }
        } else if (e.key === ' ') {
          e.preventDefault();
          if (isTreeItem) {
            const aid = focused.dataset.assetId;
            const toggle = qs(`[data-toggle="${aid}"]`);
            if (toggle && !toggle.classList.contains('invisible')) toggle.click();
          } else if (isDataItem) {
            const sid = focused.dataset.sid;
            const dtoggle = qs(`[data-dtoggle="${sid}"]`);
            if (dtoggle && !dtoggle.classList.contains('invisible')) dtoggle.click();
          }
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          const filterInput = qs('#filter-assets');
          if (filterInput) {
            filterInput.focus();
            filterInput.value += e.key;
            filterInput.dispatchEvent(new Event('input'));
          }
        }
      });
    }
  },

  // Navigate to an asset or subitem from an external panel (e.g. Overview)
  async navigateTo(entityType, entityId) {
    if (!State.activeMission) return;

    if (entityType === 'zone') {
      State.selectedZoneId = entityId;
      State.selectedAssetId = null;
      State.selectedSubitemId = null;
      showPanel('assets');
      await this.render();
    } else if (entityType === 'asset') {
      const asset = await DB.getAsset(entityId);
      if (!asset) { UI.toast('Asset not found', 'error'); return; }
      // Pick first zone, or __all__
      const zoneId = asset.zoneIds?.[0] || '__all__';
      State.selectedZoneId   = zoneId;
      State.selectedAssetId  = entityId;
      State.selectedSubitemId = null;
      showPanel('assets');
      await this.render();
      // Expand the asset node
      const childrenDiv = qs(`[data-children="${entityId}"]`);
      const toggleBtn   = qs(`[data-toggle="${entityId}"]`);
      if (childrenDiv && childrenDiv.style.display === 'none') {
        childrenDiv.style.display = 'block';
        if (toggleBtn) toggleBtn.classList.add('open');
      }
      await this.showAssetDetail(entityId);
    } else if (entityType === 'subitem') {
      const sub = await DB.getSubitem(entityId);
      if (!sub) { UI.toast('Data item not found', 'error'); return; }
      const asset = await DB.getAsset(sub.assetId);
      const zoneId = asset?.zoneIds?.[0] || '__all__';
      State.selectedZoneId    = zoneId;
      State.selectedAssetId   = sub.assetId;
      State.selectedSubitemId = entityId;
      showPanel('assets');
      await this.render();
      // Expand asset node and subitem tree
      const childrenDiv = qs(`[data-children="${sub.assetId}"]`);
      const toggleBtn   = qs(`[data-toggle="${sub.assetId}"]`);
      if (childrenDiv && childrenDiv.style.display === 'none') {
        childrenDiv.style.display = 'block';
        if (toggleBtn) toggleBtn.classList.add('open');
      }
      await this.showSubitemContent(entityId);
      // Scroll/highlight the data-tree-item
      const siEl = qs(`[data-sid="${entityId}"]`);
      if (siEl) {
        qsa('.data-tree-item').forEach(d => d.classList.remove('selected'));
        siEl.classList.add('selected');
        siEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else if (entityType === 'ticket') {
      const { TicketsPanel } = await import('./panel-tickets.js?v=20260407g');
      TicketsPanel._viewingTicketId = entityId;
      showPanel('tickets');
      await TicketsPanel.render();
    } else if (entityType === 'mission') {
      showPanel('overview');
    }
  },

  async showAssetDetail(assetId) {
    const asset = await DB.getAsset(assetId);
    if (!asset) return;
    if (State.activeMission && asset.missionId !== State.activeMission.id) return;
    const viewer = qs('#data-viewer-pane');
    if (!viewer) return;
    const zoneNames = [];
    for (const zid of (asset.zoneIds || [])) {
      const z = await DB.getZone(zid);
      if (z) zoneNames.push(escHtml(z.name));
    }

    viewer.innerHTML = `
      <div class="data-viewer-header">
        <div class="data-viewer-title">
          <span id="ad-icon-btn" class="asset-icon-pick-btn" title="Change icon">${assetIcon(asset)}</span>
          <input type="text" id="ad-name" value="${escHtml(asset.name)}" class="inline-edit-name" />
          ${asset.isKey ? '<span class="key-star" title="Key asset">★</span>' : ''}
          ${normalizeStatuses(asset.statuses).map(st => { const s = ASSET_STATUSES[st]; return s ? `<span class="asset-status-badge" style="background:${s.color}22;color:${s.color};border:1px solid ${s.color}44">${s.icon} ${s.label}</span>` : ''; }).join('')}
        </div>
        <div class="data-viewer-meta">
          Created by <b>${escHtml(asset.createdBy)}</b> · ${timeAgo(asset.createdAt)}
          ${asset.updatedBy ? ` · Updated by <b>${escHtml(asset.updatedBy)}</b> ${timeAgo(asset.updatedAt)}` : ''}
          ${zoneNames.length ? ` · Zone${zoneNames.length > 1 ? 's' : ''}: <b>${zoneNames.join('</b>, <b>')}</b>` : ''}
        </div>
      </div>
      <div class="asset-detail-form" style="padding:16px;display:flex;flex-direction:column;gap:12px;flex:1;overflow-y:auto">
        <div id="ad-attachments"></div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Description</label>
          <textarea id="ad-desc" rows="4" style="resize:vertical">${escHtml(asset.description || '')}</textarea>
        </div>
        <div class="checkbox-row" style="margin:0">
          <input type="checkbox" id="ad-key" ${asset.isKey ? 'checked' : ''} />
          <label for="ad-key">★ Key Asset</label>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Status</label>
          <div class="status-checkboxes" style="display:flex;flex-wrap:wrap;gap:8px">
            ${Object.entries(ASSET_STATUSES).map(([k, s]) => `
              <label class="status-check-label" style="color:${s.color}">
                <input type="checkbox" class="ad-status-cb" value="${k}" ${normalizeStatuses(asset.statuses).includes(k) ? 'checked' : ''} />
                ${s.icon} ${s.label}
              </label>`).join('')}
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn btn-primary btn-sm" id="ad-save">💾 Save</button>
          <button class="btn btn-secondary btn-sm" id="ad-ticket">🎫 Ticket</button>
          <button class="btn btn-ghost btn-sm text-danger" id="ad-delete">✕ Delete</button>
        </div>
        <div id="ad-status" style="font-size:11px;color:var(--c-text3)"></div>
        <div id="ad-tickets-list" style="margin-top:4px"></div>
      </div>`;

    const saveAsset = async () => {
      const name = qs('#ad-name')?.value.trim();
      if (!name) { UI.toast('Name is required', 'error'); return; }
      const prev = deepClone(asset);
      const ver = { id: generateId(), assetId: asset.id, timestamp: now(), operator: State.operatorName, state: deepClone(asset) };
      await DB.saveAssetVersion(ver);

      asset.type        = asset.type || 'other';
      asset.name        = name;
      asset.description = qs('#ad-desc')?.value.trim() || '';
      asset.isKey       = qs('#ad-key')?.checked || false;
      asset.statuses    = [...qsa('.ad-status-cb:checked')].map(cb => cb.value);
      asset.updatedAt   = now();
      asset.updatedBy   = State.operatorName;
      await DB.saveAsset(asset);
      await logChange('update', 'asset', asset.id, asset.name, `Updated asset "${asset.name}"`, prev, asset);
      const st = qs('#ad-status');
      if (st) st.textContent = `✓ Saved ${new Date().toLocaleTimeString()}`;
      if (State.selectedZoneId) await this.renderAssets(this._zoneForRender());
      await this.showAssetDetail(asset.id);
    };

    qs('#ad-save')?.addEventListener('click', saveAsset);
    qs('#ad-delete')?.addEventListener('click', () => this.deleteAsset(asset.id));
    qs('#ad-ticket')?.addEventListener('click', () => {
      if (_TicketsPanel) _TicketsPanel.openCreateTicketModal('asset', asset.id, asset.name);
    });

    qs('#ad-icon-btn')?.addEventListener('click', (e) => {
      openIconPicker(e.currentTarget, asset.icon || null, async (iconId) => {
        const prev = deepClone(asset);
        asset.icon = iconId;
        asset.updatedAt = now();
        asset.updatedBy = State.operatorName;
        await DB.saveAsset(asset);
        await logChange('update', 'asset', asset.id, asset.name, `Changed icon to "${iconId || 'default'}"`, prev, asset);
        if (State.selectedZoneId) await this.renderAssets(this._zoneForRender());
        await this.showAssetDetail(asset.id);
      });
    });

    renderAttachmentStrip('ad-attachments', 'asset', asset.id, State.activeMission.id);
    this._renderInlineTickets('ad-tickets-list', 'asset', asset.id);

    if (!this._keyboardNav) qs('#ad-name')?.focus();
  },

  async showSubitemContent(subitemId) {
    const s = await DB.getSubitem(subitemId);
    if (!s) return;
    if (State.activeMission) {
      const parentAsset = await DB.getAsset(s.assetId);
      if (parentAsset && parentAsset.missionId !== State.activeMission.id) return;
    }
    const viewer = qs('#data-viewer-pane');
    if (!viewer) return;

    let _appliedParserId   = s.parsedType || null;
    let _appliedParsedData = s.parsedData || null;
    const hasConflict      = !!s.mergeConflict;

    // Build optional conflict banner HTML
    let conflictBannerHtml = '';
    let conflictDiffHtml   = '';
    if (hasConflict) {
      const mc = s.mergeConflict;
      const winnerLabel = mc.winner === 'source' ? 'imported file (newer)' : 'local data (newer)';
      const loserLabel  = mc.winner === 'source' ? 'local data' : 'imported file';
      const loserContent = mc.content || '';
      const currentContent = s.content || '';
      // Build diff
      const diffResult = this._diffLines(loserContent, currentContent);
      conflictDiffHtml = diffResult.map(d => {
        if (d.type === 'removed') return `<div class="diff-line" style="background:rgba(248,113,113,.25);color:#f87171;text-decoration:line-through"><span class="diff-prefix" style="color:#f87171">−</span>${escHtml(d.text || '')}</div>`;
        if (d.type === 'added')   return `<div class="diff-line" style="background:rgba(74,222,128,.2);color:#4ade80"><span class="diff-prefix" style="color:#4ade80">+</span>${escHtml(d.text || '')}</div>`;
        return `<div class="diff-line diff-equal"><span class="diff-prefix"> </span>${escHtml(d.text || '')}</div>`;
      }).join('');

      conflictBannerHtml = `
        <div id="dv-conflict-banner" style="padding:10px 16px;background:rgba(250,204,21,.12);border-bottom:2px solid rgba(250,204,21,.5);font-size:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:16px">⚠️</span>
            <strong style="color:#facc15">Merge conflict</strong>
            <span class="text-dim">— current content from <b>${escHtml(winnerLabel)}</b>, discarded version from <b>${escHtml(loserLabel)}</b> (${escHtml(mc.operator)}, ${mc.timestamp ? formatDate(mc.timestamp) : '?'})</span>
          </div>
          <details id="dv-conflict-details" style="margin-top:4px">
            <summary style="cursor:pointer;font-size:11px;color:var(--c-text3);user-select:none">Show conflict diff (${escHtml(loserLabel)} → current)</summary>
            <div class="diff-view" style="max-height:300px;overflow:auto;margin-top:6px;border:1px solid var(--c-border);border-radius:4px">${conflictDiffHtml}</div>
            <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-secondary btn-xs" id="dv-conflict-use-other">↩ Use discarded version</button>
              <button class="btn btn-primary btn-xs" id="dv-conflict-accept">✓ Accept current (resolve conflict)</button>
            </div>
          </details>
        </div>`;
    }

    viewer.innerHTML = `
      <div class="data-viewer-header" style="padding:12px 16px;border-bottom:1px solid var(--c-border);flex-shrink:0">
        <div style="display:flex;align-items:center;gap:8px">
          <span id="dv-si-icon-btn" class="asset-icon-pick-btn" title="Change icon">${subitemIcon(s)}</span>
          <input type="text" id="dv-si-name" value="${escHtml(s.name)}" style="flex:1;font-weight:600;font-size:14px" />
          ${hasConflict ? '<span style="color:#facc15;font-size:14px" title="Merge conflict — review below">⚠️</span>' : ''}
          <button class="btn btn-ghost btn-xs" id="dv-ticket-si" title="Create ticket">🎫</button>
          <button class="btn btn-ghost btn-xs" id="dv-copy-si" title="Copy content">📋</button>
          <button class="btn btn-ghost btn-xs text-danger" id="dv-del-si" title="Delete">✕</button>
        </div>
        <div class="data-viewer-meta">
          Added by <b>${escHtml(s.createdBy)}</b> · ${timeAgo(s.createdAt)}${s.updatedBy ? ` · Updated by <b>${escHtml(s.updatedBy)}</b> ${timeAgo(s.updatedAt)}` : ''}
        </div>
      </div>
      ${conflictBannerHtml}
      <div id="dv-si-attachments" style="padding:0 16px"></div>
      <div id="dv-content-zone" style="flex:1;display:flex;flex-direction:column;overflow:hidden">
        <div id="dv-diff-top-header" class="diff-header" style="display:none"></div>
        <textarea id="dv-si-content" style="flex:1;min-height:60px;font-family:var(--font-mono);font-size:12px;line-height:1.5;padding:12px 16px;border:none;background:transparent;color:var(--c-text1);resize:none;outline:none;overflow:auto">${escHtml(s.content)}</textarea>
        <div id="dv-diff-resize-handle" class="dv-diff-resize-handle" style="display:none" title="Drag to resize"></div>
        <div id="dv-version-diff-area" style="display:none;overflow:auto;min-height:60px"></div>
      </div>
      <div id="dv-parse-zone" style="padding:0 16px"></div>
      <div style="padding:8px 16px;border-top:1px solid var(--c-border);display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" id="dv-save-si">💾 Save</button>
        <span id="dv-si-status" style="font-size:11px;color:var(--c-text3)"></span>
        <div style="flex:1"></div>
        <div class="checkbox-row" style="margin:0;font-size:12px">
          <input type="checkbox" id="dv-si-auto-detect" checked />
          <label for="dv-si-auto-detect">🔍 Auto-detect</label>
        </div>
      </div>
      <div style="padding:4px 16px;border-top:1px solid var(--c-border);display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--c-text3)">Status:</span>
        <div class="status-checkboxes" style="display:flex;flex-wrap:wrap;gap:6px">
          ${Object.entries(ASSET_STATUSES).map(([k, st]) => `
            <label class="status-check-label" style="color:${st.color};font-size:11px">
              <input type="checkbox" class="dv-status-cb" value="${k}" ${normalizeStatuses(s.statuses).includes(k) ? 'checked' : ''} />
              ${st.icon} ${st.label}
            </label>`).join('')}
        </div>
      </div>
      <div id="dv-tickets-list" style="padding:0 16px"></div>
      <div id="dv-versions-area"></div>`;

    await this._refreshVersionHistory(subitemId);
    renderAttachmentStrip('dv-si-attachments', 'subitem', s.id, State.activeMission.id);
    this._renderInlineTickets('dv-tickets-list', 'subitem', s.id);

    const textarea  = qs('#dv-si-content');
    const nameInput = qs('#dv-si-name');
    const parseZone = qs('#dv-parse-zone');
    let _manualIcon  = !!s.icon;
    let _autoIconId  = null;
    // An item is "new" if it has no saved content yet – auto-detect may rename freely
    const _isNewItem = !s.content?.trim();

    const _applyParser = (pid, text) => {
      const result = runParser(pid, text);
      if (!result) { UI.toast('Parser returned no result', 'error'); return false; }
      if (nameInput) nameInput.value = result.suggestedItemName || nameInput.value;
      _appliedParserId   = pid;
      _appliedParsedData = result.parsedData;
      const autoIcon = PARSER_ICON_MAP[pid];
      if (autoIcon && !_manualIcon) {
        _autoIconId = autoIcon;
        const iconBtn = qs('#dv-si-icon-btn');
        if (iconBtn) iconBtn.innerHTML = getAssetIconSvg(autoIcon);
      }
      return result;
    };

    const _renderParseZone = (candidates) => {
      if (!parseZone) return;
      const text = textarea?.value || '';

      // Build detected options (confidence-ranked)
      const detectedHtml = candidates.map((c) =>
        `<option value="${c.parser.id}" ${c.parser.id === _appliedParserId ? 'selected' : ''}>${c.parser.icon} ${c.parser.label} (${Math.round(c.confidence * 100)}%)</option>`
      ).join('');

      // Build full list of ALL parsers grouped as "Other formats"
      const detectedIds = new Set(candidates.map(c => c.parser.id));
      const otherHtml = PARSERS
        .filter(p => !detectedIds.has(p.id))
        .map(p => `<option value="${p.id}" ${p.id === _appliedParserId ? 'selected' : ''}>${p.icon} ${p.label}</option>`)
        .join('');

      const optionsHtml = (detectedHtml ? `<optgroup label="Detected">${detectedHtml}</optgroup>` : '')
        + `<optgroup label="All formats">${otherHtml}</optgroup>`;

      parseZone.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12px;flex-wrap:wrap">
          <label style="font-size:11px;color:var(--c-text3);white-space:nowrap">Format:</label>
          <select id="dv-parser-select" class="filter-input" style="flex:1;min-width:180px;max-width:320px;padding:4px 8px;font-size:12px">
            <option value="">— select —</option>
            ${optionsHtml}
          </select>
          <button class="btn btn-secondary btn-xs" id="dv-parser-apply">${_appliedParserId ? '✓ Applied' : 'Apply'}</button>
        </div>`;

      // Pre-select the applied parser if any
      const select = qs('#dv-parser-select');
      if (select && _appliedParserId) select.value = _appliedParserId;

      qs('#dv-parser-apply')?.addEventListener('click', () => {
        const pid = select?.value;
        if (!pid) { UI.toast('Select a format first', 'info'); return; }
        const result = _applyParser(pid, text);
        if (!result) return;
        if (result.suggestedName) UI.toast(`💡 Suggested asset name: ${result.suggestedName}`, 'info', 4000);
        else UI.toast(`✓ Parser "${pid}" applied`, 'success');
        qs('#dv-parser-apply').textContent = '✓ Applied';
      });

      select?.addEventListener('change', () => {
        const btn = qs('#dv-parser-apply');
        if (btn) btn.textContent = 'Apply';
      });
    };

    const doDetect = () => {
      const text = textarea?.value;
      if (!text?.trim()) { if (parseZone) parseZone.innerHTML = ''; return; }
      const candidates = detectParsers(text);
      const autoDetect = qs('#dv-si-auto-detect')?.checked;

      // Auto-apply only on NEW items when auto-detect is enabled
      if (_isNewItem && autoDetect && candidates.length) {
        const best = candidates[0];
        if (best.confidence >= 0.25) {
          _applyParser(best.parser.id, text);
        }
      }

      // Always render the format selector (detected + all parsers)
      _renderParseZone(candidates);
    };

    if (textarea) {
      const debouncedDetect = debounce(doDetect, 500);
      textarea.addEventListener('input', debouncedDetect);
      textarea.addEventListener('paste', () => setTimeout(doDetect, 50));
      // On load: detect formats but only auto-apply for new items (handled inside doDetect)
      if (s.content) setTimeout(doDetect, 100);
    }

    nameInput?.addEventListener('input', () => {
      if (_manualIcon || _appliedParserId) return;
      const ipIcon = detectIpIcon(nameInput.value);
      if (ipIcon) {
        _autoIconId = ipIcon;
        const iconBtn = qs('#dv-si-icon-btn');
        if (iconBtn) iconBtn.innerHTML = getAssetIconSvg(ipIcon);
      }
    });

    const saveSi = async () => {
      const name    = qs('#dv-si-name')?.value.trim();
      const content = qs('#dv-si-content')?.value.trim();
      if (!content) { UI.toast('Content is required', 'error'); return; }
      const snapshot = {
        id: generateId(),
        subitemId: s.id,
        timestamp: now(),
        operator: State.operatorName,
        state: deepClone(s),
      };
      await DB.saveSubitemVersion(snapshot);
      s.name       = name || 'Note';
      s.content    = content;
      s.statuses   = [...qsa('.dv-status-cb:checked')].map(cb => cb.value);
      s.parsedType = _appliedParserId;
      s.parsedData = _appliedParsedData;
      s.updatedAt  = now();
      s.updatedBy  = State.operatorName;
      // Clear merge conflict flag on manual save (user resolves by editing)
      if (s.mergeConflict) delete s.mergeConflict;
      if (!_manualIcon) {
        const resolvedIcon = _autoIconId || (_appliedParserId ? PARSER_ICON_MAP[_appliedParserId] : null) || detectIpIcon(name);
        if (resolvedIcon) s.icon = resolvedIcon;
      }
      await DB.saveSubitem(s);
      await logChange('update', 'subitem', s.id, s.name, `Updated data item "${s.name}"`, snapshot.state, s);
      const st = qs('#dv-si-status');
      if (st) st.textContent = `✓ Saved ${new Date().toLocaleTimeString()}`;
      if (State.selectedZoneId) await this.renderAssets(this._zoneForRender());
      await this._refreshVersionHistory(s.id);
    };

    qs('#dv-save-si')?.addEventListener('click', saveSi);
    qs('#dv-si-content')?.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveSi(); }
    });
    qs('#dv-si-name')?.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveSi(); }
    });
    qs('#dv-del-si')?.addEventListener('click', () => this.deleteSubitem(s.id, s.assetId));

    qs('#dv-si-icon-btn')?.addEventListener('click', (e) => {
      openIconPicker(e.currentTarget, s.icon || _autoIconId || null, async (iconId) => {
        _manualIcon = true;
        _autoIconId = null;
        const prev = deepClone(s);
        s.icon = iconId;
        s.updatedAt = now();
        s.updatedBy = State.operatorName;
        await DB.saveSubitem(s);
        await logChange('update', 'subitem', s.id, s.name, `Changed icon to "${iconId || 'default'}"`, prev, s);
        if (State.selectedZoneId) await this.renderAssets(this._zoneForRender());
        await this.showSubitemContent(s.id);
      });
    });

    qs('#dv-copy-si')?.addEventListener('click', () => {
      const content = qs('#dv-si-content')?.value || s.content;
      navigator.clipboard.writeText(content).then(() => UI.toast('Copied to clipboard', 'success'));
    });
    qs('#dv-ticket-si')?.addEventListener('click', () => {
      if (_TicketsPanel) _TicketsPanel.openCreateTicketModal('subitem', s.id, s.name);
    });

    // ── Conflict resolution handlers ────────────────────────────────────
    if (hasConflict) {
      qs('#dv-conflict-accept')?.addEventListener('click', async () => {
        delete s.mergeConflict;
        s.updatedAt = now();
        s.updatedBy = State.operatorName;
        await DB.saveSubitem(s);
        UI.toast('Conflict resolved — current version accepted', 'success');
        if (State.selectedZoneId) await this.renderAssets(this._zoneForRender());
        await this.showSubitemContent(s.id);
      });
      qs('#dv-conflict-use-other')?.addEventListener('click', async () => {
        const mc = s.mergeConflict;
        // Snapshot current state
        await DB.saveSubitemVersion({
          id: generateId(), subitemId: s.id, timestamp: now(),
          operator: State.operatorName, state: deepClone(s),
        });
        s.content = mc.content;
        delete s.mergeConflict;
        s.updatedAt = now();
        s.updatedBy = State.operatorName;
        await DB.saveSubitem(s);
        UI.toast('Conflict resolved — switched to other version', 'success');
        if (State.selectedZoneId) await this.renderAssets(this._zoneForRender());
        await this.showSubitemContent(s.id);
      });
    }

    if (!this._keyboardNav) qs('#dv-si-content')?.focus();
  },

  _versionColors: ['#f87171','#fb923c','#facc15','#a78bfa','#f472b6','#38bdf8','#2dd4bf','#c084fc'],

  _hexRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  },

  async _refreshVersionHistory(subitemId) {
    const area = qs('#dv-versions-area');
    if (!area) return;
    const versions = await DB.getSubitemVersions(subitemId);
    if (!versions.length) { area.innerHTML = ''; return; }

    const palette = this._versionColors;

    const leftOptionsHtml = `<option value="" data-vidx="-1">— select a version —</option>` +
      versions.map((v, idx) => {
        const color = palette[idx % palette.length];
        return `<option value="${v.id}" data-vidx="${idx}" data-color="${color}">${formatDate(v.timestamp)} — ${escHtml(v.operator)}</option>`;
      }).join('');

    const rightOptionsHtml = `<option value="__current__" data-vidx="-1">✏️ Current (live)</option>` +
      versions.map((v, idx) => {
        const color = palette[idx % palette.length];
        return `<option value="${v.id}" data-vidx="${idx}" data-color="${color}">${formatDate(v.timestamp)} — ${escHtml(v.operator)}</option>`;
      }).join('');

    area.innerHTML = `
      <div style="padding:6px 16px 8px;border-top:1px solid var(--c-border);display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span class="version-dot" id="dv-version-dot" style="background:var(--c-text3)"></span>
        <label style="font-size:11px;color:var(--c-text3);white-space:nowrap">Versions (${versions.length}):</label>
        <select id="dv-version-select" class="filter-input" style="flex:1;min-width:140px;max-width:280px;padding:4px 8px;font-size:12px" title="Left side (older)">${leftOptionsHtml}</select>
        <span style="font-size:11px;color:var(--c-text3);font-weight:600">vs</span>
        <select id="dv-version-select-right" class="filter-input" style="flex:1;min-width:140px;max-width:280px;padding:4px 8px;font-size:12px" title="Right side (newer)">${rightOptionsHtml}</select>
      </div>`;

    const select = qs('#dv-version-select');
    const selectRight = qs('#dv-version-select-right');
    const dot = qs('#dv-version-dot');
    const diffArea = qs('#dv-version-diff-area');
    const diffHandle = qs('#dv-diff-resize-handle');
    const self = this;

    if (diffHandle) {
      let startY = 0, startTextareaH = 0, startDiffH = 0;
      const onMouseMove = (e) => {
        const delta = e.clientY - startY;
        const textarea = qs('#dv-si-content');
        if (!textarea || !diffArea) return;
        const newTH = Math.max(60, startTextareaH + delta);
        const newDH = Math.max(60, startDiffH - delta);
        textarea.style.flex = 'none';
        textarea.style.height = newTH + 'px';
        diffArea.style.height = newDH + 'px';
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      diffHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startY = e.clientY;
        const textarea = qs('#dv-si-content');
        startTextareaH = textarea?.offsetHeight || 200;
        startDiffH = diffArea?.offsetHeight || 200;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    }

    const showVersionDiff = async () => {
      const optLeft = select?.options[select.selectedIndex];
      const textarea = qs('#dv-si-content');
      const topHeader = qs('#dv-diff-top-header');

      if (!optLeft || !optLeft.value) {
        if (diffArea) { diffArea.style.display = 'none'; diffArea.innerHTML = ''; }
        if (diffHandle) diffHandle.style.display = 'none';
        if (topHeader) { topHeader.style.display = 'none'; topHeader.innerHTML = ''; }
        if (textarea) {
          textarea.style.flex = '1'; textarea.style.height = '';
          textarea.readOnly = false;
          textarea.style.opacity = '';
          if (textarea.dataset.diffBackup) {
            textarea.value = textarea.dataset.diffBackup;
            delete textarea.dataset.diffBackup;
          }
        }
        if (dot) dot.style.background = 'var(--c-text3)';
        return;
      }

      const vidLeft = optLeft.value;
      const vidxLeft = parseInt(optLeft.dataset.vidx, 10) || 0;
      const verColorLeft = palette[vidxLeft % palette.length];
      if (dot) dot.style.background = verColorLeft;

      const verLeft = versions.find((v) => v.id === vidLeft);
      if (!verLeft || !verLeft.state) { if (diffArea) diffArea.innerHTML = ''; return; }
      const oldContent = verLeft.state.content || '';

      const optRight = selectRight?.options[selectRight.selectedIndex];
      const rightVal = optRight?.value || '__current__';
      let rightContent, rightLabel;
      const isCurrent = rightVal === '__current__';

      if (isCurrent) {
        const current = await DB.getSubitem(subitemId);
        if (textarea && textarea.dataset.diffBackup) {
          textarea.value = textarea.dataset.diffBackup;
          delete textarea.dataset.diffBackup;
        }
        rightContent = textarea?.value ?? current?.content ?? '';
        rightLabel = 'Current (live)';
      } else {
        const verRight = versions.find((v) => v.id === rightVal);
        if (!verRight || !verRight.state) { if (diffArea) diffArea.innerHTML = ''; return; }
        rightContent = verRight.state.content || '';
        rightLabel = `${formatDate(verRight.timestamp)} — ${escHtml(verRight.operator)}`;
      }

      if (textarea) {
        if (!isCurrent) {
          if (!textarea.dataset.diffBackup) {
            textarea.dataset.diffBackup = textarea.value;
          }
          textarea.value = rightContent;
          textarea.readOnly = true;
          textarea.style.opacity = '0.85';
        } else {
          textarea.readOnly = false;
          textarea.style.opacity = '';
        }
      }

      if (topHeader) {
        topHeader.style.display = '';
        if (isCurrent) {
          topHeader.innerHTML = `<span>✏️ <b>Current (live — editable)</b></span>`;
        } else {
          const optRightIdx = parseInt(optRight.dataset.vidx, 10) || 0;
          const verColorRight = palette[optRightIdx % palette.length];
          topHeader.innerHTML = `<span><span class="version-dot" style="background:${verColorRight}"></span> <b>${rightLabel}</b> <span style="opacity:.6">(read-only)</span></span>`;
        }
      }

      const diffResult = self._diffLines(oldContent, rightContent);
      const bgRemoved = self._hexRgba(verColorLeft, 0.3);
      const bgAdded   = self._hexRgba(verColorLeft, 0.4);
      const diffHtml = diffResult.map((d) => {
        if (d.type === 'removed') {
          return `<div class="diff-line" style="background:${bgRemoved};color:${verColorLeft};text-decoration:line-through"><span class="diff-prefix" style="color:${verColorLeft}">−</span>${escHtml(d.text || '')}</div>`;
        }
        if (d.type === 'added') {
          return `<div class="diff-line" style="background:${bgAdded};color:${verColorLeft}"><span class="diff-prefix" style="color:${verColorLeft}">+</span>${escHtml(d.text || '')}</div>`;
        }
        return `<div class="diff-line diff-equal"><span class="diff-prefix"> </span>${escHtml(d.text || '')}</div>`;
      }).join('') || '<div style="padding:12px 16px;color:var(--c-text3)">No differences — both versions are identical.</div>';

      if (diffArea) {
        diffArea.style.display = 'flex';
        diffArea.style.flexDirection = 'column';
        if (diffHandle) diffHandle.style.display = '';
        const contentZone = qs('#dv-content-zone');
        if (contentZone && textarea && !diffArea.dataset.resized) {
          const totalH = contentZone.offsetHeight;
          const halfH = Math.max(60, Math.floor((totalH - 8) / 2));
          textarea.style.flex = 'none';
          textarea.style.height = halfH + 'px';
          diffArea.style.height = halfH + 'px';
        }

        diffArea.innerHTML = `
          <div class="diff-header">
            <span><span class="version-dot" style="background:${verColorLeft}"></span> <b>${formatDate(verLeft.timestamp)}</b> — ${escHtml(verLeft.operator)}</span>
            <div style="display:flex;gap:6px">
              <button class="btn btn-ghost btn-xs" id="dv-version-restore" title="Restore this version">↩ Restore</button>
              <button class="btn btn-secondary btn-xs" id="dv-exit-diff" title="Exit diff mode">✕ Close diff</button>
            </div>
          </div>
          <div class="diff-legend">
            <span style="color:${verColorLeft};text-decoration:line-through">− Only in this version</span>
            <span style="color:${verColorLeft}">+ Only in version above</span>
          </div>
          <div class="diff-view" style="flex:1;overflow:auto">${diffHtml}</div>`;
        qs('#dv-version-restore')?.addEventListener('click', () => self._restoreSubitemVersion(vidLeft, subitemId));
        qs('#dv-exit-diff')?.addEventListener('click', () => {
          if (select) { select.selectedIndex = 0; }
          if (selectRight) { selectRight.selectedIndex = 0; }
          showVersionDiff();
        });
      }
    };

    select?.addEventListener('change', showVersionDiff);
    selectRight?.addEventListener('change', showVersionDiff);
  },

  /**
   * Computes a line-by-line diff using LCS (Longest Common Subsequence).
   * Uses Uint32Array to safely handle files up to ~4 billion lines.
   * @param {string} oldText
   * @param {string} newText
   * @returns {Array<{type: 'equal'|'added'|'removed', text: string}>}
   */
  _diffLines(oldText, newText) {
    const oldLines = (oldText || '').split('\n');
    const newLines = (newText || '').split('\n');
    const n = oldLines.length, m = newLines.length;
    // Guard: avoid O(n×m) memory explosion on very large texts
    if (n > 2000 || m > 2000) {
      return [{ type: 'removed', text: '(diff too large to display)' }];
    }
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = 1; i <= n; i++)
      for (let j = 1; j <= m; j++)
        dp[i][j] = oldLines[i - 1] === newLines[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    const result = [];
    let i = n, j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        result.push({ type: 'equal', text: oldLines[i - 1] });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.push({ type: 'added', text: newLines[j - 1] });
        j--;
      } else {
        result.push({ type: 'removed', text: oldLines[i - 1] });
        i--;
      }
    }
    return result.reverse();
  },

  async _viewSubitemVersion(versionId, subitemId, versionIdx = 0) {
    const versions = await DB.getSubitemVersions(subitemId);
    const ver = versions.find((v) => v.id === versionId);
    if (!ver || !ver.state) return;
    const palette = this._versionColors;
    const verColor = palette[versionIdx % palette.length];
    const current = await DB.getSubitem(subitemId);
    const currentContent = qs('#dv-si-content')?.value ?? current?.content ?? '';
    const oldContent = ver.state.content || '';
    const diffResult = this._diffLines(oldContent, currentContent);
    const bgRemoved = this._hexRgba(verColor, 0.3);
    const bgAdded   = this._hexRgba(verColor, 0.4);
    const diffHtml = diffResult.map((d) => {
      if (d.type === 'removed') return `<div class="diff-line" style="background:${bgRemoved};color:${verColor};text-decoration:line-through"><span class="diff-prefix" style="color:${verColor}">−</span>${escHtml(d.text || '')}</div>`;
      if (d.type === 'added') return `<div class="diff-line" style="background:${bgAdded};color:${verColor}"><span class="diff-prefix" style="color:${verColor}">+</span>${escHtml(d.text || '')}</div>`;
      return `<div class="diff-line diff-equal"><span class="diff-prefix"> </span>${escHtml(d.text || '')}</div>`;
    }).join('') || '<div style="padding:16px;color:var(--c-text3)">No differences found — version content is identical to current.</div>';

    const contentZone = qs('#dv-content-zone');
    if (!contentZone) return;
    contentZone.innerHTML = `
      <div class="diff-header">
        <span><span class="version-dot" style="background:${verColor}"></span> Version from <b>${formatDate(ver.timestamp)}</b> by <b>${escHtml(ver.operator)}</b></span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-xs" id="dv-back-current">← Back to editing</button>
          <button class="btn btn-primary btn-xs" id="dv-restore-this">↩ Restore this version</button>
        </div>
      </div>
      <div class="diff-legend">
        <span class="diff-legend-item" style="color:${verColor};text-decoration:line-through;opacity:0.7">− Removed</span>
        <span class="diff-legend-item" style="color:${verColor}">+ Added</span>
        <span style="font-size:10px;color:var(--c-text3)">Unchanged lines in grey</span>
      </div>
      <div class="diff-view">${diffHtml}</div>`;

    qs('#dv-back-current')?.addEventListener('click', () => this.showSubitemContent(subitemId));
    qs('#dv-restore-this')?.addEventListener('click', () => this._restoreSubitemVersion(ver.id, subitemId));
  },

  async _restoreSubitemVersion(versionId, subitemId) {
    const versions = await DB.getSubitemVersions(subitemId);
    const ver = versions.find((v) => v.id === versionId);
    if (!ver || !ver.state) return;
    UI.confirm(`Restore data item to version from ${formatDate(ver.timestamp)}?`, async () => {
      const current = await DB.getSubitem(subitemId);
      const snapshot = {
        id: generateId(), subitemId, timestamp: now(), operator: State.operatorName,
        state: deepClone(current),
      };
      await DB.saveSubitemVersion(snapshot);
      await DB.saveSubitem({ ...ver.state, id: subitemId, assetId: current.assetId });
      await logChange('update', 'subitem', subitemId, ver.state.name, `Restored data item to version from ${formatDate(ver.timestamp)}`, current, ver.state);
      UI.closeModal();
      UI.toast('Data item restored', 'success');
      if (State.selectedZoneId) await this.renderAssets(this._zoneForRender());
      await this.showSubitemContent(subitemId);
    });
  },

  async _renderInlineTickets(containerId, refType, refId) {
    const container = qs(`#${containerId}`);
    if (!container) return;
    const tickets = await DB.getTicketsByRef(refId);
    const openTickets = tickets.filter(t => t.status === 'open');
    if (!openTickets.length) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <details class="inline-tickets-details" open>
        <summary style="font-size:11px;color:var(--c-text3);cursor:pointer;user-select:none;padding:4px 0">🎫 Open tickets (${openTickets.length})</summary>
        <div style="padding:2px 0 4px">
        ${openTickets.map(t => {
          const p = TICKET_PRIORITIES[t.priority] || TICKET_PRIORITIES.medium;
          return `<div class="inline-ticket-row" data-ticket-id="${t.id}" style="display:flex;align-items:center;gap:6px;padding:3px 0;cursor:pointer;font-size:12px">
            <span style="color:${p.color}">${p.icon}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(t.title)}</span>
            <span style="font-size:10px;color:var(--c-text3)">${timeAgo(t.createdAt)}</span>
          </div>`;
        }).join('')}
        </div>
      </details>`;
    container.querySelectorAll('.inline-ticket-row').forEach(row => {
      row.addEventListener('click', () => {
        if (_TicketsPanel) _TicketsPanel._viewingTicketId = row.dataset.ticketId;
        showPanel('tickets');
      });
    });
  },

  openZoneForm(id = null) {
    const m = State.activeMission;
    (id ? DB.getZone(id) : Promise.resolve(null)).then((existing) => {
      const z = existing || {};
      UI.openModal({
        title: id ? 'Edit Zone' : 'Add Zone',
        bodyHtml: `
          <div class="form-group">
            <label class="form-label">Zone Name *</label>
            <input type="text" id="fm-zone-name" placeholder="e.g. DMZ, Internal Network" value="${escHtml(z.name || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <input type="text" id="fm-zone-desc" placeholder="Brief description" value="${escHtml(z.description || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">IP Range <span class="form-hint">(e.g. 192.168.1.0/24, 10.0.0.0/8)</span></label>
            <input type="text" id="fm-zone-iprange" placeholder="x.x.x.x/xx or x:x::/nn" value="${escHtml(z.ipRange || '')}" autocomplete="off" spellcheck="false" />
            <div id="fm-zone-iprange-hint" style="font-size:11px;color:var(--c-text3);margin-top:3px"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Color</label>
            <div style="display:flex;align-items:center;gap:10px">
              <input type="color" id="fm-zone-color" value="${z.color || '#7c3aed'}" style="width:48px;height:32px;border:none;background:none;cursor:pointer;padding:0" />
              <span id="fm-zone-color-hex" style="font-family:var(--font-mono);font-size:12px;color:var(--c-text3)">${z.color || '#7c3aed'}</span>
              <div style="display:flex;gap:4px;flex-wrap:wrap">
                ${['#7c3aed','#22d3ee','#3fb950','#d29922','#f85149','#58a6ff','#ff6b6b','#a29bfe','#e91e63','#00bcd4','#8bc34a','#ff9800'].map((c) =>
                  `<div class="color-swatch" data-color="${c}" style="width:20px;height:20px;border-radius:4px;background:${c};cursor:pointer;border:2px solid ${(z.color||'#7c3aed')===c?'var(--c-text1)':'transparent'}"></div>`
                ).join('')}
              </div>
            </div>
          </div>`,
        onConfirm: async () => {
          const name = qs('#fm-zone-name').value.trim();
          if (!name) { UI.toast('Zone name required', 'error'); return; }
          const zone = {
            id:          id || generateId(),
            missionId:   m.id,
            name,
            description: qs('#fm-zone-desc').value.trim(),
            ipRange:     qs('#fm-zone-iprange').value.trim() || null,
            color:       qs('#fm-zone-color')?.value || '#7c3aed',
            mapX:        z.mapX ?? null,
            mapY:        z.mapY ?? null,
            createdAt:   z.createdAt || now(),
            createdBy:   z.createdBy || State.operatorName,
          };
          await DB.saveZone(zone);
          if (!id) await logChange('create', 'zone', zone.id, zone.name, `Created zone "${zone.name}"`, null, zone);
          else      await logChange('update', 'zone', zone.id, zone.name, `Updated zone "${zone.name}"`, existing, zone);
          UI.closeModal();
          UI.toast(id ? 'Zone updated' : 'Zone created', 'success');
          await AssetsPanel.render();
        },
      });
      const ipRangeInput = qs('#fm-zone-iprange');
      const ipRangeHint  = qs('#fm-zone-iprange-hint');
      if (ipRangeInput && ipRangeHint) {
        const validateIpRange = () => {
          const v = ipRangeInput.value.trim();
          if (!v) { ipRangeHint.textContent = ''; return; }
          const ipv4CIDR = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(v);
          const ipv4Bare = /^(\d{1,3}\.){3}\d{1,3}$/.test(v);
          const ipv6CIDR = /^[0-9a-f:%]+\/\d{1,3}$/i.test(v) && v.includes(':');
          if (ipv4CIDR || ipv4Bare) {
            ipRangeHint.style.color = 'var(--c-success, #3fb950)';
            ipRangeHint.textContent = '✓ Valid IPv4' + (ipv4CIDR ? ' CIDR' : ' address');
          } else if (ipv6CIDR) {
            ipRangeHint.style.color = 'var(--c-success, #3fb950)';
            ipRangeHint.textContent = '✓ Valid IPv6 prefix';
          } else {
            ipRangeHint.style.color = 'var(--c-warning, #d29922)';
            ipRangeHint.textContent = '⚠ Unrecognised format — saved as-is';
          }
        };
        ipRangeInput.addEventListener('input', validateIpRange);
        validateIpRange();
      }
      const colorInput = qs('#fm-zone-color');
      const colorHex   = qs('#fm-zone-color-hex');
      if (colorInput) {
        colorInput.addEventListener('input', () => { if (colorHex) colorHex.textContent = colorInput.value; });
        qsa('.color-swatch').forEach((sw) => {
          sw.addEventListener('click', () => {
            colorInput.value = sw.dataset.color;
            if (colorHex) colorHex.textContent = sw.dataset.color;
            qsa('.color-swatch').forEach((s) => s.style.borderColor = 'transparent');
            sw.style.borderColor = 'var(--c-text1)';
          });
        });
      }
    });
  },

  async deleteZone(id) {
    const z = await DB.getZone(id);
    if (!z) return;
    UI.confirm(`Delete zone "${z.name}" and all its assets?`, async () => {
      const prev = deepClone(z);
      await DB.deleteZone(id);
      await logChange('delete', 'zone', id, z.name, `Deleted zone "${z.name}"`, prev, null);
      if (State.selectedZoneId === id) { State.selectedZoneId = null; State.selectedAssetId = null; State.selectedSubitemId = null; }
      UI.closeModal();
      UI.toast('Zone deleted', 'info');
      await AssetsPanel.render();
    });
  },

  openAssetForm(id = null, zoneId = null, parentId = null) {
    Promise.all([
      id ? DB.getAsset(id) : Promise.resolve(null),
      DB.getZonesByMission(State.activeMission.id),
    ]).then(([existing, allZones]) => {
      const a = existing || {};
      // Pre-selected zones: existing asset's zones, or the hinted zone, or nothing
      const preselectedZones = new Set(
        a.zoneIds || (zoneId ? [zoneId] : [])
      );
      let selectedIcon = a.icon || null;

      const zoneCheckboxesHtml = allZones.map((z) => `
        <label class="zone-check-label" style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
          <input type="checkbox" class="fm-zone-cb" value="${z.id}" ${preselectedZones.has(z.id) ? 'checked' : ''} />
          <span class="zone-dot" style="background:${z.color || '#7c3aed'};width:8px;height:8px;border-radius:50%;flex-shrink:0"></span>
          ${escHtml(z.name)}
        </label>`).join('');

      UI.openModal({
        title: id ? 'Edit Asset' : 'Add Asset',
        bodyHtml: `
          <div class="form-group">
            <label class="form-label">Icon</label>
            <button type="button" id="fm-icon-btn" class="icon-picker-trigger">
              <span id="fm-icon-preview">${a.icon ? getAssetIconSvg(a.icon) : ASSET_ICON}</span>
              <span id="fm-icon-label">${a.icon ? (ASSET_ICON_MAP[a.icon]?.name || 'Default') : 'Default (📦)'}</span>
              <span style="margin-left:auto;opacity:.5">▼</span>
            </button>
          </div>
          <div class="form-group">
            <label class="form-label">Name *</label>
            <input type="text" id="fm-asset-name" placeholder="e.g. 192.168.1.10, web-server-01" value="${escHtml(a.name || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea id="fm-asset-desc" rows="3">${escHtml(a.description || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Zones <span class="form-hint">(optional — asset can exist without a zone)</span></label>
            <div class="zone-checkboxes" style="display:flex;flex-wrap:wrap;gap:8px 14px;max-height:120px;overflow-y:auto;padding:4px 0">
              ${zoneCheckboxesHtml || '<span class="text-dim" style="font-size:12px">No zones defined yet</span>'}
            </div>
          </div>
          <div class="checkbox-row">
            <input type="checkbox" id="fm-asset-key" ${a.isKey ? 'checked' : ''} />
            <label for="fm-asset-key">★ Key Asset</label>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <div class="status-checkboxes" style="display:flex;flex-wrap:wrap;gap:8px">
              ${Object.entries(ASSET_STATUSES).map(([k, s]) => `
                <label class="status-check-label" style="color:${s.color}">
                  <input type="checkbox" class="fm-status-cb" value="${k}" ${normalizeStatuses(a.statuses).includes(k) ? 'checked' : ''} />
                  ${s.icon} ${s.label}
                </label>`).join('')}
            </div>
          </div>`,
        onOpen: () => {
          qs('#fm-icon-btn')?.addEventListener('click', (e) => {
            openIconPicker(e.currentTarget, selectedIcon, (iconId) => {
              selectedIcon = iconId;
              const preview = qs('#fm-icon-preview');
              const label = qs('#fm-icon-label');
              if (preview) preview.innerHTML = iconId ? getAssetIconSvg(iconId) : ASSET_ICON;
              if (label) label.textContent = iconId ? (ASSET_ICON_MAP[iconId]?.name || 'Default') : 'Default (📦)';
            });
          });
        },
        onConfirm: async () => {
          const name = qs('#fm-asset-name').value.trim();
          if (!name) { UI.toast('Asset name required', 'error'); return; }
          if (id && existing) {
            const ver = { id: generateId(), assetId: id, timestamp: now(), operator: State.operatorName, state: deepClone(existing) };
            await DB.saveAssetVersion(ver);
          }
          // Collect selected zones from checkboxes
          const selectedZoneIds = [...qsa('.fm-zone-cb:checked')].map(cb => cb.value);
          const asset = {
            id:          id || generateId(),
            missionId:   a.missionId  || State.activeMission.id,
            zoneIds:     selectedZoneIds,
            parentId:    a.parentId   || parentId || null,
            type:        a.type || 'other',
            icon:        selectedIcon || null,
            name,
            description: qs('#fm-asset-desc').value.trim(),
            isKey:       qs('#fm-asset-key')?.checked || false,
            statuses:    [...qsa('.fm-status-cb:checked')].map(cb => cb.value),
            createdAt:   a.createdAt  || now(),
            createdBy:   a.createdBy  || State.operatorName,
            updatedAt:   now(),
            updatedBy:   State.operatorName,
          };
          await DB.saveAsset(asset);
          if (!id) await logChange('create', 'asset', asset.id, asset.name, `Created asset "${asset.name}"`, null, asset);
          else      await logChange('update', 'asset', asset.id, asset.name, `Updated asset "${asset.name}"`, existing, asset);
          UI.closeModal();
          UI.toast(id ? 'Asset updated' : 'Asset created', 'success');
          State.selectedAssetId = asset.id;
          await AssetsPanel.render();
        },
      });
    });
  },

  async deleteAsset(id) {
    const a = await DB.getAsset(id);
    if (!a) return;
    UI.confirm(`Delete asset "${a.name}" and all its sub-items?`, async () => {
      const prev = deepClone(a);
      await DB.deleteAttachmentsByRef(id);
      const subs = await DB.getSubitemsByAsset(id);
      for (const sub of subs) await DB.deleteAttachmentsByRef(sub.id);
      await DB.deleteAsset(id);
      await logChange('delete', 'asset', id, a.name, `Deleted asset "${a.name}"`, prev, null);
      if (State.selectedAssetId === id) { State.selectedAssetId = null; State.selectedSubitemId = null; }
      UI.closeModal();
      UI.toast('Asset deleted', 'info');
      await AssetsPanel.render();
    });
  },

  openSubitemForm(assetId, id = null, parentSubitemId = null) {
    (id ? DB.getSubitem(id) : Promise.resolve(null)).then(async (existing) => {
      const s = existing || {};
      const parentName = parentSubitemId ? ((await DB.getSubitem(parentSubitemId))?.name || '') : '';
      let selectedIcon = s.icon || null;
      let _manualIcon  = !!s.icon;
      UI.openModal({
        title: id ? 'Edit Data Item' : (parentSubitemId ? `Add Sub-Data under "${escHtml(parentName)}"` : 'Add Data Item'),
        bodyHtml: `
          <div class="form-group">
            <label class="form-label">Icon</label>
            <button type="button" id="fm-si-icon-btn" class="icon-picker-trigger">
              <span id="fm-si-icon-preview">${s.icon ? getAssetIconSvg(s.icon) : '📄'}</span>
              <span id="fm-si-icon-label">${s.icon ? (ASSET_ICON_MAP[s.icon]?.name || 'Default') : 'Default (📄)'}</span>
              <span style="margin-left:auto;opacity:.5">▼</span>
            </button>
          </div>
          <div class="form-group">
            <label class="form-label">Name</label>
            <input type="text" id="fm-si-name" placeholder="e.g. ip addr, nmap scan, credentials" value="${escHtml(s.name || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Content <span class="form-hint">(paste command output, notes…)</span></label>
            <textarea id="fm-si-content" rows="12" placeholder="Paste output here…">${escHtml(s.content || '')}</textarea>
          </div>
          <div class="checkbox-row" style="margin-top:8px">
            <input type="checkbox" id="fm-si-auto-detect" checked />
            <label for="fm-si-auto-detect">Auto-detect content type and rename data item automatically</label>
          </div>
          <div class="form-group" style="margin-top:8px">
            <label class="form-label">Status</label>
            <div class="status-checkboxes" style="display:flex;flex-wrap:wrap;gap:8px">
              ${Object.entries(ASSET_STATUSES).map(([k, st]) => `
                <label class="status-check-label" style="color:${st.color}">
                  <input type="checkbox" class="fm-si-status-cb" value="${k}" ${normalizeStatuses(s.statuses).includes(k) ? 'checked' : ''} />
                  ${st.icon} ${st.label}
                </label>`).join('')}
            </div>
          </div>
          <div id="parse-zone" style="margin-top:8px"></div>`,
        confirmLabel: id ? 'Save' : 'Add Item',
        onOpen: () => {
          qs('#fm-si-icon-btn')?.addEventListener('click', (e) => {
            openIconPicker(e.currentTarget, selectedIcon, (iconId) => {
              _manualIcon = true;
              selectedIcon = iconId;
              const preview = qs('#fm-si-icon-preview');
              const label = qs('#fm-si-icon-label');
              if (preview) preview.innerHTML = iconId ? getAssetIconSvg(iconId) : '📄';
              if (label) label.textContent = iconId ? (ASSET_ICON_MAP[iconId]?.name || 'Default') : 'Default (📄)';
            });
          });
          qs('#fm-si-name')?.addEventListener('input', () => {
            if (_manualIcon || _appliedParserId) return;
            const ipIcon = detectIpIcon(qs('#fm-si-name')?.value || '');
            if (ipIcon) {
              selectedIcon = ipIcon;
              const preview = qs('#fm-si-icon-preview');
              const label   = qs('#fm-si-icon-label');
              if (preview) preview.innerHTML = getAssetIconSvg(ipIcon);
              if (label)   label.textContent = ASSET_ICON_MAP[ipIcon]?.name || 'Auto';
            }
          });
        },
        onConfirm: async () => {
          const name    = qs('#fm-si-name').value.trim();
          const content = qs('#fm-si-content').value.trim();
          if (!content) { UI.toast('Content is required', 'error'); return; }
          if (id && existing) {
            const ver = { id: generateId(), subitemId: id, timestamp: now(), operator: State.operatorName, state: deepClone(existing) };
            await DB.saveSubitemVersion(ver);
          }
          const subitem = {
            id:        id || generateId(),
            assetId,
            parentId:  id ? (s.parentId || null) : (parentSubitemId || null),
            name:      name || 'Note',
            content,
            icon:       selectedIcon || (!_manualIcon && detectIpIcon(name)) || null,
            parsedType: _appliedParserId || s.parsedType || null,
            parsedData: _appliedParsedData || s.parsedData || null,
            statuses:   [...qsa('.fm-si-status-cb:checked')].map(cb => cb.value),
            createdAt:  s.createdAt || now(),
            createdBy:  s.createdBy || State.operatorName,
            updatedAt:  now(),
            updatedBy:  State.operatorName,
          };
          await DB.saveSubitem(subitem);
          if (!id) await logChange('create', 'subitem', subitem.id, subitem.name, `Added data item "${subitem.name}" to asset`, null, subitem);
          else      await logChange('update', 'subitem', subitem.id, subitem.name, `Updated data item "${subitem.name}"`, existing, subitem);
          UI.closeModal();
          UI.toast('Data item saved', 'success');
          State.selectedSubitemId = subitem.id;
          if (State.selectedZoneId) await this.renderAssets(this._zoneForRender());
          await this.showSubitemContent(subitem.id);
        },
      });

      const textarea = qs('#fm-si-content');
      let _appliedParserId = s.parsedType || null;
      let _appliedParsedData = s.parsedData || null;

      if (textarea) {
        const doDetect = () => {
          const text       = textarea.value;
          if (!text.trim()) { const pz = qs('#parse-zone'); if (pz) pz.innerHTML = ''; return; }
          const candidates = detectParsers(text);
          const parseZone  = qs('#parse-zone');
          const nameInput  = qs('#fm-si-name');
          const autoDetect = qs('#fm-si-auto-detect')?.checked;

          if (autoDetect && candidates.length) {
            const best = candidates[0];
            if (best.confidence >= 0.25) {
              const result = runParser(best.parser.id, text);
              if (result) {
                const suggested = result.suggestedItemName || best.parser.label;
                if (nameInput && suggested) nameInput.value = suggested;
                _appliedParserId   = best.parser.id;
                _appliedParsedData = result.parsedData;
                const autoIcon = PARSER_ICON_MAP[best.parser.id];
                if (autoIcon && !_manualIcon) {
                  selectedIcon = autoIcon;
                  const preview = qs('#fm-si-icon-preview');
                  const label = qs('#fm-si-icon-label');
                  if (preview) preview.innerHTML = getAssetIconSvg(autoIcon);
                  if (label) label.textContent = ASSET_ICON_MAP[autoIcon]?.name || 'Auto';
                }
                if (result.suggestedName) {
                  UI.toast(`💡 Suggested asset name: ${result.suggestedName}`, 'info', 4000);
                }
              }
            }
          }

          if (!parseZone) return;
          if (!candidates.length) { parseZone.innerHTML = ''; _appliedParserId = null; _appliedParsedData = null; return; }
          parseZone.innerHTML = `
            <div class="section-title">Detected format${autoDetect && candidates[0].confidence >= 0.25 ? ' (auto-applied ✓)' : ' — click to apply'}:</div>
            <div class="parse-candidates">
              ${candidates.slice(0, 5).map((c) => `
                <div class="parse-candidate${c.parser.id === _appliedParserId ? ' active' : ''}" data-pid="${c.parser.id}">
                  <span>${c.parser.icon} ${c.parser.label}</span>
                  <span class="parse-confidence">${Math.round(c.confidence * 100)}%</span>
                  <button class="btn btn-secondary btn-xs" data-apply="${c.parser.id}">${c.parser.id === _appliedParserId ? '✓ Applied' : 'Apply'}</button>
                </div>`).join('')}
            </div>`;
          qsa('[data-apply]', parseZone).forEach((btn) => {
            btn.addEventListener('click', () => {
              const result = runParser(btn.dataset.apply, text);
              if (!result) return;
              if (nameInput) nameInput.value = result.suggestedItemName || nameInput.value;
              _appliedParserId   = btn.dataset.apply;
              _appliedParsedData = result.parsedData;
              const autoIcon = PARSER_ICON_MAP[btn.dataset.apply];
              if (autoIcon && !_manualIcon) {
                selectedIcon = autoIcon;
                const preview = qs('#fm-si-icon-preview');
                const label = qs('#fm-si-icon-label');
                if (preview) preview.innerHTML = getAssetIconSvg(autoIcon);
                if (label) label.textContent = ASSET_ICON_MAP[autoIcon]?.name || 'Auto';
              }
              if (result.suggestedName) {
                UI.toast(`💡 Suggested asset name: ${result.suggestedName}`, 'info', 4000);
              }
              doDetect();
            });
          });
        };

        const debouncedDetect = debounce(doDetect, 500);
        textarea.addEventListener('input', debouncedDetect);
        textarea.addEventListener('paste', () => setTimeout(doDetect, 50));
        if (s.content) setTimeout(doDetect, 100);
      }
    });
  },

  async deleteSubitem(id, assetId) {
    const s = await DB.getSubitem(id);
    if (!s) return;
    UI.confirm(`Delete data item "${s.name}"?`, async () => {
      const prev = deepClone(s);
      await DB.deleteAttachmentsByRef(id);
      await DB.deleteSubitem(id);
      await logChange('delete', 'subitem', id, s.name, `Deleted data item "${s.name}"`, prev, null);
      if (State.selectedSubitemId === id) {
        State.selectedSubitemId = null;
        const viewer = qs('#data-viewer-pane');
        if (viewer) viewer.innerHTML = '<p class="text-dim" style="padding:20px">← Select a data item to view its content</p>';
      }
      UI.closeModal();
      UI.toast('Data item deleted', 'info');
      if (State.selectedZoneId) await this.renderAssets(this._zoneForRender());
    });
  },

  async restoreVersion(versionId, assetId) {
    const versions = await DB.getVersionsByAsset(assetId);
    const ver = versions.find((v) => v.id === versionId);
    if (!ver) return;
    UI.confirm(`Restore asset to state from ${formatDate(ver.timestamp)}?`, async () => {
      const current  = await DB.getAsset(assetId);
      const snapshot = { id: generateId(), assetId, timestamp: now(), operator: State.operatorName, state: deepClone(current) };
      await DB.saveAssetVersion(snapshot);
      await DB.saveAsset({ ...ver.state, id: assetId, missionId: current.missionId, updatedAt: now(), updatedBy: State.operatorName });
      await logChange('update', 'asset', assetId, ver.state.name, `Restored asset to version from ${formatDate(ver.timestamp)}`, current, ver.state);
      UI.closeModal();
      UI.toast('Asset restored to previous version', 'success');
      await AssetsPanel.render();
    });
  },
};
