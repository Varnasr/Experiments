# Poverty & Inequality Explorer

Live at **https://varnasr-experiments.netlify.app/poverty-inequality/**

Grouped-data poverty and inequality analysis in the browser, in the tradition of
POVCAL and Datt's (1998) *Computational tools for poverty measurement and
analysis* (IFPRI FCND Discussion Paper 50). Decile shares and a mean are pulled
live from the World Bank's Poverty and Inequality Platform (PIP,
`api.worldbank.org/pip/v1`, 2021 PPP) or typed in.

## What it computes

- **Lorenz curves**: the General Quadratic (Villasenor and Arnold 1989) and Beta
  (Kakwani 1980) parameterisations, each fitted by OLS to the cumulative decile
  points excluding (1, 1). Validity is checked on a 2,000-point grid (0 ≤ L ≤ p,
  L′ ≥ 0 and non-decreasing) and against the theoretical conditions (GQ: e < 0 and
  a + c ≥ 1). The valid curve with the smaller squared error is used.
- **Inequality** from the fitted quantile function y(p) = μ·L′(p) on a 4,000-point
  grid: Gini, Theil T, mean log deviation, Atkinson at ε = 0.5, 1 and 2, bottom-40
  and top-10 shares, the Palma ratio, P90/P10, the median. The trapezoid Gini on the
  raw points is shown as the lower bound it is.
- **Poverty** at any line: headcount by bisection on y(p), FGT1 and FGT2 by
  integration to the headcount, Watts, the number of poor on PIP's population, and
  the elasticity of the headcount to the line, with a sensitivity curve. Presets for
  the World Bank's June 2025 global lines ($3.00, $4.20, $8.30 in 2021 PPP).
- **Change between two surveys**: the Datt–Ravallion (1992) growth and
  redistribution decomposition with its residual, the Shapley version without one,
  and the Ravallion–Chen (2003) growth incidence curve with a relative pro-poor
  verdict for the bottom 40%.
- **Check against PIP**: one click asks PIP for its own microdata-based headcount,
  gap, severity and Watts at the current line, next to this page's grouped-data
  estimates, so the cost of grouping is visible rather than assumed.

## Verification

On India 2022 (HCES, national, consumption; mean $6.36 a day): PIP reports a Gini
of 0.255 and a median of $5.54; the fitted Beta curve gives 0.256 and $5.56. At
$3.00 PIP's microdata headcount is 5.25% and poverty gap 0.77%; the page gives 5.1%
and 0.8%. At $4.20, 23.9% against 24.3%. The GQ results were checked separately
against Datt's closed-form GQ headcount, poverty gap and squared gap in plain
Python (agreement to four decimals).

## Caveats

- PIP means and lines are per person per day in 2021 PPP dollars. Survey rows are
  labelled national, urban or rural and consumption or income exactly as PIP labels
  them; do not compare an income survey with a consumption one as if they were the
  same thing.
- Ten points determine three parameters; the tails are where the fitted curves
  are least trustworthy, and both the Atkinson(2) index and the ends of the growth
  incidence curve lean on the tails.

No dependencies. One HTML file. MIT.
