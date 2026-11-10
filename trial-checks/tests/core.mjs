// The arithmetic of trial-checks, checked against values worked outside it.
//
//   node trial-checks/tests/core.mjs
//
// Bonferroni, Holm and Benjamini-Hochberg are compared with the adjusted
// p-values that statsmodels (multipletests) returns for the same inputs. The
// sharpened q-values are compared with a Python routine written from the
// description of the two-stage procedure in Benjamini, Krieger and Yekutieli
// (2006) as Anderson (2008) applies it. The Lee bounds are compared with a
// Python routine that takes the trimmed mean as an integral of the quantile
// function, where the page counts observations and gives the one at the cut a
// fractional weight, and with cases small enough to work by hand.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: no <script id="core"> in trial-checks/index.html'); process.exit(1); }
const mod = { exports: {} };
new Function('module', m[1])(mod);
const TC = mod.exports;

let checks = 0; const errors = [];
const ok = (name, cond, detail = '') => { checks++; if (!cond) errors.push(`${name}${detail ? ': ' + detail : ''}`); };
const near = (name, got, want, tol = 1e-9) => ok(name, Math.abs(got - want) <= tol, `got ${got}, want ${want}`);
const vec = (name, got, want, tol = 1e-9) => want.forEach((w, i) => near(`${name} [${i}]`, got[i], w, tol));

// ---- adjusted p-values (statsmodels 'bonferroni', 'holm', 'fdr_bh')
const p = [0.001, 0.008, 0.012, 0.031, 0.049, 0.09, 0.21, 0.44, 0.62, 0.003], a = TC.adjust(p);
vec('Bonferroni', a.bonf, [0.01, 0.08, 0.12, 0.31, 0.49, 0.9, 1, 1, 1, 0.03]);
vec('Holm', a.holm, [0.01, 0.064, 0.084, 0.186, 0.245, 0.36, 0.63, 0.88, 0.88, 0.027]);
vec('Benjamini-Hochberg', a.bh, [0.01, 0.02666666666666667, 0.03, 0.062, 0.08166666666666668, 0.1285714285714286, 0.2625, 0.4888888888888889, 0.62, 0.015]);
vec('sharpened q', a.sharp, [0.011, 0.022, 0.025, 0.039, 0.052, 0.069, 0.118, 0.172, 0.229, 0.014]);
ok('the order runs from the smallest p-value', a.order.join() === '0,9,1,2,3,4,5,6,7,8', a.order.join());
// Ties, and a family in which nothing is rejected.
{
  const t = TC.adjust([0.04, 0.04, 0.04, 0.04]);
  vec('ties: Holm', t.holm, [0.16, 0.16, 0.16, 0.16]); vec('ties: Benjamini-Hochberg', t.bh, [0.04, 0.04, 0.04, 0.04]); vec('ties: sharpened q', t.sharp, [0.042, 0.042, 0.042, 0.042]);
  const n = TC.adjust([0.20, 0.50, 0.90]);
  vec('nulls: Holm', n.holm, [0.6, 1, 1]); vec('nulls: Benjamini-Hochberg', n.bh, [0.6, 0.75, 0.9]); vec('nulls: sharpened q', n.sharp, [1, 1, 1]);
}
// Properties that hold for any family.
{
  const g = TC.rng(3);
  for (let t = 0; t < 200; t++) {
    const q = Array.from({ length: 2 + Math.floor(g() * 12) }, () => Math.round(g() * g() * 1000) / 1000), r = TC.adjust(q);
    ok('Holm is never below the p-value or above Bonferroni', q.every((v, i) => r.holm[i] >= v - 1e-12 && r.holm[i] <= r.bonf[i] + 1e-12), q.join());
    ok('Benjamini-Hochberg is never above Holm', q.every((v, i) => r.bh[i] <= r.holm[i] + 1e-12), q.join());
    ok('adjusted values keep the order of the p-values', r.order.every((i, k) => !k || (r.holm[i] >= r.holm[r.order[k - 1]] && r.bh[i] >= r.bh[r.order[k - 1]] && r.sharp[i] >= r.sharp[r.order[k - 1]])), q.join());
  }
}

