#!/usr/bin/env node
/* DM Validator — repo-controle voor CI en vóór een PR.
   node tools/check.js            Exitcode 0 = alles in orde.
   1. JavaScript-syntaxis van engine.js, app.js, worker.js
   2. Schema en vertalingen zijn geldige JSON
   3. Alle talen hebben dezelfde sleutels als en.json
   4. Elke meldingstekst (tpl) die engine.js gebruikt bestaat in elke taal
   5. Rooktest: de engine leest en controleert een minimale mod zonder te crashen */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const LANGS = ['en', 'nl', 'de', 'fr'];
let fail = 0;
const ok = (m) => console.log('OK    ' + m);
const bad = (m) => { console.log('FOUT  ' + m); fail = 1; };

for (const f of ['engine.js', 'app.js', 'worker.js']) {
  try { execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' }); ok('syntaxis ' + f); }
  catch (e) { bad('syntaxis ' + f + '\n' + e.stderr); }
}

const json = {};
for (const f of ['schema/dm-0.7.json', ...LANGS.map(l => `i18n/${l}.json`)]) {
  try { json[f] = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); ok('JSON ' + f); }
  catch (e) { bad('JSON ' + f + ': ' + e.message); }
}

const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
  v && typeof v === 'object' && !Array.isArray(v) ? keys(v, p + k + '.') : [p + k]);
const en = json['i18n/en.json'];
if (en) {
  const base = new Set(keys(en));
  for (const l of LANGS.slice(1)) {
    const t = json[`i18n/${l}.json`]; if (!t) continue;
    const own = new Set(keys(t));
    const missing = [...base].filter(k => !own.has(k)), extra = [...own].filter(k => !base.has(k));
    if (missing.length || extra.length) bad(`vertaling ${l}: ${missing.length} ontbreken, ${extra.length} extra` +
      (missing.length ? '\n      ontbreekt: ' + missing.slice(0, 10).join(', ') : '') +
      (extra.length ? '\n      extra: ' + extra.slice(0, 10).join(', ') : ''));
    else ok(`vertaling ${l} compleet`);
  }
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  const tpls = [...new Set([...src.matchAll(/tpl:\s*'([A-Za-z0-9_]+)'/g)].map(m => m[1]))];
  for (const l of LANGS) {
    const msg = (json[`i18n/${l}.json`] || {}).msg || {};
    const gone = tpls.filter(t => !(t in msg));
    if (gone.length) bad(`meldingsteksten ${l}: ontbreekt ${gone.join(', ')}`); else ok(`meldingsteksten ${l} (${tpls.length})`);
  }
}

try {
  const DMV = require(path.join(ROOT, 'engine.js'));
  const S = json['schema/dm-0.7.json'];
  const text = JSON.stringify({ generalData: { startYear: 2026, startWeek: 1 } }, null, 1);
  const res = DMV.resolve(DMV.validate(DMV.parse(text), S), DMV.lineIndex(text));
  if (!res || !Array.isArray(res.msgs)) throw new Error('validate gaf geen msgs terug');
  const t2 = JSON.stringify({ generalData: { startYear: 2026, startWeek: 1, ditVeldBestaatNiet: 1 } });
  const res2 = DMV.validate(DMV.parse(t2), S);
  if (!res2.msgs.some(m => m.code === 'FIELD-001')) throw new Error('onbekend veld werd niet gemeld (FIELD-001)');
  let syntaxCaught = false;
  try { DMV.parse('{"a": 1,, }'); } catch (e) { syntaxCaught = e instanceof DMV.SyntaxIssue; }
  if (!syntaxCaught) throw new Error('kapotte JSON werd niet als SyntaxIssue gemeld');
  ok('rooktest engine (minimale mod, onbekend veld en kapotte JSON worden gemeld)');
} catch (e) { bad('rooktest engine: ' + e.message); }

console.log(fail ? '\nNiet in orde.' : '\nAlles in orde.');
process.exit(fail);
