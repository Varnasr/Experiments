#!/usr/bin/env python3
"""
AICC Observers Grading System for DCC Readiness
================================================
Grades observers (A/B/C/D) based on data and documentation collected
for District Congress Committee (DCC) membership preparation.

Data Sources (from aiccobservers.in):
  1. General District Reports
  2. Proposed Names for DCC/CCC
  3. Supporting Documents/Attachments
  4. Daily Activity Reports
  5. Potential Leaders Identified
  6. Non-Political Influencers Identified
"""

import json
import csv
import statistics
import re
from collections import defaultdict

# ============================================================
# CONFIGURATION: Weights and Scoring Parameters
# ============================================================

WEIGHTS = {
    "district_report":       0.15,   # Did they submit the district profile?
    "proposed_names":        0.25,   # How many DCC candidates proposed?
    "daily_reports":         0.25,   # How active in daily reporting?
    "supporting_docs":       0.15,   # How much evidence/documentation?
    "potential_leaders":     0.10,   # Identified potential leaders?
    "political_influencers": 0.10,   # Mapped non-political influencers?
}

# Scoring normalization: use percentile-based scoring (0-100 scale)
# Grade thresholds (on final weighted score 0-100)
GRADE_THRESHOLDS = {
    "A": 70,   # Excellent: comprehensive work done
    "B": 45,   # Good: substantial work, some gaps
    "C": 20,   # Needs Improvement: significant gaps
    "D":  0,   # Poor: minimal or no work done
}


def load_data():
    """Load all datasets from JSON files."""
    datasets = {}
    files = {
        "district_reports": "district_reports.json",
        "proposed_names": "proposed_names.json",
        "attachments": "attachments.json",
        "daily_reports": "daily_reports.json",
        "potential_leaders": "potential_leaders.json",
        "political_influencers": "political_influencers.json",
    }
    for key, fname in files.items():
        with open(fname) as f:
            datasets[key] = json.load(f)["Table"]
    return datasets


def build_district_lookup(records, id_key="DistrictID"):
    """Build a district-id -> record lookup.
    When duplicates exist, prefer the record with Profiles > 0.
    Records with null DistrictID are dropped and counted.
    """
    lookup = {}
    dropped_null = 0
    for r in records:
        did = r.get(id_key) or r.get("districtid")
        if not did:
            dropped_null += 1
            continue
        if did in lookup:
            existing = lookup[did].get("Profiles", 0)
            new = r.get("Profiles", 0)
            if new > existing:
                lookup[did] = r
        else:
            lookup[did] = r
    if dropped_null:
        print(f"[build_district_lookup({id_key}): dropped {dropped_null} records with null id]")
    return lookup


def normalize_district_name(name):
    """Normalize district name for fuzzy matching.
    Strips suffixes ('City'/'Urban'/'Rural'/'Corporation'/cardinal directions)
    that vary across data sources for the same parent district.
    """
    if not name:
        return ""
    n = name.strip().upper()
    n = re.sub(r'\s+(CITY|URBAN|RURAL|CORPORATION|EAST|WEST|NORTH|SOUTH)\s*$', '', n)
    return n.strip()


def build_daily_report_lookup(records):
    """
    Daily reports are joined on mobile_no (perfect overlap with district_reports)
    plus district name. Returns:
      - by_mobile_dist: (mobile, normalized_district) -> record (exact)
      - by_mobile: mobile -> list of records (for fuzzy fallback)
    """
    by_mobile_dist = {}
    by_mobile = defaultdict(list)
    for r in records:
        mobile = (r.get("Mobile_No") or "").strip()
        if not mobile:
            continue
        dist_norm = normalize_district_name(r.get("District") or "")
        if dist_norm:
            by_mobile_dist[(mobile, dist_norm)] = r
        by_mobile[mobile].append(r)
    return by_mobile_dist, by_mobile


def match_daily_report(mobile, district, by_mobile_dist, by_mobile):
    """Match a district to its daily report using mobile_no as primary key.
    1. Exact (mobile, normalized district) match
    2. Substring match across same observer's daily records (same mobile)
    3. If observer covers exactly one district in daily reports, use that
    """
    if not mobile:
        return None
    mobile = mobile.strip()
    dist_norm = normalize_district_name(district)

    rec = by_mobile_dist.get((mobile, dist_norm))
    if rec:
        return rec

    candidates = by_mobile.get(mobile, [])
    if not candidates:
        return None

    if dist_norm:
        for r in candidates:
            r_dist = normalize_district_name(r.get("District") or "")
            if r_dist and (dist_norm in r_dist or r_dist in dist_norm):
                return r

    if len(candidates) == 1:
        return candidates[0]

    return None


