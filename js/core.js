/**
 * @fileoverview HackerHero — Shared core module
 *
 * Exports application-wide singletons and utilities used by all panel modules:
 *  - State            — global mutable application state
 *  - UI               — modal, toast, confirm, tooltip
 *  - ThemeManager     — CSS theme switching + theme-specific effects
 *  - Lightbox         — full-screen image gallery overlay
 *  - TZClock          — live timezone clock for active mission
 *  - ImportExport     — JSON import / export helpers
 *  - logChange()      — changelog helper
 *  - showPanel()      — panel router (delegated to app.js via setPanelRouter)
 *  - enableMissionNav — enable/disable mission-only sidebar items
 *  - renderAttachmentStrip — thumbnail row with upload
 *  - buildTimezoneOptions  — <select> options for timezones
 *  - bindModalButtons      — one-time modal DOM wiring
 *
 * Re-exports everything from utils.js, db.js, asset-icons.js and
 * parsers.js so panel modules only need a single import source.
 *
 * @module core
 */

// ── Re-exports ────────────────────────────────────────────────────────────
export { DB }                   from './db.js?v=20260406u';
export { PARSERS, detectParsers, runParser } from './parsers.js?v=20260406u';
export { getRandomCreatureName } from './magic-names.js?v=20260406u';
export {
  generateId, now, formatDate, formatDateFull, timeAgo,
  truncate, escHtml, highlight, matchesQuery,
  debounce, qs, qsa, el, deepClone,
  downloadFile, readFileAsText, readFileAsDataURL, createThumbnail, byField, byDateDesc,
} from './utils.js?v=20260406u';
export { ASSET_ICONS, ICON_CATEGORIES, ASSET_ICON_MAP, PARSER_ICON_MAP, getAssetIconSvg } from './asset-icons.js?v=20260406u';

// Local aliases for use inside this file
import { DB }                   from './db.js?v=20260406u';
import { getRandomCreatureName } from './magic-names.js?v=20260406u';
import {
  generateId, now, escHtml,
  qs, qsa, el,
  downloadFile, readFileAsText, readFileAsDataURL, createThumbnail,
} from './utils.js?v=20260406u';

// ═══════════════════════════════════════════════════════════════════════════
//  APPLICATION STATE
// ═══════════════════════════════════════════════════════════════════════════

export const State = {
  operatorName:   null,
  activeMission:  null,
  currentTheme:   'dark',
  currentPanel:   'missions',
  selectedZoneId: null,
  selectedAssetId: null,
  selectedSubitemId: null,
  zonesCollapsed: false,
  assetsCollapsed: false,
};

// ═══════════════════════════════════════════════════════════════════════════
//  CHANGELOG HELPER
// ═══════════════════════════════════════════════════════════════════════════

export async function logChange(action, entityType, entityId, entityName, description, previousState = null, newState = null) {
  if (!State.activeMission) return;
  const entry = {
    id: generateId(),
    missionId:    State.activeMission.id,
    timestamp:    now(),
    operator:     State.operatorName,
    action, entityType, entityId, entityName,
    description, previousState, newState,
  };
  await DB.saveChangelogEntry(entry);
}

// ═══════════════════════════════════════════════════════════════════════════
//  THEME MANAGER
// ═══════════════════════════════════════════════════════════════════════════

