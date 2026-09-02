# Causal Inference Workbench

Live at **https://varnasr-experiments.netlify.app/causal-workbench/**

Three panel-data estimators, computed entirely in the browser from a long-format
panel (one row per unit-period):

| Estimator | What it does | Inference |
| --- | --- | --- |
| Two-way fixed-effects DiD | y = α_i + λ_t + δ·D_it + ε. Fixed effects removed by alternating demeaning (works on unbalanced panels), δ by OLS on the residualised variables. | Cluster-robust sandwich at the unit level, G/(G−1)·(n−1)/(n−k) small-sample factor (the `fixest` convention: nested fixed effects are not counted in k). CI uses a t with G−1 degrees of freedom. |
| Event study | Dynamic TWFE with relative-time indicators (endpoints binned, k = −1 omitted), or the Sun–Abraham (2021) interaction-weighted estimator: cohort × relative-time coefficients against never-treated units, averaged with cohort-share weights. | Same clustered covariance; Sun–Abraham standard errors by the delta method on the full coefficient covariance. A Wald test of the pre-period coefficients is reported for the TWFE version. |
| Synthetic control | Abadie–Diamond–Hainmueller weights on the simplex, pre-period outcomes as predictors, solved by accelerated projected gradient with an exact simplex projection (Duchi et al. 2008). Several treated units at one date are averaged. | Placebo-in-space: every donor is treated in turn, and the treated unit's post/pre RMSPE ratio is ranked against the placebo ratios. |

## Data sources

- **Simulate**: unit effects, a non-linear common time path, an AR(1) shock and a
  treatment effect you set (level at adoption plus growth per period), with common
  or staggered adoption and an optional violated pre-trend. Because the truth is
  known, the event study draws it as a dashed line and the DiD output says whether
  its confidence interval covers the true average effect. Staggered adoption with a
  growing effect is the textbook case where static TWFE is biased even under
  parallel trends; switch the event study to Sun–Abraham to see the repair.
- **Upload CSV**: pick the unit, time, outcome and treatment columns. The treatment
  column may be a 0/1 that switches on, or each unit's adoption period.
- **World Bank**: pulls a country-year panel for one of eight indicators from
  `api.worldbank.org` (aggregates dropped, countries with gaps dropped so the donor
  pool is balanced), with a treated ISO3 code and a treatment year of your choosing.

## Reading the output

- A pre-period Wald p-value below 0.05, or pre-period coefficients that trend, is
  evidence against parallel trends; the estimates after adoption are then not an
  effect.
- When there are more donors than pre-treatment periods, the synthetic control can
  fit the pre-period exactly and the weights are not unique. The page says so and
  the placebo p-value should not be read.
- The World Bank panel is a demonstration of the mechanics, not a finding. A
  synthetic India built from log GDP per capita of other countries says nothing
  causal unless the treatment is a real, dated, India-specific shock and the donor
  pool is defensible.

## Verification

The TWFE coefficient and clustered standard error were checked against an
independent explicit-dummies regression (unit and period dummies, same sandwich)
written in plain Python on the same simulated panel: δ agreed to 6 decimals and the
standard error to 4.

No dependencies. One HTML file. MIT.

## Regression discontinuity (added September 2026)

A fourth estimator with its own data (an outcome, a running variable, a cutoff):
local linear regression on each side of the cutoff with triangular kernel
weights, HC1 standard errors (the conventional interval; the bias-corrected
Calonico–Cattaneo–Titiunik interval is not implemented), the Imbens–Kalyanaraman
(2012) plug-in bandwidth with a manual override, a bandwidth-sensitivity band from
half to twice the chosen bandwidth, placebo cutoffs at the median of each side,
and a simplified McCrary (2008) density test on binned counts. The simulator
plants a known jump and, optionally, manipulation just below the cutoff so the
density test has something to find.
