#!/usr/bin/env bash
# Fetch the page's webfonts into a local directory so the render tests can
# measure text in the face that actually ships.
#
#   bash tests/fetch-fonts.sh /some/dir
#   ALAB_FONTS=/some/dir node tests/mind-render.mjs
#
# This matters more than it looks. mind-render.mjs exists because SVG will not
# wrap, so the wrapping is measured in JS through a canvas context — and a
# measurement is only as good as the font it is taken in. Google Fonts is
# unreachable from CI and from the agent sandbox, so without this the test
# measures the system fallback, which is a wider face and therefore a
# conservative but different answer from what a real phone renders.
#
# Nothing here is committed: the files land wherever you point them, and the
# tests fall back to the system face (saying so) when the directory is absent.
set -euo pipefail
DIR="${1:-${ALAB_FONTS:-}}"
[ -n "$DIR" ] || { echo "usage: bash tests/fetch-fonts.sh <dir>" >&2; exit 2; }
mkdir -p "$DIR/fonts"

UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
# The same query the page asks for. Keep this line in step with the <link> in
# index.html, or the test measures a font the page does not use.
Q='family=Baloo+2:wght@600;700;800&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700;6..12,800&family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap'

curl -sS -A "$UA" "https://fonts.googleapis.com/css2?$Q" -o "$DIR/gf.css"
grep -c 'src: url' "$DIR/gf.css" >/dev/null || { echo "no @font-face rules came back" >&2; exit 1; }

python3 - "$DIR" <<'PY'
import io, os, re, subprocess, sys
d = sys.argv[1]
css = io.open(os.path.join(d, 'gf.css'), encoding='utf-8').read()
urls = sorted(set(re.findall(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', css)))
for u in urls:
    out = os.path.join(d, 'fonts', u.split('/')[-1])
    if not os.path.exists(out):
        subprocess.run(['curl', '-sS', '-o', out, u], check=True)
    css = css.replace(u, 'fonts/' + u.split('/')[-1])
io.open(os.path.join(d, 'gf-local.css'), 'w', encoding='utf-8').write(css)
print('%d font files, %d KB' % (len(urls), sum(
    os.path.getsize(os.path.join(d, 'fonts', f)) for f in os.listdir(os.path.join(d, 'fonts'))) // 1024))
PY
echo "fonts ready in $DIR"
