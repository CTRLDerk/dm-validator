## What does this change?

<!-- One or two sentences. -->

## Why?

<!-- Link the issue if there is one: Fixes #123 -->

## Source for rules or values

<!-- Only for schema changes: modding guide chapter, vanilla database, or in-game test. Leave empty otherwise. -->

## Tested

- [ ] `npm test` passes (CI runs it too, plus the browser smoke test)
- [ ] A changed result in `tests/snapshots/` is intended and explained above
- [ ] New rule code or check: a case in `tests/rules.test.js` and a text in all four languages
- [ ] Release: `TOOL_VERSION` in `app.js` matches the new CHANGELOG entry (English and Nederlands)
- [ ] Opened the tool through a local web server and loaded at least one mod file
- [ ] Checked the result in more than one language if texts changed
- [ ] No private files (mod slots, personal data) are included
