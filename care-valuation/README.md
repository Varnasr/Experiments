# Unpaid Care Valuation

Live at **https://idealogworks.foo/care-valuation/**

A rupee value for unpaid domestic and care work in India, per person, for
women and men in 36 states and union territories and for the country.

## What it computes

| Step | Definition |
| --- | --- |
| Minutes | average minutes per person per day in ICATUS major division 3 (unpaid domestic services) and 4 (unpaid caregiving), Time Use Survey 2024, ages 15 to 59 or 6 and above |
| Hourly rate | casual daily wage ÷ hours on a casual day, or regular monthly earnings ÷ (hours in the survey week × 52 ÷ 12), PLFS calendar year 2024. Your own hours and days can be typed in instead |
| Floor | a wage from fewer than 30 workers in the survey sample is not used |
| Value | minutes ÷ 60 × hourly rate for a day, × 365 for a year |

The wage is that of all workers in the state by default. Each sex at its own
wage is an option. The minutes can be typed over.

## Where the numbers come from

`data/plfs6.csv` and `data/plfs7.csv` are PLFS indicators 6 and 7 as read from
the MoSPI data service on 11 November 2026. The service returns Time Use Survey
indicator 8 for All India only, so the state minutes were computed from the
unit-level file with `tools/tus_minutes.py`, which stops unless its all-India
results equal the eight figures MoSPI publishes. The unit-level file is not in
this repository. `data/plfs_cells.csv` holds, for each state and sex, the number
of workers behind each wage and the hours they reported. It is written by
`tools/plfs_cells.py` from the PLFS 2024 person-level file, which is also not
in this repository. That script recomputes the wages to check it is reading
the same people: every regular wage is within 0.1% of the published figure.
`data/care-data.js` is what the page loads.

## Where the page stops

The value is a replacement cost at a generalist wage. Standard errors treat
the first-stage unit as a cluster and ignore stratification. Eighteen
casual-wage cells and two regular-wage cells rest on fewer than 30 workers
and give no value. The published casual wage for women is ₹200 in Chandigarh
and ₹500 in Mizoram, each from one woman, and ₹500 in Delhi from three.
Lakshadweep has no woman in casual labour in the sample. There is no state
total.

## Tests

`node care-valuation/tests/core.mjs`. Nineteen faults were injected into the
core one at a time and the test fails on each.
