// The arithmetic of mpi-calculator, checked against values worked outside it.
//
//   node mpi-calculator/tests/core.mjs
//
// The reference values for the simulated example were computed in Python with
// exact fractions, so that a score of 1/6 + 1/6 is exactly 1/3 there and the
// page's floating-point comparison has something exact to agree with. The
// small cases are worked by hand in the comments.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: no <script id="core"> in mpi-calculator/index.html'); process.exit(1); }
const mod = { exports: {} };
new Function('module', m[1])(mod);
const MP = mod.exports;

let checks = 0; const errors = [];
const ok = (name, cond, detail = '') => { checks++; if (!cond) errors.push(`${name}${detail ? ': ' + detail : ''}`); };
const near = (name, got, want, tol = 1e-12) => ok(name, Math.abs(got - want) <= tol, `got ${got}, want ${want}`);

// ---- by hand: four people, three indicators weighted 2, 1, 1 (a half, a quarter, a quarter)
// scores: A 1.00, B 0.50, C 0.25, D 0. With k = 0.5, A and B are poor.
const four = [[1, 1, 1], [1, 0, 0], [0, 1, 0], [0, 0, 0]].map(d => ({ d, w: 1, g: 'x' }));
let r = MP.index(four, [2, 1, 1], 0.5);
near('by hand: H is 2 of 4', r.H, 0.5); near('by hand: A is (1 + 0.5)/2', r.A, 0.75); near('by hand: M0', r.M0, 0.375);
near('by hand: first indicator, poor and deprived', r.indicators[0].censored, 0.5); near('by hand: second indicator, deprived', r.indicators[1].uncensored, 0.5);
near('by hand: second indicator, poor and deprived', r.indicators[1].censored, 0.25); near('by hand: first indicator carries two thirds of the index', r.indicators[0].contribution, 2 / 3);
near('by hand: C is vulnerable', r.vulnerable, 0.25); near('by hand: A and B are severe', r.severe, 0.5);
// Unequal sampling weights: A stands for 3 people, the others for 1 each.
r = MP.index(four.map((x, i) => ({ ...x, w: i === 0 ? 3 : 1 })), [2, 1, 1], 0.5);
near('weighted: H is 4 of 6', r.H, 4 / 6); near('weighted: A is (3 x 1 + 0.5)/4', r.A, 0.875);
// A score that only reaches the cutoff by adding thirds: 1/6 + 1/6 is 1/3.
r = MP.index([{ d: [1, 1, 0, 0, 0, 0], w: 1, g: 'x' }, { d: [1, 0, 0, 0, 0, 0], w: 1, g: 'x' }], [1, 1, 1, 1, 1, 1], 1 / 3);
near('two sixths reach a cutoff of one third', r.H, 0.5);
near('a cutoff of one: only the person deprived in everything is poor', MP.index(four, [2, 1, 1], 1).M0, 0.25);
// In floating point 0.7 + 0.1 + 0.1 + 0.1 is 0.9999999999999999. A person deprived
// in every indicator must still reach a cutoff of 1.
near('deprived in everything reaches a cutoff of one despite rounding', MP.index([{ d: [1, 1, 1, 1], w: 1, g: 'x' }, { d: [0, 0, 0, 0], w: 1, g: 'x' }], [7, 1, 1, 1], 1).H, 0.5);

// ---- the simulated example against exact fractions
const rows = MP.demo(), w = MP.DEMO.weights;
ok('2,400 people and ten indicators', rows.length === 2400 && w.length === 10 && rows.every(x => x.d.length === 10));
r = MP.index(rows, w, 1 / 3);
near('example: H', r.H, 0.19624376203590582); near('example: A', r.A, 0.44693111420625875); near('example: M0', r.M0, 0.0877074432227353);
near('example: vulnerable', r.vulnerable, 0.17858488807901765); near('example: severe', r.severe, 0.06728925517155696);
[0.147027519516286, 0.026865177147826807, 0.0928913092994844, 0.05158925724225043, 0.17134988507651214, 0.14426935580725986, 0.05673700122170915, 0.02874950821029963, 0.15350050731990145, 0.0690079307560102]
  .forEach((v, j) => near(`example: censored headcount of ${MP.DEMO.names[j]}`, r.indicators[j].censored, v));
near('example: nutrition carries 27.9% of the index', r.indicators[0].contribution, 0.27939004588034383);
near('the weighted censored headcounts add to the index', r.indicators.reduce((s, x) => s + x.weight * x.censored, 0), r.M0);
near('the contributions add to one', r.indicators.reduce((s, x) => s + x.contribution, 0), 1);
near('the weights are rescaled to add to one', r.w.reduce((s, x) => s + x, 0), 1);
r.indicators.forEach((x, j) => ok(`censored is never above uncensored (${MP.DEMO.names[j]})`, x.censored <= x.uncensored + 1e-15));
const gs = MP.byGroup(rows, w, 1 / 3), G = n => gs.find(x => x.name === n);
near('Coast: share of people', G('Coast').share, 0.2540161099952374); near('Coast: H', G('Coast').H, 0.31624168514412415); near('Coast: M0', G('Coast').M0, 0.15286835354984565); near('Coast: share of the index', G('Coast').contribution, 0.44273351363687635);
near('Hills: M0', G('Hills').M0, 0.03512686579779232); near('Plains: A', G('Plains').A, 0.42838646832214833);
near('group values average to the index', gs.reduce((s, x) => s + x.share * x.M0, 0), r.M0); near('group shares of the index add to one', gs.reduce((s, x) => s + x.contribution, 0), 1);
const ks = MP.cutoffs(rows, w, [0.1, 0.2, 0.5, 0.7]);
[[0.5778767109104839, 0.277598613828431, 0.1604177739124833], [0.3748286501149235, 0.3518866349444862, 0.1318971923697246], [0.06728925517155696, 0.5881476010722687, 0.03957601400709097], [0.010991240966599715, 0.752993385246588, 0.008276331743500898]]
  .forEach((v, i) => { near(`cutoff ${ks[i].k}: H`, ks[i].H, v[0]); near(`cutoff ${ks[i].k}: A`, ks[i].A, v[1]); near(`cutoff ${ks[i].k}: M0`, ks[i].M0, v[2]); });
ks.forEach((x, i) => { if (i) ok('a higher cutoff never raises H or M0, and never lowers A', x.H <= ks[i - 1].H && x.M0 <= ks[i - 1].M0 && x.A >= ks[i - 1].A); });
// The scale of the weights does not matter.
near('weights of 3 and 1 or of 1/6 and 1/18 give the same index', MP.index(rows, w.map(v => v / 18), 1 / 3).M0, r.M0);

if (errors.length) { console.error(`FAIL: ${errors.length} of ${checks} checks`); errors.slice(0, 20).forEach(e => console.error('  - ' + e)); process.exit(1); }
console.log(`OK: ${checks} checks of the multidimensional poverty arithmetic.`);
