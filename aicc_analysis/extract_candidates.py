#!/usr/bin/env python3
"""
Extract all candidate-level profiles from AICC Observers platform.
Calls TypeId=31 for each district that has proposed names.
Outputs a flat CSV with key fields.
"""

import json
import csv
import time
import urllib.request
import http.cookiejar
import re

def strip_html(text):
    """Remove HTML tags from text."""
    if not text:
        return ""
    clean = re.sub(r'<[^>]+>', '', str(text))
    clean = clean.replace('&nbsp;', ' ').replace('&amp;', '&').strip()
    return clean

def main():
    # Login
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    req = urllib.request.Request(
        'https://aiccobservers.in/home/_ul12',
        data=b'UserName=9885208187&Password=6666',
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    opener.open(req)
    print("Logged in.")

    # Load proposed names summary to get district IDs with data
    with open('proposed_names.json') as f:
        proposed = json.load(f)['Table']

    districts_with_data = [
        d for d in proposed
        if d.get('Profiles', 0) > 0 and d.get('districtid')
    ]
    print(f"Districts with proposed names: {len(districts_with_data)}")

    # Extract candidate details for each district
    all_candidates = []
    errors = 0

    for i, dist in enumerate(districts_with_data):
        did = dist['districtid']
        dname = dist.get('DistrictName', 'Unknown')
        observer = dist.get('Observer', 'Unknown')
        state = dist.get('statename', 'Unknown')

        try:
            url = f'https://aiccobservers.in/Home/_getMasters?TypeId=31&FilterId={did}&filterText=&Userid=437'
            resp = opener.open(url, timeout=30)
            raw = json.loads(resp.read())
            parsed = json.loads(raw['result'])
            candidates = parsed.get('Table', [])

            for c in candidates:
                all_candidates.append({
                    'State': state,
                    'District': dname,
                    'DistrictID': did,
                    'Observer_Name': c.get('Observer_name', observer),
                    'Candidate_ID': c.get('Candidate_id', ''),
                    'Candidate_Name': c.get('name', ''),
                    'Age': c.get('age', ''),
                    'Gender': c.get('gender', ''),
                    'Category': c.get('category', ''),
                    'Caste': c.get('caste', ''),
                    'Mobile': c.get('mobile_no', ''),
                    'Education': c.get('educational_qualification', ''),
                    'Occupation': c.get('occupation', ''),
                    'Year_Joined_INC': c.get('year_of_joining_inc', ''),
                    'Criminal_Record': c.get('criminal_record', ''),
                    'Elections_Contested': c.get('election_contested', ''),
                    'Preference': c.get('Preference', ''),
                    'Domicile_District': c.get('DomicileDistrict', ''),
                    'Reason_for_Interest': strip_html(c.get('reason_for_interest_dpp', '')),
                    'Strengths': strip_html(c.get('strenghts', '')),
                    'Weaknesses': strip_html(c.get('weakness', '')),
                    'General_Attitude': strip_html(c.get('general_attitude_of_party_leaders', '')),
                    'Position_Held': c.get('position_held_in_party', ''),
                    'Affiliation': c.get('affiliation_party_congress', ''),
                    'LBE': c.get('lbe', ''),
                    'Pct_General': c.get('general', ''),
                    'Pct_ST': c.get('st', ''),
                    'Pct_SC': c.get('sc', ''),
                    'Pct_OBC': c.get('obc', ''),
                    'Pct_Minority': c.get('minority', ''),
                    'Created_Date': (c.get('created_date', '') or '')[:10],
                })

            if (i + 1) % 50 == 0:
                print(f"  Processed {i+1}/{len(districts_with_data)} districts, {len(all_candidates)} candidates so far...")

        except Exception as e:
            errors += 1
            print(f"  Error on district {did} ({dname}): {e}")
            if errors > 5:
                time.sleep(2)

    print(f"\nTotal candidates extracted: {len(all_candidates)}")
    print(f"Errors: {errors}")

    # Save full JSON
    with open('candidates_detailed.json', 'w') as f:
        json.dump(all_candidates, f, indent=2, ensure_ascii=False)
    print(f"Saved: candidates_detailed.json")

    # Save CSV
    csv_file = 'candidates_detailed.csv'
    if all_candidates:
        fieldnames = list(all_candidates[0].keys())
        with open(csv_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(all_candidates)
        print(f"Saved: {csv_file}")

    # Quick summary
    print(f"\n--- QUICK SUMMARY ---")
    categories = {}
    castes = {}
    for c in all_candidates:
        cat = c.get('Category', 'Unknown') or 'Unknown'
        caste = c.get('Caste', 'Unknown') or 'Unknown'
        categories[cat] = categories.get(cat, 0) + 1
        castes[caste] = castes.get(caste, 0) + 1

    print(f"\nCategory Distribution:")
    for cat, cnt in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  {cat:<20}: {cnt:>5} ({cnt/len(all_candidates)*100:.1f}%)")

    print(f"\nTop 20 Castes:")
    for caste, cnt in sorted(castes.items(), key=lambda x: -x[1])[:20]:
        print(f"  {caste:<25}: {cnt:>5}")


if __name__ == '__main__':
    main()
