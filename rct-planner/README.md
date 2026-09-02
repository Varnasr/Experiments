# RCT Planner

Live at **https://varnasr-experiments.netlify.app/rct-planner/**

Two tools a field trial needs before it starts, in one HTML file.

## Power and minimum detectable effect

MDE = (t₁₋α/₂ + t₁₋β) · √[1 / (P(1−P))] · √[σ²(1−R²) / N], after Bloom (1995)
and Duflo, Glennerster and Kremer (2007), with:

- individual or cluster randomisation (N = J·m and the design effect
  √[1 + (m−1)ρ], t quantiles on N−2 or J−2 degrees of freedom);
- continuous outcomes (σ) or binary ones (σ² = p₀(1−p₀), MDE in percentage points);
- covariate adjustment through R²;
- attrition, applied to the sample before the calculation;
- imperfect take-up, which divides the intention-to-treat MDE by the difference in
  take-up to give the detectable effect on compliers;
- multiple primary outcomes, with α divided by their number (Bonferroni);
- the required sample or number of clusters for a target effect, found by
  bisection, and the power the current design has for it.

Three sensitivity curves: MDE against sample size or number of clusters, MDE
against the intra-cluster correlation, and power against the true effect. The t
distribution is computed from the regularised incomplete beta function in the
page; no statistics library.

## Randomise a baseline

Upload a baseline CSV (or use the simulated demo of 720 households in 36
villages) and get:

- assignment at the row level or at a cluster level, stratified on any number of
  columns (numeric stratifiers are cut into quantile bins), to two or more arms
  with any allocation shares;
- a seeded, reproducible permuted-block draw within each stratum, with allocation
  remainders carried across strata so that small strata still add up to the
  target split overall;
- a balance table at the moment of the draw: means by arm, Welch t-test p-values
  for each covariate, and a joint F-test of the treatment indicator on all
  covariates;
- a randomisation record with the seed, algorithm, strata, shares and a SHA-256
  digest of the input file, for the pre-analysis plan; assignments as CSV.

## Verification

The individual-randomisation MDE for N = 1,000, P = 0.5, σ = 1, α = 0.05 and
power 0.8 is 0.177, matching the normal-approximation formula; the clustered case
(60 clusters of 20, ρ = 0.05) gives 0.230 against 0.226 without the t-correction
for 58 degrees of freedom. The randomiser was checked for exact 50/50 splits with
stratification, for 40/30/30 three-arm splits, and for cluster-level draws where
every stratum holds a single cluster.

No dependencies. One HTML file. MIT.
