/* Render check for the mind maps and the check-the-book layer.
 *
 *   python3 -m http.server 8199 &          # from the REPO ROOT, not alab/:
 *                                          # the page loads ../js/dyslexia-font.js
 *   cd alab && ALAB_URL=http://localhost:8199/alab/ node tests/mind-render.mjs
 *
 * Needs playwright-core and a Chromium. Neither is vendored here, so the
 * script resolves both and says what is missing rather than failing oddly:
 *
 *   npm i playwright-core
 *   PW_CHROMIUM=/path/to/chrome node tests/mind-render.mjs
 *
 * Why this exists. mindSVG() wraps its own text, because SVG will not wrap
 * and <foreignObject> does not print reliably, so the wrap widths are a
 * character count standing in for a pixel measurement. A test that checked
 * that arithmetic against itself would pass while the text ran off the
 * card. This one asks the browser for each text node's real getBBox and
 * compares it against the column the layout gave it. At a 41-character
 * leaf it found two lines 1.4px and 2.6px over; hence 38.
 *
 * One caveat worth knowing: Google Fonts does not load in the agent
 * sandbox, so this measures the system fallback rather than Figtree. The
 * fallback is the wider face, which makes the check conservative. The
 * blocked font request is the only network error tolerated below.
 */
const BASE = process.env.ALAB_URL || 'http://localhost:8199/';
import { existsSync, readdirSync } from 'node:fs';
/* Playwright's own default path carries the version it shipped with, so a
   newer playwright-core against an older vendored Chromium looks like "not
   installed". Find whatever is actually on disk instead. */
const pwDir = '/opt/pw-browsers';
const EXE = process.env.PW_CHROMIUM || (() => {
  const roots = existsSync(pwDir)
    ? readdirSync(pwDir).filter(d => d.startsWith('chromium')).map(d => `${pwDir}/${d}`)
    : [];
  for (const r of roots) {
    for (const bin of ['/chrome-linux/chrome', '/chrome-linux/headless_shell']) {
      if (existsSync(r + bin)) return r + bin;
    }
  }
  return undefined;
})();

let chromium;
try { ({ chromium } = await import('playwright-core')); }
catch { console.error('playwright-core not installed. npm i playwright-core'); process.exit(2); }

