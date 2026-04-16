# drive-pdf-extractor

Download a **view-only** Google Drive PDF (one you can see but not export)
by driving a headless browser through the web viewer and assembling the
per-page canvas blobs into a fresh PDF.

Port of [apokaliptics/google-drive-extract](https://github.com/apokaliptics/google-drive-extract)
(a Chrome extension) to Node + Playwright so it can run from a CLI / CI job.

## Requirements

- Node 18+
- `playwright` (installed globally or locally) with Chromium browser binaries
- The shared Drive link must be publicly viewable (no sign-in required)

## Usage

```bash
# File ID is the token between /file/d/ and /view in the share URL:
#   https://drive.google.com/file/d/<FILE_ID>/view

node extract-drive-pdf.js <FILE_ID> <OUTPUT_PATH>
```

Example:

```bash
node tools/drive-pdf-extractor/extract-drive-pdf.js \
  11ZqvIm1YsEnQNjO8KfzMoNwjH7m9jRfJ \
  docs/a-right-to-care-kmut-report.pdf
```

## How it works

1. Launches headless Chromium via Playwright.
2. Injects bundled `jsPDF` via `addInitScript` (bypasses Drive's Trusted Types CSP).
3. Navigates to the viewer and waits for the first `blob:` page image.
4. Scrolls the viewer container in steps, polling until no new pages appear
   for ~3 s (matches the extension's settle heuristic).
5. For each `<img src="blob:…">`, draws it to an offscreen canvas, exports as
   JPEG (95 % quality), and appends to the jsPDF document.
6. Returns the PDF as base64 and writes it to disk.

## Caveats

- Output is a **rasterized** PDF — selectable text and vector content from
  the original are not preserved.
- Page size is taken from the first image's natural dimensions; mixed-size
  documents fall back to the first page's orientation for subsequent pages.
- If Drive's viewer markup changes, `findScrollContainer()` and the blob-image
  selector may need updating.
- Only use this on PDFs you are authorised to retain a copy of.

## Vendor

`vendor/jspdf.umd.min.js` is copied verbatim from the upstream extension's
`vendor/` directory (MIT). See that repo for license details.
