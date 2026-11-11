// The estimators of causal-workbench that can run without the page.
//
//   node causal-workbench/tests/core.mjs
//
// The page keeps its linear algebra, the two-way fixed effects estimator, the
// wild cluster bootstrap and the Goodman-Bacon decomposition in
// <script id="core">. This file runs that block under node on two small
// panels stored beside it and compares the results with Python:
//
// - the coefficient and its cluster-robust standard error, from a regression
//   on unit and period dummies (numpy least squares), where the page removes
//   the fixed effects by alternating demeaning;
// - the wild cluster bootstrap p-value, from a Python loop over every sign
//   pattern. The wildboottest package gives 0.43359375 on the second panel,
//   which is the same count with a strict inequality: it leaves out the two
//   patterns that reproduce the original t-statistic. The page counts them,
//   so its p-value can never be zero;
// - the Bacon weights, from the variance of the demeaned treatment inside
//   each two-group subsample, where the page uses the closed forms of
//   Goodman-Bacon (2021), equations 10e to 10g.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: no <script id="core"> in causal-workbench/index.html'); process.exit(1); }
const C = new Function(m[1] + ';return {olsCluster, demeanTwoWay, mulberry32, wildClusterP, baconDecomp};')();

let checks = 0; const errors = [];
const ok = (name, cond, detail = '') => { checks++; if (!cond) errors.push(`${name}${detail ? ': ' + detail : ''}`); };
const near = (name, got, want, tol = 1e-9) => ok(name, Math.abs(got - want) <= tol, `got ${got}, want ${want}`);

function load(file) {
  const P = JSON.parse(fs.readFileSync(path.join(here, file), 'utf8')), adopt = new Map(P.adopt), rows = P.rows;
  const unit = rows.map(r => r.u), time = rows.map(r => r.t), D = rows.map(r => { const g = adopt.get(r.u); return g != null && r.t >= g ? 1 : 0; });
  const [yd, Dd] = C.demeanTwoWay([rows.map(r => r.y), D], unit, time);
  return { rows, adopt, unit, time, yd, Dd, fit: C.olsCluster(Array.from(Dd, v => [v]), yd, unit) };
}

// ---- eight units, ten periods, adoption at 4 (two units) and 7 (three), three never treated
const A = load('panel-staggered.json');
near('staggered: coefficient', A.fit.beta[0], 1.6506495726495727); near('staggered: cluster-robust standard error', A.fit.se[0], 0.3438242552834264);
let w = C.wildClusterP(A.Dd, A.yd, A.unit, A.time, 999, 1);
ok('staggered: eight clusters are enumerated, 256 patterns', w.exact && w.reps === 256 && w.G === 8);
near('staggered: wild bootstrap p is 2/256, the floor', w.p, 0.0078125, 1e-15); near('staggered: t-statistic', w.t, 4.800852607937402);
const b = C.baconDecomp(A.rows, A.adopt);
ok('staggered: four 2x2 comparisons', !b.error && b.parts.length === 4, b.error);
const part = (type, tr) => b.parts.find(q => q.type === type && q.treated === tr);
near('Bacon: 4 against never, weight', part('never', 4).weight, 0.2692307692307693); near('Bacon: 4 against never, estimate', part('never', 4).estimate, 2.785484126984127);
near('Bacon: 7 against never, weight', part('never', 7).weight, 0.4615384615384617); near('Bacon: 7 against never, estimate', part('never', 7).estimate, 1.8053611111111108);
near('Bacon: 4 against 7 before 7 adopts, weight', part('early', 4).weight, 0.1153846153846154); near('Bacon: 4 against 7 before 7 adopts, estimate', part('early', 4).estimate, 0.869833333333333);
near('Bacon: 7 against already-treated 4, weight', part('late', 7).weight, 0.15384615384615385); near('Bacon: 7 against already-treated 4, estimate', part('late', 7).estimate, -0.21383333333333318);
near('Bacon: the weights add to one', b.weightSum, 1); near('Bacon: the weighted sum is the TWFE coefficient', b.total, A.fit.beta[0]);
near('Bacon: weight on already-treated controls', b.late.weight, 0.15384615384615385); near('Bacon: clean comparisons against never treated', b.never.weight, 0.2692307692307693 + 0.4615384615384617);

// ---- nine units, eight periods, four treated from period 5, a small effect
const B = load('panel-few-clusters.json');
near('few clusters: coefficient', B.fit.beta[0], 0.3261125); near('few clusters: standard error', B.fit.se[0], 0.378894163207994);
w = C.wildClusterP(B.Dd, B.yd, B.unit, B.time, 999, 1);
ok('few clusters: 512 patterns', w.exact && w.reps === 512);
near('few clusters: wild bootstrap p', w.p, 0.4375, 1e-15);
near('and the strict count that wildboottest reports is two patterns fewer', w.p - 2 / 512, 0.43359375, 1e-15);
// One adoption date and a never-treated group: a single comparison with all the weight.
const one = C.baconDecomp(B.rows, B.adopt);
ok('one cohort: a single comparison', one.parts.length === 1 && one.parts[0].type === 'never'); near('one cohort: weight of one', one.weightSum, 1); near('one cohort: it is the coefficient', one.total, B.fit.beta[0]);

