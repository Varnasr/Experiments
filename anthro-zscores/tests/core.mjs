// The arithmetic of anthro-zscores, checked against values worked outside it.
//
//   node anthro-zscores/tests/core.mjs
//
// who-sd-reference.json holds, for four rows of each of WHO's ten expanded
// tables, the measurements WHO prints at -4 to +4 standard deviations. A
// correct z-score turns each of them back into its whole number. WHO prints
// three decimals, so the agreement is to 0.01. The -4 and +4 columns can only
// be matched with WHO's rule beyond three standard deviations.
//
// The five children were scored by a second implementation in Python.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: no <script id="core"> in anthro-zscores/index.html'); process.exit(1); }
const mod = { exports: {} };
new Function('module', m[1])(mod);
const X = mod.exports;
// The data file sets a property on window. Run it with a stand-in.
const load = (file, name) => { const w = {}; new Function('window', fs.readFileSync(path.join(here, '..', 'data', file), 'utf8'))(w); return w[name]; };

let checks = 0; const errors = [];
const ok = (name, cond, detail = '') => { checks++; if (!cond) errors.push(`${name}${detail ? ': ' + detail : ''}`); };
const near = (name, got, want, tol = 1e-9) => ok(name, got != null && Math.abs(got - want) <= tol, `got ${got}, want ${want}`);