// ---- bounds by hand
// Treated all observed (1, 2, 3, 4); control 3 of 5 observed (2, 3, 4). The
// treated arm has 40% extra respondents, so 2.4 of its 4 outcomes are kept.
let b = TC.bounds([1, 2, 3, 4], [2, 3, 4], 4, 5, 0, 10);
near('by hand: share trimmed', b.p, 0.4); ok('by hand: the treated arm is trimmed', b.trimmed === 'treated');
near('by hand: Lee lower, (1 + 2 + 0.4 x 3)/2.4 - 3', b.lee[0], -1.25); near('by hand: Lee upper, (4 + 3 + 0.4 x 2)/2.4 - 3', b.lee[1], 0.25);
near('by hand: Manski lower, 2.5 - (0.6 x 3 + 0.4 x 10)', b.manski[0], -3.3); near('by hand: Manski upper, 2.5 - (0.6 x 3 + 0.4 x 0)', b.manski[1], 0.7);
near('by hand: plain difference', b.naive, -0.5);
// Whole numbers trimmed: treated (1, 2, 3, 4) of 4, control (2, 3) of 4.
b = TC.bounds([1, 2, 3, 4], [2, 3], 4, 4, 0, 10);
near('half trimmed: lower', b.lee[0], -1); near('half trimmed: upper', b.lee[1], 1);
// The control arm kept more: it is the one trimmed, and the signs follow.
b = TC.bounds([10, 20, 30], [1, 2, 3, 4, 5, 6, 7], 5, 7, 0, 100);
ok('control trimmed when it kept more', b.trimmed === 'control');
near('control trimmed: lower', b.lee[0], 14.61904761904762); near('control trimmed: upper', b.lee[1], 17.38095238095238);
// Equal response: the bounds are the plain difference.
b = TC.bounds([1, 5, 9], [2, 4, 6], 6, 6, 0, 10);
near('equal response: lower is the difference', b.lee[0], b.naive, 1e-12); near('equal response: upper is the difference', b.lee[1], b.naive, 1e-12);
// No attrition at all: Manski collapses too.
b = TC.bounds([1, 5, 9], [2, 4, 6], 3, 3, 0, 10);
near('nobody lost: Manski lower', b.manski[0], b.naive, 1e-12); near('nobody lost: Manski upper', b.manski[1], b.naive, 1e-12);

// ---- the simulated example against the Python routine
const d = TC.demo(), a1 = d.filter(r => r.arm === 'treatment').map(r => r.y), a0 = d.filter(r => r.arm === 'control').map(r => r.y);
const y1 = a1.filter(v => v !== null), y0 = a0.filter(v => v !== null);
ok('the example has 600 in each arm, 530 and 427 observed', a1.length === 600 && a0.length === 600 && y1.length === 530 && y0.length === 427, `${a1.length} ${a0.length} ${y1.length} ${y0.length}`);
b = TC.bounds(y1, y0, 600, 600, -4, 4);
near('example: Lee lower', b.lee[0], -0.13879156908665097); near('example: Lee upper', b.lee[1], 0.5366791569086645);
near('example: Manski lower', b.manski[0], -1.44413); near('example: Manski upper', b.manski[1], 1.79587);
ok('example: the Lee bounds contain the true effect of 0.20', b.lee[0] < 0.2 && 0.2 < b.lee[1]);
ok('the Lee bounds lie inside the Manski bounds', b.manski[0] <= b.lee[0] && b.lee[1] <= b.manski[1]);
// Swapping the arms reverses the bounds.
{ const s = TC.bounds(y0, y1, 600, 600, -4, 4); near('arms swapped: lower', s.lee[0], -0.5366791569086645); near('arms swapped: upper', s.lee[1], 0.13879156908665097); }

// ---- bootstrap
const c1 = TC.bootstrap(a1, a0, -4, 4, 400, 7), c2 = TC.bootstrap(a1, a0, -4, 4, 400, 7), c3 = TC.bootstrap(a1, a0, -4, 4, 400, 8);
ok('the same seed gives the same interval', JSON.stringify(c1) === JSON.stringify(c2));
ok('another seed gives another interval', JSON.stringify(c1) !== JSON.stringify(c3));
ok('the interval is wider than the bounds', c1.lee[0] < b.lee[0] && c1.lee[1] > b.lee[1] && c1.manski[0] < b.manski[0] && c1.manski[1] > b.manski[1], JSON.stringify(c1));
ok('and not absurdly wide', c1.lee[0] > b.lee[0] - 0.4 && c1.lee[1] < b.lee[1] + 0.4, JSON.stringify(c1));

if (errors.length) { console.error(`FAIL: ${errors.length} of ${checks} checks`); errors.slice(0, 20).forEach(e => console.error('  - ' + e)); process.exit(1); }
console.log(`OK: ${checks} checks of the multiple-testing and bounds arithmetic.`);