export const ThemeManager = {
  themes: {
    'dark':        { name: 'Dark',       desc: 'Clean dark minimalist',     swatch: ['#0d1117','#7c3aed'] },
    'light':       { name: 'Light',      desc: 'Clean light minimalist',    swatch: ['#ffffff','#6d28d9'] },
    'concentration':{ name: 'Focus',     desc: 'Calm, soothing colors',     swatch: ['#1a1f2e','#4a9eff'] },
    'matrix':      { name: 'Matrix',     desc: 'Follow the white rabbit',   swatch: ['#000000','#00ff41'] },
    'upside-down': { name: 'Upside Down',desc: 'The other side',            swatch: ['#080206','#ff2266'] },
    'operation':   { name: 'Operation',  desc: 'Classified — eyes only',    swatch: ['#0a0000','#ff0000'] },
    'wargames':    { name: 'WarGames',  desc: 'Shall we play a game?',     swatch: ['#0a0800','#ffb000'] },
    'hackers':     { name: 'Hack The Planet', desc: 'Mess with the best, die like the rest', swatch: ['#0a0018','#00ffff'] },
  },

  _matrixRaf: null,

  apply(themeId) {
    if (!this.themes[themeId]) themeId = 'dark';
    State.currentTheme = themeId;
    document.documentElement.setAttribute('data-theme', themeId);
    const sel = qs('#theme-select');
    if (sel) sel.value = themeId;
    if (themeId === 'matrix') { this._startMatrixRain(themeId); } else { this._stopMatrixRain(); }
    const udOverlay = qs('#ud-overlay');
    if (udOverlay) {
      if (themeId === 'upside-down') {
        udOverlay.classList.remove('hidden');
        this._startUdReflection();
        this._startUdNavFlicker();
      } else {
        udOverlay.classList.add('hidden');
        this._stopUdReflection();
        this._stopUdNavFlicker();
      }
    }
    const opBanner = qs('#op-alert-banner');
    if (opBanner) { if (themeId === 'operation') { opBanner.classList.remove('hidden'); } else { opBanner.classList.add('hidden'); } }
    DB.setSetting('theme', themeId);
  },

  _startMatrixRain(theme) {
    const canvas = qs('#matrix-canvas');
    const ctx    = canvas.getContext('2d');
    const color  = theme === 'upside-down' ? '#ff2266' : '#00ff41';
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.removeEventListener('resize', this._resizeHandler);
    this._resizeHandler = resize;
    window.addEventListener('resize', resize);
    const fontSize = 13;
    let columns = Math.floor(canvas.width / fontSize);
    let drops   = Array(columns).fill(1);
    let frame   = 0;
    const SKIP  = 4; // draw 1 out of every SKIP frames → ~20fps instead of 60fps
    const draw = () => {
      this._matrixRaf = requestAnimationFrame(draw);
      if (++frame % SKIP !== 0) return;
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle  = color;
      ctx.font       = `${fontSize}px monospace`;
      columns = Math.floor(canvas.width / fontSize);
      if (drops.length !== columns) drops = Array(columns).fill(1);
      for (let i = 0; i < drops.length; i++) {
        const char = String.fromCharCode(0x30A0 + Math.random() * 96);
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    cancelAnimationFrame(this._matrixRaf);
    frame = 0;
    this._matrixRaf = requestAnimationFrame(draw);
  },

  _stopMatrixRain() {
    cancelAnimationFrame(this._matrixRaf);
    const canvas = qs('#matrix-canvas');
    if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
  },

  // ── Upside Down sidebar reflection ──────────────────────────────────────
  _udReflectionInterval: null,

  _startUdReflection() {
    this._stopUdReflection();
    const sidebar = qs('#sidebar');
    if (!sidebar) return;
    let ref = qs('#ud-sidebar-reflection');
    if (!ref) { ref = document.createElement('div'); ref.id = 'ud-sidebar-reflection'; sidebar.appendChild(ref); }
    const updateReflection = () => {
      const navList = qs('.nav-list');
      if (!navList || !ref) return;
      ref.innerHTML = navList.innerHTML;
    };
    updateReflection();
    this._udReflectionInterval = setInterval(updateReflection, 2000);
  },

  _stopUdReflection() {
    clearInterval(this._udReflectionInterval);
    const ref = qs('#ud-sidebar-reflection');
    if (ref) ref.remove();
  },

  // ── Upside Down individual nav-item flicker (Joyce Byers lights) ──────
  _udNavFlickerTimers: [],

  _startUdNavFlicker() {
    this._stopUdNavFlicker();
    const labels = qsa('#sidebar .nav-label');
    if (!labels.length) return;
    labels.forEach((label) => {
      const flickerLoop = () => {
        if (State.currentTheme !== 'upside-down') return;
        const delay = 4000 + Math.random() * 21000;
        const timer = setTimeout(() => {
          if (State.currentTheme !== 'upside-down') return;
          const styles = ['ud-nav-flicker-a', 'ud-nav-flicker-b', 'ud-nav-flicker-c'];
          const cls = styles[Math.floor(Math.random() * styles.length)];
          label.classList.add(cls);
          setTimeout(() => { label.classList.remove(cls); flickerLoop(); }, 1600);
        }, delay);
        this._udNavFlickerTimers.push(timer);
      };
      const initTimer = setTimeout(() => flickerLoop(), 1000 + Math.random() * 8000);
      this._udNavFlickerTimers.push(initTimer);
    });
  },

  _stopUdNavFlicker() {
    this._udNavFlickerTimers.forEach(t => clearTimeout(t));
    this._udNavFlickerTimers = [];
    qsa('#sidebar .nav-label').forEach(el => {
      el.classList.remove('ud-nav-flicker-a', 'ud-nav-flicker-b', 'ud-nav-flicker-c');
    });
  },




};

// ═══════════════════════════════════════════════════════════════════════════
//  UI UTILITIES  — Modal, Toast, Confirm, Tooltip
// ═══════════════════════════════════════════════════════════════════════════

export const UI = {
  openModal({ title, bodyHtml, confirmLabel = 'Save', cancelLabel = 'Cancel',
               onConfirm, onCancel, onOpen, confirmClass = 'btn-primary', size = '' }) {
    qs('#modal-title').textContent  = title;
    qs('#modal-body').innerHTML     = bodyHtml;
    qs('#modal-confirm').textContent = confirmLabel;
    qs('#modal-confirm').className   = `btn ${confirmClass}`;
    qs('#modal-cancel').textContent  = cancelLabel;
    if (!confirmLabel) qs('#modal-confirm').classList.add('hidden');
    else               qs('#modal-confirm').classList.remove('hidden');
    qs('#modal-box').className = size ? `modal-${size}` : '';
    this._modalConfirmCb = onConfirm || null;
    this._modalCancelCb  = onCancel  || null;
    qs('#modal-overlay').classList.remove('hidden');
    if (onOpen) setTimeout(onOpen, 0);
  },

  closeModal() {
    qs('#modal-overlay').classList.add('hidden');
    qs('#modal-body').innerHTML = '';
  },

  confirm(message, onYes, { title = 'Confirm', yesLabel = 'Confirm', yesClass = 'btn-danger' } = {}) {
    this.openModal({
      title,
      bodyHtml: `<p style="padding:8px 0;color:var(--c-text2)">${escHtml(message)}</p>`,
      confirmLabel: yesLabel,
      confirmClass: yesClass,
      onConfirm: onYes,
    });
  },

  toast(message, type = 'info', duration = 3500) {
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const div = el('div', { className: `toast toast-${type}` },
      el('span', { className: 'toast-icon' }, icons[type] || 'ℹ'),
      el('span', { className: 'toast-msg'  }, message),
    );
    qs('#toast-container').appendChild(div);
    setTimeout(() => {
      div.classList.add('removing');
      setTimeout(() => div.remove(), 250);
    }, duration);
  },

  showTooltip(content, x, y) {
    const tip = qs('#global-tooltip');
    tip.innerHTML = content;
    tip.classList.remove('hidden');
    tip.style.left = `${x + 14}px`;
    tip.style.top  = `${y + 10}px`;
    const rect = tip.getBoundingClientRect();
    if (rect.right > window.innerWidth)  tip.style.left = `${x - rect.width - 10}px`;
    if (rect.bottom > window.innerHeight) tip.style.top = `${y - rect.height - 10}px`;
  },

  hideTooltip() {
    qs('#global-tooltip').classList.add('hidden');
  },
};

// Bind modal buttons (once at startup)
export function bindModalButtons() {
  qs('#modal-close').addEventListener('click', () => { if (UI._modalCancelCb) UI._modalCancelCb(); UI.closeModal(); });
  qs('#modal-cancel').addEventListener('click', () => { if (UI._modalCancelCb) UI._modalCancelCb(); UI.closeModal(); });
  qs('#modal-confirm').addEventListener('click', async () => {
    if (UI._modalConfirmCb) {
      try { await UI._modalConfirmCb(); }
      catch (err) { console.error('[Modal confirm]', err); UI.toast('Error: ' + err.message, 'error'); }
    }
  });
  qs('#modal-overlay').addEventListener('click', (e) => {
    if (e.target === qs('#modal-overlay')) { if (UI._modalCancelCb) UI._modalCancelCb(); UI.closeModal(); }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  NAVIGATION — Panel router (wired by app.js)
// ═══════════════════════════════════════════════════════════════════════════

let _panelRouter = null;
let _skipHistoryPush = false;

/**
 * Register the real panel router (called once by app.js after all panels
 * are imported).
 */
export function setPanelRouter(fn) { _panelRouter = fn; }

export async function showPanel(panelId) {
  State.currentPanel = panelId;
  if (!_skipHistoryPush) history.pushState({ panel: panelId }, '', `#${panelId}`);
  qsa('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.panel === panelId));
  qsa('.panel').forEach((panel) => panel.classList.toggle('active', panel.id === `panel-${panelId}`));
  if (_panelRouter) await _panelRouter(panelId);
}

export function enableMissionNav(enable) {
  qsa('.nav-item.mission-only').forEach((item) => item.classList.toggle('enabled', enable));
}

export function setSkipHistoryPush(v) { _skipHistoryPush = v; }

// ═══════════════════════════════════════════════════════════════════════════
//  LIGHTBOX
// ═══════════════════════════════════════════════════════════════════════════

export const Lightbox = {
  _attachments: [],
  _index: 0,

  open(attachments, startIndex = 0) {
    if (!attachments?.length) return;
    this._attachments = attachments;
    this._index = Math.max(0, Math.min(startIndex, attachments.length - 1));
    this._show();
    const overlay = qs('#lightbox-overlay');
    if (overlay) overlay.classList.remove('hidden');
    document.addEventListener('keydown', this._onKey);
  },

  close() {
    const overlay = qs('#lightbox-overlay');
    if (overlay) overlay.classList.add('hidden');
    document.removeEventListener('keydown', this._onKey);
  },

  prev() { if (this._attachments.length > 1) { this._index = (this._index - 1 + this._attachments.length) % this._attachments.length; this._show(); } },
  next() { if (this._attachments.length > 1) { this._index = (this._index + 1) % this._attachments.length; this._show(); } },

  _show() {
    const att = this._attachments[this._index];
    if (!att) return;
    const img = qs('#lightbox-img');
    const counter = qs('#lightbox-counter');
    const fname = qs('#lightbox-filename');
    if (img) img.src = att.dataUrl;
    if (counter) counter.textContent = `${this._index + 1} / ${this._attachments.length}`;
    if (fname) fname.textContent = att.fileName || '';
  },

  _onKey: (e) => {
    if (e.key === 'Escape') Lightbox.close();
    else if (e.key === 'ArrowLeft') Lightbox.prev();
    else if (e.key === 'ArrowRight') Lightbox.next();
  },

  init() {
    qs('.lightbox-close')?.addEventListener('click', () => this.close());
    qs('.lightbox-nav.prev')?.addEventListener('click', () => this.prev());
    qs('.lightbox-nav.next')?.addEventListener('click', () => this.next());
    qs('#lightbox-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'lightbox-overlay') this.close();
    });
  },
};

// ═══════════════════════════════════════════════════════════════════════════
//  ATTACHMENT STRIP
// ═══════════════════════════════════════════════════════════════════════════

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

export async function renderAttachmentStrip(containerId, refType, refId, missionId) {
  const container = qs(`#${containerId}`);
  if (!container) return;
  const attachments = await DB.getAttachmentsByRef(refId);
  let html = '';
  attachments.forEach((att, idx) => {
    html += `<div class="attachment-thumb" data-att-idx="${idx}" data-att-id="${att.id}" title="${escHtml(att.fileName || '')}">
      <img src="${att.thumbnailUrl || att.dataUrl}" alt="${escHtml(att.fileName || 'image')}" />
      <span class="att-del" data-att-id="${att.id}" title="Remove">✕</span>
    </div>`;
  });
  html += `<div class="attachment-add-btn" id="${containerId}-add" title="Add image">+</div>`;
  html += `<input type="file" id="${containerId}-input" accept="image/*" multiple style="display:none" />`;
  container.className = 'attachment-strip';
  container.innerHTML = html;
  container.querySelectorAll('.attachment-thumb').forEach((thumb) => {
    thumb.addEventListener('click', (e) => {
      if (e.target.classList.contains('att-del')) return;
      const idx = parseInt(thumb.dataset.attIdx, 10);
      Lightbox.open(attachments, idx);
    });
  });
  container.querySelectorAll('.att-del').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const attId = btn.dataset.attId;
      UI.confirm('Remove this image?', async () => {
        await DB.deleteAttachment(attId);
        UI.closeModal();
        UI.toast('Image removed', 'info');
        await renderAttachmentStrip(containerId, refType, refId, missionId);
      });
    });
  });
  qs(`#${containerId}-add`)?.addEventListener('click', () => { qs(`#${containerId}-input`)?.click(); });
  qs(`#${containerId}-input`)?.addEventListener('change', async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    for (const file of files) {
      if (!file.type.startsWith('image/')) { UI.toast(`"${file.name}" is not an image`, 'error'); continue; }
      if (file.size > MAX_ATTACHMENT_SIZE) { UI.toast(`"${file.name}" exceeds 10 MB limit`, 'error'); continue; }
      try {
        const dataUrl = await readFileAsDataURL(file);
        const thumbnailUrl = await createThumbnail(dataUrl, 120);
        const attachment = {
          id: generateId(), missionId, refType, refId,
          fileName: file.name, mimeType: file.type, dataUrl, thumbnailUrl,
          size: file.size, createdAt: now(), createdBy: State.operatorName,
        };
        await DB.saveAttachment(attachment);
      } catch (err) { UI.toast(`Failed to add "${file.name}"`, 'error'); console.error(err); }
    }
    UI.toast(`${files.length} image(s) added`, 'success');
    await renderAttachmentStrip(containerId, refType, refId, missionId);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  TIMEZONE CLOCK
// ═══════════════════════════════════════════════════════════════════════════

export function buildTimezoneOptions(selected = '') {
  let zones;
  try { zones = Intl.supportedValuesOf('timeZone'); } catch {
    zones = [
      'UTC',
      'Africa/Abidjan','Africa/Cairo','Africa/Johannesburg','Africa/Lagos','Africa/Nairobi','Africa/Tunis',
      'America/Bogota','America/Buenos_Aires','America/Chicago','America/Denver','America/Lima',
      'America/Los_Angeles','America/Mexico_City','America/New_York','America/Sao_Paulo','America/Toronto',
      'Asia/Baghdad','Asia/Bangkok','Asia/Dhaka','Asia/Dubai','Asia/Hong_Kong','Asia/Jakarta',
      'Asia/Jerusalem','Asia/Kabul','Asia/Karachi','Asia/Kolkata','Asia/Kuala_Lumpur','Asia/Manila',
      'Asia/Seoul','Asia/Shanghai','Asia/Singapore','Asia/Taipei','Asia/Tehran','Asia/Tokyo',
      'Atlantic/Azores','Atlantic/Reykjavik',
      'Australia/Adelaide','Australia/Brisbane','Australia/Melbourne','Australia/Sydney',
      'Europe/Amsterdam','Europe/Athens','Europe/Belgrade','Europe/Berlin','Europe/Brussels',
      'Europe/Bucharest','Europe/Budapest','Europe/Copenhagen','Europe/Dublin','Europe/Helsinki',
      'Europe/Istanbul','Europe/Kiev','Europe/Lisbon','Europe/London','Europe/Madrid',
      'Europe/Moscow','Europe/Oslo','Europe/Paris','Europe/Prague','Europe/Rome',
      'Europe/Sofia','Europe/Stockholm','Europe/Vienna','Europe/Warsaw','Europe/Zurich',
      'Pacific/Auckland','Pacific/Fiji','Pacific/Honolulu','Pacific/Midway',
    ];
  }
  const regions = {};
  for (const z of zones) {
    const slash  = z.indexOf('/');
    const region = slash > -1 ? z.slice(0, slash) : 'Other';
    if (region === 'Etc') continue;
    if (!regions[region]) regions[region] = [];
    regions[region].push(z);
  }
  let html = `<option value="">— No timezone —</option>`;
  html += `<option value="UTC" ${selected === 'UTC' ? 'selected' : ''}>UTC</option>`;
  for (const region of Object.keys(regions).sort()) {
    html += `<optgroup label="${escHtml(region)}"><option value="" disabled></option>`;
    for (const z of regions[region]) {
      const label = z.replace(/.*\//, '').replace(/_/g, ' ');
      html += `<option value="${escHtml(z)}" ${selected === z ? 'selected' : ''}>${escHtml(label)}</option>`;
    }
    html += `</optgroup>`;
  }
  return html;
}

const TZ_CALENDAR_LOCALE = {
  'Asia/Tehran':     'en-US-u-ca-persian',
  'Asia/Kabul':      'en-US-u-ca-persian',
};

export const TZClock = {
  _interval: null,

  start(tz) {
    this.stop();
    const clockEl = qs('#mission-tz-clock');
    if (!tz || !clockEl) return;
    const timeEl = qs('#tz-time');
    const dateEl = qs('#tz-date');
    const zoneEl = qs('#tz-zone');
    const dateLocale = TZ_CALENDAR_LOCALE[tz] || 'en-GB';
    const timeFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const dateFmt = new Intl.DateTimeFormat(dateLocale, { timeZone: tz, day: '2-digit', month: 'short', year: 'numeric' });
    const zoneFmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' });
    const update = () => {
      const d = new Date();
      if (timeEl) timeEl.textContent = timeFmt.format(d);
      if (dateEl) dateEl.textContent = dateFmt.format(d);
      if (zoneEl) {
        const tzPart = zoneFmt.formatToParts(d).find((p) => p.type === 'timeZoneName');
        const shortTz = tz.replace(/.*\//, '').replace(/_/g, ' ');
        zoneEl.textContent = tzPart ? `${tzPart.value} · ${shortTz}` : shortTz;
      }
    };
    update();
    clockEl.classList.remove('hidden');
    this._interval = setInterval(update, 1000);
  },

  stop() {
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
    qs('#mission-tz-clock')?.classList.add('hidden');
  },
};

// ═══════════════════════════════════════════════════════════════════════════
//  IMPORT / EXPORT
// ═══════════════════════════════════════════════════════════════════════════

/** @type {Function|null} Called after import to refresh missions list */
let _onImportDone = null;
export function setOnImportDone(fn) { _onImportDone = fn; }

export const ImportExport = {
  async exportMission(id) {
    const data = await DB.exportMissionData(id);
    const json = JSON.stringify(data, null, 2);
    downloadFile(`${data.mission.codename.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`, json);
    UI.toast('Operation exported', 'success');
  },

  async exportAll() {
    const missions = await DB.getAllMissions();
    const all = [];
    for (const m of missions) all.push(await DB.exportMissionData(m.id));
    const json = JSON.stringify({ hackerhero: true, exportedAt: now(), missions: all }, null, 2);
    downloadFile(`hackerhero_backup_${new Date().toISOString().slice(0,10)}.json`, json);
    UI.toast(`Exported ${missions.length} operation(s)`, 'success');
  },

  openImportDialog() {
    UI.openModal({
      title: 'Import Operation',
      bodyHtml: `
        <p class="text-dim" style="font-size:13px;margin-bottom:14px">
          Select a HackerHero JSON export file. Data will be imported with new IDs to avoid conflicts.
          Operator names from the original file are preserved for traceability.
        </p>
        <div class="form-group">
          <label class="form-label">JSON File</label>
          <input type="file" id="import-file" accept=".json" style="padding:6px;font-size:13px;cursor:pointer" />
        </div>
        <div class="form-group">
          <label class="form-label">Override Code Name <span class="form-hint">(optional)</span></label>
          <input type="text" id="import-codename" placeholder="Leave blank to keep original" />
        </div>`,
      confirmLabel: 'Import',
      onConfirm: async () => {
        const file = qs('#import-file').files[0];
        if (!file) { UI.toast('Please select a file', 'error'); return; }
        try {
          const text = await readFileAsText(file);
          let data;
          try { data = JSON.parse(text); } catch { UI.toast('Invalid JSON file', 'error'); return; }
          if (text.length > 100 * 1024 * 1024) { UI.toast('File too large (max 100 MB)', 'error'); return; }
          const existingMissions = await DB.getAllMissions();
          const existingNames = new Set(existingMissions.map(m => m.codename.toLowerCase()));
          const checkDuplicate = (name) => {
            if (existingNames.has(name.toLowerCase())) {
              throw new Error(`An operation named "${name}" already exists`);
            }
            existingNames.add(name.toLowerCase());
          };
          const importSingle = async (missionData) => {
            const codename = qs('#import-codename')?.value.trim() || missionData.mission.codename;
            checkDuplicate(codename);
            const { missionId } = await DB.importMissionData(missionData, qs('#import-codename')?.value.trim() || undefined);
            return missionId;
          };
          if (data.hackerhero && Array.isArray(data.missions)) {
            for (const md of data.missions) await importSingle(md);
            UI.toast(`Imported ${data.missions.length} operation(s)`, 'success');
          } else if (data.mission) {
            await importSingle(data);
            UI.toast(`Imported: ${data.mission.codename}`, 'success');
          } else { throw new Error('Unrecognized file format'); }
          UI.closeModal();
          if (_onImportDone) await _onImportDone();
        } catch (err) { UI.toast(`Import failed: ${err.message}`, 'error'); }
      },
    });
  },
};

// ── Shared Markdown renderer (used by TicketsPanel, OverviewPanel, etc.) ──────
/**
 * Renders a subset of Markdown to safe HTML.
 * Supported: headings, bold/italic/strike, inline code, fenced code blocks,
 * blockquotes, unordered and ordered lists, horizontal rules, links.
 * @param {string} raw
 * @returns {string} HTML string wrapped in <div class="md-body">
 */
export function renderMarkdown(raw) {
  if (!raw) return '';
  let s = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const blocks = [], icodes = [];
  s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _lang, code) => {
    blocks.push(`<pre class="md-pre"><code>${code.trimEnd()}</code></pre>`);
    return `\nBLOCK_PH_${blocks.length - 1}_END\n`;
  });
  s = s.replace(/`([^`\n]+)`/g, (_, c) => {
    icodes.push(`<code class="md-code">${c}</code>`);
    return `ICODE_PH_${icodes.length - 1}_END`;
  });
  const inline = (t) => {
    t = t.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    t = t.replace(/_([^_\n]+)_/g, '<em>$1</em>');
    t = t.replace(/~~(.+?)~~/g, '<del>$1</del>');
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, href) => {
      const safe = /^https?:\/\//i.test(href) ? href : '#';
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="md-link">${txt}</a>`;
    });
    icodes.forEach((c, i) => { t = t.split(`ICODE_PH_${i}_END`).join(c); });
    return t;
  };
  const lines = s.split('\n');
  const out = [];
  let ulOpen = false, olOpen = false;
  const closeList = () => {
    if (ulOpen) { out.push('</ul>'); ulOpen = false; }
    if (olOpen) { out.push('</ol>'); olOpen = false; }
  };
  for (const line of lines) {
    const t = line.trim();
    const bm = t.match(/^BLOCK_PH_(\d+)_END$/);
    if (bm) { closeList(); out.push(blocks[+bm[1]]); continue; }
    const hm = t.match(/^(#{1,4}) (.+)/);
    if (hm) { closeList(); out.push(`<h${hm[1].length} class="md-h">${inline(hm[2])}</h${hm[1].length}>`); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { closeList(); out.push('<hr class="md-hr">'); continue; }
    const bq = t.match(/^> (.*)/);
    if (bq) { closeList(); out.push(`<blockquote class="md-bq">${inline(bq[1])}</blockquote>`); continue; }
    const ul = t.match(/^[-*+] (.+)/);
    if (ul) {
      if (olOpen) { out.push('</ol>'); olOpen = false; }
      if (!ulOpen) { out.push('<ul class="md-ul">'); ulOpen = true; }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }
    const ol = t.match(/^\d+[.)]\s+(.+)/);
    if (ol) {
      if (ulOpen) { out.push('</ul>'); ulOpen = false; }
      if (!olOpen) { out.push('<ol class="md-ol">'); olOpen = true; }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }
    if (!t) { closeList(); out.push('<br>'); continue; }
    closeList();
    out.push(`${inline(t)}<br>`);
  }
  closeList();
  let html = out.join('');
  blocks.forEach((b, i) => { html = html.split(`BLOCK_PH_${i}_END`).join(b); });
  return `<div class="md-body">${html}</div>`;
}