const W = load('who2006.js', 'WHO2006');
const ref = JSON.parse(fs.readFileSync(path.join(here, 'who-sd-reference.json'), 'utf8'));
// ---- the tables
ok('ten tables', Object.keys(W).length === 10 && Object.keys(ref).length === 10);
for (const k of ['wfa', 'lhfa', 'bfa']) for (const s of ['m', 'f']) ok(k + '_' + s + ' runs from day 0 to day 1856', W[k + '_' + s].x0 === 0 && W[k + '_' + s].step === 1 && W[k + '_' + s].n === 1857 && W[k + '_' + s].M.length === 1857);
for (const s of ['m', 'f']) {
  ok('wfl_' + s + ' runs from 45 to 110 cm', W['wfl_' + s].x0 === 45 && W['wfl_' + s].step === 0.1 && W['wfl_' + s].n === 651);
  ok('wfh_' + s + ' runs from 65 to 120 cm', W['wfh_' + s].x0 === 65 && W['wfh_' + s].step === 0.1 && W['wfh_' + s].n === 551);
}
// Values anyone can read off the WHO charts: boys at birth, L 0.3487, M 3.3464, S 0.14602.
const p0 = X.lms(W.wfa_m, 0);
ok('boys, weight at birth', p0.L === 0.3487 && p0.M === 3.3464 && p0.S === 0.14602);
near('girls, median length at birth', X.lms(W.lhfa_f, 0).M, 49.1477, 1e-12);
// ---- every printed standard deviation, turned back into its number
const SDZ = { SD4neg: -4, SD3neg: -3, SD2neg: -2, SD1neg: -1, SD0: 0, SD1: 1, SD2: 2, SD3: 3, SD4: 4 };
let n = 0, worst = 0;
for (const [tab, rows] of Object.entries(ref)) for (const row of rows) for (const [col, y] of Object.entries(row.sd)) {
  const z = X.z(X.lms(W[tab], row.x), y, !tab.startsWith('lhfa'));
  n++; worst = Math.max(worst, Math.abs(z - SDZ[col]));
  near(`${tab} at ${row.x}, ${col}`, z, SDZ[col], 0.01);
}
ok('360 printed values were checked', n === 360, `checked ${n}`);
// Without WHO's rule, +4 for a newborn boy's weight comes out as 3.92.
near('the plain formula at +4 is not 4', X.z(p0, 5.642, false), 3.924, 0.005);
// ---- between two rows of a table
near('halfway between two lengths', X.z(X.lms(W.wfl_f, 77.55), 9.2, true), -0.4993314700843987, 1e-9);
ok('below the table: nothing', X.lms(W.wfl_f, 44.9) === null); ok('above the table: nothing', X.lms(W.wfh_m, 120.1) === null);
ok('the last row is reachable', X.lms(W.wfh_m, 120) !== null && X.lms(W.wfa_f, 1856) !== null);
// ---- whole children, against Python
const kids = [
  [{ sex: 'f', ageDays: 548, weight: 9.2, height: 77.5 }, [-0.8762786477, -1.1060869064, -0.4883968458, -0.3063824922]],
  [{ sex: 'm', ageDays: 913, weight: 10.4, height: 84.0 }, [-2.0984070208, -2.3287879023, -1.1711976569, -0.8958054305]],
  [{ sex: 'm', ageDays: 1644, weight: 14.1, height: 99.5 }, [-1.6000642324, -1.624743389, -0.9430374333, -0.8236429755]],
  [{ sex: 'f', ageDays: 213, weight: 4.1, height: 58.0 }, [-4.8520706789, -4.0100216904, -3.0658578059, -3.6912722627]],
  [{ sex: 'm', ageDays: 400, weight: 16.5, height: 78.0 }, [4.9812412046, 0.3775703978, 6.032072153, 6.153187356]],
];
kids.forEach(([c, want], i) => { const r = X.assess(W, { ...c, how: 'auto' }); ['waz', 'haz', 'whz', 'baz'].forEach((k, j) => near(`child ${i + 1}, ${k}`, r[k], want[j], 1e-8)); });
// ---- position: a child of 30 months measured lying down loses 0.7 cm
let a = X.assess(W, { sex: 'm', ageDays: 913, weight: 10.4, height: 84.7, how: 'L' });
near('lying down from two years: 0.7 cm off', a.haz, -2.3287879023, 1e-8); ok('and the page says so', a.notes.length === 1);
a = X.assess(W, { sex: 'f', ageDays: 548, weight: 9.2, height: 76.8, how: 'H' });
near('standing under two years: 0.7 cm on', a.haz, -1.1060869064, 1e-8);
// Day 730 is under two years and uses length; day 731 uses height.
ok('day 730 is compared on length', X.assess(W, { sex: 'f', ageDays: 730, weight: 11, height: 86, how: 'H' }).notes.length === 1);
ok('day 731 is compared on height', X.assess(W, { sex: 'f', ageDays: 731, weight: 11, height: 86, how: 'H' }).notes.length === 0);
// A height of 62 cm at 25 months is below the weight-for-height table.
a = X.assess(W, { sex: 'f', ageDays: 760, weight: 6, height: 62, how: 'auto' });
ok('off the weight-for-height table: no score and a note', a.whz === null && a.haz !== null && a.notes.length === 1);
// ---- implausible values
a = X.assess(W, { sex: 'm', ageDays: 400, weight: 16.5, height: 78.0, how: 'auto' });
ok('weight-for-height above +5 is flagged', a.flags.whz === true && a.flags.baz === true && !a.flags.haz);
ok('weight-for-age of +4.98 is inside the limit of +5', !a.flags.waz);
ok('height-for-age below -6 is flagged', X.assess(W, { sex: 'f', ageDays: 548, weight: 9.2, height: 60, how: 'auto' }).flags.haz === true);
ok('an age past 1,856 days gives nothing', X.assess(W, { sex: 'f', ageDays: 1857, weight: 15, height: 100, how: 'auto' }).haz === null);
ok('a missing weight still gives height-for-age', X.assess(W, { sex: 'f', ageDays: 548, weight: NaN, height: 77.5, how: 'auto' }).haz !== null);
// ---- months to days
ok('18 months is 548 days', X.days(18) === 548); ok('24 months is 731 days', X.days(24) === 731); ok('60 months is 1826 days', X.days(60) === 1826);
// ---- the list
const L = X.parseList('sex, months, weight, height\nf, 18, 9.2, 77.5\nboy; 30; 10.4; 84.7; L\n2\t7\t4.1\t58\nx, 3, 5, 60\n\nm, 13.1417, 16.5, 78');
ok('a header line is skipped and four children are read', L.rows.length === 4, `read ${L.rows.length}`);
ok('an unreadable line is reported with its number', L.errors.length === 1 && L.errors[0].includes('5'));
ok('boy, 2 and a position are understood', L.rows[1].sex === 'm' && L.rows[1].how === 'L' && L.rows[2].sex === 'f' && L.rows[2].ageDays === 213);
const res = L.rows.map(c => ({ ...c, ...X.assess(W, c) }));
const pv = X.prevalence(res);
// Height-for-age: -1.11, -2.33, -4.01 and +0.38. Two of four are below -2 and one below -3.
near('stunted: two of four', pv.haz.below2, 0.5, 1e-12); near('severely stunted: one of four', pv.haz.below3, 0.25, 1e-12);
// Weight-for-height: -0.49, -1.17, -3.07, and +6.03, which is implausible and left out.
ok('an implausible score leaves the count', pv.whz.n === 3 && pv.whz.flagged === 1);
near('wasted: one of three', pv.whz.below2, 1 / 3, 1e-12);
near('mean height-for-age', pv.haz.mean, (-1.1060869064 - 2.3287879023 - 4.0100216904 + 0.3775703978) / 4, 1e-6);
ok('no children, no share', X.prevalence([]).haz.below2 === null);

if (errors.length) { console.error(`FAIL: ${errors.length} of ${checks} checks`); for (const e of errors) console.error('  ' + e); process.exit(1); }
console.log(`OK: ${checks} checks on anthro-zscores.`);