def percentile_score(value, all_values):
    """
    Score a value relative to all values using percentile ranking (0-100).
    Uses the standard mean-rank percentile formula.
    """
    if not all_values or max(all_values) == 0:
        return 0
    sorted_vals = sorted(all_values)
    n = len(sorted_vals)
    count_below = sum(1 for v in sorted_vals if v < value)
    count_equal = sum(1 for v in sorted_vals if v == value)
    percentile = ((count_below + 0.5 * count_equal) / n) * 100
    return min(percentile, 100)


def binary_score(value):
    """Score for sparse binary parameters: 100 if any data, 0 if none.
    Used for parameters where >90% of districts have zero values,
    making percentile ranking misleading (e.g., political influencers).
    """
    return 100 if value > 0 else 0


def assign_grade(score):
    """Assign A/B/C/D grade based on final score."""
    if score >= GRADE_THRESHOLDS["A"]:
        return "A"
    elif score >= GRADE_THRESHOLDS["B"]:
        return "B"
    elif score >= GRADE_THRESHOLDS["C"]:
        return "C"
    else:
        return "D"


def main():
    data = load_data()

    # --- Build lookups ---
    # Fix: prefer records with higher Profiles count for duplicates
    dr_lookup = build_district_lookup(data["district_reports"], "DistrictID")
    pn_lookup = build_district_lookup(data["proposed_names"], "districtid")
    att_lookup = build_district_lookup(data["attachments"], "districtid")
    pl_lookup = build_district_lookup(data["potential_leaders"], "districtid")
    pi_lookup = build_district_lookup(data["political_influencers"], "districtid")

    # Daily reports: join on mobile_no (254/254 unique mobiles overlap with district_reports)
    daily_by_mobile_dist, daily_by_mobile = build_daily_report_lookup(data["daily_reports"])

    # --- Collect all district IDs ---
    all_district_ids = set()
    for ds in [dr_lookup, pn_lookup, att_lookup, pl_lookup, pi_lookup]:
        all_district_ids.update(ds.keys())

    # --- Extract raw values for percentile computation ---
    # All arrays use the same base: all_district_ids (592 districts)
    all_pn = [pn_lookup.get(d, {}).get("Profiles", 0) for d in all_district_ids]
    all_att = [att_lookup.get(d, {}).get("Profiles", 0) for d in all_district_ids]
    all_pl = [pl_lookup.get(d, {}).get("Profiles", 0) for d in all_district_ids]
    all_pi = [pi_lookup.get(d, {}).get("Profiles", 0) for d in all_district_ids]

    # First pass to resolve daily report values per district via mobile_no join,
    # then compute percentiles on the same 592-district base
    daily_values_by_district = {}
    for did in all_district_ids:
        dr_rec = dr_lookup.get(did, {})
        pn_rec = pn_lookup.get(did, {})
        mobile = dr_rec.get("mobile_no") or pn_rec.get("mobile_no") or ""
        district = dr_rec.get("DistrictName") or pn_rec.get("DistrictName") or ""
        daily_rec = match_daily_report(mobile, district, daily_by_mobile_dist, daily_by_mobile)
        daily_values_by_district[did] = (daily_rec.get("Total", 0) or 0) if daily_rec else 0

    all_daily_totals = [daily_values_by_district[d] for d in all_district_ids]

    # --- Score each district ---
    daily_match_count = 0
    results = []
    for did in sorted(all_district_ids):
        dr_rec = dr_lookup.get(did, {})
        observer = dr_rec.get("Observer", pn_lookup.get(did, {}).get("Observer", "UNKNOWN"))
        district = dr_rec.get("DistrictName", pn_lookup.get(did, {}).get("DistrictName", "UNKNOWN"))
        state = dr_rec.get("statename", pn_lookup.get(did, {}).get("statename", "UNKNOWN"))

        # Raw values
        has_district_report = 1 if dr_rec.get("Profiles", 0) > 0 else 0
        proposed_count = pn_lookup.get(did, {}).get("Profiles", 0)
        attachment_count = att_lookup.get(did, {}).get("Profiles", 0)
        leader_count = pl_lookup.get(did, {}).get("Profiles", 0)
        influencer_count = pi_lookup.get(did, {}).get("Profiles", 0)

        # Daily report: use pre-computed matched value
        daily_total = daily_values_by_district[did]
        if daily_total > 0:
            daily_match_count += 1

        # Component scores (0-100 scale)
        s_district_report = 100 if has_district_report else 0
        s_proposed = percentile_score(proposed_count, all_pn)
        s_daily = percentile_score(daily_total, all_daily_totals)
        s_attachments = percentile_score(attachment_count, all_att)
        s_leaders = percentile_score(leader_count, all_pl)
        # Influencers: pinned to binary scoring. The field is sparse by design
        # (>90% zero in current data); percentile would award ~46 points to
        # everyone with a zero value.
        s_influencers = binary_score(influencer_count)

        # Weighted final score
        final_score = (
            WEIGHTS["district_report"] * s_district_report +
            WEIGHTS["proposed_names"] * s_proposed +
            WEIGHTS["daily_reports"] * s_daily +
            WEIGHTS["supporting_docs"] * s_attachments +
            WEIGHTS["potential_leaders"] * s_leaders +
            WEIGHTS["political_influencers"] * s_influencers
        )

        # Fix: grade based on rounded score to avoid display inconsistency
        # (e.g., score 69.97 rounding to 70.0 but grading as B)
        rounded_score = round(final_score, 1)
        grade = assign_grade(rounded_score)

        results.append({
            "DistrictID": did,
            "State": state,
            "District": district,
            "Observer": observer,
            "Grade": grade,
            "FinalScore": rounded_score,
            "DistrictReport_Submitted": has_district_report,
            "ProposedNames_Count": proposed_count,
            "DailyReports_Count": daily_total,
            "Attachments_Count": attachment_count,
            "PotentialLeaders_Count": leader_count,
            "Influencers_Count": influencer_count,
            "Score_DistrictReport": round(s_district_report, 1),
            "Score_ProposedNames": round(s_proposed, 1),
            "Score_DailyReports": round(s_daily, 1),
            "Score_Attachments": round(s_attachments, 1),
            "Score_PotentialLeaders": round(s_leaders, 1),
            "Score_Influencers": round(s_influencers, 1),
        })

    print(f"[Daily report matches: {daily_match_count}/{len(all_district_ids)} districts]")

    # --- Sort by score descending ---
    results.sort(key=lambda x: x["FinalScore"], reverse=True)

    # ============================================================
    # OUTPUT: Summary Report
    # ============================================================
    print("=" * 80)
    print("AICC OBSERVERS GRADING REPORT - DCC READINESS ASSESSMENT")
    print("=" * 80)

    # Grade distribution
    grade_counts = defaultdict(int)
    grade_districts = defaultdict(list)
    for r in results:
        grade_counts[r["Grade"]] += 1
        grade_districts[r["Grade"]].append(r)

    print("\n--- GRADING CRITERIA ---")
    print(f"  Weight: District Report Submitted    = {WEIGHTS['district_report']*100:.0f}%")
    print(f"  Weight: Proposed Names (DCC/CCC)     = {WEIGHTS['proposed_names']*100:.0f}%")
    print(f"  Weight: Daily Activity Reports        = {WEIGHTS['daily_reports']*100:.0f}%")
    print(f"  Weight: Supporting Documents          = {WEIGHTS['supporting_docs']*100:.0f}%")
    print(f"  Weight: Potential Leaders Identified   = {WEIGHTS['potential_leaders']*100:.0f}%")
    print(f"  Weight: Non-Political Influencers      = {WEIGHTS['political_influencers']*100:.0f}%")

    print(f"\n--- GRADE THRESHOLDS ---")
    print(f"  A (Excellent)          : Score >= {GRADE_THRESHOLDS['A']}")
    print(f"  B (Good)               : Score >= {GRADE_THRESHOLDS['B']}")
    print(f"  C (Needs Improvement)  : Score >= {GRADE_THRESHOLDS['C']}")
    print(f"  D (Poor)               : Score <  {GRADE_THRESHOLDS['C']}")

    print(f"\n--- GRADE DISTRIBUTION ---")
    total = len(results)
    for g in ["A", "B", "C", "D"]:
        cnt = grade_counts[g]
        pct = cnt / total * 100
        bar = "#" * int(pct / 2)
        print(f"  Grade {g}: {cnt:>4} districts ({pct:5.1f}%)  {bar}")

    # Score statistics
    scores = [r["FinalScore"] for r in results]
    print(f"\n--- SCORE STATISTICS ---")
    print(f"  Mean Score:   {statistics.mean(scores):.1f}")
    print(f"  Median Score: {statistics.median(scores):.1f}")
    print(f"  Std Dev:      {statistics.stdev(scores):.1f}")
    print(f"  Min Score:    {min(scores):.1f}")
    print(f"  Max Score:    {max(scores):.1f}")

    # State-wise summary
    print(f"\n--- STATE-WISE GRADE SUMMARY ---")
    state_grades = defaultdict(lambda: defaultdict(int))
    state_totals = defaultdict(int)
    for r in results:
        state_grades[r["State"]][r["Grade"]] += 1
        state_totals[r["State"]] += 1

    print(f"  {'State':<30} | {'Total':>5} | {'A':>4} | {'B':>4} | {'C':>4} | {'D':>4} | {'Avg Score':>9}")
    print(f"  {'-'*30}-+-{'-'*5}-+-{'-'*4}-+-{'-'*4}-+-{'-'*4}-+-{'-'*4}-+-{'-'*9}")
    for state in sorted(state_totals.keys()):
        sg = state_grades[state]
        state_scores = [r["FinalScore"] for r in results if r["State"] == state]
        avg = statistics.mean(state_scores) if state_scores else 0
        print(f"  {state:<30} | {state_totals[state]:>5} | {sg['A']:>4} | {sg['B']:>4} | {sg['C']:>4} | {sg['D']:>4} | {avg:>8.1f}")

    # Top 20 performers
    print(f"\n--- TOP 20 PERFORMERS (Grade A) ---")
    print(f"  {'#':>3} | {'Observer':<40} | {'District':<25} | {'State':<20} | {'Score':>5} | {'Grade'}")
    print(f"  {'-'*3}-+-{'-'*40}-+-{'-'*25}-+-{'-'*20}-+-{'-'*5}-+-{'-'*5}")
    for i, r in enumerate(results[:20], 1):
        print(f"  {i:>3} | {r['Observer'][:40]:<40} | {r['District'][:25]:<25} | {r['State'][:20]:<20} | {r['FinalScore']:>5.1f} | {r['Grade']}")

    # Bottom 20
    print(f"\n--- BOTTOM 20 (Grade D - Needs Attention) ---")
    print(f"  {'#':>3} | {'Observer':<40} | {'District':<25} | {'State':<20} | {'Score':>5} | {'Grade'}")
    print(f"  {'-'*3}-+-{'-'*40}-+-{'-'*25}-+-{'-'*20}-+-{'-'*5}-+-{'-'*5}")
    for i, r in enumerate(results[-20:], len(results)-19):
        print(f"  {i:>3} | {r['Observer'][:40]:<40} | {r['District'][:25]:<25} | {r['State'][:20]:<20} | {r['FinalScore']:>5.1f} | {r['Grade']}")

    # ============================================================
    # EXPORT: Full results to CSV
    # ============================================================
    csv_file = "consolidated_district_grading.csv"
    fieldnames = [
        "DistrictID", "State", "District", "Observer", "Grade", "FinalScore",
        "DistrictReport_Submitted", "ProposedNames_Count", "DailyReports_Count",
        "Attachments_Count", "PotentialLeaders_Count", "Influencers_Count",
        "Score_DistrictReport", "Score_ProposedNames", "Score_DailyReports",
        "Score_Attachments", "Score_PotentialLeaders", "Score_Influencers",
    ]
    # Sort by DistrictID for stable diffs
    results_for_csv = sorted(results, key=lambda x: x["DistrictID"])
    with open(csv_file, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results_for_csv)
    print(f"\n[CSV exported: {csv_file} with {len(results)} records]")


if __name__ == "__main__":
    main()
