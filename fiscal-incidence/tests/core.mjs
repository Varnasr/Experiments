// The arithmetic of fiscal-incidence, checked against values worked outside it.
//
//   node fiscal-incidence/tests/core.mjs
//
// The page computes a Gini or a concentration coefficient as one minus twice
// the area under the curve through the group points. The reference values
// were computed in Python by two different formulas: the Gini as the mean
// absolute difference between groups over twice the mean, and a concentration
// coefficient as twice the covariance of the amount with the mid-rank, over
// the mean. Neither was written by reading the page's code. The identities of
// Kakwani (1977) and Lambert (2001) are checked as well, because they tie the
// indices to the fall in the Gini and a wrong sign convention breaks them.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: no <script id="core"> in fiscal-incidence/index.html'); process.exit(1); }
const mod = { exports: {} };
new Function('module', m[1])(mod);
const FI = mod.exports;

let checks = 0; const errors = [];
const ok = (name, cond, detail = '') => { checks++; if (!cond) errors.push(`${name}${detail ? ': ' + detail : ''}`); };
const near = (name, got, want, tol = 1e-10) => ok(name, got !== null && Math.abs(got - want) <= tol, `got ${got}, want ${want}`);

// ---- the example table, as the page loads it
const parsed = FI.parse(FI.example, 'mean');
ok('the example parses', !parsed.error, parsed.error);
ok('ten groups, two taxes, two transfers', parsed.groups.length === 10 && parsed.instruments.map(k => k.kind).join() === 'tax,tax,transfer,transfer');
const r = FI.analyse(parsed.groups, parsed.instruments), [dt, it, ct, fs2] = r.ins;
near('Gini before', r.gx, 0.4237971391417426);
near('Gini after', r.gn, 0.3615158636897768);
near('concentration of final income by initial rank', r.cnx, 0.36151586368977673);
near('redistributive effect', r.rs, 0.06228127545196582);
near('vertical equity', r.ve, 0.06228127545196588);
near('no reranking in the example', r.rr, 0);
near('direct tax: concentration', dt.c, 0.8176110260336906); near('direct tax: share of income', dt.share, 0.08491547464239271);
near('indirect tax: concentration', it.c, 0.32459016393442625); near('indirect tax: share of income', it.share, 0.06345903771131339);
near('cash transfer: concentration', ct.c, -0.4463768115942029); near('cash transfer: share of income', ct.share, 0.017945383615084524);
near('food subsidy: concentration', fs2.c, -0.3628099173553719); near('food subsidy: share of income', fs2.share, 0.015734720416124837);
near('direct tax: Kakwani is C minus G', dt.kakwani, 0.8176110260336906 - 0.4237971391417426);
near('indirect tax: Kakwani is negative, so regressive', it.kakwani, 0.32459016393442625 - 0.4237971391417426);
near('cash transfer: Kakwani is G minus C', ct.kakwani, 0.4237971391417426 + 0.4463768115942029);
near('direct tax: marginal contribution', dt.marginal, 0.039918260422272644);
near('indirect tax: marginal contribution is negative', it.marginal, -0.0024698110581977684);
near('cash transfer: marginal contribution', ct.marginal, 0.016715020867944463);
near('food subsidy: marginal contribution', fs2.marginal, 0.013106537985114852);
near('Lambert: vertical equity from the Kakwani indices', r.lambert, r.ve, 1e-12);
near('redistribution is vertical equity less reranking', r.rs, r.ve - r.rr, 1e-14);
r.rows.forEach((q, i) => { if (i) ok('rows run from poorest to richest', q.income >= r.rows[i - 1].income); });
near('income shares before add to one', r.rows.reduce((s, q) => s + q.shareBefore, 0), 1, 1e-12);
near('income shares after add to one', r.rows.reduce((s, q) => s + q.shareAfter, 0), 1, 1e-12);
near('net change of the poorest decile', r.rows[0].net, (300 + 220 - 160) / 1800, 1e-12);

// ---- the order of the lines does not matter, and totals give the same answer
{
  const lines = FI.example.split('\n'), shuffled = [lines[0], ...lines.slice(1).reverse()].join('\n');
  const q = FI.parse(shuffled, 'mean'), s = FI.analyse(q.groups, q.instruments);
  near('reversed lines: Gini after', s.gn, r.gn, 1e-12); near('reversed lines: direct tax', s.ins[0].c, dt.c, 1e-12);
  const tot = [lines[0], ...lines.slice(1).map(l => { const c = l.split(',').map(v => v.trim()); return [c[0], c[1], ...c.slice(2).map(v => Number(v) * Number(c[1]))].join(', '); })].join('\n');
  const q2 = FI.parse(tot, 'total'), s2 = FI.analyse(q2.groups, q2.instruments);
  near('group totals: Gini after', s2.gn, r.gn, 1e-12); near('group totals: food subsidy', s2.ins[3].c, fs2.c, 1e-12);
}

