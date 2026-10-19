/* The phonics path must never ask a child to read a letter he has not met.
 *
 *   python3 -m http.server 8199 &                     # from the REPO ROOT
 *   LK_URL=http://localhost:8199/kundendu-worksheets/ node kundendu-worksheets/tests/sequence.mjs
 *
 * Module 2 teaches s a t p i n. Module 3 is called "First words to read"
 * and says six letters is enough to read real words. For a year it then
 * showed him cat, van, fish and bag, and handed him a book with c, h, m, r,
 * b, g, d, o and e in it. Nothing failed. The worksheet generated, the
 * answers marked, the book turned its pages. A six-year-old simply could
 * not do it, and the only way to find that out was to sit with him.
 *
 * That is the failure this file exists for. It is not a rendering check.
 * It compares the words a lesson asks him to DECODE against the letters the
 * path has taught by that point, and those are different things: a picture
 * cue for first-sound work may be any word at all, because he answers from
 * the sound and never reads the spelling. So only the banks he has to read
 * or spell are checked, and they are named here one by one rather than
 * scraped, because a scrape that silently matches nothing passes.
 */
import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.LK_URL || 'http://localhost:8199/kundendu-worksheets/';
const EXE = process.env.PW_CHROMIUM || (() => {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(base)) return undefined;
  for (const n of readdirSync(base)) {
    const c = path.join(base, n, 'chrome-linux', 'chrome');
    if (n.startsWith('chromium-') && existsSync(c)) return c;
  }
  return undefined;
})();

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message.split('\n')[0]));
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1200);

const result = await page.evaluate(() => {
  // What the CHILD has to decode, lesson by lesson. Checking the word banks
  // instead would pass a lesson written as lsBlend(SET1.concat(FAM.at)),
  // which is the shape the original defect had: the bank was never wrong,
  // the lesson reached past it.
  const DECODES = {
    p3a: q => [q.answer],                                   // blend and read
    p3b: q => [q.answer],                                   // hear it, spell it
    p3c: q => [q.prompt],                                   // read it, pick the vowel
    p3d: q => [q.prompt],                                   // read the caption
    p3e: q => [q.answer],                                   // blend four sounds
    p4c: q => (q.accept || []),                             // complete the word
    p4d: q => [q.prompt],                                   // read it, name the vowel
    p4f: q => (q.type === 'readpage' ? [q.text] : []),      // the pages, not the title
  };
  const LETTERS = id => (id.startsWith('p3') ? P2_LETTERS : P4_LETTERS);
  const words = t => String(t).replace(/[^A-Za-z ]/g, ' ').split(' ').filter(w => w.length > 1);

  const perLesson = {};
  const sizes = {};
  Object.keys(DECODES).forEach(id => {
    const les = LESSONS[id];
    if (!les) { perLesson[id] = ['LESSON MISSING']; return; }
    const seen = new Set();
    for (let i = 0; i < 25; i++) {
      let qs = [];
      try { qs = les.gen(10, 'easy'); } catch (e) { perLesson[id] = ['THREW ' + e.message]; return; }
      qs.forEach(q => DECODES[id](q).forEach(t => words(t).forEach(w => seen.add(w.toLowerCase()))));
    }
    sizes[id] = seen.size;
    const letters = LETTERS(id);
    perLesson[id] = [...seen].filter(w => w.split('').some(c => letters.indexOf(c) < 0));
  });

  return {
    perLesson, sizes,
    bookModule: PHONICS_MODULES.find(m => m.lessons.some(l => l.id === 'p4f')) ? 'p4' : 'missing',
    lessons: Object.keys(LESSONS).length,
  };
});

const problems = [];
const check = (name, bad) => {
  if (bad.length) problems.push(`${name}: ${bad.join(', ')}`);
  console.log(`  ${bad.length ? 'FAIL' : 'ok  '}  ${name}`);
};

console.log(`Phonics sequence, against ${BASE}`);
const WHAT = {
  p3a: 'p3a blend and read', p3b: 'p3b hear it and spell it', p3c: 'p3c read it and pick the vowel',
  p3d: 'p3d read the caption', p3e: 'p3e blend four sounds', p4c: 'p4c complete the word',
  p4d: 'p4d read it and name the vowel', p4f: 'p4f the pages of the first book',
};
Object.keys(WHAT).forEach(id => check(WHAT[id] + ' (' + (id.startsWith('p3') ? 's a t p i n' : 'satpinckehrmdgo') + ')',
                                       result.perLesson[id] || ['NOT CHECKED']));

// A generator that has quietly stopped producing words passes every
// "is each word allowed?" test there is, because there is nothing to fail.
const MINIMUM = { p3a: 10, p3b: 10, p3c: 10, p3d: 8, p3e: 10, p4c: 12, p4d: 14, p4f: 20 };
const thin = Object.entries(MINIMUM).filter(([id, m]) => (result.sizes[id] || 0) < m)
  .map(([id, m]) => `${id} yielded ${result.sizes[id] || 0} words, under ${m}`);
check('no lesson quietly stopped producing words', thin);

if (result.bookModule !== 'p4') problems.push('the first book is no longer in module 4');
if (pageErrors.length) problems.push('page errors: ' + pageErrors.join('; '));

console.log(`\n${result.lessons} lessons. Distinct words per lesson: ${JSON.stringify(result.sizes)}`);
await browser.close();

if (problems.length) {
  console.error('\nFAIL');
  problems.forEach(p => console.error('  - ' + p));
  process.exit(1);
}
console.log('\nPASS: every word a lesson asks him to read is one he has met.');
