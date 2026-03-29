# The Real Middle — India Income Reality Check

[![Website](https://img.shields.io/badge/Website-therealmiddle.netlify.app-7C3AED)](https://therealmiddle.netlify.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/Varnasr/The-Real-Middle)](https://github.com/Varnasr/The-Real-Middle/commits/main)
[![Part of ImpactMojo](https://img.shields.io/badge/Part%20of-ImpactMojo-orange)](https://www.impactmojo.in)

**Think you're middle class? Discover where you really stand in India's income distribution.**

An interactive tool that uses real government data to reveal the gap between perceived and actual economic position in India — built for the [ImpactMojo](https://www.impactmojo.in) platform.

**Live at [therealmiddle.netlify.app](https://therealmiddle.netlify.app)**

---

## About

Most upper-income Indians believe they're "middle class" when they're actually in the top 10% — or even the top 1% — of earners. *The Real Middle* uses real data from the PLFS, NSSO, and academic research to show users exactly where they stand.

This is not commentary. It is data.

---

## Features

| Feature | Description |
|---------|-------------|
| **Income Reality Check** | Enter your household income and see your exact percentile in India's distribution |
| **Budget Challenge** | Try to survive on India's median income (₹9,000/month) — allocate across rent, food, health, education |
| **Healthcare Cost Analysis** | How different income levels experience the same medical emergency |
| **Education Barriers** | The real cost of education at each income decile |
| **Rural vs Urban Comparison** | Purchasing power and living standards across geographies |
| **Poverty Cycle Analysis** | Intergenerational poverty trap modelling |
| **Academic Sources** | Full transparency — every data point cites peer-reviewed research or official surveys |
| **Responsive Design** | Built with React + Tailwind — works on all screen sizes |

---

## Data Sources

| Source | Indicators Used |
|--------|----------------|
| [PLFS (Periodic Labour Force Survey)](https://mospi.gov.in/web/plfs) | Income distribution, employment, wages |
| [NSSO Household Surveys](https://mospi.gov.in/nsso) | Consumption, expenditure, poverty |
| [World Inequality Database (WID)](https://wid.world/country/india/) | Top income shares, wealth concentration |
| [NITI Aayog Multidimensional Poverty Index](https://niti.gov.in/mpi) | Poverty headcounts by state |
| [RBI Household Finance Committee](https://rbidocs.rbi.org.in) | Wealth distribution data |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React 19 | Component-based UI |
| Charts | Recharts 3 | Income distribution visualisations |
| Icons | Lucide React | UI iconography |
| Styling | Tailwind CSS 4 | Utility-first responsive design |
| Build | Vite 6 | Fast development and build tooling |
| Hosting | Netlify | Auto-deploy from GitHub |

---

## Project Structure

```
The-Real-Middle/
├── index.html              # HTML entry point
├── vite.config.js          # Vite build configuration
├── package.json            # Dependencies and scripts
├── src/                    # React source code
│   ├── App.jsx             # Root component
│   ├── components/         # Feature components (calculator, budget, charts)
│   └── data/               # Income distribution data and survey constants
├── public/                 # Static assets
├── CITATION.cff            # Citation metadata
├── LICENSE
└── README.md
```

---

## Local Development

```bash
git clone https://github.com/Varnasr/The-Real-Middle.git
cd The-Real-Middle

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Part of the ImpactMojo Ecosystem

*The Real Middle* is a standalone interactive tool within [ImpactMojo](https://www.impactmojo.in)'s suite of economics education resources.

**Related repositories:**
- [ImpactMojo](https://github.com/Varnasr/ImpactMojo) — Main platform
- [someperspective](https://github.com/Varnasr/someperspective) — India's political economy 2004–2025
- [india-dev-indicators](https://github.com/Varnasr/india-dev-indicators) — GDP, HDI, and development indicators dashboard

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Citation

```
Sri Raman, V. (2025). The Real Middle: India Income Reality Check [Software].
ImpactMojo. https://github.com/Varnasr/The-Real-Middle
```