// ---- many clusters: drawn weights, a seed, and the size of the test
{
  const g = C.mulberry32(3), rows = [], adopt = new Map();
  for (let i = 0; i < 40; i++) { const u = 'z' + i, a = g() * 3, gg = i < 15 ? 6 : null; adopt.set(u, gg); for (let t = 1; t <= 10; t++) rows.push({ u, t, y: a + 0.1 * t + (gg && t >= gg ? 0.25 : 0) + (g() - 0.5) * 3 }); }
  const unit = rows.map(r => r.u), time = rows.map(r => r.t), D = rows.map(r => { const q = adopt.get(r.u); return q != null && r.t >= q ? 1 : 0; });
  const [yd, Dd] = C.demeanTwoWay([rows.map(r => r.y), D], unit, time);
  const p1 = C.wildClusterP(Dd, yd, unit, time, 999, 1), p1b = C.wildClusterP(Dd, yd, unit, time, 999, 1), p2 = C.wildClusterP(Dd, yd, unit, time, 4999, 7);
  ok('forty clusters: weights are drawn', !p1.exact && p1.reps === 999);
  ok('the same seed gives the same p-value', p1.p === p1b.p);
  ok('different seeds give different draws', new Set([1, 2, 3, 4, 5, 6].map(sd => C.wildClusterP(Dd, yd, unit, time, 499, sd).p)).size > 1);
  // Python: 0.00705 over 20,000 draws; wildboottest 0.0054 over 9,999.
  ok('forty clusters: p-value near the Python Monte Carlo value of 0.007', Math.abs(p2.p - 0.00705) < 0.004, String(p2.p));
  // Under a true null the test should reject about 5% of the time.
  let rej = 0; const S = 300;
  for (let s = 0; s < S; s++) {
    const r = C.mulberry32(1000 + s), y = new Float64Array(120), un = [], ti = [], d = [];
    for (let i = 0; i < 12; i++) { const a = r() * 2; let e = 0; for (let t = 0; t < 10; t++) { e = 0.6 * e + (r() - 0.5) * 2; y[i * 10 + t] = a + e; un.push('c' + i); ti.push(t); d.push(i < 4 && t >= 5 ? 1 : 0); } }
    const [yy, dd] = C.demeanTwoWay([y, d], un, ti);
    if (C.wildClusterP(dd, yy, un, ti, 199, s).p <= 0.05) rej++;
  }
  ok('under a true null with 12 clusters it rejects between 2% and 9% of the time', rej / S > 0.02 && rej / S < 0.09, `${rej} of ${S}`);
}

// ---- what the decomposition refuses
ok('an unbalanced panel is refused', !!C.baconDecomp(A.rows.slice(1), A.adopt).error);
ok('units treated in every period are refused', !!C.baconDecomp(A.rows, new Map([...A.adopt].map(([u, g]) => [u, g === 4 ? 1 : g]))).error);
ok('adoption after the panel ends is refused', !!C.baconDecomp(A.rows, new Map([...A.adopt].map(([u, g]) => [u, g === 7 ? 99 : g]))).error);
// Three timing groups and no never-treated units: six comparisons, still an exact identity.
{
  const g = C.mulberry32(8), rows = [], adopt = new Map(), gs = [3, 3, 5, 5, 5, 8, 8];
  gs.forEach((gg, i) => { const u = 'q' + i; adopt.set(u, gg); for (let t = 1; t <= 9; t++) rows.push({ u, t, y: g() * 2 + (t >= gg ? 1 + 0.5 * (t - gg) : 0) }); });
  const unit = rows.map(r => r.u), time = rows.map(r => r.t), D = rows.map(r => r.t >= adopt.get(r.u) ? 1 : 0), [yd, Dd] = C.demeanTwoWay([rows.map(r => r.y), D], unit, time);
  const d = C.baconDecomp(rows, adopt), fit = C.olsCluster(Array.from(Dd, v => [v]), yd, unit);
  ok('three timing groups, no never treated: six comparisons', d.parts.length === 6 && d.never.count === 0);
  near('their weights add to one', d.weightSum, 1); near('and their weighted sum is the coefficient', d.total, fit.beta[0]);
}

if (errors.length) { console.error(`FAIL: ${errors.length} of ${checks} checks`); errors.slice(0, 20).forEach(e => console.error('  - ' + e)); process.exit(1); }
console.log(`OK: ${checks} checks of the workbench estimators.`);
