/* Schema integrity: the single source of truth must be well-formed. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSchema } = require('./helpers');

const S = loadSchema();
const dups = (a) => a.filter((v, i) => a.indexOf(v) !== i);

test('schema states its own version and the game version', () => {
  assert.match(S.schemaVersion, /^\d+\.\d+\.\d+$/);
  assert.equal(typeof S.gameVersion, 'string');
});

test('every enum has canonical values, a severity and a source', () => {
  for (const [k, e] of Object.entries(S.enums)) {
    assert.ok(Array.isArray(e.canonical) && e.canonical.length > 0, k + ': canonical');
    assert.ok(['error', 'warning'].includes(e.unknown), k + ': unknown');
    assert.ok(e.src, k + ': src');
    assert.deepEqual(dups(e.canonical), [], k + ': duplicate values');
  }
});

test('every entity field has a known type; every range has min <= max and a source', () => {
  const TYPES = ['number', 'string', 'boolean', 'array', 'object', 'null'];
  for (const [et, def] of Object.entries(S.entities)) {
    assert.ok(def.arrays.length > 0, et + ': arrays');
    for (const [f, d] of Object.entries(def.fields)) {
      assert.ok(d.type.length && d.type.every(t => TYPES.includes(t)), `${et}.${f}: type ${d.type}`);
      if (d.range) {
        assert.ok(d.range.min <= d.range.max, `${et}.${f}: range`);
        assert.ok(d.range.src, `${et}.${f}: range source`);
      }
    }
    for (const k of def.requiredInVanilla) assert.ok(k in def.fields, `${et}: required ${k} is not a field`);
  }
});

test('known path lists have no duplicates', () => {
  assert.deepEqual(dups(S.generalData.knownPaths), []);
  for (const [et, def] of Object.entries(S.entities)) assert.deepEqual(dups(def.knownSubPaths), [], et);
});

test('each known generalData path has its parent listed', () => {
  const known = new Set(S.generalData.knownPaths);
  const orphan = S.generalData.knownPaths.filter(p => p.includes('.') && !known.has(p.slice(0, p.lastIndexOf('.'))));
  assert.deepEqual(orphan, []);
});

test('sources referenced by name exist', () => {
  assert.ok(['guide', 'vanilla'].every(k => k in S.sources));
});
