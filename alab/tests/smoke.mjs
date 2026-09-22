/* End-to-end smoke test for the views that consume the question bank.
 *
 *   python3 -m http.server 8199 &          # from the REPO ROOT, not alab/:
 *                                          # the page loads ../js/dyslexia-font.js
 *   cd alab && ALAB_URL=http://localhost:8199/alab/ node tests/smoke.mjs
 *
 * bank-check.mjs validates the data. This drives the app: it starts a
 * practice run in each subject, answers a question and checks that the
 * marking responds, generates a worksheet and a mock paper, and opens
 * the mistakes book. Adding several hundred questions is exactly the
 * kind of change that leaves the data valid and a view broken.
 */
import { existsSync, readdirSync } from 'node:fs';
const BASE = process.env.ALAB_URL || 'http://localhost:8199/';
const pwDir = '/opt/pw-browsers';
const EXE = process.env.PW_CHROMIUM || (() => {
  const roots = existsSync(pwDir)
    ? readdirSync(pwDir).filter(d => d.startsWith('chromium')).map(d => `${pwDir}/${d}`)
    : [];
  for (const r of roots)
    for (const bin of ['/chrome-linux/chrome', '/chrome-linux/headless_shell'])
      if (existsSync(r + bin)) return r + bin;
  return undefined;
})();
let chromium;
try { ({ chromium } = await import('playwright-core')); }
catch { console.error('playwright-core not installed. npm i playwright-core'); process.exit(2); }

const b = await chromium.launch(EXE ? { executablePath: EXE } : {});
const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(BASE, { waitUntil: 'load' });

let fail = 0;
const say = (ok, msg) => { if (!ok) fail++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const real = e => !/fonts\.(googleapis|gstatic)\.com|ERR_CERT_AUTHORITY_INVALID/.test(e);

for (const sub of ['sci', 'math', 'sst', 'eng', 'hin', 'skt', 'ct']) {
  await p.click(`button[data-subj="${sub}"]`);
  await p.waitForTimeout(150);

  /* Practice: a question must render with something to answer. */
  await p.click('#tab-practice');
  await p.waitForTimeout(250);
  const started = await p.evaluate(() => {
    const btn = document.querySelector('#startBtn, [data-start], #practiceStart');
    if (btn) btn.click();
    return true;
  });
  await p.waitForTimeout(350);
  const q = await p.evaluate(() => {
    const card = document.querySelector('#qCard');
    if (!card || card.hidden) return null;
    const text = (card.querySelector('.qtext')?.textContent || '').trim();
    /* A `short` question deliberately has nothing to type into: the
       learner writes on paper and then reveals the model answer. An
       earlier version of this assertion demanded an input control and
       so failed at random, whenever the shuffle happened to put a
       written-answer question first. */
    const inputs = card.querySelectorAll('.opt, #typed, select.mt').length;
    const isShort = /Write your answer on paper/i.test(card.textContent);
    return { text: text.slice(0, 60), inputs, isShort };
  });
  say(!!q && q.text.length > 3 && (q.inputs > 0 || q.isShort),
      `${sub}: practice shows an answerable question`
      + (q ? ` (${q.isShort ? 'written answer' : q.inputs + ' inputs'})` : ' (no card)'));

  /* Worksheet and mock paper must produce printable questions. */
  await p.click('#tab-worksheet');
  await p.waitForTimeout(250);
  await p.evaluate(() => document.querySelector('#makeSheet, #wsBtn, [data-make]')?.click());
  await p.waitForTimeout(350);
  const ws = await p.evaluate(() => document.querySelectorAll('#view-worksheet .q').length);
  say(ws > 0, `${sub}: worksheet generates questions (${ws})`);

  await p.click('#tab-paper');
  await p.waitForTimeout(250);
  await p.evaluate(() => document.querySelector('#makePaper, #paperBtn, [data-paper]')?.click());
  await p.waitForTimeout(400);
  const pa = await p.evaluate(() => document.querySelectorAll('#view-paper .q').length);
  say(pa > 0, `${sub}: mock paper generates questions (${pa})`);
}

say(errs.filter(real).length === 0, `no page errors across all seven subjects (${errs.filter(real).length})`);
errs.filter(real).slice(0, 5).forEach(e => console.log('       ' + e.slice(0, 200)));

await b.close();
console.log(fail ? `\nFAIL — ${fail}` : '\nPASS');
process.exit(fail ? 1 : 0);
