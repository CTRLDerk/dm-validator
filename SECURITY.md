# Security policy

DM Validator is a static web page. It reads your file in your own browser and does not upload, store or send it anywhere. The only outside requests are for the web fonts and for anonymous usage counts (GoatCounter, no cookies; file names and contents are never sent).

## Supported version

Only the version live at https://ctrlderk.github.io/dm-validator/ (the `main` branch) is supported.

## Reporting a vulnerability

Please do **not** open a public issue for a security problem.

Report it privately through GitHub: **Security** tab of this repository → **Report a vulnerability**.

Useful to include:

- what the problem is and what someone could do with it;
- the steps or a sample file to reproduce it;
- the browser and version you used.

You will get a reply within a week. Once fixed, the fix is listed in the changelog. Let us know if you would like to be credited.

## In scope

- Content from a loaded file that runs as code or changes the page (for example script injection through a field name or value).
- Anything that causes file contents to leave the browser.

## Out of scope

- Problems in GitHub Pages itself.
- A browser slowing down on very large files.
