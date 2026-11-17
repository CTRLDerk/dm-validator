#!/usr/bin/env node
/* DM Validator release helper. One command prepares a release; nothing is committed or pushed.

     node tools/release.js 0.3.4              new tool version, today's date
     node tools/release.js 0.3.4 --date 2026-11-20
     node tools/release.js --check            only report what is out of date (exit code 1 if anything is)

   What it does:
   1. sets TOOL_VERSION in app.js;
   2. adds a CHANGELOG entry at the top with an English and a Nederlands section (TODO lines to fill in;
      npm test fails until they are replaced);
   3. if the schema (the file named by SCHEMA_URL in app.js) changed since tests/schema.lock was written: raises schemaVersion (patch)
      and writes the lock again.
   Then run npm test, fill in the CHANGELOG and commit. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const P = {
  app: path.join(ROOT, 'app.js'),
  changelog: path.join(ROOT, 'CHANGELOG.md'),
  schema: path.join(ROOT, fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8').match(/const SCHEMA_URL = new URL\('([^']+)'/)[1]),
  lock: path.join(ROOT, 'tests', 'schema.lock')
};
const SEMVER = /^\d+\.\d+\.\d+$/;

/* Hash of the schema content without schemaVersion, so raising the version does not change the hash. */
function schemaHash(text) {
  const s = JSON.parse(text); delete s.schemaVersion;
  return crypto.createHash('sha256').update(JSON.stringify(s)).digest('hex');
}
/* Writes the schema in its own compact one-line form (unchanged bytes for unchanged content). */
const writeSchema = (s) => fs.writeFileSync(P.schema, JSON.stringify(s));
const readLock = () => (fs.existsSync(P.lock) ? JSON.parse(fs.readFileSync(P.lock, 'utf8')) : null);
const writeLock = (s) => fs.writeFileSync(P.lock, JSON.stringify({ schemaVersion: s.schemaVersion, sha256: schemaHash(JSON.stringify(s)) }, null, 2) + '\n');
const toolVersion = () => (fs.readFileSync(P.app, 'utf8').match(/const TOOL_VERSION = '([^']+)'/) || [])[1];
const newestChangelog = () => (fs.readFileSync(P.changelog, 'utf8').match(/^## \[(\d+\.\d+\.\d+)\]/m) || [])[1];
const bumpPatch = (v) => v.split('.').map(Number).map((n, i) => (i === 2 ? n + 1 : n)).join('.');
const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };

function status() {
  const schemaText = fs.readFileSync(P.schema, 'utf8');
  const S = JSON.parse(schemaText), lock = readLock();
  return {
    tool: toolVersion(), changelog: newestChangelog(), schemaVersion: S.schemaVersion,
    schemaChanged: !lock || lock.sha256 !== schemaHash(schemaText),
    lockVersion: lock && lock.schemaVersion
  };
}

function main(argv) {
  const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  if (argv.includes('--check')) {
    const st = status(), problems = [];
    if (st.tool !== st.changelog) problems.push(`TOOL_VERSION ${st.tool} ≠ newest CHANGELOG ${st.changelog}`);
    if (st.schemaChanged) problems.push(`schema changed since schemaVersion ${st.lockVersion} (lock in tests/schema.lock)`);
    console.log(problems.length ? problems.map((p) => '✗ ' + p).join('\n') : `✓ tool ${st.tool}, schema ${st.schemaVersion}: up to date`);
    return problems.length ? 1 : 0;
  }

  const version = argv.find((a) => SEMVER.test(a));
  const date = opt('--date') || new Date().toISOString().slice(0, 10);
  if (!version) { console.error('Usage: node tools/release.js <x.y.z> [--date YYYY-MM-DD] | --check'); return 2; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.error('--date must be YYYY-MM-DD'); return 2; }
  const st = status();
  if (!newer(version, st.changelog)) { console.error(`${version} is not newer than the newest CHANGELOG version ${st.changelog}`); return 2; }

  // 1. app.js
  const app = fs.readFileSync(P.app, 'utf8');
  fs.writeFileSync(P.app, app.replace(/const TOOL_VERSION = '[^']+'/, `const TOOL_VERSION = '${version}'`));

  // 3. schema version + lock (before the CHANGELOG, so the entry can name the new schema version)
  let schemaLine = '';
  if (st.schemaChanged) {
    const S = JSON.parse(fs.readFileSync(P.schema, 'utf8'));
    if (st.lockVersion && S.schemaVersion === st.lockVersion) S.schemaVersion = bumpPatch(S.schemaVersion);
    writeSchema(S); writeLock(S);
    schemaLine = S.schemaVersion;
  }

  // 2. CHANGELOG
  const cl = fs.readFileSync(P.changelog, 'utf8');
  const en = schemaLine ? `- Schema ${schemaLine}: TODO what changed in the schema, with its source.\n` : '- TODO\n';
  const nl = schemaLine ? `- Schema ${schemaLine}: TODO wat er in het schema is veranderd, met de bron.\n` : '- TODO\n';
  const entry = `## [${version}] — ${date}\n\n### English\n${en}\n### Nederlands\n${nl}\n`;
  const at = cl.search(/^## \[/m);
  fs.writeFileSync(P.changelog, at < 0 ? cl + '\n' + entry : cl.slice(0, at) + entry + cl.slice(at));

  console.log(`app.js        TOOL_VERSION ${st.tool} → ${version}`);
  console.log(`CHANGELOG.md  new entry [${version}] — ${date} (replace the TODO lines)`);
  console.log(schemaLine ? `schema        schemaVersion ${st.schemaVersion} → ${schemaLine}, tests/schema.lock updated` : 'schema        unchanged');
  console.log('\nNext: fill in the CHANGELOG, run npm test, commit.');
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { schemaHash, status, main };
