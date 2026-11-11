// The arithmetic of robustness-value, checked against values worked outside it.
//
//   node robustness-value/tests/core.mjs
//
// The Darfur numbers are the ones Cinelli and Hazlett (2020) print: a
// robustness value of 13.9%, 7.6% at the 5% level, and a partial R2 of 2.2%.
// The longer decimals were computed in Python with scipy's t quantile, from
// the formulas in the paper, in a separate implementation. The adjusted
// estimate for a confounder as strong as "female" is the paper's 0.0752.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: no <script id="core"> in robustness-value/index.html'); process.exit(1); }
const mod = { exports: {} };
new Function('module', m[1])(mod);
const X = mod.exports;
// The data file sets a property on window. Run it with a stand-in.
const load = (file, name) => { const w = {}; new Function('window', fs.readFileSync(path.join(here, '..', 'data', file), 'utf8'))(w); return w[name]; };

let checks = 0; const errors = [];
const ok = (name, cond, detail = '') => { checks++; if (!cond) errors.push(`${name}${detail ? ': ' + detail : ''}`); };
const near = (name, got, want, tol = 1e-9) => ok(name, got != null && Math.abs(got - want) <= tol, `got ${got}, want ${want}`);

const est = 0.09731582, se = 0.02325654, df = 783, t = est / se;
// ---- Student's t against scipy
near('t critical, 5%, 5 df', X.tCrit(0.05, 5), 2.5705818356363146, 1e-9);
near('t critical, 1%, 30 df', X.tCrit(0.01, 30), 2.7499956535672254, 1e-9);
near('t critical, 10%, 2 df', X.tCrit(0.10, 2), 2.9199855803537242, 1e-9);
near('t critical, 5%, 1000 df', X.tCrit(0.05, 1000), 1.9623390808264083, 1e-9);
near('t critical, 5%, 782 df', X.tCrit(0.05, 782), 1.9630022003282486, 1e-9);
near('two-sided p of t = 2.1 on 17 df', X.tTwoSided(2.1, 17), 0.05095984722913399, 1e-12);
// ---- Darfur
const s = X.summary(est, se, df, 1, 0.05);
near('Darfur: t', s.t, 4.184449621482817, 1e-12);
near('Darfur: partial R2', s.r2yd, 0.02187308962581913, 1e-14);
near('Darfur: robustness value', s.rv, 0.13877634274242298, 1e-14);
near('Darfur: robustness value at 5%', s.rva, 0.07625795356024134, 1e-10);
ok('Darfur: the paper prints 13.9%, 7.6% and 2.2%', (s.rv * 100).toFixed(1) === '13.9' && (s.rva * 100).toFixed(1) === '7.6' && (s.r2yd * 100).toFixed(1) === '2.2');
// Half of the estimate needs a weaker confounder.
near('Darfur: q = 0.5', X.rv(t, df, 0.5, 1), 0.07202696977532051, 1e-14);
near('Darfur: q = 0.5 at 5%', X.rv(t, df, 0.5, 0.05), 0.004562754351932203, 1e-10);
// The sign of the estimate does not matter.
near('a negative estimate has the same value', X.rv(-t, df, 1, 1), s.rv, 1e-15);
// An estimate that is not significant has a robustness value of zero at alpha.
ok('insignificant: zero at alpha', X.rv(1.5, 100, 1, 0.05) === 0);
ok('insignificant: positive for the point estimate', X.rv(1.5, 100, 1, 1) > 0);
// A very precise estimate, where the bound on the treatment side alone binds.
near('extreme: the second branch', X.rv(400, 50, 1, 0.05), 0.9996618506166206, 1e-12);
// ---- a confounder of given strength: the paper's row for 1x female
const a = X.adjust(est, se, df, 0.0091648, 0.1246391, 0.05);
near('adjusted estimate', a.est, 0.07521980690092721, 1e-12);
near('adjusted standard error', a.se, 0.021873358246533414, 1e-14);
near('adjusted t', a.t, 3.438877837281725, 1e-10);
ok('adjusted estimate is the 0.0752 the paper prints', a.est.toFixed(4) === '0.0752' && a.se.toFixed(4) === '0.0219');
near('interval is estimate plus and minus t critical times se', a.hi - a.lo, 2 * 1.9630022003282486 * a.se, 1e-9);
// A negative estimate is pulled toward zero from below.
near('negative estimate shrinks toward zero', X.adjust(-est, se, df, 0.0091648, 0.1246391).est, -0.07521980690092721, 1e-12);
ok('no confounder, no bias', X.adjust(est, se, df, 0, 0).bias === 0);
ok('a strength of one with the treatment is refused', X.adjust(est, se, df, 1, 0.1) === null);
// ---- bounds from a covariate, against a second implementation in Python
let b = X.bound(0.02, 0.1, 2, 3);
near('bound with the treatment', b.r2dz, 0.04081632653061225, 1e-15);
near('bound with the outcome', b.r2yz, 0.344945053355966, 1e-13);
b = X.bound(0.0090815, 0.109032, 1, 1);
ok('female, once as strong: the paper prints 0.9% and 12.5%', (b.r2dz * 100).toFixed(1) === '0.9' && (b.r2yz * 100).toFixed(1) === '12.5');
ok('a bound above one is capped', X.bound(0.3, 0.6, 1, 3).capped === true && X.bound(0.3, 0.6, 1, 3).r2yz === 1);
ok('an impossible comparison is refused', !!X.bound(0.6, 0.1, 2, 1).error);
near('partial R2 from t', X.partialR2(2, 96), 0.04, 1e-15);

if (errors.length) { console.error(`FAIL: ${errors.length} of ${checks} checks`); for (const e of errors) console.error('  ' + e); process.exit(1); }
console.log(`OK: ${checks} checks on robustness-value.`);
