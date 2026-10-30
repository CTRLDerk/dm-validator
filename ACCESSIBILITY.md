# Accessibility

DM Validator aims to be usable by everyone, with a keyboard and with a screen reader.

## What we do

- All controls are real buttons, links and form fields, so they work with the keyboard (Tab, Enter, Space).
- Focus is clearly visible.
- Severity is shown with text, an icon **and** a colour, never colour alone.
- Text and background colours are chosen for WCAG 2.1 AA contrast in both themes (enamel and graphite). Report any spot where text is hard to read.
- The layout works on narrow screens; the two panels stack.
- The interface is available in English, Dutch, French and German.

## Supported environments

Current versions of Chrome, Edge, Firefox and Safari. JavaScript must be enabled.

## Known limitations

- The structure view can be long for big mods. Use the search field and the message filters to jump to an issue.
- Messages and the structure view are not yet linked with ARIA live regions; a screen reader is not told automatically when a check finishes.
- Very large files (around 50 MB) can take a few seconds to check.

## Report a barrier

Open an issue with the **Bug report** template and mention "accessibility", or contact the maintainer on the Delta Manager Discord.
