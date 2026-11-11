// The arithmetic of care-valuation, checked against values worked outside it.
//
//   node care-valuation/tests/core.mjs
//
// The valuation is worked by hand in the comments. The minutes in the data
// file were computed from the Time Use Survey 2024 unit-level data, and the
// all-India rows are compared here with the figures MoSPI publishes for the
// same indicator. The wages are compared with the two CSV files in data/,
// which are the series as read from MoSPI.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: no <script id="core"> in care-valuation/index.html'); process.exit(1); }
const mod = { exports: {} };
new Function('module', m[1])(mod);
const X = mod.exports;
// The data file sets a property on window. Run it with a stand-in.
const load = (file, name) => { const w = {}; new Function('window', fs.readFileSync(path.join(here, '..', 'data', file), 'utf8'))(w); return w[name]; };

let checks = 0; const errors = [];
const ok = (name, cond, detail = '') => { checks++; if (!cond) errors.push(`${name}${detail ? ': ' + detail : ''}`); };
const near = (name, got, want, tol = 1e-9) => ok(name, got != null && Math.abs(got - want) <= tol, `got ${got}, want ${want}`);

const D = load('care-data.js', 'CARE_DATA').states;
// ---- hourly rate
near('casual: 400 a day over 8 hours', X.hourly('casual', 400, 8, 26), 50, 1e-12);
near('regular: 20,800 a month over 26 days of 8 hours', X.hourly('regular', 20800, 8, 26), 100, 1e-12);
near('regular: paid days matter', X.hourly('regular', 20800, 8, 20), 130, 1e-12);
near('casual: paid days do not', X.hourly('casual', 400, 8, 20), 50, 1e-12);
ok('no wage, no rate', X.hourly('casual', null, 8, 26) === null && X.hourly('casual', 0, 8, 26) === null);
ok('no hours, no rate', X.hourly('casual', 400, 0, 26) === null);
// ---- value: 300 minutes at 50 an hour is 250 a day and 91,250 a year
let v = X.value(300, 50);
near('a day', v.day, 250, 1e-12); near('a year', v.year, 91250, 1e-9); near('a month is a twelfth of a year', v.month, 91250 / 12, 1e-9);
ok('no rate, no value', X.value(300, null) === null);
near('zero minutes are worth nothing', X.value(0, 50).year, 0, 1e-12);
// ---- scope
const rec = [283.3, 57.6, 0.8, 0.4, 166995];
near('both', X.minutes(rec, 'both'), 340.9, 1e-9); near('domestic', X.minutes(rec, 'domestic'), 283.3, 1e-12); near('care', X.minutes(rec, 'care'), 57.6, 1e-12);
near('the error of the sum is bounded by the sum of the errors', X.minutesSe(rec, 'both'), 1.2, 1e-9);
near('the error of domestic minutes', X.minutesSe(rec, 'domestic'), 0.8, 1e-12); near('the error of care minutes', X.minutesSe(rec, 'care'), 0.4, 1e-12);
// ---- the minutes against what MoSPI publishes for All India (TUS indicator 8)
const pub = { '15-59|female': [283, 58], '15-59|male': [26, 16], '6+|female': [236, 47], '6+|male': [24, 13] };
for (const [k, [dom, care]] of Object.entries(pub)) {
  // MoSPI publishes whole minutes and the file holds one decimal, so the two agree when they are within 0.55.
  near('All India domestic, ' + k, D['All India'].min[k][0], dom, 0.55);
  near('All India caregiving, ' + k, D['All India'].min[k][1], care, 0.55);
}
// ---- the wages against the series as read
const csv = f => Object.fromEntries(fs.readFileSync(path.join(here, '..', 'data', f), 'utf8').trim().split('\n').slice(1).map(l => { const c = l.split(','); return [c[0], c.slice(1).map(Number)]; }));
const w6 = csv('plfs6.csv'), w7 = csv('plfs7.csv');
ok('37 areas: 36 states and union territories and All India', Object.keys(D).length === 37 && Object.keys(w6).length === 37 && Object.keys(w7).length === 37);
let wageOk = true;
for (const s of Object.keys(D)) ['male', 'female', 'person'].forEach((g, i) => {
  if ((D[s].regular[g] ?? 0) !== w6[s][i] || (D[s].casual[g] ?? 0) !== w7[s][i]) wageOk = false;
});
ok('every wage in the data file equals the series as read', wageOk);
ok('Lakshadweep: no casual wage for women is a missing value, not zero', D['Lakshadweep'].casual.female === null);
near('All India regular wage, all workers', D['All India'].regular.person, 21454.87, 1e-9);
near('All India casual wage, women', D['All India'].casual.female, 301.91, 1e-9);
ok('every state has minutes for both sexes and both age groups', Object.values(D).every(d => ['15-59|female', '15-59|male', '6+|female', '6+|male'].every(k => d.min[k] && d.min[k].length === 5 && d.min[k][4] > 0)));
// ---- one state, by hand. All India, 15 to 59, both kinds of work, casual wage of all workers:
// women 283.3 + 57.6 = 340.9 minutes; 429.63 / 8 = 53.70375 an hour; 340.9 / 60 * 53.70375 = 305.1268... a day.
const o = { age: '15-59', scope: 'both', wage: 'casual', wsex: 'person', hoursPerDay: 8, daysPerMonth: 26 };
let r = X.state(D['All India'], o);
near('All India women, a day', r.female.value.day, 340.9 / 60 * (429.63 / 8), 1e-9);
near('All India women, a year', r.female.value.year, 340.9 / 60 * (429.63 / 8) * 365, 1e-6);
near('All India men, a day', r.male.value.day, 42.0 / 60 * (429.63 / 8), 1e-9);
near('with one wage for both, the ratio of values is the ratio of minutes', r.ratio, 340.9 / 42.0, 1e-9);
// Own-sex wages: women at 301.91 and men at 462.64.
r = X.state(D['All India'], { ...o, wsex: 'own' });
near('own wage, women', r.female.rate, 301.91 / 8, 1e-12); near('own wage, men', r.male.rate, 462.64 / 8, 1e-12);
near('own wages shrink the ratio by the wage gap', r.ratio, (340.9 * 301.91) / (42.0 * 462.64), 1e-9);
// Regular wage: 21,454.87 / 26 / 8.
r = X.state(D['All India'], { ...o, wage: 'regular' });
near('regular wage, an hour', r.female.rate, 21454.87 / 208, 1e-9);
// Typed-in minutes replace the survey's.
r = X.state(D['All India'], { ...o, override: { female: 120, male: null } });
near('override, women', r.female.value.day, 120 / 60 * (429.63 / 8), 1e-9); near('no override, men', r.male.minutes, 42.0, 1e-9);
// Lakshadweep at own-sex casual wages has no value for women and one for men.
r = X.state(D['Lakshadweep'], { ...o, wsex: 'own' });
ok('Lakshadweep women: no value', r.female.value === null && r.ratio === null); ok('Lakshadweep men: a value', r.male.value.year > 0);
// ---- the table
const t = X.table(D, o);
ok('the table has every area', t.length === 37);
ok('the table is sorted by the value of a woman\'s work', t.every((x, i) => i === 0 || t[i - 1].female.value.year >= x.female.value.year));
ok('a missing value sorts last', X.table(D, { ...o, wsex: 'own' }).slice(-1)[0].name === 'Lakshadweep');

if (errors.length) { console.error(`FAIL: ${errors.length} of ${checks} checks`); for (const e of errors) console.error('  ' + e); process.exit(1); }
console.log(`OK: ${checks} checks on care-valuation.`);
