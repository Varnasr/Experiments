# Sampling Design

Live at **https://idealogworks.foo/sampling-design/**

Three decisions a descriptive survey needs before fieldwork, in one HTML file:
how many interviews, how to divide them between strata, and which clusters to
visit. Every number is shown with its working.

## Sample size

| Purpose | Formula | Source |
| --- | --- | --- |
| One proportion to a margin of error e | n₀ = z²p(1−p)/e² | Cochran (1977), chapter 4 |
| One mean to a margin of error e | n₀ = z²σ²/e² | Cochran (1977), chapter 4 |
| A change between two independent rounds, proportions | (z₁₋α/₂ + z₁₋β)²[p₁(1−p₁) + p₂(1−p₂)]/(p₂−p₁)² in each round | the usual two-sample normal approximation |
| A change between two independent rounds, means | 2σ²(z₁₋α/₂ + z₁₋β)²/δ² in each round | the same |

Then, in this order: the finite population correction n₀/(1 + (n₀−1)/N) when a
population size is entered (estimates only); the design effect, either entered
or 1 + (m−1)ρ for m interviews per cluster and intra-cluster correlation ρ
(Kish 1965); division by the expected response rate; rounding up. The number of
clusters is the sample divided by m, rounded up. A small table shows the sample
at other margins of error, correlations, cluster sizes and response rates.

Normal quantiles are found by bisection on the power series of the distribution
function, so there is no statistics library and no approximation constants to
mistype.

## Allocation across strata

Strata are typed one per line: name, population, and optionally the standard
deviation of the outcome. The page gives proportional allocation (n·N_h/N),
Neyman allocation (n·N_hS_h/ΣN_hS_h; Neyman 1934, Cochran section 5.5) and equal
allocation, each with a minimum per stratum and the stratum's population as
bounds, rounded to whole interviews by largest remainder. It shows the weight
N_h/n_h and the standard error of the overall mean under each,
√Σ W_h²S_h²(1 − n_h/N_h)/n_h.

## Drawing clusters

Upload a CSV with one row per cluster, or use the invented example of 60
villages in four districts. Choose the cluster column, the measure of size and
an optional stratum column. The draw is systematic sampling with probability
proportional to size in file order (Cochran section 9A.9):

- a cluster at least as large as the sampling interval is taken with certainty
  and the interval is recomputed for the rest;
- with strata, clusters are divided between them in proportion to their total
  size, at least one each, and each stratum gets its own random start;
- the generator is mulberry32 from the seed you enter, so the same file,
  settings and seed give the same draw;
- the weight of an interview is the inverse of P(cluster) × P(household within
  cluster), and the page checks that the weights add back to the frame total.

Outputs: the selected clusters with both probabilities and the weight, as a
table and a CSV, and a sampling record with the seed, the interval and start in
each stratum and a SHA-256 digest of the frame.

## Where the page stops

- The design effect 1 + (m−1)ρ assumes clusters of equal size and does not
  include the loss of precision from unequal weights.
- The finite population correction is applied to the simple random sample and
  the design effect afterwards. Some texts apply them in the other order.
- A comparison between two rounds treats them as independent samples. A panel
  of the same households needs fewer interviews than the page says.
- Allocation is for one outcome and a simple random sample within each
  stratum. A survey with several outcomes needs a compromise between their
  Neyman allocations.
- Systematic selection gives no joint selection probabilities, so the variance
  of an estimate has to come from the usual with-replacement approximation.
- The page draws clusters. Listing the households in a selected cluster and
  choosing among them is fieldwork.

## Verification

`node sampling-design/tests/core.mjs` runs the page's arithmetic under node
and compares it with values computed separately in Python from the formulas
above: 385 interviews for p = 0.5, e = 0.05 at 95%; 833 with a design effect
of 1.95 and 90% response; 711 with a population of 2,000, a design effect of
1.5 and 85% response; 834 in each round to detect 0.40 against 0.50 at 5% and
80% power with the same design; the proportional, Neyman and equal allocations
of 1,200 interviews over four strata and their standard errors. The draw is
compared with a second implementation that finds each selection point by
lookup, over several hundred random frames; selection frequencies over 20,000
starts match k·M_i/M; and the weights add back to the frame total with a
certainty selection present. Thirteen faults were put into the page's
arithmetic one at a time and the test fails on each. CI runs it.

No dependencies. One HTML file. MIT.
