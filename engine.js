/* DM Validator engine: line-aware JSON parser + schema checks.
   Runs in a Web Worker (worker.js) and in Node (for tests). No dependencies. */
(function (root) {
  'use strict';

  const LINES = Symbol('pos'); // object: {key: charOffset}; array: [charOffset, ...]

  // ------------------------------------------------------------------ parser
  class SyntaxIssue extends Error {
    constructor(code, line, col, detail) { super(code); this.code = code; this.line = line; this.col = col; this.detail = detail || ''; }
  }

  function parse(text) {
    let i = 0, line = 1, lineStart = 0;
    const n = text.length;
    if (text.charCodeAt(0) === 0xfeff) i = 1; // BOM

    const col = (pos) => pos - lineStart + 1;
    const fail = (code, pos, detail) => { throw new SyntaxIssue(code, line, col(pos === undefined ? i : pos), detail); };

    function ws() {
      for (;;) {
        const c = text.charCodeAt(i);
        if (c === 32 || c === 9 || c === 13) { i++; continue; }
        if (c === 10) { i++; line++; lineStart = i; continue; }
        if (c === 47 && (text.charCodeAt(i + 1) === 47 || text.charCodeAt(i + 1) === 42)) fail('JSON-002', i); // comment
        return;
      }
    }

    function str() {
      // at opening quote
      const start = ++i;
      let out = null, seg = start;
      for (;;) {
        const q = text.indexOf('"', i);
        if (q === -1) fail('JSON-004', n);
        // search backslash / newline only up to the closing quote (keeps parsing linear)
        let b = -1, nl = -1;
        for (let j = i; j < q; j++) {
          const c = text.charCodeAt(j);
          if (c === 92) { b = j; break; }
          if (c === 10) { nl = j; break; }
        }
        if (nl !== -1) fail('JSON-005', nl, 'newline inside text');
        if (b !== -1) {
          out = (out || '') + text.slice(seg, b);
          const e = text[b + 1];
          const map = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
          if (e === 'u') { out += String.fromCharCode(parseInt(text.substr(b + 2, 4), 16)); i = b + 6; }
          else if (e in map) { out += map[e]; i = b + 2; }
          else fail('JSON-005', b, 'invalid escape');
          seg = i; continue;
        }
        const s = out === null ? text.slice(start, q) : out + text.slice(seg, q);
        i = q + 1; return s;
      }
    }

    const NUM = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
    function num() {
      NUM.lastIndex = i; const m = NUM.exec(text);
      if (!m) fail('JSON-005', i);
      i += m[0].length; return Number(m[0]);
    }

    function lit() {
      if (text.startsWith('true', i)) { i += 4; return true; }
      if (text.startsWith('false', i)) { i += 5; return false; }
      if (text.startsWith('null', i)) { i += 4; return null; }
      if (text.startsWith('...', i) || text.charCodeAt(i) === 0x2026) fail('JSON-006', i);
      if (text.startsWith('NaN', i) || text.startsWith('Infinity', i) || text.startsWith('undefined', i)) fail('JSON-007', i);
      if (text[i] === "'") fail('JSON-008', i);
      fail('JSON-005', i, JSON.stringify(text.substr(i, 12)));
    }

    function value() {
      ws();
      if (i >= n) fail('JSON-004', n);
      const c = text[i];
      if (c === '{') return obj();
      if (c === '[') return arr();
      if (c === '"') return str();
      if (c === '-' || (c >= '0' && c <= '9')) return num();
      return lit();
    }

    function obj() {
      i++; const o = {}; const ln = Object.create(null); o[LINES] = ln;
      ws();
      if (text[i] === '}') { i++; return o; }
      for (;;) {
        ws();
        if (i >= n) fail('JSON-004', n);
        if (text[i] === '}') fail('JSON-001', i);           // trailing comma
        if (text[i] === "'") fail('JSON-008', i);
        if (text[i] !== '"') fail('JSON-009', i);           // unquoted key
        const kl = i; const k = str();
        ws();
        if (text[i] !== ':') fail('JSON-005', i, 'expected :');
        i++;
        if (k in ln) o.__dup = (o.__dup || []).concat([[k, kl]]);
        ln[k] = kl; o[k] = value();
        ws();
        if (i >= n) fail('JSON-004', n);
        if (text[i] === ',') { i++; continue; }
        if (text[i] === '}') { i++; return o; }
        fail('JSON-003', i);                                 // missing comma
      }
    }

    function arr() {
      i++; const a = []; const ln = []; a[LINES] = ln;
      ws();
      if (text[i] === ']') { i++; return a; }
      for (;;) {
        ws();
        if (i >= n) fail('JSON-004', n);
        if (text[i] === ']') fail('JSON-001', i);
        ln.push(i); a.push(value());
        ws();
        if (i >= n) fail('JSON-004', n);
        if (text[i] === ',') { i++; continue; }
        if (text[i] === ']') { i++; return a; }
        fail('JSON-003', i);
      }
    }

    const v = value(); ws();
    if (i < n) fail('JSON-005', i, 'extra content after the end');
    return v;
  }

  // ------------------------------------------------------------------ helpers
  const fold = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const typeOf = (v) => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  const isId = (k) => /^-?\d+$/.test(k);
  const short = (v) => {
    let s;
    try { s = JSON.stringify(v); } catch (e) { s = String(v); }
    if (s === undefined) s = String(v);
    return s.length > 80 ? s.slice(0, 77) + '…' : s;
  };
  const pathStr = (segs) => segs.reduce((acc, s) => typeof s === 'number' ? acc + '[' + s + ']' : (acc ? acc + '.' + s : s), '');
  const lineOf = (parent, key) => { const l = parent && parent[LINES]; return l ? l[key] : undefined; };

  // ------------------------------------------------------------------ validator
  function validate(doc, S) {
    const msgs = [];
    const variants = {};
    const guide = new Set(S.guideKeys);
    const E = S.enums;
    const enumSets = {};
    for (const k in E) {
      const e = E[k];
      enumSets[k] = {
        canon: new Set(e.canonical),
        known: e.caseTolerant ? new Set([...e.canonical, ...(e.variants || [])].map(fold)) : new Set(),
        naming: new Set((e.namingOnly || []).map(fold)),
        sev: e.unknown === 'warning' ? 'warning' : 'error'
      };
    }
    const ENUM_CODE = { drivingStyles: 'ENUM-002', characteristics: 'ENUM-003', sponsorCategories: 'ENUM-004', bonusType: 'ENUM-005', sex: 'ENUM-001', eventType: 'ENUM-001' };
    const ENUM_RULES = {
      driver: { 'drivingStyles[]': 'drivingStyles', 'characteristics[]': 'characteristics', 'sex': 'sex' },
      team: { 'currentConcept.drivingStyle': 'drivingStyles', 'cars[].currentConcept.drivingStyle': 'drivingStyles', 'sponsors[].bonusType': 'bonusType' },
      sponsor: { 'category': 'sponsorCategories', 'bonusType': 'bonusType' },
      namingSponsor: { 'category': 'sponsorCategories' },
      circuit: { 'eventType': 'eventType' },
      staff: { 'sex': 'sex' },
      generalData: { 'concepts.current[].drivingStyle': 'drivingStyles' }
    };
    const FIELDLIST = { driver: 'driverFields', team: 'teamFields', sponsor: 'sponsorFields', namingSponsor: 'namingSponsorFields', circuit: 'circuitFields', engine: 'engineFields', academy: 'academyFields', staff: 'staffFields', journalist: 'journalistFields' };

    const push = (m) => msgs.push(m);

    function checkEnum(enumKey, v, segs, line, entity, naming, field) {
      if (typeof v !== 'string') return;
      const s = enumSets[enumKey]; if (!s) return;
      if (s.canon.has(v)) return;
      const f = fold(v);
      if (s.known.has(f) || (naming && s.naming.has(f))) {
        const k = enumKey + '|' + v; variants[k] = variants[k] || { enumKey, value: v, count: 0, first: { path: pathStr(segs), segs: segs.slice(), line } };
        variants[k].count++; return;
      }
      push({ sev: s.sev, code: ENUM_CODE[enumKey], tpl: 'unknownValue', segs: segs.slice(), line, entity, field, value: short(v), ref: enumKey, vars: { value: v, field } });
    }

    function walkSub(entType, known, base, relParts, v, segs, entity, parentObj, key) {
      // relParts: normalized relative path parts (strings, '[]', '{id}')
      const rel = relParts.join('.').replace(/\.\[\]/g, '[]');
      const rules = ENUM_RULES[entType] || {};
      if (rules[rel]) checkEnum(rules[rel], v, segs, lineOf(parentObj, key), entity, entType === 'namingSponsor', relParts.filter(p => p !== '[]').slice(-1)[0] || key);
      if (Array.isArray(v)) {
        for (let i = 0; i < v.length; i++) walkSub(entType, known, base, relParts.concat('[]'), v[i], segs.concat(i), entity, v, i);
      } else if (v && typeof v === 'object') {
        for (const k of Object.keys(v)) {
          if (k === '__dup') continue;
          const part = isId(k) ? '{id}' : k;
          const childRel = relParts.concat(part).join('.').replace(/\.\[\]/g, '[]');
          const dynamic = part === '{id}' || relParts.includes('{id}');
          if (known && !dynamic && !known.has(childRel) && !guide.has(k)) {
            push({ sev: 'warning', code: 'FIELD-001', tpl: 'unknownField', segs: segs.concat(k), line: lineOf(v, k), entity, field: k, value: short(v[k]), ref: null, vars: { field: k, object: base } });
            continue; // report only the top-most unknown
          }
          walkSub(entType, known, base, relParts.concat(part), v[k], segs.concat(k), entity, v, k);
        }
      }
    }

    function entityLabel(o, cat) {
      const nm = o && (o.name || o.modName);
      return (nm ? String(nm) : '') + (cat ? ' · ' + cat : '');
    }

    function checkEntity(entType, o, segs, cat, parentArr, idx) {
      const def = S.entities[entType]; const label = entityLabel(o, cat);
      const line = lineOf(parentArr, idx);
      if (!o || typeof o !== 'object' || Array.isArray(o)) {
        push({ sev: 'error', code: 'TYPE-001', tpl: 'wrongTypeObj', segs, line, entity: label, field: '', value: short(o), vars: { field: pathStr(segs) } });
        return;
      }
      const base = def.arrays[0] + '[]';
      const knownSub = def._known || (def._known = new Set(def.knownSubPaths.map(p => p.replace(/\.\[\]/g, '[]'))));
      for (const k of Object.keys(o)) {
        if (k === '__dup') continue;
        const f = def.fields[k];
        const ln = lineOf(o, k), v = o[k];
        if (!f) {
          if (!guide.has(k)) push({ sev: 'warning', code: 'FIELD-001', tpl: 'unknownField', segs: segs.concat(k), line: ln, entity: label, field: k, value: short(v), ref: FIELDLIST[entType], vars: { field: k, object: base } });
          continue;
        }
        const t = typeOf(v);
        if (!f.type.includes(t)) {
          if (f.type.includes('number') && t === 'string' && v.trim() !== '' && !isNaN(Number(v))) {
            push({ sev: 'warning', code: 'TYPE-001', tpl: 'wrongType', segs: segs.concat(k), line: ln, entity: label, field: k, value: short(v), apply: true, vars: { field: k, value: v } });
          } else if (!(t === 'null')) {
            push({ sev: 'warning', code: 'TYPE-002', tpl: 'wrongTypeGeneric', segs: segs.concat(k), line: ln, entity: label, field: k, value: short(v), vars: { field: k, expected: f.type.filter(x => x !== 'null').join(' / '), actual: t } });
          }
          continue;
        }
        if (f.range && typeof v === 'number' && (v < f.range.min || v > f.range.max)) {
          push({ sev: 'info', code: 'RANGE-001', tpl: 'outOfRange', segs: segs.concat(k), line: ln, entity: label, field: k, value: short(v), vars: { field: k, value: v, range: f.range.min + '–' + f.range.max, src: f.range.src } });
        }
        const rules = ENUM_RULES[entType] || {};
        if (rules[k]) checkEnum(rules[k], v, segs.concat(k), ln, label, entType === 'namingSponsor', k);
        if (v && typeof v === 'object') walkSub(entType, knownSub, base, [k], v, segs.concat(k), label, o, k);
      }
      for (const k of def.requiredInVanilla) {
        if (!(k in o)) push({ sev: 'info', code: 'MISS-001', tpl: 'missing', segs: segs.slice(), line, entity: label, field: k, value: '—', missingField: k, vars: { field: k } });
      }
      if (o.__dup) for (const [k, l] of o.__dup) push({ sev: 'warning', code: 'DUP-001', tpl: 'duplicateKey', segs: segs.concat(k), line: l, entity: label, field: k, value: short(o[k]), vars: { field: k } });
    }

    function checkGeneral(g, segs, cat) {
      if (!g || typeof g !== 'object') return;
      const known = S.generalData._known || (S.generalData._known = new Set(S.generalData.knownPaths.map(p => p.replace(/\.\[\]/g, '[]'))));
      walkSub('generalData', known, 'generalData', [], g, segs, 'generalData' + (cat ? ' · ' + cat : ''), null, null);
    }

    function checkCategory(c, segs, catName) {
      const ARR = {};
      for (const et in S.entities) for (const a of S.entities[et].arrays) ARR[a] = et;
      for (const a in ARR) {
        const list = c[a];
        if (list === undefined) continue;
        if (!Array.isArray(list)) { push({ sev: 'error', code: 'TYPE-002', tpl: 'wrongTypeGeneric', segs: segs.concat(a), line: lineOf(c, a), entity: catName || '', field: a, value: short(list), vars: { field: a, expected: 'array', actual: typeOf(list) } }); continue; }
        for (let i = 0; i < list.length; i++) checkEntity(ARR[a], list[i], segs.concat(a, i), catName, list, i);
      }
    }

    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      push({ sev: 'error', code: 'TYPE-001', tpl: 'notAMod', segs: [], line: 0, entity: '', field: '', value: short(doc), vars: {} });
      return { msgs, variants: [] };
    }
    const rootKnown = new Set(S.rootFields);
    for (const k of Object.keys(doc)) {
      if (k === '__dup') continue;
      if (!rootKnown.has(k) && !guide.has(k)) push({ sev: 'warning', code: 'FIELD-001', tpl: 'unknownField', segs: [k], line: lineOf(doc, k), entity: '', field: k, value: short(doc[k]), ref: null, vars: { field: k, object: 'root' } });
    }
    checkCategory(doc, [], '');
    checkGeneral(doc.generalData, ['generalData'], '');
    const add = doc.additionalCategories;
    if (Array.isArray(add)) {
      const addKnown = new Set(S.additionalCategoryFields);
      add.forEach((c, i) => {
        if (!c || typeof c !== 'object') return;
        const nm = c.name || ('#' + i);
        for (const k of Object.keys(c)) if (k !== '__dup' && !addKnown.has(k) && !guide.has(k)) push({ sev: 'warning', code: 'FIELD-001', tpl: 'unknownField', segs: ['additionalCategories', i, k], line: lineOf(c, k), entity: nm, field: k, value: short(c[k]), vars: { field: k, object: 'additionalCategories[]' } });
        const d = c.data;
        if (d && typeof d === 'object') {
          checkCategory(d, ['additionalCategories', i, 'data'], nm);
          checkGeneral(d.general, ['additionalCategories', i, 'data', 'general'], nm);
        }
      });
    }
    checkRefs(doc, push);
    checkPaths(doc, push);
    msgs.forEach((m, i) => { m.id = 'm' + i; m.path = pathStr(m.segs); });
    return { msgs, variants: Object.values(variants) };
  }

  // ------------------------------------------------------------------ references between entries
  // IDs are shared by all categories of a mod (additional categories point to the main lists too).
  // null, '' and -1 mean "none". Severities follow the vanilla data: what the vanilla databases
  // also contain is never an error.
  function checkRefs(doc, push) {
    const DRIVERS = ['titularDrivers', 'reserveDrivers', 'freeDrivers', 'retiredDrivers'];
    const cats = [{ c: doc, segs: [], name: '' }];
    if (Array.isArray(doc.additionalCategories)) doc.additionalCategories.forEach((a, i) => {
      if (a && a.data && typeof a.data === 'object') cats.push({ c: a.data, segs: ['additionalCategories', i, 'data'], name: a.name || '#' + i });
    });
    const KINDS = {
      driver: DRIVERS, team: ['teams', 'potentialTeams'], sponsor: ['sponsors'], namingSponsor: ['namingSponsors'],
      engine: ['engines', 'potentialEngines'], academy: ['academies'], staff: ['staff']
    };
    // drivers, teams, academies and staff share one ID space across categories;
    // sponsors, naming sponsors and engines are numbered per category.
    const GLOBAL = { driver: true, team: true, academy: true, staff: true };
    const ids = {};
    for (const k in KINDS) if (GLOBAL[k]) ids[k] = new Map();
    for (const cat of cats) { cat.ids = {}; cat.engineNames = new Set(); for (const k in KINDS) cat.ids[k] = GLOBAL[k] ? ids[k] : new Map(); }
    const isNone = (v) => v === null || v === undefined || v === '' || v === -1 || v === '-1';
    const same = (v) => (typeof v === 'string' && /^-?\d+$/.test(v)) ? Number(v) : v;

    // 1. collect IDs and report duplicates
    for (const cat of cats) {
      const { c, segs, name } = cat;
      for (const kind in KINDS) for (const arr of KINDS[kind]) {
        const list = c[arr]; if (!Array.isArray(list)) continue;
        list.forEach((o, i) => {
          if (!o || typeof o !== 'object') return;
          if (kind === 'engine' && typeof o.name === 'string') cat.engineNames.add(o.name);
          if (isNone(o.id)) return;
          const id = same(o.id), here = { segs: segs.concat(arr, i), label: (o.name || '') + (name ? ' · ' + name : '') };
          const prev = cat.ids[kind].get(id);
          if (prev) {
            push({ sev: 'error', code: 'DUP-002', tpl: 'duplicateId', segs: here.segs.concat('id'), line: lineOf(o, 'id'), entity: here.label, field: 'id', value: short(o.id),
              vars: { value: o.id, targetKey: kind, other: pathStr(prev.segs) + (prev.label ? ' (' + prev.label + ')' : '') } });
          } else cat.ids[kind].set(id, here);
        });
      }
    }

    // 1b. the same driver or staff member entered twice (same name, different IDs)
    for (const [kind, arrs] of [['driver', DRIVERS], ['staff', ['staff']]]) {
      const seen = new Map();
      for (const { c, segs, name } of cats) for (const arr of arrs) (Array.isArray(c[arr]) ? c[arr] : []).forEach((o, i) => {
        if (!o || typeof o !== 'object' || typeof o.name !== 'string' || !o.name.trim()) return;
        const k = fold(o.name).replace(/\s+/g, ' ');
        const here = { segs: segs.concat(arr, i), id: o.id, cat: name };
        const first = seen.get(k);
        if (!first) { seen.set(k, here); return; }
        if (same(first.id) === same(o.id)) return;
        push({ sev: 'warning', code: 'DUP-003', tpl: 'duplicateName', segs: here.segs.concat('name'), line: lineOf(o, 'name'), entity: o.name + (name ? ' · ' + name : ''), field: 'name', value: short(o.name),
          vars: { value: o.name, id: o.id, targetKey: kind, other: pathStr(first.segs) + ' (id ' + first.id + (first.cat ? ', ' + first.cat : '') + ')' } });
      });
    }

    // 2. check references
    let cur = null; // category being checked
    function ref(sev, obj, key, kind, segs, entity, fieldLabel, val) {
      const v = val === undefined ? obj[key] : val;
      if (isNone(v)) return;
      const ok = kind === 'engineName' ? cur.engineNames.has(v) : cur.ids[kind].has(same(v));
      if (ok) return;
      push({ sev, code: 'REF-001', tpl: 'missingRef', segs, line: lineOf(obj, key), entity, field: fieldLabel || String(key), value: short(v),
        ref: null, vars: { field: fieldLabel || String(key), value: v, targetKey: kind === 'engineName' ? 'engine' : kind } });
    }
    for (const cat of cats) {
      cur = cat; const { c, segs, name } = cat;
      const lbl = (o) => (o && o.name ? o.name : '') + (name ? ' · ' + name : '');
      for (const arr of DRIVERS) (Array.isArray(c[arr]) ? c[arr] : []).forEach((d, i) => {
        if (!d || typeof d !== 'object') return;
        const s = segs.concat(arr, i), L = lbl(d);
        ref('error', d, 'teamId', 'team', s.concat('teamId'), L);
        ref('warning', d, 'academyId', 'academy', s.concat('academyId'), L);
        for (const [rel, kind] of [['relations', 'driver'], ['teamRelations', 'team']]) {
          const r = d[rel]; if (!r || typeof r !== 'object' || Array.isArray(r)) continue;
          for (const k of Object.keys(r)) if (k !== '__dup') ref('info', r, k, kind, s.concat(rel, k), L, rel, k);
        }
      });
      for (const arr of ['teams', 'potentialTeams']) (Array.isArray(c[arr]) ? c[arr] : []).forEach((t, i) => {
        if (!t || typeof t !== 'object') return;
        const s = segs.concat(arr, i), L = lbl(t), potential = arr === 'potentialTeams';
        for (const k of ['pilots', 'reserves']) (Array.isArray(t[k]) ? t[k] : []).forEach((p, j) => {
          if (p && typeof p === 'object') ref('error', p, 'id', 'driver', s.concat(k, j, 'id'), L, k + '[].id');
          else ref('error', t[k], j, 'driver', s.concat(k, j), L, k + '[]');
        });
        (Array.isArray(t.drivers) ? t.drivers : []).forEach((p, j) => {
          if (p && typeof p === 'object') ref('info', p, 'id', 'driver', s.concat('drivers', j, 'id'), L, 'drivers[].id');
          else ref('info', t.drivers, j, 'driver', s.concat('drivers', j), L, 'drivers[]');
        });
        const dca = t.driverCarAssignment;
        if (dca && typeof dca === 'object' && !Array.isArray(dca)) {
          const cars = new Set((Array.isArray(t.cars) ? t.cars : []).map((x) => x && x.id));
          for (const k of Object.keys(dca)) {
            if (k === '__dup') continue;
            ref('info', dca, k, 'driver', s.concat('driverCarAssignment', k), L, 'driverCarAssignment', k);
            if (!isNone(dca[k]) && !cars.has(dca[k])) push({ sev: 'warning', code: 'REF-001', tpl: 'missingRef', segs: s.concat('driverCarAssignment', k), line: lineOf(dca, k), entity: L,
              field: 'driverCarAssignment.' + k, value: short(dca[k]), vars: { field: 'driverCarAssignment.' + k, value: dca[k], targetKey: 'car' } });
          }
        }
        (Array.isArray(t.sponsors) ? t.sponsors : []).forEach((sp, j) => { if (sp && typeof sp === 'object') ref('warning', sp, 'sponsorId', 'sponsor', s.concat('sponsors', j, 'sponsorId'), L, 'sponsors[].sponsorId'); });
        if (t.namingSponsor && typeof t.namingSponsor === 'object') ref('warning', t.namingSponsor, 'sponsorId', 'namingSponsor', s.concat('namingSponsor', 'sponsorId'), L, 'namingSponsor.sponsorId');
        ref(potential ? 'info' : 'warning', t, 'engine', 'engineName', s.concat('engine'), L);
        ref('warning', t, 'ownedEngineId', 'engineName', s.concat('ownedEngineId'), L);
        ref('warning', t, 'preferredEngineId', 'engineName', s.concat('preferredEngineId'), L);
        ref('warning', t, 'engineId', 'engine', s.concat('engineId'), L);
        ref('warning', t, 'academyId', 'academy', s.concat('academyId'), L);
      });
      (Array.isArray(c.academies) ? c.academies : []).forEach((a, i) => { if (a && typeof a === 'object') ref('warning', a, 'teamId', 'team', segs.concat('academies', i, 'teamId'), lbl(a)); });
      (Array.isArray(c.staff) ? c.staff : []).forEach((a, i) => { if (a && typeof a === 'object') ref('warning', a, 'teamId', 'team', segs.concat('staff', i, 'teamId'), lbl(a)); });
      for (const arr of ['engines', 'potentialEngines']) (Array.isArray(c[arr]) ? c[arr] : []).forEach((e, i) => {
        if (e && Array.isArray(e.teamIds)) e.teamIds.forEach((x, j) => ref('warning', e.teamIds, j, 'team', segs.concat(arr, i, 'teamIds', j), lbl(e), 'teamIds[]'));
      });
    }
  }

  // ------------------------------------------------------------------ image paths (only the text in the JSON, no files are read)
  // A path such as D:\\Steam\\...\\resources\\teams\\x.png only exists on the computer the mod was made on.
  // workshopCoverImage is skipped: it is only used on the author's PC when uploading to the Workshop.
  const IMG_KEYS = { image: 1, logo: 1, flag: 1, flagPath: 1, decorBgImage: 1 };
  const IMG_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;
  const ABS = /^(?:[A-Za-z]:[\\/]|\\\\|\/(?:Users|home|mnt|Volumes)\/)/;
  const FOLDERS = ['faces', 'teams', 'sponsors', 'flags', 'engines', 'images', 'tracks', 'categories', 'journalists', 'staff'];
  function suggestPath(v) {
    const parts = v.split(/[\\/]+/).filter(Boolean);
    const file = parts[parts.length - 1];
    for (let i = parts.length - 2; i >= 0; i--) {
      if (FOLDERS.includes(parts[i].toLowerCase())) return './' + parts.slice(i).join('/');
      if (/^(resources|public)$/i.test(parts[i])) break;
    }
    return null;
  }
  function checkPaths(doc, push) {
    (function walk(v, segs, label, parent, key) {
      if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) walk(v[i], segs.concat(i), label, v, i); return; }
      if (v && typeof v === 'object') {
        const lb = typeof v.name === 'string' && v.name ? v.name : label;
        for (const k of Object.keys(v)) if (k !== '__dup' && k !== 'workshopCoverImage') walk(v[k], segs.concat(k), lb, v, k);
        return;
      }
      if (typeof v !== 'string' || v.length > 1000 || v.startsWith('data:')) return;
      if (!(IMG_KEYS[key] || IMG_EXT.test(v))) return;
      if (!ABS.test(v)) return;
      const sug = suggestPath(v);
      push({ sev: 'warning', code: 'PATH-001', tpl: sug ? 'absolutePath' : 'absolutePathNoSug', segs, line: lineOf(parent, key), entity: label || '', field: String(key), value: short(v),
        apply: !!sug, vars: { field: String(key), value: v, suggestion: sug || '' } });
    })(doc, [], '', null, null);
  }

  // ------------------------------------------------------------------ tree helpers (lazy children)
  function getNode(doc, segs) {
    let v = doc;
    for (const s of segs) { if (v == null) return undefined; v = v[s]; }
    return v;
  }
  function children(doc, segs, from, count, idx) {
    const v = getNode(doc, segs); const out = [];
    if (Array.isArray(v)) {
      const ln = v[LINES] || [];
      for (let i = from; i < Math.min(v.length, from + count); i++) out.push(describe(i, v[i], idx ? lc(idx, ln[i]).line : undefined));
      return { items: out, total: v.length };
    }
    if (v && typeof v === 'object') {
      const keys = Object.keys(v).filter(k => k !== '__dup'); const ln = v[LINES] || {};
      for (let i = from; i < Math.min(keys.length, from + count); i++) out.push(describe(keys[i], v[keys[i]], idx ? lc(idx, ln[keys[i]]).line : undefined));
      return { items: out, total: keys.length };
    }
    return { items: [], total: 0 };
  }
  function describe(key, v, line) {
    const t = typeOf(v);
    const d = { key, t, line };
    if (t === 'array') { d.n = v.length; }
    else if (t === 'object') { d.n = Object.keys(v).filter(k => k !== '__dup').length; if (typeof v.name === 'string') d.label = v.name; }
    else d.v = t === 'string' ? (v.length > 60 ? JSON.stringify(v.slice(0, 57) + '…') : JSON.stringify(v)) : String(v);
    return d;
  }

  // ------------------------------------------------------------------ offsets -> line/column
  function lineIndex(text) {
    let count = 0, p = -1;
    while ((p = text.indexOf('\n', p + 1)) !== -1) count++;
    const idx = new Int32Array(count); let k = 0; p = -1;
    while ((p = text.indexOf('\n', p + 1)) !== -1) idx[k++] = p;
    return idx;
  }
  function lc(idx, off) {
    if (off === undefined || off === null) return { line: undefined, col: undefined };
    let lo = 0, hi = idx.length;              // number of newlines before off
    while (lo < hi) { const mid = (lo + hi) >> 1; if (idx[mid] < off) lo = mid + 1; else hi = mid; }
    return { line: lo + 1, col: off - (lo ? idx[lo - 1] : -1) };
  }
  function resolve(result, idx) {
    for (const m of result.msgs) { const r = lc(idx, m.line); m.line = r.line; m.col = r.col; }
    for (const v of result.variants) { const r = lc(idx, v.first.line); v.first.line = r.line; v.first.col = r.col; }
    result.lines = idx.length + 1;
    return result;
  }

  const api = { parse, validate, children, getNode, fold, pathStr, SyntaxIssue, LINES, lineIndex, lc, resolve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DMV = api;
})(typeof self !== 'undefined' ? self : this);
