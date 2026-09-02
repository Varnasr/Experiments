# Cost–Benefit Calculator

Live at **https://varnasr-experiments.netlify.app/cost-benefit/**

Programme appraisal with the uncertainty left in. Enter cost streams, monetised
benefit streams and non-monetised outcome streams, each with the years it runs, an
annual growth rate and a low–high range, and the page reports:

- present value of costs and benefits, net present value, benefit–cost ratio;
- internal rate of return by bisection, with a warning when net flows change sign
  more than once and the IRR may not be unique;
- discounted payback year;
- cost per unit of outcome, with the outcomes undiscounted and discounted (the
  discounting of health outcomes is a convention, and a contested one, so both
  are shown);
- a cash-flow chart and the full year-by-year table with discount factors.

Then a Monte Carlo run (default 4,000 draws): each stream's amount is drawn from a
triangular distribution on its range with the entered value as mode, the discount
rate uniformly from its range, and NPV, BCR and cost per outcome are recomputed
each time. Outputs: the probability NPV is positive, the median and the 5th to
95th percentiles, a histogram, and a one-at-a-time tornado chart showing which
inputs move NPV most.

The "illustrative example" button loads numbers that belong to no real
programme; the page says so.

## Verification

On the illustrative example, PV of costs, PV of benefits, NPV, BCR, IRR and cost
per outcome were reproduced to the cent by an independent Python calculation from
the same stream definitions.

## Limits

Streams are treated as independent in the simulation; correlated inputs (costs
that scale together, benefits that depend on the same take-up rate) would widen
the true distribution. There is no distributional weighting of benefits by who
receives them. Both are deliberate omissions to keep the page readable; both are
where a serious appraisal would go next.

No dependencies. One HTML file. MIT.
