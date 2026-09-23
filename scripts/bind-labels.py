#!/usr/bin/env python3
"""
Bind every <label> to the control it sits in front of.

    python3 scripts/bind-labels.py            # report, change nothing
    python3 scripts/bind-labels.py --write     # add the for= attributes

These pages were written as `<label>Text</label><input id="x">`, which looks
right, reads right and gives the input no accessible name at all: a label
associates with a control only when it wraps it or carries a matching `for`.
axe reported 226 such inputs and 48 such selects across 21 tools, every one of
them announced by a screen reader as an unnamed edit field.

THE TRAP IN WRITING THIS, because it bit once and produced a worse bug than
the one being fixed. A pattern of the shape

    <label ...>  TEXT  </label>  whitespace  <input id="x">

backtracks. If the control does not follow the first `</label>`, the regex
extends TEXT across that `</label>`, across whatever markup comes next, and
across the NEXT `<label>`, then matches the control after that one. The result
is a `for` on the wrong opening tag, pointing at a control two elements away,
and the markup is otherwise byte-identical so nothing looks wrong. It happened
in causal-workbench, where an event-window label came out claiming
`for="esKind"`, which is the estimator dropdown below it.

So TEXT here may not contain `<label` or `</label>`. A label that is not
immediately followed by its control is left alone and reported, because those
need a human decision about what the control is actually called.
"""

import pathlib
import re
import sys

SKIP = {'node_modules', 'docs', 'aicc_analysis', 'fonts', '.git'}

# TEXT excludes any further label tag, which is what stops the backtrack above.
PAIR = re.compile(
    r'(<label(?![^>]*\bfor=)([^>]*)>)'          # 1: opening tag, 2: its attributes
    r'((?:(?!</?label\b)[\s\S]){0,400}?)'       # 3: the label's own text only
    r'(</label>)'                               # 4
    r'(\s*)'                                    # 5: whitespace only, or they are not a pair
    r'(<(?:input|select|textarea)\b([^>]*))(>)' # 6,7: the control, 8
    , re.I)
HAS_ID = re.compile(r'\bid="([^"]+)"')


def pages():
    for p in sorted(pathlib.Path('.').rglob('*.html')):
        if not any(part in SKIP for part in p.parts):
            yield p


def main():
    write = '--write' in sys.argv
    bound = unbound = 0
    for p in pages():
        s = p.read_text()
        out, pos, n = [], 0, 0
        for m in PAIR.finditer(s):
            mid = HAS_ID.search(m.group(7))
            if not mid or m.group(5).strip():
                continue
            out.append(s[pos:m.start(1)])
            out.append('<label for="%s"%s>' % (mid.group(1), m.group(2)))
            out.append(m.group(3) + m.group(4) + m.group(5) + m.group(6) + m.group(8))
            pos = m.end(8)
            n += 1
        left = len(re.findall(r'<label(?![^>]*\bfor=)', s, re.I)) - n
        if n and write:
            out.append(s[pos:])
            p.write_text(''.join(out))
        if n or left:
            print('%-44s bind %3d   still unbound %3d' % (p, n, left))
        bound += n
        unbound += left
    print('\n%d label(s) bound, %d left for a human to name.' % (bound, unbound))
    print('(dry run; pass --write to apply)' if not write else '(written)')


main()
