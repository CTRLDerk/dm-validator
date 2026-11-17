/* Content rules: one small change to the clean base mod per case, and the exact message it must give. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { checkDoc, base, engineCodes } = require('./helpers');

const find = (res, code, path) => res.msgs.filter((m) => m.code === code && (path === undefined || m.path === path));

test('base fixture gives no messages and no variants', () => {
  const r = checkDoc(base());
  assert.equal(r.syntax, undefined);
  assert.deepEqual(r.msgs.map((m) => m.code + ' ' + m.path), []);
  assert.equal(r.variants.length, 0);
});

// [name, mutate(doc), sev, code, path]
const CASES = [
  // values that do not exist
  ['unknown driving style', (d) => { d.titularDrivers[0].drivingStyles = ['Aggressive_X']; }, 'error', 'ENUM-002', 'titularDrivers[0].drivingStyles[0]'],
  ['unknown characteristic', (d) => { d.titularDrivers[0].characteristics = ['pay_driver']; }, 'warning', 'ENUM-003', 'titularDrivers[0].characteristics[0]'],
  ['unknown sponsor category', (d) => { d.sponsors[0].category = 'Energy Drinks'; }, 'error', 'ENUM-004', 'sponsors[0].category'],
  ['unknown bonus type in team contract', (d) => { d.teams[0].sponsors[0].bonusType = 'fastestLap'; }, 'error', 'ENUM-005', 'teams[0].sponsors[0].bonusType'],
  ['unknown sex', (d) => { d.titularDrivers[0].sex = 'X'; }, 'error', 'ENUM-001', 'titularDrivers[0].sex'],
  // fields and types
  ['unknown field on a driver', (d) => { d.titularDrivers[0].drivingstyles = []; }, 'warning', 'FIELD-001', 'titularDrivers[0].drivingstyles'],
  ['unknown field at the root', (d) => { d.myNotes = 'x'; }, 'warning', 'FIELD-001', 'myNotes'],
  ['number written as text', (d) => { d.titularDrivers[0].level = '7'; }, 'warning', 'TYPE-001', 'titularDrivers[0].level'],
  ['wrong type', (d) => { d.titularDrivers[0].injured = 'no'; }, 'warning', 'TYPE-002', 'titularDrivers[0].injured'],
  ['entry that is not an object', (d) => { d.sponsors.push('Testbank'); }, 'error', 'TYPE-001', 'sponsors[1]'],
  ['list that is not an array', (d) => { d.staff = {}; }, 'error', 'TYPE-002', 'staff'],
  ['value outside the editor range', (d) => { d.sponsors[0].prestige = 7; }, 'info', 'RANGE-001', 'sponsors[0].prestige'],
  ['missing field', (d) => { delete d.titularDrivers[0].formeAnnuel; }, 'info', 'MISS-001', 'titularDrivers[0]'],
  // references and duplicates
  ['driver teamId to a team that does not exist', (d) => { d.titularDrivers[0].teamId = 99; }, 'error', 'REF-001', 'titularDrivers[0].teamId'],
  ['team pilot that does not exist', (d) => { d.teams[0].pilots = [1, 42]; }, 'error', 'REF-001', 'teams[0].pilots[1]'],
  ['team sponsor contract to a sponsor that does not exist', (d) => { d.teams[0].sponsors[0].sponsorId = 999; }, 'warning', 'REF-001', 'teams[0].sponsors[0].sponsorId'],
  ['team engine that does not exist', (d) => { d.teams[0].engine = 'Other motor'; }, 'warning', 'REF-001', 'teams[0].engine'],
  ['driver relation to a driver that does not exist', (d) => { d.titularDrivers[0].relations = { 77: 5 }; }, 'info', 'REF-001', 'titularDrivers[0].relations.77'],
  ['same ID used twice', (d) => { d.titularDrivers[1].id = 1; }, 'error', 'DUP-002', 'titularDrivers[1].id'],
  ['same driver entered twice', (d) => { d.freeDrivers.push({ ...d.titularDrivers[0], id: 3, teamId: null }); }, 'warning', 'DUP-003', 'freeDrivers[0].name']
];

for (const [name, mutate, sev, code, path] of CASES) {
  test(`rule: ${name} → ${sev} ${code}`, () => {
    const doc = base(); mutate(doc);
    const r = checkDoc(doc);
    const hits = find(r, code, path);
    assert.equal(hits.length, 1, `expected one ${code} at ${path}; got: ${r.msgs.map((m) => m.code + ' ' + m.path).join(', ') || 'nothing'}`);
    assert.equal(hits[0].sev, sev);
    assert.ok(Number.isInteger(hits[0].line) && hits[0].line > 0, 'message has a line number');
  });
}

test('rule: a key written twice in one object → warning DUP-001', () => {
  const { check } = require('./helpers');
  const text = JSON.stringify(base(), null, 2).replace('"age": 25,', '"age": 25,\n      "age": 26,');
  const r = check(text);
  const hits = find(r, 'DUP-001', 'titularDrivers[0].age');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].sev, 'warning');
});

test('rule: alternative spelling accepted by the game is a variant, not a message', () => {
  const doc = base(); doc.teams[0].sponsors[0].bonusType = 'PODIUM';
  const r = checkDoc(doc);
  assert.deepEqual(r.msgs, []);
  assert.equal(r.variants.length, 1);
  assert.equal(r.variants[0].value, 'PODIUM');
});

test('rule: "none" references (null, -1) are not reported', () => {
  const doc = base();
  doc.titularDrivers[0].teamId = null; doc.titularDrivers[1].academyId = -1; doc.teams[0].engineId = -1;
  doc.teams[0].pilots = [];
  assert.deepEqual(checkDoc(doc).msgs.map((m) => m.code + ' ' + m.path), []);
});

test('rule: a file that is not an object → error TYPE-001 notAMod', () => {
  const r = checkDoc([1, 2]);
  assert.equal(r.msgs.length, 1);
  assert.equal(r.msgs[0].tpl, 'notAMod');
});

test('rule: images without a path are listed as a tip, not as a message', () => {
  const doc = base(); delete doc.titularDrivers[0].image;
  const r = checkDoc(doc);
  assert.deepEqual(r.msgs, []);
  assert.equal(r.images.drivers.missing.length, 1);
});

test('coverage: every rule code in engine.js has a test case', () => {
  const tested = new Set(CASES.map((c) => c[3]).concat('DUP-001'));
  const missing = engineCodes().filter((c) => !c.startsWith('JSON-') && !tested.has(c));
  assert.deepEqual(missing, [], 'add a case to tests/rules.test.js for: ' + missing.join(', '));
});
