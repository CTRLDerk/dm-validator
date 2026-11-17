/* Interface texts: the same keys and {placeholders} in every language, and a text for every code and template. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { LANGS, I18N, read, engineCodes, engineTemplates } = require('./helpers');

const flat = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  v && typeof v === 'object' && !Array.isArray(v) ? flat(v, pre + k + '.') : [[pre + k, v]]);
const placeholders = (s) => (typeof s === 'string' ? [...new Set(s.match(/\{[A-Za-z0-9_]+\}/g) || [])].sort() : []);
const EN = new Map(flat(I18N.en));

for (const lang of LANGS.filter((l) => l !== 'en')) {
  const T = new Map(flat(I18N[lang]));

  test(`i18n ${lang}: same keys as en`, () => {
    const missing = [...EN.keys()].filter((k) => !T.has(k));
    const extra = [...T.keys()].filter((k) => !EN.has(k));
    assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
  });

  test(`i18n ${lang}: same {placeholders} as en`, () => {
    const diff = [];
    for (const [k, v] of EN) if (T.has(k) && placeholders(v).join() !== placeholders(T.get(k)).join()) diff.push(`${k}: en ${placeholders(v)} / ${lang} ${placeholders(T.get(k))}`);
    assert.deepEqual(diff, []);
  });

  test(`i18n ${lang}: no empty texts`, () => {
    assert.deepEqual([...T].filter(([, v]) => typeof v === 'string' && !v.trim()).map(([k]) => k), []);
  });
}

test('i18n: every rule code in engine.js has a text', () => {
  const missing = engineCodes().filter((c) => !(c.startsWith('JSON-') ? I18N.en.syntax[c] : I18N.en.rules[c]));
  assert.deepEqual(missing, []);
});

test('i18n: every message template in engine.js has a text', () => {
  assert.deepEqual(engineTemplates().filter((t) => !I18N.en.msg[t]), []);
});

test('i18n: every t(\'section.key\') used in app.js exists in en.json', () => {
  const src = read('app.js');
  const used = [...new Set([...src.matchAll(/\bt\('([a-zA-Z]+)\.([A-Za-z0-9_-]+)'/g)].map((m) => m[1] + '.' + m[2]))];
  const missing = used.filter((k) => k.split('.')[0] in I18N.en && !EN.has(k));
  assert.deepEqual(missing, []);
});
