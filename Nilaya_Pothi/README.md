# Family Library Catalogue

A searchable, browseable catalogue of every file in the `Library/` folder, with per-user reading lists, lending tracker, notes, statistics, and a graph view.

This whole `Catalogue/` folder is self-contained. The build script auto-locates `Library/` by walking up its parent directories, so you can move this folder anywhere within `Family Room/` and it'll still work.

## How to use

### First time

1. Double-click **Build catalogue.command** in this folder.
   - First run takes 15–30 min (installs Python deps, reads every PDF, renders thumbnails).
   - Output lands in this folder: `catalog.json` and `thumbnails/`.
2. Once it finishes, double-click **index.html** here. It opens in your default browser.
3. The "Active user" dropdown defaults to Varna. Use the `+ add family member` link to add Papri, Kundendu, Agastya, anyone else.

### Day to day

- **Browse tab**: search box, filters (theme, sub, file type, language), sort, list/grid toggle. Clicking a book opens a detail modal where you can mark status, leave notes, record who lent it.
- **My Reading tab**: per-user reading lists (To read / Reading / Read / Abandoned).
- **Lending tab**: who currently has which book.
- **Stats tab**: overview of the collection.
- **Graph tab**: force-directed view of all books, connected by shared theme + keyword. Toggle "shared author" to see author clusters.
- **Recently added**: last 60 files by modified date.

### When you add new books to Library/

Re-run **Build catalogue.command** to refresh `catalog.json` and generate covers for new files. Existing covers are skipped, so re-runs are fast.

## What's stored where

- **`catalog.json`** — generated metadata for every file. Re-built by the .command.
- **`thumbnails/<id>.jpg`** — cover image for each PDF (first page rendered at 240px wide).
- **Per-user state (reading lists, status, lent-to, notes)** — in your **browser's localStorage**, separate from `catalog.json`. Stays even when the catalogue is rebuilt. Lives only in the browser you used to enter it. Open the catalogue from a different device or browser → fresh state.

## Sharing across devices

Because this folder lives in your Dropbox folder, opening `index.html` from another Mac with Dropbox synced gives you the same view. **But** the per-user state (reading lists, notes, lending) is per-browser, so each device tracks its own copy. To sync state across devices, you'd need to push it to a backend — a future enhancement.

## Putting this in a private GitHub repo

Two reasons to do this: (a) version history, (b) easy sharing of the catalogue itself.

```bash
cd "/Users/varna/Library/CloudStorage/Dropbox/Family Room/Catalogue"
git init
git add .gitignore index.html README.md build_catalogue.py "Build catalogue.command"
git commit -m "Initial catalogue tooling"
# Create the private repo at https://github.com/new (e.g. family-library)
git remote add origin git@github.com:<your-username>/family-library.git
git branch -M main
git push -u origin main
```

`thumbnails/` and `catalog.json` are excluded by `.gitignore` because they regenerate from the build script and would bloat the repo. Anyone cloning would re-run the .command to populate them.

## Files in this folder

```
Catalogue/
├── README.md                    ← this file
├── index.html                   ← the viewer (open in browser)
├── build_catalogue.py           ← generator
├── Build catalogue.command      ← double-click runner
├── catalog.json                 ← generated metadata (built by .command)
├── thumbnails/                  ← generated covers (built by .command)
└── .gitignore                   ← excludes catalog.json + thumbnails from Git
```

## Troubleshooting

- **"Could not load catalog.json"** — run **Build catalogue.command** first.
- **Files don't open when clicked** — `file://` links require opening `index.html` from your local disk (Finder → double-click). They won't work if you opened the HTML over HTTPS.
- **Covers missing** — re-run the .command. If still missing, the PDF likely failed to render (corrupt or password-protected).
- **"Could not find a Library folder"** — the build script walks up to 6 parent directories looking for `Library/`. Make sure this `Catalogue/` folder is inside `Family Room/` (or wherever your Library lives).
