# NFHS-5 / India Standard DHS (2019–21)

**National Family Health Survey, Round 5**

- **Source:** The DHS Program (USAID)
- **URL:** https://dhsprogram.com/data/dataset/India_Standard-DHS_2020.cfm
- **Implementing agency in India:** International Institute for Population Sciences (IIPS), Mumbai, on behalf of MoHFW
- **Coverage:** ~636,699 households, ~724,115 women aged 15–49, ~101,839 men aged 15–54 across all 28 states and 8 union territories (district-representative)
- **Reference period:** Two phases — Phase I: June 2019 – Jan 2020; Phase II: Jan 2020 – April 2021
- **Access:** Free, requires DHS Program account, project description, and approval (typically 1–2 business days)

## Access procedure

1. Register at https://dhsprogram.com/data/new-user-registration.cfm and submit a short research-project description.
2. Once approved, request access to the **India Standard DHS 2020** dataset for the file types you need:
   - Household Recode (HR)
   - Individual / Women's Recode (IR)
   - Men's Recode (MR)
   - Children's Recode (KR)
   - Births Recode (BR)
   - Couples' Recode (CR)
   - HIV Test Results (AR), if applicable
   - Geographic Data (GE) — separate request, additional approval required
3. Download the Stata (`.DTA`), SPSS (`.SAV`), SAS (`.SAS7BDAT`), or flat (`.DAT`) versions.
4. Place the extracted files under `data/` (see structure below). Do **not** commit the data — the `.gitignore` excludes it.

## Suggested layout

```
nfhs-5-2019-21/
├── README.md                    # this file
├── data/                        # raw downloaded files (gitignored)
│   ├── IAHR7E/                  # Household Recode
│   ├── IAIR7E/                  # Individual (Women) Recode
│   ├── IAMR7E/                  # Men's Recode
│   ├── IAKR7E/                  # Children's Recode
│   ├── IABR7E/                  # Births Recode
│   ├── IACR7E/                  # Couples' Recode
│   └── IAGE7EFL/                # GPS / Geographic data (restricted)
├── docs/                        # DHS recode manual, questionnaires (gitignored)
└── analysis/                    # scripts and outputs (commit these)
```

The standard file naming pattern is `IA<recode><phase><release>FL.<ext>` — e.g. `IAIR7EFL.DTA` is India, Individual Recode, phase 7 (NFHS-5), release E, flat-file Stata.

## Citation

International Institute for Population Sciences (IIPS) and ICF. *National Family Health Survey (NFHS-5), 2019–21: India.* Mumbai: IIPS, 2021. Available from https://dhsprogram.com.
