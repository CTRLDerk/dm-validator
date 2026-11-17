/* Browser smoke test: the real page (index.html + app.js + worker.js + i18n) in Chromium.
   Needs Playwright:  npm run test:browser   (CI installs it; locally: npm i --no-save playwright && npx playwright install chromium)
   GoatCounter is blocked, so test runs never count as usage. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { /* skipped below */ }

const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

function serve() {
  const server = http.createServer((req, res) => {
    const p = path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^([/\\])+/, '');
    const file = path.join(ROOT, p || 'index.html');
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

test('browser smoke test', { skip: !chromium && 'playwright is not installed' }, async (t) => {
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route(/goatcounter|gc\.zgo\.at/, (r) => r.abort());
  await page.route((u) => !u.href.startsWith(url), (r) => r.abort()); // nothing leaves the machine
  const errorsNow = () => errors.filter((e) => !/ERR_FAILED|net::/.test(e));

  const load = async (name, text) => {
    await page.goto(url);
    await page.setInputFiles('#file', { name, mimeType: 'application/json', buffer: Buffer.from(text) });
  };
  const base = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'base.json'), 'utf8');

  try {
    await t.test('clean file shows "no issues"', async () => {
      await load('slot_1.json', base);
      await page.waitForSelector('.ok', { timeout: 10000 });
    });

    await t.test('broken value shows its rule code', async () => {
      const doc = JSON.parse(base); doc.sponsors[0].category = 'Energy Drinks';
      await load('slot_1.json', JSON.stringify(doc, null, 2));
      await page.waitForSelector('#msgs', { timeout: 10000 });
      assert.match(await page.textContent('#msgs'), /ENUM-004/);
    });

    await t.test('invalid JSON shows line and code', async () => {
      await load('slot_1.json', '{\n  "a": 1,\n}');
      await page.waitForFunction(() => /JSON-001/.test(document.body.innerText), null, { timeout: 10000 });
    });

    await t.test('every language loads without errors', async () => {
      await load('slot_1.json', base);
      await page.waitForSelector('.ok', { timeout: 10000 });
      for (const lang of ['nl', 'fr', 'de', 'en']) {
        await page.selectOption('#lang', lang);
        assert.doesNotMatch(await page.innerText('body'), /\b(ui|msg|rules|syntax)\.[A-Za-z]+\b/, `untranslated key visible in ${lang}`);
      }
    });

    await t.test('no script errors on the page', () => {
      assert.deepEqual(errorsNow(), []);
    });
  } finally {
    await browser.close();
    server.close();
  }
});
