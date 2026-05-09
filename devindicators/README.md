# India Development Indicators

Live at **https://devindicators.impactmojo.in/**

Interactive dashboard tracking India's progress across economic, health,
education, infrastructure and environmental indicators. Pulls live data
from the World Bank Open Data API; HDI / state HDI / infrastructure
spending are static (no free public API).

## Stack

- Vanilla HTML/CSS/JS (no build step)
- Chart.js 4.4.1 from jsDelivr
- Iconify icons CDN
- Amaranth + Inter + JetBrains Mono via Google Fonts

## Features

- Live World Bank API: GDP, GDP growth, life expectancy, infant mortality,
  literacy, electricity, internet, CO₂, unemployment, sector contribution
- KPI cards with iconified visual treatment
- Mix of chart types: line, multi-line, bar, horizontal bar, doughnut
- Policy-milestone timeline (2014–2024)
- Year-range selector, light/dark theme (with `prefers-color-scheme` default),
  CSV/PNG export per chart, permalink, print stylesheet, sessionStorage cache
