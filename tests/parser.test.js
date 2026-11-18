/* Syntax errors: every JSON-xxx code with the line and column the user sees. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { syntax, E } = require('./helpers');

const CASES = [
  ['JSON-001', 'trailing comma in object', '{\n "a": 1,\n}', 3, 1],
  ['JSON-001', 'trailing comma in array', '{"a": [1, 2,]}', 1, 13],
  ['JSON-002', '// comment', '{\n // note\n "a": 1}', 2, 2],
  ['JSON-002', '/* comment */', '{"a": /* x */ 1}', 1, 7],
  ['JSON-003', 'missing comma between fields', '{"a": 1\n "b": 2}', 2, 2],
  ['JSON-003', 'missing comma in array', '[1 2]', 1, 4],
  ['JSON-004', 'file cut off', '{"a": [1, 2', null, null],
  ['JSON-004', 'unterminated string', '{"a": "abc', null, null],
  ['JSON-005', 'newline inside text', '{"a": "ab\ncd"}', 1, 10],
  ['JSON-005', 'invalid escape', '{"a": "\\q"}', 1, 8],
  ['JSON-006', 'three dots left by an AI', '{"a": [1, ...]}', 1, 11],
  ['JSON-006', 'ellipsis character', '{"a": [1, …]}', 1, 11],
  ['JSON-007', 'NaN', '{"a": NaN}', 1, 7],
  ['JSON-007', 'undefined', '{"a": undefined}', 1, 7],
  ['JSON-008', 'single-quoted value', "{\"a\": 'x'}", 1, 7],
  ['JSON-008', 'single-quoted key', "{'a': 1}", 1, 2],
  ['JSON-009', 'unquoted key', '{a: 1}', 1, 2]
];

for (const [code, name, text, line, col] of CASES) {
  test(`${code}: ${name}`, () => {
    const e = syntax(text);
    assert.ok(e, 'expected a syntax error');
    assert.equal(e.code, code);
    if (line !== null) { assert.equal(e.line, line, 'line'); assert.equal(e.col, col, 'column'); }
  });
}

test('valid JSON parses to the same value as JSON.parse', () => {
  const text = '﻿{"a": [1, -2.5e3, true, false, null, "x\\u00e9\\n"], "b": {"c": {}}}';
  assert.deepEqual(JSON.parse(JSON.stringify(E.parse(text))), JSON.parse(text.slice(1)));
});

test('duplicate keys are kept for DUP-001 (last value wins)', () => {
  const doc = E.parse('{"a": 1, "a": 2}');
  assert.equal(doc.a, 2);
  assert.ok(doc.__dup && doc.__dup.length === 1);
});

test('lineIndex/lc map offsets to 1-based line and column', () => {
  const text = 'ab\ncd\n\nef';
  const idx = E.lineIndex(text);
  assert.deepEqual(E.lc(idx, 0), { line: 1, col: 1 });
  assert.deepEqual(E.lc(idx, 4), { line: 2, col: 2 });
  assert.deepEqual(E.lc(idx, 7), { line: 4, col: 1 });
});

test('large file parses in reasonable time', () => {
  const big = JSON.stringify({ titularDrivers: Array.from({ length: 20000 }, (_, i) => ({ id: i, name: 'D' + i, level: 5 })) }, null, 1);
  const t0 = Date.now();
  E.parse(big);
  assert.ok(Date.now() - t0 < 3000, 'parse took too long');
});
