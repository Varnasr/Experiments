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
    # kundendu-worksheets.
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
             24: 'Twenty-four', 25: 'Twenty-five', 26: 'Twenty-six'}
    claude = read('CLAUDE.md')
    stated = re.search(r'^(\w+(?:-\w+)?) browser tools', claude, re.M)
    check('CLAUDE.md states how many tools there are', stated is not None,
          'the opening line no longer says "<N> browser tools"')
    if stated:
        check('the stated tool count matches the tools on disk',
              stated.group(1) == WORDS.get(len(tools), ''),
              'CLAUDE.md says %s, there are %d' % (stated.group(1), len(tools)))

    # A meta CSP and a header CSP are enforced as an intersection, so a meta
    # tag here would quietly govern instead of the header.
    metas = [f for f in html if re.search(r'http-equiv=["\']?Content-Security-Policy', read(f), re.I)]
    check('no page carries its own meta CSP', not metas,
          '%s would be intersected with the header, and the tighter one wins' % metas)

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
