# Household Library Builder

Live at **https://varnasr-experiments.netlify.app/library-builder/**

A catalogue for the books in a house, built and kept in the browser.

## Adding books

- **ISBN**: `openlibrary.org/api/books` returns title, subtitle, authors, year,
  publisher, subjects and a cover; the record is added and opened for editing.
- **Title and author search**: `openlibrary.org/search.json`, ten results, click
  one to add it.
- **By hand**: any field can be edited; a book with no ISBN is fine.
- **Paste a list**: one book per line, an ISBN or `Title | Author | Year`, with
  optional online lookup for the ISBNs.
- **CSV import**: Goodreads and LibraryThing exports, or any CSV with a title
  column (author, ISBN, year, publisher, shelves or tags, rating, status and
  notes are picked up when their columns exist). Goodreads' `="978…"` ISBN
  quoting is handled.

Duplicates by ISBN, or by title and first author, are refused with a message.

## Keeping it

Each book has a shelf or room, an owner, a status (unread, reading, read,
reference), a rating, a lent-to name and date, subjects, and notes. Views:

- **Shelves**: a cover grid with pills for shelf, status and loan.
- **Table**: sortable by title, author, year, shelf.
- **Borrowed and reading**: everything out on loan with days elapsed (over 60
  in red) and everything marked as being read.
- **Subjects**: bar charts of subjects, authors and decades; clicking a subject
  bar filters the shelves.
- **Map**: a force-directed network of books joined when they share a subject,
  laid out in the page (220 iterations, seeded, capped at 300 books), coloured
  by read status and loan.

Search covers title, authors, subjects, notes, publisher, ISBN and borrower;
filters by shelf, status, owner and subject combine with it.

## Files

JSON export is a full backup and the way to move the catalogue to another
machine; import merges or replaces. CSV export has one row per book. The print
view is the table.

## Privacy

The catalogue is in the browser's local storage and nowhere else. The only
network requests are the ISBN or title you look up and the cover images, both to
Open Library. A starter shelf of twelve well-known books, tagged by hand, is
available to try the views; it carries no ISBNs so nothing is fetched until you
ask.

## Verification

Headless run with Open Library mocked from recorded responses: the starter shelf
loads twelve books; an ISBN lookup adds one with authors, year, publisher and
subjects from the record; a title search lists results and adds the chosen one;
every view renders (table rows, loan list, subject bars, network with circles
and links); search and filters narrow the shelf; the catalogue persists in local
storage. No dependencies. One HTML file. MIT.
