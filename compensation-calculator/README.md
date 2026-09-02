# Motor Accident Compensation Calculator

Live at **https://varnasr-experiments.netlify.app/compensation-calculator/**

Fatal-accident compensation under section 166 of the Motor Vehicles Act, 1988,
computed step by step with the authority for each line. A law-and-economics
exercise: the Supreme Court has turned the assessment of a life's earnings into a
schedule, and a schedule can be coded.

| Step | Rule | Authority |
| --- | --- | --- |
| Annual income | monthly × 12, net of income tax | Sarla Verma v DTC (2009) 6 SCC 121, para 32; Pranay Sethi para 61(iv) on "established income" |
| Future prospects | permanent job: +50% below 40, +30% at 40–50, +15% at 50–60; self-employed or fixed salary: +40%, +25%, +10%; nothing above 60 in the conclusions | National Insurance v Pranay Sethi (2017) 16 SCC 680, para 61(iii)–(iv) |
| Personal and living expenses | married: one-third for 2–3 dependants, one-fourth for 4–6, one-fifth above 6; unmarried: one-half, reducible to one-third for a large dependent family | Sarla Verma paras 30–32, adopted in Pranay Sethi para 61(v) |
| Multiplier | by the age of the deceased: 18 (15–25), 17 (26–30), 16 (31–35), 15 (36–40), 14 (41–45), 13 (46–50), 11 (51–55), 9 (56–60), 7 (61–65), 5 (66–70) | Sarla Verma para 42, Pranay Sethi para 61(vi)–(vii) |
| Conventional heads | ₹15,000 loss of estate, ₹40,000 consortium, ₹15,000 funeral, enhanced 10% every three years from 31 October 2017 | Pranay Sethi para 61(viii) |
| Consortium per dependant | spousal, parental and filial consortium to each dependant | Magma General Insurance v Nanu Ram (2018) 18 SCC 130; New India Assurance v Somwati (2020) 9 SCC 644; Sameem Begum v K. Venkat Swamy (SC, 14 August 2026) |
| Interest | simple interest from the date of the claim petition, rate set by the tribunal | section 171, Motor Vehicles Act 1988 |

## Where the law is unsettled, the page says so

- **Consortium to each dependant or once.** Magma (2018), Somwati (2020) and
  Sameem Begum (2026) award it to each dependant; Shri Ram General Insurance v
  Bhagat Singh Rawat (SC, 27 March 2023) treated the ₹40,000 as the total. Both
  are offered; the working cites whichever is chosen and names the contrary line.
- **Enhancement by award date or accident date.** Pranay Sethi says 10% every three
  years; benches differ on which date the enhancement is measured to. The page
  measures to the award date and the note shows the effect of changing it.
- **A married deceased with one dependant.** Sarla Verma's scale starts at two or
  three dependants (one-third) and is silent on one; the page applies one-third and
  flags it.
- **Above 70.** The Sarla Verma table stops at 70; a multiplier must be entered.

## Verification

A published worked example (deceased aged 38, ₹4,004 a month, permanent job, eight
dependants) gives ₹6,006 with 50% future prospects, one-fifth deducted, ₹57,658 a
year, multiplier 15, loss of dependency ₹8,64,864; the page reproduces it. The
enhanced conventional heads for an award in August 2026 (₹18,150 and ₹48,400)
match the figures the Supreme Court applied in Sameem Begum.

Not legal advice. Injury claims, contributory negligence, the section 164 no-fault
scheme and a child's death are outside its scope. One HTML file, no dependencies. MIT.
