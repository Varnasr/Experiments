#!/usr/bin/env python3
"""Link previews, search tags and a share row for every page, from one file.

    python3 scripts/seo.py           # write the blocks, sitemap.xml, robots.txt
    python3 scripts/seo.py --check   # fail if any of them is stale (CI)

scripts/seo/tools.json is the source: each tool's name, a one-line tagline and,
for the two apps that own a domain of their own, their canonical address.
Everything else is derived:

- a block in each page's <head>, between <!-- seo:start --> and <!-- seo:end -->:
  canonical, Open Graph, Twitter card and JSON-LD, after the page's own
  <meta name="description">, which stays the text Google shows;
- a share row before the page's closing </body>, between <!-- share:start -->
  and <!-- share:end -->: WhatsApp, LinkedIn and X links carrying the tool's
  name, tagline and canonical address, and a Copy link button;
- sitemap.xml and robots.txt at the root.

The preview images in og/ come from scripts/seo/og-cards.mjs, which reads the
same file. Change a name or tagline, run both, commit both.

The canonical address matters more than it looks. The same files are served at
idealogworks.foo, varnasr.github.io/Experiments, littlek.in and alab.cloud, and
without one stated address a search engine picks for itself and can split a
page's ranking across all four. littlek.in and alab.cloud each serve one
children's app at their root (netlify.toml rewrites them), so those two apps
name their own domain and stay out of this site's sitemap.
"""
import html
import json
import re
import sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
CFG = json.loads((ROOT / 'scripts/seo/tools.json').read_text(encoding='utf-8'))
SITE = CFG['site']
ORIGIN = SITE['origin'].rstrip('/')

HEAD_RE = re.compile(r'\n?[ \t]*<!-- seo:start -->.*?<!-- seo:end -->', re.S)
SHARE_RE = re.compile(r'[ \t]*<!-- share:start -->.*?<!-- share:end -->\n?', re.S)
# The home page carried three hand-written Open Graph tags before this script.
OLD_OG_RE = re.compile(r'\n[ \t]*<meta property="og:(?:title|description|type)" content="[^"]*">')
DESC_RE = re.compile(r'<meta name="description" content="([^"]*)">')

# Inks and fills measured for WCAG AA: #382280 on #f5f1fa is 11.6:1 and on #fff
# 12.6:1. Fixed colours rather than the page's tokens, because the row sits on
# 22 pages with 22 palettes, some of them dark, and has to read on all of them.
CSS = (
    '.xshare{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;'
    'gap:.5rem .6rem;box-sizing:border-box;width:calc(100% - 2rem);max-width:960px;margin:2.5rem auto 5rem;'
    'padding:.85rem 1rem;background:#f5f1fa;border:1px solid #e6e3ec;border-radius:12px;'
    'font:600 15px/1.4 "Source Sans 3",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'
    'color:#382280;text-align:center}'
    '.xshare .xshare-t{margin-right:.25rem;color:#382280}'
    '.xshare .xshare-l{display:inline-flex;align-items:center;min-height:36px;margin:0;'
    'padding:.3rem .95rem;border:1px solid #572e91;border-radius:99px;background:#fff;'
    'color:#382280;font:inherit;text-decoration:underline;text-underline-offset:2px;'
    'cursor:pointer;box-shadow:none}'
    '.xshare .xshare-l:hover{background:#ece4f5}'
    '.xshare .xshare-l:focus-visible{outline:3px solid #ff9911;outline-offset:2px}'
    '.xshare [hidden]{display:none!important}'
    '@media print{.xshare{display:none}}'
)

# Copy link needs a script; without one the button stays hidden and the three
# links still work, because each is a plain address.
COPY_JS = (
    "(function(){var b=document.currentScript.parentNode.querySelector('[data-xshare-copy]');"
    "if(!b||!navigator.clipboard)return;b.hidden=false;var u=b.getAttribute('data-url');"
    "b.addEventListener('click',function(){navigator.clipboard.writeText(u).then(function(){"
    "b.textContent='Link copied';setTimeout(function(){b.textContent='Copy link';},2000);});});})();"
)


def a(s):
    return html.escape(s, quote=True)


def pages():
    yield {
        'path': ROOT / 'index.html', 'url': ORIGIN + '/', 'name': SITE['home_title'],
        'tagline': SITE['home_tagline'], 'image': f'{ORIGIN}/og/home.jpg', 'home': True,
    }
    for t in CFG['tools']:
        yield {
            'path': ROOT / t['dir'] / 'index.html',
            'url': t.get('canonical') or f"{ORIGIN}/{t['dir']}/",
            'name': t['name'], 'tagline': t['tagline'],
            'image': f"{ORIGIN}/og/{t['dir']}.jpg", 'home': False,
        }


def ld(p, desc):
    author = {'@type': 'Person', 'name': SITE['author']}
    if p['home']:
        data = {
            '@context': 'https://schema.org', '@type': 'WebSite', 'name': SITE['name'],
            'url': p['url'], 'description': desc, 'author': author, 'image': p['image'],
            'hasPart': [{'@type': 'WebApplication', 'name': t['name'],
                         'url': t.get('canonical') or f"{ORIGIN}/{t['dir']}/"} for t in CFG['tools']],
        }
    else:
        data = {
            '@context': 'https://schema.org', '@type': 'WebApplication', 'name': p['name'],
            'url': p['url'], 'description': desc, 'image': p['image'],
            'operatingSystem': 'Any', 'browserRequirements': 'Requires JavaScript',
            'isAccessibleForFree': True, 'author': author,
            'isPartOf': {'@type': 'WebSite', 'name': SITE['name'], 'url': ORIGIN + '/'},
        }
    # </ cannot end the script element early once escaped.
    return json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')


