"""Wages, hours and sample counts for calendar 2019, from PLFS unit-level data.

    python3 care-valuation/tools/plfs_2019.py PerV1_2018-19.csv PerRV_2018-19.csv PERFV_2019-20.csv PERRV_2019-20.csv

The Periodic Labour Force Survey ran July to June until 2024, so calendar 2019
is the last two quarters of the 2018-19 round (Q7, Q8) and the first two of
the 2019-20 round (Q1, Q2). Taking the year this way matches the Time Use
Survey's January to December 2019 and keeps April to June 2020, the lockdown
quarter, out of it.

For each State/UT and sex, and for both sexes together, this writes to
care-valuation/data/plfs_2019.csv:

  reg_wage   average earnings in the preceding calendar month of regular
             wage or salaried employees (current weekly status 31, 71, 72,
             earnings above zero), rupees
  reg_hours  the hours those employees worked in the survey week
  cas_wage   average earnings per day of casual labour other than public
             works (status 51 on a day of the survey week), rupees
  cas_hours  the hours worked on such a day
  reg_n, cas_n  the people in the sample behind each

Weights: MULT / 100 where NSS equals NSC and MULT / 200 otherwise. Urban
households are visited four times and every visit is used, as in MoSPI's
quarterly figures, so an urban record carries a quarter of its weight.
No_Qtr is not used, because each quarter is taken whole.

The script stops without writing unless its all-India quarterly figures are
within 0.2% of the regular wages MoSPI publishes and 2% of the casual wages.
It reproduced the regular wages to 0.15% and the casual wages to 1.7%; the
casual gap is largest for women in July to September 2019 and its cause was
not found. The 2024 page uses MoSPI's published wages; for 2019 the published
figures are by quarter and not by calendar year, so these are computed.

The four files are row-level survey data and must not be added to the
repository.
"""
import csv, os, sys
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'plfs_2019.csv')
# MoSPI data service, PLFS indicators 6 and 7, all-India, rural + urban, read on 12 November 2026: (male, female, person)
PUBLISHED = {
    ('Q7', 'reg'): (16842.2, 12285.3, 15827.2), ('Q8', 'reg'): (17161.0, 12850.5, 16196.2),
    ('Q1', 'reg'): (17146.4, 14095.0, 16418.2), ('Q2', 'reg'): (17231.2, 12769.2, 16135.8),
    ('Q7', 'cas'): (299.1, 193.4, 278.6), ('Q8', 'cas'): (309.8, 204.5, 290.7),
    ('Q1', 'cas'): (310.9, 190.4, 281.9), ('Q2', 'cas'): (319.0, 197.2, 287.4),
}
TOLERANCE = {'reg': 0.002, 'cas': 0.02}
STATES = {1: 'Jammu & Kashmir', 2: 'Himachal Pradesh', 3: 'Punjab', 4: 'Chandigarh', 5: 'Uttarakhand', 6: 'Haryana', 7: 'Delhi',
          8: 'Rajasthan', 9: 'Uttar Pradesh', 10: 'Bihar', 11: 'Sikkim', 12: 'Arunachal Pradesh', 13: 'Nagaland', 14: 'Manipur',
          15: 'Mizoram', 16: 'Tripura', 17: 'Meghalaya', 18: 'Assam', 19: 'West Bengal', 20: 'Jharkhand', 21: 'Odisha',
          22: 'Chhattisgarh', 23: 'Madhya Pradesh', 24: 'Gujarat', 25: 'Daman & Diu', 26: 'Dadra & Nagar Haveli', 27: 'Maharashtra',
          28: 'Andhra Pradesh', 29: 'Karnataka', 30: 'Goa', 31: 'Lakshadweep', 32: 'Kerala', 33: 'Tamil Nadu', 34: 'Puducherry',
          35: 'Andaman & Nicobar Islands', 36: 'Telangana'}

