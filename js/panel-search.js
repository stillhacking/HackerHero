/**
 * @fileoverview SearchPanel — full-text + keyword search across mission data
 * @module panel-search
 */

import {
  State, DB, UI, showPanel,
  escHtml, highlight, truncate, matchesQuery, qs, qsa,
  getAssetIconSvg,
} from './core.js?v=20260407g';
import {
  ASSET_ICON, assetIcon, subitemIcon,
  ASSET_STATUSES, normalizeStatuses,
  QUERY_KEYWORDS, parseQuery, matchDescriptor,
  AssetsPanel,
} from './panel-assets.js?v=20260407g';

// ═══════════════════════════════════════════════════════════════════════════
//  SEARCH PANEL
// ═══════════════════════════════════════════════════════════════════════════

export const SearchPanel = {
  _results: null,
  _query:   '',

  async render() {
    if (!State.activeMission) {
      qs('#panel-search').innerHTML = '<p class="text-muted" style="padding:20px">No active operation.</p>';
      return;
    }
    qs('#panel-search').innerHTML = `
      <div class="panel-header"><h2>&#128269; Search</h2></div>
      <div class="search-bar" style="position:relative">
        <input type="search" id="search-input" placeholder="HVT, PWNED AND hasTickets, keyword…" autocomplete="off" />
        <div id="search-autocomplete" class="filter-autocomplete" style="display:none"></div>
        <button class="btn btn-primary" id="btn-search">Search</button>
        <button class="btn btn-secondary" id="btn-toggle-advanced">Advanced ▾</button>
      </div>
      <div id="advanced-search-panel" class="advanced-search" style="display:none">
        <div class="form-group">
          <label class="form-label">Date From</label>
          <input type="date" id="adv-date-from" />
        </div>
        <div class="form-group">
          <label class="form-label">Date To</label>
          <input type="date" id="adv-date-to" />
        </div>
        <div class="form-group">
          <label class="form-label">Operator</label>
          <input type="text" id="adv-operator" placeholder="Operator name…" />
        </div>
        <div class="form-group">
          <label class="form-label">Zone</label>
          <select id="adv-zone">
            <option value="">All zones</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Type</label>
          <select id="adv-type">
            <option value="">All types</option>
            <option value="zone">Zone</option>
            <option value="asset">Asset</option>
            <option value="subitem">Data Item</option>
            <option value="objective">Objective</option>
          </select>
        </div>
        <div class="form-group" style="display:flex;align-items:flex-end">
          <label class="checkbox-row"><input type="checkbox" id="adv-regex" /> Regex mode</label>
        </div>
      </div>
      <div id="search-results-area"></div>`;

    // Populate zones dropdown
    const zones = await DB.getZonesByMission(State.activeMission.id);
    const zSel = qs('#adv-zone');
    zones.forEach((z) => { const opt = document.createElement('option'); opt.value = z.id; opt.textContent = z.name; zSel.appendChild(opt); });

    this._zones = zones;
    this.bindEvents();

    // Restore previous results when navigating back
    if (this._lastGrouped) {
      const si = qs('#search-input');
      if (si && this._lastQuery) si.value = this._lastQuery;
      this.renderResults(this._lastGrouped, this._lastQuery || '');
    }
  },

  bindEvents() {
    qs('#btn-toggle-advanced').addEventListener('click', () => {
      const panel = qs('#advanced-search-panel');
      const vis   = panel.style.display !== 'none';
      panel.style.display = vis ? 'none' : 'grid';
      qs('#btn-toggle-advanced').textContent = vis ? 'Advanced ▾' : 'Advanced ▴';
    });

    const searchInput = qs('#search-input');
    const acBox = qs('#search-autocomplete');

    const zones = this._zones || [];
    const applySearchCompletion = (kw) => {
      const parts = searchInput.value.split(/\s+(AND|OR)\s+/i);
      parts[parts.length - 1] = kw;
      searchInput.value = parts.join(' ');
      acBox.style.display = 'none';
      searchInput.focus();
    };
    const updateAutocomplete = () => {
      if (!acBox || !searchInput) return;
      const val = searchInput.value;
      const lastToken = val.split(/\s+(?:AND|OR)\s+/i).pop().trim();
      if (!lastToken) { acBox.style.display = 'none'; return; }

      const inZoneMatch = lastToken.match(/^inZone=(.*)$/i);
      if (inZoneMatch) {
        const typed = inZoneMatch[1].toLowerCase();
        const zoneMatches = zones.filter(z => !typed || z.name.toLowerCase().includes(typed));
        if (!zoneMatches.length) { acBox.style.display = 'none'; return; }
        acBox.innerHTML = zoneMatches.slice(0, 8).map(z =>
          `<div class="filter-ac-item" data-kw="${escHtml('inZone=' + z.name)}"><b>inZone=</b>${escHtml(z.name)}</div>`
        ).join('') + `<div class="filter-ac-hint">Use <b>AND</b> / <b>OR</b> to combine</div>`;
        acBox.style.display = 'block';
        acBox.querySelectorAll('.filter-ac-item').forEach(item =>
          item.addEventListener('mousedown', (e) => { e.preventDefault(); applySearchCompletion(item.dataset.kw); })
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
        item.addEventListener('mousedown', (e) => { e.preventDefault(); applySearchCompletion(item.dataset.kw); })
      );
    };

    const doSearch = () => { if (acBox) acBox.style.display = 'none'; this.runSearch(); };
    qs('#btn-search').addEventListener('click', doSearch);
    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && acBox && acBox.style.display !== 'none') {
        e.preventDefault();
        const first = acBox.querySelector('.filter-ac-item');
        if (first) applySearchCompletion(first.dataset.kw);
        return;
      }
      if (e.key === 'Enter') doSearch();
    });
    searchInput?.addEventListener('input', updateAutocomplete);
    searchInput?.addEventListener('focus', updateAutocomplete);
    searchInput?.addEventListener('blur', () => setTimeout(() => { if (acBox) acBox.style.display = 'none'; }, 150));
  },

  async runSearch() {
    const m      = State.activeMission;
    const query  = qs('#search-input').value.trim();
    const isRegex = qs('#adv-regex')?.checked || false;
    const dateFrom = qs('#adv-date-from')?.value || '';
    const dateTo   = qs('#adv-date-to')?.value   || '';
    const opFilter = qs('#adv-operator')?.value.trim().toLowerCase() || '';
    const zoneFilter = qs('#adv-zone')?.value || '';
    const typeFilter = qs('#adv-type')?.value || '';

    if (!query && !opFilter && !dateFrom && !dateTo && !zoneFilter && !typeFilter) {
      UI.toast('Enter a search query', 'warning');
      return;
    }

    const orBranches = (!isRegex && query) ? parseQuery(query) : null;
    const matchesItem = (name, content, statuses, hasTickets, isKey, type = 'asset', zoneName = '') => {
      if (!query) return true;
      if (isRegex) return matchesQuery(name, query, true) || matchesQuery(content, query, true);
      return matchDescriptor({ name, content, statuses: normalizeStatuses(statuses), hasTickets, isKey, type, zoneName }, orBranches);
    };
    const matches = (text) => matchesQuery(text, query, isRegex);
    const inDateRange = (isoStr) => {
      if (!isoStr) return true;
      const d = new Date(isoStr).getTime();
      if (dateFrom && d < new Date(dateFrom).getTime()) return false;
      if (dateTo   && d > new Date(dateTo + 'T23:59:59').getTime()) return false;
      return true;
    };
    const matchesOp = (op) => !opFilter || (op || '').toLowerCase().includes(opFilter);

    const grouped = { zones: [], assets: [], subitems: [], objectives: [] };

    const allZones = await DB.getZonesByMission(m.id);
    const zoneMap = {};
    allZones.forEach(z => { zoneMap[z.id] = z.name; });

    if (!typeFilter || typeFilter === 'zone') {
      for (const z of allZones) {
        if (zoneFilter && z.id !== zoneFilter) continue;
        if (!matchesOp(z.createdBy))   continue;
        if (!inDateRange(z.createdAt)) continue;
        if (!matchesItem(z.name, z.description || '', [], false, false, 'zone', z.name)) continue;
        grouped.zones.push({ ...z, _matchText: z.name });
      }
    }

    if (!typeFilter || typeFilter === 'asset') {
      const assets = await DB.getAssetsByMission(m.id);
      for (const a of assets) {
        if (zoneFilter && !(a.zoneIds || []).includes(zoneFilter)) continue;
        if (!matchesOp(a.createdBy))   continue;
        if (!inDateRange(a.createdAt)) continue;
        const aZoneName = (a.zoneIds || []).map(zid => zoneMap[zid]).filter(Boolean).join(', ') || '—';
        if (!matchesItem(a.name, a.description || '', a.statuses, false, a.isKey, 'asset', aZoneName)) continue;
        grouped.assets.push({ ...a, _zoneName: aZoneName, _matchText: a.name });
      }
    }

    if (!typeFilter || typeFilter === 'subitem') {
      const assets = await DB.getAssetsByMission(m.id);
      for (const a of assets) {
        if (zoneFilter && !(a.zoneIds || []).includes(zoneFilter)) continue;
        const aZoneName = (a.zoneIds || []).map(zid => zoneMap[zid]).filter(Boolean).join(', ') || '—';
        const subs = await DB.getSubitemsByAsset(a.id);
        for (const s of subs) {
          if (!matchesOp(s.createdBy))   continue;
          if (!inDateRange(s.createdAt)) continue;
          if (!matchesItem(s.name, s.content || '', s.statuses, false, false, 'data', aZoneName)) continue;
          grouped.subitems.push({ ...s, _zoneId: a.zoneIds?.[0] || '', _assetName: a.name, _assetIcon: a.icon, _zoneName: aZoneName, _matchText: s.content });
        }
      }
    }

    if (!typeFilter || typeFilter === 'objective') {
      const objs = m.objectives || [];
      for (const o of objs) {
        if (!matchesOp(o.createdBy))   continue;
        if (!inDateRange(o.createdAt)) continue;
        if (!query || matches(o.text)) {
          grouped.objectives.push({ ...o, _matchText: o.text });
        }
      }
    }

    this.renderResults(grouped, query);
  },

  renderResults(grouped, query) {
    const area = qs('#search-results-area');
    const total = grouped.zones.length + grouped.assets.length + grouped.subitems.length + grouped.objectives.length;

    if (total === 0) {
      area.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">No results found</div></div>`;
      return;
    }

    this._lastGrouped = grouped;
    this._lastQuery   = query;

    const allStatuses = new Set();
    [...grouped.assets, ...grouped.subitems].forEach(item => {
      (item.statuses || []).forEach(st => allStatuses.add(st));
    });

    const statusFilterHtml = allStatuses.size > 0 ? `
      <div id="search-status-filters" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:10px">
        <span style="font-size:11px;color:var(--c-text3);margin-right:2px">Filter:</span>
        <button class="search-status-btn active" data-status="__all__" style="font-size:11px;padding:3px 10px;border-radius:12px;border:1px solid var(--c-border);background:var(--c-accent);color:var(--c-bg1);cursor:pointer">All</button>
        <button class="search-status-btn active" data-status="__none__" style="font-size:11px;padding:3px 10px;border-radius:12px;border:1px solid var(--c-border);background:var(--c-bg3);color:var(--c-text2);cursor:pointer">No status</button>
        ${Object.entries(ASSET_STATUSES).filter(([k]) => allStatuses.has(k)).map(([k, s]) => `
          <button class="search-status-btn active" data-status="${k}" style="font-size:11px;padding:3px 10px;border-radius:12px;border:1px solid ${s.color}44;background:${s.color}22;color:${s.color};cursor:pointer">${s.icon} ${s.label}</button>
        `).join('')}
      </div>` : '';

    const statusBadges = (statuses) => normalizeStatuses(statuses).map(st => {
      const s = ASSET_STATUSES[st];
      return s ? `<span class="asset-status-badge" style="background:${s.color}22;color:${s.color};border:1px solid ${s.color}44;font-size:10px;padding:1px 5px;border-radius:8px;margin-left:4px">${s.icon} ${s.label}</span>` : '';
    }).join('');

    const renderGroup = (title, icon, items, renderItem) => {
      if (!items.length) return '';
      return `
        <div class="result-group">
          <div class="result-group-header">
            <h4>${icon} ${title} <span class="badge badge-neutral" style="margin-left:8px">${items.length}</span></h4>
            <span style="font-size:12px;color:var(--c-text3)">▾</span>
          </div>
          <div class="result-group-body">${items.map(renderItem).join('')}</div>
        </div>`;
    };

    area.innerHTML = `
      <div style="color:var(--c-text2);font-size:12px;margin-bottom:8px">${total} result${total !== 1 ? 's' : ''} found</div>
      ${statusFilterHtml}
      <div class="search-results">
        ${renderGroup('Zones', '🌐', grouped.zones, (z) => `
          <div class="result-item" data-statuses="" data-nav-zone="${z.id}">
            <span class="result-item-icon">🌐</span>
            <div class="result-item-body">
              <div class="result-item-title">${highlight(z.name, query)}</div>
              <div class="result-item-path">Zone</div>
              ${z.description ? `<div class="result-item-snippet">${highlight(truncate(z.description, 80), query)}</div>` : ''}
            </div>
          </div>`)}

        ${renderGroup('Assets', '🖥️', grouped.assets, (a) => `
          <div class="result-item" data-statuses="${(a.statuses || []).join(',')}" data-nav-zone="${a.zoneIds?.[0] || ''}" data-nav-asset="${a.id}">
            <span class="result-item-icon">${assetIcon(a)}</span>
            <div class="result-item-body">
              <div class="result-item-title">${highlight(a.name, query)} ${statusBadges(a.statuses)}</div>
              <div class="result-item-path">🌐 ${escHtml(a._zoneName)} › ${assetIcon(a)} ${highlight(a.name, query)}</div>
              ${a.description ? `<div class="result-item-snippet">${highlight(truncate(a.description, 80), query)}</div>` : ''}
            </div>
          </div>`)}

        ${renderGroup('Data Items', '📄', grouped.subitems, (s) => `
          <div class="result-item" data-statuses="${(s.statuses || []).join(',')}" data-nav-zone="${s._zoneId || ''}" data-nav-asset="${s.assetId}" data-nav-subitem="${s.id}">
            <span class="result-item-icon">${subitemIcon(s)}</span>
            <div class="result-item-body">
              <div class="result-item-title">${highlight(s.name, query)} ${statusBadges(s.statuses)}</div>
              <div class="result-item-path">🌐 ${escHtml(s._zoneName)} › ${s._assetIcon ? getAssetIconSvg(s._assetIcon) : ASSET_ICON} ${escHtml(s._assetName)} › ${subitemIcon(s)} ${highlight(s.name, query)}</div>
              <div class="result-item-snippet">${highlight(truncate(s.content, 120), query)}</div>
            </div>
          </div>`)}

        ${renderGroup('Objectives', '🎯', grouped.objectives, (o) => `
          <div class="result-item" data-statuses="" data-panel-nav="assets">
            <span class="result-item-icon">🎯</span>
            <div class="result-item-body">
              <div class="result-item-title">${highlight(o.text, query)}</div>
              <div class="result-item-path">Objective · Status: ${o.status}</div>
            </div>
          </div>`)}
      </div>`;

    // Click on result → navigate to item in AssetsPanel
    qsa('.result-item[data-nav-zone], .result-item[data-nav-asset], .result-item[data-nav-subitem]').forEach(item => {
      item.style.cursor = 'pointer';
      item.addEventListener('click', async () => {
        const zoneId    = item.dataset.navZone    || null;
        const assetId   = item.dataset.navAsset   || null;
        const subitemId = item.dataset.navSubitem  || null;
        let resolvedZone = zoneId;
        if (!resolvedZone && assetId) {
          const a = await DB.getAsset(assetId);
          resolvedZone = a?.zoneIds?.[0] || '__all__';
        }
        State.selectedZoneId    = resolvedZone || '__all__';
        State.selectedAssetId   = assetId  || null;
        State.selectedSubitemId = subitemId || null;
        AssetsPanel._persistSelection();
        await showPanel('assets');
      });
    });

    // Collapsible groups
    qsa('.result-group-header').forEach((hdr) => {
      hdr.addEventListener('click', () => {
        const body = hdr.nextElementSibling;
        body.style.display = body.style.display !== 'none' ? 'none' : 'block';
      });
    });

    // Status filter toggle logic
    this._activeStatusFilters = new Set(['__all__', '__none__', ...Object.keys(ASSET_STATUSES)]);
    const filterBtns = qsa('#search-status-filters .search-status-btn');
    const applyStatusFilter = () => {
      const active = this._activeStatusFilters;
      const showAll = active.has('__all__');
      const showNone = active.has('__none__');
      qsa('.result-item').forEach(el => {
        const raw = el.dataset.statuses || '';
        const itemStatuses = raw ? raw.split(',') : [];
        const hasNone = itemStatuses.length === 0;
        if (showAll) {
          el.style.display = hasNone ? (showNone ? '' : 'none') : '';
        } else {
          if (hasNone) {
            el.style.display = showNone ? '' : 'none';
          } else {
            el.style.display = itemStatuses.some(st => active.has(st)) ? '' : 'none';
          }
        }
      });
      qsa('.result-group').forEach(grp => {
        const visibleItems = grp.querySelectorAll('.result-item:not([style*="display: none"])').length;
        const badge = grp.querySelector('.badge');
        if (badge) badge.textContent = visibleItems;
        grp.style.display = visibleItems === 0 ? 'none' : '';
      });
    };

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const st = btn.dataset.status;
        if (st === '__all__') {
          if (this._activeStatusFilters.has('__all__')) {
            this._activeStatusFilters.clear();
          } else {
            this._activeStatusFilters = new Set(['__all__', '__none__', ...Object.keys(ASSET_STATUSES)]);
          }
        } else {
          if (this._activeStatusFilters.has(st)) {
            this._activeStatusFilters.delete(st);
            this._activeStatusFilters.delete('__all__');
          } else {
            this._activeStatusFilters.add(st);
            const allOn = ['__none__', ...Object.keys(ASSET_STATUSES)].every(k => this._activeStatusFilters.has(k));
            if (allOn) this._activeStatusFilters.add('__all__');
          }
        }
        filterBtns.forEach(b => {
          const s = b.dataset.status;
          const isActive = this._activeStatusFilters.has(s);
          b.classList.toggle('active', isActive);
          if (s === '__all__') {
            b.style.background = isActive ? 'var(--c-accent)' : 'var(--c-bg3)';
            b.style.color = isActive ? 'var(--c-bg1)' : 'var(--c-text3)';
          } else if (s === '__none__') {
            b.style.background = isActive ? 'var(--c-bg3)' : 'transparent';
            b.style.color = isActive ? 'var(--c-text2)' : 'var(--c-text3)';
            b.style.opacity = isActive ? '1' : '0.4';
          } else {
            const sc = ASSET_STATUSES[s];
            if (sc) {
              b.style.background = isActive ? sc.color + '22' : 'transparent';
              b.style.color = isActive ? sc.color : 'var(--c-text3)';
              b.style.opacity = isActive ? '1' : '0.4';
            }
          }
        });
        applyStatusFilter();
      });
    });
  },
};
