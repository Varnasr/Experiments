# Rupee Converter

Live at **https://idealogworks.foo/rupee-converter/**

Restates a rupee amount at the prices of another month, calendar year or
financial year, and converts between rupees and 2021 PPP dollars.

## What it computes

| Conversion | Definition |
| --- | --- |
| Across time | amount × index of the target period ÷ index of the source period |
| A year | the average of twelve monthly indices; April to March for a financial year |
| To 2021 PPP dollars | the amount at 2021 prices ÷ the World Bank's 2021 factor for India |

## Where the numbers come from

`data/cpi2012.csv` and `data/cpi2024.csv` are the all-India, combined, general
Consumer Price Index on base 2012 and base 2024, as read from the MoSPI data
service on 11 November 2026. `data/ppp.json` holds the World Bank series
PA.NUS.PRVT.PP and PA.NUS.PPP, last updated 8 October 2026.
`data/prices.js` is what the page loads, and the test compares it with the
other three files.

The two CPI series overlap in 2025 and are joined at the ratio of their 2025
averages, 1.8985. The monthly ratio runs from 1.894 to 1.903. Whether MoSPI
has published a linking factor of its own has not been checked.

## Where the page stops

No rural, urban, state or food index, and nothing before January 2013. The
data is a snapshot.

## Tests

`node rupee-converter/tests/core.mjs`. Ten faults were injected into the core
one at a time and the test fails on each.
