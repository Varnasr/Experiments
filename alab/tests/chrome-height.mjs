/* How much of a phone screen is spent on chrome before the day's work.
 *
 *   python3 -m http.server 8199 &          # from the REPO ROOT
 *   cd alab && ALAB_URL=http://localhost:8199/alab/ node tests/chrome-height.mjs
 *
 * On a 390x844 phone the masthead measured 349px: 41 per cent of the screen
 * given to a title, seven subject pills wrapped over two rows, a filter that
 * did nothing on the tab you land on, and six tabs. Nothing on the page said
 * so, and on a desktop it is invisible, which is why it survived.
 *
 * The budget below is a quarter of the viewport plus a little. It is a real
 * constraint rather than a record of today's number: a row added to the
 * masthead breaks it, which is the point. It also checks that the shrinking
 * did not come from deleting anything — all seven subjects and all six tabs
 * must still be in the DOM and hit a 40px touch target — because that is the
 * cheap way to pass a height budget and the wrong one.
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
    sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    filterOnToday: !document.querySelector('#examFilter').hidden
  };
});

const budget = Math.round(m.viewport * 0.27);
ok(m.header <= budget, `masthead is ${m.header}px of ${m.viewport} (${Math.round(m.header / m.viewport * 100)}%), budget ${budget}px`);
ok(m.pills === 7, `all seven subjects are still there (${m.pills})`);
ok(m.pillShort === 0, `every subject pill is a 40px touch target (${m.pillShort} too short)`);
ok(m.tabs === 6, `all six tabs are still there (${m.tabs})`);
ok(m.tabShort === 0, `every tab is a 40px touch target (${m.tabShort} too short)`);
ok(m.segScrolls, 'the subject row scrolls rather than wrapping to a second line');
ok(!m.sideways, 'the page itself does not scroll sideways');
ok(!m.filterOnToday, 'the exam filter is not shown on Today, where it does nothing');

/* It has to come back where it does something. */
await p.click('#tab-learn');
await p.waitForTimeout(200);
ok(await p.evaluate(() => !document.querySelector('#examFilter').hidden),
   'the exam filter returns on Learn');

/* And the last subject must be reachable, not stranded off the scroll edge. */
await p.click('[data-subj="ct"]');
await p.waitForTimeout(600);
ok(await p.evaluate(() => {
  const el = document.querySelector('[data-subj="ct"]'), seg = document.querySelector('#subjSeg');
  const a = el.getBoundingClientRect(), s = seg.getBoundingClientRect();
  return a.left >= s.left - 1 && a.right <= s.right + 1;
}), 'choosing the last subject scrolls it into view');

ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');

await b.close();
console.log('\n' + (fail ? 'FAIL — ' + fail : 'PASS'));
process.exit(fail ? 1 : 0);
