# Multidimensional Poverty

Live at **https://idealogworks.foo/mpi-calculator/**

The Alkire–Foster adjusted headcount ratio from your own data. Upload a CSV
with one row per person and a column of 0 or 1 for each deprivation, list the
indicators with their weights, set the poverty cutoff k, and optionally name a
sampling-weight column and a group column.

## What it computes

| Measure | Definition |
| --- | --- |
| Deprivation score | the weighted sum of the indicators in which a person is deprived, weights rescaled to add to one |
| Headcount, H | the share of people whose score is at or above k |
| Intensity, A | the average score among those people |
| Index, M₀ | H × A (Alkire and Foster 2011) |
| Censored headcount | the share of people who are poor and deprived in an indicator |
| Share of the index | weight × censored headcount ÷ M₀, by indicator; population share × group M₀ ÷ M₀, by group |
| Vulnerable, severe | a score of at least 0.2 and below k; a score of at least 0.5 |

A table repeats H, A and M₀ at cutoffs from 10% to 70%, so that a comparison
can be checked for dependence on the cutoff.

The simulated example has 2,400 people in three regions and the ten
indicators and weights of the global index (one sixth each for the two health
and two education indicators, one eighteenth each for six living-standards
indicators). It describes no country.

## Where the page stops

- The page takes each 0 or 1 as given. Building the indicators from a survey
  (whose child counts for nutrition, which fuels count as clean) is the hard
  part of an index, and it happens before the file is made.
- A row with a missing indicator is left out. The global index has its own
  rules for missing and non-applicable indicators, which are not applied.
- There are no standard errors. Differences between small groups may be noise,
  and a survey with strata and clusters needs its design for them.
- The index is M₀ only. The measures that use the depth of each deprivation
  (M₁, M₂) need cardinal data and are not computed.
- The example is simulated and describes no country.

## Verification

`node mpi-calculator/tests/core.mjs` runs the page's arithmetic under node.
Four people with three indicators are worked by hand (H 0.5, A 0.75, M₀
0.375). On the simulated example every value matches a Python calculation in
exact fractions: M₀ 0.0877, H 19.6%, A 44.7%, the ten censored headcounts, the
three regions and four other cutoffs. The identities hold: weighted censored
headcounts add to M₀ and group values average to it. A score that reaches the
cutoff only up to floating-point rounding is counted as reaching it. Ten
faults were put into the arithmetic one at a time. One passed at first, the
rounding tolerance, because 1/6 + 1/6 happens to equal 1/3 in floating point;
the test now uses 0.7 + 0.1 + 0.1 + 0.1 against a cutoff of 1, and all ten
fail. CI runs it. The results have not been compared with a published
national index, which needs that country's microdata.

No dependencies. One HTML file. MIT.
