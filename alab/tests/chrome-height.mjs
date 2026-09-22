/* How much of a phone screen is spent on chrome before the day's work.
 *
 *   python3 -m http.server 8199 &          # from the REPO ROOT
 *   cd alab && ALAB_URL=http://localhost:8199/alab/ node tests/chrome-height.mjs
 *
 * On a 390x844 phone the masthead measured 349px: 41 per cent of the screen
 * given to a title, seven subject pills, a filter that did nothing on the tab
 * you land on, and six tabs. Nothing on the page said so, and on a desktop it
 * is invisible, which is why it survived.
 *
 * The budget is a third of the viewport. It was a quarter for one build, and
 * that build bought the difference by scrolling the seven subjects in a
 * single row — 46px shorter, and wrong: the row ran off the screen edge with
 * English half-cut, so Social Science and AI & Thinking were reachable only
 * by a swipe nothing advertised. The pills wrap again and the budget moved to
 * fit them. Hence the assertion below that every subject is inside the
 * viewport: the cheap way to pass a height budget is to hide something, and
 * hiding it off the right edge counts.
 *
 * All six tabs and all seven subjects must also hit a 40px touch target.
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

let fail = 0;
const ok = (c, m) => { if(!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + m); };

const b = await chromium.launch(EXE ? { executablePath: EXE } : {});
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
await p.goto(BASE, { waitUntil: 'load' });
await p.waitForTimeout(400);
await p.evaluate(() => window.scrollTo(0, 0));

const m = await p.evaluate(() => {
  const h = document.querySelector('header.mast');
  const pills = Array.from(document.querySelectorAll('#subjSeg button'));
  const tabs = Array.from(document.querySelectorAll('.tab')).filter(t => !t.hidden);
  const seg = document.querySelector('#subjSeg');
  return {
    header: Math.round(h.getBoundingClientRect().height),
    viewport: window.innerHeight,
    pills: pills.length,
    pillShort: pills.filter(x => x.getBoundingClientRect().height < 40).length,
    tabs: tabs.length,
    tabShort: tabs.filter(x => x.getBoundingClientRect().height < 40).length,
    segScrolls: seg.scrollWidth > seg.clientWidth + 1,
    pillsOnScreen: pills.filter(x => {
      const r = x.getBoundingClientRect();
      return r.left >= -1 && r.right <= window.innerWidth + 1;
    }).length,
    sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    filterOnToday: !document.querySelector('#examFilter').hidden
  };
});

const budget = Math.round(m.viewport * 0.33);
ok(m.header <= budget, `masthead is ${m.header}px of ${m.viewport} (${Math.round(m.header / m.viewport * 100)}%), budget ${budget}px`);
ok(m.pills === 7, `all seven subjects are still there (${m.pills})`);
ok(m.pillShort === 0, `every subject pill is a 40px touch target (${m.pillShort} too short)`);
ok(m.tabs === 6, `all six tabs are still there (${m.tabs})`);
ok(m.tabShort === 0, `every tab is a 40px touch target (${m.tabShort} too short)`);
ok(m.pillsOnScreen === 7, `all seven subjects are inside the viewport, not off a scroll edge (${m.pillsOnScreen})`);
ok(!m.segScrolls, 'the subject row wraps rather than scrolling sideways');
ok(!m.sideways, 'the page itself does not scroll sideways');
ok(!m.filterOnToday, 'the exam filter is not shown on Today, where it does nothing');

/* It has to come back where it does something. */
await p.click('#tab-learn');
await p.waitForTimeout(200);
ok(await p.evaluate(() => !document.querySelector('#examFilter').hidden),
   'the exam filter returns on Learn');

/* Switching subject from the last pill still works and repaints the app. */
await p.click('[data-subj="ct"]');
await p.waitForTimeout(400);
ok(await p.evaluate(() => document.documentElement.getAttribute('data-subject') === 'ct'),
   'choosing the last subject switches to it');

ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');

await b.close();
console.log('\n' + (fail ? 'FAIL — ' + fail : 'PASS'));
process.exit(fail ? 1 : 0);
