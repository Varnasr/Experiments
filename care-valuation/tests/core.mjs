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
const o = { age: '15-59', scope: 'both', wage: 'casual', wsex: 'person', hours: 'own', hoursPerDay: 8, daysPerMonth: 26 };
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
// ---- hours from the survey
near('casual: 400 a day over 7.5 hours', X.hourlySurvey('casual', 400, 7.5), 400 / 7.5, 1e-12);
near('regular: 26,000 a month over 48 hours a week', X.hourlySurvey('regular', 26000, 48), 26000 / 208, 1e-9);
ok('no hours, no rate', X.hourlySurvey('casual', 400, null) === null && X.hourlySurvey('regular', 0, 48) === null);
// All India, all workers: a casual day is 7.7 hours and a regular week is 48.8 hours.
const os = { ...o, hours: 'survey' };
r = X.state(D['All India'], os);
near('survey hours, casual rate', r.female.rate, 429.63 / 7.7, 1e-9);
near('survey hours, women a day', r.female.value.day, 340.9 / 60 * (429.63 / 7.7), 1e-9);
ok('the count of workers behind the wage is reported', r.female.workers === 27092 && r.female.hours === 7.7);
r = X.state(D['All India'], { ...os, wage: 'regular' });
near('survey hours, regular rate', r.female.rate, 21454.87 / (48.8 * 52 / 12), 1e-9);
// Own-sex wages use own-sex hours: women 7.1 hours on a casual day, men 7.85.
r = X.state(D['All India'], { ...os, wsex: 'own' });
near('own hours, women', r.female.rate, 301.91 / 7.1, 1e-9); near('own hours, men', r.male.rate, 462.64 / 7.85, 1e-9);
// ---- wages from too few workers are not used
ok('the floor is 30 workers', X.MIN_N === 30);
r = X.state(D['Chandigarh'], os);
ok('Chandigarh: 24 casual workers, no value', r.female.value === null && r.female.thin === true && r.female.workers === 24);
ok('Chandigarh: 421 regular workers, a value', X.state(D['Chandigarh'], { ...os, wage: 'regular' }).female.value.year > 0);
r = X.state(D['Delhi'], { ...os, wsex: 'own' });
ok('Delhi women: three casual workers, no value; men have one', r.female.value === null && r.female.workers === 3 && r.male.value.year > 0);
ok('Mizoram women: one casual worker', X.state(D['Mizoram'], { ...os, wsex: 'own' }).female.workers === 1);
ok('a thin wage is refused with typed-in hours too', X.state(D['Chandigarh'], o).female.value === null);
// ---- the cells against the file the script wrote
const cellRows = fs.readFileSync(path.join(here, '..', 'data', 'plfs_cells.csv'), 'utf8').trim().split('\n').slice(1).map(l => l.split(','));
ok('111 cells: 37 areas by three groups', cellRows.length === 111);
ok('every cell in the data file equals the script\'s output', cellRows.every(([s, g, rn, rh, cn, ch]) => { const c = D[s].cells[g]; return c[0] === +rn && c[1] === (rh === '' ? null : +rh) && c[2] === +cn && c[3] === (ch === '' ? null : +ch); }));
ok('18 casual cells and 2 regular cells are below the floor', cellRows.filter(c => +c[4] < 30).length === 18 && cellRows.filter(c => +c[2] < 30).length === 2);
// ---- the table
const t = X.table(D, o);
ok('the table has every area', t.length === 37);
ok('the table is sorted by the value of a woman\'s work, with missing values last', t.every((x, i) => i === 0 || (t[i - 1].female.value ? t[i - 1].female.value.year : -1) >= (x.female.value ? x.female.value.year : -1)));
ok('a missing value sorts last', X.table(D, { ...o, wsex: 'own' }).slice(-1)[0].female.value === null && X.table(D, { ...o, wsex: 'own' })[0].female.value !== null);

// ---- 2019, and the two years side by side
// change() on made-up numbers worked by hand: 300 to 330 minutes with errors 6 and 8 is
// +30 with error 10; 73,000 rupees at a price ratio of 1.25 is 91,250, and 109,500 is 20% above it.
const mk = (minutes, se, year, rate) => ({ minutes, se, rate, value: year == null ? null : { year } });
const ch = X.change({ female: mk(300, 6, 73000, 40), male: mk(40, 3, null, null) }, { female: mk(330, 8, 109500, 60), male: mk(42, 4, 9000, 60) }, 1.25);
near('change: difference in minutes', ch.female.diff, 30, 1e-12);
near('change: error of the difference is the root of the sum of squares', ch.female.se, 10, 1e-12);
ok('change: 30 on an error of 10 is clear', ch.female.clear === true);
near('change: the earlier value in later prices', ch.female.value[0], 91250, 1e-9);
near('change: real change in value', ch.female.real, 0.2, 1e-12);
near('change: real change in the hourly rate, 60 over 40 x 1.25', ch.female.rate, 0.2, 1e-12);
ok('change: 2 on an error of 5 is not clear', ch.male.clear === false && Math.abs(ch.male.se - 5) < 1e-12);
ok('change: no value in one year, no real change', ch.male.real === null && ch.male.rate === null && ch.male.value[0] === null && ch.male.value[1] === 9000);
ok('change: exactly 1.96 errors counts as clear', X.change({ female: mk(0, 3, 1, 1), male: mk(0, 3, 1, 1) }, { female: mk(9.8, 4, 1, 1), male: mk(9.7, 4, 1, 1) }, 1).female.clear === true && X.change({ female: mk(0, 3, 1, 1), male: mk(0, 3, 1, 1) }, { female: mk(9.8, 4, 1, 1), male: mk(9.7, 4, 1, 1) }, 1).male.clear === false);

