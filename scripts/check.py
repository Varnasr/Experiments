#!/usr/bin/env python3
"""Static checks for the Experiments site.

    python3 scripts/check.py

No network and no dependencies. Before 2026-09-22 the only workflow here
deployed to GitHub Pages and validated nothing, so none of the invariants
below were checked by anything.

The Content-Security-Policy in `netlify.toml` is the thing worth getting
right, because every way it can be wrong is silent. Too tight and the script
does not load, the chart does not draw, and only the browser console says
why. Too loose and the policy is a decoration. Sibling repositories split out
of this one carry the same warning in their own CLAUDE.md files.
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Origins the policy allows that appear in no source file, kept on purpose.
# A stale entry fails too, so this list cannot rot into a blindfold.
ALLOWED_UNREFERENCED = {
    'https://tessdata.projectnaptha.com':
        "tesseract.js fetches its Hindi traineddata from here at runtime. "
        "court-translator calls Tesseract.createWorker('hin', 1, {...}) with no "
        "explicit langPath, so the URL is built inside the library and the host "
        "appears in no file here. Removing it breaks OCR on scanned PDFs with "
        "nothing on the page to show it.",
}

# Origins whose subresources cannot carry an integrity hash. A stale entry
# fails too, the same way ALLOWED_UNREFERENCED cannot rot into a blindfold.
NO_INTEGRITY = {
    'https://fonts.googleapis.com':
        "The stylesheet served here varies by user agent: the same URL answers "
        "woff2 to one browser and ttf to another, so its bytes differ between "
        "readers and no single hash matches them all. Pinning one would serve "
        "the page in a fallback typeface for everyone whose browser got the "
        "other answer. The font files themselves come from fonts.gstatic.com, "
        "fetched by that stylesheet rather than by a tag here.",
}

# Directories whose code runs on Netlify rather than in a browser. A CSP
# governs the page, not the server, so an origin a function calls does not
# belong in connect-src. api.sarvam.ai and api.groq.com are reached only from
# netlify/functions, which is why neither is in the policy and neither should be.
SERVER_SIDE = ('netlify/functions',)

errors = []
checks = 0


def check(name, ok, detail=''):
    global checks
    checks += 1
    if not ok:
        errors.append('%s: %s' % (name, detail))


def read(path):
    with open(os.path.join(ROOT, path), encoding='utf-8', errors='replace') as fh:
        return fh.read()


def walk(exts, skip_server=True):
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in {'.git', 'node_modules'}]
        rel_dir = os.path.relpath(dirpath, ROOT).replace('\\', '/')
        if skip_server and any(rel_dir == s or rel_dir.startswith(s + '/') for s in SERVER_SIDE):
            continue
        for f in filenames:
            if os.path.splitext(f)[1] in exts:
                rel = os.path.normpath(os.path.join(rel_dir, f)).replace('\\', '/')
                yield rel.lstrip('./')


def parse_csp(text):
    m = re.search(r'Content-Security-Policy\s*=\s*"(.*?)"', text, re.S)
    if not m:
        return None
    out = {}
    for part in m.group(1).split(';'):
        part = part.strip()
        if part:
            bits = part.split()
            out[bits[0]] = bits[1:]
    return out


def origin_of(url):
    return 'https://' + re.sub(r'^https?://', '', url).split('/')[0]


def permits(csp, directive, origin):
    srcs = csp.get(directive) or csp.get('default-src') or []
    for s in srcs:
        if s == origin or s == '*':
            return True
        if s.startswith('https://*.') and origin.startswith('https://') and origin.endswith(s[9:]):
            return True
    return False


def main():
    toml = read('netlify.toml')
    csp = parse_csp(toml)
    check('netlify.toml sets a Content-Security-Policy', csp is not None, 'no header found')
    if csp is None:
        return report()

    for directive in ('default-src', 'script-src', 'style-src', 'font-src',
                      'img-src', 'connect-src', 'object-src', 'base-uri', 'frame-ancestors'):
        check('the policy declares %s' % directive, directive in csp, 'absent')

    html = sorted(walk({'.html'}))
    check('there are pages to check', len(html) > 0, 'no HTML found')

    # ---------------------------------------------------- referenced origins
    # `window.open` is a top-level navigation, not a fetch, so connect-src does
    # not govern it. Matching a bare `.open(` reports it as a violation, which
    # is a false positive this check used to produce for https://docs.new in
    # littlek.
    referenced = {}

    def note(origin, directive, where):
        referenced.setdefault(origin, set()).add(directive)
        violations.append((where, directive, origin)) if not permits(csp, directive, origin) else None

    violations = []
    tag_rules = [
        (r'<script\b[^>]*\bsrc=["\'](https?://[^"\']+)', 'script-src'),
        (r'<link\b[^>]*\brel=["\']stylesheet["\'][^>]*\bhref=["\'](https?://[^"\']+)', 'style-src'),
        (r'<link\b[^>]*\bhref=["\'](https?://[^"\']+)[^>]*\brel=["\']stylesheet["\']', 'style-src'),
        (r'<img\b[^>]*\bsrc=["\'](https?://[^"\']+)', 'img-src'),
        (r'<iframe\b[^>]*\bsrc=["\'](https?://[^"\']+)', 'frame-src'),
    ]
    for f in html:
        body = read(f)
        for pattern, directive in tag_rules:
            for m in re.finditer(pattern, body, re.I):
                note(origin_of(m.group(1)), directive, f)

    for f in sorted(walk({'.html', '.js'})):
        body = read(f)
        for m in re.finditer(r'\bfetch\s*\(\s*[\'"`](https?://[^\'"`]+)', body):
            note(origin_of(m.group(1)), 'connect-src', f)
        for m in re.finditer(r'\bnew\s+EventSource\s*\(\s*[\'"`](https?://[^\'"`]+)', body):
            note(origin_of(m.group(1)), 'connect-src', f)

    check('every origin a page loads is permitted by the policy', not violations,
          '; '.join('%s wants %s for %s' % (w, d, o) for w, d, o in violations[:6]))

    # Fonts span two directives, which is a common way to end up in a fallback
    # typeface: the stylesheet is style-src, the font files are font-src.
    if any('fonts.googleapis.com' in o for o in referenced):
        check('fonts.gstatic.com is in font-src alongside the stylesheet origin',
              permits(csp, 'font-src', 'https://fonts.gstatic.com'),
              'the stylesheet loads but every face falls back')

    # ------------------------------------------------------ unused origins
    blob = ''.join(read(f) for f in walk({'.html', '.js', '.css'}, skip_server=False))
    unused = []
    for directive, srcs in csp.items():
        for s in srcs:
            if not s.startswith('https://'):
                continue
            needle = s[10:] if s.startswith('https://*.') else s[8:]
            if needle not in blob and s not in ALLOWED_UNREFERENCED:
                unused.append('%s in %s' % (s, directive))
    check('the policy allows no origin the site never uses', not unused,
          '%d: %s' % (len(unused), unused[:8]))

    stale = [s for s in ALLOWED_UNREFERENCED
             if (s[10:] if s.startswith('https://*.') else s[8:]) in blob
             or not any(s in srcs for srcs in csp.values())]
    check('no exemption outlived its reason', not stale,
          '%s is now referenced or no longer in the policy, so remove it from '
          'ALLOWED_UNREFERENCED' % stale)

    # -------------------------------------------- inline handlers and CSP
    # These work only because script-src carries 'unsafe-inline'. Tighten that
    # to a nonce or a hash and every one of them stops firing, with nothing on
    # the page to show it.
    inline = {}
    for f in html:
        n = len(re.findall(r'\son(?:click|change|input|submit|load|error|keyup|keydown|mouseover)\s*=', read(f)))
        if n:
            inline[f] = n
    if inline:
        check("script-src still carries 'unsafe-inline' for the %d inline handlers"
              % sum(inline.values()),
              "'unsafe-inline'" in csp.get('script-src', []),
              'handlers in %s would silently stop firing' % sorted(inline))

    # ------------------------------------------------------------ the pages
    for f in html:
        body = read(f)
        check('%s sets a viewport' % f,
              re.search(r'<meta[^>]*name=["\']?viewport', body, re.I) is not None,
              'a phone lays the page out at desktop width and zooms out')

    # A tool with no link from the index is unreachable except by URL.
    index = read('index.html')
    tools = sorted({f.split('/')[0] for f in html if '/' in f and f.endswith('index.html')})
    unlinked = [t for t in tools if t not in index]
    check('every tool is linked from the index', not unlinked,
          '%s reachable only by typing the URL' % unlinked)

    # The number of tools, stated in prose, against the number on disk.
    # CLAUDE.md opened with "Twenty-three browser tools" while 21 directories
    # held an index.html and index.html linked 21 of them. The 23 was the count
    # of HTML files, which includes the landing page and 404.html. A number
    # written in prose that nothing compares is how every one of these
    # repositories has drifted.
    WORDS = {20: 'Twenty', 21: 'Twenty-one', 22: 'Twenty-two', 23: 'Twenty-three',
             24: 'Twenty-four', 25: 'Twenty-five', 26: 'Twenty-six',
             27: 'Twenty-seven', 28: 'Twenty-eight', 29: 'Twenty-nine', 30: 'Thirty',
             31: 'Thirty-one', 32: 'Thirty-two', 33: 'Thirty-three', 34: 'Thirty-four',
             35: 'Thirty-five'}
    claude = read('CLAUDE.md')
    stated = re.search(r'^(\w+(?:-\w+)?) browser tools', claude, re.M)
    check('CLAUDE.md states how many tools there are', stated is not None,
          'the opening line no longer says "<N> browser tools"')
    if stated:
        check('the stated tool count matches the tools on disk',
              stated.group(1) == WORDS.get(len(tools), ''),
              'CLAUDE.md says %s, there are %d' % (stated.group(1), len(tools)))

    # ------------------------------------------- subresource integrity
    # Four scripts here are fetched from a CDN and run with the page's own
    # privileges, and the page carries 'unsafe-inline', so nothing else is in
    # the way of a CDN that serves different bytes than it served yesterday.
    #
    # The silent half matters more than the supply-chain half. An integrity
    # attribute pins a URL to one exact file, so bumping the version in the
    # URL and leaving the old hash makes the browser refuse the script. The
    # tool then renders perfectly and does nothing, the way flipbook did, and
    # the only evidence is a console line nobody is reading.
    #
    # Whether a hash is the right one for the file the CDN holds needs a
    # network, and lives in .github/workflows/subresources.yml. This check
    # tells you a hash is there to be checked at all.
    missing = []
    for f in html:
        body = read(f)
        for m in re.finditer(r'<(script|link)\b[^>]*>', body, re.I):
            tag = m.group(0)
            url = re.search(r'\b(?:src|href)=["\'](https?://[^"\']+)', tag, re.I)
            if not url:
                continue
            if m.group(1).lower() == 'link' and not re.search(r'rel=["\']?stylesheet', tag, re.I):
                continue
            origin = origin_of(url.group(1))
            if origin in NO_INTEGRITY:
                continue
            if not re.search(r'\bintegrity=', tag, re.I):
                missing.append('%s: %s has no integrity' % (f, origin))
            elif not re.search(r'\bcrossorigin=', tag, re.I):
                missing.append('%s: %s has integrity but no crossorigin' % (f, origin))
    check('every external script and stylesheet is pinned by integrity',
          not missing, '; '.join(missing))

    # An exemption for an origin no page loads any more is a blindfold.
    loaded = {origin_of(m.group(1))
              for f in html
              for m in re.finditer(
                  r'<(?:script|link)\b[^>]*\b(?:src|href)=["\'](https?://[^"\']+)',
                  read(f), re.I)}
    check('no integrity exemption outlived its reason',
          all(o in loaded for o in NO_INTEGRITY),
          '%s no longer loaded by any page' % sorted(set(NO_INTEGRITY) - loaded))

    # A meta CSP and a header CSP are enforced as an intersection, so a meta
    # tag here would quietly govern instead of the header.
    metas = [f for f in html if re.search(r'http-equiv=["\']?Content-Security-Policy', read(f), re.I)]
    check('no page carries its own meta CSP', not metas,
          '%s would be intersected with the header, and the tighter one wins' % metas)

    # ------------------------------------------------- the landing page
    # The landing page states numbers and makes a privacy claim, and before
    # 2026-11-10 nothing compared either with the tools. It said "Four public
    # APIs, and only four" and "Nothing you type in leaves your browser" while
    # library-builder called Open Library, court-translator sent the text of a
    # petition to a translation service, and the policy in netlify.toml allowed
    # both. The tool count and the year were written by a script, so a reader
    # or a crawler without JavaScript saw "0 tools" and "2025".
    cards = re.findall(r'<article class="card" id="([^"]+)">(.*?)</article>', index, re.S)
    stated = re.search(r'<b id="nTools">(\d+)</b>', index)
    check('the tool count on the landing page matches its cards and the tools on disk',
          stated is not None and int(stated.group(1)) == len(cards) == len(tools),
          'the page says %s, has %d cards, and %d tools are on disk'
          % (stated.group(1) if stated else 'nothing', len(cards), len(tools)))

    # Every card says when the tool was last changed and what it does not do.
    bare = [cid for cid, body in cards
            if not re.search(r'<p class="dates">First committed [A-Z][a-z]+ \d{4}(, last changed [A-Z][a-z]+ \d{4})?\.</p>', body)
            or not re.search(r'<div class="limits"><b>Known limits\.</b> \S', body)
            or 'class="l"' not in body]
    check('every card carries its dates and its known limits', not bare,
          '%s lack a dates line, a limits panel or the button that opens it' % bare)

    # The year in the footer is the latest year on any card. The script still
    # writes the current year over it, so this is what a reader without
    # JavaScript sees, and it cannot be older than the newest change.
    years = [int(y) for y in re.findall(r'<p class="dates">[^<]*?(\d{4})\.</p>', index)]
    foot = re.search(r'<span id="year">(\d{4})</span>', index)
    check('the year in the footer is the year of the latest change on a card',
          foot is not None and years and int(foot.group(1)) == max(years),
          'the footer says %s, the cards run to %s'
          % (foot.group(1) if foot else 'nothing', max(years) if years else 'nothing'))

    # The public data APIs the page counts and names, against the ones the
    # policy lets a page reach. Every connect-src origin is either one of these
    # or is listed here as something else, so a new origin cannot arrive
    # without the page's sentence being read again.
    DATA_APIS = {
        'World Bank indicators': 'https://api.worldbank.org/v2',
        'Poverty and Inequality Platform': 'https://api.worldbank.org/pip',
        'DHS Program': 'https://api.dhsprogram.com',
        'Open-Meteo': 'open-meteo.com',
        'Open Library': 'https://openlibrary.org',
    }
    NOT_DATA = {"'self'", 'https://varnasr-experiments.netlify.app', 'https://cdnjs.cloudflare.com',
                'https://cdn.jsdelivr.net', 'https://tessdata.projectnaptha.com'}
    blob = '\n'.join(read(f) for f in html if f != 'index.html')
    live = sorted(name for name, needle in DATA_APIS.items() if needle in blob)
    unknown = [o for o in csp.get('connect-src', []) if o not in NOT_DATA
               and not any(origin_of(n) == o or (not n.startswith('https://') and o.endswith(n))
                           for n in DATA_APIS.values())]
    check('every origin a page may reach is a named data API or a known exception', not unknown,
          '%s is in connect-src and is neither; name it on the landing page or list it in NOT_DATA' % unknown)
    WORDS_N = {3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight'}
    tile = re.search(r'<b id="nApis">(\d+)</b>', index)
    prose = re.search(r'<b>Live where it should be</b>(\w+) public data APIs: ([^.]*)\.', index)
    check('the number of public data APIs on the landing page matches the tools',
          tile is not None and prose is not None and int(tile.group(1)) == len(live)
          and prose.group(1) == WORDS_N.get(len(live)),
          'the tools call %d (%s); the tile says %s and the method says %s'
          % (len(live), ', '.join(live), tile.group(1) if tile else 'nothing',
             prose.group(1) if prose else 'nothing'))
    if prose:
        unnamed = [n for n in live if n not in prose.group(2)]
        check('the method names every public data API the tools call', not unnamed,
              '%s is called by a tool and not named' % unnamed)

    # A tool that sends what the reader typed to a server must be named in the
    # paragraph that says what leaves the browser. The site's own functions
    # and Open Library are the routes out; a page that uses one is matched to
    # its card title.
    SENDS = {'court-translator': 'Court Petition Translator', 'library-builder': 'Household Library Builder',
             'littlek': "Little K Learn &amp; Play"}
    out = sorted({f.split('/')[0] for f in html if '/' in f
                  and re.search(r'\.netlify/functions/(?!push-)|openlibrary\.org', read(f))})
    para = re.search(r'<p>Most of these tools compute in the page.*?</p>', index, re.S)
    missing = [t for t in out if para is None or SENDS.get(t, '\0') not in para.group(0)]
    check('the landing page names every tool that sends what the reader types to a server',
          para is not None and not missing,
          '%s calls a function or Open Library and the paragraph does not name it' % (missing or 'no paragraph found'))
    check('the landing page does not say that nothing leaves the browser',
          not re.search(r'[Nn]othing you type (in )?leaves', index), 'the old sentence is back')

    return report()


def report():
    if errors:
        print('FAIL: %d of %d checks' % (len(errors), checks))
        for e in errors:
            print('  - %s' % e)
        return 1
    print('PASS: %d checks' % checks)
    return 0


if __name__ == '__main__':
    sys.exit(main())
