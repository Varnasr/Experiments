#!/usr/bin/env python3
"""
Build a searchable catalogue of the Family Room/Library/ folder.

Self-locates: walks up the directory tree from this script's location
to find a folder named 'Library'. So you can put this script anywhere
within Family Room/ and it'll find Library on its own.

Outputs (written next to this script):
  catalog.json           - all metadata for every file
  catalog.js             - same data, loadable via <script> on file://
  thumbnails/<id>.jpg    - first-page cover thumbnail
  build_progress.json    - resume checkpoint

Supports:
  - PDFs: page-1 text + cover thumbnail (PyMuPDF)
  - EPUBs: title-page text + cover image (zipfile + html parsing)
  - PDFs with no text layer: OCR fallback via Tesseract (if installed)
  - Encrypted PDFs: tries empty password, otherwise skips text but still indexes
  - Files >100 MB: indexed but text+cover skipped

Auto-installs: pymupdf, scikit-learn. OCR optional (brew install tesseract).
"""
import os, re, sys, json, time, subprocess, hashlib, signal, zipfile, io, shutil

# -- pip auto-install --
def ensure(pkg, import_name=None):
    try:
        return __import__(import_name or pkg)
    except ImportError:
        print(f'Installing {pkg} (one-time) ...')
        subprocess.check_call([sys.executable, '-m', 'pip', 'install',
                                '--user', '--quiet', pkg])
        return __import__(import_name or pkg)

fitz = ensure('pymupdf', 'fitz')
sklearn = ensure('scikit-learn', 'sklearn')
from sklearn.feature_extraction.text import TfidfVectorizer

# OCR is optional
HAS_OCR = False
try:
    import pytesseract, pdf2image
    if shutil.which('tesseract') and shutil.which('pdftoppm'):
        HAS_OCR = True
except ImportError:
    try:
        ensure('pytesseract'); ensure('pdf2image')
        import pytesseract, pdf2image
        if shutil.which('tesseract') and shutil.which('pdftoppm'):
            HAS_OCR = True
    except Exception:
        pass

# epub HTML parsing
try:
    from html.parser import HTMLParser
except ImportError:
    HTMLParser = None

# -- locate Library/ --
def find_library():
    here = os.path.dirname(os.path.abspath(__file__))
    candidate = here
    for _ in range(6):
        lib = os.path.join(candidate, 'Library')
        if os.path.isdir(lib):
            return lib
        parent = os.path.dirname(candidate)
        if parent == candidate:
            break
        candidate = parent
    return None

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = find_library()
if not LIB:
    print(f'ERROR: could not find a "Library" folder by walking up from {HERE}')
    sys.exit(1)
print(f'Using script dir: {HERE}')
print(f'Found library at: {LIB}')
print(f'OCR available: {HAS_OCR}')

OUT = HERE
THUMBS = os.path.join(OUT, 'thumbnails')
os.makedirs(THUMBS, exist_ok=True)
CATALOG_JSON = os.path.join(OUT, 'catalog.json')
CATALOG_JS = os.path.join(OUT, 'catalog.js')
PROGRESS_JSON = os.path.join(OUT, 'build_progress.json')

EXCLUDE_TOP = {
    '_To Sort', '_Trash_2026-05-04',
    '99_To_Sort', '00_Unclassified',
    'Academic Writing Materials', 'Business', 'General',
    'Internet Marketing', 'Interviews in Qualitative Research', 'Money',
    'Catalogue',
}
INCLUDE_TOP_OVERRIDE = {'To Read'}

MAX_FILE_SIZE = 100 * 1024 * 1024
PER_FILE_TIMEOUT = 30
OCR_FILE_TIMEOUT = 45  # OCR is slower

class TimeoutError_(Exception): pass
def timeout_handler(signum, frame): raise TimeoutError_()
signal.signal(signal.SIGALRM, timeout_handler)
def with_timeout(seconds, fn, *args, **kwargs):
    signal.alarm(seconds)
    try: return fn(*args, **kwargs)
    finally: signal.alarm(0)

DEVANAGARI = re.compile(r'[ऀ-ॿ]')
YEAR_RE = re.compile(r'\b(19|20)\d{2}\b')
AUTHOR_AFTER_DASH = re.compile(r' - ([A-Z][A-Za-zÀ-ÿ\.\']+(?:\s+[A-Z][A-Za-zÀ-ÿ\.\']+)*)\s*(?:-\s*\d{4})?\.?\w*$')

def make_id(rel_path):
    return hashlib.md5(rel_path.encode('utf-8')).hexdigest()[:12]

def detect_language(name, snippet=''):
    if DEVANAGARI.search(name): return 'hi'
    if snippet and DEVANAGARI.search(snippet): return 'hi'
    return 'en'

def extract_year(text):
    m = YEAR_RE.search(text)
    return int(m.group()) if m else None

