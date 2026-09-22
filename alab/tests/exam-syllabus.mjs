/* The exam and syllabus feature, driven in a real browser.
 *
 *   python3 -m http.server 8199        # from the REPO ROOT, not from alab/,
 *                                     # so the sibling ../js/ resolves
 *   ALAB_URL=http://localhost:8199/alab/ node tests/exam-syllabus.mjs
 *
 * Four things here are worth a test and nothing else would catch them.
 *
 * A date that has passed must stop being the headline. That is the defect
 * this feature exists to fix: the old model held one date in alab.plan.v1,
 * so the day after the paper the homepage filled a phone screen with a
 * teal DONE. A past exam now leaves the strip and joins the finished list.
 *
 * A syllabus has to survive a reload, because it is typed once and used for
 * weeks. It lives in localStorage and nothing on the page shows you whether
 * the write happened.
 *
 * Ticking chapters has to actually narrow the work. A syllabus that changes
 * nothing downstream looks identical to one that works, right up to the
 * evening before the paper.
 *
 * And the PDF reader has to either read the PDF or say it could not. A
 * silent half-read is worse than a refusal: it ticks some chapters, looks
 * like it understood, and quietly omits the rest of the paper.
 */
import { chromium } from 'playwright-core';
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.ALAB_URL || 'http://localhost:8199/alab/';
const EXE = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

let pass = 0, fail = 0;
const ok = (c, m) => { if(c){ pass++; console.log('ok   ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* A one-page PDF whose only content stream is Flate-compressed text. This is
   the shape a school notice actually arrives in, minus the letterhead. */
function makePdf(line){
  const content = Buffer.from(`BT /F1 12 Tf 72 720 Td (${line}) Tj ET\n`, 'latin1');
  const z = deflateSync(content);
  const head = Buffer.from(
    '%PDF-1.4\n' +
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n' +
    `4 0 obj<</Length ${z.length}/Filter/FlateDecode>>\nstream\n`, 'latin1');
  const tail = Buffer.from('\nendstream\nendobj\ntrailer<</Root 1 0 R>>\n%%EOF\n', 'latin1');
  return Buffer.concat([head, z, tail]);
}

const b = await chromium.launch({ executablePath: EXE });
const ctx = await b.newContext({ viewport:{width:390, height:844} });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));

await p.goto(BASE, { waitUntil:'load' });
await p.waitForTimeout(400);

/* ---------- 1. pure functions, before any UI ---------- */
const parsed = await p.evaluate(() => parseSyllabusText('sci', 'Half yearly covers Electricity and chapter 7 only.'));
ok(parsed.byTitle.includes(4), 'a chapter named in prose is matched by title (Electricity -> ch 4)');
ok(parsed.byNumber.includes(7), '"chapter 7" is matched by number');
ok(!parsed.byTitle.includes(7) && !parsed.byNumber.includes(4), 'the two kinds of match are reported separately');

const bare = await p.evaluate(() => parseSyllabusText('sci', 'Bring 4 sharpened pencils and 7 sheets.'));
ok(bare.byNumber.length === 0 && bare.byTitle.length === 0,
   'a bare number with no chapter word is not treated as a chapter');

ok(await p.evaluate(() => chaptersFromPages('sci', '10-40')) === null,
   'a page range returns null, not an empty list, when the book has no page index');

const byPage = await p.evaluate(() => {
  savePageIndex('sci', {2:1, 3:20, 4:44, 5:70});
  return chaptersFromPages('sci', '20-50');
});
ok(JSON.stringify(byPage) === '[3,4]', 'pages 20-50 resolve to the chapters that span them (got ' + JSON.stringify(byPage) + ')');

const edge = await p.evaluate(() => chaptersFromPages('sci', '44'));
ok(JSON.stringify(edge) === '[4]', 'a single page resolves to the one chapter it falls in');

/* ---------- 2. the editor ---------- */
await p.evaluate(() => { localStorage.removeItem('alab.exams.v1'); });
await p.reload({ waitUntil:'load' });
await p.waitForTimeout(300);

ok(await p.isHidden('#examStrip') && /Add an annual exam/.test(await p.textContent('#examsCard')),
   'with nothing entered the strip stays out of the way and the card asks once');

await p.click('#addExam');
await p.waitForSelector('#examDlg');
ok(await p.isVisible('#examDlg'), 'the editor opens');

const wide = await p.evaluate(() =>
  document.documentElement.scrollWidth <= document.documentElement.clientWidth);
ok(wide, 'the editor does not scroll sideways at 390px');

const soon = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10);
await p.click('[data-kind="midterm"]');
await p.fill('#exDate', soon);
await p.fill('#exName', 'Half yearly');
await p.click('#exc2');
await p.click('#exc3');
await p.click('#exSave');
await p.waitForTimeout(250);

const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('alab.exams.v1')).list);
ok(stored.length === 1 && stored[0].kind === 'midterm', 'the exam is saved with its kind');
ok(JSON.stringify(stored[0].syl.chapters) === '[2,3]', 'the ticked chapters are saved (got ' + JSON.stringify(stored[0].syl.chapters) + ')');

await p.reload({ waitUntil:'load' });
await p.waitForTimeout(300);
const strip = (await p.textContent('#examStrip')).replace(/\s+/g, ' ').trim();
const tile1 = await p.evaluate(() => {
  const t = document.querySelector('#tiles .tile');
  return t ? { n: t.querySelector('b').textContent.trim(), label: t.querySelector('small').textContent.trim() } : null;
});
ok(tile1 && tile1.n === '9' && /midterm/i.test(tile1.label),
   'after a reload the first tile counts down to it: ' + JSON.stringify(tile1));
