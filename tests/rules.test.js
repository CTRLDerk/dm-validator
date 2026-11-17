/* Schema and reference checks: one small mod per rule code. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { check, codes, byCode, minimalMod } = require('./helpers');

const issues = (res) => res.msgs.filter(m => m.sev !== 'info');
const one = (res, code) => { const m = byCode(res, code); assert.equal(m.length, 1, `expected one ${code}, got ${JSON.stringify(codes(res))}`); return m[0]; };

test('minimal mod: no errors or warnings', () => {
  assert.deepEqual(issues(check(minimalMod())), []);
});

test('not a mod: top level is an array', () => {
  const m = one(check('[1, 2]'), 'TYPE-001');
  assert.equal(m.tpl, 'notAMod');
  assert.equal(m.sev, 'error');
});

test('ENUM-002 unknown driving style is an error', () => {
  const mod = minimalMod(); mod.titularDrivers[0].drivingStyles = ['Aggressive Driver'];
  const m = one(check(mod), 'ENUM-002');
  assert.equal(m.sev, 'error');
  assert.equal(m.path, 'titularDrivers[0].drivingStyles[0]');
});

test('ENUM-002 driving styles are case-sensitive (schema: caseTolerant false)', () => {
  const mod = minimalMod(); mod.titularDrivers[0].drivingStyles = ['Aggressive'];
  assert.equal(one(check(mod), 'ENUM-002').sev, 'error');
});

test('VAR: accepted alternative spelling is a variant, not an issue', () => {
  const mod = minimalMod(); mod.sponsors[0].bonusType = 'GP_WIN';
  const res = check(mod);
  assert.deepEqual(issues(res), []);
  assert.equal(res.variants.length, 1);
  assert.equal(res.variants[0].enumKey, 'bonusType');
});

test('ENUM-004 unknown sponsor category is an error', () => {
  const mod = minimalMod(); mod.sponsors[0].category = 'Energy Drinks';
  assert.equal(one(check(mod), 'ENUM-004').sev, 'error');
});

test('ENUM-005 unknown bonus type is an error', () => {
  const mod = minimalMod(); mod.sponsors[0].bonusType = 'fastestLap';
  assert.equal(one(check(mod), 'ENUM-005').sev, 'error');
});

test('ENUM-003 unknown characteristic is a warning', () => {
  const mod = minimalMod(); mod.titularDrivers[0].characteristics = ['pay_driver'];
  assert.equal(one(check(mod), 'ENUM-003').sev, 'warning');
});

test('FIELD-001 unknown field on an entity', () => {
  const mod = minimalMod(); mod.titularDrivers[0].drivingstyles = ['aggressive'];
  const m = one(check(mod), 'FIELD-001');
  assert.equal(m.sev, 'warning');
  assert.equal(m.field, 'drivingstyles');
});

test('FIELD-001 unknown field in generalData and at the root', () => {
  const mod = minimalMod(); mod.generalData.startYearr = 2026; mod.modname = 'x';
  assert.equal(byCode(check(mod), 'FIELD-001').length, 2);
});

test('TYPE-001 number written as text', () => {
  const mod = minimalMod(); mod.titularDrivers[0].level = '7';
  const m = one(check(mod), 'TYPE-001');
  assert.equal(m.sev, 'warning');
  assert.equal(m.apply, true);
});

test('TYPE-002 wrong type', () => {
  const mod = minimalMod(); mod.titularDrivers[0].level = [7];
  assert.equal(one(check(mod), 'TYPE-002').sev, 'warning');
});

test('TYPE-002 entity list that is not an array is an error', () => {
  const mod = minimalMod(); mod.teams = { id: 1 };
  assert.equal(one(check(mod), 'TYPE-002').sev, 'error');
});

test('RANGE-001 value outside the editor range is info', () => {
  const mod = minimalMod(); mod.titularDrivers[0].level = 11;
  const m = one(check(mod), 'RANGE-001');
  assert.equal(m.sev, 'info');
  assert.match(m.vars.src, /guide/);
});

test('MISS-001 missing fields are info only', () => {
  const res = check(minimalMod());
  assert.ok(byCode(res, 'MISS-001').length > 0);
  assert.ok(byCode(res, 'MISS-001').every(m => m.sev === 'info'));
});

test('DUP-001 duplicate key in one object', () => {
  const text = JSON.stringify(minimalMod()).replace('"level":5', '"level":5,"level":6');
  assert.equal(one(check(text), 'DUP-001').sev, 'warning');
});

test('REF-001 driver teamId that does not exist is an error', () => {
  const mod = minimalMod(); mod.titularDrivers[0].teamId = 99;
  const m = one(check(mod), 'REF-001');
  assert.equal(m.sev, 'error');
  assert.equal(m.path, 'titularDrivers[0].teamId');
});

test('REF-001 none values (null, -1) are not references', () => {
  for (const v of [null, -1]) {
    const mod = minimalMod(); mod.titularDrivers[0].teamId = v;
    assert.deepEqual(byCode(check(mod), 'REF-001'), [], `teamId ${v}`);
  }
});

test('DUP-002 same driver ID twice is an error', () => {
  const mod = minimalMod(); mod.reserveDrivers = [{ id: 10, name: 'Other' }];
  assert.equal(one(check(mod), 'DUP-002').sev, 'error');
});

test('DUP-002 driver IDs are shared across additional categories', () => {
  const mod = minimalMod();
  mod.additionalCategories = [{ name: 'Cat 2', data: { titularDrivers: [{ id: 10, name: 'Other' }] } }];
  assert.equal(byCode(check(mod), 'DUP-002').length, 1);
});

test('DUP-003 same driver name with another ID is a warning', () => {
  const mod = minimalMod(); mod.freeDrivers = [{ id: 11, name: 'Driver Ten' }];
  assert.equal(one(check(mod), 'DUP-003').sev, 'warning');
});

test('additional categories are checked like the main category', () => {
  const mod = minimalMod();
  mod.additionalCategories = [{ name: 'Cat 2', data: { titularDrivers: [{ id: 20, name: 'X', drivingStyles: ['nope'] }], general: { bogus: 1 } } }];
  const res = check(mod);
  assert.equal(byCode(res, 'ENUM-002').length, 1);
  assert.equal(byCode(res, 'FIELD-001').length, 1);
  assert.equal(byCode(res, 'ENUM-002')[0].entity, 'X · Cat 2');
});

test('every message has a line number and a path', () => {
  const mod = minimalMod();
  mod.titularDrivers[0].level = '7'; mod.titularDrivers[0].teamId = 99; mod.sponsors[0].category = 'x';
  for (const m of check(mod).msgs) {
    assert.ok(Number.isInteger(m.line) && m.line >= 1, `${m.code} has no line`);
    assert.equal(typeof m.path, 'string');
  }
});

test('images: entries without an image are listed as a tip', () => {
  const res = check(minimalMod());
  assert.ok(res.images && typeof res.images === 'object');
});
