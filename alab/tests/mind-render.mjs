/* Render check for the mind maps and the check-the-book layer.
 *
 *   cd alab && python3 -m http.server 8199 &
 *   node tests/mind-render.mjs
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
  await p.click('button[data-subj="sst"]');
  await p.click('#tab-learn');
  await p.waitForTimeout(400);
  return { p, errs };
};

/* ---- a screen with room for the tree ---- */
const { p, errs } = await open(1100, 900);
const r = await p.evaluate(() => {
  const svgs = [...document.querySelectorAll('#learnList svg.mind')];
  const over = [];
  svgs.forEach((s, si) => {
    /* Same columns mindSVG() lays out into, read off the element so the
       two cannot drift apart silently. */
    const W = s.viewBox.baseVal.width, H = s.viewBox.baseVal.height;
    const LEAF_L = +s.querySelector('.t-leaf')?.getAttribute('x') || 439;
    const BR_L = +s.querySelector('.t-br')?.getAttribute('x') || 200;
    [...s.querySelectorAll('text')].forEach(t => {
      const bb = t.getBBox(), cls = t.getAttribute('class');
      const lim = cls === 't-leaf' ? W - 10 : cls === 't-br' ? BR_L + 176 : W;
      if (bb.x + bb.width > lim + 1)
        over.push({ ch: si + 1, cls, by: +(bb.x + bb.width - lim).toFixed(1),
                    text: t.textContent.slice(0, 44) });
      if (bb.y < -1 || bb.y + bb.height > H + 1)
        over.push({ ch: si + 1, cls, vertical: true, text: t.textContent.slice(0, 30) });
    });
  });
  return {
    n: svgs.length,
    visible: svgs.filter(s => s.getBoundingClientRect().width > 100).length,
    lists: [...document.querySelectorAll('#learnList .mindfall')]
             .filter(e => getComputedStyle(e).display !== 'none').length,
    checks: document.querySelectorAll('#learnList .chk').length,
    labelled: [...document.querySelectorAll('#learnList svg.mind')]
                .filter(s => s.querySelector('title')?.textContent.trim()).length,
    over
  };
});
say(r.n === 15, `15 mind maps rendered (got ${r.n})`);
say(r.visible === r.n, `every tree visible on a wide screen (${r.visible}/${r.n})`);
say(r.labelled === r.n, `every tree has a <title> for a screen reader (${r.labelled}/${r.n})`);
say(r.lists === 0, `nested-list fallback hidden on a wide screen (${r.lists} showing)`);
say(r.checks === 6, `6 check-the-book entries rendered (got ${r.checks})`);
say(r.over.length === 0, `no text overflows its column (${r.over.length} over)`);
r.over.slice(0, 8).forEach(o => console.log('       ' + JSON.stringify(o)));
const real = errs.filter(realError);
say(real.length === 0, `no page errors (${real.length})`);
real.slice(0, 4).forEach(e => console.log('       ' + e.slice(0, 160)));

/* ---- a phone ---- */
const { p: m, errs: merrs } = await open(390, 844);
const mr = await m.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
  trees: [...document.querySelectorAll('#learnList svg.mind')]
           .filter(s => getComputedStyle(s).display !== 'none').length,
  lists: [...document.querySelectorAll('#learnList .mindfall')]
           .filter(e => getComputedStyle(e).display !== 'none').length,
  chk: document.querySelectorAll('#learnList .chk').length
}));
say(mr.scrollW <= mr.clientW, `no sideways scroll at 390px (${mr.scrollW} vs ${mr.clientW})`);
say(mr.trees === 0, `tree hidden on a phone (${mr.trees} showing)`);
say(mr.lists === 15, `all 15 nested lists shown on a phone (got ${mr.lists})`);
say(mr.chk === 6, `check entries present on a phone (got ${mr.chk})`);
say(merrs.filter(realError).length === 0, 'no page errors on a phone');

await b.close();
console.log(fail ? `\nFAIL — ${fail}` : '\nPASS');
process.exit(fail ? 1 : 0);