def extract_author(filename):
    base = os.path.splitext(filename)[0]
    m = AUTHOR_AFTER_DASH.search(base)
    if m:
        a = m.group(1).strip()
        if 4 <= len(a) <= 60 and ' ' in a:
            return a
    return None

# ----- HTML strip helper for epub -----
class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'head'): self.skip += 1
    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'head') and self.skip > 0: self.skip -= 1
    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)
    def text(self):
        return re.sub(r'\s+', ' ', ' '.join(self.parts)).strip()

def html_to_text(html):
    if not HTMLParser: return ''
    try:
        p = _TextExtractor()
        p.feed(html)
        return p.text()
    except Exception:
        return ''

# ----- PDF helpers -----
def _do_pdf_text(path, max_chars):
    doc = fitz.open(path)
    if doc.is_encrypted:
        if not doc.authenticate(''):
            doc.close(); return '[encrypted]'
    if doc.page_count == 0:
        doc.close(); return ''
    text = ''
    # Try pages 1-3 to find real content
    for i in range(min(3, doc.page_count)):
        t = doc.load_page(i).get_text() or ''
        t = re.sub(r'\s+', ' ', t).strip()
        if len(t) > 80:
            text = t
            break
        text += ' ' + t
    doc.close()
    return text.strip()[:max_chars]

def safe_pdf_text(path, max_chars=600):
    try:
        return with_timeout(PER_FILE_TIMEOUT, _do_pdf_text, path, max_chars)
    except TimeoutError_: return '[timed out]'
    except Exception: return ''

def _do_render_pdf_cover(path, out_path, width):
    doc = fitz.open(path)
    if doc.is_encrypted: doc.authenticate('')
    if doc.page_count == 0:
        doc.close(); return False
    page = doc.load_page(0)
    zoom = width / max(page.rect.width, 1)
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
    pix.save(out_path, jpg_quality=72)
    doc.close()
    return True

def render_pdf_cover(path, out_path, width=240):
    try: return with_timeout(PER_FILE_TIMEOUT, _do_render_pdf_cover, path, out_path, width)
    except Exception: return False

# ----- OCR fallback -----
def _do_ocr_text(path, max_chars):
    images = pdf2image.convert_from_path(path, dpi=200, first_page=1, last_page=2)
    text = ''
    for img in images:
        text += ' ' + (pytesseract.image_to_string(img) or '')
        if len(text) > max_chars: break
    return re.sub(r'\s+', ' ', text).strip()[:max_chars]

def ocr_pdf(path, max_chars=600):
    if not HAS_OCR: return ''
    try: return with_timeout(OCR_FILE_TIMEOUT, _do_ocr_text, path, max_chars)
    except Exception: return ''

# ----- EPUB helpers -----
def _read_epub_metadata(z):
    """Return (title, creator, cover_path_in_zip) from EPUB OPF."""
    try:
        container = z.read('META-INF/container.xml').decode('utf-8', errors='ignore')
    except KeyError:
        return None, None, None
    m = re.search(r'full-path="([^"]+)"', container)
    if not m: return None, None, None
    opf_path = m.group(1)
    try:
        opf = z.read(opf_path).decode('utf-8', errors='ignore')
    except KeyError:
        return None, None, None
    title = re.search(r'<dc:title[^>]*>([^<]+)</dc:title>', opf)
    creator = re.search(r'<dc:creator[^>]*>([^<]+)</dc:creator>', opf)
    # Find cover image
    cover_path = None
    cover_id = None
    cm = re.search(r'<meta[^>]+name="cover"[^>]+content="([^"]+)"', opf)
    if cm: cover_id = cm.group(1)
    if cover_id:
        cm2 = re.search(rf'<item[^>]+id="{re.escape(cover_id)}"[^>]+href="([^"]+)"', opf)
        if cm2:
            cover_rel = cm2.group(1)
            opf_dir = os.path.dirname(opf_path)
            cover_path = os.path.join(opf_dir, cover_rel).replace('\\', '/')
    if not cover_path:
        # Heuristic: find a JPG/PNG in the manifest with "cover" in name
        for m2 in re.finditer(r'<item[^>]+href="([^"]+\.(?:jpe?g|png))"', opf, re.I):
            href = m2.group(1)
            if 'cover' in href.lower():
                opf_dir = os.path.dirname(opf_path)
                cover_path = os.path.join(opf_dir, href).replace('\\', '/')
                break
    return (title.group(1).strip() if title else None,
            creator.group(1).strip() if creator else None,
            cover_path)

