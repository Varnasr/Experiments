# Experiments

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/Varnasr/Experiments)](https://github.com/Varnasr/Experiments/commits/main)
[![Part of OpenStacks](https://img.shields.io/badge/Part%20of-OpenStacks-blue)](https://openstacks.dev)

**Experimental prototypes, proof-of-concepts, and sandbox projects.**

A scratchpad for building and testing ideas quickly before they graduate into dedicated repositories, or get retired.

---

## About

This repository houses small-scale experiments, early-stage prototypes, and one-off tools that don't yet warrant their own repository. Projects here range from functional tools shared with collaborators to quick explorations of an idea or technical approach.

Not everything here is polished. That's the point.

---

## Current Projects

### Causal Inference Workbench

Difference-in-differences, event studies and synthetic control, computed entirely in
the browser from a long-format panel. TWFE DiD with cluster-robust standard errors
(fixed effects removed by alternating demeaning); a dynamic event study, plain or
Sun–Abraham (2021) interaction-weighted for staggered adoption, with a pre-trend Wald
test; Abadie-style synthetic control by projected gradient on the simplex with
placebo-in-space inference. Data from a seeded simulator with a known true effect, a
CSV upload, or a live World Bank country panel.

**Directory:** `causal-workbench/`
**Stage:** Active

---

### Poverty & Inequality Explorer

Grouped-data poverty and inequality analysis after Datt (1998): General Quadratic and
Beta Lorenz curves fitted to decile shares, Gini/Theil/MLD/Atkinson/Palma from the
fitted quantile function, FGT poverty measures at any line with a sensitivity curve,
Datt–Ravallion growth–redistribution decomposition (plus the Shapley version) and a
growth incidence curve between two surveys. Deciles and means are pulled live from
the World Bank's Poverty and Inequality Platform (2021 PPP), and one click compares
the page's grouped-data answers with PIP's microdata figures.

**Directory:** `poverty-inequality/`
**Stage:** Active

---

### Survey Data Auditor

Field-data quality checks in one HTML file: exact and near-duplicate interviews,
Benford's law on amounts (Nigrini MAD and χ²), age heaping (Whipple and Myers),
straightlining, interview duration and timing, missingness, rounding, robust outliers,
and an enumerator profile that z-scores every metric and produces a call-back list.
Exports a Markdown report and a CSV of flagged interviews. Ships with a seeded,
clearly labelled simulated dataset with six planted problems.

**Directory:** `survey-audit/`
**Stage:** Active

---

### Women in the NFHS

Women's health, work, assets, agency and safety across India's states and the
five NFHS rounds, pulled live from the DHS Program API: national trend, a
state dumbbell chart against a comparison round, breakdowns by wealth, residence,
education and age, approximate confidence intervals from the unweighted n and a
chosen design effect, and CSV export. Twenty curated indicators plus any DHS ID.

**Directory:** `women-indicators/`
**Stage:** Active

---

### Heat and Outdoor Work

Hour-by-hour WBGT from live Open-Meteo forecasts for any place in India, the
ACGIH/ISO work–rest screening limits by workload and acclimatisation, safe working
hours per day, wages lost for a workforce, and a 35-year trend in dangerous-heat
days from the ERA5-based archive. Framed around the outdoor work that falls on
women.

**Directory:** `heat-exposure/`
**Stage:** Active

---

### Wage Gap Decomposition

Oaxaca–Blinder decomposition of a wage gap in the browser: two-fold (four
reference-coefficient choices) and three-fold forms, detailed contributions by
variable, bootstrap standard errors, HC1 regressions; upload microdata or use a
simulated sample with a known penalty. Reproduced exactly by an independent
Python implementation.

**Directory:** `wage-gap/`
**Stage:** Active

---

### RCT Planner

Power and minimum detectable effect for individual and cluster designs (ICC,
covariate R², attrition, take-up, multiple outcomes), required sample by
bisection, sensitivity curves; and a seeded, stratified, permuted-block
randomiser for an uploaded baseline with a balance table, joint F-test and a
randomisation record for the pre-analysis plan.

**Directory:** `rct-planner/`
**Stage:** Active

---

### Cost–Benefit Calculator

NPV, BCR, IRR, payback and cost per outcome for cost, benefit and outcome
streams with ranges; Monte Carlo over every input with the probability the
programme pays off; a tornado chart of what drives the answer. Verified to the
cent against an independent calculation.

**Directory:** `cost-benefit/`
**Stage:** Active

---

### Land Acquisition Compensation Calculator

The RFCTLARR Act 2013 formula line by line: section 26 market value, First
Schedule factor, section 29 assets, 100% solatium, the 12% additional amount, and
every Second Schedule rehabilitation entitlement, each with its authority cited;
with a comparison to the 1894 Act.

**Directory:** `land-acquisition/`
**Stage:** Active

---

### Election Expenditure Ledger

A candidate's running account of election expenses against the Rule 90 ceiling:
the section 77 accounting period (nomination to declaration of result), entries by
head with voucher and mode of payment, totals by head, daily burn rate and a
projection to counting day, the section 78 lodging deadline, and flags for cash
payments above the Commission's threshold, spending outside the period and
expenditure by others attributable to the candidate. Stored in the browser only;
CSV in and out for the expenditure observer.

**Directory:** `expense-ledger/`
**Stage:** Active

---

### Manifesto Promise Costing

Each promise as beneficiaries × uptake × unit cost with low, likely and high
values, set against a state's revenue receipts, expenditure, GSDP and fiscal
deficit; a multi-year path against the 3% norm, a 4,000-draw Monte Carlo band on
the ranges, and a tornado ranking the assumptions. The example budget is
illustrative and says so; enter a real one from the state budget or the RBI's
State Finances study.

**Directory:** `promise-costing/`
**Stage:** Active

---

### Statutory Interest Calculator

Interest the way Indian statutes prescribe it, with the provision quoted on the
page: MSMED Act section 16 (three times the RBI bank rate, compounded with monthly
rests from the day after the agreed period, capped at 45 days), CPC section 34 on
decrees (pre-suit, pendente lite, post-decree with the 6% ceiling), Arbitration Act
section 31(7) on awards (post-award at current rate plus two, with the Hyder
Consulting reading and the alternative), the Negotiable Instruments Act limits on a
bounced cheque, and a plain simple-or-compound calculator with the schedule shown.

**Directory:** `statutory-interest/`
**Stage:** Active

---

### A Year of Air

A year of hourly PM2.5, PM10 and NO₂ for any Indian city or coordinate from
Open-Meteo's CAMS-based air quality archive, reduced to what the WHO 2021
guidelines and India's 2009 NAAQS actually ask: annual means, days over each
24-hour limit, the worst and cleanest days, month by month, and the Berkeley Earth
cigarette equivalent. Model estimates, not station readings, and the page says so.

**Directory:** `air-quality/`
**Stage:** Active

---

### Motor Accident Compensation Calculator

Fatal-accident compensation under section 166 of the Motor Vehicles Act, computed
step by step with the authority for each line: Sarla Verma multiplier, Pranay Sethi
future prospects and conventional heads with the 10% triennial enhancement, personal
expense deductions, consortium per dependant (Magma, Somwati, Sameem Begum), interest
under section 171. Where the case law is split it offers both readings and names the
contrary line.

**Directory:** `compensation-calculator/`
**Stage:** Active

---

### Court Petition Translator (Hindi → English)

An AI-powered tool for translating Hindi Supreme Court and High Court petitions into formal legal English.

**Directory:** `court-translator/`
**Serverless function:** `netlify/functions/court-translate.js`
**Stage:** Prototype

**How it works:**
1. Hindi text is split into chunks and translated via [Sarvam AI](https://www.sarvam.ai) (`sarvam-translate:v1`, formal mode)
2. The raw translation is refined by Llama 3.3 70B (via Groq) with a legal-terminology-aware prompt that corrects terms like याचिकाकर्ता → Petitioner, माननीय → Hon'ble, अनुच्छेद → Article, etc.

**Environment variables required:**
- `SARVAM_API_KEY`: from [Sarvam AI dashboard](https://dashboard.sarvam.ai)
- `GROQ_API_KEY`: from [Groq console](https://console.groq.com) (free tier)

**Usage:** Open `court-translator/index.html` in the browser (via Netlify deploy). Paste Hindi petition text and click Translate.

---

### AICC Observers: DCC Readiness Grading

Methodology, data, and grading outputs for evaluating AICC-appointed District Observers on their preparation for District Congress Committee (DCC) membership recommendations. Six components scored: district report submission, proposed names, daily activity reports, supporting documents, potential leaders, non-political influencers.

**Directory:** `aicc_analysis/`
**Stage:** Congress-facing deliverable

**Files:**
- `grading_system.py`: scoring engine (weights, thresholds, joins documented in module docstring + commit history)
- `extract_candidates.py`: pulls candidate-level detail from the AICC portal (requires `AICC_USERNAME`/`AICC_PASSWORD` env vars)
- `consolidated_district_grading.csv`: 592-district A/B/C/D grading
- `candidates_detailed.csv`: 2,413 candidate-level profiles
- `all_timestamps.csv`: 9,104 per-record submission timestamps (authoritative count source)
- `*.json`: raw API extracts (district_reports, proposed_names, attachments, daily_reports, potential_leaders, political_influencers)

---

### Kundendu's Learn & Play

A playful Class 1 CBSE worksheet generator for a young learner, with a structured course running alongside it.

**Free practice** covers English (phonics, reading, grammar), Hindi (वर्ण, शब्द, गिनती, विलोम), Maths (number sense, add/subtract, shapes & patterns), and EVS: 36 activity types in all. Every worksheet is freshly randomised, with three difficulty levels, 4–10 questions per sheet, on-screen answer checking (with confetti for perfect scores), a printable answer key, Word/Google Docs export, and a local practice-history tracker.

**The course** adds what a generator alone cannot: an order. 161 lessons across 39 modules and four paths, each lesson stating its rule in plain language, generating questions scoped to exactly that rule, and opening the next step at 80%.

| Path | Modules | Steps | Sequence |
| --- | --- | --- | --- |
| Phonics & reading | 12 | 58 | Phonemic awareness → `s a t p i n` → CVC word families → the remaining letters → all five short vowels → digraphs (sh ch th ng ck) → blends → magic e → vowel teams → tricky words → suffixes and syllables |
| Maths | 10 | 40 | Numbers 1–9 → zero and ten → adding to 10 → taking away → teen numbers → up to 100 → two-digit sums → shapes and patterns → measuring → money and time |
| हिंदी | 9 | 33 | स्वर → व्यंजन (क–ञ, ट–न, प–ह) → बिना मात्रा के शब्द → आ/इ/ई की मात्रा → उ/ऊ/ए/ऐ → ओ/औ/अनुस्वार → वाक्य, विलोम, गिनती |
| EVS · My world | 8 | 30 | Myself → family and home → food → clothes and seasons → plants → animals → the world around me → people who help us |

Following a synthetic-phonics scope and sequence, the reading path introduces sounds before letters and letters in the order that makes words fastest, and includes eight decodable readers across six stages, each using only the sounds taught by that point, with word-by-word read-along audio. Every lesson also carries a short note for the grown-up explaining the rule and how to teach it.

**Directory:** `kundendu-worksheets/`
**Stage:** Active

Installable PWA: add it to a phone or tablet home screen and it works fully offline after the first visit. Single dependency-free HTML file plus a small service worker; open `kundendu-worksheets/index.html` or visit it on the deployed site.

---

### Agastya's Science Lab

A mobile-first Class VIII science revision app built around Agastya's Sardar Patel Vidyalaya Semester 1 syllabus: microorganisms, health, electricity, forces, pressure in solids and liquids, and the particulate nature of matter. Each chapter has focused multiple-choice practice with immediate explanations, plus a mixed exam mode and private on-device progress tracking.

**Directory:** `agastya-science/`
**Stage:** Active

Installable and offline-capable, with no framework or external dependency. Open `agastya-science/index.html` to use it locally.

---

### WhoGaveTheOrder.in (graduated)

A citizen-led public accountability platform asking one question systematically: when state power is used against citizens, who authorised it?

**Moved to its own repository on 17 August 2026** with its full history, and now lives at [whogavetheorder.netlify.app](https://whogavetheorder.netlify.app). `/whogavetheorder/*` on this site 301s there.

**Stage:** Graduated

Built as a structured evidence archive rather than a campaign site: a six-state evidence grammar applied to every statement, a chain-of-command map that keeps *has authority* and *is evidenced to have authorised this action* as separate claims, an RTI register with a live reply-due clock, and an editorial console whose integrity checks run in public. Its research data is kept in a private repository and is available on request.

---

### Drive PDF Extractor

A small Node + Playwright tool that captures view-only Google Drive PDFs (the kind you can read but not download) and writes them out as a normal PDF.

**Directory:** `tools/drive-pdf-extractor/`
**Stage:** Internal tool

---

### KMUT Report

A Right to Care: Kashmiri Muslim and Other Tribes report (PDF), kept here for direct linking from project pages.

**File:** `docs/a-right-to-care-kmut-report.pdf`

---

## How This Repo Works

Projects in this repo follow a simple lifecycle:

| Stage | Description |
|-------|-------------|
| **Prototype** | Quick build to test feasibility or demonstrate an idea |
| **Active** | In use or being shared with collaborators |
| **Graduated** | Moved to its own dedicated repository |
| **Archived** | No longer maintained; kept for reference |

---

## Repository Structure

```
Experiments/
├── index.html                          # Experiments index page
├── causal-workbench/                   # DiD, event study, synthetic control
├── poverty-inequality/                 # Lorenz curves, FGT, Datt–Ravallion, live PIP
├── survey-audit/                       # field-data quality checks
├── compensation-calculator/            # MV Act fatal-claim awards, step by step
├── women-indicators/                   # NFHS women's indicators, live DHS API
├── heat-exposure/                      # WBGT, safe hours, wages lost, 35-year trend
├── wage-gap/                           # Oaxaca–Blinder decomposition
├── rct-planner/                        # power/MDE and stratified randomiser
├── cost-benefit/                       # NPV/BCR/IRR with Monte Carlo
├── land-acquisition/                   # RFCTLARR 2013 compensation
├── expense-ledger/                     # election expenses against the Rule 90 ceiling
├── promise-costing/                    # manifesto promises against the state budget
├── statutory-interest/                 # MSMED, CPC s.34, Arbitration s.31(7), NI Act
├── air-quality/                        # a year of PM2.5 against WHO and NAAQS, live
├── court-translator/
│   └── index.html                      # Court Petition Translator UI
├── aicc_analysis/
│   ├── grading_system.py               # DCC-readiness scoring engine
│   ├── extract_candidates.py           # AICC portal extractor (needs env vars)
│   ├── consolidated_district_grading.csv
│   ├── candidates_detailed.csv
│   ├── all_timestamps.csv
│   └── *.json                          # raw source extracts
├── kundendu-worksheets/
│   ├── index.html                      # worksheet generator + structured course
│   └── sw.js                           # offline service worker
├── tools/
│   └── drive-pdf-extractor/            # view-only Drive PDF capture
├── netlify/
│   └── functions/
│       └── court-translate.js          # Hindi → English translation API
├── docs/
│   └── a-right-to-care-kmut-report.pdf # KMUT report
├── netlify.toml                        # Netlify build & functions config
├── .env.example                        # Required environment variables
├── LICENSE                             # MIT License
└── README.md                           # This file
```

---

## Tech Stack

All experiments default to the simplest possible stack unless a specific tool requires otherwise:

| Default Stack | Reason |
|---------------|--------|
| Vanilla HTML / CSS / JS | No build step, instant deploy, easy to share |
| Netlify | Zero-config static hosting |

---

## Local Development

```bash
git clone https://github.com/Varnasr/Experiments.git
cd Experiments
open index.html
```

---

## Part of OpenStacks for Change

This repository is part of the [OpenStacks for Change](https://github.com/Varnasr/OpenStacks-for-Change) ecosystem, an open-source toolkit for development research, evaluation, and program design.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
