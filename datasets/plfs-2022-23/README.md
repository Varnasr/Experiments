# PLFS 2022–23

**Periodic Labour Force Survey — unit-level data**

- **Source:** Ministry of Statistics and Programme Implementation (MoSPI), Government of India
- **URL:** https://mospi.gov.in/web/mospi/download-tables-data
- **Producer:** National Statistical Office (NSO), MoSPI
- **Coverage:** ~101,655 households and ~419,512 individuals across rural and urban India; rotational panel design with first-stage units (FSUs) revisited
- **Reference period:** July 2022 – June 2023 (annual report). Quarterly bulletins for urban areas in CWS (Current Weekly Status) are released separately.
- **Access:** Free, requires registration on the MoSPI Microdata Portal (https://microdata.gov.in)

## Access procedure

1. Register at https://microdata.gov.in/nada43/index.php/auth/register/ and verify email.
2. Search for "Periodic Labour Force Survey 2022-23" or browse the NSSO catalog.
3. Request access to the unit-level data — approval is typically immediate after agreeing to the terms of use.
4. Download the bundle, which includes:
   - **First Visit** (households visited in their first quarter): person-level and household-level files
   - **Revisit** files (urban households revisited in subsequent quarters under the rotational panel)
   - Layout / record-layout files describing fixed-width record positions
   - Survey instruments and the *Instructions to Field Staff*
5. Place the extracted files under `data/` (see structure below). Do **not** commit the data — the `.gitignore` excludes it.

## Suggested layout

```
plfs-2022-23/
├── README.md                    # this file
├── data/                        # raw downloaded files (gitignored)
│   ├── first-visit/
│   │   ├── HHV1.txt             # household, first visit
│   │   └── PERV1.txt            # person, first visit
│   ├── revisit/
│   │   ├── HHV2.txt             # household, revisit (urban panel)
│   │   └── PERV2.txt            # person, revisit (urban panel)
│   └── layouts/                 # record-layout files
├── docs/                        # questionnaire, instructions, report (gitignored)
└── analysis/                    # scripts and outputs (commit these)
```

## Notes on use

- Files are typically released as fixed-width text. The layout files give column positions; readers in Stata (`infix`), R (`read.fwf`), or Python (`pandas.read_fwf`) work directly off them.
- Multiplier (weight) variables differ between annual and quarterly estimates — check the report's *Note on Sample Design and Estimation Procedure* before computing aggregates.
- Activity status is reported under three reference frameworks: **US** (Usual Status, 365 days), **PS+SS** (Principal + Subsidiary), and **CWS** (Current Weekly Status, last 7 days). Pick the one that matches your question and document it.

## Citation

National Statistical Office, Ministry of Statistics and Programme Implementation, Government of India. *Annual Report, Periodic Labour Force Survey (PLFS), July 2022 – June 2023.* New Delhi: MoSPI, 2023.
