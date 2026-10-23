# Interface reference

The reference screenshots are `workspace-desktop.png` (1536×1024, the example after formatting) and `workspace-mobile-settings.png` (390×844, the settings sheet on a phone).

## Layout

- One header row holds the wordmark, the theme switch, the language menu (a Radix dropdown menu listing Browser language and the three interface languages, each in its own language), Settings and the repository link. Below 760px the header theme switch is hidden and the theme is chosen under Settings → Display, where it is always available.
- The workspace is two editors joined by the **format seam**: a column between Source and Result holding the Format button and its shortcut. While formatting, the button becomes Stop.
- The Source pane header has the file name, statistics, Open and Clear. An empty source shows a card with one heading and Paste, Open file and Load example. A file can also be dropped anywhere on the pane. The empty Result pane shows "No result yet".
- The Result pane has Result and Changes tabs (Changes shows the changed-line count), plus Copy, Download and Replace source. An out-of-date result is shown desaturated and labelled "Out of date".
- The report bar along the bottom reads like an editor's status bar: a status label and short facts (duration, the reason a result is out of date, or a failure phrase with its code), then per-rule counts such as `Templates 3` and `Tables 1`, then the active preset, which opens Settings. A count with a known line is a button that jumps there; ambiguous, skipped items carry a warning mark. The core's stage and message are the code's tooltip. Below 760px the bar wraps and the preset is hidden.
- Settings is a modal sheet (Radix Dialog) with Preset, Templates, Tables, Page layout, Links and footer, Display and Advanced sections. Advanced ends with the formatter and web app versions and a link to the formatter engine.
- Pane headers respond to the pane's own width (container queries), not the viewport: as a pane narrows, the Result title is hidden first, then the action buttons become icon-only, so headers never wrap or overlap.
- In the settings sheet, choices with a preview stack vertically, label on the left and sample on the right, when the sheet is narrower than 380px.
- Below 760px one pane shows at a time behind a Source/Result switch, and the seam becomes a full-width Format button above the report bar.
- Notifications (copy, file opened, clear with Undo) use sonner toasts.

## Design system

- Palette (light): paper `#ffffff`, chrome `#f8f9fa`, ink `#202122`, rules `#c8ccd1`. Progressive blue `#36c` for primary actions and links, success `#177860`, warning `#8a5300`, destructive `#bf3c2c`. These follow the MediaWiki Codex palette, so the tool feels at home next to a wiki.
- Dark theme: paper `#101418`, ink `#eaecf0`, progressive `#88a3e8`. Theme and language changes repaint the page as one 200ms crossfade (View Transitions API); individual elements do not transition, so none is caught at mid-fade contrast.
- Type: Libertinus Serif (the Linux Libertine successor used for Wikipedia headings) for the wordmark and pane titles; the system sans-serif stack for interface text; JetBrains Mono for the editors, shortcuts and file names.
- Signature: the wordmark is wrapped in template braces, `{{Wikitext Formatter}}`, and the seam carries the Format button between the two editors.
- Borders are 1px, corners 2px (6px for the sheet and cards). Shadows are reserved for the settings sheet, toasts, the Format button and switch thumbs.
- Changed output lines get a soft blue background and a 3px blue left rule.

## Motion

Motion marks a change of state and stays short (under half a second), using an ease-out curve.

- On load, the header, the two panes with the seam, and the report bar rise in, 50ms apart.
- When a result arrives, changed lines flash once; lines rendered later on scroll stay still. The Changes count and the Out of date tag pop in, and rule counts in the report bar enter one after another in reading order.
- While formatting, a ring ripples out from the Format button. The button presses in on click.
- The language menu scales in from its trigger, whose chevron turns; the checked item's mark pops in. The settings sheet slides in and slides back out on close.
- The empty-source card and the drop overlay rise in; tab underlines grow from the centre.
- With `prefers-reduced-motion: reduce`, all animations and transitions are cut to 1ms and the crossfade is skipped.

## Writing

- Labels and status items are words or short phrases, not sentences. Only Settings hints and error messages that need an action use full sentences.
- State what something does; no disclaimers or negative reassurances ("never", "only", "will not").
- Use MediaWiki's own terms in each language: source / 源代码 / 原始碼, changes / 更改 / 變更, section headings / 章节标题 / 章節標題, internal links / 内部链接 / 內部連結, redirects / 重定向 / 重新導向, preset / 方案. The register is formal: no contractions in English and no 你 in Chinese.
- The same name for an action throughout: the button "Replace source" produces the status "Source replaced"; "Clear" produces "Source cleared".
- Say each thing once. The shortcut lives on the format seam, versions in Settings, the changed-line count on the Changes tab. The core's original failure message stays in the code's tooltip so it can be searched.
- Chinese catalogs contain no manual spaces between Han characters and Latin letters or digits. The page sets `text-autospace: normal` so supporting browsers add that spacing; code, shortcuts and editors opt out with `no-autospace`.
