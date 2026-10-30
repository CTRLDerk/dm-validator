# Changelog

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
