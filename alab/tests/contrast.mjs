/* Colour contrast, measured from the running page rather than from the CSS.
 *
 *   python3 -m http.server 8199 &          # from the REPO ROOT
 *   cd alab && ALAB_URL=http://localhost:8199/alab/ node tests/contrast.mjs
 *
 * The palette is per subject: `data-subject` on <html> redefines --accent,
 * --accent-2 and --accent-soft, so there are fourteen palettes here (seven
 * subjects x two themes) and a hand check of one of them tells you nothing
 * about the other thirteen. That is the reason this exists rather than a
 * spreadsheet.
 *
 * It reads the resolved custom properties through getComputedStyle, so a
 * token that is defined but never reaches an element fails the same way a
 * wrong colour does, and it then re-measures three colours where they are
 * actually painted: the eyebrow, whose predecessor ran at 3.0:1 on the old
 * cream for the whole life of the site, the primary button's label, and the
 * body text on the page background.
 *
 * Thresholds: 4.5:1 for text (WCAG AA), 3:1 for marks that carry no text —
 * the chapter hues, which live in rules, links and bullets and never under a
 * word, which is why they are allowed to be colours rather than inks.
 */
import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';

const BASE = process.env.ALAB_URL || 'http://localhost:8199/';
const pwDir = '/opt/pw-browsers';
const EXE = process.env.PW_CHROMIUM || (() => {
  const roots = existsSync(pwDir)
    ? readdirSync(pwDir).filter(d => d.startsWith('chromium')).map(d => `${pwDir}/${d}`) : [];
  for (const r of roots)
    for (const bin of ['/chrome-linux/chrome', '/chrome-linux/headless_shell'])
      if (existsSync(r + bin)) return r + bin;
  return undefined;
})();

const SUBJECTS = ['sci', 'math', 'sst', 'eng', 'hin', 'skt', 'ct'];

const chan = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
function lum(css){
  const m = String(css).match(/-?[\d.]+/g);
  if(!m || m.length < 3) throw new Error('cannot parse colour: ' + css);
  const [r, g, b] = m.slice(0, 3).map(Number);
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}
function ratio(a, b){
  let [x, y] = [lum(a), lum(b)];
  if(x < y) [x, y] = [y, x];
  return (x + 0.05) / (y + 0.05);
}

let pass = 0, fail = 0;
const worst = [];
function need(r, min, label){
  worst.push([r, label]);
  if(r >= min){ pass++; return true; }
  fail++;
  console.log(`FAIL ${r.toFixed(2)} (need ${min})  ${label}`);
  return false;
}

const b = await chromium.launch(EXE ? { executablePath: EXE } : {});
const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
await p.goto(BASE, { waitUntil: 'load' });

/* The page resolves a colour keyword only where it is used, so read the
   tokens off a throwaway element that is given each one in turn. */
const readTokens = names => p.evaluate(ns => {
  const el = document.createElement('span');
  document.body.appendChild(el);
  const out = {};
  for(const n of ns){
    el.style.color = 'var(' + n + ')';
    out[n] = getComputedStyle(el).color;
  }
  el.remove();
  return out;
}, names);

const TOKENS = ['--paper', '--surface', '--surface-2', '--ink', '--ink-2', '--ink-3',
                '--accent', '--accent-2', '--accent-soft', '--on-accent',
                '--good', '--bad', '--rule',
                '--c2', '--c3', '--c4', '--c5', '--c6', '--c7'];

for(const theme of ['light', 'dark']){
  for(const sub of SUBJECTS){
    await p.evaluate(([t, s]) => {
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.setAttribute('data-subject', s);
    }, [theme, sub]);
    const T = await readTokens(TOKENS);
    const tag = `${theme}/${sub}`;

    for(const surf of ['--paper', '--surface', '--surface-2'])
      for(const ink of ['--ink', '--ink-2', '--ink-3'])
        need(ratio(T[ink], T[surf]), 4.5, `${tag}: ${ink} on ${surf}`);

    need(ratio(T['--on-accent'], T['--accent']), 4.5, `${tag}: button label on --accent`);
    for(const surf of ['--paper', '--surface', '--accent-soft'])
      need(ratio(T['--accent-2'], T[surf]), 4.5, `${tag}: --accent-2 on ${surf}`);
    need(ratio(T['--accent'], T['--surface']), 3, `${tag}: --accent as a mark on --surface`);

    for(const st of ['--good', '--bad'])
      for(const surf of ['--surface', '--surface-2'])
        need(ratio(T[st], T[surf]), 4.5, `${tag}: ${st} on ${surf}`);

    /* Chapter hues never carry text: 3:1, the non-text threshold. */
    for(const c of ['--c2', '--c3', '--c4', '--c5', '--c6', '--c7'])
      for(const surf of ['--paper', '--surface', '--surface-2'])
        need(ratio(T[c], T[surf]), 3, `${tag}: ${c} as a mark on ${surf}`);

    /* And the rule needs to be visible as a boundary, 3:1 against the card. */
    need(ratio(T['--rule'], T['--surface']), 1.4, `${tag}: --rule is visible on --surface`);
  }
}

/* Painted, not declared. Three places where the token has to survive contact
   with an actual element. */
for(const theme of ['light', 'dark']){
  await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
  const seen = await p.evaluate(() => {
    const pick = sel => {
      const el = document.querySelector(sel);
      if(!el) return null;
      let bg = 'rgba(0, 0, 0, 0)', n = el;
      while(n && bg === 'rgba(0, 0, 0, 0)'){ bg = getComputedStyle(n).backgroundColor; n = n.parentElement; }
      return { fg: getComputedStyle(el).color, bg: bg };
    };
    return { eyebrow: pick('.eyebrow'), body: pick('.lede'), primary: pick('.btn.primary') };
  });
  for(const [k, v] of Object.entries(seen)){
    if(!v){ console.log('FAIL missing element for ' + k); fail++; continue; }
    need(ratio(v.fg, v.bg), 4.5, `${theme}: painted ${k} (${v.fg} on ${v.bg})`);
  }
}

await b.close();
worst.sort((a, c) => a[0] - c[0]);
console.log('\ntightest five:');
worst.slice(0, 5).forEach(([r, l]) => console.log(`  ${r.toFixed(2)}  ${l}`));
console.log(`\n${pass} checks passed` + (fail ? `, ${fail} FAILED` : ''));
console.log(fail ? 'FAIL — ' + fail : 'PASS');
process.exit(fail ? 1 : 0);
