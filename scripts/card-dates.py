#!/usr/bin/env python3
"""Write the "first committed" and "last changed" months on each tool's card
in index.html, from the git history of that tool's directory.

    python3 scripts/card-dates.py           # rewrite index.html
    python3 scripts/card-dates.py --check   # fail if index.html is out of date

A date typed by hand goes stale the first time the tool is edited, so the
months come from git. Two things make the plain answer wrong and are handled
here.

A sweep is not a change to a tool. The contact line, the share row, the
contrast token and the label binding each touched every page in one commit;
counting those would give every tool the same "last changed" month, which
says nothing. A commit counts as a change to a tool only when it touches at
most SWEEP_LIMIT tool directories that already existed. A directory arriving
in the commit does not count toward that limit, because several tools have
arrived together in one commit, and on 2026-11-11 four arrived in a squash
merge that also changed the causal workbench: counting all five called it a
sweep and took the workbench's "last changed" month away.

The months are coarse on purpose. A squash merge is dated the day it lands
rather than the day the work was done, and a day-level date would fail the
check on every merge.

History is required. A shallow clone has no first commit to read, so the
script stops and says so; CI checks out the full history for this step.
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SWEEP_LIMIT = 4
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
          'August', 'September', 'October', 'November', 'December']
LINE_RE = re.compile(r'[ \t]*<p class="dates">.*?</p>\n')
CARD_RE = re.compile(r'<article class="card" id="[^"]+">.*?</article>', re.S)
HREF_RE = re.compile(r'<h3><a href="([a-z0-9-]+)/">')


def git(*args):
    return subprocess.run(['git', '-C', str(ROOT)] + list(args), check=True,
                          capture_output=True, text=True).stdout


def month(iso):
    y, m = iso.split('-')[:2]
    return f'{MONTHS[int(m) - 1]} {y}'


def history(tools):
    """{tool: (first, last)}. First is the earliest commit that touches the
    directory at all, because a tool can arrive in a commit that adds several.
    Last is the latest commit that touches at most SWEEP_LIMIT tool
    directories, and falls back to first when there is none."""
    if git('rev-parse', '--is-shallow-repository').strip() == 'true':
        raise SystemExit('card-dates: this clone is shallow, so the first commit of a tool cannot be read. '
                         'Fetch the full history (git fetch --unshallow) and run again.')
    out = git('log', '--no-merges', '--date=short', '--format=@%ad', '--name-only')
    every, own = {t: [] for t in tools}, {t: [] for t in tools}
    # A tool's directory can be renamed, and its history is then under the old
    # name. Git records the rename, so the old name is read from there and is
    # written nowhere in this file.
    was = {}
    for line in git('log', '--no-merges', '--diff-filter=R', '-M', '--name-status', '--format=').split('\n'):
        parts = line.split('\t')
        if len(parts) == 3 and '/' in parts[1] and '/' in parts[2]:
            old, new = parts[1].split('/')[0], parts[2].split('/')[0]
            if old != new and new in tools:
                was[old] = new
    # Oldest first, so that a directory seen for the first time is known to be
    # arriving. A commit that adds four tools and edits one other is a change to
    # that one: only the tools that already existed count toward a sweep.
    for chunk in reversed(out.split('@')[1:]):
        lines = chunk.strip().split('\n')
        touched = {was.get(d, d) for d in (f.split('/')[0] for f in lines[1:] if '/' in f)} & set(tools)
        existing = {t for t in touched if every[t]}
        for t in touched:
            every[t].append(lines[0])
            if len(existing) <= SWEEP_LIMIT:
                own[t].append(lines[0])
    missing = [t for t in tools if not every[t]]
    if missing:
        raise SystemExit(f'card-dates: no commit touches {missing}')
    return {t: (min(every[t]), max(own[t] + [min(every[t])])) for t in tools}


def render(src):
    cards = [(m, HREF_RE.search(m.group(0))) for m in CARD_RE.finditer(src)]
    missing = [m.group(0)[:60] for m, h in cards if not h]
    if missing:
        raise SystemExit(f'card-dates: a card links no tool directory: {missing}')
    dates = history([h.group(1) for _, h in cards])
    out, last = [], 0
    for m, h in cards:
        tool = h.group(1)
        first, latest = (month(d) for d in dates[tool])
        text = (f'First committed {first}.' if first == latest
                else f'First committed {first}, last changed {latest}.')
        card = LINE_RE.sub('', m.group(0))
        i = card.index('<span class="open">')
        indent = card[card.rfind('\n', 0, i) + 1:i]
        card = card[:i] + f'<p class="dates">{text}</p>\n{indent}' + card[i:]
        out.append(src[last:m.start()] + card)
        last = m.end()
    return ''.join(out) + src[last:]


def main():
    path = ROOT / 'index.html'
    src = path.read_text(encoding='utf-8')
    new = render(src)
    if '--check' in sys.argv:
        if new != src:
            raise SystemExit('card-dates: the months on the cards in index.html do not match the git history. '
                             'Run python3 scripts/card-dates.py and commit the result.')
        print('card-dates: the months on all cards match the git history')
        return
    path.write_text(new, encoding='utf-8')
    print('card-dates: wrote index.html')


if __name__ == '__main__':
    main()
