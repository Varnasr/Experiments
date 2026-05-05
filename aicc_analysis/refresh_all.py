#!/usr/bin/env python3
"""
Unified AICC portal refresh.

Pulls every endpoint we know about — summary tables, per-record details,
daily reports, observer roster, district analysis — in one pass. Replaces
the older extract_candidates.py and extract_district_analysis.py.

Outputs (all in current directory):
  Summary tables (one row per district):
    district_reports.json
    proposed_names.json
    attachments.json
    potential_leaders.json
    political_influencers.json

  Detail tables (multiple rows per district):
    district_analysis.{json,csv}     — TypeId=29, includes caste %s
    candidates_detailed.{json,csv}   — TypeId=31, candidate-level profiles
    attachments_detailed.json        — TypeId=33, file_path / uploaded_date
    potential_leaders_detailed.json  — TypeId=51, name/caste/strengths
    political_influencers_detailed.json — TypeId=66, name/caste/influence

  Daily activity:
    daily_reports.json               — TypeId=48

  Observer roster:
    observers_master.{json,csv}      — TypeId=40, password/access_code stripped

  Cross-cut:
    all_timestamps.csv               — assembled from detail tables, used as
                                        authoritative count source by grader

  Failed lookups:
    refresh_failed.txt               — districts that errored on any pull

Auth: reads AICC_USERNAME / AICC_PASSWORD from env.
"""

import csv
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import http.cookiejar
import re
from collections import defaultdict


USER_ID = 437  # required query param; tied to the master account
RETRIES = 3
BACKOFF = (1, 2, 4)
SLEEP_BETWEEN = 0.05


