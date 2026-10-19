#!/usr/bin/env python3
"""Verify every pinned subresource against the file the CDN actually serves,
and find links that have rotted.

    python3 scripts/subresources.py          # both
    python3 scripts/subresources.py --hashes # only the integrity hashes
    python3 scripts/subresources.py --links  # only the link crawl

Why this is not in scripts/check.py

check.py is static and runs on every push. This one talks to a dozen
third-party hosts, takes minutes and goes wrong when somebody else's server
is having a bad morning. A job like that cancelled by its own timeout takes
the whole run with it, so it lives in its own scheduled workflow and never
gates a pull request.

What each half catches

check.py proves an integrity attribute is present. Present is not correct. A
version bumped in the URL with the old hash left behind, or a CDN that
rebuilds a file under the same path, both end with a browser refusing the
script. The page then renders exactly as designed and the tool does nothing,
which is what flipbook did for as long as it existed. Only a fetch can tell
you the hash still matches, so this fetches.

The link crawl covers the court circulars, the gazette notifications and the
statute pages the tools cite. Those are the citations a reader follows to
check a number, and a government PDF that has moved takes the tool's evidence
with it.

What counts as a failure

A hash that does not match the bytes served is always a failure. For links,
only 404 and 410 are: a page that is gone is gone. A 403 or a 429 is bot
protection or a rate limit rather than evidence of rot, and a timeout is
somebody's server, so those are reported and do not fail the run. A gate that
goes red because a ministry's website is slow is a gate that gets deleted.
"""

import base64
import hashlib
import os
import re
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AGENT = 'Mozilla/5.0 (compatible; Experiments link check; +https://idealogworks.foo/)'
TIMEOUT = 45
SKIP_HOSTS = ('fonts.googleapis.com', 'fonts.gstatic.com')

failures = []
notes = []


def pages():
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in {'.git', 'node_modules', 'scripts'}]
        for n in files:
            if n.endswith('.html'):
                yield os.path.relpath(os.path.join(base, n), ROOT)


def read(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as fh:
        return fh.read()


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': AGENT})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.status, r.read()


def check_hashes():
    tags = []
    for f in pages():
        for m in re.finditer(r'<(?:script|link)\b[^>]*>', read(f), re.I):
            tag = m.group(0)
            url = re.search(r'\b(?:src|href)=["\'](https?://[^"\']+)', tag, re.I)
            got = re.search(r'\bintegrity=["\']([^"\']+)', tag, re.I)
            if url and got:
                tags.append((f, url.group(1), got.group(1).strip()))

    print('Pinned subresources: %d' % len(tags))
    for f, url, want in sorted(set(tags)):
        algo = want.split('-', 1)[0].lower()
        if algo not in ('sha256', 'sha384', 'sha512'):
            failures.append('%s: unknown hash algorithm %r for %s' % (f, algo, url))
            continue
        try:
            status, body = fetch(url)
        except Exception as e:                      # noqa: BLE001 - reported, not raised
            notes.append('%s: could not fetch %s (%s)' % (f, url, e))
            print('  ?    %s' % url)
            continue
        digest = base64.b64encode(hashlib.new(algo, body).digest()).decode()
        if '%s-%s' % (algo, digest) == want:
            print('  ok   %s' % url)
        else:
            failures.append('%s: %s serves a different file.\n'
                            '        page: %s\n'
                            '        file: %s-%s' % (f, url, want, algo, digest))
            print('  FAIL %s' % url)


def check_links():
    links = set()
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in {'.git', 'node_modules'}]
        for n in files:
            if not n.endswith(('.html', '.md')):
                continue
            rel = os.path.relpath(os.path.join(base, n), ROOT)
            for m in re.finditer(r'href=["\'](https?://[^"\'#]+)', read(rel), re.I):
                u = m.group(1)
                if not any(h in u for h in SKIP_HOSTS):
                    links.add((u, rel))

    by_url = {}
    for u, f in links:
        by_url.setdefault(u, set()).add(f)

    print('\nExternal links: %d' % len(by_url))
    for url in sorted(by_url):
        where = ', '.join(sorted(by_url[url])[:3])
        code = None
        for _ in range(2):
            try:
                code = fetch(url)[0]
                break
            except urllib.error.HTTPError as e:
                code = e.code
                if code not in (429, 500, 502, 503, 504):
                    break
            except Exception:                        # noqa: BLE001 - retried, then noted
                code = None
        if code and 200 <= code < 400:
            continue
        if code in (404, 410):
            failures.append('%s is %d, cited in %s' % (url, code, where))
            print('  GONE %s  (%s)' % (url, where))
        else:
            notes.append('%s answered %s, cited in %s' % (url, code or 'nothing', where))
            print('  ?    %s answered %s' % (url, code or 'nothing'))


def main():
    args = set(sys.argv[1:])
    if not args or '--hashes' in args:
        check_hashes()
    if not args or '--links' in args:
        check_links()

    if notes:
        print('\nNot checked (%d). These are not evidence of rot.' % len(notes))
        for n in notes:
            print('  - %s' % n)

    if failures:
        print('\nFAIL: %d' % len(failures))
        for f in failures:
            print('  - %s' % f)
        return 1
    print('\nPASS: every pinned hash matches, and no cited page is gone.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