ok(/Midterm/i.test(strip) && /Syllabus/.test(strip), 'and the strip names it and links to the syllabus: ' + JSON.stringify(strip.slice(0, 70)));
/* The number appears once. Printing it large in the strip as well as in the
   tile is how this page came to have two countdowns saying the same thing. */
ok((strip.match(/\b9\b/g) || []).length === 0, 'the strip does not repeat the tile\'s number');
ok(!/done/i.test(strip), 'a future exam is not reported as done');

/* ---------- 3. does the syllabus narrow anything ---------- */
const narrowed = await p.evaluate(() => {
  const set = examChapterSet('sci');
  return set ? Array.from(set).sort((a, b) => a - b) : null;
});
ok(JSON.stringify(narrowed) === '[2,3]', 'the active syllabus is what the exam ticked, not the old hardcoded set');

const vis = await p.evaluate(() => {
  examOnly = true;
  const a = visibleChapters().map(c => c.n);
  examOnly = false;
  return a;
});
ok(JSON.stringify(vis) === '[2,3]', 'the chapter filter narrows to the syllabus (got ' + JSON.stringify(vis) + ')');

const poolInside = await p.evaluate(() => {
  const set = examChapterSet('sci');
  return {inside:BANK.filter(q => q.s === 'sci' && set.has(q.c)).length,
          outside:BANK.filter(q => q.s === 'sci' && !set.has(q.c)).length};
});
ok(poolInside.inside > 0 && poolInside.outside > 0,
   'the mock paper has a pool inside the syllabus and one outside it to exclude ('
   + poolInside.inside + ' in, ' + poolInside.outside + ' out)');

/* an empty syllabus must mean the whole subject, not an empty paper */
const whole = await p.evaluate(() => {
  const list = JSON.parse(localStorage.getItem('alab.exams.v1')).list;
  list[0].syl.chapters = [];
  localStorage.setItem('alab.exams.v1', JSON.stringify({list, migrated:true}));
  return null;
});
await p.reload({ waitUntil:'load' });
await p.waitForTimeout(250);
const openSyl = await p.evaluate(() => {
  const set = examChapterSet('sci');
  return set ? Array.from(set).length : 'null';
});
ok(openSyl === 'null' || openSyl > 3,
   'an exam with nothing ticked does not silently hide every chapter (got ' + openSyl + ')');

/* ---------- 4. a past exam stops being the headline ---------- */
await p.evaluate(() => {
  const past = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  localStorage.setItem('alab.exams.v1', JSON.stringify({migrated:true, list:[
    {id:'p1', kind:'unit', name:'Unit test', subject:'sci', date:past, syl:{chapters:[2], topics:{}, pages:'', note:''}}
  ]}));
});
await p.reload({ waitUntil:'load' });
await p.waitForTimeout(300);
const afterStrip = (await p.textContent('#examStrip')).trim();
ok(/Nothing coming up/i.test(afterStrip),
   'a date that has passed leaves the strip rather than headlining: ' + JSON.stringify(afterStrip.slice(0, 60)));
const listText = await p.textContent('#examsList');
ok(/Unit test/.test(listText) && /done/.test(listText), 'it appears in the list below, marked done');

/* The original defect was not a wrong string, it was a 2.6rem word filling a
   phone screen. Measure the largest type on the page rather than trusting
   that the element that carried it is gone. */
const big = await p.evaluate(() => {
  let max = 0, what = '';
  document.querySelectorAll('#view-today *').forEach(el => {
    if(el.offsetParent === null && el !== document.body) return;
    const t = Array.from(el.childNodes).filter(n => n.nodeType === 3)
                   .map(n => n.textContent.trim()).join('');
    if(!t) return;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if(px > max){ max = px; what = t.slice(0, 30); }
  });
  return {max:Math.round(max), what:what};
});
ok(big.max <= 34, `nothing on Today is set larger than 34px when the exam has passed (${big.max}px on ${JSON.stringify(big.what)})`);

/* ---------- 5. the PDF reader ---------- */
const dir = mkdtempSync(join(tmpdir(), 'alab-pdf-'));
const good = join(dir, 'syllabus.pdf');
writeFileSync(good, makePdf('Half yearly syllabus: Chapter 4 and Chapter 5 only'));

await p.click('[data-editexam]');
await p.waitForSelector('#examDlg');
await p.setInputFiles('#exFile', good);
await p.click('#exReadGo');
await p.waitForTimeout(600);
const readOut = await p.textContent('#exReadOut');
ok(/Ticked 2 chapters/.test(readOut), 'a text PDF is read and its chapters ticked: ' + JSON.stringify(readOut.trim().slice(0, 60)));

/* a PDF with no extractable text must refuse, not half-succeed */
const scan = join(dir, 'scan.pdf');
writeFileSync(scan, Buffer.from('%PDF-1.4\n1 0 obj<</Type/XObject/Subtype/Image>>endobj\ntrailer<<>>\n%%EOF\n', 'latin1'));
await p.setInputFiles('#exFile', scan);
await p.evaluate(() => { document.querySelector('#exPaste').value = ''; });
await p.click('#exReadGo');
await p.waitForTimeout(600);
const refuse = await p.textContent('#exReadOut');
ok(/did not give up readable text|Nothing to read/.test(refuse),
   'a PDF with no text says so instead of ticking nothing quietly: ' + JSON.stringify(refuse.trim().slice(0, 60)));

ok(errors.length === 0, 'no page errors throughout (' + errors.join(' | ') + ')');

await b.close();
console.log('\n' + (fail ? 'FAIL — ' + fail : 'PASS'));
process.exit(fail ? 1 : 0);