const b = await chromium.launch(EXE ? { executablePath: EXE } : {});
let fail = 0;
const say = (ok, msg) => { if (!ok) fail++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
/* The font CDN is unreachable in the sandbox. That is the sandbox. */
const realError = e => !/fonts\.(googleapis|gstatic)\.com|ERR_CERT_AUTHORITY_INVALID/.test(e);

const open = async (w, h) => {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(BASE, { waitUntil: 'load' });
  await p.click('#tab-learn');
  await p.waitForTimeout(300);
  return { p, errs };
};

/* Expected per subject: how many chapters, and how many of them carry a
   mind map. A subject still on the arrow-line fallback shows 0 maps and
   that is not a failure; a subject that drops from what it had is. */
const SUBJECTS = [
  { id:'sci',  chapters:13, maps:13 },
  { id:'math', chapters:14, maps:14 },
  { id:'skt',  chapters:19, maps:19 },
  { id:'hin',  chapters:18, maps:18 },
  { id:'eng',  chapters:8,  maps:8  },
  { id:'sst',  chapters:15, maps:15 },
  { id:'ct',   chapters:5,  maps:5  }
];
const CHECKS = { sst:6, math:2, ct:1, sci:9, hin:9 };   /* check-the-book entries, by subject */

const measure = () => {
  const svgs = [...document.querySelectorAll('#learnList svg.mind')];
  const over = [];
  svgs.forEach((s, si) => {
    /* The columns are read off the element, not restated here, so the
       test and the layout cannot drift apart without one of them moving. */
    const W = s.viewBox.baseVal.width, H = s.viewBox.baseVal.height;
    const BR_L = +(s.querySelector('.t-br')?.getAttribute('x') ?? 200);
    [...s.querySelectorAll('text')].forEach(t => {
      const bb = t.getBBox(), cls = t.getAttribute('class');
      const lim = cls === 't-leaf' ? W - 10 : cls === 't-br' ? BR_L + 176 : W;
      if (bb.x + bb.width > lim + 1)
        over.push({ i: si + 1, cls, by: +(bb.x + bb.width - lim).toFixed(1),
                    text: t.textContent.slice(0, 44) });
      if (bb.y < -1 || bb.y + bb.height > H + 1)
        over.push({ i: si + 1, cls, vertical: true, text: t.textContent.slice(0, 30) });
    });
  });
  return {
    cards: document.querySelectorAll('#learnList .syl').length,
    maps: svgs.length,
    visible: svgs.filter(s => s.getBoundingClientRect().width > 100).length,
    labelled: svgs.filter(s => s.querySelector('title')?.textContent.trim()).length,
    fallbackShown: [...document.querySelectorAll('#learnList .mindfall')]
                     .filter(e => getComputedStyle(e).display !== 'none').length,
    fallbacks: document.querySelectorAll('#learnList .mindfall').length,
    arrowLines: document.querySelectorAll('#learnList .cmap').length,
    checks: document.querySelectorAll('#learnList .chk').length,
    treesShown: svgs.filter(s => getComputedStyle(s).display !== 'none').length,
    over
  };
};

/* ---- a screen with room for the tree ---- */
const { p, errs } = await open(1100, 900);
let totalMaps = 0;
for (const sub of SUBJECTS) {
  await p.click(`button[data-subj="${sub.id}"]`);
  await p.waitForTimeout(250);
  const r = await p.evaluate(measure);
  totalMaps += r.maps;
  say(r.cards === sub.chapters, `${sub.id}: ${sub.chapters} chapters listed (got ${r.cards})`);
  say(r.maps === sub.maps, `${sub.id}: ${sub.maps} mind maps (got ${r.maps})`);
  say(r.maps + r.arrowLines === r.cards,
      `${sub.id}: every card has a map or the arrow line (${r.maps}+${r.arrowLines} vs ${r.cards})`);
  say(r.visible === r.maps, `${sub.id}: every tree visible on a wide screen (${r.visible}/${r.maps})`);
  say(r.labelled === r.maps, `${sub.id}: every tree has a <title> (${r.labelled}/${r.maps})`);
  say(r.fallbackShown === 0, `${sub.id}: nested list hidden on a wide screen (${r.fallbackShown} showing)`);
  say(r.checks === (CHECKS[sub.id] || 0),
      `${sub.id}: ${CHECKS[sub.id] || 0} check-the-book entries (got ${r.checks})`);
  say(r.over.length === 0, `${sub.id}: no text overflows its column (${r.over.length} over)`);
  r.over.slice(0, 6).forEach(o => console.log('       ' + JSON.stringify(o)));
}
say(totalMaps === SUBJECTS.reduce((a, s) => a + s.maps, 0), `${totalMaps} mind maps in total`);
const real = errs.filter(realError);
say(real.length === 0, `no page errors (${real.length})`);
real.slice(0, 4).forEach(e => console.log('       ' + e.slice(0, 160)));

/* ---- a phone ---- */
const { p: m, errs: merrs } = await open(390, 844);
for (const sub of SUBJECTS.filter(s => s.maps)) {
  await m.click(`button[data-subj="${sub.id}"]`);
  await m.waitForTimeout(250);
  const r = await m.evaluate(measure);
  const w = await m.evaluate(() => [document.documentElement.scrollWidth,
                                   document.documentElement.clientWidth]);
  say(w[0] <= w[1], `${sub.id}: no sideways scroll at 390px (${w[0]} vs ${w[1]})`);
  say(r.treesShown === 0, `${sub.id}: tree hidden on a phone (${r.treesShown} showing)`);
  say(r.fallbackShown === sub.maps, `${sub.id}: all ${sub.maps} nested lists shown (got ${r.fallbackShown})`);
  say(r.checks === (CHECKS[sub.id] || 0), `${sub.id}: check entries present on a phone (got ${r.checks})`);
}
say(merrs.filter(realError).length === 0, 'no page errors on a phone');

await b.close();
console.log(fail ? `\nFAIL — ${fail}` : '\nPASS');
process.exit(fail ? 1 : 0);
