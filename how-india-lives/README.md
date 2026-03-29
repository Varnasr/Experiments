# How India Lives

**205 state-level choropleth maps showcasing India's diversity across demography, health, gender, economy, education, environment, and more.**

A visual atlas for understanding why India's states are different — and why it matters for policy. Part of [ImpactMojo](https://impactmojo.in).

## What This Is

India is not one country when it comes to development outcomes. Kerala's life expectancy (77 years) exceeds Chhattisgarh's (64) by 13 years. Bihar's female labour force participation is 10x lower than Himachal Pradesh's. Rajasthan is 60% vegetarian; Bengal is under 5%.

These 205 maps make that diversity visible — one indicator at a time, across all 28 states and 8 union territories.

## Themes

| # | Theme | Maps |
|---|-------|------|
| 1 | Demography | 13 |
| 2 | Food & Culture | 15 |
| 3 | Economy | 42 |
| 4 | Health | 30 |
| 5 | Gender | 23 |
| 6 | Caste | 10 |
| 7 | Religion | 10 |
| 8 | Education | 13 |
| 9 | Environment | 15 |
| 10 | Democracy | 13 |
| 11 | Social Protection | 10 |
| 12 | Reproductive Choices | 11 |

## Data Sources

- **NFHS-5 (2019-21)** — ~80 maps
- **Census of India (2011)** — ~45 maps
- **PLFS (2022-23)** — Employment and labour
- **NCRB Crime in India (2022)** — Crime statistics
- **NHA, HCES, SRS** — Health expenditure, consumption, mortality
- **Government Dashboards** — MGNREGA, JJM, PMFBY, UDISE+, DPIIT
- **Other** — IMD, CGWB, FSI, ECI, ADR, TRAI, RBI, NASA VIIRS, Pew Research, and more

Full methodology: [methodology.html](methodology.html)

## Structure

```
├── index.html          # Main gallery page
├── methodology.html    # Data sources, quality flags, limitations
├── data/
│   └── maps.json       # Catalog of all 205 maps with metadata
└── maps/
    ├── demography/     # 13 maps
    ├── food-and-culture/
    ├── economy/
    ├── health/
    ├── gender/
    ├── caste/
    ├── religion/
    ├── education/
    ├── environment/
    ├── democracy/
    ├── social-protection/
    └── reproductive-choices/
```

## How Maps Were Made

Rendered programmatically with Python 3 + GeoPandas + Matplotlib using Natural Earth 10m shapefiles. Each map includes:
- State-level choropleth with two-letter abbreviations
- Northeast India inset panel
- Shock statistic (red box, top right)
- National average marker on colourbar
- Source and year citation

## Credits

Data work by **Varna** (MMSF Cohort 1) · Sangam Nirmaan Parichay

Part of [ImpactMojo](https://impactmojo.in) — Free development education for South Asia

## License

Maps are pedagogical tools designed for facilitated discussion. For policy or academic citation, consult the underlying source publications directly. Data sourced from official government publications.
