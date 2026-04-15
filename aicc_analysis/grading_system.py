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
    """
    lookup = {}
    for r in records:
        did = r.get(id_key) or r.get("districtid")
        if did:
            if did in lookup:
                # Keep the record with more data (higher Profiles count)
                existing = lookup[did].get("Profiles", 0)
                new = r.get("Profiles", 0)
                if new > existing:
                    lookup[did] = r
            else:
                lookup[did] = r
    return lookup


def normalize_district_name(name):
    """Normalize district name for fuzzy matching.
    Strips 'City', 'Urban', 'Rural', 'East', 'West', 'North', 'South'
    suffixes to match parent districts.
    """
    if not name:
        return ""
    n = name.strip().upper()
    # Remove common suffixes that create mismatches
    n = re.sub(r'\s+(CITY|URBAN|RURAL)\s*$', '', n)
    return n.strip()


def build_daily_report_lookup(records):
    """
    Daily reports are keyed by observer name + district.
    Build multiple lookup keys per record:
      - exact (observer, district) match
      - also index by observer alone for fallback
    """
    lookup = {}
    # Index by observer -> list of records for fallback matching
    observer_records = defaultdict(list)
    for r in records:
        obs = (r.get("Observer") or "").strip().upper()
        dist = (r.get("District") or "").strip().upper()
        key = (obs, dist)
        lookup[key] = r
        observer_records[obs].append(r)
    return lookup, observer_records


def match_daily_report(observer, district, daily_lookup, observer_records):
    """Match a district to its daily report using multi-level fallback:
    1. Exact (observer, district) match
    2. Normalized name match (strip 'City'/'Urban'/'Rural' suffix)
    3. Substring match within same observer's records
    """
    obs = observer.strip().upper()
    dist = district.strip().upper()

    # Level 1: Exact match
    rec = daily_lookup.get((obs, dist))
    if rec:
        return rec

    # Level 2: Normalized match (e.g., "Kurnool City" -> "Kurnool")
    norm_dist = normalize_district_name(district)
    if norm_dist != dist:
        rec = daily_lookup.get((obs, norm_dist))
        if rec:
            return rec

    # Level 3: Substring match within same observer's records
    obs_recs = observer_records.get(obs, [])
    for r in obs_recs:
        r_dist = (r.get("District") or "").strip().upper()
        # Check if one is a substring of the other
        if norm_dist and r_dist and (norm_dist in r_dist or r_dist in norm_dist):
            return r

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

    # Daily reports: build both exact lookup and observer-indexed fallback
    dr_daily_lookup, dr_observer_records = build_daily_report_lookup(data["daily_reports"])

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

    # Fix: First pass to resolve daily report values per district,
    # then compute percentiles on the same 592-district base
    daily_values_by_district = {}
    for did in all_district_ids:
        dr_rec = dr_lookup.get(did, {})
        observer = dr_rec.get("Observer", pn_lookup.get(did, {}).get("Observer", "UNKNOWN"))
        district = dr_rec.get("DistrictName", pn_lookup.get(did, {}).get("DistrictName", "UNKNOWN"))
        daily_rec = match_daily_report(observer, district, dr_daily_lookup, dr_observer_records)
        daily_values_by_district[did] = (daily_rec.get("Total", 0) or 0) if daily_rec else 0

    all_daily_totals = [daily_values_by_district[d] for d in all_district_ids]

    # Check sparsity: use binary scoring for parameters where >85% are zero
    pi_zero_pct = sum(1 for v in all_pi if v == 0) / len(all_pi) if all_pi else 0
    use_binary_influencers = pi_zero_pct > 0.85

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
        # Fix: use binary scoring for influencers (91.6% zero — percentile is misleading)
        if use_binary_influencers:
            s_influencers = binary_score(influencer_count)
        else:
            s_influencers = percentile_score(influencer_count, all_pi)

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
            "District": district,
            "State": state,
            "Observer": observer,
            "DistrictReport": has_district_report,
            "ProposedNames": proposed_count,
            "DailyReports": daily_total,
            "SupportingDocs": attachment_count,
            "PotentialLeaders": leader_count,
            "Influencers": influencer_count,
            "Score_DistrictReport": round(s_district_report, 1),
            "Score_ProposedNames": round(s_proposed, 1),
            "Score_DailyReports": round(s_daily, 1),
            "Score_SupportingDocs": round(s_attachments, 1),
            "Score_PotentialLeaders": round(s_leaders, 1),
            "Score_Influencers": round(s_influencers, 1),
            "FinalScore": rounded_score,
            "Grade": grade,
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
    csv_file = "grading_results.csv"
    fieldnames = [
        "Grade", "FinalScore", "State", "District", "Observer",
        "DistrictReport", "ProposedNames", "DailyReports",
        "SupportingDocs", "PotentialLeaders", "Influencers",
        "Score_DistrictReport", "Score_ProposedNames", "Score_DailyReports",
        "Score_SupportingDocs", "Score_PotentialLeaders", "Score_Influencers",
        "DistrictID"
    ]
    with open(csv_file, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    print(f"\n[CSV exported: {csv_file} with {len(results)} records]")

    # Export state summary
    state_csv = "grading_state_summary.csv"
    with open(state_csv, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["State", "Total", "Grade_A", "Grade_B", "Grade_C", "Grade_D", "Avg_Score"])
        for state in sorted(state_totals.keys()):
            sg = state_grades[state]
            state_scores = [r["FinalScore"] for r in results if r["State"] == state]
            avg = statistics.mean(state_scores) if state_scores else 0
            writer.writerow([state, state_totals[state], sg["A"], sg["B"], sg["C"], sg["D"], round(avg, 1)])
    print(f"[CSV exported: {state_csv}]")


if __name__ == "__main__":
    main()