def load(path, quarters, sfx):
    hdr = pd.read_csv(path, nrows=0).columns.tolist()
    i, end = hdr.index, len(hdr)
    for name, at in ((f'b6q5_per_{sfx}', end - 9), (f'b6q9_per_{sfx}', end - 6), (f'MULT_per_{sfx}', end - 2)):
        if hdr[at] != name: sys.exit(f'{path}: expected {name} at column {at}, found {hdr[at]}')
    cols = {'q': i(f'quarter_per_{sfx}'), 'sector': i(f'b1q3_per_{sfx}'), 'state': i(f'state_per_{sfx}'), 'sex': i(f'b4q5_per_{sfx}'),
            'cws': end - 9, 'earn': end - 6, 'nss': end - 4, 'nsc': end - 3, 'mult': end - 2}
    d0 = i(f'b6q4_3pt1_Act1_per_{sfx}')          # seven days, ten columns each: two activities, then the day's hours
    for d in range(7):
        b = d0 + d * 10
        cols.update({f's{d}a': b, f'h{d}a': b + 2, f'w{d}a': b + 3, f's{d}b': b + 4, f'h{d}b': b + 6, f'w{d}b': b + 7, f't{d}': b + 8})
    df = pd.read_csv(path, header=0, usecols=sorted(cols.values()), dtype=str, keep_default_na=False)
    df.columns = [k for k, _ in sorted(cols.items(), key=lambda x: x[1])]
    df['q'] = df.q.str.strip()
    df = df[df.q.isin(quarters)].copy()
    for c in df.columns:
        if c != 'q': df[c] = pd.to_numeric(df[c].str.strip(), errors='coerce')
    return df

def main(fv1819, rv1819, fv1920, rv1920):
    df = pd.concat([load(fv1819, ['Q7', 'Q8'], 'fv'), load(rv1819, ['Q7', 'Q8'], 'rv'),
                    load(fv1920, ['Q1', 'Q2'], 'fv'), load(rv1920, ['Q1', 'Q2'], 'rv')], ignore_index=True)
    df['w'] = np.where(df.nss == df.nsc, df.mult / 100, df.mult / 200)
    df.loc[df.sector == 2, 'w'] /= 4
    df['st'] = df.state.map(STATES)
    if df.st.isna().any(): sys.exit(f'state codes not in the list: {sorted(df[df.st.isna()].state.unique())}')
    wage, hrs, days, week = (np.zeros(len(df)) for _ in range(4))
    for d in range(7):
        week += df[f't{d}'].fillna(0).values
        for x in 'ab':
            m = (df[f's{d}{x}'] == 51).values
            wage += np.where(m, df[f'w{d}{x}'].fillna(0), 0); hrs += np.where(m, df[f'h{d}{x}'].fillna(0), 0); days += m
    df['cw'], df['ch'], df['cd'], df['week'] = wage, hrs, days, week
    reg, cas = df[df.cws.isin([31, 71, 72]) & (df.earn > 0)], df[df.cd > 0]
    rw = lambda r: (r.earn * r.w).sum() / r.w.sum()
    cw = lambda c: (c.cw * c.w).sum() / (c.cd * c.w).sum()
    pick = lambda t, sex: t if sex == 'person' else t[t.sex == (1 if sex == 'male' else 2)]
    worst = {'reg': 0, 'cas': 0}
    for (q, kind), pub in PUBLISHED.items():
        for sex, want in zip(('male', 'female', 'person'), pub):
            t = pick((reg if kind == 'reg' else cas), sex); t = t[t.q == q]
            got = rw(t) if kind == 'reg' else cw(t)
            gap = abs(got / want - 1); worst[kind] = max(worst[kind], gap)
            if gap > TOLERANCE[kind]: sys.exit(f'{q} {kind} {sex}: computed {got:.1f}, MoSPI publishes {want}: nothing written')
    with open(OUT, 'w', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['state', 'sex', 'reg_wage', 'reg_n', 'reg_hours', 'cas_wage', 'cas_n', 'cas_hours'])
        for st in ['All India'] + sorted(set(STATES.values())):
            for sex in ('male', 'female', 'person'):
                r, c = pick(reg, sex), pick(cas, sex)
                if st != 'All India': r, c = r[r.st == st], c[c.st == st]
                w.writerow([st, sex, f'{rw(r):.2f}' if len(r) else '', len(r), f'{(r.week * r.w).sum() / r.w.sum():.1f}' if len(r) else '',
                            f'{cw(c):.2f}' if len(c) else '', len(c), f'{(c.ch * c.w).sum() / (c.cd * c.w).sum():.2f}' if len(c) else ''])
    print(f"wrote {OUT}; largest gap from MoSPI's quarterly figures: regular {worst['reg']:.2%}, casual {worst['cas']:.2%}")

if __name__ == '__main__':
    if len(sys.argv) != 5: sys.exit(__doc__)
    main(*sys.argv[1:])
