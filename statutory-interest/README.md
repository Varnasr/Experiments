# Statutory Interest Calculator

Live at **https://varnasr-experiments.netlify.app/statutory-interest/**

Five interest rules from Indian statutes, each computed with the provision quoted
beside it and the working shown period by period.

| Tab | Rule | Provision |
| --- | --- | --- |
| MSMED | Compound interest with monthly rests at three times the RBI bank rate, from the day after the agreed period (capped at 45 days from acceptance) to payment | MSMED Act 2006, sections 15 and 16 |
| Decree | Simple interest in three periods: pre-suit as contracted, pendente lite at the court's discretion, post-decree capped at 6% unless the debt arose from a commercial transaction | CPC 1908, section 34(1) and proviso |
| Award | Pre-award interest as directed; post-award at two points above the current rate of interest (Interest Act 1978, section 2(b)) unless the award directs otherwise; computed on the sum plus pre-award interest per Hyder Consulting v Governor of Orissa (2015) 2 SCC 189, with the principal-only alternative shown | Arbitration and Conciliation Act 1996, section 31(7) as amended in 2015 |
| Cheque | Fine up to twice the cheque amount; interim compensation up to 20%; appellate deposit of at least 20%; interest as a component of compensation at a rate the reader sets | NI Act 1881, sections 138, 143A, 148 |
| Plain | Simple, or compound with monthly, quarterly or yearly rests | day count actual/365; stub periods simple |

## Conventions

Actual days over 365 throughout. Compounding applies the periodic rate to each
complete period and simple interest to the final stub, and the schedule shows
every period's opening balance, interest and closing balance so a counterparty or
a court can check it.

## Where the page stops

The bank rate must be entered for the period (the RBI publishes it with every
policy statement); the page does not fetch it. The supplier must be a registered
micro or small enterprise for section 16 to apply. The section 138 figures are
ceilings and a common working, not entitlements; compensation under section 357
CrPC (section 395 BNSS) is in the court's discretion. The limitation clocks under
section 142 are not computed.

## Verification

All five default cases reproduce in Python to the rupee: MSMED ₹86,430 on
₹5,00,000 at 20.25% over nine monthly rests and a stub; decree ₹2,65,315;
award ₹8,74,473; plain simple ₹32,022.

Not legal advice. No dependencies. One HTML file. MIT.
