/* Language files: same keys in every language, same {placeholders}, and a text for every code the engine emits. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { ROOT, LANGS, loadLang } = require('./helpers');

function flat(o, pre = '', out = {}) {
  for (const k of Object.keys(o)) {
    const v = o[k], p = pre ? pre + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, p, out); else out[p] = v;
  }
  return out;
}
const placeholders = (s) => typeof s === 'string' ? [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort() : [];

const en = flat(loadLang('en'));
const src = ['engine.js', 'app.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');

for (const l of LANGS.filter(l => l !== 'en')) {
  const other = flat(loadLang(l));
  test(`${l}: same keys as en`, () => {
    const missing = Object.keys(en).filter(k => !(k in other));
    const extra = Object.keys(other).filter(k => !(k in en));
    assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
  });
  test(`${l}: same placeholders as en`, () => {
    const bad = Object.keys(en).filter(k => k in other && placeholders(en[k]).join() !== placeholders(other[k]).join());
    assert.deepEqual(bad, []);
  });
  test(`${l}: no empty texts`, () => {
    assert.deepEqual(Object.keys(other).filter(k => other[k] === ''), []);
  });
}

test('every rule code in the engine has a name in rules.*', () => {
  const rules = loadLang('en').rules;
  const used = [...new Set([...src.matchAll(/'((?:ENUM|FIELD|TYPE|RANGE|MISS|DUP|REF)-\d{3})'/g)].map(m => m[1]))];
  assert.deepEqual(used.filter(c => !(c in rules)), []);
});

test('every JSON-xxx code in the engine has a syntax text', () => {
  const syn = loadLang('en').syntax;
  const used = [...new Set([...src.matchAll(/'(JSON-\d{3})'/g)].map(m => m[1]))];
  assert.deepEqual(used.filter(c => !(c in syn)), []);
});

test('every message template in the engine has a text in msg.*', () => {
  const msg = loadLang('en').msg;
  const used = [...new Set([...src.matchAll(/tpl: '(\w+)'/g)].map(m => m[1]))];
  assert.deepEqual(used.filter(t => !(t in msg)), []);
});
