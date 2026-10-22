# Interface reference

The reference screenshots are `workspace-desktop.png` (1536×1024, the example after formatting) and `workspace-mobile-settings.png` (390×844, the settings sheet on a phone).

## Layout

- One header row holds the wordmark, tagline, a "Runs locally" badge, the theme switch, the language menu, Settings and the repository link. Below 900px the badge is hidden; below 760px the header theme switch is hidden and the theme is chosen under Settings → Display, where it is always available.
- The workspace is two editors joined by the **format seam**: a column between Source and Result holding the Format button and its shortcut. While formatting, the button becomes Stop.
- The Source pane header has the file name, statistics, Open and Clear. An empty source shows a short card with Paste, Open a file and Try an example. A file can also be dropped anywhere on the pane.
- The Result pane has Result and Changes tabs (Changes shows the changed-line count), plus Copy, Download and Replace source. An out-of-date result is shown desaturated and labelled "Out of date".
- The report bar along the bottom gives the status in a single sentence, the active preset with an Adjust link, and a Details toggle. Details opens what changed, warnings, failure reasons, technical details and version information.
- Settings is a modal sheet (Radix Dialog) with Preset, Templates, Tables, Page layout, Links and footer, Display and Advanced sections. Changes apply the next time you format.
- Below 760px one pane shows at a time behind a Source/Result switch, and the seam becomes a full-width Format button above the report bar.
- Notifications (copy, file opened, clear with Undo) use sonner toasts.

## Design system

- Palette (light): paper `#ffffff`, chrome `#f8f9fa`, ink `#202122`, rules `#c8ccd1`. Progressive blue `#36c` for primary actions and links, success `#177860`, warning `#8a5300`, destructive `#bf3c2c`. These follow the MediaWiki Codex palette, so the tool feels at home next to a wiki.
- Dark theme: paper `#101418`, ink `#eaecf0`, progressive `#88a3e8`. It switches without transitions so no element is caught at mid-fade contrast.
- Type: Libertinus Serif (the Linux Libertine successor used for Wikipedia headings) for the wordmark and pane titles; the system sans-serif stack for interface text; JetBrains Mono for the editors, shortcuts and file names.
- Signature: the wordmark is wrapped in template braces, `{{Wikitext Formatter}}`, and the seam carries the Format button between the two editors.
- Borders are 1px, corners 2px (6px for the sheet and cards). Shadows are reserved for the settings sheet, toasts, the Format button and switch thumbs.
- Changed output lines get a soft blue background and a 3px blue left rule.

## Writing

- Sentence case, plain verbs, and the same name for an action throughout: the button "Replace source" produces the status "Source replaced"; "Clear" produces "Source cleared".
- Failure copy says what happened and what to do next. The core formatter's original message stays visible under Technical details so it can be searched.
- Chinese catalogs contain no manual spaces between Han characters and Latin letters or digits. The page sets `text-autospace: normal` so supporting browsers add that spacing; code, shortcuts and editors opt out with `no-autospace`.
