# India Development Indicators Dashboard

[![Netlify Status](https://api.netlify.com/api/v1/badges/placeholder/deploy-status)](https://india-dev-indicators.netlify.app)
[![Website](https://img.shields.io/badge/Website-Live-7C3AED)](https://varnasr.github.io/india-dev-indicators)
[![License: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/Varnasr/india-dev-indicators)](https://github.com/Varnasr/india-dev-indicators/commits/main)
[![Part of ImpactMojo](https://img.shields.io/badge/Part%20of-ImpactMojo-orange)](https://www.impactmojo.in)

**Interactive visualisations of India's development story — GDP, HDI, literacy, and infrastructure spending in one place.**

An ImpactMojo live project. Built with Chart.js. Zero dependencies, zero build step.

---

## About

India Development Indicators is a single-page interactive dashboard that visualises key development metrics for India over time. It is designed for researchers, educators, policymakers, and students who need quick, reliable visual access to development data without navigating complex portals.

**Live at [varnasr.github.io/india-dev-indicators](https://varnasr.github.io/india-dev-indicators)**

---

## Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **GDP Trends** | Annual GDP and GDP per capita growth (nominal and PPP-adjusted) |
| 2 | **Human Development Index** | India's HDI trajectory vs South Asian and global averages |
| 3 | **Literacy Rates** | National, gender-disaggregated, and state-level literacy trends |
| 4 | **Infrastructure Spending** | Government expenditure on roads, railways, energy, and digital infrastructure |
| 5 | **Interactive Charts** | Chart.js-powered visualisations with tooltips, zoom, and hover detail |
| 6 | **Responsive Design** | Works across desktop, tablet, and mobile browsers |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vanilla HTML / CSS / JavaScript | Zero-dependency single-page dashboard |
| Charts | Chart.js | All interactive data visualisations |
| Analytics | Google Analytics (gtag.js) | Usage tracking |
| Hosting | GitHub Pages / Netlify | Static site deployment |

---

## Data Sources

| Indicator | Source |
|-----------|--------|
| GDP / National Accounts | [World Bank Open Data](https://data.worldbank.org) |
| Human Development Index | [UNDP Human Development Reports](https://hdr.undp.org) |
| Literacy Rates | [Census of India](https://censusindia.gov.in) / NFHS |
| Infrastructure Spending | [Union Budget Documents](https://indiabudget.gov.in) |

---

## Project Structure

```
india-dev-indicators/
├── index.html       # Complete single-page dashboard (HTML + CSS + JS inline)
└── README.md        # This file
```

---

## Local Development

No build step required. Simply open the file in a browser:

```bash
git clone https://github.com/Varnasr/india-dev-indicators.git
cd india-dev-indicators

# Open directly
open index.html

# Or serve locally
python3 -m http.server 8000
```

---

## Part of the ImpactMojo Ecosystem

This dashboard is a live project within [ImpactMojo](https://www.impactmojo.in) — a free development education platform for social impact professionals across South Asia.

**Related repositories:**
- [ImpactMojo](https://github.com/Varnasr/ImpactMojo) — The main platform
- [sdg-progress-tracker](https://github.com/Varnasr/sdg-progress-tracker) — India's SDG progress across all 17 goals
- [someperspective](https://github.com/Varnasr/someperspective) — India's political economy 2004–2025
- [INDIA-DATA](https://github.com/Varnasr/INDIA-DATA) — Bihar electoral roll analysis

---

## License

**Code:** MIT License — see [LICENSE](LICENSE)

---

## Contact

- **Platform:** [impactmojo.in](https://www.impactmojo.in)
- **GitHub:** [github.com/Varnasr](https://github.com/Varnasr)
