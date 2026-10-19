/* The CBSE tab: which book the board prescribed, and what it has announced.
 *
 *   python3 -m http.server 8199 &          # from the REPO ROOT
 *   cd alab && ALAB_URL=http://localhost:8199/alab/ node tests/board.mjs
 *
 * This tab replaced one that described a single science paper sat in
 * September 2026 and was hidden under the other six subjects. Everything
 * checked here is a way that kind of staleness comes back.
 *
 * The thing it mostly guards is a claim about the outside world. This file
 * has twice been confidently wrong about which book NCERT publishes for
 * Class 8 Sanskrit, in opposite directions, and both wrong answers came
 * from inferring a file code from the book already known about. So the
 * check that matters is not that the page renders: it is that the page
 * never says this app follows the board's book when the data says it does
 * not, and that the count in the opening sentence is derived from the data
 * rather than typed, because a number in prose is how every page in this
 * repository has gone stale.
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

/* ---------- 1. it is reachable from every subject ---------- */
const subjects = await p.evaluate(() =>
  Array.from(document.querySelectorAll('#subjSeg button')).map(x => x.dataset.subj));
let shown = 0;
for(const sub of subjects){
  await p.click(`[data-subj="${sub}"]`);
  await p.waitForTimeout(120);
  if(!(await p.evaluate(() => document.querySelector('#tab-board').hidden))) shown++;
}
ok(shown === subjects.length,
   `the tab is there in all ${subjects.length} subjects (${shown}); it used to be science-only`);

/* ---------- 2. the books table ---------- */
await p.click('[data-subj="sci"]');
await p.click('#tab-board');
await p.waitForTimeout(300);

const rows = await p.evaluate(() => Array.from(document.querySelectorAll('.bookrow')).map(r => ({
  subject: r.querySelector('b').textContent.trim(),
  board:   r.querySelector('.bk-b').textContent.trim(),
  mine:    r.querySelector('.bk-m').textContent.trim(),
  differs: r.classList.contains('differs')
})));
ok(rows.length === 7, `one row per subject (${rows.length})`);

/* Colour cannot be the only signal, and here it is not: a row that differs
   says which book this app follows, in words. */
ok(rows.filter(r => r.differs).every(r => /^This app follows /.test(r.mine)),
   'a row that differs names the book this app follows, rather than only colouring itself');
ok(rows.filter(r => !r.differs).every(r => /follows it|Not an NCERT textbook/.test(r.mine)),
   'and a row that agrees says so');

/* The two known gaps, by name. These are the facts this file got wrong
   twice, so they are pinned rather than counted. */
const skt = rows.find(r => /Sanskrit/.test(r.subject));
ok(skt && /Deepakam/.test(skt.board) && skt.differs,
   'Sanskrit names Deepakam as the board\'s book and flags that this app does not follow it');
ok(skt && /Ruchira/.test(skt.mine), 'and names Ruchira as what it does follow');
const eng = rows.find(r => /English/.test(r.subject));
ok(eng && /Poorvi/.test(eng.board) && eng.differs,
   'English names Poorvi and flags the same');

/* ---------- 3. the opening count is derived, not typed ---------- */
const lede = (await p.textContent('#boardLede')).replace(/\s+/g, ' ').trim();
const claimed = lede.match(/follows (\d+) of those (\d+)/);
const truth = await p.evaluate(() => {
  const named = Object.keys(BOOKS).filter(k => BOOKS[k].board);
  return { named: named.length, same: named.filter(k => BOOKS[k].same).length };
});
ok(claimed && +claimed[2] === truth.named && +claimed[1] === truth.same,
   `the sentence's count matches the data (${claimed && claimed[1]}/${claimed && claimed[2]} against ${truth.same}/${truth.named})`);
ok(/Acad-48\/2025/.test(lede), 'and cites the circular it comes from');

/* ---------- 4. every claim links to the document behind it ---------- */
const links = await p.evaluate(() => Array.from(
  document.querySelectorAll('#view-board a[href]')).map(a => a.href));
ok(links.some(h => /cbseacademic\.nic\.in.*48_Circular_2025\.pdf$/.test(h)),
   'the books section links CBSE\'s own circular PDF');
ok(links.filter(h => /ncert\.nic\.in/.test(h)).length >= 6,
   `each prescribed book links to NCERT (${links.filter(h => /ncert\.nic\.in/.test(h)).length})`);
ok(links.every(h => /^https:/.test(h)), 'and every outbound link is https');

/* ---------- 5. notices carry their date ---------- */
const notices = await p.evaluate(() => Array.from(document.querySelectorAll('.notice')).map(n => ({
  cite: n.querySelector('.eyebrow').textContent.trim(),
  head: n.querySelector('h3').textContent.trim(),
  body: n.querySelector('p.lede').textContent.trim().length
})));
ok(notices.length >= 2, `at least two notices (${notices.length})`);
ok(notices.every(n => /Acad-\d+\/20\d\d/.test(n.cite) && /20\d\d/.test(n.cite)),
   'each names its circular and its date, so a reader can tell whether it is still live');
ok(notices.every(n => n.body > 120), 'and says what it means rather than only its title');

/* ---------- 6. the plan follows the exam, not a month ---------- */
const noExam = (await p.textContent('#planWhen')).trim();
ok(/No exam set/i.test(noExam), 'with no exam the plan says so: ' + JSON.stringify(noExam.slice(0, 50)));

const soon = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
await p.evaluate(d => localStorage.setItem('alab.exams.v1', JSON.stringify({migrated:true, list:[
  {id:'b1', kind:'midterm', name:'Half yearly', subject:'sci', date:d,
   syl:{chapters:[2,3,4], topics:{}, pages:'', note:''}}]})), soon);
await p.reload({ waitUntil:'load' });
await p.click('#tab-board');
await p.waitForTimeout(300);
const withExam = (await p.textContent('#planWhen')).replace(/\s+/g, ' ').trim();
ok(/Midterm/i.test(withExam) && /3 of \d+ chapters/.test(withExam),
   'with one set, it names the exam and its syllabus: ' + JSON.stringify(withExam.slice(0, 60)));
const steps = (await p.textContent('#planSteps')).replace(/\s+/g, ' ');
ok(/6 days left/.test(steps), 'and counts the days actually left');
ok(!/September/i.test(steps + withExam),
   'and names no month, which is what made the tab it replaced go stale');

/* ---------- 7. no sideways scroll, no errors ---------- */
ok(!(await p.evaluate(() =>
  document.documentElement.scrollWidth > document.documentElement.clientWidth)),
  'the tab does not scroll sideways on a phone');
ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');

await b.close();
console.log('\n' + (fail ? 'FAIL — ' + fail : 'PASS'));
process.exit(fail ? 1 : 0);
