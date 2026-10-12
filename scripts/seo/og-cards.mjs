// Writes the link-preview images in og/: one 1200x630 JPEG per tool and one for
// the home page, from scripts/seo/tools.json and the doodle on each tool's card
// in index.html. Run it after adding a tool or changing a name or tagline, then
// run `python3 scripts/seo.py` and commit both.
//
//   node scripts/seo/og-cards.mjs            # every card
//   node scripts/seo/og-cards.mjs wage-gap   # one card
//
// Needs playwright-core and a Chromium. The fonts are vendored beside this file
// (OFL, licences alongside) and embedded as data URIs, because a card rendered
// in a fallback face looks nearly right and matches nothing else on the site.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const cfg = JSON.parse(readFileSync(join(here, 'tools.json'), 'utf8'));
const home = readFileSync(join(root, 'index.html'), 'utf8');
const font = f => `data:font/woff2;base64,${readFileSync(join(here, 'fonts', f)).toString('base64')}`;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const host = cfg.site.origin.replace(/^https?:\/\//, '');

const FLASK = `<path d="M26 8h12"/><path d="M28 8v14L14 46a4 4 0 0 0 3.5 6h29A4 4 0 0 0 50 46L36 22V8"/><path d="M20 38h24" stroke="#ff9911" stroke-width="2.4"/><path d="M54 12l3-3M56 20h4M8 16l-3 2" stroke="#ff9911"/>`;

function doodle(card) {
  const m = home.match(new RegExp(`<article class="card" id="${card}">\\s*<div class="doodle"><svg viewBox="0 0 64 64"[^>]*>([\\s\\S]*?)</svg>`));
  if (!m) throw new Error(`no doodle for card #${card} in index.html`);
  return m[1];
}

function page({ name, tagline, art, url }) {
  const size = name.length > 26 ? 66 : name.length > 18 ? 78 : 92;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:C;src:url(${font('comfortaa-700.woff2')});font-weight:700}
@font-face{font-family:S;src:url(${font('sourcesans3-400.woff2')});font-weight:400}
@font-face{font-family:S;src:url(${font('sourcesans3-600.woff2')});font-weight:600}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px}
body{background:linear-gradient(135deg,#382280 0%,#572e91 55%,#7f3289 100%);color:#fff;font-family:S;position:relative;overflow:hidden}
.brand{position:absolute;top:56px;left:72px;display:flex;align-items:center;gap:14px;font-family:C;font-weight:700;font-size:30px;color:#fff}
.brand svg{width:44px;height:44px}
.art{position:absolute;right:48px;top:110px;width:400px;height:400px;opacity:.28}
.art svg,.brand svg{fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.txt{position:absolute;left:72px;top:150px;width:740px}
h1{font-family:C;font-weight:700;font-size:${size}px;line-height:1.12;letter-spacing:-.01em}
p{margin-top:30px;font-size:36px;line-height:1.3;color:#f5f1fa;max-width:700px}
.foot{position:absolute;left:72px;bottom:52px;display:flex;align-items:center;gap:18px;font-size:28px;font-weight:600;color:#fff}
.foot i{display:block;width:56px;height:6px;border-radius:3px;background:#ff9911}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs><filter id="wobble" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>
<div class="brand"><svg viewBox="0 0 64 64" filter="url(#wobble)">${FLASK}</svg>${esc(cfg.site.name)}</div>
<div class="art"><svg viewBox="0 0 64 64" filter="url(#wobble)">${art}</svg></div>
<div class="txt"><h1>${esc(name)}</h1><p>${esc(tagline)}</p></div>
<div class="foot"><i></i>${esc(url)}</div>
</body></html>`;
}

const only = process.argv[2];
const jobs = [
  { out: 'home', name: cfg.site.name, tagline: cfg.site.home_tagline, art: FLASK, url: `${host} · ${cfg.site.author}` },
  ...cfg.tools.map(t => ({
    out: t.dir, name: t.name, tagline: t.tagline, art: doodle(t.card),
    url: (t.canonical || `${cfg.site.origin}/${t.dir}/`).replace(/^https?:\/\//, '').replace(/\/$/, ''),
  })),
].filter(j => !only || j.out === only);
if (!jobs.length) throw new Error(`no tool called ${only}`);

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
const long = [];
for (const j of jobs) {
  await tab.setContent(page(j), { waitUntil: 'load' });
  await tab.evaluate(() => document.fonts.ready);
  const over = await tab.evaluate(() => {
    const t = document.querySelector('.txt').getBoundingClientRect();
    return t.bottom > 560 ? Math.round(t.bottom) : 0;
  });
  if (over) { long.push(`${j.out} (${over}px)`); continue; }
  writeFileSync(join(root, 'og', `${j.out}.jpg`), await tab.screenshot({ type: 'jpeg', quality: 86 }));
  console.log(`og/${j.out}.jpg`);
}
await browser.close();
if (long.length) throw new Error(`text runs into the footer, shorten the tagline or name: ${long.join(', ')}`);
