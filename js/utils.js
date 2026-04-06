/**
 * @fileoverview Utility functions for HackerHero
 * General-purpose helpers used throughout the application.
 * @module utils
 */

// ─────────────────────────────────────────────
//  ID GENERATION
// ─────────────────────────────────────────────

/**
 * Generates a RFC 4122 v4 UUID.
 * Falls back to crypto.randomUUID() when available.
 * @returns {string} e.g. "550e8400-e29b-41d4-a716-446655440000"
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback polyfill
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─────────────────────────────────────────────
//  DATE & TIME HELPERS
// ─────────────────────────────────────────────

/**
 * Returns the current ISO 8601 timestamp string.
 * @returns {string} e.g. "2026-03-31T14:22:11.000Z"
 */
export function now() {
  return new Date().toISOString();
}

/**
 * Formats an ISO date string for display (short human-readable).
 * @param {string} isoString
 * @returns {string} e.g. "2026-03-31 14:22"
 */
export function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Formats an ISO date string to a full readable string.
 * @param {string} isoString
 * @returns {string} e.g. "March 31, 2026 at 14:22:11"
 */
export function formatDateFull(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/**
 * Returns a relative time description (e.g. "3 minutes ago").
 * @param {string} isoString
 * @returns {string}
 */
export function timeAgo(isoString) {
  const delta = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (delta < 60)   return `${Math.floor(delta)}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

// ─────────────────────────────────────────────
//  STRING HELPERS
// ─────────────────────────────────────────────

/**
 * Truncates a string to a maximum length, appending "…" if needed.
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
export function truncate(str, max = 60) {
  if (!str) return '';
  return str.length <= max ? str : str.slice(0, max - 1) + '…';
}

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
export function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Highlights occurrences of a query string inside text (case-insensitive).
 * Returns an HTML string with <mark> tags around matches.
 * @param {string} text
 * @param {string} query
 * @returns {string} HTML string
 */
export function highlight(text, query) {
  if (!query || !text) return escHtml(text);
  const escaped = escHtml(text);
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(`(${safeQuery})`, 'gi'), '<mark>$1</mark>');
}

/**
 * Tests whether a string matches a query, with optional regex mode.
 * @param {string} text      - The haystack
 * @param {string} query     - The needle / regex pattern
 * @param {boolean} isRegex  - If true, treats query as a regular expression
 * @returns {boolean}
 */
export function matchesQuery(text, query, isRegex = false) {
  if (!query) return true;
  if (!text)  return false;
  if (isRegex) {
    try {
      return new RegExp(query, 'i').test(text);
    } catch {
      return false;
    }
  }
  return text.toLowerCase().includes(query.toLowerCase());
}

// ─────────────────────────────────────────────
//  DEBOUNCE
// ─────────────────────────────────────────────

/**
 * Returns a debounced version of fn that fires after `delay` ms of silence.
 * @param {Function} fn
 * @param {number} delay  milliseconds
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─────────────────────────────────────────────
//  DOM HELPERS
// ─────────────────────────────────────────────

/**
 * Shorthand for document.querySelector
 * @param {string} selector
 * @param {Element} [root=document]
 * @returns {Element|null}
 */
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * Shorthand for document.querySelectorAll (returns Array)
 * @param {string} selector
 * @param {Element} [root=document]
 * @returns {Element[]}
 */
export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/**
 * Creates an HTML element with optional attributes and children.
 * @param {string} tag
 * @param {Object} [attrs]
 * @param {...(string|Element)} children
 * @returns {Element}
 */
export function el(tag, attrs = {}, ...children) {
  const elem = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') elem.className = v;
    else if (k === 'innerHTML') elem.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') elem.addEventListener(k.slice(2), v);
    else elem.setAttribute(k, v);
  }
  children.forEach((c) => {
    if (c === null || c === undefined) return;
    elem.append(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return elem;
}

// ─────────────────────────────────────────────
//  DEEP CLONE
// ─────────────────────────────────────────────

/**
 * Deep-clones a JSON-serialisable object.
 * @param {*} obj
 * @returns {*}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ─────────────────────────────────────────────
//  DOWNLOAD / FILE I/O
// ─────────────────────────────────────────────

/**
 * Triggers a file download in the browser with the given content.
 * @param {string} filename
 * @param {string} content
 * @param {string} [mimeType='application/json']
 */
export function downloadFile(filename, content, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Reads a File object as text and returns a Promise<string>.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = ()  => reject(new Error('Could not read file'));
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Reads a File (image) as a data URL (base64 string).
 * @param {File} file
 * @returns {Promise<string>}  e.g. "data:image/png;base64,..."
 */
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = ()  => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Resizes an image data URL to a thumbnail.
 * Returns a Promise resolving to a smaller data URL (JPEG at the given max size).
 * @param {string} dataUrl  - The full-size data URL
 * @param {number} [maxDim=120] - Maximum width or height in pixels
 * @returns {Promise<string>}
 */
export function createThumbnail(dataUrl, maxDim = 120) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
      else       { w = Math.round(w * maxDim / h); h = maxDim; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(dataUrl); // fallback: use original
    img.src = dataUrl;
  });
}

// ─────────────────────────────────────────────
//  IMPORT SANITIZATION
// ─────────────────────────────────────────────

/**
 * Strips HTML tags and dangerous patterns from a string.
 * Used to sanitize all user-supplied strings from imported data.
 * @param {string} str
 * @returns {string}
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?(iframe|object|embed|form|input|link|meta|base|svg|math)[^>]*>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:[^,]*;base64/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/url\s*\(\s*["']?javascript/gi, '');
}

/**
 * Recursively sanitizes all string values within an object or array.
 * Prevents stored-XSS through imported JSON payloads.
 * @param {*} obj - The object to sanitize
 * @param {number} [depth=0] - Current recursion depth (safety limit)
 * @returns {*} A new sanitized object
 */
export function sanitizeImportedData(obj, depth = 0) {
  if (depth > 20) return obj; // prevent infinite recursion
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map((v) => sanitizeImportedData(v, depth + 1));
  if (obj && typeof obj === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      // Allow known-safe property names (alphanumeric, underscore, hyphen, dot)
      if (/^[a-zA-Z_$][a-zA-Z0-9_.\-$]*$/.test(k)) {
        clean[k] = sanitizeImportedData(v, depth + 1);
      }
    }
    return clean;
  }
  return obj;
}

/**
 * Validates the basic shape of a MissionExport object.
 * Returns null if valid, or an error message string if invalid.
 * @param {*} data
 * @returns {string|null}
 */
export function validateMissionExport(data) {
  if (!data || typeof data !== 'object') return 'Invalid data: not an object';
  if (!data.mission || typeof data.mission !== 'object') return 'Invalid data: missing mission object';
  if (!data.mission.id || typeof data.mission.id !== 'string') return 'Invalid data: mission must have a string id';
  if (!data.mission.codename || typeof data.mission.codename !== 'string') return 'Invalid data: mission must have a codename';
  if (data.zones && !Array.isArray(data.zones)) return 'Invalid data: zones must be an array';
  if (data.assets && !Array.isArray(data.assets)) return 'Invalid data: assets must be an array';
  if (data.subitems && !Array.isArray(data.subitems)) return 'Invalid data: subitems must be an array';
  if (data.versions && !Array.isArray(data.versions)) return 'Invalid data: versions must be an array';
  if (data.changelog && !Array.isArray(data.changelog)) return 'Invalid data: changelog must be an array';
  // Validate sizes to prevent DoS via massive payloads
  const MAX_ITEMS = 50000;
  if ((data.assets || []).length > MAX_ITEMS) return `Too many assets (max ${MAX_ITEMS})`;
  if ((data.subitems || []).length > MAX_ITEMS) return `Too many subitems (max ${MAX_ITEMS})`;
  if ((data.changelog || []).length > MAX_ITEMS) return `Too many changelog entries (max ${MAX_ITEMS})`;
  return null;
}

// ─────────────────────────────────────────────
//  SORT HELPERS
// ─────────────────────────────────────────────

/**
 * Comparator that sorts by a string field ascending.
 * @param {string} field
 * @returns {Function}
 */
export function byField(field) {
  return (a, b) => String(a[field] || '').localeCompare(String(b[field] || ''));
}

/**
 * Comparator that sorts by timestamp (ISO string) descending (newest first).
 * @param {string} field
 * @returns {Function}
 */
export function byDateDesc(field) {
  return (a, b) => new Date(b[field]) - new Date(a[field]);
}
