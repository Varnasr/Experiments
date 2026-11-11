#!/usr/bin/env python3
"""State-by-sex minutes of unpaid domestic and care work from TUS 2024.

    python3 care-valuation/tools/tus_minutes.py /path/to/TUS2024.Nesstar

Reads the unit-level file MoSPI distributes (TUS2024.Nesstar, from the
microdata catalogue at microdata.gov.in) and prints, as JSON, the average
minutes per person per day in ICATUS major division 3 (unpaid domestic
services for household members) and 4 (unpaid caregiving services for
household members), for each state and union territory, by sex, for ages 15 to
59 and for ages 6 and above. Those figures are the "min" entries of
care-valuation/data/care-data.js. The unit-level file is not in this
repository.

How time is counted. A diary row covers one time slot. When a person reported
more than one activity in a slot, the slot's minutes are shared equally among
them. A person's day then adds to 1,440 minutes, and the all-India results
equal the figures MoSPI publishes for "minutes per person, irrespective of
major activity": 283 and 58 for women aged 15 to 59, 26 and 16 for men, 236
and 47 for women aged 6 and above, 24 and 13 for men. The script stops if they
do not.

Weights are the MULT column as released. Dividing MULT by NSC, which some NSS
files require, gives the same all-India figures and moves a state's domestic
minutes by at most 6. Standard errors treat the first-stage unit as a cluster
and ignore stratification.

The .Nesstar format is not documented. What this reader relies on: the file
starts with NESSTART; a 4-byte offset at byte 0x25 points to a directory of
15-byte entries (4-byte id, 6-byte offset, 5-byte length); entry 73 holds one
160-byte record per variable of the person and activity file, with the type at
byte 4, an integer offset at bytes 6 to 13, the width at byte 14 and the id of
the data column at bytes 15 to 18; a text column is fixed-width ASCII and a
numeric column is a little-endian integer to which the offset is added, with
all bits set meaning missing.
"""
import json
import mmap
import struct
import sys

import numpy as np
import pandas as pd

N = 10211478          # rows in the person and activity file
VARS = 73             # directory entry that describes its variables
STATES = {1: 'Jammu & Kashmir', 2: 'Himachal Pradesh', 3: 'Punjab', 4: 'Chandigarh', 5: 'Uttarakhand', 6: 'Haryana',
          7: 'Delhi', 8: 'Rajasthan', 9: 'Uttar Pradesh', 10: 'Bihar', 11: 'Sikkim', 12: 'Arunachal Pradesh',
          13: 'Nagaland', 14: 'Manipur', 15: 'Mizoram', 16: 'Tripura', 17: 'Meghalaya', 18: 'Assam', 19: 'West Bengal',
          20: 'Jharkhand', 21: 'Odisha', 22: 'Chhattisgarh', 23: 'Madhya Pradesh', 24: 'Gujarat',
          25: 'Dadra & Nagar Haveli & Daman & Diu', 27: 'Maharashtra', 28: 'Andhra Pradesh', 29: 'Karnataka', 30: 'Goa',
          31: 'Lakshadweep', 32: 'Kerala', 33: 'Tamil Nadu', 34: 'Puducherry', 35: 'Andaman & Nicobar Islands',
          36: 'Telangana', 37: 'Ladakh'}
PUBLISHED = {('15-59', 'female'): (283, 58), ('15-59', 'male'): (26, 16), ('6+', 'female'): (236, 47), ('6+', 'male'): (24, 13)}


