# IHDS-I (2004–05)

**India Human Development Survey, Round I**

- **Source:** ICPSR / DSDR — Study 22626
- **URL:** https://www.icpsr.umich.edu/web/DSDR/studies/22626
- **Producers:** University of Maryland & National Council of Applied Economic Research (NCAER), New Delhi
- **Coverage:** ~41,554 households, ~215,754 individuals across 1,503 villages and 971 urban blocks in 33 states and union territories
- **Reference period:** Fieldwork 2004–05
- **Access:** Free, requires ICPSR / MyData account and acceptance of the Public-Use terms

## Access procedure

1. Create or sign into an ICPSR account: https://www.icpsr.umich.edu/rpxweb/icpsr/login
2. Open Study 22626 and download the bundle in your preferred format (Stata, SAS, SPSS, R, or delimited).
3. Place the extracted files under `data/` (see structure below). Do **not** commit the data — the `.gitignore` excludes it.

## Suggested layout

```
ihds-i-2004-05/
├── README.md                    # this file
├── data/                        # raw downloaded files (gitignored)
│   ├── DS0001_Individual/
│   ├── DS0002_Household/
│   ├── DS0003_Eligible_Women/
│   ├── DS0004_Birth_History/
│   ├── DS0005_Medical_Staff/
│   ├── DS0006_Medical_Facilities/
│   ├── DS0007_NonMedical_Staff/
│   ├── DS0008_School/
│   ├── DS0009_Village/
│   ├── DS0010_Wage_and_Salary/
│   └── DS0012_HH_Identifiers/
├── docs/                        # codebooks, questionnaires (gitignored)
└── analysis/                    # scripts and outputs (commit these)
```

## Linking IHDS-I and IHDS-II

The household identifiers `IDHH` (and individual `IDPERSON`) are designed to be matched across rounds. Approximately 83% of IHDS-I households were re-interviewed in IHDS-II.

## Citation

Desai, Sonalde, Reeve Vanneman, and National Council of Applied Economic Research, New Delhi. *India Human Development Survey (IHDS), 2005.* Inter-university Consortium for Political and Social Research [distributor], 2018-08-08. https://doi.org/10.3886/ICPSR22626.v12