const Y = load('care-2019.js', 'CARE_DATA_2019'), D19 = Y.states;
const lines = f => fs.readFileSync(path.join(here, '..', 'data', f), 'utf8').trim().split('\n').slice(1).map(l => l.split(','));
const tus = lines('tus2019.csv'), plfs = lines('plfs_2019.csv');
ok('2019: 37 places, 148 minute rows and 111 wage rows', Object.keys(D19).length === 37 && tus.length === 148 && plfs.length === 111);
ok('2019: every minutes figure equals the report file, and its error is the relative error times the figure', tus.every(([s, sex, age, dom, care, rd, rc, n]) => { const r = D19[s].min[age + '|' + sex];
  return r[0] === +dom && r[1] === +care && r[4] === +n && Math.abs(r[2] - dom * rd / 100) <= 0.0501 && Math.abs(r[3] - care * rc / 100) <= 0.0501; }));
ok('2019: every wage, hour and count equals the script\'s output', plfs.every(([s, g, rw, rn, rh, cw, cn, chh]) => { const d = D19[s], c = d.cells[g];
  return d.regular[g] === (rw === '' ? null : +rw) && d.casual[g] === (cw === '' ? null : +cw) && c[0] === +rn && c[1] === (rh === '' ? 0 : +rh) && c[2] === +cn && c[3] === (chh === '' ? 0 : +chh); }));
// MoSPI data service, TUS indicator 8, 2019, all-India, ages 15 to 59
ok('2019: all-India minutes are the four MoSPI publishes', D19['All India'].min['15-59|female'][0] === 290 && D19['All India'].min['15-59|female'][1] === 45 && D19['All India'].min['15-59|male'][0] === 28 && D19['All India'].min['15-59|male'][1] === 12);
ok('2019: the same shape as 2024', Object.values(D19).every(d => ['15-59|male', '15-59|female', '6+|male', '6+|female'].every(k => d.min[k] && d.min[k].length === 5) && ['male', 'female', 'person'].every(g => g in d.regular && g in d.casual && d.cells[g].length === 4)));
ok('2019: the two territories are separate and Ladakh is absent', 'Daman & Diu' in D19 && 'Dadra & Nagar Haveli' in D19 && !('Ladakh' in D19) && !('Dadra & Nagar Haveli & Daman & Diu' in D19));
ok('2019 and 2024 share 35 places, all-India among them', Object.keys(D19).filter(k => D[k]).length === 35);
// the price ratio, from the CPI file the rupee converter carries
const cpiRows = Object.fromEntries(fs.readFileSync(path.join(here, '..', '..', 'rupee-converter', 'data', 'cpi2012.csv'), 'utf8').trim().split('\n').slice(1).map(l => { const c = l.split(','); return [c[0], c.slice(1).map(Number)]; }));
const avg = y => Math.round(cpiRows[y].reduce((a, b) => a + b, 0) / 12 * 100) / 100;
ok('the CPI averages equal the rupee converter\'s series', Y.cpi['2019'] === avg('2019') && Y.cpi['2024'] === avg('2024'), JSON.stringify(Y.cpi));
const ratio = Y.cpi['2024'] / Y.cpi['2019'];
near('the price ratio', ratio, 1.3262002362, 1e-9);
// values worked in Python from the same files
const two = (name, opt) => X.change(X.state(D19[name], { ...o, hours: 'survey', ...opt }), X.state(D[name], { ...o, hours: 'survey', ...opt }), ratio);
const ai = two('All India', {});
near('India, women, all-worker casual wage: 2019 value in 2024 prices', ai.female.value[0], 96425.285, 0.01);
near('India, women: 2024 value', ai.female.value[1], 115710.425, 0.01);
near('India, women: real change', ai.female.real, 0.2000009, 1e-6);
near('India, women: real change in the hourly rate', ai.female.rate, 0.1792323, 1e-6);
near('India, women: change in minutes', ai.female.diff, 5.9, 1e-9);
near('India, women: error of the change', ai.female.se, Math.hypot(2.3 + 1.0, 0.8 + 0.4), 1e-9);
ok('India, women: 5.9 minutes is within sampling error', ai.female.clear === false);
near('India, women, own-sex casual wage: real change', two('All India', { wsex: 'own' }).female.real, 0.2581500, 1e-6);
near('India, men, regular wage: real change', two('All India', { wage: 'regular' }).male.real, 0.1150063, 1e-6);
const bi = two('Bihar', {});
near('Bihar, women: minutes fell by 46.6', bi.female.diff, -46.6, 1e-9);
ok('Bihar, women: the fall is clear', bi.female.clear === true);
near('Bihar, women: real change in value', bi.female.real, -0.0124889, 1e-6);
near('Kerala, women: real change in value', two('Kerala', {}).female.real, -0.0654102, 1e-6);
ok('Lakshadweep, women at their own casual wage: no value, no change', two('Lakshadweep', { wsex: 'own' }).female.real === null);

if (errors.length) { console.error(`FAIL: ${errors.length} of ${checks} checks`); for (const e of errors) console.error('  ' + e); process.exit(1); }
console.log(`OK: ${checks} checks on care-valuation.`);
