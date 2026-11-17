/* Regression: fields the game editor writes itself are never "unknown" (FIELD-001). */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { check, byCode, minimalMod } = require('./helpers');

const { generalData } = require(path.join(__dirname, 'fixtures', 'editor-fields.json'));

function setPath(o, p, v) {
  const parts = p.split('.');
  for (const k of parts.slice(0, -1)) o = o[k] = o[k] || {};
  o[parts[parts.length - 1]] = v;
}

for (const f of generalData) {
  test(`editor field generalData.${f.path} is known`, () => {
    const mod = minimalMod();
    setPath(mod.generalData, f.path, f.value);
    assert.deepEqual(byCode(check(mod), 'FIELD-001').map(m => m.path), []);
  });
  test(`editor field ${f.path} is known in an additional category`, () => {
    const mod = minimalMod();
    const general = {};
    setPath(general, f.path, f.value);
    mod.additionalCategories = [{ name: 'Cat 2', data: { general } }];
    assert.deepEqual(byCode(check(mod), 'FIELD-001').map(m => m.path), []);
  });
}
