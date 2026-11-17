# Contributing

Thanks for helping to improve DM Validator. The most useful help is telling us where the tool is wrong.

## Report a false alarm or a missed problem

Open an issue with the **Bug report** template and include:

1. the **Copy for Discord** report (or the .txt export);
2. what you expected instead;
3. if possible, a small part of the JSON around the line. Please do not attach someone else's mod without their permission.

If the game itself shows how it treats a value (for example, a sponsor bonus that is or is not paid), describe that test: in-game results are what decide the rules.

## Suggest a rule or an allowed value

Use the **Rule or value** template. Mention where the value comes from: the official modding guide (with the chapter), the vanilla databases or an in-game test.

## Translations

Interface texts are in `i18n/en.json`, `nl.json`, `fr.json` and `de.json`. Corrections from native speakers are very welcome. Keep the `{placeholders}` and never translate field names or values.

## Pull requests

- Keep each pull request small and about one thing.
- The schema (`schema/dm-0.7.json`) only contains information from the official modding guide, the vanilla databases, editor-saved mods or in-game tests. Do not add game logic taken from the game's code.
- Run `npm test` before opening a pull request (Node 22 or newer, no installs needed). GitHub runs the same tests and a browser smoke test on every push and pull request.
- Run the tool locally as well. Because it uses a Web Worker, open it through a local web server (`npm run serve`, or `python -m http.server`) rather than by double-clicking `index.html`.
- Describe what you tested.

## Tests

| Command | What it checks |
|---|---|
| `npm test` | JSON syntax messages with line and column, one case per rule code, the four language files (same keys and `{placeholders}`, a text for every code), the schema (types, ranges with a source, no duplicates) and the release (`TOOL_VERSION` equals the newest CHANGELOG entry, written in English and Nederlands). |
| `npm run test:browser` | The real page in Chromium: a clean file, a broken value, invalid JSON and all four languages, without script errors. Needs Playwright: `npm install --no-save playwright && npx playwright install chromium`. Usage counting is blocked during the test. |
| `npm run snapshot` | Rewrites `tests/snapshots/`: the number of messages per code for each file in `tests/fixtures/`. Run it only after an intended change, and explain the diff in the pull request. |

Adding a rule code? The tests fail until it has a case in `tests/rules.test.js` and a text in `i18n/*.json`.

## Changing the schema

1. Edit `schema/dm-0.7.json` (one line; edit it with a script, for example `node -e`, and write it back with `JSON.stringify(schema)`). Add only what the guide, the vanilla databases, an editor save or an in-game test shows, and name that source.
2. Add a small file to `tests/fixtures/` if the change is about a case no fixture covers yet.
3. `npm test`. The test *schemaVersion is raised when the schema changes* fails on purpose: a schema change is always part of a release.
4. `npm run snapshot` if results changed, and check the diff in `tests/snapshots/`: only the messages you meant to change may move.
5. Prepare the release (below).

## Releasing

```
npm run release -- 0.3.5          # or: node tools/release.js 0.3.5 --date 2026-12-01
```

This sets `TOOL_VERSION` in `app.js`, adds a CHANGELOG entry with an English and a Nederlands section, and raises `schemaVersion` (patch) when the schema changed since `tests/schema.lock`. Then replace the TODO lines in the CHANGELOG (the tests fail while they are there), run `npm test` and open the pull request. `npm run release:check` only reports what is out of date.

The site is served by GitHub Pages from the default branch, so a release is live as soon as the pull request is merged.

## A new game version

1. Copy `schema/dm-0.7.json` to `schema/dm-<version>.json` and update `gameVersion`; change `SCHEMA_URL` in `app.js` to the new file. The tests and the release script follow it.
2. Check the new guide and vanilla databases field by field, as in *Changing the schema*.
3. Save an empty mod with the new editor, add it to `tests/fixtures/`, and make sure it gives no unknown-field warnings.
4. Release as a minor version (for example 0.4.0).

## Questions

Ask in the Delta Manager Discord or open a discussion in an issue.