def head_block(p, desc):
    title = p['name']
    alt = f"{p['name']}: {p['tagline']}"
    tags = [
        f'<link rel="canonical" href="{a(p["url"])}">',
        '<meta property="og:type" content="website">',
        f'<meta property="og:site_name" content="{a(SITE["name"])}">',
        '<meta property="og:locale" content="en_IN">',
        f'<meta property="og:title" content="{a(title)}">',
        f'<meta property="og:description" content="{a(p["tagline"])}">',
        f'<meta property="og:url" content="{a(p["url"])}">',
        f'<meta property="og:image" content="{a(p["image"])}">',
        '<meta property="og:image:type" content="image/jpeg">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{a(alt)}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{a(title)}">',
        f'<meta name="twitter:description" content="{a(p["tagline"])}">',
        f'<meta name="twitter:image" content="{a(p["image"])}">',
        f'<script type="application/ld+json">{ld(p, desc)}</script>',
    ]
    if not p['home']:
        tags.append(f'<style>{CSS}</style>')
    return '\n<!-- seo:start -->\n' + '\n'.join(tags) + '\n<!-- seo:end -->'


def share_block(p):
    what = 'this tool'
    text = f"{p['name']}: {p['tagline']}"
    wa = 'https://wa.me/?text=' + quote(f"{text}\n{p['url']}", safe='')
    li = 'https://www.linkedin.com/sharing/share-offsite/?url=' + quote(p['url'], safe='')
    x = 'https://twitter.com/intent/tweet?text=' + quote(text, safe='') + '&url=' + quote(p['url'], safe='')
    return (
        '<!-- share:start -->\n'
        f'<aside class="xshare" aria-label="Share {what}">'
        f'<span class="xshare-t">Share {what}</span>'
        f'<a class="xshare-l" href="{a(wa)}" target="_blank" rel="noopener">WhatsApp</a>'
        f'<a class="xshare-l" href="{a(li)}" target="_blank" rel="noopener">LinkedIn</a>'
        f'<a class="xshare-l" href="{a(x)}" target="_blank" rel="noopener">X</a>'
        f'<button type="button" class="xshare-l" data-xshare-copy data-url="{a(p["url"])}" hidden>Copy link</button>'
        f'<script>{COPY_JS}</script>'
        '</aside>\n'
        '<!-- share:end -->\n'
    )


def render(p):
    src = p['path'].read_text(encoding='utf-8')
    out = HEAD_RE.sub('', src)
    out = SHARE_RE.sub('', out)
    if p['home']:
        out = OLD_OG_RE.sub('', out)
    m = DESC_RE.search(out)
    if not m:
        raise SystemExit(f"{p['path'].relative_to(ROOT)}: no <meta name=\"description\">, so no place to put the tags")
    desc = html.unescape(m.group(1))
    out = out[:m.end()] + head_block(p, desc) + out[m.end():]
    if not p['home']:
        # The last </body>, because three pages build HTML documents inside
        # their own scripts and carry the string earlier in the file.
        i = out.rfind('</body>')
        if i < 0 or out[i:].strip().replace('\n', '') not in ('</body></html>', '</body>'):
            raise SystemExit(f"{p['path'].relative_to(ROOT)}: the last </body> is not the end of the document")
        out = out[:i] + share_block(p) + out[i:]
    return out


def sitemap():
    urls = [ORIGIN + '/'] + [f"{ORIGIN}/{t['dir']}/" for t in CFG['tools'] if not t.get('canonical')]
    body = ''.join(f'  <url><loc>{html.escape(u)}</loc></url>\n' for u in urls)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + '</urlset>\n')


def robots():
    return f'User-agent: *\nAllow: /\n\nSitemap: {ORIGIN}/sitemap.xml\n'


def main():
    check = '--check' in sys.argv
    files = {p['path']: render(p) for p in pages()}
    files[ROOT / 'sitemap.xml'] = sitemap()
    files[ROOT / 'robots.txt'] = robots()
    for p in pages():
        img = ROOT / 'og' / Path(p['image']).name
        if not img.exists():
            raise SystemExit(f'{img.relative_to(ROOT)} is missing: run node scripts/seo/og-cards.mjs')
    stale = [f for f, s in files.items() if not f.exists() or f.read_text(encoding='utf-8') != s]
    if check:
        if stale:
            print('Stale, run python3 scripts/seo.py:')
            for f in stale:
                print('  ' + str(f.relative_to(ROOT)))
            sys.exit(1)
        print(f'OK: link previews, share rows, sitemap and robots.txt are current on {len(files) - 2} pages.')
        return
    for f in stale:
        f.write_text(files[f], encoding='utf-8')
        print('wrote', f.relative_to(ROOT))


if __name__ == '__main__':
    main()
