// The arithmetic of sampling-design, checked against values worked outside it.
//
//   node sampling-design/tests/core.mjs
//
// The page keeps its arithmetic in <script id="core">, which touches nothing
// on the page, so this file runs that block under node with no browser. The
// reference numbers were computed in Python from the textbook formulas
// (statistics.NormalDist for the quantiles), without reading the page's code.
// The PPS draw is compared with a second implementation written here that
// works a different way: it looks up each selection point in the cumulated
// sizes, where the page walks the list once.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: no <script id="core"> in sampling-design/index.html'); process.exit(1); }
const mod = { exports: {} };
new Function('module', 'require', m[1])(mod, createRequire(import.meta.url));
const SD = mod.exports;

let checks = 0; const errors = [];
const ok = (name, cond, detail = '') => { checks++; if (!cond) errors.push(`${name}${detail ? ': ' + detail : ''}`); };
const near = (name, got, want, tol = 1e-6) => ok(name, Math.abs(got - want) <= tol * Math.max(1, Math.abs(want)), `got ${got}, want ${want}`);

// ---- quantiles
near('z for 95%', SD.qnorm(0.975), 1.9599639845400536, 1e-10);
near('z for 90%', SD.qnorm(0.95), 1.6448536269514715, 1e-10);
near('z for 99%', SD.qnorm(0.995), 2.5758293035489, 1e-10);
near('z for 80% power', SD.qnorm(0.8), 0.8416212335729144, 1e-10);

// ---- one value to a margin of error
let r = SD.sizeEstimate({ type: 'prop', p: 0.5, e: 0.05, conf: 0.95, N: NaN, deff: 1, rr: 1 });
near('p = 0.5, e = 0.05, 95%: n0', r.n0, 384.14588206941227); ok('p = 0.5, e = 0.05, 95%: 385', r.n === 385, `got ${r.n}`);
r = SD.sizeEstimate({ type: 'prop', p: 0.5, e: 0.05, conf: 0.95, N: NaN, deff: SD.deffOf(20, 0.05), rr: 0.9 });
near('design effect of 20 per cluster at 0.05', SD.deffOf(20, 0.05), 1.95);
near('with design effect 1.95 and 90% response', r.nr, 832.3160778170599); ok('rounded up to 833', r.n === 833, `got ${r.n}`);
r = SD.sizeEstimate({ type: 'prop', p: 0.3, e: 0.04, conf: 0.95, N: 2000, deff: 1.5, rr: 0.85 });
near('finite population of 2,000: corrected size', r.nf, 402.8389168109272); ok('finite population of 2,000: 711', r.n === 711, `got ${r.n}`);
r = SD.sizeEstimate({ type: 'mean', sd: 12, e: 1.5, conf: 0.99, N: NaN, deff: 1, rr: 1 });
near('mean, sd 12, e 1.5, 99%', r.n0, 424.6333824653575); ok('mean: 425', r.n === 425, `got ${r.n}`);

// ---- a change between two rounds
r = SD.sizeCompare({ type: 'prop', p1: 0.4, p2: 0.5, alpha: 0.05, power: 0.8, deff: 1.95, rr: 0.9 });
near('0.40 to 0.50, 5%, 80%: n0', r.n0, 384.5951069831051); ok('0.40 to 0.50 with design effect: 834', r.n === 834, `got ${r.n}`);
r = SD.sizeCompare({ type: 'mean', sd: 1, delta: 0.2, alpha: 0.05, power: 0.9, deff: 1, rr: 1 });
near('means, 0.2 sd, 90% power', r.n0, 525.3711530720309); ok('means: 526', r.n === 526, `got ${r.n}`);

// ---- allocation
const strata = [{ name: 'a', N: 12000, S: 0.5 }, { name: 'b', N: 30000, S: 0.4 }, { name: 'c', N: 45000, S: 0.45 }, { name: 'd', N: 13000, S: 0.3 }];
let al = SD.allocations(strata, 1200, 0);
const by = n => al.methods.find(x => x.name === n);
ok('proportional', by('Proportional').nh.join() === '144,360,540,156', by('Proportional').nh.join());
ok('Neyman', by('Neyman').nh.join() === '171,342,576,111', by('Neyman').nh.join());
ok('equal', by('Equal').nh.join() === '300,300,300,300', by('Equal').nh.join());
near('standard error, proportional', by('Proportional').se, 0.012201608500521561);
near('standard error, equal', by('Equal').se, 0.01414034122643439);
ok('Neyman has the smallest standard error', by('Neyman').se < by('Proportional').se && by('Proportional').se < by('Equal').se);
al.methods.forEach(x => ok(`${x.name} adds to the total`, x.nh.reduce((s, v) => s + v, 0) === 1200));
// A stratum smaller than its share is interviewed in full and the rest shared.
al = SD.allocations([{ name: 'a', N: 50, S: 1 }, { name: 'b', N: 1000, S: 1 }, { name: 'c', N: 1000, S: 1 }], 300, 0);
ok('equal allocation capped at the stratum population', al.methods.find(x => x.name === 'Equal').nh.join() === '50,125,125', al.methods.find(x => x.name === 'Equal').nh.join());
// A minimum lifts the small stratum and the others give way in proportion.
al = SD.allocations(strata, 1200, 200);
ok('minimum per stratum', by('Proportional').nh.join() === '200,320,480,200' && al.methods[0].nh.join() === '200,320,480,200', al.methods[0].nh.join());
ok('a minimum that cannot be met is refused', !!SD.allocations(strata, 600, 200).error);
ok('a sample above the population is refused', !!SD.allocations(strata, 200000, 0).error);

