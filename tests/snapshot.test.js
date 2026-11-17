/* Regression snapshots: the number of messages per severity and code for every file in tests/fixtures/.
   A change to the schema or engine that changes a result shows up as a diff in tests/snapshots/.
   Update after an intended change:  npm run snapshot   (then review and commit the diff). */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { ROOT, check, counts } = require('./helpers');

const FIX = path.join(ROOT, 'tests', 'fixtures');
const SNAP = path.join(ROOT, 'tests', 'snapshots');
const UPDATE = process.env.UPDATE_SNAPSHOTS === '1';

for (const f of fs.readdirSync(FIX).filter((n) => n.endsWith('.json')).sort()) {
  test(`snapshot: ${f}`, () => {
    const got = counts(check(fs.readFileSync(path.join(FIX, f), 'utf8')));
    const snapFile = path.join(SNAP, f);
    if (UPDATE || !fs.existsSync(snapFile)) {
      fs.mkdirSync(SNAP, { recursive: true });
      fs.writeFileSync(snapFile, JSON.stringify(got, null, 2) + '\n');
      if (!UPDATE) assert.fail(`new snapshot written: tests/snapshots/${f}. Review it, commit it and run the tests again.`);
      return;
    }
    assert.deepEqual(got, JSON.parse(fs.readFileSync(snapFile, 'utf8')), `result for ${f} changed. If intended: npm run snapshot`);
  });
}
