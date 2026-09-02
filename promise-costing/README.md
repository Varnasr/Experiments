# Manifesto Promise Costing

Live at **https://varnasr-experiments.netlify.app/promise-costing/**

What a set of manifesto promises adds up to, set against the budget of the state
that would have to pay for them.

## Method

Each promise is beneficiaries × uptake share × unit cost per year, entered as low,
most likely and high for each of the three quantities. A recurring promise grows
at a unit-cost growth rate; a one-off promise (a loan waiver, a capital scheme) is
spread evenly over the years given.

The state's aggregates are entered by hand for one budget year, in ₹ crore:
revenue receipts and own tax revenue, total expenditure and capital outlay, GSDP,
fiscal and revenue deficit, committed expenditure, nominal growth and revenue
buoyancy. The sources are the state's Budget at a Glance and the RBI's annual
*State Finances: A Study of Budgets*. The example loaded by default is an
illustrative state with round numbers and is labelled as such on the page.

Outputs:

- First-year bill at the likely values, as a share of revenue receipts, total
  expenditure, GSDP, own tax revenue and capital outlay; the fiscal and revenue
  deficit before and after on the all-else-equal assumption; the rise in own tax
  revenue or the share of the discretionary budget that would pay for it.
- Promise-by-promise table with low-to-high range and a stacked share bar.
- A multi-year path of the deficit against the fiscal responsibility norm
  (3% of GSDP pre-filled, editable), with revenue growing at buoyancy × growth.
- A 4,000-draw Monte Carlo on independent triangular distributions, giving the
  median, the 5th to 95th percentile band, and the share of draws that breach the
  norm if borrowed.
- A one-at-a-time tornado of every ranged input, ranked by swing.

JSON export and import; the working state is kept in the browser.

## Where the page stops

No revenue side of a promise, no behavioural response, no Centre's share in
centrally sponsored schemes, no correlation between promises in the Monte Carlo
(so the band is narrower than reality). The deficit path scales the baseline
deficit with GSDP, which is a baseline, not a forecast.

## Verification

The six example promises reproduce by hand: ₹10,200 cr, ₹6,048 cr, ₹2,275 cr,
₹990 cr, ₹6,667 cr (₹2,00,000 cr over three years) and ₹5,320 cr, total
₹31,500 cr, 15.7% of ₹2,00,000 cr revenue receipts, 1.97% of GSDP, lifting a
3.0% deficit to 5.0%. The Monte Carlo median sits within 2% of the deterministic
total, as it should when the ranges are roughly symmetric.

No dependencies. One HTML file. MIT.
