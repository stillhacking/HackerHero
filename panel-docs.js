/**
 * @fileoverview DocsPanel — comprehensive built-in documentation
 * @module panel-docs
 */

import { qs, qsa } from './core.js?v=20260406u';

// ═══════════════════════════════════════════════════════════════════════════
//  DOCS PANEL
// ═══════════════════════════════════════════════════════════════════════════

export const DocsPanel = {
  render() {
    qs('#panel-docs').innerHTML = `
      <div class="panel-header"><h2>&#128218; Documentation</h2></div>
      <div class="tabs" style="flex-wrap:wrap">
        <button class="tab-btn active" data-tab="overview">Overview</button>
        <button class="tab-btn" data-tab="usage">Usage Guide</button>
        <button class="tab-btn" data-tab="data-model">Data Model</button>
        <button class="tab-btn" data-tab="architecture">Architecture</button>
        <button class="tab-btn" data-tab="code">Source Code</button>
        <button class="tab-btn" data-tab="parsers">Parsers</button>
        <button class="tab-btn" data-tab="themes">Themes</button>
        <button class="tab-btn" data-tab="extending">Extending</button>
        <button class="tab-btn" data-tab="shortcuts">Shortcuts</button>
      </div>
      <div class="docs-content">
        <div class="tab-content active" id="tab-overview">${this._overview()}</div>
        <div class="tab-content"        id="tab-usage">${this._usage()}</div>
        <div class="tab-content"        id="tab-data-model">${this._dataModel()}</div>
        <div class="tab-content"        id="tab-architecture">${this._architecture()}</div>
        <div class="tab-content"        id="tab-code">${this._code()}</div>
        <div class="tab-content"        id="tab-parsers">${this._parsers()}</div>
        <div class="tab-content"        id="tab-themes">${this._themes()}</div>
        <div class="tab-content"        id="tab-extending">${this._extending()}</div>
        <div class="tab-content"        id="tab-shortcuts">${this._shortcuts()}</div>
      </div>`;

    qsa('#panel-docs .tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        qsa('#panel-docs .tab-btn').forEach((b) => b.classList.remove('active'));
        qsa('#panel-docs .tab-content').forEach((c) => c.classList.remove('active'));
        btn.classList.add('active');
        qs(`#tab-${btn.dataset.tab}`).classList.add('active');
      });
    });
  },

  /* ─────────────────────────────── OVERVIEW ─────────────────────────────── */
  _overview: () => `
    <h2>HackerHero — Red Team Operations Manager</h2>
    <p><strong>HackerHero</strong> is a local-first, offline-capable single-page application for managing red team / pentest operations. All data is stored in the browser's IndexedDB — no server, no internet, no account required.</p>

    <h3>Key Features</h3>
    <table class="data-table"><tbody>
      <tr><td>📋</td><td><strong>Operations</strong></td><td>Create, archive, import/export full operation files (JSON).</td></tr>
      <tr><td>📊</td><td><strong>Dashboard</strong></td><td>KPIs, activity sparkline, objectives tracker, targets, mission briefing (Markdown).</td></tr>
      <tr><td>🌐</td><td><strong>Network Zones</strong></td><td>Organize assets by network zones (DMZ, Internal, Cloud…). Multi-zone support.</td></tr>
      <tr><td>📦</td><td><strong>Asset Tree</strong></td><td>Hierarchical asset management with 142 SVG icons, status badges, and nested data items.</td></tr>
      <tr><td>🔍</td><td><strong>Auto-Parsing</strong></td><td>60 parsers auto-detect pasted command output (nmap, ip addr, netstat, etc.).</td></tr>
      <tr><td>🔎</td><td><strong>Search</strong></td><td>Full-text search with keyword query language, regex mode, and advanced filters.</td></tr>
      <tr><td>🎫</td><td><strong>Tickets</strong></td><td>Minimalist issue tracker with priorities, forum-style messages, and image attachments.</td></tr>
      <tr><td>📜</td><td><strong>Changelog</strong></td><td>Full audit log of every change with operator identity, timestamps, and one-click revert.</td></tr>
      <tr><td>🎨</td><td><strong>8 Themes</strong></td><td>Dark, Light, Focus, Matrix, Upside Down, Operation, WarGames, Hack The Planet.</td></tr>
      <tr><td>💾</td><td><strong>Demo Mode</strong></td><td>Load 3 realistic demo operations with full data to explore the app.</td></tr>
    </tbody></table>

    <h3>Technology</h3>
    <ul>
      <li><strong>Stack</strong>: Vanilla JavaScript ES modules — no framework, no build step, no dependencies.</li>
      <li><strong>Storage</strong>: IndexedDB v7 with 11 object stores and Promise-based API.</li>
      <li><strong>Styling</strong>: Pure CSS with custom properties. 8 themes via <code>[data-theme]</code>.</li>
      <li><strong>Serving</strong>: Any static HTTP server (<code>python3 -m http.server 8000</code>) or Docker (<code>nginx:alpine</code>).</li>
      <li><strong>Docker</strong>: <code>docker build -t hackerhero . &amp;&amp; docker run -d -p 8080:80 hackerhero</code></li>
      <li><strong>Browser</strong>: Chrome, Firefox, Edge, Safari (modern ES module support required).</li>
    </ul>`,

  /* ─────────────────────────────── USAGE ────────────────────────────────── */
  _usage: () => `
    <h2>Usage Guide</h2>

    <h3>1. First Launch</h3>
    <p>On first launch, HackerHero generates a random operator name (from Magic: The Gathering creature names). You can change it in <strong>Settings → Operator Identity</strong>. This name is attached to every change you make.</p>

    <h3>2. Creating an Operation</h3>
    <ol>
      <li>Click <strong>+ New Operation</strong> on the Operations panel.</li>
      <li>Fill in: <strong>Code Name</strong> (required), <strong>Targets</strong> (comma-separated), <strong>Objectives</strong> (one per line, checkable), and <strong>Context/Notes</strong> (Markdown supported).</li>
      <li>Click <strong>→ Enter</strong> on any operation card to make it active. This unlocks all mission-specific panels.</li>
    </ol>

    <h3>3. Overview Dashboard</h3>
    <p>The Overview shows at a glance:</p>
    <ul>
      <li><strong>KPI strip</strong>: zones, assets, pwned, HVT, open tickets, objectives completion %.</li>
      <li><strong>Activity sparkline</strong>: 30-day activity histogram.</li>
      <li><strong>Recent Activity</strong>: last 20 changes — <em>click any entry to navigate directly to the entity</em>.</li>
      <li><strong>Objectives</strong>: progress ring + checkable objective list.</li>
      <li><strong>Targets</strong>: editable target list with status tracking.</li>
      <li><strong>Mission Briefing</strong>: Markdown-rendered notes with Edit/Preview tabs and formatting toolbar.</li>
    </ul>

    <h3>4. Network Zones & Assets</h3>
    <h4>Zones sidebar (left column)</h4>
    <ul>
      <li><strong>+Z</strong> creates a new zone (name, color, IP range, notes).</li>
      <li><strong>All zones</strong> shows assets across all zones. <strong>Unzoned</strong> shows orphan assets.</li>
      <li>Zones can be collapsed (◀ button) to show only colored dots. Hover a dot to see the zone name.</li>
      <li>Filter zones with the search input.</li>
    </ul>
    <h4>Assets tree (middle column)</h4>
    <ul>
      <li><strong>+A</strong> adds a new asset to the selected zone.</li>
      <li>Assets support: name, IP, OS, icon (142 SVG icons), multi-zone assignment, key asset flag (★), and 5 statuses.</li>
      <li>Data items can be added to any asset with <strong>+</strong>. Paste command output and the parser auto-detects the format.</li>
      <li>Expand/collapse arrows are colored when the node has children.</li>
      <li>The assets column can be collapsed (◀ button).</li>
    </ul>
    <h4>Data viewer (right column)</h4>
    <ul>
      <li>Shows the selected data item's content with name, icon, status badges, and metadata.</li>
      <li><strong>Format selector</strong>: detected formats appear with confidence scores. "All formats" lists all 60 parsers for manual selection.</li>
      <li><strong>Auto-detect</strong>: on new items, the best parser is auto-applied. On existing items, it only detects — you must click Apply.</li>
      <li><strong>Version history</strong>: every save creates a snapshot. Diff view shows side-by-side changes.</li>
      <li><strong>Attachments</strong>: drag & drop or click to attach images (10 MB max). Click to view in lightbox.</li>
    </ul>

    <h4>Asset Statuses</h4>
    <table class="data-table"><tbody>
      <tr><td>🔓</td><td><strong>Pwned</strong></td><td style="color:#ef4444">Red</td><td>Compromised / access obtained</td></tr>
      <tr><td>🎯</td><td><strong>HVT</strong></td><td style="color:#eab308">Yellow</td><td>High-value target</td></tr>
      <tr><td>👁</td><td><strong>Interesting</strong></td><td style="color:#3b82f6">Blue</td><td>Worth investigating further</td></tr>
      <tr><td>📌</td><td><strong>Todo</strong></td><td style="color:#f97316">Orange</td><td>Pending action</td></tr>
      <tr><td>✅</td><td><strong>Done</strong></td><td style="color:#22c55e">Green</td><td>Completed / no further action</td></tr>
    </tbody></table>

    <h3>5. Search</h3>
    <ul>
      <li>Full-text search across zones, assets, data items, and objectives.</li>
      <li><strong>Query language</strong>: <code>HVT</code>, <code>TODO</code>, <code>PWNED</code>, <code>Interesting</code>, <code>Done</code>, <code>hasTickets</code>, <code>isAsset</code>, <code>isData</code>, <code>isZone</code>, <code>inZone=DMZ</code>.</li>
      <li><strong>Advanced panel</strong>: date range, operator, zone, type filter, regex mode.</li>
      <li>Results are grouped by type (zones, assets, data items, objectives) and clickable.</li>
    </ul>

    <h3>6. Tickets</h3>
    <ul>
      <li>Create tickets linked to a zone, asset, or data item (via the 🎫 button).</li>
      <li>4 priority levels: 🟢 Low, 🟡 Medium, 🟠 High, 🔴 Critical.</li>
      <li>Forum-style message thread with operator-colored avatars.</li>
      <li>Image attachments in messages. Markdown formatting in posts.</li>
      <li>Open/Closed tabs with ticket count.</li>
    </ul>

    <h3>7. Changelog</h3>
    <ul>
      <li>Every create/update/delete is logged with operator name, timestamp, and full state snapshots.</li>
      <li>Filter by operator and/or action type.</li>
      <li>Click the ⌫ button to revert any change (restores previous state).</li>
      <li><strong>Click any entry</strong> to navigate directly to the related zone, asset, data item, or ticket.</li>
    </ul>

    <h3>8. Import / Export</h3>
    <ul>
      <li><strong>Export</strong>: downloads a self-contained JSON file per operation (⬇ button on operation card).</li>
      <li><strong>Export All</strong>: in Settings, exports every operation in one file.</li>
      <li><strong>Import</strong>: loads a JSON file (⬆ button). All IDs are regenerated to avoid collisions.</li>
      <li>Supports migration from legacy single-zone format to multi-zone.</li>
    </ul>`,

  /* ────────────────────────────── DATA MODEL ───────────────────────────── */
  _dataModel: () => `
    <h2>Data Model</h2>
    <p>All data is stored in IndexedDB (<code>HackerHeroDB</code>, schema version 7) with 11 object stores.</p>

    <h3>Entity Relationship</h3>
    <pre style="font-size:12px;line-height:1.6">
┌─────────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   Mission   │────▶│   Zone   │     │  Ticket  │────▶│ Message  │
│             │     └──────────┘     └──────────┘     └──────────┘
│             │────▶│  Asset   │────▶│ Subitem  │
│             │     │ zoneIds[]│     │ parentId │
│             │     │ parentId │     └──────────┘
│             │     └──────────┘          │
│             │                    ┌──────┴───────┐
│             │────▶│ Changelog │  │   Versions   │
│             │     └───────────┘  └──────────────┘
└─────────────┘
   │
   ▼
┌─────────────┐
│ Attachment  │  (linked to asset, subitem, or ticket message)
└─────────────┘</pre>

    <h3>Mission</h3>
    <table class="data-table"><thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead><tbody>
      <tr><td><code>id</code></td><td>string</td><td>Unique identifier</td></tr>
      <tr><td><code>codename</code></td><td>string</td><td>Operation code name (required)</td></tr>
      <tr><td><code>targets</code></td><td>Target[]</td><td>Array of {id, name, status}</td></tr>
      <tr><td><code>objectives</code></td><td>Objective[]</td><td>Array of {id, text, status, createdAt, createdBy}</td></tr>
      <tr><td><code>context</code></td><td>string</td><td>Mission briefing notes (Markdown)</td></tr>
      <tr><td><code>timezone</code></td><td>string</td><td>IANA timezone (e.g. "Europe/Paris")</td></tr>
      <tr><td><code>status</code></td><td>string</td><td>Operation status: 'active' | 'archived'</td></tr>
      <tr><td><code>createdAt/By</code></td><td>string</td><td>Creation timestamp and operator</td></tr>
      <tr><td><code>updatedAt/By</code></td><td>string</td><td>Last modification timestamp and operator</td></tr>
    </tbody></table>

    <h3>Zone</h3>
    <table class="data-table"><thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead><tbody>
      <tr><td><code>id</code></td><td>string</td><td>Unique identifier</td></tr>
      <tr><td><code>missionId</code></td><td>string</td><td>Parent mission</td></tr>
      <tr><td><code>name</code></td><td>string</td><td>Zone name (e.g. "DMZ", "Internal")</td></tr>
      <tr><td><code>color</code></td><td>string</td><td>CSS color (hex)</td></tr>
      <tr><td><code>ipRange</code></td><td>string</td><td>Network range notation (e.g. "10.0.0.0/24")</td></tr>
      <tr><td><code>description</code></td><td>string</td><td>Zone description / notes</td></tr>
    </tbody></table>

    <h3>Asset</h3>
    <table class="data-table"><thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead><tbody>
      <tr><td><code>id</code></td><td>string</td><td>Unique identifier</td></tr>
      <tr><td><code>missionId</code></td><td>string</td><td>Parent mission</td></tr>
      <tr><td><code>zoneIds</code></td><td>string[]</td><td>Multi-zone assignment (multiEntry index)</td></tr>
      <tr><td><code>parentId</code></td><td>string|null</td><td>Parent asset (null = root)</td></tr>
      <tr><td><code>name</code></td><td>string</td><td>Asset hostname / name</td></tr>
      <tr><td><code>ip</code></td><td>string</td><td>IP address</td></tr>
      <tr><td><code>os</code></td><td>string</td><td>Operating system</td></tr>
      <tr><td><code>icon</code></td><td>string</td><td>Icon ID (from 142 SVG icons)</td></tr>
      <tr><td><code>isKey</code></td><td>boolean</td><td>Key asset flag (★)</td></tr>
      <tr><td><code>statuses</code></td><td>string[]</td><td>Status badges: pwned, hvt, interesting, todo, done</td></tr>
      <tr><td><code>description</code></td><td>string</td><td>Free-text description</td></tr>
      <tr><td><code>createdAt/By</code></td><td>string</td><td>Creation timestamp and operator</td></tr>
      <tr><td><code>updatedAt/By</code></td><td>string</td><td>Last modification timestamp and operator</td></tr>
    </tbody></table>

    <h3>Subitem (Data Item)</h3>
    <table class="data-table"><thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead><tbody>
      <tr><td><code>id</code></td><td>string</td><td>Unique identifier</td></tr>
      <tr><td><code>assetId</code></td><td>string</td><td>Parent asset</td></tr>
      <tr><td><code>parentId</code></td><td>string|null</td><td>Parent subitem (for nesting)</td></tr>
      <tr><td><code>name</code></td><td>string</td><td>Item name (auto-detected or manual)</td></tr>
      <tr><td><code>content</code></td><td>string</td><td>Raw text content (command output, notes…)</td></tr>
      <tr><td><code>icon</code></td><td>string</td><td>Icon ID (auto from parser or manual)</td></tr>
      <tr><td><code>parsedType</code></td><td>string</td><td>Parser ID used (e.g. "nmap", "ip_addr")</td></tr>
      <tr><td><code>parsedData</code></td><td>Object</td><td>Structured parser result</td></tr>
      <tr><td><code>statuses</code></td><td>string[]</td><td>Status badges (same as assets)</td></tr>
    </tbody></table>

    <h3>Ticket</h3>
    <table class="data-table"><thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead><tbody>
      <tr><td><code>id</code></td><td>string</td><td>Unique identifier</td></tr>
      <tr><td><code>missionId</code></td><td>string</td><td>Parent mission</td></tr>
      <tr><td><code>title</code></td><td>string</td><td>Ticket title</td></tr>
      <tr><td><code>priority</code></td><td>string</td><td>low | medium | high | critical</td></tr>
      <tr><td><code>status</code></td><td>string</td><td>open | closed</td></tr>
      <tr><td><code>refType</code></td><td>string</td><td>Entity type: zone | asset | subitem</td></tr>
      <tr><td><code>refId</code></td><td>string</td><td>Linked entity ID</td></tr>
    </tbody></table>

    <h3>ChangelogEntry</h3>
    <table class="data-table"><thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead><tbody>
      <tr><td><code>id</code></td><td>string</td><td>Unique identifier</td></tr>
      <tr><td><code>missionId</code></td><td>string</td><td>Parent mission</td></tr>
      <tr><td><code>action</code></td><td>string</td><td>create | update | delete</td></tr>
      <tr><td><code>entityType</code></td><td>string</td><td>mission | zone | asset | subitem | ticket</td></tr>
      <tr><td><code>entityId</code></td><td>string</td><td>Affected entity ID</td></tr>
      <tr><td><code>description</code></td><td>string</td><td>Human-readable change description</td></tr>
      <tr><td><code>operator</code></td><td>string</td><td>Who made the change</td></tr>
      <tr><td><code>timestamp</code></td><td>string</td><td>ISO timestamp</td></tr>
      <tr><td><code>previousState</code></td><td>Object</td><td>Full entity snapshot before change (for revert)</td></tr>
      <tr><td><code>newState</code></td><td>Object</td><td>Full entity snapshot after change</td></tr>
    </tbody></table>

    <h3>Attachment</h3>
    <table class="data-table"><thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead><tbody>
      <tr><td><code>id</code></td><td>string</td><td>Unique identifier</td></tr>
      <tr><td><code>missionId</code></td><td>string</td><td>Parent mission</td></tr>
      <tr><td><code>refType</code></td><td>string</td><td>Entity type: asset | subitem | ticketMessage</td></tr>
      <tr><td><code>refId</code></td><td>string</td><td>Parent entity ID</td></tr>
      <tr><td><code>fileName</code></td><td>string</td><td>Original file name</td></tr>
      <tr><td><code>mimeType</code></td><td>string</td><td>MIME type</td></tr>
      <tr><td><code>dataUrl</code></td><td>string</td><td>Base64 data URL (full image)</td></tr>
      <tr><td><code>thumbnail</code></td><td>string</td><td>Resized thumbnail data URL</td></tr>
    </tbody></table>

    <h3>IndexedDB Stores</h3>
    <table class="data-table"><thead><tr><th>Store</th><th>Key</th><th>Indexes</th></tr></thead><tbody>
      <tr><td>settings</td><td>key</td><td>—</td></tr>
      <tr><td>missions</td><td>id</td><td>by-codename, by-created</td></tr>
      <tr><td>zones</td><td>id</td><td>by-mission</td></tr>
      <tr><td>assets</td><td>id</td><td>by-mission, by-zone (multiEntry), by-parent</td></tr>
      <tr><td>subitems</td><td>id</td><td>by-asset, by-parent</td></tr>
      <tr><td>assetVersions</td><td>id</td><td>by-asset, by-timestamp</td></tr>
      <tr><td>subitemVersions</td><td>id</td><td>by-subitem, by-timestamp</td></tr>
      <tr><td>changelog</td><td>id</td><td>by-mission, by-timestamp</td></tr>
      <tr><td>tickets</td><td>id</td><td>by-mission, by-ref</td></tr>
      <tr><td>ticketMessages</td><td>id</td><td>by-ticket</td></tr>
      <tr><td>attachments</td><td>id</td><td>by-mission, by-ref</td></tr>
    </tbody></table>`,

  /* ──────────────────────────── ARCHITECTURE ────────────────────────────── */
  _architecture: () => `
    <h2>Application Architecture</h2>

    <h3>High-Level Overview</h3>
    <pre style="font-size:12px;line-height:1.6">
┌─────────────────────────────────────────────────────┐
│                   index.html                        │
│  HTML shell: header, sidebar, 8 panel containers,   │
│  modal, toast, canvas overlays                      │
└───────────────────────┬─────────────────────────────┘
                        │ loads
┌───────────────────────▼─────────────────────────────┐
│                    app.js                           │
│  Thin orchestrator: imports all modules, wires      │
│  panel router, handles init + browser navigation    │
└───────────────────────┬─────────────────────────────┘
           ┌────────────┼────────────┐
           ▼            ▼            ▼
     ┌──────────┐ ┌──────────┐ ┌──────────┐
     │ core.js  │ │  db.js   │ │ utils.js │
     │ State    │ │ IndexedDB│ │ helpers  │
     │ UI       │ │ CRUD API │ │ DOM, fmt │
     │ Themes   │ │ v7       │ │ sanitize │
     │ Lightbox │ └──────────┘ └──────────┘
     │ Markdown │
     └────┬─────┘
          │ re-exports everything
          ▼
┌──────────────────────────────────────────────────────┐
│                  Panel Modules                       │
│                                                      │
│  panel-missions.js   Operations CRUD                 │
│  panel-overview.js   Dashboard + KPIs                │
│  panel-assets.js     Zones, asset tree, data viewer  │
│  panel-search.js     Full-text + query search        │
│  panel-changelog.js  Audit log + revert              │
│  panel-tickets.js    Issue tracker + messages         │
│  panel-settings.js   Identity, themes, data, demo    │
│  panel-docs.js       This documentation              │
│                                                      │
│  + parsers.js        60 command output parsers        │
│  + asset-icons.js    142 SVG icons                    │
│  + magic-names.js    Random operator names            │
│  + demo-data.js      Demo data generator              │
└──────────────────────────────────────────────────────┘</pre>

    <h3>Design Principles</h3>
    <ul>
      <li><strong>Zero dependencies</strong> — no npm, no bundler, no framework. Pure vanilla ES modules.</li>
      <li><strong>Local-first</strong> — all data in IndexedDB. Zero network requests after initial page load.</li>
      <li><strong>Single State object</strong> — <code>State</code> in core.js is the single source of truth for UI state.</li>
      <li><strong>Panel pattern</strong> — each panel is a plain object with <code>render()</code> / <code>bindEvents()</code>. No classes, no lifecycle.</li>
      <li><strong>Imperative DOM</strong> — HTML is built as template literals, inserted via <code>innerHTML</code>, events bound post-render.</li>
      <li><strong>Audit everything</strong> — every mutation calls <code>logChange()</code> with full before/after snapshots for revert.</li>
      <li><strong>Cache busting</strong> — all module imports use <code>?v=YYYYMMDDX</code> suffixes, bumped on every release.</li>
    </ul>

    <h3>Module Dependency Graph</h3>
    <pre style="font-size:11px;line-height:1.5">
app.js
├── core.js  (re-exports: utils.js, db.js, magic-names.js, parsers.js, asset-icons.js)
├── panel-missions.js   ← core.js
├── panel-overview.js   ← core.js, panel-missions.js, panel-assets.js
├── panel-assets.js     ← core.js, panel-tickets.js (lazy)
├── panel-search.js     ← core.js, panel-assets.js
├── panel-changelog.js  ← core.js, panel-assets.js
├── panel-tickets.js    ← core.js, panel-assets.js
├── panel-settings.js   ← core.js, demo-data.js
└── panel-docs.js       ← core.js</pre>

    <h3>Panel Router</h3>
    <p>Navigation is handled by <code>showPanel(panelId)</code> in core.js. The router:</p>
    <ol>
      <li>Hides all <code>.panel</code> sections, shows the target one.</li>
      <li>Updates sidebar <code>.nav-item</code> active state.</li>
      <li>Pushes browser history (<code>#panelId</code>) for Back/Forward support.</li>
      <li>Calls the registered panel render callback (from app.js).</li>
    </ol>

    <h3>State Management</h3>
    <pre style="font-size:12px;line-height:1.6">
State = {
  operatorName:    null,    // string — current operator identity
  activeMission:   null,    // Mission object or null
  currentTheme:    'dark',  // theme ID
  currentPanel:    'missions',
  selectedZoneId:  null,    // zone being viewed
  selectedAssetId: null,    // asset being viewed
  selectedSubitemId: null,  // data item being viewed
  zonesCollapsed:  false,   // zones sidebar toggle
  assetsCollapsed: false,   // assets column toggle
}</pre>

    <h3>Changelog & Revert System</h3>
    <p>Every DB mutation is followed by a call to <code>logChange(action, entityType, entityId, entityName, description, previousState, newState)</code>. This creates a ChangelogEntry with full object snapshots. The revert system restores <code>previousState</code> by calling the appropriate DB save/delete method.</p>

    <h3>Deployment</h3>
    <h4>Option 1 — Python (development)</h4>
    <pre>cd HackerHero
python3 -m http.server 8000
# open http://localhost:8000</pre>

    <h4>Option 2 — Docker (recommended for shared lab environments)</h4>
    <pre># Build the image
docker build -t hackerhero .

# Run the container
docker run -d -p 8080:80 --name hackerhero hackerhero

# open http://localhost:8080

# Stop / remove
docker stop hackerhero &amp;&amp; docker rm hackerhero</pre>
    <p><strong>Note:</strong> Data is stored in the <em>browser's</em> IndexedDB — not inside the container. The container is stateless. Use <strong>Export All</strong> to back up your data before removing the container or switching browsers.</p>`,

  /* ──────────────────────────── SOURCE CODE ─────────────────────────────── */
  _code: () => `
    <h2>Source Code Structure</h2>
    <pre style="font-size:12px;line-height:1.8">
HackerHero/
├── index.html              HTML shell (8 panels, sidebar, modal, overlays)
├── Dockerfile              Docker image (nginx:alpine, port 80)
├── css/
│   └── app.css             All styles + 8 themes (~3,460 lines)
├── js/
│   ├── app.js              Orchestrator: imports, routing, init (~130 lines)
│   ├── core.js             Shared core: State, UI, ThemeManager, Lightbox,
│   │                       TZClock, ImportExport, renderMarkdown (~680 lines)
│   ├── db.js               IndexedDB wrapper: 11 stores, all CRUD (~930 lines)
│   ├── utils.js            Utility functions: UUID, dates, DOM, sanitize (~390 lines)
│   ├── magic-names.js      Random operator names (~340 lines)
│   ├── parsers.js          60 command output parsers (~3,160 lines)
│   ├── asset-icons.js      142 SVG icons in 12 categories (~570 lines)
│   ├── demo-data.js        Demo data generator: 3 ops, 6 operators (~920 lines)
│   ├── panel-missions.js   Operations CRUD + import (~370 lines)
│   ├── panel-overview.js   Dashboard: KPIs, activity, objectives (~500 lines)
│   ├── panel-assets.js     Zones, asset tree, data viewer, parsers (~2,180 lines)
│   ├── panel-search.js     Search: full-text, query language, advanced (~440 lines)
│   ├── panel-changelog.js  Audit log with filters + revert (~180 lines)
│   ├── panel-tickets.js    Tickets: list, detail, messages (~470 lines)
│   ├── panel-settings.js   Identity, themes, data mgmt, demo (~200 lines)
│   └── panel-docs.js       This documentation
└── docs/
    └── index.html          Offline documentation (standalone)</pre>

    <h3>Module Exports</h3>

    <h4>core.js — Shared Singletons & Re-exports</h4>
    <table class="data-table"><thead><tr><th>Export</th><th>Type</th><th>Description</th></tr></thead><tbody>
      <tr><td><code>State</code></td><td>object</td><td>Global mutable application state</td></tr>
      <tr><td><code>DB</code></td><td>object</td><td>IndexedDB API (re-export from db.js)</td></tr>
      <tr><td><code>UI</code></td><td>object</td><td>Modal, toast, confirm, tooltip</td></tr>
      <tr><td><code>ThemeManager</code></td><td>object</td><td>Theme switcher + visual effects (matrix rain, upside-down, etc.)</td></tr>
      <tr><td><code>Lightbox</code></td><td>object</td><td>Full-screen image gallery with keyboard nav</td></tr>
      <tr><td><code>TZClock</code></td><td>object</td><td>Live timezone clock in header</td></tr>
      <tr><td><code>ImportExport</code></td><td>object</td><td>JSON import/export with ID remapping</td></tr>
      <tr><td><code>showPanel</code></td><td>function</td><td>Panel router: show panel by ID</td></tr>
      <tr><td><code>logChange</code></td><td>function</td><td>Audit log: records mutation with full state snapshots</td></tr>
      <tr><td><code>renderMarkdown</code></td><td>function</td><td>Lightweight Markdown → HTML</td></tr>
      <tr><td><code>renderAttachmentStrip</code></td><td>function</td><td>Thumbnail strip with upload for any entity</td></tr>
      <tr><td><code>PARSERS</code></td><td>array</td><td>All 60 parser definitions (re-export)</td></tr>
      <tr><td><code>detectParsers</code></td><td>function</td><td>Rank parsers by confidence for given text</td></tr>
      <tr><td><code>runParser</code></td><td>function</td><td>Execute a specific parser on text</td></tr>
      <tr><td><code>ASSET_ICONS</code></td><td>array</td><td>142 icon definitions with SVG + keywords</td></tr>
      <tr><td><code>PARSER_ICON_MAP</code></td><td>object</td><td>Parser ID → icon ID mapping</td></tr>
    </tbody></table>

    <h4>panel-assets.js — Shared Helpers</h4>
    <p>These are imported by SearchPanel, TicketsPanel, OverviewPanel, and ChangelogPanel:</p>
    <table class="data-table"><thead><tr><th>Export</th><th>Description</th></tr></thead><tbody>
      <tr><td><code>ASSET_ICON</code></td><td>Default emoji fallback '📦'</td></tr>
      <tr><td><code>assetIcon(asset)</code></td><td>Resolve SVG icon or emoji for an asset</td></tr>
      <tr><td><code>subitemIcon(item)</code></td><td>Resolve SVG icon or emoji for a data item</td></tr>
      <tr><td><code>ASSET_STATUSES</code></td><td>5 statuses with label, color, icon</td></tr>
      <tr><td><code>normalizeStatuses(arr)</code></td><td>Normalize status aliases</td></tr>
      <tr><td><code>TICKET_PRIORITIES</code></td><td>4 priorities with label, color, icon</td></tr>
      <tr><td><code>QUERY_KEYWORDS</code></td><td>11 keywords for the search query language</td></tr>
      <tr><td><code>parseQuery(raw)</code></td><td>Parse search string into OR/AND branches</td></tr>
      <tr><td><code>matchDescriptor(desc, branches)</code></td><td>Test a data descriptor against query</td></tr>
      <tr><td><code>openIconPicker(anchor, currentId, onSelect)</code></td><td>Filterable icon picker popup</td></tr>
      <tr><td><code>AssetsPanel</code></td><td>Panel object: render, navigateTo, showAssetDetail, showSubitemContent…</td></tr>
    </tbody></table>

    <h4>utils.js — Utility Functions</h4>
    <table class="data-table"><thead><tr><th>Function</th><th>Description</th></tr></thead><tbody>
      <tr><td><code>generateId()</code></td><td>Random unique 21-char ID</td></tr>
      <tr><td><code>now()</code></td><td>ISO timestamp string</td></tr>
      <tr><td><code>formatDate(iso)</code></td><td>Short date format</td></tr>
      <tr><td><code>formatDateFull(iso)</code></td><td>Full date+time format</td></tr>
      <tr><td><code>timeAgo(iso)</code></td><td>Relative time ("3h ago")</td></tr>
      <tr><td><code>truncate(str, n)</code></td><td>Truncate with ellipsis</td></tr>
      <tr><td><code>escHtml(str)</code></td><td>HTML entity escaping</td></tr>
      <tr><td><code>highlight(text, query)</code></td><td>Highlight search matches</td></tr>
      <tr><td><code>debounce(fn, ms)</code></td><td>Debounce wrapper</td></tr>
      <tr><td><code>qs(sel)</code></td><td>querySelector shorthand</td></tr>
      <tr><td><code>qsa(sel)</code></td><td>querySelectorAll shorthand</td></tr>
      <tr><td><code>el(tag, attrs, children)</code></td><td>DOM element factory</td></tr>
      <tr><td><code>deepClone(obj)</code></td><td>Structured clone</td></tr>
      <tr><td><code>sanitizeString(str)</code></td><td>XSS-safe sanitization</td></tr>
      <tr><td><code>deepSanitize(obj)</code></td><td>Recursive sanitize for imported JSON</td></tr>
      <tr><td><code>validateImport(data)</code></td><td>Validate import data shape</td></tr>
    </tbody></table>`,

  /* ──────────────────────────── PARSERS ─────────────────────────────────── */
  _parsers: () => `
    <h2>Command Output Parsers</h2>
    <p>HackerHero includes <strong>60 parsers</strong> that auto-detect and parse pasted command output. Each parser implements:</p>
    <ul>
      <li><code>detect(text) → confidence</code> — returns 0.0–1.0 confidence score</li>
      <li><code>parse(text) → parsedData</code> — structured extraction</li>
      <li><code>suggestName(parsedData)</code> — suggested parent asset name</li>
      <li><code>suggestItemName(parsedData)</code> — suggested data item name</li>
    </ul>

    <h3>Auto-Detection</h3>
    <p>When you paste content into a data item, all 60 parsers run their <code>detect()</code> function. Results above 10% confidence are ranked and shown in the format selector. On <strong>new items</strong>, the best match (≥25%) is auto-applied. On <strong>existing items</strong>, you must click "Apply" manually.</p>
    <p>You can also manually pick any format from the "All formats" dropdown — even if auto-detection didn't flag it.</p>

    <h3>Parser List by Category</h3>

    <h4>🌐 IP Addresses</h4>
    <table class="data-table"><tbody>
      <tr><td><code>ip_address_v4</code></td><td>IPv4 Address</td></tr>
      <tr><td><code>ip_address_v6</code></td><td>IPv6 Address</td></tr>
    </tbody></table>

    <h4>🔌 Network & Identity</h4>
    <table class="data-table"><tbody>
      <tr><td><code>ip_addr</code></td><td>Linux <code>ip addr show</code></td></tr>
      <tr><td><code>ifconfig</code></td><td>Linux/macOS <code>ifconfig</code></td></tr>
      <tr><td><code>ipconfig</code></td><td>Windows <code>ipconfig /all</code></td></tr>
      <tr><td><code>id_whoami</code></td><td>Linux <code>id</code> / <code>whoami</code></td></tr>
      <tr><td><code>whoami_all</code></td><td>Windows <code>whoami /all</code></td></tr>
      <tr><td><code>uname</code></td><td><code>uname -a</code></td></tr>
      <tr><td><code>os_release</code></td><td><code>/etc/os-release</code></td></tr>
    </tbody></table>

    <h4>🔍 Scanning</h4>
    <table class="data-table"><tbody>
      <tr><td><code>nmap</code></td><td>nmap scan (normal + greppable)</td></tr>
      <tr><td><code>port_scan</code></td><td>Generic port scan output</td></tr>
      <tr><td><code>web_fuzz</code></td><td>Web fuzzer (gobuster, ffuf, dirsearch)</td></tr>
      <tr><td><code>nikto</code></td><td>Nikto web scanner</td></tr>
      <tr><td><code>dns_lookup</code></td><td>DNS queries (dig, nslookup, host)</td></tr>
    </tbody></table>

    <h4>🔗 Connections & Routing</h4>
    <table class="data-table"><tbody>
      <tr><td><code>netstat</code></td><td><code>netstat -an</code></td></tr>
      <tr><td><code>ss</code></td><td>Linux <code>ss -tlnp</code></td></tr>
      <tr><td><code>arp</code></td><td>ARP table</td></tr>
      <tr><td><code>route</code></td><td>Routing table</td></tr>
      <tr><td><code>lsof</code></td><td><code>lsof -i</code></td></tr>
    </tbody></table>

    <h4>⚙️ Processes & Services</h4>
    <table class="data-table"><tbody>
      <tr><td><code>ps_faux</code></td><td><code>ps faux</code> (tree format)</td></tr>
      <tr><td><code>ps_aux</code></td><td><code>ps aux</code></td></tr>
      <tr><td><code>tasklist</code></td><td>Windows <code>tasklist</code></td></tr>
      <tr><td><code>sc_query</code></td><td>Windows <code>sc query</code></td></tr>
      <tr><td><code>schtasks</code></td><td>Windows <code>schtasks</code></td></tr>
      <tr><td><code>crontab</code></td><td>Linux <code>crontab -l</code></td></tr>
    </tbody></table>

    <h4>💻 System Info</h4>
    <table class="data-table"><tbody>
      <tr><td><code>systeminfo</code></td><td>Windows <code>systeminfo</code></td></tr>
      <tr><td><code>mount_df</code></td><td><code>mount</code> / <code>df</code></td></tr>
      <tr><td><code>etc_fstab</code></td><td><code>/etc/fstab</code></td></tr>
      <tr><td><code>env_vars</code></td><td>Environment variables</td></tr>
      <tr><td><code>pkg_list</code></td><td>Package lists (dpkg, rpm, pip, gem)</td></tr>
      <tr><td><code>dir_ls</code></td><td>Directory listings (<code>ls -la</code>, <code>dir</code>)</td></tr>
      <tr><td><code>wmic</code></td><td>Windows <code>wmic</code></td></tr>
    </tbody></table>

    <h4>🔑 Files & Secrets</h4>
    <table class="data-table"><tbody>
      <tr><td><code>etc_passwd</code></td><td><code>/etc/passwd</code></td></tr>
      <tr><td><code>etc_shadow</code></td><td><code>/etc/shadow</code></td></tr>
      <tr><td><code>etc_hosts</code></td><td><code>/etc/hosts</code></td></tr>
      <tr><td><code>etc_group</code></td><td><code>/etc/group</code></td></tr>
      <tr><td><code>resolv_conf</code></td><td><code>/etc/resolv.conf</code></td></tr>
      <tr><td><code>ssh_priv_key</code></td><td>SSH private key</td></tr>
      <tr><td><code>ssh_pub_key</code></td><td>SSH public key</td></tr>
      <tr><td><code>authorized_keys</code></td><td><code>authorized_keys</code></td></tr>
      <tr><td><code>known_hosts</code></td><td><code>known_hosts</code></td></tr>
      <tr><td><code>ssh_keys</code></td><td>SSH key listing</td></tr>
      <tr><td><code>hash_list</code></td><td>Hash dumps (NTLM, MD5, SHA…)</td></tr>
      <tr><td><code>http_headers</code></td><td>HTTP response headers</td></tr>
      <tr><td><code>cmd_history</code></td><td>Shell command history</td></tr>
    </tbody></table>

    <h4>👤 Users & Privileges</h4>
    <table class="data-table"><tbody>
      <tr><td><code>net_user</code></td><td>Windows <code>net user</code></td></tr>
      <tr><td><code>net_localgroup</code></td><td>Windows <code>net localgroup</code></td></tr>
      <tr><td><code>net_share</code></td><td>Windows <code>net share</code></td></tr>
      <tr><td><code>sudo_l</code></td><td><code>sudo -l</code></td></tr>
      <tr><td><code>etc_sudoers</code></td><td><code>/etc/sudoers</code></td></tr>
      <tr><td><code>cmdkey</code></td><td>Windows <code>cmdkey /list</code></td></tr>
    </tbody></table>

    <h4>📄 Config & Firewall</h4>
    <table class="data-table"><tbody>
      <tr><td><code>sshd_config</code></td><td><code>sshd_config</code></td></tr>
      <tr><td><code>apache_conf</code></td><td>Apache config</td></tr>
      <tr><td><code>iptables</code></td><td><code>iptables -L</code></td></tr>
    </tbody></table>

    <h4>📧 Logs, Email & Registry</h4>
    <table class="data-table"><tbody>
      <tr><td><code>auth_log</code></td><td><code>/var/log/auth.log</code></td></tr>
      <tr><td><code>email_headers</code></td><td>Email headers</td></tr>
      <tr><td><code>email_body</code></td><td>Email body</td></tr>
      <tr><td><code>reg_query</code></td><td>Windows <code>reg query</code></td></tr>
    </tbody></table>`,

  /* ──────────────────────────── THEMES ──────────────────────────────────── */
  _themes: () => `
    <h2>Themes</h2>
    <p>HackerHero ships with <strong>8 visual themes</strong>, each defined as a set of CSS custom properties on <code>[data-theme="…"]</code> selectors. Some themes include special visual effects.</p>

    <table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>Description</th><th>Special Effects</th></tr></thead><tbody>
      <tr><td><code>dark</code></td><td>Dark</td><td>Clean dark minimalist</td><td>Default</td></tr>
      <tr><td><code>light</code></td><td>Light</td><td>Clean light mode</td><td>—</td></tr>
      <tr><td><code>concentration</code></td><td>Focus</td><td>Calm, soothing colors</td><td>—</td></tr>
      <tr><td><code>matrix</code></td><td>Matrix</td><td>Follow the white rabbit</td><td>Canvas rain, monospace font, semi-transparent panels</td></tr>
      <tr><td><code>upside-down</code></td><td>Upside Down</td><td>The other side</td><td>Red rain, floating spores overlay, reflection, flicker</td></tr>
      <tr><td><code>operation</code></td><td>Operation</td><td>Classified — eyes only</td><td>CLASSIFIED alert banner, blink animation</td></tr>
      <tr><td><code>wargames</code></td><td>WarGames</td><td>Shall we play a game?</td><td>Amber phosphor CRT, Courier font, cursor blink</td></tr>
      <tr><td><code>hackers</code></td><td>Hack The Planet</td><td>Mess with the best</td><td>Neon cyberpunk palette</td></tr>
    </tbody></table>

    <h3>CSS Custom Properties (30 tokens)</h3>
    <p>Each theme overrides these variables:</p>
    <table class="data-table"><thead><tr><th>Category</th><th>Variables</th></tr></thead><tbody>
      <tr><td>Backgrounds</td><td><code>--c-bg</code>, <code>--c-bg2</code>, <code>--c-bg3</code></td></tr>
      <tr><td>Text</td><td><code>--c-text</code>, <code>--c-text1</code>, <code>--c-text2</code>, <code>--c-text3</code></td></tr>
      <tr><td>Borders</td><td><code>--c-border</code></td></tr>
      <tr><td>Accents</td><td><code>--c-accent</code>, <code>--c-accent2</code></td></tr>
      <tr><td>Semantic</td><td><code>--c-success</code>, <code>--c-warning</code>, <code>--c-danger</code>, <code>--c-info</code></td></tr>
      <tr><td>Badges</td><td><code>--c-key-badge</code></td></tr>
      <tr><td>Typography</td><td><code>--font-main</code>, <code>--font-mono</code></td></tr>
      <tr><td>Shapes</td><td><code>--radius</code>, <code>--radius-sm</code></td></tr>
      <tr><td>Shadows</td><td><code>--shadow</code>, <code>--shadow-sm</code></td></tr>
      <tr><td>Glows</td><td><code>--glow-accent</code>, <code>--glow-cyan</code></td></tr>
    </tbody></table>

    <h3>Adding a New Theme</h3>
    <ol>
      <li>Add a <code>[data-theme="my-theme"] { --c-bg: …; --c-accent: …; /* etc */ }</code> block in <code>css/app.css</code>.</li>
      <li>Register it in <code>ThemeManager.themes</code> in <code>core.js</code>:
        <pre>themes: {
  …,
  'my-theme': { name: 'My Theme', desc: 'Description', swatch: ['#bg', '#accent'] },
}</pre>
      </li>
      <li>Optionally add special effects in the <code>apply(themeId)</code> method.</li>
    </ol>`,

  /* ──────────────────────────── EXTENDING ───────────────────────────────── */
  _extending: () => `
    <h2>Extending HackerHero</h2>

    <h3>Adding a New Panel</h3>
    <ol>
      <li>Add a <code>&lt;section id="panel-mypanel" class="panel"&gt;&lt;/section&gt;</code> in <code>index.html</code>.</li>
      <li>Add a <code>&lt;li class="nav-item" data-panel="mypanel"&gt;</code> entry in the sidebar.</li>
      <li>Create <code>js/panel-mypanel.js</code>:
        <pre>import { State, DB, UI, qs, qsa } from './core.js?v=…';

export const MyPanel = {
  async render() {
    qs('#panel-mypanel').innerHTML = '…';
    this.bindEvents();
  },
  bindEvents() { /* wire DOM events */ },
};</pre>
      </li>
      <li>In <code>app.js</code>, import it and add a <code>case 'mypanel': await MyPanel.render(); break;</code> in the panel router switch.</li>
    </ol>

    <h3>Adding a New Parser</h3>
    <ol>
      <li>Open <code>js/parsers.js</code>.</li>
      <li>Define a parser object:
        <pre>const MY_PARSER = {
  id: 'my_parser',
  label: 'My Output Format',
  icon: '🔧',
  detect(text) {
    // Return 0.0–1.0 confidence
    return /my-pattern/.test(text) ? 0.8 : 0;
  },
  parse(text) {
    // Return structured data
    return { entries: [...] };
  },
  suggestName(data) {
    // Suggest parent asset name (or null)
    return null;
  },
  suggestItemName(data) {
    // Suggest data item name
    return 'My Output';
  },
};</pre>
      </li>
      <li>Append to the <code>PARSERS</code> array at the bottom of the file.</li>
      <li>Optionally add <code>'my_parser': 'icon-id'</code> to <code>PARSER_ICON_MAP</code> in <code>asset-icons.js</code>.</li>
    </ol>

    <h3>Adding a New Icon</h3>
    <ol>
      <li>Open <code>js/asset-icons.js</code>.</li>
      <li>Add an entry to <code>ASSET_ICONS</code>:
        <pre>{ id: 'my-icon', name: 'My Icon', category: 'other',
  keywords: ['my', 'icon', 'custom'],
  svg: '&lt;svg viewBox="0 0 20 20" …&gt;…&lt;/svg&gt;' }</pre>
      </li>
      <li>The icon picker automatically includes all entries from <code>ASSET_ICONS</code>.</li>
    </ol>

    <h3>Extending the Data Model</h3>
    <ul>
      <li>Bump the schema version in <code>db.js</code> (<code>DB_VERSION</code>).</li>
      <li>Add the new object store or index in the <code>onupgradeneeded</code> handler.</li>
      <li>Add CRUD methods to the <code>DB</code> object.</li>
      <li>Update import/export in <code>core.js</code> (<code>ImportExport</code>).</li>
    </ul>

    <h3>Cross-Panel Navigation</h3>
    <p>Use <code>AssetsPanel.navigateTo(entityType, entityId)</code> to programmatically navigate to any entity:</p>
    <ul>
      <li><code>'zone'</code> → selects the zone in the Assets panel</li>
      <li><code>'asset'</code> → selects zone + expands asset tree + shows detail</li>
      <li><code>'subitem'</code> → selects zone + asset + shows data item content</li>
      <li><code>'ticket'</code> → opens the ticket in the Tickets panel</li>
      <li><code>'mission'</code> → navigates to Overview</li>
    </ul>`,

  /* ──────────────────────────── SHORTCUTS ───────────────────────────────── */
  _shortcuts: () => `
    <h2>Keyboard Shortcuts</h2>

    <h3>Global</h3>
    <table class="data-table"><thead><tr><th>Key</th><th>Action</th></tr></thead><tbody>
      <tr><td><kbd>Ctrl/⌘</kbd> + <kbd>S</kbd></td><td>Save current data item or asset</td></tr>
      <tr><td><kbd>Escape</kbd></td><td>Close modal / icon picker / lightbox</td></tr>
    </tbody></table>

    <h3>Assets Panel — Zone List</h3>
    <table class="data-table"><thead><tr><th>Key</th><th>Action</th></tr></thead><tbody>
      <tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Navigate zones</td></tr>
      <tr><td><kbd>Enter</kbd></td><td>Select focused zone</td></tr>
    </tbody></table>

    <h3>Assets Panel — Asset Tree</h3>
    <table class="data-table"><thead><tr><th>Key</th><th>Action</th></tr></thead><tbody>
      <tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Navigate tree items</td></tr>
      <tr><td><kbd>Enter</kbd></td><td>Select / expand item</td></tr>
      <tr><td><kbd>→</kbd></td><td>Expand tree node</td></tr>
      <tr><td><kbd>←</kbd></td><td>Collapse tree node</td></tr>
    </tbody></table>

    <h3>Lightbox</h3>
    <table class="data-table"><thead><tr><th>Key</th><th>Action</th></tr></thead><tbody>
      <tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>Previous / Next image</td></tr>
      <tr><td><kbd>Escape</kbd></td><td>Close lightbox</td></tr>
    </tbody></table>

    <h3>Data Viewer</h3>
    <table class="data-table"><thead><tr><th>Key</th><th>Action</th></tr></thead><tbody>
      <tr><td><kbd>Ctrl/⌘</kbd> + <kbd>S</kbd></td><td>Save data item (in textarea or name input)</td></tr>
    </tbody></table>`,
};
