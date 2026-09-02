# Survey Data Auditor

Live at **https://varnasr-experiments.netlify.app/survey-audit/**

The checks a monitoring team runs on a survey dataset before anyone estimates
anything, in one HTML file that runs in the browser. Nothing is uploaded.

| Check | Statistic | Verdict rule |
| --- | --- | --- |
| Missingness | share of cells blank (blank, NA, N/A, ".", "-", -99, -999, 999), by column and by enumerator | worst column above 20% is a problem; an enumerator more than 2 SD above colleagues is named |
| Duplicate interviews | exact duplicates (hash of every column except ID and timestamps) and near-duplicates (pairs within an enumerator identical on 90%+ of columns) | above 3% of interviews is a problem |
| Benford's law | first-digit distribution of open-ended amounts; mean absolute deviation against Nigrini's (2012) cut-offs (0.006 / 0.012 / 0.015) plus a χ²(8) test; per enumerator too | MAD at or above 0.015 is nonconformity |
| Age heaping | Whipple's index (ages 23 to 62 ending in 0 or 5, UN scale) and Myers' blended index (ages 10 to 89); ages outside 0 to 110 flagged | Whipple at or above 125 ("rough") is a problem |
| Straightlining | share of interviews with an identical answer to every item in a rating battery, against the chance rate for independent uniform answers | above 25% overall, or an enumerator above 30% or 2 SD above colleagues |
| Duration and timing | end minus start (or a duration column); interviews under 40% of the median; starts before 06:00 or after 21:00; most interviews per day per enumerator | more than 5% very short, or an enumerator whose median is under half the overall median |
| Rounding of measurements | second-decimal digit of decimal measures against a uniform χ²(9) | more than half ending in 0 is worth a look |
| Outliers | robust z = |x − median| / (1.4826 × MAD) above 5, per numeric column | listed, never deleted |
| Who to call | every metric above, z-scored across enumerators; two flags puts an enumerator on the call-back list | triage, not proof |

Exports: a Markdown report with every check, statistic and verdict, and a CSV of
flagged interviews with reasons, ready for a call-back list.

## Column roles

Roles (ID, enumerator, age, start, end, duration, Benford columns, rating
battery) are guessed from header names and value patterns, and every guess can be
overridden. Benford is offered only for numeric columns whose 5th to 95th
percentile spans at least 50×, since the law does not apply to bounded numbers.

## Demo data

The demo dataset is simulated with a fixed seed (640 interviews, 8 enumerators)
and six planted problems: one enumerator who works fast, straightlines and
invents amounts with uniform first digits; one who heaps ages on 0 and 5; one who
leaves income and expenditure blank; one who copies interviews under a new ID
with a shifted time; one who starts interviews late at night; and a scattering of
impossible ages. The page says it is simulated wherever the data is described.

## Verification

Whipple's index, Myers' blended index and the Benford expectation were checked
against hand-computed values (uniform ages give Whipple 100 and Myers 0; ages all
ending in 0 give Myers 90; the nine Benford shares sum to 1). The demo run
recovers all six planted problems and attributes each to the right enumerator.

No dependencies. One HTML file. MIT.
