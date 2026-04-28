#!/usr/bin/env python3
"""
Extract district analysis (TypeId=29) and observer master (TypeId=40) from
the AICC Observers portal. The district analysis includes caste-percentage
breakdowns per district as filed by the observer; the observer master gives
per-observer HR fields (excluding password/access_code which we deliberately
do NOT capture).
"""

import json
import csv
import os
import sys
import time
import urllib.parse
import urllib.request
import http.cookiejar


def login():
    username = os.environ.get('AICC_USERNAME')
    password = os.environ.get('AICC_PASSWORD')
    if not username or not password:
        print("ERROR: set AICC_USERNAME and AICC_PASSWORD environment variables.", file=sys.stderr)
        sys.exit(2)
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    opener.addheaders = [('User-Agent', 'Mozilla/5.0')]
    creds = urllib.parse.urlencode({'UserName': username, 'Password': password}).encode()
    req = urllib.request.Request(
        'https://aiccobservers.in/home/_ul12',
        data=creds,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    opener.open(req, timeout=15)
    print("Logged in.")
    return opener


def fetch(opener, type_id, filter_id):
    url = f'https://aiccobservers.in/Home/_getMasters?TypeId={type_id}&FilterId={filter_id}&filterText=&Userid=437'
    last_err = None
    for attempt in range(3):
        try:
            resp = opener.open(url, timeout=30)
            raw = resp.read()
            data = json.loads(raw)
            result_str = data.get('result', '')
            parsed = json.loads(result_str) if result_str else {}
            return parsed.get('Table', [])
        except Exception as e:
            last_err = e
            if attempt < 2:
                time.sleep(2 ** attempt)
    raise last_err


def extract_district_analysis(opener):
    """TypeId=29: per-district caste/political analysis."""
    # District IDs come from proposed_names.json (we have 592 valid IDs)
    proposed = json.load(open('proposed_names.json'))['Table']
    district_ids = sorted({r['districtid'] for r in proposed if r.get('districtid')})
    print(f"Extracting TypeId=29 for {len(district_ids)} districts...")

    rows = []
    failed = []
    for i, did in enumerate(district_ids):
        try:
            recs = fetch(opener, 29, did)
            for r in recs:
                rows.append(r)
            if (i + 1) % 50 == 0:
                print(f"  {i+1}/{len(district_ids)} districts processed, {len(rows)} rows so far")
        except Exception as e:
            failed.append((did, str(e)))
            print(f"  Error on district {did}: {e}")
        time.sleep(0.05)  # be nice to server

    print(f"\nDistrict-analysis rows: {len(rows)}")
    if failed:
        print(f"Failed districts: {len(failed)}")
        with open('district_analysis_failed.txt', 'w') as fh:
            for did, err in failed:
                fh.write(f"{did}\t{err}\n")

    if not rows:
        return

    # Save JSON (full fidelity)
    with open('district_analysis.json', 'w', encoding='utf-8') as fh:
        json.dump(rows, fh, indent=2, ensure_ascii=False)
    print(f"Saved: district_analysis.json")

    # Save CSV
    fieldnames = list(rows[0].keys())
    with open('district_analysis.csv', 'w', newline='', encoding='utf-8') as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Saved: district_analysis.csv ({len(rows)} rows, {len(fieldnames)} columns)")


def extract_observer_master(opener):
    """TypeId=40: observer roster. We deliberately STRIP `password` and
    `access_code` before saving, since the API exposes plaintext credentials
    that should never enter our repo or any downstream artifact."""
    print("\nExtracting TypeId=40 (observer master, dropping password/access_code)...")
    rows = fetch(opener, 40, 0)
    if not rows:
        print("  no rows")
        return
    SENSITIVE = {'password', 'access_code'}
    cleaned = [{k: v for k, v in r.items() if k.lower() not in SENSITIVE} for r in rows]
    fieldnames = [k for k in rows[0].keys() if k.lower() not in SENSITIVE]

    with open('observers_master.json', 'w', encoding='utf-8') as fh:
        json.dump(cleaned, fh, indent=2, ensure_ascii=False)
    with open('observers_master.csv', 'w', newline='', encoding='utf-8') as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(cleaned)
    print(f"  Saved: observers_master.csv ({len(cleaned)} rows)")
    print(f"  Dropped sensitive columns: {SENSITIVE & set(rows[0].keys())}")


def main():
    opener = login()
    extract_district_analysis(opener)
    extract_observer_master(opener)


if __name__ == '__main__':
    main()
