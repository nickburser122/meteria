# Materia — drug ledger

Vanilla JS spreadsheet for drug records. Entry: `index.html` (`css/style.css`, `js/app.js`). No framework, no build step, no server.

## Features
- Columns: ID No. and ID Vol. (optional, off by default), Name, Class, Budget class, Price, Stock, Expended. All labels can be renamed under Columns.
- Quick add: type a name, set × (or ↑/↓), Enter creates that many rows. Known names inherit class and budget class and join their group.
- Class / budget class typed on one row fills blank siblings of the same name.
- Same-name rows share a colour bar and an `n/total` badge. Rows whose every field matches are tinted and badged `identical`; the status bar counts them and jumps to them.
- Keys: Enter / Shift+Enter and ↑/↓ move along a column, Tab at row end jumps to the next empty cell, Ctrl/Cmd+D duplicates a row with blank numbers.
- Header click sorts, filter box narrows rows (print and export follow the filter; the row being edited stays visible until focus leaves it), delete has Undo.
- Name, class and budget class suggest from existing records while typing.
- Arabic-Indic digits and the Arabic decimal and thousands separators are read as numbers.
- Print & export: rows per page, cumulative sum Off / Running (Σ column per row) / Page end (page total + cumulative), choice of summed columns, page preview, native print, .xlsx via SheetJS CDN.
- The ledger title is the print heading, the .xlsx file name and the tab title.
- Favicon is baked into `index.html`: an inline SVG (scalable) and an inline multi-size .ico (16, 32, 48), the header ring mark on a dark tile. No extra files.

## Libraries
- SheetJS `xlsx@0.18.5` from jsDelivr, used only for .xlsx export.
- Fraunces and Geist from Google Fonts; system fonts take over if they cannot load.
- Nothing else.

## Storage
`localStorage` key `materia.v1` (title, column settings, labels, rows, print settings). Per browser and origin, no server.

## Does not
- Import: no JSON / xlsx import and no backup file yet.
- Sync between browsers, devices or open tabs; the last tab to save wins.
- Export .xlsx offline; the SheetJS script comes from the CDN.
- Keep more than the delete Undo; edits cannot be undone.
- Show more than two decimals in print, export and totals; values are rounded to 0.01 there, the stored text is untouched.

## Status
Not deployed. Behaviour checked with scripted jsdom tests (quick add, sibling fill, identical detection, sort, undo, filter, duplicate, persistence, suggestions, keys, print pagination, all three sum modes, xlsx rows, columns popover). Not run in a real browser.

## To verify
- Layout, colours and fonts; mobile layout.
- Native print output and page breaks at different rows per page.
- The downloaded .xlsx opened in Excel.
- Favicon in the tab, bookmarks and a pinned tab.

## Next steps
- JSON / xlsx import and backup.
