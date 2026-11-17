/* Shared helpers for the DM Validator tests. No dependencies: Node's built-in test runner only. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DMV = require(path.join(ROOT, 'engine.js'));
const SCHEMA_FILE = path.join(ROOT, 'schema', 'dm-0.7.json');
const S = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
const LANGS = ['en', 'nl', 'fr', 'de'];
const I18N = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', l + '.json'), 'utf8'))]));

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* Runs the check exactly as worker.js does. Returns { syntax } or { msgs, variants, images }. */
function check(text) {
  const idx = DMV.lineIndex(text);
  let doc;
  try {
    doc = DMV.parse(text);
  } catch (err) {
    if (err instanceof DMV.SyntaxIssue) return { syntax: { code: err.code, line: err.line, col: err.col } };
    throw err;
  }
  return DMV.resolve(DMV.validate(doc, S), idx);
}

const checkDoc = (doc) => check(JSON.stringify(doc, null, 2));

/* A fresh copy of tests/fixtures/base.json: a small mod that gives no messages. */
const base = () => JSON.parse(read('tests/fixtures/base.json'));

/* Counts per "severity CODE", sorted, for snapshots. */
function counts(res) {
  if (res.syntax) return { syntax: res.syntax };
  const c = {};
  for (const m of res.msgs) c[m.sev + ' ' + m.code] = (c[m.sev + ' ' + m.code] || 0) + 1;
  return { messages: Object.fromEntries(Object.entries(c).sort()), variants: res.variants.length };
}

/* All rule codes the engine can emit, read from the source so a new code cannot be forgotten. */
function engineCodes() {
  const src = read('engine.js');
  return [...new Set(src.match(/'(?:[A-Z]+)-\d{3}'/g).map((s) => s.slice(1, -1)))].sort();
}

/* All message templates (tpl) the engine can emit. */
function engineTemplates() {
  const src = read('engine.js');
  return [...new Set([...src.matchAll(/tpl: '([A-Za-z]+)'/g)].map((m) => m[1]))].sort();
}

module.exports = { ROOT, DMV, S, SCHEMA_FILE, LANGS, I18N, read, check, checkDoc, base, counts, engineCodes, engineTemplates };
