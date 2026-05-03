# IHDS-II (2011–12)

**India Human Development Survey, Round II**

- **Source:** ICPSR / DSDR — Study 36151
- **URL:** https://www.icpsr.umich.edu/web/DSDR/studies/36151
- **Producers:** University of Maryland & National Council of Applied Economic Research (NCAER), New Delhi
- **Coverage:** ~42,152 households, ~204,569 individuals, 1,503 villages and 971 urban neighbourhoods across 33 states and union territories
- **Reference period:** Fieldwork 2011–12 (re-interview of ~83% of IHDS-I households plus a refresh sample)
- **Access:** Free, requires ICPSR / MyData account and acceptance of the Restricted-Use / Public-Use terms

## Access procedure

1. Create or sign into an ICPSR account: https://www.icpsr.umich.edu/rpxweb/icpsr/login
2. Open Study 36151 and download the bundle in your preferred format (Stata, SAS, SPSS, R, or delimited).
3. Place the extracted files under `data/` (see structure below). Do **not** commit the data — the `.gitignore` excludes it.

## Suggested layout

```
ihds-ii-2011-12/
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
│   └── DS0011_Tracking/
├── docs/                        # codebooks, questionnaires (gitignored)
└── analysis/                    # scripts and outputs (commit these)
```

## Citation

Desai, Sonalde, and Reeve Vanneman. *India Human Development Survey-II (IHDS-II), 2011–12.* Inter-university Consortium for Political and Social Research [distributor], 2018-08-08. https://doi.org/10.3886/ICPSR36151.v6
