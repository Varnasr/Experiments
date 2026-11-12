#!/usr/bin/env python3
"""Sample counts and hours behind the PLFS 2024 wages, by state and sex.

    python3 care-valuation/tools/plfs_cells.py /path/to/cperv1.csv > care-valuation/data/plfs_cells.csv

Reads the person-level file of the Periodic Labour Force Survey for January to
December 2024 (cperv1, from catalogue entry 254 at microdata.gov.in, converted
to CSV with MoSPI's own converter) and writes, for each state and sex:

  reg_n      regular wage or salaried employees in current weekly status
             (codes 31, 71, 72) who reported earnings
  reg_hours  their average hours of work in the reference week, all activities
  cas_n      people with at least one day of casual labour other than public
             works (code 51) in the reference week
  cas_hours  average hours on such a day

The wages themselves stay as MoSPI publishes them (plfs6.csv and plfs7.csv).
This script recomputes them only to check that it is reading the same people:
it stops unless every regular wage is within 0.1% of the published figure and
the all-India casual wages are within 0.1%. State casual wages are not held to
that, because MoSPI's averaging for small cells differs slightly; the largest
gap is 5% in a cell of 21 workers.

Weights follow the README of the release: MULT / (NO_QTR x 100) when the
sub-sample count equals the combined count, and MULT / (NO_QTR x 200)
otherwise. The unit-level file is not in this repository.
"""
import csv
import os
import sys

import numpy as np
import pandas as pd

STATES = {1: 'Jammu & Kashmir', 2: 'Himachal Pradesh', 3: 'Punjab', 4: 'Chandigarh', 5: 'Uttarakhand', 6: 'Haryana',
          7: 'Delhi', 8: 'Rajasthan', 9: 'Uttar Pradesh', 10: 'Bihar', 11: 'Sikkim', 12: 'Arunachal Pradesh',
          13: 'Nagaland', 14: 'Manipur', 15: 'Mizoram', 16: 'Tripura', 17: 'Meghalaya', 18: 'Assam', 19: 'West Bengal',
          20: 'Jharkhand', 21: 'Odisha', 22: 'Chhattisgarh', 23: 'Madhya Pradesh', 24: 'Gujarat',
          25: 'Dadra & Nagar Haveli & Daman & Diu', 27: 'Maharashtra', 28: 'Andhra Pradesh', 29: 'Karnataka', 30: 'Goa',
          31: 'Lakshadweep', 32: 'Kerala', 33: 'Tamil Nadu', 34: 'Puducherry', 35: 'Andaman & Nicobar Islands',
          36: 'Telangana', 37: 'Ladakh'}
DAYS = [f'Day{d}' for d in range(1, 8)]
NSS, NSC, MULT, NO_QTR = ('Ns_Count_Sector_Stratum_Substratum_Subsample', 'Ns_Count_Sector_Stratum_Substratum',
                          'Subsample_Multiplier', 'State_Sector_Stratum_Substra')


def main(path):
    use = ['State_UT_Code', 'Sex', 'CWS_Status_Code', 'CWS_Earnings_Salaried', NSS, NSC, MULT, NO_QTR]
    for d in DAYS:
        use += [f'{d}_Act{a}_{k}' for a in (1, 2) for k in ('Status_Code', 'Hours', 'Wage')] + [f'{d}_Total_Hours']
    df = pd.read_csv(path, usecols=use, dtype=str, keep_default_na=False)
    for c in df.columns:
        df[c] = pd.to_numeric(df[c].str.strip(), errors='coerce')
    df['w'] = np.where(df[NSS] == df[NSC], df[MULT] / (df[NO_QTR] * 100), df[MULT] / (df[NO_QTR] * 200))
    df['week'] = sum(df[f'{d}_Total_Hours'].fillna(0) for d in DAYS)
    wage, hours, n_days = np.zeros(len(df)), np.zeros(len(df)), np.zeros(len(df))
    for d in DAYS:
        for a in (1, 2):
            m = (df[f'{d}_Act{a}_Status_Code'] == 51).values
            wage += np.where(m, df[f'{d}_Act{a}_Wage'].fillna(0), 0)
            hours += np.where(m, df[f'{d}_Act{a}_Hours'].fillna(0), 0)
            n_days += m
    df['cw'], df['ch'], df['cd'] = wage, hours, n_days
    reg = df[df.CWS_Status_Code.isin([31, 71, 72]) & (df.CWS_Earnings_Salaried > 0)]
    cas = df[df.cd > 0]
    here = os.path.dirname(os.path.abspath(__file__))
    pub = {k: {r['state']: r for r in csv.DictReader(open(os.path.join(here, '..', 'data', f)))}
           for k, f in (('reg', 'plfs6.csv'), ('cas', 'plfs7.csv'))}
    rows = []
    for code, name in [(0, 'All India')] + sorted(STATES.items(), key=lambda x: x[1]):
        R = reg if code == 0 else reg[reg.State_UT_Code == code]
        C = cas if code == 0 else cas[cas.State_UT_Code == code]
        for sex in ('male', 'female', 'person'):
            r = R if sex == 'person' else R[R.Sex == (1 if sex == 'male' else 2)]
            c = C if sex == 'person' else C[C.Sex == (1 if sex == 'male' else 2)]
            if len(r):
                got, want = (r.CWS_Earnings_Salaried * r.w).sum() / r.w.sum(), float(pub['reg'][name][sex])
                if abs(got / want - 1) > 0.001:
                    sys.exit(f'{name} {sex}: regular wage {got:.2f} computed, {want} published')
            if len(c) and code == 0:
                got, want = (c.cw * c.w).sum() / (c.cd * c.w).sum(), float(pub['cas'][name][sex])
                if abs(got / want - 1) > 0.001:
                    sys.exit(f'{name} {sex}: casual wage {got:.2f} computed, {want} published')
            rows.append([name, sex, len(r), f'{(r.week * r.w).sum() / r.w.sum():.1f}' if len(r) else '',
                         len(c), f'{(c.ch * c.w).sum() / (c.cd * c.w).sum():.2f}' if len(c) else ''])
    out = csv.writer(sys.stdout, lineterminator='\n')
    out.writerow(['state', 'sex', 'reg_n', 'reg_hours', 'cas_n', 'cas_hours'])
    out.writerows(rows)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
