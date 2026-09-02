# Women in the NFHS

Live at **https://varnasr-experiments.netlify.app/women-indicators/**

Women's health, work, assets, agency and safety across India's states and across
the five rounds of the National Family Health Survey, pulled live from the DHS
Program API. Nothing is typed in: every value arrives from
`api.dhsprogram.com/rest/dhs/data` with its survey and denominator.

## What it shows

- **National trend**: the all-India value across every round the indicator was
  collected in (NFHS-1 1992–93 to NFHS-5 2019–21).
- **By state**: a dumbbell chart of every state and union territory in the chosen
  round against a comparison round, with the all-India line, sortable by value,
  change or name. NFHS-5's nested rows (Jammu, Kashmir & Ladakh as a parent with
  the two split units below it) are resolved to the split units; renamed states
  are matched across rounds (Orissa/Odisha, Uttaranchal/Uttarakhand,
  Pondicherry/Puducherry, Delhi/NCT of Delhi).
- **Who is behind**: the same indicator by wealth quintile, residence, education
  and five-year age group, with the poorest-minus-richest and
  no-education-minus-highest gaps as headline numbers next to the state range.
- **Data**: the full table and a CSV of every row the API returned.

Twenty curated indicators are offered in five groups (health and nutrition,
education and work, agency and assets, safety and norms, marriage and household),
and any DHS indicator ID can be typed in.

## Uncertainty

The API carries weighted and unweighted denominators but not the design-based
confidence intervals that NFHS publishes in its reports. The intervals drawn are
therefore Wilson intervals on the unweighted sample size inflated by a design
effect the reader sets (default 1.5); they are labelled approximate on the page.
Some modules have no all-India total in the API (the domestic violence module is
one), and the page says so rather than inventing one.

## Verification

Tested headlessly against recorded API responses for twenty indicators across five
rounds. Anaemia among women 15–49 renders as 57.0% for NFHS-5 and 53.1% for NFHS-4,
matching the published fact sheets; the nested-region handling was checked on
NFHS-5 where the parent row was being drawn alongside its children.

No dependencies. One HTML file. MIT.
