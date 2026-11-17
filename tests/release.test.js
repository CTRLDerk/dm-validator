/* Release consistency: the version in app.js matches the newest CHANGELOG entry, written in English and Dutch. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { read } = require('./helpers');

const changelog = read('CHANGELOG.md');
const entries = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\] — (\d{4}-\d{2}-\d{2})$/gm)].map((m) => ({ version: m[1], date: m[2], at: m.index }));

test('release: CHANGELOG has entries in the form "## [x.y.z] — YYYY-MM-DD"', () => {
  assert.ok(entries.length > 0);
});

test('release: TOOL_VERSION in app.js equals the newest CHANGELOG version', () => {
  const m = read('app.js').match(/const TOOL_VERSION = '(\d+\.\d+\.\d+)'/);
  assert.ok(m, 'TOOL_VERSION not found in app.js');
  assert.equal(m[1], entries[0].version, 'update TOOL_VERSION in app.js or add a CHANGELOG entry');
});

test('release: CHANGELOG versions go down from top to bottom', () => {
  const key = (v) => v.split('.').map((n) => n.padStart(5, '0')).join('.');
  for (let i = 1; i < entries.length; i++) assert.ok(key(entries[i - 1].version) > key(entries[i].version), `${entries[i - 1].version} before ${entries[i].version}`);
});

test('release: every CHANGELOG entry has an English and a Dutch section', () => {
  const missing = [];
  entries.forEach((e, i) => {
    const body = changelog.slice(e.at, i + 1 < entries.length ? entries[i + 1].at : undefined);
    if (!/^### English$/m.test(body) || !/^### Nederlands$/m.test(body)) missing.push(e.version);
  });
  assert.deepEqual(missing, []);
});