def login():
    user = os.environ.get('AICC_USERNAME')
    pw = os.environ.get('AICC_PASSWORD')
    if not user or not pw:
        print("ERROR: set AICC_USERNAME and AICC_PASSWORD environment variables.", file=sys.stderr)
        sys.exit(2)
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    opener.addheaders = [('User-Agent', 'Mozilla/5.0')]
    creds = urllib.parse.urlencode({'UserName': user, 'Password': pw}).encode()
    req = urllib.request.Request(
        'https://aiccobservers.in/home/_ul12',
        data=creds,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    opener.open(req, timeout=15)
    print("Logged in.")
    return opener


def get_masters(opener, type_id, filter_id):
    """Fetch one (TypeId, FilterId) tuple. Returns list-of-records or raises."""
    url = (f'https://aiccobservers.in/Home/_getMasters?'
           f'TypeId={type_id}&FilterId={filter_id}&filterText=&Userid={USER_ID}')
    last_err = None
    for attempt in range(RETRIES):
        try:
            resp = opener.open(url, timeout=30)
            raw = resp.read()
            data = json.loads(raw)
            rs = data.get('result', '')
            if not rs:
                return []
            parsed = json.loads(rs)
            return parsed.get('Table', []) if parsed else []
        except Exception as e:
            last_err = e
            if attempt < RETRIES - 1:
                time.sleep(BACKOFF[attempt])
    raise last_err


# ============================================================
# Summary endpoints (one row per district, includes Profiles count)
# ============================================================

SUMMARY_ENDPOINTS = {
    'district_reports':      28,   # DistrictReport summary
    'proposed_names':        30,   # ProposedName summary
    'attachments':           32,   # Attachment summary
    'potential_leaders':     50,   # PotentialLeader summary
    'political_influencers': 65,   # PoliticalInfluencer summary
}

DETAIL_ENDPOINTS = {
    # name : (TypeId, summary_endpoint_to_filter_by)
    'district_analysis':              (29, 'district_reports'),
    'candidates_detailed':            (31, 'proposed_names'),
    'attachments_detailed':           (33, 'attachments'),
    'potential_leaders_detailed':     (51, 'potential_leaders'),
    'political_influencers_detailed': (66, 'political_influencers'),
}


def pull_summaries(opener):
    """Pull all 5 summary endpoints. Returns dict[name] -> list of records."""
    out = {}
    for name, tid in SUMMARY_ENDPOINTS.items():
        print(f"  pulling summary {name} (TypeId={tid})...")
        rows = get_masters(opener, tid, 0)
        # Save in the same shape as the legacy file: {"Table": [...]}
        with open(f'{name}.json', 'w', encoding='utf-8') as f:
            json.dump({'Table': rows}, f, indent=2, ensure_ascii=False)
        out[name] = rows
        sum_p = sum((r.get('Profiles', 0) or 0) for r in rows)
        print(f"    -> {len(rows)} rows, sum(Profiles)={sum_p}")
    return out


def pull_observer_master(opener):
    """TypeId=40. Strip password and access_code on the way in."""
    print("  pulling observer master (TypeId=40)...")
    rows = get_masters(opener, 40, 0)
    SENSITIVE = {'password', 'access_code'}
    cleaned = [{k: v for k, v in r.items() if k.lower() not in SENSITIVE} for r in rows]
    with open('observers_master.json', 'w', encoding='utf-8') as f:
        json.dump(cleaned, f, indent=2, ensure_ascii=False)
    if cleaned:
        fns = [k for k in rows[0].keys() if k.lower() not in SENSITIVE]
        with open('observers_master.csv', 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=fns)
            w.writeheader()
            w.writerows(cleaned)
    print(f"    -> {len(cleaned)} rows (password/access_code stripped on read)")


def pull_daily_reports(opener):
    """TypeId=48. Returns observer-x-district pivot with Total + per-day cols."""
    print("  pulling daily reports (TypeId=48)...")
    rows = get_masters(opener, 48, 0)
    with open('daily_reports.json', 'w', encoding='utf-8') as f:
        json.dump({'Table': rows}, f, indent=2, ensure_ascii=False)
    sum_t = sum((r.get('Total', 0) or 0) for r in rows)
    print(f"    -> {len(rows)} rows, sum(Total)={sum_t}")


# ============================================================
# Detail endpoints (per-district pull, only when summary count > 0)
# ============================================================

def pull_details(opener, summaries):
    """For each detail endpoint, walk every district whose summary has
    Profiles > 0, accumulate detail records, write JSON (and CSV where
    schemas are flat enough)."""
    failed = []  # (endpoint_name, district_id, error_msg)

    for det_name, (tid, src_summary) in DETAIL_ENDPOINTS.items():
        src = summaries[src_summary]
        # district_reports uses 'DistrictID', others use 'districtid'
        id_key = 'DistrictID' if src_summary == 'district_reports' else 'districtid'
        targets = [r[id_key] for r in src if r.get(id_key) and (r.get('Profiles', 0) or 0) > 0]
        print(f"  pulling {det_name} (TypeId={tid}) for {len(targets)} districts...")

        all_rows = []
        for i, did in enumerate(targets):
            try:
                rows = get_masters(opener, tid, did)
                all_rows.extend(rows)
            except Exception as e:
                failed.append((det_name, did, str(e)))
            if (i + 1) % 100 == 0:
                print(f"    {i+1}/{len(targets)} districts, {len(all_rows)} records so far")
            time.sleep(SLEEP_BETWEEN)

        # Write JSON (always)
        with open(f'{det_name}.json', 'w', encoding='utf-8') as f:
            json.dump(all_rows, f, indent=2, ensure_ascii=False)

        # Write CSV (only if rows are flat — i.e., no nested structures)
        if all_rows and all(isinstance(v, (str, int, float, type(None)))
                           for r in all_rows[:5] for v in r.values()):
            fns = list(all_rows[0].keys())
            with open(f'{det_name}.csv', 'w', newline='', encoding='utf-8') as f:
                w = csv.DictWriter(f, fieldnames=fns)
                w.writeheader()
                w.writerows(all_rows)
        print(f"    -> {len(all_rows)} total records saved")

    return failed


def _strip_html_local(text):
    """Local copy to avoid forward-reference issues."""
    if not text:
        return ''
    s = re.sub(r'<[^>]+>', '', str(text))
    return s.replace('&nbsp;', ' ').replace('&amp;', '&').strip()


def _slim_candidates(summaries):
    """Slim candidates_detailed.{json,csv}: keep a 31-column CSV with
    HTML-stripped text, drop the oversized raw JSON. Idempotent — safe
    to re-run."""
    if not os.path.exists('candidates_detailed.json'):
        return
    print("  slimming candidates_detailed for git/GitHub size limit...")
    with open('candidates_detailed.json') as f:
        recs = json.load(f)
    pn = summaries.get('proposed_names', [])
    dr_meta = {r['districtid']: r for r in pn if r.get('districtid')}
    out = []
    for c in recs:
        did = c.get('did') or c.get('district_id') or c.get('DistrictID')
        meta = dr_meta.get(did, {})
        out.append({
            'State':            meta.get('statename', ''),
            'District':         c.get('DistrictName') or meta.get('DistrictName', ''),
            'DistrictID':       did,
            'Observer_Name':    c.get('Observer_name') or meta.get('Observer', ''),
            'Candidate_ID':     c.get('Candidate_id', ''),
            'Candidate_Name':   c.get('name', ''),
            'Age':              c.get('age', ''),
            'Gender':           c.get('gender', ''),
            'Category':         c.get('category', ''),
            'Caste':            c.get('caste', ''),
            'Mobile':           c.get('mobile_no', ''),
            'Education':        c.get('educational_qualification', ''),
            'Occupation':       c.get('occupation', ''),
            'Year_Joined_INC':  c.get('year_of_joining_inc', ''),
            'Criminal_Record':  c.get('criminal_record', ''),
            'Elections_Contested': c.get('election_contested', ''),
            'Preference':       c.get('Preference', ''),
            'Domicile_District': c.get('DomicileDistrict', ''),
            'Reason_for_Interest': _strip_html_local(c.get('reason_for_interest_dpp', '')),
            'Strengths':        _strip_html_local(c.get('strenghts', '')),
            'Weaknesses':       _strip_html_local(c.get('weakness', '')),
            'General_Attitude': _strip_html_local(c.get('general_attitude_of_party_leaders', '')),
            'Position_Held':    c.get('position_held_in_party', ''),
            'Affiliation':      c.get('affiliation_party_congress', ''),
            'LBE':              c.get('lbe', ''),
            'Pct_General':      c.get('general', ''),
            'Pct_ST':           c.get('st', ''),
            'Pct_SC':           c.get('sc', ''),
            'Pct_OBC':          c.get('obc', ''),
            'Pct_Minority':     c.get('minority', ''),
            'Created_Date':     (c.get('created_date', '') or '')[:10],
        })
    fns = list(out[0].keys())
    with open('candidates_detailed.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fns)
        w.writeheader()
        w.writerows(out)
    os.remove('candidates_detailed.json')
    print(f"    -> candidates_detailed.csv: {len(out)} rows; raw JSON removed (>100 MB)")


# ============================================================
# Build all_timestamps.csv from detail tables
# ============================================================

def _strip_html(text):
    if not text:
        return ''
    s = re.sub(r'<[^>]+>', '', str(text))
    return s.replace('&nbsp;', ' ').replace('&amp;', '&').strip()


def build_timestamps():
    """Assemble all_timestamps.csv from the detail tables we just pulled.

    Schema mirrors the legacy file:
        DataType, State, District, Observer, Item, Created_Date, Modified_Date
    """
    print("  assembling all_timestamps.csv from detail tables...")

    # Build (DistrictID -> {state, district, observer}) lookup from any summary
    pn = json.load(open('proposed_names.json'))['Table']
    dr_meta = {}  # by districtid
    for r in pn:
        if r.get('districtid'):
            dr_meta[r['districtid']] = {
                'State': r.get('statename', ''),
                'District': r.get('DistrictName', ''),
                'Observer': r.get('Observer', ''),
            }

    rows = []

    # District_Report — TypeId=29 returns one row per district
    da = json.load(open('district_analysis.json'))
    for r in da:
        did = r.get('did') or r.get('district_id')
        meta = dr_meta.get(did, {})
        rows.append({
            'DataType': 'District_Report',
            'State': meta.get('State', ''),
            'District': r.get('DistrictName') or meta.get('District', ''),
            'Observer': r.get('Observer') or meta.get('Observer', ''),
            'Item': f"District Profile: {r.get('DistrictName', '')}",
            'Created_Date': r.get('created_date', ''),
            'Modified_Date': r.get('modified_date', ''),
        })

    # Proposed_Name — TypeId=31 candidate-level
    cd = json.load(open('candidates_detailed.json'))
    for r in cd:
        # Original district_id key is uppercase 'DistrictID' inside candidates;
        # we need to rebuild from district_id
        did = r.get('district_id') or r.get('DistrictID')
        meta = dr_meta.get(did, {})
        rows.append({
            'DataType': 'Proposed_Name',
            'State': meta.get('State', ''),
            'District': r.get('DistrictName') or meta.get('District', ''),
            'Observer': r.get('Observer_name') or meta.get('Observer', ''),
            'Item': f"Proposed Name: {r.get('name', '') or ''}",
            'Created_Date': r.get('created_date', '') or '',
            'Modified_Date': r.get('modified_date', '') or r.get('created_date', '') or '',
        })

    # Attachment — TypeId=33
    att = json.load(open('attachments_detailed.json'))
    for r in att:
        did = r.get('district_id')
        meta = dr_meta.get(did, {})
        rows.append({
            'DataType': 'Attachment',
            'State': meta.get('State', ''),
            'District': r.get('DistrictName') or meta.get('District', ''),
            'Observer': meta.get('Observer', ''),
            'Item': _strip_html(r.get('comments') or r.get('attachment_type') or '') or 'Attachment',
            'Created_Date': r.get('uploaded_date', '') or '',
            'Modified_Date': r.get('uploaded_date', '') or '',
        })

    # Potential_Leader — TypeId=51
    pl = json.load(open('potential_leaders_detailed.json'))
    for r in pl:
        did = r.get('district_id')
        meta = dr_meta.get(did, {})
        rows.append({
            'DataType': 'Potential_Leader',
            'State': meta.get('State', ''),
            'District': r.get('DistrictName') or meta.get('District', ''),
            'Observer': meta.get('Observer', ''),
            'Item': f"Potential Leader: {r.get('name', '') or ''}",
            'Created_Date': r.get('created_date', '') or '',
            'Modified_Date': r.get('modified_date', '') or r.get('created_date', '') or '',
        })

    # Political_Influencer — TypeId=66
    pi = json.load(open('political_influencers_detailed.json'))
    for r in pi:
        did = r.get('district_id')
        meta = dr_meta.get(did, {})
        rows.append({
            'DataType': 'Political_Influencer',
            'State': meta.get('State', ''),
            'District': r.get('DistrictName') or meta.get('District', ''),
            'Observer': meta.get('Observer', ''),
            'Item': f"Influencer: {r.get('name', '') or ''}",
            'Created_Date': r.get('created_date', '') or '',
            'Modified_Date': r.get('modified_date', '') or r.get('created_date', '') or '',
        })

    fns = ['DataType', 'State', 'District', 'Observer', 'Item', 'Created_Date', 'Modified_Date']
    with open('all_timestamps.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fns)
        w.writeheader()
        w.writerows(rows)

    by_type = defaultdict(int)
    for r in rows:
        by_type[r['DataType']] += 1
    print(f"    -> all_timestamps.csv: {len(rows)} rows, breakdown {dict(by_type)}")


# ============================================================
# Main
# ============================================================

def main():
    print("=" * 70)
    print("AICC portal refresh — full pull")
    print("=" * 70)

    opener = login()

    print("\n[1/4] Summary endpoints")
    summaries = pull_summaries(opener)

    print("\n[2/4] Daily reports + observer roster")
    pull_daily_reports(opener)
    pull_observer_master(opener)

    print("\n[3/4] Detail endpoints (per-district)")
    failed = pull_details(opener, summaries)

    print("\n[4/4] Assemble all_timestamps.csv + slim oversized files")
    build_timestamps()
    # Slim candidates AFTER timestamps build (which still needs the raw JSON
    # for full per-candidate created_date); slim drops the oversized raw JSON.
    _slim_candidates(summaries)

    if failed:
        print(f"\nWARNING: {len(failed)} detail-pull failures:")
        for ep, did, err in failed[:20]:
            print(f"  {ep} did={did}: {err}")
        with open('refresh_failed.txt', 'w') as f:
            for ep, did, err in failed:
                f.write(f"{ep}\t{did}\t{err}\n")

    print("\n=" * 70)
    print("Refresh complete. Next steps:")
    print("  python3 grading_system.py        # regenerate consolidated CSV")
    print("  python3 infer_observer_caste.py  # regenerate observer caste CSV")
    print("=" * 70)


if __name__ == '__main__':
    main()
