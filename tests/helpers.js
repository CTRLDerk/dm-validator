/* Shared helpers for the DM Validator tests (node --test, no dependencies). */
'use strict';
const fs = require('fs');
const path = require('path');
const E = require('../engine.js');

const ROOT = path.join(__dirname, '..');
const SCHEMA_FILE = path.join(ROOT, 'schema', 'dm-0.7.json');
const LANGS = ['en', 'nl', 'fr', 'de'];

const loadSchema = () => JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
const loadLang = (l) => JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', l + '.json'), 'utf8'));

/** Run the full check like worker.js does. Accepts a JSON string or an object. */
function check(input, S = loadSchema()) {
  const text = typeof input === 'string' ? input : JSON.stringify(input, null, 1);
  const idx = E.lineIndex(text);
  return E.resolve(E.validate(E.parse(text), S), idx);
}

/** Parse only; returns the SyntaxIssue (code, line, col) or null. */
function syntax(text) {
  try { E.parse(text); return null; } catch (e) { if (e instanceof E.SyntaxIssue) return e; throw e; }
}

const codes = (res) => res.msgs.map(m => m.code);
const byCode = (res, code) => res.msgs.filter(m => m.code === code);

/** A small mod that the validator accepts without errors or warnings. */
function minimalMod() {
  return {
    modName: 'Test mod', author: 'tests', version: '1.0',
    teams: [{ id: 1, name: 'Team One' }],
    titularDrivers: [{ id: 10, name: 'Driver Ten', teamId: 1, drivingStyles: ['aggressive'], level: 5 }],
    sponsors: [{ id: 100, name: 'Sponsor', category: 'technologie', bonusType: 'win' }],
    generalData: { startYear: 2026 }
  };
}

module.exports = { E, ROOT, SCHEMA_FILE, LANGS, loadSchema, loadLang, check, syntax, codes, byCode, minimalMod };