def _do_epub(path, out_thumb_path, width=240, max_chars=600):
    """Returns (snippet, has_cover, title, author)."""
    snippet = ''; has_cover = False; title = None; author = None
    with zipfile.ZipFile(path, 'r') as z:
        title, author, cover_path = _read_epub_metadata(z)
        # Cover image
        if cover_path and not os.path.exists(out_thumb_path):
            try:
                img_bytes = z.read(cover_path)
                from PIL import Image
                img = Image.open(io.BytesIO(img_bytes))
                if img.mode != 'RGB': img = img.convert('RGB')
                # resize to width preserving aspect
                w, h = img.size
                new_h = int(h * (width / max(w, 1)))
                img = img.resize((width, new_h), Image.LANCZOS)
                img.save(out_thumb_path, 'JPEG', quality=72)
                has_cover = True
            except Exception:
                pass
        elif os.path.exists(out_thumb_path):
            has_cover = True

        # Find first content document, extract text
        try:
            container = z.read('META-INF/container.xml').decode('utf-8', errors='ignore')
            m = re.search(r'full-path="([^"]+)"', container)
            if m:
                opf = z.read(m.group(1)).decode('utf-8', errors='ignore')
                opf_dir = os.path.dirname(m.group(1))
                # spine first
                spine_ids = re.findall(r'<itemref[^>]+idref="([^"]+)"', opf)
                manifest = {im.group(1): im.group(2)
                            for im in re.finditer(r'<item[^>]+id="([^"]+)"[^>]+href="([^"]+)"', opf)}
                for sid in spine_ids[:5]:  # try first 5 spine items
                    href = manifest.get(sid)
                    if not href: continue
                    full = os.path.join(opf_dir, href).replace('\\', '/')
                    try:
                        content = z.read(full).decode('utf-8', errors='ignore')
                    except KeyError:
                        continue
                    text = html_to_text(content)
                    if len(text) > 100:
                        snippet = text[:max_chars]
                        break
        except Exception:
            pass
    return snippet, has_cover, title, author

def safe_epub(path, out_thumb_path, width=240, max_chars=600):
    try:
        return with_timeout(PER_FILE_TIMEOUT, _do_epub, path, out_thumb_path, width, max_chars)
    except Exception:
        return '', os.path.exists(out_thumb_path), None, None

def walk_library():
    entries = []
    for top in sorted(os.listdir(LIB)):
        if top.startswith('.'): continue
        if top in EXCLUDE_TOP and top not in INCLUDE_TOP_OVERRIDE:
            continue
        top_path = os.path.join(LIB, top)
        if not os.path.isdir(top_path): continue
        for root, dirs, files in os.walk(top_path):
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            for f in files:
                if f.startswith('.'): continue
                full = os.path.join(root, f)
                rel = os.path.relpath(full, LIB)
                parts = rel.split(os.sep)
                theme = parts[0]
                sub = parts[1] if len(parts) > 2 else ''
                try: st = os.stat(full)
                except OSError: continue
                entries.append({'rel': rel, 'abs': full, 'theme': theme,
                                 'sub': sub, 'name': f,
                                 'size': st.st_size, 'mtime': int(st.st_mtime)})
    return entries

def load_progress():
    if os.path.exists(PROGRESS_JSON):
        try:
            with open(PROGRESS_JSON) as fh: return json.load(fh)
        except Exception: return {}
    return {}

def save_progress(progress):
    try:
        with open(PROGRESS_JSON, 'w') as fh: json.dump(progress, fh)
    except Exception: pass

