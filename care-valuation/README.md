# Unpaid Care Valuation

Live at **https://idealogworks.foo/care-valuation/**

A rupee value for unpaid domestic and care work in India, per person, for
women and men in 36 states and union territories and for the country.

## What it computes

| Step | Definition |
| --- | --- |
| Minutes | average minutes per person per day in ICATUS major division 3 (unpaid domestic services) and 4 (unpaid caregiving), Time Use Survey 2024, ages 15 to 59 or 6 and above |
| Hourly rate | casual daily wage ÷ hours in a paid day, or regular monthly earnings ÷ paid days ÷ hours, PLFS calendar year 2024 |
| Value | minutes ÷ 60 × hourly rate for a day, × 365 for a year |

The wage is that of all workers in the state by default. Each sex at its own
wage is an option. The minutes can be typed over.

## Where the numbers come from

`data/plfs6.csv` and `data/plfs7.csv` are PLFS indicators 6 and 7 as read from
the MoSPI data service on 11 November 2026. The service returns Time Use Survey
indicator 8 for All India only, so the state minutes were computed from the
unit-level file with `tools/tus_minutes.py`, which stops unless its all-India
results equal the eight figures MoSPI publishes. The unit-level file is not in
this repository. `data/care-data.js` is what the page loads.

## Where the page stops

The value is a replacement cost at a generalist wage. Hours in a paid day and
paid days in a month are assumptions. Standard errors treat the first-stage
unit as a cluster and ignore stratification. Lakshadweep has no casual wage
for women, and the casual wage for women in Chandigarh, Delhi and Mizoram is
a round ₹200 or ₹500. There is no state total.

## Tests

`node care-valuation/tests/core.mjs`. Ten faults were injected into the core
one at a time and the test fails on each.
