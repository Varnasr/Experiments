#!/bin/bash
cd "$(dirname "$0")"
LOG="terminal.log"
exec > >(tee -a "$LOG") 2>&1

echo "==========================================================="
echo "  Build Nilaya E-Pothi catalogue"
echo "==========================================================="
echo ""
echo "Started: $(date)"
echo ""

if [ ! -f "build_catalogue.py" ]; then
  echo "ERROR: build_catalogue.py is missing from this folder!"
  read -p "Press Enter to close..."
  exit 1
fi

# --- Auto-install Tesseract + Poppler for OCR support ---
need_install=()
if ! command -v tesseract >/dev/null 2>&1; then
  need_install+=("tesseract")
fi
if ! command -v pdftoppm >/dev/null 2>&1; then
  need_install+=("poppler")
fi

if [ ${#need_install[@]} -gt 0 ]; then
  echo "OCR tools missing: ${need_install[*]}"
  if command -v brew >/dev/null 2>&1; then
    echo ""
    echo "Installing OCR tools via Homebrew (one-time, takes ~2-5 minutes)..."
    echo "These let the script extract text from scanned PDFs."
    echo ""
    brew install "${need_install[@]}"
    echo ""
    if command -v tesseract >/dev/null 2>&1 && command -v pdftoppm >/dev/null 2>&1; then
      echo "✅ OCR tools installed successfully."
    else
      echo "⚠️  OCR install reported issues. Continuing without OCR — text-based PDFs will still work."
    fi
  else
    echo ""
    echo "⚠️  Homebrew not found, so OCR will be SKIPPED."
    echo ""
    echo "If you'd like OCR enabled (extracts text from scanned PDFs),"
    echo "install Homebrew once by pasting this in Terminal:"
    echo ""
    echo "    /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo ""
    echo "Then re-run this command. The catalogue will still work without OCR,"
    echo "you just won't get text from scanned-image PDFs."
    echo ""
  fi
else
  echo "✅ OCR tools already installed."
fi

echo ""
echo "What this does:"
echo "  - Walks the Library/ folder (auto-located)"
echo "  - PDFs: reads page 1-3 text, renders cover, OCR fallback for scans"
echo "  - EPUBs: reads first chapter text + extracts cover image"
echo "  - Detects language, year, author from filenames"
echo "  - Computes TF-IDF keywords across all books"
echo "  - Writes catalog.js + thumbnails/ in this folder"
echo ""
echo "Python deps (pymupdf, scikit-learn) auto-install on first run."
echo "Re-runs use a cache so they only process new/changed files."
echo ""
echo "Starting in 3 seconds..."
sleep 3
echo ""

python3 "build_catalogue.py"
RC=$?

echo ""
echo "Python exited with code: $RC"
echo "Done: $(date)"
echo ""
echo "When done, double-click:  index.html"
echo "(opens in your default browser)"
echo ""
read -p "Press Enter to close..."
