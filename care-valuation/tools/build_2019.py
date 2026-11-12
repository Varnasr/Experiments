"""Writes care-valuation/data/care-2019.js from the three files it rests on.

    python3 care-valuation/tools/build_2019.py

  data/tus2019.csv     minutes and relative standard errors, from tus2019_report.py
  data/plfs_2019.csv   wages, hours and sample counts, from plfs_2019.py
  ../rupee-converter/data/cpi2012.csv   the all-India CPI, for the price ratio

The standard error of a minutes figure is its relative standard error times
the figure, which the report prints in whole minutes. The test compares the
.js file with the three files, so a hand edit to one and not the other fails.
"""
import csv, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
data = lambda *p: os.path.join(HERE, '..', 'data', *p)
MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

states = {}
for r in csv.DictReader(open(data('tus2019.csv'))):
    dom, care = int(r['domestic']), int(r['care'])
    states.setdefault(r['state'], {'min': {}, 'regular': {}, 'casual': {}, 'cells': {}})['min'][f"{r['age']}|{r['sex']}"] = [
        dom, care, round(dom * float(r['rse_domestic']) / 100, 1), round(care * float(r['rse_care']) / 100, 1), int(r['sample_persons'])]
num = lambda v: float(v) if v != '' else None
for r in csv.DictReader(open(data('plfs_2019.csv'))):
    s = states[r['state']]
    s['regular'][r['sex']], s['casual'][r['sex']] = num(r['reg_wage']), num(r['cas_wage'])
    s['cells'][r['sex']] = [int(r['reg_n']), num(r['reg_hours']) or 0, int(r['cas_n']), num(r['cas_hours']) or 0]
cpi = {r['year']: round(sum(float(r[m]) for m in MONTHS) / 12, 2) for r in csv.DictReader(open(os.path.join(HERE, '..', '..', 'rupee-converter', 'data', 'cpi2012.csv'))) if r['year'] in ('2019', '2024')}
out = {
    'retrieved': '2026-11-12',
    'tus': 'Time Use in India-2019, National Statistical Office (2020): Statement 7.1 and Table (3RSE)_State, rural and urban combined',
    'plfs': 'Periodic Labour Force Survey, January to December 2019, computed from the unit-level data of the 2018-19 and 2019-20 rounds, current weekly status, rural and urban combined',
    'cpi': cpi,
    'states': states,
}
with open(data('care-2019.js'), 'w') as f:
    f.write('// Written by tools/build_2019.py from tus2019.csv, plfs_2019.csv and the CPI series in rupee-converter. Do not edit by hand.\n')
    f.write('// Same shape as care-data.js. min: [domestic, care, se domestic, se care, persons in sample]. cells: [regular workers in sample, their weekly hours, casual workers in sample, hours on a casual day].\n')
    f.write('window.CARE_DATA_2019=' + json.dumps(out, separators=(',', ':'), ensure_ascii=False) + ';\n')
print('wrote care-2019.js:', len(states), 'places; CPI', cpi)
