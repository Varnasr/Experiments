# Robustness Value

Live at **https://idealogworks.foo/robustness-value/**

Sensitivity of a regression coefficient to an omitted variable, after Cinelli
and Hazlett (2020).

## What it computes

| Measure | Definition |
| --- | --- |
| Partial R² of the treatment | t² ÷ (t² + df) |
| Robustness value | ½(√(f⁴ + 4f²) − f²), f = q\|t\| ÷ √df |
| At a significance level | the same with f reduced by t*(α, df − 1) ÷ √(df − 1); (f² − f*²) ÷ (1 + f²) when f exceeds the reciprocal of that ratio |
| Adjusted estimate | \|estimate\| − se × √df × √(R²Y × R²D ÷ (1 − R²D)) |
| Adjusted standard error | se × √((1 − R²Y) ÷ (1 − R²D)) × √(df ÷ (df − 1)) |
| Bounds from a covariate | section 4.4 of the paper, for a confounder kD and kY times as strong |

The default example is the Darfur regression of Hazlett (2020). The page
returns the paper's 13.9%, 7.6% and 2.2%, and an adjusted estimate of 0.0752
for a confounder as strong as being female. The two t-statistics shown for
that covariate are the ones that give the bounds the paper reports. They were
not read from the regression output.

Oster's δ was the alternative for this page. It was left out because its
reference implementation is Stata's psacalc, which could not be run to check
it.

## Where the page stops

One linear regression coefficient. No adjustment for clustered standard
errors beyond the t-statistic entered. No instrumental variables, logit or
probit.

## Tests

`node robustness-value/tests/core.mjs`. Twelve faults were injected into the
core one at a time and the test fails on each.
