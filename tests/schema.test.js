/* Schema: structure, sources and internal consistency of schema/dm-0.7.json. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { S } = require('./helpers');

const TYPES = new Set(['string', 'number', 'boolean', 'null', 'object', 'array']);
const dups = (arr) => [...new Set(arr.filter((x, i) => arr.indexOf(x) !== i))];

test('schema: version fields are present', () => {
  assert.match(S.schemaVersion, /^\d+\.\d+\.\d+$/);
  assert.match(S.gameVersion, /^\d+\.\d+/);
});

test('schema: every enum has canonical values, a source and a severity', () => {
  for (const [k, e] of Object.entries(S.enums)) {
    assert.ok(Array.isArray(e.canonical) && e.canonical.length, `${k}: canonical list`);
    assert.ok(typeof e.src === 'string' && e.src.trim(), `${k}: src`);
    assert.ok(['error', 'warning'].includes(e.unknown), `${k}: unknown must be error or warning`);
    assert.deepEqual(dups(e.canonical), [], `${k}: duplicate canonical values`);
    for (const v of e.variants || []) assert.ok(!e.canonical.includes(v), `${k}: variant "${v}" is also canonical`);
  }
});

test('schema: every entity field has valid types, and every range is sane with a source', () => {
  const problems = [];
  for (const [et, def] of Object.entries(S.entities)) {
    for (const [k, f] of Object.entries(def.fields)) {
      if (!Array.isArray(f.type) || !f.type.length || f.type.some((t) => !TYPES.has(t))) problems.push(`${et}.${k}: type ${JSON.stringify(f.type)}`);
      if (f.range) {
        const { min, max, src } = f.range;
        if (typeof min !== 'number' || typeof max !== 'number' || min > max) problems.push(`${et}.${k}: range ${min}–${max}`);
        if (typeof src !== 'string' || !src.trim()) problems.push(`${et}.${k}: range without src`);
        if (!f.type.includes('number')) problems.push(`${et}.${k}: range on a non-number field`);
      }
    }
    for (const k of def.requiredInVanilla) if (!def.fields[k]) problems.push(`${et}: required field "${k}" is not in fields`);
    for (const [p, en] of Object.entries(def.enumFields || {})) if (!S.enums[en]) problems.push(`${et}.${p}: unknown enum ${en}`);
    if (!Array.isArray(def.arrays) || !def.arrays.length) problems.push(`${et}: arrays`);
  }
  assert.deepEqual(problems, []);
});

test('schema: no duplicates in field lists', () => {
  for (const k of ['guideKeys', 'rootFields', 'additionalCategoryFields']) assert.deepEqual(dups(S[k]), [], k);
  assert.deepEqual(dups(S.generalData.knownPaths), [], 'generalData.knownPaths');
  for (const [et, def] of Object.entries(S.entities)) assert.deepEqual(dups(def.knownSubPaths || []), [], `${et}.knownSubPaths`);
});

test('schema: every entity list is a known root field', () => {
  const root = new Set(S.rootFields);
  const missing = Object.values(S.entities).flatMap((d) => d.arrays).filter((a) => !root.has(a));
  assert.deepEqual(missing, []);
});

test('schema: every "lists" entry points to an existing enum', () => {
  for (const [k, l] of Object.entries(S.lists)) {
    const [head, name] = l.path.split('.');
    assert.equal(head, 'enums', k);
    assert.ok(S.enums[name], `${k} → ${l.path}`);
  }
});
