/* Structural check on the question bank.
 *
 *   cd alab && python3 -m http.server 8199 &
 *   node tests/bank-check.mjs
 *
 * It cannot tell you whether 7 x 98 is 686. It can tell you the things
 * that are wrong in a way nobody notices while authoring and every
 * learner notices immediately: an mcq whose answer index points past the
 * end of its options, two identical options so the shuffle offers the
 * same choice twice, a question filed against a chapter that does not
 * exist in its subject, a fill whose accepted answer normalises to
 * nothing (norm() strips punctuation, so "-" alone survives as ""), and
 * a fill that cannot distinguish a negative answer from a positive one,
 * because norm() strips the ASCII hyphen. That last one is not
 * hypothetical: it is how a question asking for the power in
 * 4.5 x 10^-5 would have accepted "5".
 *
 * It reads the assembled BANK out of the running page rather than
 * parsing the file, so it sees what the app sees after every push().
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
const p = await b.newPage();
await p.goto(BASE, { waitUntil: 'load' });

const r = await p.evaluate(() => {
  const problems = [];
  const chapters = {};
  Object.keys(SUBJECTS).forEach(id => {
    chapters[id] = new Set(SUBJECTS[id].chapters.map(c => c.n));
  });
  const perChapter = {}, perSubject = {}, seen = new Map();

  BANK.forEach((q, i) => {
    const sub = q.s || 'sci';                 /* science questions omit `s` */
    const where = `${sub} ch${q.c} #${i}`;
    perSubject[sub] = (perSubject[sub] || 0) + 1;
    const key = sub + ':' + q.c;
    perChapter[key] = (perChapter[key] || 0) + 1;

    if (!chapters[sub]) problems.push(`${where}: unknown subject`);
    else if (!chapters[sub].has(q.c)) problems.push(`${where}: no such chapter in ${sub}`);
    if (!q.e && q.t !== 'short') problems.push(`${where}: no explanation`);

    /* Identical question text twice in one chapter is not merely
       repetitive. QID() is subject + chapter + a hash of the question
       text, so two such questions share one identity: the mistakes book
       and the seen-list cannot tell them apart, and clearing one clears
       the other. Generic stems are how this happens in practice, and
       "Which is correct?" appearing twice in a grammar chapter is the
       usual way in. */
    const text = norm(q.q || '');
    if (text) {
      const k = key + '|' + text;
      if (seen.has(k)) problems.push(`${where}: duplicate of #${seen.get(k)}`);
      else seen.set(k, i);
    }

    if (q.t === 'mcq') {
      if (!Array.isArray(q.o) || q.o.length < 2) problems.push(`${where}: mcq needs options`);
      else {
        if (!(Number.isInteger(q.a) && q.a >= 0 && q.a < q.o.length))
          problems.push(`${where}: answer index ${q.a} outside 0..${q.o.length - 1}`);
        /* Compare what the learner sees, not the normalised form. An
           earlier version used norm(), which strips apostrophes and case
           and so declared "He said, &ldquo;Come in.&rdquo;" a duplicate of
           "He said &ldquo;come in&rdquo;." in a punctuation question where
           the difference IS the question. mcq marking goes by index, so
           only the visible text has to differ. */
        const shown = q.o.map(o => plain(o).trim());
        if (new Set(shown).size !== shown.length)
          problems.push(`${where}: two options read the same on screen`);
        if (shown.some(o => !o)) problems.push(`${where}: an option is empty`);
      }
    } else if (q.t === 'tf') {
      if (typeof q.a !== 'boolean') problems.push(`${where}: tf answer is not a boolean`);
    } else if (q.t === 'fill') {
      if (!Array.isArray(q.a) || !q.a.length) problems.push(`${where}: fill needs answers`);
      else {
        q.a.forEach(acc => {
          if (!norm(acc)) problems.push(`${where}: accepted answer "${acc}" normalises to nothing`);
        });
        /* norm() strips "-", so a fill cannot hold a sign. */
        if (q.a.some(acc => /^[\s]*[-−]\s*[\d.]/.test(String(acc))))
          problems.push(`${where}: fill answer is negative; norm() strips the sign, so "5" would pass for "-5". Use mcq or num.`);
      }
    } else if (q.t === 'num') {
      if (typeof q.a !== 'number' || !isFinite(q.a)) problems.push(`${where}: num answer is not a finite number`);
      if (q.u === undefined) problems.push(`${where}: num has no unit field (use '' if unitless)`);
      if (!q.w) problems.push(`${where}: num has no working`);
    } else if (q.t === 'match') {
      if (!Array.isArray(q.pairs) || q.pairs.length < 2) problems.push(`${where}: match needs pairs`);
      else {
        /* Repeated right-hand values are fine and often the point: a
           categorisation match has several items in one category, and
           the marking compares by value rather than by position, so
           picking either copy is correct. What is not fine is a repeated
           left-hand item, which the learner cannot tell apart, or a
           single right-hand value, which makes the question free. */
        const lefts = q.pairs.map(x => norm(x[0]));
        if (new Set(lefts).size !== lefts.length)
          problems.push(`${where}: two left-hand items are identical`);
        if (new Set(q.pairs.map(x => norm(x[1]))).size < 2)
          problems.push(`${where}: every pair has the same answer, so there is nothing to match`);
      }
    } else if (q.t === 'short') {
      if (!q.a) problems.push(`${where}: short answer has no model answer`);
    } else if (q.t === 'ar') {
      /* Assertion and reason: the options are the fixed AR_OPTS set, so
         only the two statements and the answer index are per-question. */
      if (!q.as || !q.rs) problems.push(`${where}: ar needs both an assertion and a reason`);
      if (!(Number.isInteger(q.a) && q.a >= 0 && q.a < AR_OPTS.length))
        problems.push(`${where}: ar answer index ${q.a} outside 0..${AR_OPTS.length - 1}`);
    } else {
      problems.push(`${where}: unknown type ${q.t}`);
    }
  });

  /* A chapter the app offers to practise but has nothing behind. */
  Object.keys(SUBJECTS).forEach(id => {
    SUBJECTS[id].chapters.forEach(c => {
      if (c.bank && !perChapter[id + ':' + c.n])
        problems.push(`${id} ch${c.n}: offers practice and has no questions`);
    });
  });

  return { total: BANK.length, perSubject, perChapter, problems };
});

console.log('questions:', r.total);
Object.keys(r.perSubject).sort().forEach(k => {
  const chs = Object.keys(r.perChapter).filter(x => x.startsWith(k + ':'));
  const counts = chs.map(x => r.perChapter[x]);
  console.log(`  ${k.padEnd(5)} ${String(r.perSubject[k]).padStart(4)}  across ${chs.length} chapters,`
            + ` fewest ${Math.min(...counts)}, most ${Math.max(...counts)}`);
});
r.problems.slice(0, 40).forEach(x => console.log('  FAIL ' + x));
if (r.problems.length > 40) console.log(`  ... and ${r.problems.length - 40} more`);

await b.close();
console.log(r.problems.length ? `\nFAIL — ${r.problems.length}` : '\nPASS');
process.exit(r.problems.length ? 1 : 0);
