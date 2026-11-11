# Child Growth z-scores

Live at **https://idealogworks.foo/anthro-zscores/**

Height-for-age, weight-for-height, weight-for-age and BMI-for-age z-scores for
children from birth to 1,856 days, against the WHO 2006 Child Growth
Standards. One child, or a pasted list with prevalence.

## What it computes

| Step | Definition |
| --- | --- |
| z-score | ((y ÷ M)^L − 1) ÷ (L × S), with L, M and S for the child's sex and day of age, or length or height |
| Beyond ±3 | for weight-based indicators, 3 + (y − SD3) ÷ (SD3 − SD2), and the mirror image below −3 |
| Position | length under 731 days, height from 731; 0.7 cm added or taken off when measured the other way |
| Implausible | weight-for-age outside −6 to +5, height-for-age outside −6 to +6, weight-for-height and BMI-for-age outside −5 to +5 |

## Where the numbers come from

`data/who2006.js` holds L, M and S from WHO's ten expanded z-score tables
(weight-for-age, length/height-for-age, BMI-for-age, weight-for-length and
weight-for-height, for boys and girls), downloaded from who.int on 11 November
2026. `tests/who-sd-reference.json` holds the measurements WHO prints at −4 to
+4 standard deviations for four rows of each table.

## Where the page stops

No 2007 reference for ages 5 to 19, no head or arm circumference, no oedema,
no survey weights and no confidence intervals.

## Tests

`node anthro-zscores/tests/core.mjs`. Fifteen faults were injected into the
core one at a time and the test fails on each.
