# Materia — drug ledger

Vanilla JS spreadsheet for drug records. Entry: `index.html` (`css/style.css`, `js/app.js`). No framework, no build step, no server, no network requests: every script, font and icon is a file in this project.

## Features
- Columns: ID No. and ID Vol. (optional, off by default), Name, Class, Budget class, Price, Stock, Expended. All labels can be renamed under Columns.
- Quick add: type a name, set × (or ↑/↓), Enter creates that many rows. Known names inherit class and budget class and join their group.
- Class / budget class typed on one row fills blank siblings of the same name.
- Same-name rows share a colour bar and an `n/total` badge. Rows whose every field matches are tinted and badged `identical`; the status bar counts them and jumps to them.
- Keys: Enter / Shift+Enter and ↑/↓ move along a column, Tab at row end jumps to the next empty cell, Ctrl/Cmd+D duplicates a row with blank numbers.
- Header click sorts, filter box narrows rows (print and export follow the filter; the row being edited stays visible until focus leaves it), delete has Undo.
- Name, class and budget class suggest from existing records while typing.
- Arabic-Indic digits and the Arabic decimal and thousands separators are read as numbers.
- Print & export: rows per page, cumulative sum Off / Running (Σ column per row) / Page end (page total + cumulative), choice of summed columns, page preview, native print, .xlsx export.
- The exported workbook has two sheets. `Ledger` holds the rows as printed. `Summary` holds record, drug and identical-row counts, the stock and expended totals, price × stock and price × expended, then the same figures grouped by class, by budget class and by name. It follows the filter and names it when one is set.
- The ledger title is the print heading, the .xlsx file name and the tab title.
- Favicon: `favicon.svg`, the header ring mark with no tile, in brighter colours when the OS is dark. Once the app loads the ring is redrawn on a canvas so it can turn once on load, after an import and after an export. It follows the OS scheme, not the in-app theme switch, because the tab strip does. Reduced-motion settings stop the turn.
- Theme: the header icon button cycles System default → Light → Dark. System follows the OS setting live. The choice is applied before first paint and cross-fades when changed.
- Import (header button, or drop a file anywhere): reads .xlsx / .xls / .ods / .csv. Every sheet is scored and the best one is preselected; the header row is found in the first 30 rows; columns are matched by the ledger's own (renamed) labels, English and Arabic synonyms, typos and the data type, with a data-based guess for Name and Price when no header fits. Sheet, header row and every column match can be changed in the dialog, with a live preview and row counts. Options: add to or replace the ledger, skip rows already in the ledger, treat a blank name as the row above. Total lines, repeated headers and empty rows are skipped. Import has Undo.
- Download template (in the Import dialog): a workbook with a `Ledger` sheet using the current column labels and a `How to` sheet.

## Libraries
- SheetJS `xlsx@0.18.5` in `js/vendor/xlsx.full.min.js`, used for .xlsx export, import and the template.
- Fraunces (upright and italic) and Geist as variable woff2 files in `fonts/`, Latin and Latin Extended. Other scripts, Arabic included, use system fonts.
- Nothing else.

## Offline
- Opened from disk (`file://`) the app runs as is.
- Served over http(s), `sw.js` caches every file on the first visit and serves them when the network is gone. It asks the network first, so an updated file is picked up on the next online load.

## Storage
`localStorage` key `materia.v1` (title, column settings, labels, rows, print settings). Theme choice is in `materia.theme` (`system` / `light` / `dark`). Per browser and origin, no server.

## Does not
- JSON backup / restore; import reads spreadsheets only.
- Read European number formats (1.200,50) or dates in imported cells.
- Sync between browsers, devices or open tabs; the last tab to save wins.
- Keep more than the delete Undo; edits cannot be undone.
- Show more than two decimals in print, export and totals; values are rounded to 0.01 there, the stored text is untouched.

## Status
Not deployed. Copied from `github.com/nickburser122/meteria`; nothing was pushed back.

Checked in a headless desktop browser after the offline and polish pass: the page loads with no console errors, the three local fonts load, the sample ledger renders in the light theme, the export produces `Ledger` and `Summary` sheets with correct figures for the sample, and the canvas favicon is drawn.

Earlier scripted jsdom tests covered quick add, sibling fill, identical detection, sort, undo, filter, duplicate, persistence, suggestions, keys, print pagination, the three sum modes, xlsx rows and the columns popover. They were not rerun after this pass.

## To verify
- Mobile layout.
- The service worker: load once over http(s), go offline, reload.
- The favicon turn and its dark-scheme colours in a real tab.
- The theme cross-fade.
- Native print output and page breaks at different rows per page.
- The downloaded .xlsx opened in Excel.
- Favicon in bookmarks and a pinned tab; Safari may want a separate mask icon.
- Dark theme contrast on every surface (grid, popovers, print panel, import dialog).
- Import with real workbooks: several sheets, title rows above the header, Arabic headers, merged name cells, a file exported from Materia, the template.

## Next steps
- Code review.
- JSON backup / restore.
