# Experiments

Twenty-one browser tools for development economics, law and data work, each a
self-contained page: causal workbench, RCT planner, poverty and inequality,
wage gap, women's indicators, heat exposure, air quality, court translator,
petition builder, statutory interest, land acquisition, library builder and the
rest. No build step. Deployed to GitHub Pages and to Netlify.

## Commands

```bash
python3 scripts/check.py           # static checks, run by CI
node scripts/check-inline-js.mjs   # every inline <script> parses, run by CI
node scripts/axe.mjs               # accessibility over every page, run by CI
node scripts/axe.mjs --all         # also list the moderate and minor findings
node scripts/axe.mjs --page wage-gap/index.html
python3 scripts/bind-labels.py     # report labels bound to nothing; --write to fix
python3 -m http.server 8000        # then open http://localhost:8000
```

`scripts/axe.mjs` needs `npm ci` first, and a Chromium. In the agent sandbox one
is already installed and the script finds it under `PLAYWRIGHT_BROWSERS_PATH`;
in CI it comes from `node node_modules/playwright-core/cli.js install chromium`,
so the browser matches the lockfile rather than whatever `npx` resolves.

A local server does not send the `netlify.toml` headers, so the
Content-Security-Policy you see locally is no policy at all.

## Two deploy targets, and only one of them can run the functions

`.github/workflows/deploy-pages.yml` publishes the repository to GitHub Pages;
`netlify.toml` configures Netlify. Most tools are fully client side and work on
either. **`court-translator` is not.** It posts to
`/.netlify/functions/court-translate`, which calls Sarvam AI for translation and
Groq for refinement, and `/.netlify/functions/tts` for speech. Those paths do
not exist on Pages, so on the Pages copy the tool loads, accepts a document,
extracts the text in the browser, and then fails at the translation step.

The upside of that arrangement is worth stating too: the API keys live in
Netlify's environment and never reach a browser. `api.sarvam.ai` and
`api.groq.com` are therefore absent from `connect-src` **correctly**, because a
CSP governs the page and not the server. Do not add them.

## The CSP is the thing to get right, and every way it is wrong is silent

Too tight and the script does not load, the chart does not draw, and only the
browser console says why. Too loose and the policy is decoration.

`scripts/check.py` pairs the policy against what the pages actually load, in
both directions. On 2026-09-22 the second direction found **19 allowed origins
the site references nowhere**: unpkg, the four Iconify hosts, Google Tag Manager
and three Google Analytics hosts, Carto basemaps, licensebuttons.net, and
`api.climatetrace.org`, left behind when the climate tool was split out into its
own repository. The policy went from 1,255 characters to 739. Each removal was
verified against the source rather than inferred from the tidiness of the list.

Two traps found while doing it, both worth not rediscovering:

- **`window.open` is a navigation, not a fetch.** `connect-src` does not govern
  it. A check matching a bare `.open(` reports
  `https://docs.new` in `kundendu-worksheets` as a violation, and it is not one.
- **`tessdata.projectnaptha.com` appears in no file and is load-bearing.**
  `court-translator` calls `Tesseract.createWorker('hin', 1, {...})` with no
  explicit `langPath`, so tesseract.js builds the traineddata URL inside the
  library. Remove the origin and OCR on scanned PDFs stops, with nothing on the
  page to show it. It is exempted in `ALLOWED_UNREFERENCED` with that reason,
  and a stale exemption fails too.

## flipbook was dead for as long as it existed, and the page rendered perfectly

An HTML parser ends a `<script>` element at the first literal `</script` in the
source, whatever the JavaScript around it thinks it is doing. `flipbook` builds
a standalone HTML file inside a template literal, and that template contains
script tags. One was escaped and the next was not:

```
<script>${lib}<\/script><script src="../js/dyslexia-font.js" …></script>
             ^^ escaped                                        ^^ not
```

So the browser ended the page's own inline script 10,417 characters in, leaving
an unterminated template literal inside an unterminated function. The block
threw `SyntaxError: Unexpected end of input` and **not one line of the tool
ran**: no controls, no book, no export. The markup rendered exactly as designed
and the only evidence anywhere was a single console line.

`scripts/check-inline-js.mjs` cuts every inline script where the browser would
cut it and asks node to parse the remainder. It needs no browser and no
network. Fault-injected against the real defect.

**Write `<\/script` whenever JavaScript emits a script tag.** The backslash
means nothing to JavaScript and everything to the HTML parser.

