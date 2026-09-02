# A Year of Air

Live at **https://varnasr-experiments.netlify.app/air-quality/**

A year of hourly air quality for any Indian city (24 pre-set) or any coordinate,
fetched live from Open-Meteo's air quality API and reduced to the questions the
standards ask.

## What it computes

- Daily means of PM2.5, PM10 and NO₂ from the hourly series (daily maximum for
  ozone), in Indian Standard Time.
- Annual means against the WHO 2021 guidelines (PM2.5 5, PM10 15, NO₂ 10 µg/m³)
  and India's NAAQS 2009 (40, 60, 40).
- Days over each 24-hour limit (WHO 15 / 45 / 25; India 60 / 100 / 80), the worst
  and cleanest days, and a month-by-month table and chart.
- The Berkeley Earth cigarette equivalent: the sum of daily PM2.5 means divided
  by 22, a communication device rather than a dose-response model.

## Data

`https://air-quality-api.open-meteo.com/v1/air-quality` with hourly `pm2_5`,
`pm10`, `nitrogen_dioxide`, `ozone`, `timezone=Asia/Kolkata` and a start and end
date. The archive runs from August 2022. The values are Copernicus CAMS model
re-analyses and forecasts on a grid of roughly 11 km: smoother than a CPCB monitor
beside a road, and not a substitute for one. The page is tolerant of a series the
API does not return (the table then says "not returned").

## Verification

Against a recorded Delhi year (1 September 2025 to 31 August 2026, 8,760 hourly
rows) the page and an independent Python reduction agree: 365 days, PM2.5 annual
mean 86.2 µg/m³, 260 days over India's 24-hour limit, 365 over the WHO
guideline, 1,431 cigarette equivalents.

No dependencies. One HTML file. MIT.