// ---- totals for groups of unequal size are divided by their own population
{
  const mean = 'g, pop, inc, tax: t\na, 40, 50, 2\nb, 30, 120, 10\nc, 20, 260, 40\nd, 10, 900, 300';
  const tot = 'g, pop, inc, tax: t\na, 40, 2000, 80\nb, 30, 3600, 300\nc, 20, 5200, 800\nd, 10, 9000, 3000';
  const q1 = FI.parse(mean, 'mean'), q2 = FI.parse(tot, 'total');
  const s1 = FI.analyse(q1.groups, q1.instruments), s2 = FI.analyse(q2.groups, q2.instruments);
  near('unequal groups entered as totals: Gini before', s2.gx, 0.5242424242424243);
  near('unequal groups entered as totals: tax concentration', s2.ins[0].c, s1.ins[0].c, 1e-12);
  near('unequal groups entered as totals: income per person', s2.rows[3].income, 900, 1e-12);
}

// ---- reranking: a transfer that lifts the poorest group above the next
{
  const g = [100, 200, 300, 400].map((income, i) => ({ name: 'g' + i, pop: 1, income }));
  const s = FI.analyse(g, [{ name: 'b', kind: 'transfer', values: [250, 0, 0, 0] }]);
  near('reranking case: Gini before', s.gx, 0.25); near('reranking case: Gini after', s.gn, 0.13);
  near('reranking case: concentration by initial rank', s.cnx, 0.05);
  near('reranking case: reranking term', s.rr, 0.08); near('reranking case: vertical equity', s.ve, 0.20);
  near('reranking case: Lambert still gives vertical equity', s.lambert, s.ve, 1e-12);
}
// ---- groups of unequal size
{
  const g = [[0.4, 50], [0.3, 120], [0.2, 260], [0.1, 900]].map(([pop, income], i) => ({ name: 'g' + i, pop, income }));
  const s = FI.analyse(g, [{ name: 't', kind: 'tax', values: [2, 10, 40, 300] }]);
  near('unequal groups: Gini before', s.gx, 0.5242424242424243); near('unequal groups: tax concentration', s.ins[0].c, 0.7564593301435406);
  near('unequal groups: Gini after', s.gn, 0.46209987195902696);
  // Kakwani (1977): for one tax with no reranking, G_X - G_N = t K / (1 - t).
  near('Kakwani: the fall in the Gini is t K / (1 - t)', s.rs, s.t * s.ins[0].kakwani / (1 - s.t), 1e-12);
}
// ---- a proportional tax changes nothing, and equal incomes have no inequality
{
  const g = [100, 300, 900].map((income, i) => ({ name: 'g' + i, pop: 1, income }));
  const s = FI.analyse(g, [{ name: 'flat', kind: 'tax', values: [10, 30, 90] }]);
  near('a proportional tax has a Kakwani index of zero', s.ins[0].kakwani, 0, 1e-12); near('and leaves the Gini where it was', s.rs, 0, 1e-12);
  near('equal incomes: Gini of zero', FI.analyse([1, 2, 3].map(i => ({ name: 'g' + i, pop: i, income: 500 })), []).gx, 0, 1e-12);
}
// ---- a final income at or below zero is reported, not computed through
{
  const s = FI.analyse([{ name: 'a', pop: 1, income: 100 }, { name: 'b', pop: 1, income: 200 }], [{ name: 't', kind: 'tax', values: [100, 20] }]);
  ok('a group left with nothing: no Gini after', s.positive === false && s.gn === null && s.rs === null);
}
// ---- what the parser refuses
ok('a column that is neither tax nor transfer', /tax: name/.test(FI.parse('g, pop, inc, subsidy\na, 1, 10, 1\nb, 1, 20, 1', 'mean').error || ''));
ok('a line with a missing value', !!FI.parse('g, pop, inc, tax: t\na, 1, 10\nb, 1, 20, 1', 'mean').error);
ok('a value that is not a number', !!FI.parse('g, pop, inc, tax: t\na, 1, ten, 1\nb, 1, 20, 1', 'mean').error);
ok('a negative tax', !!FI.parse('g, pop, inc, tax: t\na, 1, 10, -1\nb, 1, 20, 1', 'mean').error);
ok('a single group', !!FI.parse('g, pop, inc, tax: t\na, 1, 10, 1', 'mean').error);

if (errors.length) { console.error(`FAIL: ${errors.length} of ${checks} checks`); errors.slice(0, 20).forEach(e => console.error('  - ' + e)); process.exit(1); }
console.log(`OK: ${checks} checks of the incidence arithmetic.`);