## Accessibility: 573 violations, and every one of them silent

`scripts/axe.mjs` walks the tree rather than a list, so a tool added tomorrow is
covered by existing. It audits at 1280x900 and 390x844 and fails on serious or
critical; moderate and minor print under `--all` and are deliberately not a
gate, because a repository that has never run axe goes red on its first run for
more than anyone can triage in a sitting, and a gate nobody can get green gets
deleted.

The first run, on 2026-09-23, found 573 serious or critical nodes and three
pages scrolling sideways on a phone. What they were:

- **274 form controls with no accessible name.** These pages were written as
  `<label>Text</label><input id="x">`, which looks right, reads right and
  associates nothing: a label binds to a control only by wrapping it or by a
  matching `for`. A screen reader announced every one of them as an unnamed
  edit field. `scripts/bind-labels.py` fixed 218 mechanically and named the
  rest by hand, including the rows `promise-costing` and `cost-benefit`
  generate, where ids cannot be unique and the name goes on the control.
- **295 nodes failing contrast, and one token behind almost all of them.**
  `--muted:#9ca3af` is defined identically in seventeen pages and measures
  **2.43:1** on `#fafafa`, a little over half the AA threshold. It is
  `#6b7280` now: 4.63:1 on `#fafafa`, 4.83:1 on white. The rest were white on
  the brand orange (2.14:1; the orange stays, the ink is what moved), white
  on the hyd-sir amber, and a subtitle at 85% opacity on the darkest alab
  subject fill, which came to 4.47:1.
- **Three pages wider than the phone**, every one a wide table. The fix is a
  scroll wrapper **plus** `min-width:0` on the grid items, and it does not work
  without both: a grid item's default `min-width:auto` lets its min-content
  size the shared track, so the wrapper is simply as wide as its table.
  Deliberately not `display:block` on the table, which fixes the layout and
  drops the table's semantics from the accessibility tree.

Two things about a local run that are not true of production. The local server
sends no headers, so `netlify.toml`'s CSP is absent and nothing is blocked by
it; `scripts/check.py` is what covers that and the two are not substitutes.
And in the sandbox the browser cannot reach a CDN, so a page may be audited
without the script that draws half of it. Every failed request is counted and
printed **before** the score for that reason: a clean result on a page that
lost its chart library is worse than no result.

## Watch out for

- **Inline event handlers work here only because `script-src` carries
  `'unsafe-inline'`.** Three of them, in `library-builder` and `hyd-sir`.
  Tighten that to a nonce or a hash and all three stop firing with nothing on
  the page to show it. A check pairs the two, so the dependency cannot be
  forgotten.
- **Google Fonts spans two directives.** The stylesheet comes from
  `fonts.googleapis.com` under `style-src`, the font files from
  `fonts.gstatic.com` under `font-src`. Putting both in one is a common way to
  end up in a fallback typeface.
- **Do not add a `<meta http-equiv="Content-Security-Policy">` to a page here.**
  A browser enforces the intersection of the meta policy and the header, so the
  meta tag would quietly govern instead of `netlify.toml`, and the header would
  become invisible. No page carries one today and a check keeps it that way.
  The four sites split out of this repository each carry a meta tag *and* a
  header, and each of their CLAUDE.md files explains the hazard.
- **Sibling repositories inherited this CSP verbatim** when they were split out,
  which is how they each came to allow ten origins they never touch. If you
  change a shared origin here, check whether `india-development-indicators`,
  `climate-trace-india`, `sdg-progress-tracker` and
  `industry-conglomerates-database` need the same change.

- **The tool count is pinned now.** This file opened with "Twenty-three browser
  tools" while 21 directories held an `index.html` and `index.html` linked 21 of
  them. The 23 was the count of HTML files, which includes the landing page and
  `404.html`. `scripts/check.py` compares the two, because a number written in
  prose that nothing compares is how every repository here has drifted.

## Testing

`.github/workflows/ci.yml` runs two jobs on every push and pull request. The
first is `scripts/check.py` and `scripts/check-inline-js.mjs`, neither of which
needs a browser or a network. The second installs Chromium and runs
`scripts/axe.mjs`; it is separate so a contributor waiting on the static checks
does not wait on a browser download.

Before 2026-09-22 the only workflow deployed to Pages and validated nothing, so
none of this was checked by anything. Seven checks have been fault-injected
against a real failure to confirm they bite, including the inline-script parse
and the tool count.
