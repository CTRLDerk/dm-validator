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

## Questions

Ask in the Delta Manager Discord or open a discussion in an issue.
