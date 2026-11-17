# dm-validator

Publieke webtool (GitHub Pages vanaf `main`): **elke merge naar `main` staat direct live.**

## Controles

- `node tools/check.js`: syntaxis, JSON, vertalingen, meldingsteksten, rooktest van de engine.
- Schemawijzigingen alleen met bron (modding guide, vanilla databases, editor-save of in-game test), zie `CONTRIBUTING.md`. Geen spellogica uit de gamecode.
- Bij een versiewijziging: `CHANGELOG.md` bijwerken. Na een schemawijziging: ook kopiëren naar dm-toolkit.
- PR's volgen `.github/pull_request_template.md`.

## Publiceren

De eigenaar merget de PR naar `main`; GitHub Pages zet de site daarna live.

## Werkwijze (geldt voor alle Delta Manager-repo's)

Doel: kwaliteit bewaken, en **niets wordt gepubliceerd zonder dat de eigenaar zelf ingrijpt**.

1. **Altijd op een eigen branch.** Nooit committen of pushen op `main`. Eén onderwerp per branch.
2. **Eerst controleren, dan committen.** Draai de controles hieronder. Rood = niet committen, eerst oplossen. Meld eerlijk wat er faalde.
3. **Changelog bijwerken** waar de repo er een heeft (zie hieronder), in dezelfde commit als de wijziging.
4. **Pushen naar de eigen branch mag.** Een pull request alleen als de eigenaar erom vraagt.
5. **Nooit zelf:** een PR mergen of auto-merge aanzetten, een tag maken of pushen, een GitHub Release maken, een workflow handmatig starten, force-pushen, of via de GitHub-API bestanden direct op een branch zetten. Dit is ook technisch geblokkeerd (`.claude/settings.json` en `.claude/hooks/guard.js`). Pas die bestanden niet aan zonder dat de eigenaar erom vraagt.
6. **Publiceren doet de eigenaar:** PR mergen → tag/release maken → in GitHub Actions de job in environment `publish` goedkeuren.
7. Geen privébestanden in Git: mod-slots van spelers, saves, webhook-URL's, e-mailadressen, tokens.

### CI

Elke push en PR draait de workflow `check`. Die publiceert niets. Een PR mag pas gemerged worden als `check` groen is.
