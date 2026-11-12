"""State minutes for 2019, read from the published report.

    python3 care-valuation/tools/tus2019_report.py Report_TUS_2019_0.pdf

MoSPI distributes the 2019 unit-level data only as a Nesstar file, and in that
file the "time from" and "time to" columns of the diary are empty for all
9,436,777 rows, so no activity has a duration and the minutes cannot be
computed from it. The report, "Time Use in India-2019" (NSO, 2020), prints
what is needed:

  Statement 7.1      minutes a day per person in each major division, for each
                     State/UT, by sex, for ages 15-29, 15-59 and 6 and above,
                     rural, urban and rural+urban, with the sample persons
  Table (3RSE)_State the relative standard error, in percent, of the same

This script runs pdftotext over the report, reads the rural+urban block of
both for every State/UT, and writes care-valuation/data/tus2019.csv. It stops
without writing unless the all-India figures for ages 15 to 59 equal the four
the MoSPI data service returns for 2019: women 290 and 45, men 28 and 12.

The report is a 2,140 page PDF of 26 MB and is not in the repository.
"""
import csv, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'tus2019.csv')
NAMES = {'A & N Islands': 'Andaman & Nicobar Islands', 'all-India': 'All India'}
SEXES = (('male', 0), ('female', 3))
AGES = (('15-59', 1), ('6+', 2))
EXPECT = {('female', 'domestic'): 290, ('female', 'care'): 45, ('male', 'domestic'): 28, ('male', 'care'): 12}

def numbers(line):
    return [float(x.replace(',', '')) for x in re.findall(r'(?<![\w.])\d[\d,]*(?:\.\d+)?(?![\w.])', line)]

def blocks(lines, title, want_n):
    """The rural+urban rows of every State/UT under a table title."""
    out, i = {}, 0
    while i < len(lines):
        if lines[i].startswith(title):
            j = i + 1
            while not lines[j].strip() or lines[j].startswith(('major activity or not', 'classification irrespective')):   # the title's second line
                j += 1
            state = NAMES.get(lines[j].strip(), lines[j].strip())
            k = j
            while 'rural+urban' not in lines[k]:
                k += 1
            row = {}
            for t in range(k + 1, k + 45):
                s = lines[t]
                if s.startswith('Unpaid domestic services for'): row['domestic'] = numbers(s)
                elif s.startswith('Unpaid caregiving services for'): row['care'] = numbers(s)
                elif s.startswith('sample persons'): row['n'] = numbers(s)
                if 'domestic' in row and 'care' in row and ('n' in row or not want_n): break
            for key in ('domestic', 'care') + (('n',) if want_n else ()):
                if len(row.get(key, [])) != 9:
                    sys.exit(f'{title} {state}: expected nine figures for {key}, found {row.get(key)}')
            if state in out: sys.exit(f'{title} {state}: found twice')
            out[state] = row
            i = k
        i += 1
    return out

def main(pdf):
    with tempfile.TemporaryDirectory() as tmp:
        txt = os.path.join(tmp, 'report.txt')
        subprocess.run(['pdftotext', '-layout', pdf, txt], check=True)
        lines = open(txt, encoding='utf-8', errors='replace').read().split('\n')
    mins = blocks(lines, 'Statement 7.1:', True)
    rse = blocks(lines, 'Table (3RSE)_State', False)
    if set(mins) != set(rse): sys.exit(f'the two tables list different places: {sorted(set(mins) ^ set(rse))}')
    if len(mins) != 37: sys.exit(f'expected 36 States/UTs and all-India, found {len(mins)}')
    ai = mins['All India']
    for (sex, what), want in EXPECT.items():
        got = ai[what][dict(SEXES)[sex] + 1]
        if got != want: sys.exit(f'all-India {sex} {what} is {got}, MoSPI publishes {want}: nothing written')
    with open(OUT, 'w', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['state', 'sex', 'age', 'domestic', 'care', 'rse_domestic', 'rse_care', 'sample_persons'])
        for state in ['All India'] + sorted(s for s in mins if s != 'All India'):
            for sex, c in SEXES:
                for age, o in AGES:
                    w.writerow([state, sex, age, int(mins[state]['domestic'][c + o]), int(mins[state]['care'][c + o]),
                                rse[state]['domestic'][c + o], rse[state]['care'][c + o], int(mins[state]['n'][c + o])])
    print(f'wrote {OUT}: {len(mins)} places')

if __name__ == '__main__':
    if len(sys.argv) != 2: sys.exit(__doc__)
    main(sys.argv[1])
