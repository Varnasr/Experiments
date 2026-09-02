# Wage Gap Decomposition

Live at **https://varnasr-experiments.netlify.app/wage-gap/**

The Oaxaca (1973) and Blinder (1973) decomposition of a mean wage gap between two
groups, computed in the browser on uploaded microdata or on a simulated
labour-force sample with a known structure.

## What it computes

- **Two-fold decomposition** (X̄_A − X̄_B)′β* + [X̄_A′(β_A − β*) + X̄_B′(β* − β_B)]
  with four choices of reference coefficients β*: the pooled regression with a
  group dummy (Jann 2008, the default), the pooled regression without it (Neumark
  1988), the advantaged group's coefficients, or the disadvantaged group's.
- **Three-fold decomposition** into endowments, coefficients and interaction from
  the disadvantaged group's viewpoint.
- **Detailed contributions** by variable for both the explained and unexplained
  parts, with the warning that unexplained rows for dummy variables depend on the
  base category (Oaxaca and Ransom 1999) while the totals do not.
- **Bootstrap standard errors** for every total and every detailed contribution,
  resampling workers with replacement and re-running both regressions and the
  decomposition each time.
- The two group regressions themselves, with HC1 heteroskedasticity-robust
  standard errors, R² and group means.

## Data

Upload a CSV with a wage column (logged by default), a two-valued group column
and any covariates; text columns are expanded into dummies against their most
common category, and rows with missing values are dropped with a count. Or
simulate: a sample where women carry an intercept penalty and a different return
to education you choose, and have fewer years of experience, less education and
lower urban and formal-sector shares, so the "unexplained" total can be compared
with the penalty that was planted.

## Verification

The decomposition totals on the simulated sample were reproduced exactly by an
independent plain-Python implementation (separate normal-equation OLS for each
group, pooled regression with dummy, and the two-fold formula) on the same data
exported from the page. Explained plus unexplained equals the raw gap to floating
point precision by construction, and the page checks that identity too.

No dependencies. One HTML file. MIT.
