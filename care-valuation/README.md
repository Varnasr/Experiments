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

## 2019

The year switch gives the same valuation for 2019, and a panel sets the two
years side by side: 2019 rupees are multiplied by the ratio of the all-India
CPI averaged over 2024 to its 2019 average (1.3262, base 2012).

MoSPI's unit-level file for the 2019 Time Use Survey has no start or end time
on any diary row, so the 2019 minutes are read from the survey report,
"Time Use in India-2019", Statement 7.1, with the relative standard errors of
Table (3RSE)_State (`tools/tus2019_report.py`). The 2019 wages, hours and
sample counts are computed from the PLFS unit-level data for January to
December 2019 (`tools/plfs_2019.py`): the last two quarters of the 2018-19
round and the first two of 2019-20, all visits, urban records at a quarter of
their weight. Both scripts stop unless they reproduce MoSPI's all-India
figures. `tools/build_2019.py` writes `data/care-2019.js`.

A change in minutes is marked clear at 1.96 standard errors of the
difference. The two years' errors were computed in different ways and the
2019 ones are about three times larger at all-India level, so the mark is a
guide. The 2019 wage cells count every urban visit and the 2024 cells the
first visit only; a state's regular wage can move with who is in the sample
and should not be read as a wage change. Dadra and Nagar Haveli, Daman and
Diu and Ladakh have no comparison, because the units changed.

## Tests

`node care-valuation/tests/core.mjs`. Nineteen faults were injected into the
core one at a time and the test fails on each. Fourteen more were injected into
the year comparison and the 2019 data file.
