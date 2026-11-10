# Fiscal Incidence

Live at **https://idealogworks.foo/fiscal-incidence/**

Who pays a tax and who receives a transfer, measured from a table of income
groups. The table has one line per group: its population, its income before
taxes and transfers, and what it pays or receives under each instrument, per
person or as group totals.

## What it computes

| Measure | Definition | Source |
| --- | --- | --- |
| Gini before and after | one minus twice the area under the Lorenz curve through the group points | |
| Concentration coefficient | the same calculation for a tax or transfer, groups ranked by income before | Kakwani (1977) |
| Kakwani index, tax | C_T − G_X; positive is progressive | Kakwani (1977) |
| Kakwani index, transfer | G_X − C_B; positive is progressive | Lustig (ed.), Commitment to Equity Handbook (2018) |
| Redistributive effect | G_X − G_N | Reynolds and Smolensky (1977) |
| Vertical equity | G_X − C_N, final income ranked by income before | Kakwani (1984) |
| Reranking | G_N − C_N | Atkinson (1980); Plotnick (1981) |
| Vertical equity from the indices | (t·K_T + b·K_B)/(1 − t + b) | Lambert (2001) |
| Marginal contribution | Gini of final income without the instrument, minus the Gini of final income | Commitment to Equity Handbook |

The page prints vertical equity both ways, so the reader can see the identity
hold. Each transfer is also read against zero: a negative concentration
coefficient means poorer groups receive more rupees per person, which the
handbook calls progressive in absolute terms. A table shows every instrument
as a percentage of each group's own income, and a chart draws the Lorenz curves
and the concentration curve of each instrument.

Where the Kakwani index and the marginal contribution of an instrument point in
opposite directions, the page says so. That can happen when instruments are
combined, and the marginal contribution is the one that describes the system
as it stands.

## Where the page stops

- Everyone inside a group is treated as having the group's mean income, so
  inequality within groups is left out. Every Gini is lower than the one
  microdata would give, and reranking between households inside a group is
  invisible.
- The table is taken as given. Who really bears a tax (the shifting of an
  indirect tax to consumers, of a corporate tax to workers) is an assumption
  made before the table is filled in.
- No behavioural response: income before is the same with and without the
  instruments.
- In-kind services such as schooling and health care can be entered as
  transfers only if they have been valued, usually at the cost of provision.
- A final income of zero or less in any group stops the calculation of the
  Gini after.
- The example is invented and describes no country.

## Verification

`node fiscal-incidence/tests/core.mjs` runs the page's arithmetic under node.
The reference values were computed in Python by different formulas: the Gini
as the mean absolute difference between groups over twice the mean, and each
concentration coefficient as twice the covariance of the amount with the
mid-rank over the mean. On the example the two agree to ten decimals: Gini
0.4238 before and 0.3615 after, a direct tax with a concentration coefficient
of 0.8176, an indirect tax at 0.3246 that raises the Gini by 0.25 points.
The test also checks Kakwani's identity for a single tax,
G_X − G_N = t·K/(1 − t); Lambert's for taxes and transfers together; a case
built to rerank (Gini 0.25 to 0.13, reranking 0.08); groups of unequal size
entered per person and as totals; and what the parser refuses. Eleven faults
were put into the arithmetic one at a time and the test fails on each. CI
runs it. The results have not been compared with a published incidence study.

No dependencies. One HTML file. MIT.
