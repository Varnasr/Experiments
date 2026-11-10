# Multiple Outcomes and Attrition Bounds

Live at **https://idealogworks.foo/trial-checks/**

Two checks on the results of a trial, in one HTML file.

## Many outcomes

Type one outcome per line with its p-value. The page returns four adjusted
values for each and counts how many results stand at the chosen level.

| Adjustment | What it controls | Source |
| --- | --- | --- |
| Bonferroni | the chance of even one false rejection | |
| Holm | the same, with more power | Holm (1979) |
| Benjamini–Hochberg | the expected share of rejections that are false | Benjamini and Hochberg (1995) |
| Sharpened q-value | the same, after estimating how many nulls are true | Benjamini, Krieger and Yekutieli (2006); Anderson (2008) |

The sharpened q-value is the smallest level, on a grid of 0.001, at which the
two-stage procedure rejects the outcome. It can be smaller than the p-value it
comes from, and 1.000 means the outcome is rejected at no level on the grid.

## Attrition bounds

Upload a CSV with one row per person assigned, an arm column with two values
and an outcome column that is blank for people who were lost. Or use the
simulated example (600 in each arm, a true effect of 0.20, treated people with
low outcomes less likely to drop out).

- **Lee (2009) bounds.** The arm with the higher response rate has a share
  p = (difference in response rates)/(higher rate) of extra respondents.
  Trimming that share from the top of its outcomes gives one bound and from
  the bottom the other. A trimmed number that is not whole gives the
  observation at the cut a fractional weight.
- **Manski (1990) bounds.** Every missing outcome is set to the lowest possible
  value in one arm and the highest in the other, then the reverse. The reader
  enters the range.
- **Intervals.** A percentile bootstrap with 1,000 draws from a seed,
  resampling people within each arm with their missing outcomes, from the
  2.5th percentile of the lower bound to the 97.5th of the upper.

## Where the page stops

- The adjustments take the p-values as given and assume nothing about how the
  outcomes are correlated. Holm and Bonferroni are conservative when outcomes
  move together; resampling methods such as Westfall–Young and Romano–Wolf use
  that correlation and need the data, which this page does not take.
- An adjustment is only as honest as the list. Outcomes that were tested and
  left out make every adjusted value too small.
- The Lee bounds rest on monotonicity: treatment moves people only into
  response or only out of it. The page cannot test that.
- The Lee bounds here use no covariates. Lee (2009) shows that trimming within
  cells of a baseline covariate tightens them.
- The bootstrap interval is not the Imbens and Manski (2004) interval and is
  wider than it. It resamples individuals, so it is wrong for a
  cluster-randomised trial.
- A binary or a continuous outcome is handled the same way, as numbers.

## Verification

`node trial-checks/tests/core.mjs` runs the page's arithmetic under node.
Bonferroni, Holm and Benjamini–Hochberg match the adjusted p-values from
statsmodels' `multipletests` on a family of ten, on ties and on a family with
nothing to reject. The sharpened q-values match a Python routine written from
the description of the two-stage procedure. The Lee bounds match cases worked
by hand (a trimmed count of 2.4 observations gives −1.25 and 0.25) and, on the
simulated example, a Python routine that takes the trimmed mean as an integral
of the quantile function (−0.139 and 0.537, which contain the true 0.20).
Twelve faults were put into the arithmetic one at a time and the test fails on
each. CI runs it.

No dependencies. One HTML file. MIT.
