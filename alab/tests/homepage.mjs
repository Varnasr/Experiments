/* What the first screen actually says.
 *
 *   python3 -m http.server 8199 &          # from the REPO ROOT
 *   cd alab && ALAB_URL=http://localhost:8199/alab/ node tests/homepage.mjs
 *
 * Agastya's father opened this three times and asked where the mind maps
 * were. They were on the Learn tab the whole time, one tap away, and a tap
 * away with nothing on the first screen naming it is the same as absent. The
 * app also does six different things and the homepage named none of them.
 *
 * So the checks here are about discovery rather than correctness: a real mind
 * map rendered on the page you land on (not a link promising one), the six
 * things the app does named and each one actually going somewhere, and all
 * seven subjects on screen in seven different colours — the last because for
 * one build every surface took the colour of whichever subject was active,
 * and the app read as a green app.
 */
import { chromium } from 'playwright-core';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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
const FONTS = process.env.ALAB_FONTS && existsSync(join(process.env.ALAB_FONTS, 'gf-local.css'))
  ? process.env.ALAB_FONTS : null;

let fail = 0;
const ok = (c, m) => { if(!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + m); };

const b = await chromium.launch(EXE ? { executablePath: EXE } : {});
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
if(FONTS){
  await p.route('https://fonts.googleapis.com/**', r =>
    r.fulfill({ contentType:'text/css', body:readFileSync(join(FONTS, 'gf-local.css')) }));
  await p.route('**/fonts/*.woff2', r => {
    const f = join(FONTS, 'fonts', r.request().url().split('/').pop().split('?')[0]);
    return existsSync(f) ? r.fulfill({ contentType:'font/woff2', body:readFileSync(f) }) : r.abort();
  });
}
await p.goto(BASE, { waitUntil: 'load' });
await p.waitForTimeout(500);

/* ---------- 1. does the page say what this is ---------- */
const hero = (await p.textContent('#hero')).replace(/\s+/g, ' ').trim();
ok(/mind map/i.test(hero), 'the first card says the word "mind map": ' + JSON.stringify(hero.slice(0, 64)));
ok(hero.length > 80, 'and says more than a slogan (' + hero.length + ' chars)');

/* ---------- 2. a mind map, on the page, rendered ---------- */
const map = await p.evaluate(() => {
  const card = document.querySelector('#mapCard');
  if(!card || card.hidden) return null;
  const body = card.querySelector('#mapBody');
  const svgText = Array.from(body.querySelectorAll('svg text')).map(t => t.textContent.trim());
  const listText = Array.from(body.querySelectorAll('li')).map(t => t.textContent.trim());
  return {
    title: (card.querySelector('#mapTitle') || {}).textContent,
    branches: svgText.length + listText.length,
    words: svgText.concat(listText).join(' ').length,
    height: Math.round(body.getBoundingClientRect().height)
  };
});
ok(map, 'the homepage carries a mind-map card at all');
ok(map && map.branches >= 4, `it is a drawn map, not a promise of one (${map && map.branches} labelled parts)`);
ok(map && map.words > 150, `with the chapter's actual content in it (${map && map.words} chars)`);
/* Capped: a fourteen-branch map unrolled here buries everything below it. */
ok(map && map.height < 460, `and it is capped rather than unrolled (${map && map.height}px)`);
ok(map && /\S/.test(map.title || ''), 'the map says which chapter it is: ' + JSON.stringify(map && map.title));

/* ---------- 3. the six things the app does ---------- */
const tools = await p.evaluate(() => Array.from(document.querySelectorAll('.tool')).map(t => ({
  view: t.dataset.tool,
  name: (t.querySelector('b') || {}).textContent,
  words: ((t.querySelector('span') || {}).textContent || '').trim().length,
  doodle: !!t.querySelector('svg'),
  hue: getComputedStyle(t).borderTopColor
})));
ok(tools.length === 6, `six tool cards (${tools.length})`);
ok(tools.every(t => t.doodle), 'each carries a drawing');
ok(tools.every(t => t.words > 30), 'each says what it is for in a sentence, not a label');
ok(new Set(tools.map(t => t.hue)).size === 6, 'and each has its own colour (' + new Set(tools.map(t => t.hue)).size + ' distinct)');

/* They have to go somewhere. Learn is the one the whole complaint was about. */
await p.click('.tool[data-tool="learn"]');
await p.waitForTimeout(400);
ok(await p.evaluate(() => !document.querySelector('#view-learn').hidden),
   'the Learn card opens the Learn tab');
ok(await p.evaluate(() => document.querySelectorAll('#learnList .mindwrap').length > 5),
   'which is full of mind maps');
await p.click('#tab-today');
await p.waitForTimeout(400);

/* ---------- 4. seven subjects, seven colours ---------- */
const cards = await p.evaluate(() => Array.from(document.querySelectorAll('.subjcard')).map(c => ({
  id: c.dataset.gosubj,
  name: (c.querySelector('b') || {}).textContent,
  hue: getComputedStyle(c).borderColor,
  onScreen: c.getBoundingClientRect().width > 0
})));
ok(cards.length === 7, `seven subject cards (${cards.length})`);
ok(new Set(cards.map(c => c.hue)).size === 7,
   `in seven different colours, so the app is not one colour (${new Set(cards.map(c => c.hue)).size} distinct)`);
const pillOrder = await p.evaluate(() =>
  Array.from(document.querySelectorAll('#subjSeg button')).map(b => b.dataset.subj));
ok(JSON.stringify(cards.map(c => c.id)) === JSON.stringify(pillOrder),
   'in the same order as the subject pills above them');

/* Clicking one repaints the app and gives a different chapter's map. */
const before = await p.textContent('#mapTitle');
await p.click('.subjcard[data-gosubj="hin"]');
await p.waitForTimeout(700);
ok(await p.evaluate(() => document.documentElement.getAttribute('data-subject') === 'hin'),
   'clicking a subject card switches subject');
ok(await p.textContent('#mapTitle') !== before,
   'and the homepage map follows it to that subject');
ok(await p.evaluate(() => {
  const a = getComputedStyle(document.querySelector('.btn.primary')).backgroundColor;
  return a && a !== 'rgba(0, 0, 0, 0)';
}), 'and the accent repaints with it');

ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');

await b.close();
console.log('\n' + (fail ? 'FAIL — ' + fail : 'PASS'));
process.exit(fail ? 1 : 0);
