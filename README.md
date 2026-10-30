# DM Validator

**A JSON debugger for Delta Manager mods.** Drop in a `slot_N.json` and see straight away whether the file is valid and where it breaks the rules of the game.

👉 **Open the tool:** https://ctrlderk.github.io/dm-validator/

Your file never leaves your computer: everything runs in your browser.

## What it checks

| Severity | Check | Example |
|---|---|---|
| 🔴 Error | Invalid JSON, with line and column | comma after the last item, `//` comment, file cut off, `...` left by an AI |
| 🔴 Error | Value that does not exist | driving style `"Aggressive"`, sponsor category `"Energy Drinks"` |
| 🔴 Error | Reference to a team or driver that does not exist, or the same ID used twice | `teamId: 99` while there is no team 99 |
| 🟠 Warning | Other broken references | a team sponsor contract with a `sponsorId` that does not exist |
| 🟠 Warning | Unknown field (the game ignores it) | `drivingstyles` instead of `drivingStyles` |
| 🟠 Warning | Wrong type | `"level": "7"` (text) instead of `7` |
| 🟠 Warning | Unknown characteristic | `"pay_driver"` |
| 🔵 Info | Value outside the editor range | `prestige: 7` (range 1–5) |
| 🔵 Info | Field missing (the game uses its default) | `retirementAgeMin` |

Alternative spellings that the game accepts (for example `Points` and `points`, or `Boissons` and `boissons`) are summarised in one line. The vanilla databases use them too.

The validator never changes your file.

## Exports

- **Copy for Discord**: one line per issue (line · code · type · current value), coloured, always under 2000 characters.
- **.txt**, **.csv** (Excel) and **.json** reports.
- **AI prompt** (English): paste it into your AI together with the mod file. The AI asks you before it changes any value, suggests options only from the allowed lists, and edits only the reported paths.

## Languages

English, Nederlands, Français, Deutsch. Field names and values are never translated. Every message has a fixed code (for example `ENUM-004`), so a report is easy to recognise in any language.

## Where the rules come from

The schema (`schema/dm-0.7.json`) is built from:

1. the official Delta Manager modding guide, published by the developer;
2. the vanilla 1995, 2025 and 2026 databases saved from the game editor;
3. field names seen in editor-saved community mods.

Each range and list states its source. When the game is updated, only the schema changes.

## Files

```
index.html          page
app.js              interface
engine.js           JSON parser with line numbers + checks
worker.js           runs the check in the background
schema/dm-0.7.json  fields, types, ranges and allowed values (Delta Manager 0.7)
i18n/*.json         interface texts (EN, NL, FR, DE)
```

## Feedback

Found a false alarm or a missed problem? Open an issue on GitHub or post in the Delta Manager Discord, with the copied Discord report.

## Licence

MIT. This is a community tool and is not affiliated with the developers of Delta Manager.