// ---- PPS: a second implementation by lookup
function ppsLookup(units, k, u) {
  const M = units.reduce((s, x) => s + x.size, 0), I = M / k, out = [];
  for (let j = 0; j < k; j++) {
    const point = u * I + j * I; let cum = 0;
    for (const x of units) { cum += x.size; if (point <= cum + 1e-9 * M) { out.push(x.id); break; } }
  }
  return out;
}
const g = SD.rng(99);
for (let t = 0; t < 400; t++) {
  const n = 12 + Math.floor(g.start() * 40), k = 2 + Math.floor(g.start() * 6);
  const units = Array.from({ length: n }, (_, i) => ({ id: 'u' + i, size: 20 + Math.floor(g.start() * 80) }));
  const u = g.start(), a = SD.pps(units, k, u);
  if (a.picked.some(x => x.certainty)) continue;
  const got = a.picked.map(x => x.unit.id).join(), want = ppsLookup(units, k, u).join();
  ok('PPS agrees with the lookup implementation', got === want && a.picked.length === k, `frame of ${n}, k ${k}, u ${u}: ${got} against ${want}`);
}
// Over every start, a unit is selected with probability k x size / total.
{
  const units = [70, 30, 55, 120, 45, 90, 25, 65].map((size, i) => ({ id: i, size })), k = 3, M = 500, hits = new Array(8).fill(0), T = 20000;
  for (let t = 1; t <= T; t++) SD.pps(units, k, t / T).picked.forEach(x => hits[x.unit.id]++);
  units.forEach(x => near(`selection frequency of unit ${x.id}`, hits[x.id] / T, k * x.size / M, 2e-3));
}
// A unit as large as the interval is taken with certainty and the rest redrawn.
{
  const units = [{ id: 'big', size: 100 }].concat(Array.from({ length: 10 }, (_, i) => ({ id: 's' + i, size: 10 })));
  const a = SD.pps(units, 4, 0.37);
  ok('the large unit is taken with certainty', a.picked.filter(x => x.certainty).map(x => x.unit.id).join() === 'big');
  ok('four units in all', a.picked.length === 4);
  near('interval for the rest', a.interval, 100 / 3);
  a.picked.filter(x => !x.certainty).forEach(x => near('probability for the rest', x.prob, 0.3));
}
// The edges of the start: u = 1 puts the last point on the total.
ok('a start at the end of the interval still selects k units', SD.pps([3, 3, 3, 3].map((size, id) => ({ id, size })), 2, 1).picked.length === 2);

// ---- the whole draw on the example frame
const demo = SD.demo().map((d, i) => ({ id: d.village, size: d.households, stratum: d.district, order: i }));
const d1 = SD.draw(demo, 12, 20, 20261110), d2 = SD.draw(demo, 12, 20, 20261110), d3 = SD.draw(demo, 12, 20, 5);
ok('the example frame has 60 villages', demo.length === 60);
ok('the same seed gives the same draw', JSON.stringify(d1) === JSON.stringify(d2));
ok('another seed gives another draw', d1.rows.map(x => x.id).join() !== d3.rows.map(x => x.id).join());
ok('twelve clusters', d1.rows.length === 12 && d1.strata.reduce((s, x) => s + x.k, 0) === 12);
ok('at least one cluster in every district', d1.strata.every(x => x.k >= 1));
ok('the large village is a certainty selection', d1.rows.some(x => x.certainty && x.size === 2600));
near('the weights add back to the frame', d1.estimate, d1.total, 1e-9);
ok('no village is selected twice', new Set(d1.rows.map(x => x.id)).size === 12);
d1.rows.forEach(x => near(`weight of ${x.id}`, x.weight, 1 / (x.p1 * x.take / x.size), 1e-12));
// One stratum, no certainty, no small cluster: every interview has the same weight.
{
  const flat = Array.from({ length: 40 }, (_, i) => ({ id: 'v' + i, size: 100 + (i * 37) % 150, stratum: 'All', order: i }));
  const d = SD.draw(flat, 8, 20, 1), w = d.rows.map(x => x.weight);
  ok('a self-weighting design has one weight', Math.max(...w) - Math.min(...w) < 1e-9, w.join());
  near('and it is total / (clusters x take)', w[0], d.total / (8 * 20), 1e-12);
}
ok('fewer clusters than strata is refused', !!SD.draw(demo, 3, 20, 1).error);
// A cluster smaller than the take is interviewed in full.
{
  const tiny = [{ id: 'a', size: 8, stratum: 'All', order: 0 }, { id: 'b', size: 300, stratum: 'All', order: 1 }, { id: 'c', size: 300, stratum: 'All', order: 2 }];
  const d = SD.draw(tiny, 3, 20, 1), a = d.rows.find(x => x.id === 'a');
  ok('a cluster smaller than the take is interviewed in full', !!a && a.take === 8 && a.p2 === 1);
}

if (errors.length) { console.error(`FAIL: ${errors.length} of ${checks} checks`); errors.slice(0, 20).forEach(e => console.error('  - ' + e)); process.exit(1); }
console.log(`OK: ${checks} checks of the sampling arithmetic.`);
