# Experiments

Twenty-three browser tools for development economics, law and data work, each a
self-contained page: causal workbench, RCT planner, poverty and inequality,
wage gap, women's indicators, heat exposure, air quality, court translator,
petition builder, statutory interest, land acquisition, library builder and the
rest. No build step. Deployed to GitHub Pages and to Netlify.

## Commands

```bash
python3 scripts/check.py     # static checks, run by CI
python3 -m http.server 8000  # then open http://localhost:8000
```

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

## Testing

`.github/workflows/ci.yml` runs `scripts/check.py` on every push and pull
request. Before 2026-09-22 the only workflow deployed to Pages and validated
nothing, so none of the above was checked by anything. Four of the checks were
fault-injected against a real failure to confirm they bite.