def main():
    t0 = time.time()
    print('\nWalking Library/ ...')
    entries = walk_library()
    print(f'Found {len(entries)} files')

    progress = load_progress()
    if progress: print(f'Resuming — {len(progress)} files already processed.')

    pdf_texts = []
    pdf_indices = []
    n_skipped_size = n_timeouts = n_ocr = 0
    n_processed = 0

    print('\nProcessing files ...')
    for i, e in enumerate(entries):
        ext = os.path.splitext(e['name'])[1].lower()
        e['ext'] = ext
        e['id'] = make_id(e['rel'])
        e['year'] = extract_year(e['name'])
        e['author'] = extract_author(e['name'])
        e['has_cover'] = False
        e['snippet'] = ''

        if e['id'] in progress:
            cached = progress[e['id']]
            e['has_cover'] = cached.get('has_cover', False)
            e['snippet'] = cached.get('snippet', '')
            e['author'] = cached.get('author') or e['author']
            e['lang'] = cached.get('lang') or detect_language(e['name'], e['snippet'])
            if ext == '.pdf' or ext == '.epub':
                pdf_texts.append(e['name'] + ' ' + (e['snippet'] or ''))
                pdf_indices.append(i)
            n_processed += 1
            continue

        cover_path = os.path.join(THUMBS, f"{e['id']}.jpg")

        if ext == '.pdf':
            if e['size'] > MAX_FILE_SIZE:
                n_skipped_size += 1
                e['snippet'] = '[file too large]'
            else:
                snippet = safe_pdf_text(e['abs'])
                if snippet == '[timed out]':
                    n_timeouts += 1
                    e['snippet'] = ''
                elif snippet == '[encrypted]':
                    e['snippet'] = ''
                else:
                    e['snippet'] = snippet
                # OCR fallback if no text and OCR available
                if not e['snippet'] and HAS_OCR and e['size'] < 30 * 1024 * 1024:
                    ocr_text = ocr_pdf(e['abs'])
                    if ocr_text:
                        e['snippet'] = ocr_text
                        n_ocr += 1
                if not os.path.exists(cover_path):
                    if render_pdf_cover(e['abs'], cover_path):
                        e['has_cover'] = True
                else:
                    e['has_cover'] = True
            pdf_texts.append(e['name'] + ' ' + e['snippet'])
            pdf_indices.append(i)

        elif ext == '.epub':
            if e['size'] > MAX_FILE_SIZE:
                n_skipped_size += 1
            else:
                snippet, has_cover, title, author = safe_epub(e['abs'], cover_path)
                e['snippet'] = snippet
                e['has_cover'] = has_cover
                if author and not e['author']: e['author'] = author
            pdf_texts.append(e['name'] + ' ' + (e['snippet'] or ''))
            pdf_indices.append(i)

        e['lang'] = detect_language(e['name'], e['snippet'])

        progress[e['id']] = {
            'has_cover': e['has_cover'],
            'snippet': e['snippet'],
            'author': e['author'],
            'lang': e['lang'],
        }
        n_processed += 1

        if (i + 1) % 50 == 0:
            save_progress(progress)
            elapsed = time.time() - t0
            rate = (i + 1) / max(elapsed, 0.001)
            eta = (len(entries) - i - 1) / max(rate, 0.001)
            print(f'  {i+1}/{len(entries)}  {rate:.1f}/s  eta {eta:.0f}s'
                  f'  (size-skipped {n_skipped_size}, timeouts {n_timeouts}, OCR {n_ocr})')

    save_progress(progress)

    print('\nComputing TF-IDF keywords ...')
    if pdf_texts:
        try:
            vec = TfidfVectorizer(
                max_features=5000, stop_words='english',
                ngram_range=(1, 2), min_df=2, max_df=0.5,
                token_pattern=r"[A-Za-z][A-Za-z\-']{2,}",
            )
            mat = vec.fit_transform(pdf_texts)
            terms = vec.get_feature_names_out()
            for row_idx, ent_idx in enumerate(pdf_indices):
                row = mat[row_idx].toarray().flatten()
                top_n = row.argsort()[-8:][::-1]
                kws = [terms[t] for t in top_n if row[t] > 0]
                entries[ent_idx]['keywords'] = kws
        except Exception as ex:
            print(f'TF-IDF failed: {ex}')
    for e in entries:
        e.setdefault('keywords', [])
        e.setdefault('lang', detect_language(e['name'], e.get('snippet','')))

    themes = {}
    for e in entries:
        t = e['theme']
        themes.setdefault(t, {'total': 0, 'subs': {}})
        themes[t]['total'] += 1
        s = e['sub'] or '(root)'
        themes[t]['subs'].setdefault(s, 0)
        themes[t]['subs'][s] += 1

    out_entries = [{
        'id': e['id'], 'name': e['name'], 'theme': e['theme'], 'sub': e['sub'],
        'rel': e['rel'], 'abs': e['abs'], 'ext': e['ext'],
        'size': e['size'], 'mtime': e['mtime'], 'lang': e['lang'],
        'year': e['year'], 'author': e['author'],
        'snippet': e['snippet'], 'keywords': e['keywords'],
        'has_cover': e['has_cover'],
    } for e in entries]

    catalog = {
        'generated_at': int(time.time()),
        'lib_root': LIB,
        'total': len(out_entries),
        'themes': themes,
        'files': out_entries,
    }
    with open(CATALOG_JSON, 'w') as fh:
        json.dump(catalog, fh, ensure_ascii=False)
    with open(CATALOG_JS, 'w') as fh:
        fh.write('window.CATALOG = ')
        json.dump(catalog, fh, ensure_ascii=False)
        fh.write(';\n')

    elapsed = time.time() - t0
    print(f'\nDONE in {elapsed:.0f}s')
    print(f'  Files catalogued: {len(out_entries)}')
    print(f'  Files with covers: {sum(1 for e in out_entries if e["has_cover"])}')
    print(f'  Files with snippets: {sum(1 for e in out_entries if e["snippet"])}')
    print(f'  OCR-rescued: {n_ocr}')
    print(f'  Themes: {len(themes)}')
    print(f'  Files skipped for size: {n_skipped_size}')
    print(f'  Files timed out: {n_timeouts}')
    print(f'\nOutput: {CATALOG_JSON}')

if __name__ == '__main__':
    main()
