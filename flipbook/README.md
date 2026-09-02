# Flipbook Maker

Live at **https://varnasr-experiments.netlify.app/flipbook/**

A PDF becomes a page-turning book, and the book becomes one HTML file you can
put anywhere.

## What it does

Drop a PDF. Each page is drawn to an image in the browser with PDF.js at the
width you choose (1000 to 2400 pixels) and the JPEG quality you set. Title and
author are read from the PDF's own metadata when it has them. The pages are
bound into a StPageFlip book with a hard cover shown alone, facing spreads, a
choice of background (paper, dark, or any colour), and a turn speed. Pages turn
by dragging a corner, by the buttons, by the arrow keys, or by clicking a
thumbnail. There is a full-screen mode.

## The export

The download is a single HTML file. It carries the page images as JPEG data
URLs and the text of the page-flip library, so it opens from a USB stick, from a
phone, from a Google Drive link, or from any static host with no server and no
network. A 20-page A4 report rendered at 1400 pixels comes to about 2 MB; the
page shows the size before you download.

## Privacy

Rendering and export happen in the browser. The only network requests are for
the two libraries the page loads, PDF.js from cdnjs and StPageFlip from
jsDelivr. The PDF is never uploaded.

## Verification

Headless run: a seven-page PDF generated in the same browser renders in full at
1400 pixels, the title is read from its metadata, the Next button, the arrow
keys, the Last button and a thumbnail each move the page counter as expected,
and the exported file opens from disk, makes no network request, and turns
pages. Two dependencies, both loaded from a CDN and pinned to a version. One
HTML file. MIT.