def read(path):
    f = open(path, 'rb')
    m = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
    if m[:8] != b'NESSTART':
        sys.exit('not a Nesstar file')
    off = struct.unpack('<I', m[0x25:0x29])[0]
    entries = {}
    for i in range(struct.unpack('<I', m[off:off + 4])[0]):
        b = m[off + 4 + i * 15: off + 19 + i * 15]
        entries[struct.unpack('<I', b[:4])[0]] = (int.from_bytes(b[4:10], 'little'), int.from_bytes(b[10:15], 'little'))
    o, length = entries[VARS]
    var = {}
    for k in range(length // 160):
        r = m[o + k * 160: o + (k + 1) * 160]
        name = r[63:159].decode('utf-16le', 'ignore').split('\x00')[0]
        var[name] = dict(text=r[4] == 1, offset=struct.unpack('<q', r[6:14])[0], width=r[14], col=struct.unpack('<I', r[15:19])[0])

    def raw(name):
        v = var[name]
        o, length = entries[v['col']]
        if length % N:
            sys.exit(f'{name}: column length {length} is not a multiple of {N} rows')
        return v, np.frombuffer(m, dtype=np.uint8, count=length, offset=o).reshape(N, length // N)

    def digits(name):
        v, a = raw(name)
        out = np.zeros(N, dtype=np.int32)
        bad = np.zeros(N, dtype=bool)
        for j in range(a.shape[1]):
            d = a[:, j].astype(np.int32) - 48
            bad |= (d < 0) | (d > 9)
            out = out * 10 + d
        out[bad] = -1
        return out

    def number(name):
        v, a = raw(name)
        val = np.zeros(N, dtype=np.int64)
        for j in range(a.shape[1]):
            val += a[:, j].astype(np.int64) << (8 * j)
        missing = val == (1 << (8 * a.shape[1])) - 1
        val += v['offset']
        val[missing] = -1
        return val

    def clock(name):
        _, a = raw(name)
        a = a.astype(np.int32) - 48
        t = (a[:, 0] * 10 + a[:, 1]) * 60 + a[:, 3] * 10 + a[:, 4]
        t[a[:, 0] < 0] = -1
        return t

    act = digits('Activity_Code_3Digit')
    ok = act >= 0
    pid = digits('FSU_Serial_No').astype(np.int64) * 100000 + digits('Sample_HH_No') * 1000 + digits('Person_Serial_No')
    return pd.DataFrame({'pid': pid[ok], 't0': clock('Time_From')[ok], 't1': clock('Time_To')[ok], 'div': act[ok] // 100,
                         'sex': digits('Gender')[ok], 'age': number('Age')[ok], 'mult': number('MULT')[ok],
                         'state': digits('NSS_Region')[ok] // 10})


def main(path):
    df = read(path)
    df['dur'] = (df.t1 - df.t0) % 1440
    df.loc[df.dur == 0, 'dur'] = 1440
    df['share'] = df.dur / df.groupby(['pid', 't0', 't1'])['div'].transform('size')
    day = df.groupby('pid').share.sum()
    if abs(day.min() - 1440) > 1e-6 or abs(day.max() - 1440) > 1e-6:
        sys.exit('a diary does not add to 1,440 minutes')
    P = df.groupby('pid').agg(sex=('sex', 'first'), age=('age', 'first'), mult=('mult', 'first'), state=('state', 'first'))
    for d, name in ((3, 'domestic'), (4, 'care')):
        P[name] = df[df['div'] == d].groupby('pid').share.sum().reindex(P.index).fillna(0)
    P['fsu'] = P.index // 100000

    def est(d, col):
        w, y = d.mult, d[col]
        r = (w * y).sum() / w.sum()
        g = (w * (y - r)).groupby(d.fsu).sum()
        k = len(g)
        return round(float(r), 1), round(float(np.sqrt(k / (k - 1) * (g ** 2).sum()) / w.sum()), 1)

    out = {}
    for code, d0 in [(0, P)] + [(s, P[P.state == s]) for s in sorted(P.state.unique())]:
        rec = {}
        for label, (lo, hi) in (('15-59', (15, 59)), ('6+', (6, 200))):
            for sx, c in (('male', 1), ('female', 2)):
                d = d0[(d0.sex == c) & d0.age.between(lo, hi)]
                (dom, sed), (care, sec) = est(d, 'domestic'), est(d, 'care')
                rec[f'{label}|{sx}'] = [dom, care, sed, sec, int(len(d))]
        out['All India' if code == 0 else STATES[code]] = rec
    for (label, sx), (dom, care) in PUBLISHED.items():
        got = out['All India'][f'{label}|{sx}']
        if abs(got[0] - dom) > 0.55 or abs(got[1] - care) > 0.55:
            sys.exit(f'All India {label} {sx}: computed {got[0]} and {got[1]}, MoSPI publishes {dom} and {care}')
    json.dump(out, sys.stdout, separators=(',', ':'))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
