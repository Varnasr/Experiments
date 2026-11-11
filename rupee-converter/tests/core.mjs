// The arithmetic of rupee-converter, checked against values worked outside it.
//
//   node rupee-converter/tests/core.mjs
//
// The reference values were computed in Python from the two CSV files in
// data/, which are the series as read from MoSPI, and from the World Bank
// factors in data/ppp.json. The page reads data/prices.js, so the test also
// checks that the file the page loads holds the same numbers as the CSVs.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: no <script id="core"> in rupee-converter/index.html'); process.exit(1); }
const mod = { exports: {} };
new Function('module', m[1])(mod);
const X = mod.exports;
// The data file sets a property on window. Run it with a stand-in.
const load = (file, name) => { const w = {}; new Function('window', fs.readFileSync(path.join(here, '..', 'data', file), 'utf8'))(w); return w[name]; };

let checks = 0; const errors = [];
const ok = (name, cond, detail = '') => { checks++; if (!cond) errors.push(`${name}${detail ? ': ' + detail : ''}`); };
const near = (name, got, want, tol = 1e-9) => ok(name, got != null && Math.abs(got - want) <= tol, `got ${got}, want ${want}`);

const data = load('prices.js', 'PRICE_DATA');
const S = X.build(data);
// ---- the file the page loads against the series as read
const csv = f => Object.fromEntries(fs.readFileSync(path.join(here, '..', 'data', f), 'utf8').trim().split('\n').slice(1).map(l => { const c = l.split(','); return [c[0], c.slice(1).map(x => x === '' ? null : +x)]; }));
ok('base 2012 series matches its CSV', JSON.stringify(data.cpi2012) === JSON.stringify(csv('cpi2012.csv')));
ok('base 2024 series matches its CSV', JSON.stringify(data.cpi2024) === JSON.stringify(csv('cpi2024.csv')));
const pppFile = JSON.parse(fs.readFileSync(path.join(here, '..', 'data', 'ppp.json'), 'utf8'));
ok('PPP factors match their file', ['private', 'gdp'].every(k => JSON.stringify(data.ppp[k]) === JSON.stringify(pppFile[k])) && Object.keys(data.ppp.private).length === 15);
ok('the base 2012 series has 13 full years', Object.keys(data.cpi2012).length === 13 && Object.values(data.cpi2012).every(a => a.length === 12 && a.every(v => v > 0)));
// MoSPI publishes year-on-year inflation beside the index. Twelve of its
// figures, one a year, recomputed from the index.
const infl = { '2014-1': 8.60, '2015-6': 5.40, '2016-7': 6.07, '2017-6': 1.46, '2018-1': 5.07, '2019-12': 7.35, '2020-10': 7.61, '2021-5': 6.30, '2022-4': 7.79, '2023-7': 7.44, '2024-10': 6.21, '2025-10': 0.25 };
for (const [k, v] of Object.entries(infl)) { const [y, mo] = k.split('-').map(Number); near('published inflation, ' + k, (S.idx[k] / S.idx[(y - 1) + '-' + mo] - 1) * 100, v, 0.06); }
// ---- the join of the two series
near('link is the ratio of the 2025 averages', S.link, 1.8985442601678766, 1e-12);
near('September 2026 on base 2012', X.index(S, 'm', '2026-9'), 207.8716110457808, 1e-9);
near('December 2025 comes from the old series', X.index(S, 'm', '2025-12'), 198.0, 1e-12);
near('published inflation for September 2026, across the join', (109.49 / 103.74 - 1) * 100, 5.54, 0.01);
// ---- periods
near('calendar 2021', X.index(S, 'cy', '2021'), 161.35, 1e-9);
near('calendar 2024', X.index(S, 'cy', '2024'), 190.88333333333333, 1e-9);
near('financial year 2023-24 is April 2023 to March 2024', X.index(S, 'fy', '2023'), 184.1, 1e-9);
near('financial year 2025-26 crosses the join', X.index(S, 'fy', '2025'), 196.5814251246908, 1e-9);
ok('calendar 2026 is incomplete and not offered', X.index(S, 'cy', '2026') === null && !X.periods(S, 'cy').includes('2026'));
ok('financial year 2012-13 is incomplete and not offered', X.index(S, 'fy', '2012') === null);
ok('months run from January 2013 to September 2026', X.periods(S, 'm')[0] === '2013-1' && X.periods(S, 'm').slice(-1)[0] === '2026-9' && X.periods(S, 'm').length === 165);
ok('months are in date order', X.periods(S, 'm')[9] === '2013-10' && X.periods(S, 'm')[12] === '2014-1');
// ---- restating
let r = X.restate(S, 1000, 'm', '2013-1', 'm', '2025-12');
near('1,000 rupees of January 2013 in December 2025', r.value, 1892.9254302103252, 1e-9);
near('and back again', X.restate(S, r.value, 'm', '2025-12', 'm', '2013-1').value, 1000, 1e-9);
near('the same period changes nothing', X.restate(S, 250, 'cy', '2020', 'cy', '2020').value, 250, 1e-12);
ok('a period with no index gives nothing', X.restate(S, 1, 'm', '2012-12', 'm', '2020-1') === null);
// ---- 2021 PPP
near('household consumption factor, 2021', S.ppp.private[2021], 19.4689502716064, 1e-12);
near('GDP factor, 2021', S.ppp.gdp[2021], 20.7278957366943, 1e-12);
near('100 rupees of 2024 in 2021 PPP dollars', X.toPPP(S, 100, 'cy', '2024', 'private').value, 4.341686124237738, 1e-12);
near('3 dollars a day in rupees of September 2026', X.fromPPP(S, 3, 'm', '2026-9', 'private').value, 75.24714084280782, 1e-9);
near('3 dollars in 2021 rupees is 3 times the factor', X.fromPPP(S, 3, 'cy', '2021', 'private').value, 58.4068508148192, 1e-10);
near('to dollars and back', X.fromPPP(S, X.toPPP(S, 777, 'fy', '2019', 'gdp').value, 'fy', '2019', 'gdp').value, 777, 1e-9);
ok('the GDP factor gives fewer dollars', X.toPPP(S, 100, 'cy', '2024', 'gdp').value < X.toPPP(S, 100, 'cy', '2024', 'private').value);

if (errors.length) { console.error(`FAIL: ${errors.length} of ${checks} checks`); for (const e of errors) console.error('  ' + e); process.exit(1); }
console.log(`OK: ${checks} checks on rupee-converter.`);
