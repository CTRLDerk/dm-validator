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
- Run the tool locally before opening a pull request. Because it uses a Web Worker, open it through a local web server (for example `python -m http.server`) rather than by double-clicking `index.html`.
- Describe what you tested.

## Questions

Ask in the Delta Manager Discord or open a discussion in an issue.
