# Changelog

## [0.3.1] — 2026-10-30

### English
- Removed the image path warning from 0.3.0: absolute paths are fine, because images are converted when the mod is uploaded to the Workshop.
- New tip instead: **No image assigned**. One collapsible line lists the leagues, teams, drivers, engines, sponsors, naming sponsors, staff and journalists without a picture. Click a name to find it in the structure. It is not counted as an issue and is not part of the Discord report or the AI prompt.

### Nederlands
- De waarschuwing over afbeeldingspaden uit 0.3.0 is verwijderd: absolute paden zijn prima, omdat afbeeldingen bij het uploaden naar de Workshop worden omgezet.
- Nieuwe tip in plaats daarvan: **Geen afbeelding toegewezen**. Eén uitklapbare regel toont de competities, teams, coureurs, motoren, sponsors, titelsponsors, stafleden en journalisten zonder afbeelding. Klik op een naam om hem in de structuur te vinden. Telt niet als melding en staat niet in het Discord-rapport of de AI-prompt.

## [0.3.0] — 2026-10-30

### English
- New: **image paths**. A warning when an image (`image`, `logo`, `flag`, `flagPath`, `decorBgImage` or any .png/.jpg/.webp/.gif/.svg path) points to a file on one specific computer, such as `D:\Steam\...\resources\teams\x.png`. The message suggests the matching path inside the resources folder (`./teams/x.png`); the AI prompt applies that change directly.
- Only the text in the JSON is checked; no files on your computer are read. `workshopCoverImage` is skipped, because it is only used when uploading.

### Nederlands
- Nieuw: **afbeeldingspaden**. Een waarschuwing als een afbeelding (`image`, `logo`, `flag`, `flagPath`, `decorBgImage` of elk .png/.jpg/.webp/.gif/.svg-pad) naar een bestand op één specifieke pc verwijst, zoals `D:\Steam\...\resources\teams\x.png`. De melding stelt het bijbehorende pad binnen de resources-map voor (`./teams/x.png`); de AI-prompt voert die wijziging direct door.
- Alleen de tekst in de JSON wordt gecontroleerd; er worden geen bestanden op je pc gelezen. `workshopCoverImage` wordt overgeslagen, omdat dat alleen bij het uploaden wordt gebruikt.

## [0.2.0] — 2026-10-30

### English
- New: **references between entries**. The validator now checks that IDs point to something that exists:
  - error: a driver's `teamId`, or a team's `pilots` / `reserves`, pointing to a team or driver that does not exist; the same ID used twice;
  - warning: team sponsor contracts (`sponsorId`), naming sponsor, engine (`engine`, `ownedEngineId`, `preferredEngineId`, `engineId`), academies, staff and `driverCarAssignment` cars;
  - info: driver relations, `driverCarAssignment` drivers and the `drivers` list of a team (the vanilla data also contains these leftovers).
- Drivers, teams, academies and staff share one ID space across categories; sponsors, naming sponsors and engines are numbered per category, as in the vanilla data.
- The AI prompt asks which existing entry a broken reference should point to.
- New: **duplicate drivers and staff**. A warning when the same name (ignoring case and accents) appears with a different ID, in any list or category.

### Nederlands
- Nieuw: **verwijzingen tussen onderdelen**. De validator controleert nu of ID's naar iets bestaands wijzen:
  - fout: de `teamId` van een coureur, of `pilots` / `reserves` van een team, die naar een niet-bestaand team of een niet-bestaande coureur wijzen; hetzelfde ID dat twee keer wordt gebruikt;
  - waarschuwing: sponsorcontracten van teams (`sponsorId`), titelsponsor, motor (`engine`, `ownedEngineId`, `preferredEngineId`, `engineId`), academies, staf en auto's in `driverCarAssignment`;
  - info: relaties van coureurs, coureurs in `driverCarAssignment` en de lijst `drivers` van een team (ook de vanilla-data bevat deze restanten).
- Coureurs, teams, academies en staf delen één ID-reeks over alle categorieën; sponsors, titelsponsors en motoren zijn per categorie genummerd, net als in de vanilla-data.
- De AI-prompt vraagt naar welk bestaand onderdeel een kapotte verwijzing moet wijzen.
- Nieuw: **dubbele coureurs en stafleden**. Een waarschuwing als dezelfde naam (ongeacht hoofdletters en accenten) met een ander ID voorkomt, in elke lijst en categorie.

## [0.1.2] — 2026-10-30

### English
- Schema 0.1.1: the list of field names taken from the modding guide now holds only field names. Program constants, single letters and value keys quoted in the guide were removed. Check results are unchanged.

### Nederlands
- Schema 0.1.1: de lijst met veldnamen uit de modding guide bevat nu alleen echte veldnamen. Programmaconstanten, losse letters en waardesleutels die de guide citeert, zijn verwijderd. De uitkomst van de controles is ongewijzigd.

## [0.1.1] — 2026-10-30

### English
- The "alternative spellings" line now has a neutral label and says it is not counted as an issue, so it no longer looks like it belongs to the Info count.

### Nederlands
- De regel met "alternatieve schrijfwijzen" heeft nu een neutraal label en vermeldt dat hij niet als melding telt. Zo lijkt hij niet meer bij de Info-teller te horen.

## [0.1.0] — 2026-10-30

### English
- First release of DM Validator: a JSON debugger for Delta Manager 0.7 mod files.
- Invalid JSON is reported with line and column, with a plain explanation (trailing comma, comment, missing comma, file cut off, `...` left by an AI, single quotes, unquoted names).
- Checks unknown fields, wrong types, values outside the editor range, missing fields and values that do not exist (driving styles, characteristics, sponsor categories, bonus types).
- Alternative spellings that the game accepts are summarised in one collapsible line.
- Structure view with error counts per branch; clicking a message opens the matching field.
- Reference panel with all allowed values and their source, with a copy button.
- Exports: Discord (max. 2000 characters), .txt, .csv, .json and an English AI prompt that asks the user before changing values.
- Interface in English, Dutch, French and German.
- Large files (tested with 48 MB vanilla databases) are checked in the background.

### Nederlands
- Eerste versie van DM Validator: een JSON-debugger voor mod-bestanden van Delta Manager 0.7.
- Ongeldige JSON wordt gemeld met regel en kolom, met een duidelijke uitleg (komma na het laatste item, commentaar, ontbrekende komma, afgekapt bestand, `...` achtergelaten door een AI, enkele aanhalingstekens, veldnamen zonder aanhalingstekens).
- Controleert onbekende velden, verkeerde types, waarden buiten het editorbereik, ontbrekende velden en waarden die niet bestaan (rijstijlen, karakteristieken, sponsorcategorieën, bonustypes).
- Alternatieve schrijfwijzen die de game accepteert, staan samengevat in één uitklapbare regel.
- Structuurweergave met het aantal meldingen per tak; klikken op een melding opent het bijbehorende veld.
- Referentiepaneel met alle toegestane waarden en hun bron, met een kopieerknop.
- Exports: Discord (max. 2000 tekens), .txt, .csv, .json en een Engelse AI-prompt die de gebruiker eerst vraagt voordat waarden worden gewijzigd.
- Interface in het Engels, Nederlands, Frans en Duits.
- Grote bestanden (getest met vanilla-databases van 48 MB) worden op de achtergrond gecontroleerd.
