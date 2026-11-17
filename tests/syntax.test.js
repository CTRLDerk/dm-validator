/* Invalid JSON: every JSON-xxx code with the right line and column. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { check } = require('./helpers');

const CASES = [
  // [name, text, code, line, col]
  ['trailing comma in object', '{\n  "a": 1,\n}', 'JSON-001', 3, 1],
  ['trailing comma in array', '{"a": [1, 2,]}', 'JSON-001', 1, 13],
  ['line comment', '{\n  // note\n  "a": 1\n}', 'JSON-002', 2, 3],
  ['block comment', '{ /* x */ "a": 1 }', 'JSON-002', 1, 3],
  ['missing comma between fields', '{\n  "a": 1\n  "b": 2\n}', 'JSON-003', 3, 3],
  ['missing comma in array', '[1 2]', 'JSON-003', 1, 4],
  ['file cut off', '{"a": [1, 2', 'JSON-004', 1, 12],
  ['unterminated text', '{"a": "abc', 'JSON-004', 1, 11],
  ['empty file', '', 'JSON-004', 1, 1],
  ['newline inside text', '{"a": "ab\ncd"}', 'JSON-005', 1, 10],
  ['invalid escape', '{"a": "\\x"}', 'JSON-005', 1, 8],
  ['extra content after the end', '{} {}', 'JSON-005', 1, 4],
  ['ellipsis left by an AI', '{"teams": [ ... ]}', 'JSON-006', 1, 13],
  ['unicode ellipsis', '{"teams": […]}', 'JSON-006', 1, 12],
  ['NaN', '{"a": NaN}', 'JSON-007', 1, 7],
  ['undefined', '{"a": undefined}', 'JSON-007', 1, 7],
  ['single-quoted value', "{\"a\": 'x'}", 'JSON-008', 1, 7],
  ['single-quoted key', "{'a': 1}", 'JSON-008', 1, 2],
  ['unquoted key', '{a: 1}', 'JSON-009', 1, 2]
];

for (const [name, text, code, line, col] of CASES) {
  test(`syntax: ${name} → ${code}`, () => {
    const r = check(text);
    assert.ok(r.syntax, 'expected a syntax issue, got a parsed file');
    assert.deepEqual(r.syntax, { code, line, col });
  });
}

test('syntax: BOM at the start is accepted', () => {
  const r = check('﻿{"modName": "x"}');
  assert.equal(r.syntax, undefined);
});

test('syntax: valid JSON with escapes parses to the same value as JSON.parse', () => {
  const text = '{"a": "q\\"\\\\\\/\\b\\f\\n\\r\\t\\u00e9", "b": [1, -2.5e3, true, false, null], "c": {}}';
  const { DMV } = require('./helpers');
  assert.deepEqual(JSON.parse(JSON.stringify(DMV.parse(text))), JSON.parse(text));
});
