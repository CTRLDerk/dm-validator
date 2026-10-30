# Delta Manager Modding Tools — Roadmap

A free, browser-based toolkit for Delta Manager modders, hosted on GitHub Pages.
No installation, no account, and no uploads: every file is processed locally in the modder's own browser.

**Target game version:** Delta Manager 0.7
**Status:** Phase 1 released (v0.1.0)

---

## Why

Mods are getting bigger, and more modders edit their `slot_N.json` files by hand or with AI tools that have no guidelines.
One wrong field name, an invented trait or a misspelled sponsor category can make a mod unplayable, and the game usually gives no clear error.
These tools catch those problems before a mod is published, and help with the tasks that are hardest to get right by hand.

---

## Principles

| Principle | What it means |
|---|---|
| **Runs in the browser** | Files never leave the modder's PC. Nothing is sent to a server. |
| **Read before write** | Checking tools come first. Tools that change a file always show *old → new* and ask the modder to keep a backup. |
| **One source of truth** | A single schema file defines every field, type, range and allowed value. All tools use it. |
| **Evidence over formulas** | Calculations are marked *confirmed* only after an in-game test. Untested results are shown as *predicted*. |
| **Versioned against the game** | Every report states which game version it was checked against. A game update means updating the schema, not the code. |
| **Four languages** | English, Dutch, French and German. Field names, keys and values are never translated. |

---

## Architecture

```
dm-modding-tools/                 (GitHub Pages site)
├── index.html                    Start page, one tab per tool
├── schema/
│   └── dm-0.7.json               Fields, types, min/max, allowed values per game version
├── engine/
│   └── tyres-fuel.js             Shared formulas: tyre life, pit trigger, fuel range, tyre sets
├── i18n/
│   ├── en.json                   Base language (fallback)
│   ├── nl.json
│   ├── fr.json
│   └── de.json
├── tools/
│   ├── validator/
│   ├── relations/
│   ├── track-calibrator/
│   ├── track-tool/
│   └── stage-calibrator/
├── README.md
├── CHANGELOG.md
└── LICENSE                       MIT
```

Every message has a fixed **rule code** (e.g. `ENUM-002`, `FIELD-001`), so a report pasted on Discord can be understood whatever language it was generated in.

---

## Phases

### Phase 0 — Foundation ✅
- GitHub repository and GitHub Pages setup
- Schema `dm-0.7.json`, built from the official modding guide, the vanilla 1995/2025/2026 databases and editor-saved community mods
- Language files (EN/NL/FR/DE) and the rule-code system
- Shared calculation engine for tyres and fuel

**Done when:** the schema covers every field found in both reference mods, and every difference between the guide and real files has been resolved or marked.

### Phase 1 — Validator v1 (JSON debugger) ✅
Drag in a `slot_N.json` file and get a report per section (teams, drivers, sponsors, circuits, AI).

| Severity | Check | Example |
|---|---|---|
| 🔴 Error | Invalid JSON (with line and column) | Trailing comma, `//` comment, truncated file |
| 🔴 Error | Driving style that doesn't exist | `"Aggressive"` is not an allowed value |
| 🟠 Warning | Characteristic that doesn't exist (vanilla also has free-text traits) | `"pay_driver"` is not an allowed value |
| 🔴 Error | Sponsor category that doesn't exist | `"Energy Drinks"` → not in the list |
| 🟠 Warning | Unknown field (ignored by the game) | `drivingstyles` is not a known field |
| 🟠 Warning | Wrong type | `"level": "7"` (text) instead of `7` |
| 🔵 Info | Value outside min/max | `prestige: 7` (range 1–5) |
| 🔵 Info | Missing field (game uses the default) | `retirementAgeMin` missing |

- No guessing: every message states what is wrong and links to the list of allowed values.
- Alternative spellings that the game accepts (other case, language or older form, as used in the vanilla data) are summarised in one collapsible line, not listed as issues.
- Exports: Discord (max. 2000 characters), .txt, .csv, .json and an English AI prompt that asks the user before changing values.
- Export the report as `.txt` for bug reports.
- Read-only: the validator never changes a file.

### Phase 2 — Validator v1.1
- **References:** does every driver's `teamId` point to an existing team? Duplicate IDs? ✅ (v0.2.0)
- **Image paths:** warn when a portrait, logo or flag points to a file on one specific computer instead of the game's resources folder. Only the JSON is checked; no local files are read. ✅ (v0.3.0)
- **Track check** (read-only), shows what the AI will do with the current settings:
  - fuel range shorter than tyre life → fuel decides the stops
  - more tyre sets needed than available
  - planned stint longer than `maxStint`
  - tyre wear at its floor → tyres last longer than intended

### Phase 3 — Relations generator
Generates driver ↔ driver and driver ↔ team relations from game data:
driving-style match with the team's car concept, shared styles between teammates, title rivalry between drivers of similar level, pay-driver status and engine brand.
Existing hand-set values are kept. A report explains every value.

### Phase 4 — Track calibrator
Calculates tyre wear (`w`), fuel consumption (`f`), tyre sets and `avgSpeed` per circuit for a target strategy.

| Mode | Target stint | For |
|---|---|---|
| **Number of stops** | `laps / (stops + 1)` | Formula, sprint races |
| **Endurance** | Limited by `maxStint` and fuel range | WEC, GT |
| **Free** | Set by the modder | Everything else |

- Writes changes only after showing *old → new*.
- Optional race analysis: paste the in-game race summary to measure real tyre wear and refine the calculation (English summaries only, to be confirmed).
- **Required before release:** an in-game test on a road course (endurance mode) to confirm the formulas outside ovals. Until then, results for non-oval circuits are marked *predicted*.

### Phase 5 — Stage calibrator
Aligns pit stops with stage ends and cautions for stage-based races (NASCAR-style).
Uses the same calculation engine as the track calibrator. The method is already confirmed in-game on ovals.

### Phase 6 — Track tool
Places a circuit layout over a background image and writes it in the editor's format: track points, sectors, braking zones, pit lane and camera.
Includes validation against the editor's rules (8–200 points, minimum point spacing, no self-intersections).

---

## Out of scope
- Icon / portrait generation
- AI-assistant skill files

---

## Open questions

| # | Question | Impact |
|---|---|---|
| 1 | Is the in-game race summary always in English, whatever the game language? | Whether race analysis works for every player |
| 2 | What does the game do with a value outside min/max: crash, clamp or ignore? | Wording of the *outside range* message |
| 3 | Stored labels for the party characteristics and "Hates the rain" | Completeness of the characteristic list |

---

## Feedback
Bugs and ideas are welcome via GitHub Issues or the Delta Manager Discord.
