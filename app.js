/* DM Validator UI */
(function () {
  'use strict';
  const TOOL_VERSION = '0.3.2';
  const LANGS = ['en', 'nl', 'fr', 'de'];
  const SEVS = ['error', 'warning', 'info'];
  const RANK = { error: 0, warning: 1, info: 2 };
  const MSG_PAGE = 300, TREE_PAGE = 200;
  const SCHEMA_URL = new URL('schema/dm-0.7.json', location.href).href;
  const TOOL_URL = new URL('.', location.href).href;

  const $app = document.getElementById('app');
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } } };

  const st = {
    lang: (store.get('dmv.lang') || (navigator.language || 'en').slice(0, 2)).toLowerCase(),
    theme: store.get('dmv.theme') || 'enamel',
    T: null, EN: null, S: null,
    view: 'empty', pasteOpen: false, over: false,
    file: null, text: '', result: null, syntax: null, checkId: 0,
    tree: { expanded: new Set(), kids: new Map(), sel: null },
    show: { error: true, warning: true, info: true }, search: '', node: null, group: 'list', selMsg: null, msgLimit: MSG_PAGE,
    ref: null, discord: false, prompt: false, exportOpen: false, toast: '', varOpen: false, imgOpen: false
  };
  if (!LANGS.includes(st.lang)) st.lang = 'en';

  // ------------------------------------------------------------------ utils
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fill = (tpl, vars) => String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ''));
  const t = (k, vars) => { const [a, b] = k.split('.'); const v = (st.T && st.T[a] && st.T[a][b]) || (st.EN && st.EN[a] && st.EN[a][b]) || k; return vars ? fill(v, vars) : v; };
  const key = (segs) => JSON.stringify(segs);
  const pathStr = (segs) => DMV.pathStr(segs);
  const msgText = (m, T) => {
    const tab = T || st.T;
    if (m.syntax) return fill((tab.syntax || {})[m.code] || st.EN.syntax[m.code], {}) + (m.detail ? ' (' + m.detail + ')' : '');
    const vars = m.vars && m.vars.targetKey ? Object.assign({}, m.vars, { target: ((tab.targets || {})[m.vars.targetKey]) || st.EN.targets[m.vars.targetKey] }) : m.vars;
    const out = fill((tab.msg || {})[m.tpl] || st.EN.msg[m.tpl], vars);
    return out.charAt(0).toUpperCase() + out.slice(1);
  };
  const ruleName = (code, T) => { const tab = (T || st.T).rules; return tab[code] || tab[code.split('-')[0]] || code; };
  const loc = (m) => m.line === undefined ? '' : (st.result && st.result.minified ? m.line + ':' + m.col : String(m.line));
  const fmtNum = (n) => n.toLocaleString(st.lang);
  // anonymous usage counts (GoatCounter, no cookies); never sends file names or contents
  function track(name) {
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: name, title: name, event: true }); } catch (e) { /* ignore */ }
  }
  function reveal(sel) { const el = document.querySelector(sel); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  let toastTimer = null;
  function toast(msg) { st.toast = msg; render(); clearTimeout(toastTimer); toastTimer = setTimeout(() => { st.toast = ''; render(); }, 1800); }
  function copy(text) { try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {}); } catch (e) { /* ignore */ } }
  function download(name, text, mime) {
    const blob = new Blob([text], { type: mime + ';charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const ICON = {
    ok: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
    caret: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="square" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    error: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="square" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    warning: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="square" aria-hidden="true"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.5"/></svg>',
    info: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="square" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
    copy: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" aria-hidden="true"><rect x="9" y="9" width="11" height="11"/><path d="M5 15V5h10"/></svg>',
    list: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    down: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true"><path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>',
    chat: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="miter" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    lock: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><rect x="5" y="11" width="14" height="9"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    theme: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>',
    up: '<svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="44" height="50" fill="var(--panel2)" stroke="var(--line)" stroke-width="2.5"/><path d="M14 22h22M14 30h28M14 38h18" stroke="var(--faint)" stroke-width="3"/><circle cx="46" cy="44" r="13" fill="#2EC4B6" stroke="var(--line)" stroke-width="2.5"/><path d="M46 50V38M41 43l5-5 5 5" fill="none" stroke="#0C0F16" stroke-width="3"/></svg>',
    logo: '<svg width="58" height="42" viewBox="0 0 58 42" aria-hidden="true"><rect x="2" y="2" width="54" height="38" fill="#FAFAF8" stroke="#0C0F16" stroke-width="2.5"/><text x="31" y="27" text-anchor="middle" font-family="Inter, sans-serif" font-style="italic" font-weight="900" font-size="19" fill="#0C0F16">DM</text><rect x="12" y="31" width="34" height="3" fill="#E61E28"/></svg>'
  };

  // ------------------------------------------------------------------ loading
  async function loadJSON(url) { const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }
  async function setLang(l) {
    st.lang = LANGS.includes(l) ? l : 'en'; store.set('dmv.lang', st.lang);
    try { st.T = st.lang === 'en' ? st.EN : await loadJSON('i18n/' + st.lang + '.json'); } catch (e) { st.T = st.EN; }
    document.documentElement.lang = st.lang; render();
  }

  let worker = null;
  function startWorker() {
    worker = new Worker('worker.js');
    worker.postMessage({ type: 'schema', schema: st.S });
    worker.onmessage = onWorker;
  }
  const pending = new Map(); let reqId = 0;
  function requestChildren(segs, from) {
    return new Promise((res) => { const r = ++reqId; pending.set(r, res); worker.postMessage({ type: 'children', req: r, segs, from: from || 0, count: TREE_PAGE }); });
  }
  function onWorker(e) {
    const m = e.data;
    if (m.type === 'children') { const f = pending.get(m.req); pending.delete(m.req); if (f) f(m.res); return; }
    if (m.id !== st.checkId) return;
    if (m.type === 'syntax') {
      st.syntax = m; st.result = { msgs: [{ id: 's0', sev: 'error', code: m.code, syntax: true, detail: m.detail, line: m.line, col: m.col, segs: [], path: '', entity: st.file.name, field: '', value: '' }], variants: [], lines: m.lines, minified: m.lines <= 1 && st.text.length > 2000 };
      st.view = 'broken'; render(); track('check/invalid-json'); return;
    }
    if (m.type === 'result') {
      st.syntax = null;
      st.result = { msgs: m.msgs, variants: m.variants, images: m.images || {}, lines: m.lines, minified: m.lines <= 3 && st.text.length > 2000, ms: m.ms, entities: countEntities(m.root) };
      st.tree = { expanded: new Set(), kids: new Map([[key([]), m.root]]), sel: null };
      buildCounts(); st.view = 'report'; render();
      const sc = sevCounts(); track(sc.error ? 'check/errors' : sc.warning ? 'check/warnings' : 'check/clean'); return;
    }
    if (m.type === 'fatal') { st.view = 'empty'; render(); toast(t('ui.workerFail', { msg: m.message })); }
  }
  function countEntities(root) { return root.items.reduce((a, it) => a + (it.t === 'array' ? it.n : 0), 0); }

  function check(name, text) {
    st.file = { name, size: text.length }; st.text = text; st.view = 'busy'; st.checkId++;
    st.show = { error: true, warning: true, info: true }; st.search = ''; st.node = null; st.selMsg = null; st.msgLimit = MSG_PAGE;
    st.ref = null; st.discord = false; st.prompt = false; st.exportOpen = false; st.pasteOpen = false; st.varOpen = false; st.imgOpen = false;
    render();
    worker.postMessage({ type: 'check', id: st.checkId, text });
  }
  function readFile(f) {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { track('load/file'); check(f.name, String(r.result)); };
    r.readAsText(f, 'utf-8');
  }

  // ------------------------------------------------------------------ counts per tree node
  let counts = new Map();
  function buildCounts() {
    counts = new Map();
    for (const m of st.result.msgs) {
      if (!m.segs) continue;
      for (let i = 1; i <= m.segs.length; i++) {
        const k = key(m.segs.slice(0, i)); let c = counts.get(k); if (!c) { c = { error: 0, warning: 0, info: 0 }; counts.set(k, c); } c[m.sev]++;
      }
    }
  }
  const under = (segs, node) => node.length <= segs.length && node.every((s, i) => segs[i] === s);

  // ------------------------------------------------------------------ messages
  function visibleMsgs() {
    const q = st.search.trim().toLowerCase();
    return st.result.msgs.filter((m) => {
      if (!st.show[m.sev]) return false;
      if (st.node && !(m.segs && under(m.segs, st.node))) return false;
      if (q) { const hay = (msgText(m) + ' ' + m.path + ' ' + (m.entity || '') + ' ' + m.code + ' ' + (m.value || '')).toLowerCase(); if (!hay.includes(q)) return false; }
      return true;
    }).sort((a, b) => (RANK[a.sev] - RANK[b.sev]) || ((a.line || 0) - (b.line || 0)));
  }
  function sortedAll() { return st.result.msgs.slice().sort((a, b) => (RANK[a.sev] - RANK[b.sev]) || ((a.line || 0) - (b.line || 0))); }
  function sevCounts() { const c = { error: 0, warning: 0, info: 0 }; for (const m of st.result.msgs) c[m.sev]++; return c; }

  async function pickMsg(id) {
    const m = st.result.msgs.find((x) => x.id === id); if (!m) return;
    st.selMsg = id;
    if (m.segs && m.segs.length) {
      const target = m.missingField ? m.segs : m.segs;
      for (let i = 0; i < target.length; i++) {
        const p = target.slice(0, i); const k = key(p);
        if (!st.tree.kids.has(k)) st.tree.kids.set(k, await requestChildren(p, 0));
        st.tree.expanded.add(k);
        // make sure the child is loaded when it sits beyond the first page
        const kids = st.tree.kids.get(k); const next = target[i];
        if (typeof next === 'number' && next >= kids.items.length) {
          while (kids.items.length <= next && kids.items.length < kids.total) { const more = await requestChildren(p, kids.items.length); kids.items = kids.items.concat(more.items); }
        }
      }
      st.tree.sel = key(target);
    }
    render();
    const el = document.querySelector('[data-row="' + CSS.escape(st.tree.sel || '') + '"]');
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // ------------------------------------------------------------------ images without a picture (tip)
  const IMG_ORDER = ['categories', 'teams', 'drivers', 'engines', 'sponsors', 'namingSponsors', 'staff', 'journalists'];
  function imageCounts() {
    const im = (st.result && st.result.images) || {};
    return IMG_ORDER.filter((k) => im[k] && im[k].missing.length).map((k) => ({ key: k, n: im[k].missing.length, total: im[k].total, field: im[k].field, label: t('imgTypes.' + k), list: im[k].missing }));
  }
  function imagesHtml() {
    if (st.view !== 'report' || st.node) return '';
    const rows = imageCounts(); if (!rows.length) return '';
    const total = rows.reduce((a, r) => a + r.n, 0);
    return '<details class="variants" id="images"' + (st.imgOpen ? ' open' : '') + '><summary><span class="chip b-ok">' + ICON.info + 'IMG</span><span>' + esc(t('ui.images')) + ' · ' + esc(rows.map((r) => fmtNum(r.n) + ' ' + r.label).join(', ')) + '</span></summary>' +
      '<div class="sub">' + esc(t('ui.imagesSub')) + '</div><table>' +
      rows.map((r) => '<tr><td style="white-space:nowrap;font-weight:600">' + esc(r.label) + '</td><td class="v">' + esc(r.field) + '</td><td style="white-space:nowrap">' + fmtNum(r.n) + ' / ' + fmtNum(r.total) + '</td><td>' +
        r.list.slice(0, 60).map((x) => '<button class="linkbtn" style="min-height:28px;padding:0 4px;font-style:normal;font-weight:500;text-decoration-thickness:1px" data-act="goto" data-segs="' + esc(JSON.stringify(x.segs)) + '">' + esc(x.name) + '</button>').join(' ') +
        (r.list.length > 60 ? ' <span style="color:var(--muted)">' + esc(t('ui.andMore', { n: r.list.length - 60 })) + '</span>' : '') + '</td></tr>').join('') + '</table></details>';
  }
  async function gotoSegs(target) {
    for (let i = 0; i < target.length; i++) {
      const p = target.slice(0, i); const k = key(p);
      if (!st.tree.kids.has(k)) st.tree.kids.set(k, await requestChildren(p, 0));
      st.tree.expanded.add(k);
      const kids = st.tree.kids.get(k); const next = target[i];
      if (typeof next === 'number') while (kids.items.length <= next && kids.items.length < kids.total) { const more = await requestChildren(p, kids.items.length); kids.items = kids.items.concat(more.items); }
    }
    st.tree.sel = key(target); render();
    const el = document.querySelector('[data-row="' + CSS.escape(st.tree.sel) + '"]'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // ------------------------------------------------------------------ reference lists
  function refLists() {
    const S = st.S, out = {};
    const E = S.enums;
    out.drivingStyles = { values: E.drivingStyles.canonical.map((v) => ({ v })), src: E.drivingStyles.src, field: 'drivingStyles · currentConcept.drivingStyle', path: 'enums.drivingStyles' };
    out.characteristics = { values: E.characteristics.canonical.map((v) => ({ v })).concat(E.characteristics.variants.map((v) => ({ v, alt: true }))), src: E.characteristics.src, field: 'characteristics', path: 'enums.characteristics' };
    out.sponsorCategories = { values: Object.entries(E.sponsorCategories.editorLabels).map(([k, lab]) => ({ v: k, label: lab })).concat(['automobile', 'horlogerie', 'luxe', 'equipment'].map((v) => ({ v, alt: true }))), src: E.sponsorCategories.src, field: 'sponsors[].category · namingSponsors[].category', path: 'enums.sponsorCategories' };
    out.bonusType = { values: E.bonusType.canonical.map((v) => ({ v })).concat(E.bonusType.variants.map((v) => ({ v, alt: true }))), src: E.bonusType.src, field: 'sponsors[].bonusType · teams[].sponsors[].bonusType', path: 'enums.bonusType' };
    const ENT = { driverFields: 'driver', teamFields: 'team', sponsorFields: 'sponsor', namingSponsorFields: 'namingSponsor', circuitFields: 'circuit', engineFields: 'engine', academyFields: 'academy', staffFields: 'staff', journalistFields: 'journalist' };
    for (const [k, e] of Object.entries(ENT)) {
      const d = S.entities[e];
      out[k] = { values: Object.keys(d.fields).sort((a, b) => a.localeCompare(b)).map((v) => ({ v, range: d.fields[v].range })), src: 'guide + vanilla', field: d.arrays.map((a) => a + '[]').join(' · '), path: 'entities.' + e + '.fields' };
    }
    return out;
  }
  function refText(k) {
    const r = refLists()[k]; const name = st.EN.lists[k];
    return name + ' (' + r.field + '; Delta Manager ' + st.S.gameVersion + '): ' + r.values.filter((x) => !x.alt).map((x) => x.v + (x.label ? ' (' + x.label + ')' : '')).join(', ');
  }

  // ------------------------------------------------------------------ exports
  const SEV1 = { error: 'E', warning: 'W', info: 'I' };
  const REFKEYS = new Set(['drivingStyles', 'characteristics', 'sponsorCategories', 'bonusType', 'driverFields', 'teamFields', 'sponsorFields', 'namingSponsorFields', 'circuitFields', 'engineFields', 'academyFields', 'staffFields', 'journalistFields']);
  function issueRows() {
    return sortedAll().map((m) => ({ line: m.line, col: m.col, severity: m.sev, code: m.code, type: ruleName(m.code, st.EN), path: m.path, entity: m.entity || '', field: m.missingField || m.field || '', currentValue: m.value, message: msgText(m, st.T) }));
  }
  function header() { return 'DM Validator ' + TOOL_VERSION + ' · Delta Manager ' + st.S.gameVersion + ' · ' + st.file.name; }
  function exportTxt() {
    const c = sevCounts(); const L = [header(), new Date().toISOString(), c.error + ' ' + t('ui.error') + ' · ' + c.warning + ' ' + t('ui.warning') + ' · ' + c.info + ' ' + t('ui.info'), ''];
    for (const m of sortedAll()) {
      L.push((t('ui.line') + ' ' + loc(m)).padEnd(16) + SEV1[m.sev] + ' ' + m.code.padEnd(10) + ruleName(m.code) + (m.path ? '  ' + m.path : ''));
      L.push('    ' + msgText(m) + (m.value && !m.syntax ? '  [' + (m.missingField || m.field) + ' = ' + m.value + ']' : ''));
      if (m.entity) L.push('    ' + m.entity);
    }
    const nv = st.result.variants.reduce((a, v) => a + v.count, 0);
    if (nv) L.push('', t('ui.variants', { n: nv }));
    const im = imageCounts(); if (im.length) L.push('', t('ui.images') + ': ' + im.map((x) => x.n + '/' + x.total + ' ' + x.label).join(', '));
    download(st.file.name.replace(/\.json$/i, '') + '-report.txt', L.join('\n') + '\n', 'text/plain'); toast(t('ui.saved', { file: 'report.txt' }));
  }
  function exportCsv() {
    const sep = st.lang === 'en' ? ',' : ';';
    const cols = ['line', 'col', 'severity', 'code', 'type', 'path', 'entity', 'field', 'currentValue', 'message'];
    const q = (v) => { const s = v === undefined || v === null ? '' : String(v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const rows = [cols.join(sep)].concat(issueRows().map((r) => cols.map((c) => q(r[c])).join(sep)));
    download(st.file.name.replace(/\.json$/i, '') + '-report.csv', '﻿' + rows.join('\r\n') + '\r\n', 'text/csv'); toast(t('ui.saved', { file: 'report.csv' }));
  }
  function exportJson() {
    const c = sevCounts();
    const out = { tool: 'DM Validator', toolVersion: TOOL_VERSION, gameVersion: st.S.gameVersion, schemaVersion: st.S.schemaVersion, file: st.file.name, generated: new Date().toISOString(), counts: c,
      alternativeSpellings: st.result.variants.reduce((a, v) => a + v.count, 0), issues: issueRows() };
    download(st.file.name.replace(/\.json$/i, '') + '-report.json', JSON.stringify(out, null, 2), 'application/json'); toast(t('ui.saved', { file: 'report.json' }));
  }

  // Discord: ANSI colours, one line per issue, max 2000 characters
  function discordParts() {
    const ESC = '\u001b[', ANSI = { error: '1;31', warning: '1;33', info: '1;34', dim: '0;30' };
    const all = sortedAll(); const c = sevCounts();
    const lw = Math.max(2, ...all.map((m) => String(loc(m)).length)) + 1;
    const rw = Math.max(4, ...all.map((m) => ruleName(m.code).length));
    const parts = [[{ text: header(), col: 'dim' }], [{ text: c.error + ' ' + t('ui.error') + ' · ' + c.warning + ' ' + t('ui.warning') + ' · ' + c.info + ' ' + t('ui.info'), col: null }], [{ text: '', col: null }]];
    const ansi = (segs) => segs.map((g) => (g.col ? ESC + ANSI[g.col] + 'm' + g.text + ESC + '0m' : g.text)).join('');
    let used = '```ansi\n\n```'.length + parts.map(ansi).join('\n').length; let shown = 0;
    for (const m of all) {
      const field = m.syntax ? msgText(m) : ((m.missingField || m.field) ? (m.missingField || m.field) + ' = ' + (m.missingField ? '— (' + t('ui.missing') + ')' : m.value) : m.value);
      const segs = [{ text: ('L' + loc(m)).padEnd(lw + 1) + ' ', col: 'dim' }, { text: SEV1[m.sev] + ' ' + m.code.padEnd(9), col: m.sev }, { text: ' ' + ruleName(m.code).padEnd(rw) + '  ', col: null }, { text: field, col: null }];
      const len = ansi(segs).length + 1;
      if (used + len + 70 > 2000) break;
      parts.push(segs); used += len; shown++;
    }
    if (shown < all.length) parts.push([{ text: t('ui.more', { n: all.length - shown }), col: 'dim' }]);
    const text = '```ansi\n' + parts.map(ansi).join('\n') + '\n```';
    return { parts, text };
  }

  // AI prompt (always English)
  function aiPrompt() {
    const EN = st.EN; const relevant = sortedAll().filter((m) => m.code !== 'MISS-001'); const all = relevant.slice(0, 200); const total = relevant.length;
    const nMissing = st.result.msgs.length - relevant.length;
    const SEV_EN = { error: 'Error (must fix)', warning: 'Warning (should fix)', info: 'Info (check)' };
    const lists = refLists();
    const plan = (m) => {
      const v = m.vars || {}; const r = m.ref && lists[m.ref]; const rn = r ? EN.lists[m.ref] : '';
      if (m.syntax) {
        if (m.code === 'JSON-004' || m.code === 'JSON-006') return { ask: true, text: msgText(m, EN) + ' The file is incomplete. Do not invent the missing part: ask me for the complete file.' };
        return { ask: false, text: msgText(m, EN) + ' Fix only this at line ' + m.line + ', column ' + m.col + '.' };
      }
      switch (m.tpl) {
        case 'unknownValue': return { ask: true, text: '"' + v.value + '" is not an allowed value for ' + v.field + '. Which value from the "' + rn + '" list should it be?' };
        case 'unknownField': return { ask: true, text: '"' + v.field + '" is not a known field in ' + v.object + '; the game ignores it. Should it be renamed to a field from the "' + (rn || 'known fields') + '" list (which one?), or removed?' };
        case 'outOfRange': return { ask: true, text: v.field + ' = ' + v.value + ' is outside the range ' + v.range + '. Keep ' + v.value + ', or change it? If change: to which value within ' + v.range + '?' };
        case 'missing': return { ask: true, text: v.field + ' is missing, so the game uses its default. Keep the default, or add the field? If add: with which value?' };
        case 'wrongType': return { ask: false, text: v.field + ' is text ("' + v.value + '"); the game expects a number. Change "' + v.value + '" to ' + v.value + '.' };
        case 'duplicateKey': return { ask: true, text: v.field + ' appears twice in the same object. Which of the two values should stay?' };
        case 'missingRef': { const tg = EN.targets[v.targetKey]; return { ask: true, text: v.field + ' = ' + v.value + ': no ' + tg + ' with this ID or name exists in this file. Which existing ' + tg + ' should it point to (list the existing ones from the file as options), or should this reference be removed?' }; }
        case 'duplicateName': { const tg = EN.targets[v.targetKey]; return { ask: true, text: 'The ' + tg + ' "' + v.value + '" (id ' + v.id + ') appears more than once with a different ID (also: ' + v.other + '). Is this the same person? If yes: which entry should stay, and should all references (teamId, pilots, reserves, relations, driverCarAssignment) be moved to that ID? If no: keep both.' }; }
        case 'duplicateId': { const tg = EN.targets[v.targetKey]; return { ask: true, text: 'ID ' + v.value + ' is used by more than one ' + tg + ' (also: ' + v.other + '). Which entry should get a new ID? Suggest the lowest unused ' + tg + ' ID, and check every place that refers to this ID.' }; }
        default: return { ask: true, text: msgText(m, EN) };
      }
    };
    const nAsk = all.filter((m) => plan(m).ask).length;
    const p = [];
    p.push('You are helping me fix a Delta Manager mod file (' + st.file.name + ', game version ' + st.S.gameVersion + '). The file is attached or pasted below this prompt.');
    p.push('DM Validator found ' + total + ' issue' + (total === 1 ? '' : 's') + '. Fix only these issues.' + (total > all.length ? ' This prompt lists the first ' + all.length + '; the rest come in a later round.' : ''));
    if (nMissing) p.push('(' + nMissing + ' optional fields are missing; the game uses its defaults for them. They are not part of this task.)');
    p.push('', 'How to work:', '1. Do not change anything yet.');
    if (nAsk) {
      p.push('2. Issues marked ASK need a decision from me (' + nAsk + '). Ask me all of them in one message, numbered as below.');
      p.push('   Use exactly this format for each question, and always show the current value first, exactly as it is in the file:', '');
      p.push('   [number]. Line [line] · [path] ([entity])');
      p.push('      Current value: [value as in the file]  ← [what is wrong, in a few words]');
      p.push('      Options: [allowed values, taken only from the schema (see "Allowed values" below)]');
      p.push('      Suggestion: [one option] ([short reason]), or "no suggestion" if none clearly fits', '');
      p.push('   Then wait for my answers. I decide: I can accept a suggestion ("1 ok", "accept all"), choose another value, or say "skip".');
      p.push('   Never apply a suggestion I did not explicitly accept. Do not assume an answer I did not give.');
      p.push('   If I skip a question, leave that issue unchanged.');
      p.push('3. Issues marked APPLY are mechanical. Apply them together with my answers.');
    } else p.push('2. All issues are marked APPLY and need no decision. Apply them.');
    p.push('', 'Rules when you apply the changes:');
    p.push('- Edit the existing file. Do not rebuild it from memory.');
    p.push('- Keep every other field, value, field name and the structure exactly as it is.');
    p.push('- Use only values and fields from the DM Validator schema (see "Allowed values" below). Do not invent values or fields.');
    p.push('- Do not rely on your own knowledge of Delta Manager field names or values. It may be outdated or wrong. The schema is the only valid source for this task.');
    p.push('- Do not return the whole file. Mod files are large and get truncated or altered when rewritten.');
    p.push('- If you can run code: apply the changes with a script that loads the JSON, edits only these paths, saves it and checks that it is still valid JSON.');
    p.push('- End with a list of every change as: line · path · old value → new value, and a list of issues left unchanged.');
    p.push('', 'Issues:');
    all.forEach((m, i) => {
      const pd = plan(m);
      p.push((i + 1) + '. [' + (pd.ask ? 'ASK' : 'APPLY') + '] Line ' + loc(m) + ' · ' + (m.path || 'syntax') + (m.entity ? ' (' + m.entity + ')' : ''));
      p.push('   ' + SEV_EN[m.sev] + ' · ' + ruleName(m.code, EN) + ' (' + m.code + ')');
      if (!m.syntax) p.push('   Current value: ' + (m.missingField ? '(field is missing)' : m.value));
      p.push('   ' + (pd.ask ? 'Question' : 'Change') + ': ' + pd.text);
    });
    const used = []; all.forEach((m) => { if (m.ref && lists[m.ref] && !used.includes(m.ref)) used.push(m.ref); });
    if (used.length) {
      p.push('', 'Allowed values:');
      p.push('- Fetch the current lists from the DM Validator schema before you ask your questions: ' + SCHEMA_URL);
      p.push('- Lists needed for these issues:');
      used.forEach((k) => p.push('  - ' + EN.lists[k] + ' (' + lists[k].field + ') → ' + lists[k].path));
      p.push('- If you cannot open the URL, stop and tell me. Do not continue from memory.');
      p.push('  I will paste the lists myself (DM Validator → Allowed values → Copy, ' + TOOL_URL + ').');
    }
    return p.join('\n');
  }

  // ------------------------------------------------------------------ rendering
  function render() {
    document.documentElement.dataset.theme = st.theme;
    if (!st.T) { $app.innerHTML = ''; return; }
    const active = document.activeElement; const focusId = active && active.id; const selStart = active && active.selectionStart;
    $app.innerHTML = headerHtml() + bodyHtml() + (st.toast ? '<div class="toast" role="status">' + esc(st.toast) + '</div>' : '');
    if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus(); if (selStart !== undefined && el.setSelectionRange) try { el.setSelectionRange(selStart, selStart); } catch (e) { /* ignore */ } } }
  }

  function headerHtml() {
    const hasFile = st.view === 'report' || st.view === 'broken';
    return '<header>' +
      '<div class="brand">' + ICON.logo + '<h1><span>Mod</span> Validator</h1><span class="ver">v' + TOOL_VERSION + '</span></div>' +
      (hasFile ? '<div class="row" style="justify-content:flex-start;gap:8px"><span class="chip-file" title="' + esc(st.file.name) + '">' + esc(st.file.name) + '</span><span class="tag tag-gold">Schema DM ' + esc(st.S.gameVersion) + '</span></div>' : '') +
      '<div class="spacer"></div>' +
      '<div class="lock">' + ICON.lock + '<span>' + esc(t('ui.private')) + '</span></div>' +
      '<label class="lang"><span>' + esc(t('ui.language')) + '</span><select id="lang" data-change="lang">' +
      LANGS.map((l) => '<option value="' + l + '"' + (l === st.lang ? ' selected' : '') + '>' + { en: 'English', nl: 'Nederlands', fr: 'Français', de: 'Deutsch' }[l] + '</option>').join('') + '</select></label>' +
      '<button class="btn btn-icon" data-act="theme" aria-label="' + esc(t('ui.theme')) + '">' + ICON.theme + '</button>' +
      (hasFile ? '<button class="btn" data-act="new">' + esc(t('ui.loadAnother')) + '</button>' : '') +
      '</header>';
  }

  function bodyHtml() {
    if (st.view === 'busy') return '<div class="busy"><i aria-hidden="true"></i>' + esc(t('ui.checking')) + (st.file && st.file.size > 5e6 ? ' · ' + esc(t('ui.tooBig')) : '') + '</div>';
    if (st.view === 'empty') return emptyHtml();
    return '<main>' + leftHtml() + rightHtml() + '</main>';
  }

  function emptyHtml() {
    return '<div class="empty"><div class="empty-inner">' +
      '<div class="plate"><div class="drop' + (st.over ? ' over' : '') + '" id="drop">' + ICON.up +
      '<h2>' + esc(t('ui.dropTitle')) + '</h2><p>' + esc(t('ui.dropSub')) + '</p>' +
      '<div class="row"><button class="btn btn-primary" data-act="choose">' + esc(t('ui.choose')) + '</button><button class="btn" data-act="paste">' + esc(t('ui.paste')) + '</button></div>' +
      '<input type="file" id="file" accept=".json,application/json" class="sr" tabindex="-1">' +
      '</div></div>' +
      '<p class="privnote">' + esc(t('ui.privacyNote')) + '</p>' +
      (st.pasteOpen ? '<div class="plate pastebox"><label for="pastebox">' + esc(t('ui.paste')) + '</label><textarea id="pastebox" placeholder="' + esc(t('ui.pastePh')) + '"></textarea><div class="row" style="justify-content:flex-end"><button class="btn btn-primary" data-act="checkPaste">' + esc(t('ui.check')) + '</button></div></div>' : '') +
      '</div></div>';
  }

  function leftHtml() {
    if (st.view === 'broken') {
      const s = st.syntax; const lines = st.text.split('\n'); const from = Math.max(0, s.line - 10), to = Math.min(lines.length, s.line + 8);
      let rows = '';
      for (let i = from; i < to; i++) {
        let c = lines[i]; let shift = 0;
        if (c.length > 400) { const s0 = i === s.line - 1 ? Math.max(0, s.col - 200) : 0; shift = s0; c = (s0 ? '…' : '') + c.slice(s0, s0 + 400) + '…'; }
        rows += '<div class="rl' + (i === s.line - 1 ? ' bad' : '') + '"><span class="n">' + (i + 1) + '</span><span class="c">' + esc(c) + '</span></div>';
        if (i === s.line - 1) rows += '<div class="rl caretl"><span class="n"></span><span class="c">' + ' '.repeat(Math.max(0, s.col - 1 - shift + (shift ? 1 : 0))) + '^ ' + esc(t('syntax.' + s.code)) + '</span></div>';
      }
      return '<section class="plate panel" aria-label="' + esc(t('ui.rawTitle')) + '"><div class="phead"><div class="ptitle"><h2 style="color:var(--err-text)">' + esc(t('ui.rawTitle')) + '</h2><i></i></div></div><div class="well raw">' + rows + '</div></section>';
    }
    return '<section class="plate panel" aria-label="' + esc(t('ui.structure')) + '"><div class="phead"><div class="ptitle"><h2>' + esc(t('ui.structure')) + '</h2><i></i></div><div class="spacer"></div><button class="btn btn-sm" data-act="collapse">' + esc(t('ui.collapse')) + '</button></div>' +
      '<div class="well tree" id="tree">' + treeRows([], 0) + '</div></section>';
  }

  function treeRows(segs, depth) {
    const kids = st.tree.kids.get(key(segs)); if (!kids) return '';
    let html = '';
    for (const it of kids.items) {
      const s2 = segs.concat(it.key); const k = key(s2);
      const hasKids = (it.t === 'object' || it.t === 'array') && it.n > 0;
      const open = st.tree.expanded.has(k);
      const c = counts.get(k);
      let val = '', cls = '';
      if (it.t === 'object') val = '{' + it.n + '}'; else if (it.t === 'array') val = '[' + it.n + ']'; else { val = it.v; cls = it.t === 'string' ? ' s' : (it.t === 'number' ? ' n' : ''); }
      html += '<div class="trow' + (st.tree.sel === k ? ' sel' : '') + '" data-row="' + esc(k) + '" style="padding-left:' + (4 + depth * 18) + 'px">' +
        (hasKids ? '<button class="caret" data-act="toggle" data-k="' + esc(k) + '" aria-expanded="' + open + '" aria-label="' + esc((open ? t('ui.collapseOne') : t('ui.expand')) + ' ' + pathStr(s2)) + '">' + ICON.caret + '</button>' : '<span class="nocaret"></span>') +
        '<button class="tlabel" data-act="node" data-k="' + esc(k) + '"><span class="tkey">' + esc(typeof it.key === 'number' ? '[' + it.key + ']' : it.key) + '</span>' +
        (it.label ? '<span class="tname">' + esc(it.label) + '</span>' : '') + '<span class="tval' + cls + '">' + esc(val) + '</span>' +
        (c && c.error ? '<span class="badge b-error">' + c.error + '</span>' : '') + (c && c.warning ? '<span class="badge b-warning">' + c.warning + '</span>' : '') + (c && c.info ? '<span class="badge b-info">' + c.info + '</span>' : '') +
        (it.line && !st.result.minified ? '<span class="tln">' + esc(t('ui.line')) + ' ' + fmtNum(it.line) + '</span>' : '') + '</button></div>';
      if (open && hasKids) html += treeRows(s2, depth + 1);
    }
    if (kids.items.length < kids.total) html += '<div class="more" style="padding-left:' + (depth * 18) + 'px"><button class="btn btn-sm" data-act="moreKids" data-k="' + esc(key(segs)) + '">' + esc(t('ui.showMore', { n: Math.min(TREE_PAGE, kids.total - kids.items.length) })) + '</button></div>';
    return html;
  }

  function sevChip(sev, inner) { return '<span class="chip b-' + sev + '">' + ICON[sev] + esc(inner) + '</span>'; }

  function msgHtml(m, compact) {
    const sel = st.selMsg === m.id;
    const where = (t('ui.line') + ' ' + loc(m)) + (m.path ? ' · ' + m.path : '');
    const val = m.syntax ? '' : (m.missingField ? m.missingField + ' = — (' + t('ui.missing') + ')' : ((m.field ? m.field + ' = ' : '') + m.value));
    return '<div class="msg' + (sel ? ' sel' : '') + '">' +
      '<button class="mbody" data-act="pick" data-id="' + m.id + '">' +
      (compact ? '' : '<span class="mhead">' + sevChip(m.sev, m.code) + '<span class="mpath">' + esc(where) + '</span></span>') +
      (compact ? '<span class="mpath">' + esc(where) + (m.entity ? ' · ' + m.entity : '') + '</span>' : '') +
      '<span class="mtext">' + esc(msgText(m)) + '</span>' +
      (val ? '<span class="mval">' + esc(val) + '</span>' : '') +
      (!compact && m.entity ? '<span class="ment">' + esc(m.entity) + '</span>' : '') +
      '</button>' +
      (m.path ? '<button class="iconbtn" data-act="copyPath" data-id="' + m.id + '" aria-label="' + esc(t('ui.copyPath')) + '">' + ICON.copy + '</button>' : '') +
      (m.ref && REFKEYS.has(m.ref) ? '<div class="mfoot"><button class="refbtn" data-act="ref" data-ref="' + m.ref + '">' + ICON.list + esc(t('ui.allowed')) + '</button></div>' : '') +
      '</div>';
  }

  function rightHtml() {
    const c = sevCounts(); const vis = visibleMsgs();
    let list = '';
    const nv = st.result.variants.reduce((a, v) => a + v.count, 0);
    if (st.view === 'report' && nv && !st.node) {
      list += '<details class="variants" id="variants"' + (st.varOpen ? ' open' : '') + '><summary><span class="chip b-ok">' + ICON.ok + 'VAR-001</span><span>' + esc(t('ui.variants', { n: fmtNum(nv) })) + '</span></summary><div class="sub">' + esc(t('ui.variantsSub')) + '</div><table>' +
        st.result.variants.slice().sort((a, b) => b.count - a.count).map((v) => '<tr><td class="v">' + esc(JSON.stringify(v.value)) + '</td><td>' + esc(t('lists.' + v.enumKey) || v.enumKey) + '</td><td>' + v.count + t('ui.times') + '</td><td class="v">' + esc(t('ui.line') + ' ' + (st.result.minified ? v.first.line + ':' + v.first.col : v.first.line)) + '</td></tr>').join('') + '</table></details>';
    }
    list += imagesHtml();
    if (!st.result.msgs.length) {
      list += '<div class="ok"><b>' + esc(t('ui.noIssues')) + '</b><span>' + esc(t('ui.noIssuesSub', { n: fmtNum(st.result.entities || 0), game: st.S.gameVersion })) + '</span></div>';
    } else if (!vis.length) list += '<p class="note">' + esc(t('ui.noMessages')) + '</p>';
    else if (st.group === 'list') {
      list += vis.slice(0, st.msgLimit).map((m) => msgHtml(m, false)).join('');
      if (vis.length > st.msgLimit) list += '<div class="row"><button class="btn btn-sm" data-act="moreMsgs">' + esc(t('ui.showMore', { n: Math.min(MSG_PAGE, vis.length - st.msgLimit) })) + '</button></div>';
    } else {
      const groups = new Map(); for (const m of vis) { if (!groups.has(m.code)) groups.set(m.code, []); groups.get(m.code).push(m); }
      for (const [code, ms] of groups) {
        list += '<div><div class="ghead">' + sevChip(ms[0].sev, code) + '<span class="gname">' + esc(ruleName(code)) + '</span><span style="color:var(--muted);font-size:13px">· ' + ms.length + '</span></div>' + ms.slice(0, 100).map((m) => msgHtml(m, true)).join('') + '</div>';
      }
    }
    const minNote = st.result.minified ? '<div class="banner">' + esc(t('ui.minified')) + '</div>' : '';
    return '<section class="plate panel" aria-label="' + esc(t('ui.messages')) + '">' +
      '<div class="phead"><div class="ptitle"><h2>' + esc(t('ui.messages')) + '</h2><i></i></div><div class="spacer"></div>' +
      SEVS.map((s) => '<button class="sevbtn s-' + s + '" data-act="sev" data-sev="' + s + '" aria-pressed="' + st.show[s] + '">' + ICON[s] + '<span>' + fmtNum(c[s]) + ' ' + esc(t('ui.' + s)) + '</span></button>').join('') + '</div>' +
      minNote +
      '<div class="tools"><input type="search" id="search" aria-label="' + esc(t('ui.searchPh')) + '" placeholder="' + esc(t('ui.searchPh')) + '" value="' + esc(st.search) + '" data-input="search">' +
      '<div class="seg" role="group" aria-label="' + esc(t('ui.groupLabel')) + '"><button data-act="group" data-g="list" aria-pressed="' + (st.group === 'list') + '">' + esc(t('ui.list')) + '</button><button data-act="group" data-g="rule" aria-pressed="' + (st.group === 'rule') + '">' + esc(t('ui.byRule')) + '</button></div></div>' +
      (st.node ? '<div class="filter"><span style="color:var(--muted)">' + esc(t('ui.filteredBy')) + '</span><code>' + esc(pathStr(st.node)) + '</code><button class="linkbtn" style="min-height:36px" data-act="clearNode">' + esc(t('ui.clear')) + '</button></div>' : '') +
      '<div class="well msgs" id="msgs">' + list + (st.view === 'broken' ? '<p class="note" style="margin:8px 12px;text-align:left">' + esc(t('ui.hintBroken')) + '</p>' : '') + '</div>' +
      refHtml() + promptHtml() + discordHtml() +
      '<div class="foot">' +
      (st.exportOpen ? '<div class="menu" role="menu">' + [['txt', 'exportTxt'], ['csv', 'exportCsv'], ['json', 'exportJson'], ['AI', 'exportAi']].map(([x, k]) => '<button role="menuitem" data-act="export" data-x="' + x + '"><b>' + (x === 'AI' ? 'AI' : '.' + x) + '</b><span>' + esc(t('ui.' + k)) + '</span></button>').join('') + '</div>' : '') +
      '<button class="btn" data-act="exportMenu" aria-haspopup="true" aria-expanded="' + st.exportOpen + '">' + ICON.down + esc(t('ui.export')) + '</button>' +
      '<button class="btn btn-primary" data-act="discord">' + ICON.chat + esc(t('ui.copyDiscord')) + '</button></div>' +
      '</section>';
  }

  function refHtml() {
    if (!st.ref) return '';
    const L = refLists(); const r = L[st.ref]; if (!r) return '';
    return '<div class="box"><div class="boxhead"><h3>' + esc(t('ui.allowed')) + '</h3><div class="spacer"></div>' +
      '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted)"><span>' + esc(t('ui.refList')) + '</span><select id="refsel" data-change="ref">' +
      Object.keys(L).map((k) => '<option value="' + k + '"' + (k === st.ref ? ' selected' : '') + '>' + esc(t('lists.' + k)) + '</option>').join('') + '</select></label>' +
      '<button class="refbtn" data-act="copyRef">' + esc(t('ui.copyList')) + '</button><button class="iconbtn" data-act="closeRef" aria-label="' + esc(t('ui.close')) + '">' + ICON.close + '</button></div>' +
      '<div class="meta"><span style="font-family:var(--mono);color:var(--text);font-weight:600">' + esc(r.field) + '</span><span>' + esc(t('ui.source')) + ': ' + esc(r.src) + '</span></div>' +
      '<div class="vals">' + r.values.map((x) => '<span class="val"' + (x.alt ? ' style="opacity:.7;border-style:dashed"' : '') + '>' + esc(x.v) + (x.label ? ' <small>' + esc(x.label) + '</small>' : '') + (x.range ? ' <small>' + esc(x.range.min + '–' + x.range.max) + '</small>' : '') + '</span>').join('') + '</div></div>';
  }

  function discordHtml() {
    if (!st.discord) return '';
    const d = discordParts();
    const COL = { error: '#DC322F', warning: '#B58900', info: '#268BD2', dim: '#80848E' };
    const lines = ['<span style="color:#80848E">```ansi</span>'].concat(d.parts.map((segs) => segs.map((g) => '<span style="color:' + (g.col ? COL[g.col] : '#DBDEE1') + ';font-weight:' + (g.col && g.col !== 'dim' ? 700 : 400) + '">' + esc(g.text) + '</span>').join('')), ['<span style="color:#80848E">```</span>']);
    return '<div class="discord"><div class="boxhead">' + ICON.chat + '<h3 style="font-style:normal;text-transform:none;letter-spacing:0">' + esc(t('ui.discordPreview')) + '</h3><div class="spacer"></div><span style="font-size:12px;color:#B5BAC1">' + d.text.length + ' / 2000 ' + esc(t('ui.chars')) + '</span>' +
      '<button class="iconbtn x" data-act="closeDiscord" aria-label="' + esc(t('ui.close')) + '">' + ICON.close + '</button></div><div class="code">' + lines.join('\n') + '</div><p style="margin:10px 0 0;font-size:12px;color:#B5BAC1">' + esc(t('ui.discordNote')) + '</p></div>';
  }

  function promptHtml() {
    if (!st.prompt) return '';
    const p = aiPrompt();
    return '<div class="box"><div class="boxhead"><h3>' + esc(t('ui.promptTitle')) + '</h3><div class="spacer"></div><span style="font-size:12px;color:var(--muted)">' + fmtNum(p.length) + ' ' + esc(t('ui.chars')) + '</span>' +
      '<button class="refbtn" data-act="copyPrompt">' + esc(t('ui.copy')) + '</button><button class="iconbtn" data-act="closePrompt" aria-label="' + esc(t('ui.close')) + '">' + ICON.close + '</button></div><div class="pre" lang="en">' + esc(p) + '</div></div>';
  }

  // ------------------------------------------------------------------ events
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) { if (st.exportOpen && !e.target.closest('.menu')) { st.exportOpen = false; render(); } return; }
    const a = b.dataset.act;
    if (a !== 'exportMenu' && a !== 'export') st.exportOpen = false;
    switch (a) {
      case 'theme': st.theme = st.theme === 'enamel' ? 'graphite' : 'enamel'; store.set('dmv.theme', st.theme); break;
      case 'new': st.view = 'empty'; st.result = null; st.syntax = null; break;
      case 'choose': document.getElementById('file').click(); return;
      case 'paste': st.pasteOpen = !st.pasteOpen; render(); { const el = document.getElementById('pastebox'); if (el) el.focus(); } return;
      case 'checkPaste': { const v = document.getElementById('pastebox').value; if (v.trim()) { track('load/paste'); check('pasted.json', v); } return; }
      case 'collapse': st.tree.expanded.clear(); break;
      case 'toggle': {
        const k = b.dataset.k; const segs = JSON.parse(k);
        if (st.tree.expanded.has(k)) st.tree.expanded.delete(k);
        else { if (!st.tree.kids.has(k)) st.tree.kids.set(k, await requestChildren(segs, 0)); st.tree.expanded.add(k); }
        break;
      }
      case 'node': {
        const k = b.dataset.k; const segs = JSON.parse(k);
        st.tree.sel = k; st.node = segs; st.selMsg = null; st.msgLimit = MSG_PAGE;
        if (!st.tree.kids.has(k)) { const r = await requestChildren(segs, 0); if (r.total) { st.tree.kids.set(k, r); st.tree.expanded.add(k); } }
        else st.tree.expanded.add(k);
        break;
      }
      case 'moreKids': { const k = b.dataset.k; const kids = st.tree.kids.get(k); const more = await requestChildren(JSON.parse(k), kids.items.length); kids.items = kids.items.concat(more.items); break; }
      case 'pick': await pickMsg(b.dataset.id); return;
      case 'goto': await gotoSegs(JSON.parse(b.dataset.segs)); return;
      case 'copyPath': { const m = st.result.msgs.find((x) => x.id === b.dataset.id); copy(m.path); toast(t('ui.pathCopied')); return; }
      case 'ref': st.ref = b.dataset.ref; st.prompt = false; st.discord = false; render(); reveal('.box'); return;
      case 'closeRef': st.ref = null; break;
      case 'copyRef': copy(refText(st.ref)); toast(t('ui.listCopied')); return;
      case 'sev': st.show[b.dataset.sev] = !st.show[b.dataset.sev]; st.msgLimit = MSG_PAGE; break;
      case 'group': st.group = b.dataset.g; break;
      case 'clearNode': st.node = null; st.tree.sel = null; break;
      case 'moreMsgs': st.msgLimit += MSG_PAGE; break;
      case 'exportMenu': st.exportOpen = !st.exportOpen; break;
      case 'export': {
        const x = b.dataset.x; st.exportOpen = false;
        track('export/' + x.toLowerCase());
        if (x === 'txt') exportTxt(); else if (x === 'csv') exportCsv(); else if (x === 'json') exportJson();
        else { copy(aiPrompt()); st.prompt = true; st.discord = false; st.ref = null; render(); reveal('.box'); toast(t('ui.promptCopied')); }
        return;
      }
      case 'copyPrompt': copy(aiPrompt()); toast(t('ui.promptCopied')); return;
      case 'closePrompt': st.prompt = false; break;
      case 'discord': track('export/discord'); copy(discordParts().text); st.discord = true; st.prompt = false; st.ref = null; render(); reveal('.discord'); toast(t('ui.copied')); return;
      case 'closeDiscord': st.discord = false; break;
    }
    render();
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.id === 'file') { readFile(el.files[0]); el.value = ''; return; }
    if (el.dataset.change === 'lang') { setLang(el.value); track('lang/' + el.value); }
    if (el.dataset.change === 'ref') { st.ref = el.value; render(); }
  });
  let searchTimer = null;
  document.addEventListener('input', (e) => {
    if (e.target.dataset.input === 'search') { st.search = e.target.value; clearTimeout(searchTimer); searchTimer = setTimeout(() => { st.msgLimit = MSG_PAGE; render(); }, 150); }
  });
  document.addEventListener('toggle', (e) => { if (e.target.id === 'variants') st.varOpen = e.target.open; if (e.target.id === 'images') st.imgOpen = e.target.open; }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && st.exportOpen) { st.exportOpen = false; render(); } });
  ['dragenter', 'dragover'].forEach((ev) => document.addEventListener(ev, (e) => { e.preventDefault(); if (st.view === 'empty' && !st.over) { st.over = true; render(); } }));
  document.addEventListener('dragleave', (e) => { if (e.relatedTarget === null && st.over) { st.over = false; render(); } });
  document.addEventListener('drop', (e) => { e.preventDefault(); st.over = false; const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) readFile(f); else render(); });

  // ------------------------------------------------------------------ boot
  (async function boot() {
    document.documentElement.dataset.theme = st.theme;
    try {
      st.EN = await loadJSON('i18n/en.json');
      st.S = await loadJSON('schema/dm-0.7.json');
    } catch (e) {
      $app.innerHTML = '<p style="color:#fff;padding:24px;font-weight:700">' + esc((st.EN && st.EN.ui.schemaFail) || 'The schema could not be loaded. Open the tool via its website.') + '</p>';
      return;
    }
    startWorker();
    await setLang(st.lang);
  })();
})();
