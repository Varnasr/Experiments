# Heat and Outdoor Work

Live at **https://varnasr-experiments.netlify.app/heat-exposure/**

Hour-by-hour heat stress for outdoor workers from live weather, for any place in
India, with the labour and wage consequences made explicit.

## What it computes

- **WBGT each hour** from Open-Meteo's forecast (temperature, relative humidity,
  solar radiation). In the sun, the Australian Bureau of Meteorology approximation
  WBGT = 0.567·T + 0.393·e + 3.94 with e = (RH/100)·6.105·exp(17.27·T/(237.7+T)) in
  hPa, which assumes moderately high radiation and light wind. In shade, and in
  hours with little radiation, 0.7·T_w + 0.3·T with the natural wet-bulb from
  Stull's (2011) formula.
- **Permitted work each hour** from the ACGIH heat-stress screening criteria as
  reproduced by the Canadian Centre for Occupational Health and Safety: threshold
  limit values for acclimatised workers and action limits for unacclimatised
  workers, by workload (light, moderate, heavy, very heavy) and by the share of
  each hour spent working (75–100, 50–75, 25–50, 0–25%). The page assigns each
  hour the largest allocation the WBGT still permits.
- **Hours and wages lost** over the chosen workday, for a number of workers at a
  daily wage you enter, with the full-work windows listed per day so the cheapest
  intervention, an earlier start, can be tried immediately.
- **Since 1991**: from Open-Meteo's ERA5-based archive, the count of March–June
  days each year whose peak WBGT exceeded the continuous-work limit and the
  almost-no-work limit, with an OLS trend in days per decade and its 95% interval.

## Why it is framed around women

Outdoor work in an Indian summer falls disproportionately on women: the majority
of MGNREGA person-days, much of the field labour in agriculture, and a large
share of brick-kiln and construction work. Heat that shortens a safe working day
shortens their earnings first.

## Caveats

- The ABM approximation overstates WBGT at night and in shade; the page switches
  formula for those hours but the daytime sun estimate is a screening value, not a
  measurement.
- Reanalysis cells are roughly 10 km, so a city's series is an area average and
  understates the urban heat island.
- The screening criteria are for healthy, hydrated, lightly clothed adults. They
  do not cover pregnancy, chronic illness or protective clothing.

## Verification

WBGT for 35 °C and 50% relative humidity computes to 34.8 °C, matching the
Bureau of Meteorology's published tables; the allocation function returns 75%
for moderate acclimatised work at 29 °C, as the ACGIH table specifies. Tested
headlessly against recorded forecast and archive responses for Delhi.

No dependencies. One HTML file. MIT.
