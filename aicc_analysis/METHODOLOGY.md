# DCC Readiness Grading — Methodology & Data Quality Notes

**Output:** `consolidated_district_grading.csv` (592 districts, A/B/C/D)
**Source data:** AICC Observers portal (`aiccobservers.in`) — extracted and committed in `aicc_analysis/`
**Last verified:** independent end-to-end recompute, **0 errors across 8,288 cells** (592 districts × 14 fields), deterministic across runs.

---

## What we graded

Each AICC-appointed district observer was graded on six components, weighted by their relative importance to DCC-readiness:

| Component | Weight | What it measures |
|---|---:|---|
| District Report submitted | 15% | Did the observer file the formal district profile? (binary) |
| Proposed Names (DCC/CCC) | 25% | How many candidates did the observer propose for DCC/CCC slots? |
| Daily Activity Reports | 25% | Cumulative daily activity total over the observation window |
| Supporting Documents | 15% | Volume of attached evidence/documentation |
| Potential Leaders identified | 10% | Count of potential leaders surfaced in the district |
| Non-Political Influencers identified | 10% | Whether non-political community influencers were mapped (binary) |

Weights sum to **1.00**.

## Scoring math

- **Binary components** (District Report, Influencers): `100` if any submission, `0` otherwise.
- **Count components** (Proposed Names, Daily Reports, Supporting Documents, Potential Leaders): percentile rank against all 592 districts on the same scale.
  - `score = ((count_below + 0.5 × count_equal) / 592) × 100`
  - **Hard floor:** if the raw count is `0`, the score is `0` (no credit for "did nothing", regardless of how many other districts also scored zero).
- **Final score:** weighted sum of component scores, rounded to one decimal.
- **Grade:** assigned on the rounded final score.

| Grade | Threshold |
|---|---|
| A — Excellent | ≥ 70 |
| B — Good | ≥ 45 |
| C — Needs Improvement | ≥ 20 |
| D — Poor | < 20 |

## Joins

- **District identity:** all five summary endpoints + timestamps share `DistrictID`. 592 unique IDs are present in every source.
- **Daily reports → districts:** joined on `(mobile_no, district_name)`. The portal uses the `X_` prefix on mobile numbers for some observers; this prefix is symmetric across `district_reports.json` and `daily_reports.json`, so exact-string matching is correct (do not consolidate). Where suffix variants exist under one mobile (e.g., `Virudhunagar East` and `Virudhunagar West`), the join uses raw upper-case match first; falls back to suffix-normalised match only when exactly one candidate exists. **524/592 districts have non-zero daily activity** matched cleanly. The 68 unmatched are not join failures — they're observers whose daily reports cover districts other than their formal assignment (verified: same mobile, same observer, different district set).
- **Counts source-of-truth:** `all_timestamps.csv` (per-record creation events) is authoritative. Where the summary `Profiles` count lags the per-record count (10 known cases — see Item #4 below), the grader uses `max(timestamps, Profiles)`.
- **Duplicate handling:** `DistrictID 1894` (SBS Nagar) appears twice in every source — once with `Profiles=0` and once with the real activity. The grader keeps the higher-Profiles record. Two records have null `DistrictID` (CHALLA VAMSHI CHAND REDDY, Sunil Ahire); both have `Profiles=0` everywhere, so they're correctly dropped.

## Verification

- **Independent recompute:** every cell of every district recomputed from raw sources by a separate hand-coded implementation. 0 discrepancies.
- **Determinism:** consecutive grader runs produce identical CSV (sha256 stable).
- **Hand-calc boundary case:** DistrictID 1817 (Hazaribagh) sits exactly at the A/B threshold:
  `0.15·100 + 0.25·73.7 + 0.25·97.9 + 0.15·80.6 + 0.10·0 + 0.10·0 = 69.99 → rounds to 70.0 → Grade A` ✓.

## Final grade distribution

| Grade | Districts | Share |
|---|---:|---:|
| A | 103 | 17.4% |
| B | 265 | 44.8% |
| C | 110 | 18.6% |
| D | 114 | 19.3% |

Mean score 46.5, median 52.2.

---

## Data quality notes

These are characteristics of the **source data** that reviewers should know when interpreting the report. None of them affects the grading arithmetic — the grader correctly counts what the source says.

### 1. Stale summary counts (10 districts, 4 components)
The summary `Profiles` field on the JSON endpoints lags the per-record timestamps in 10 (district, component) cells. Worst case: Patna Rural 2 attachments = 12 in summary vs 22 in timestamps. The grader uses the timestamps count where they differ (`max(timestamps, Profiles)`).

### 2. Proposed-name timestamps are date-only
All 2,413 `Proposed_Name` records have a `Created_Date` time of exactly `00:00:00 UTC`. The AICC API stores candidate proposals as date-only fields. Other DataTypes have full timestamps. **Implication:** any time-of-day analysis only works for the other four DataTypes.

### 3. "Daily" reports are often not actually daily
127 districts have a single day accounting for ≥50% of their entire daily-activity total; some have 100% concentration on one day (e.g., Surajpur: 60/63 in one day; Bilaigarh-sarangarh: 69/69 in one day). Many observers batch-submitted rather than filing day-by-day. The 9,581 cumulative daily-report total is correct, but interpret "daily reporting cadence" with caution.

### 4. Daily activity often precedes the formal district profile
360 observer-district pairs filed daily activity earlier than they filed the formal district profile. This is **legitimate field work being formalised retroactively**, not a data inconsistency.

### 5. Bursty mass uploads on attachment / leader counts
The largest single-day uploads:
- SHRI CHARAN SINGH SAPRA: 382 attachments for Rajnandgaon Rural on 2025-10-15
- SHRI RC KHUNTIA: 212 potential leaders for Northchennai West on 2025-12-16
- MS SOFIA FIRDOUS: 163 potential leaders for CITY KOTDWAR on 2025-09-13

All counts verified against timestamps; no double-counting. Whether bulk uploads represent the same engagement quality as steady accumulation is a methodology call for AICC.

### 6. Observer-as-candidate (8 cases) — flag for conflict-of-interest review
Eight candidates list a mobile number that matches an observer's mobile, suggesting observers proposing themselves in their own districts:

| Candidate | District | Observer mobile match |
|---|---|---|
| Sofia Firdous | Cuttack | ✓ |
| Dr. Shikha Meel Barala | Jaipur Rural (West) | ✓ |
| Ms. Rita Choudhary | Jhunjhunu | ✓ |
| Ravindradass R | South Chennai East | ✓ |
| K Mahendran | Thanjavur South | ✓ |

(plus three others). May be legitimate where the observer is also a regional party leader, but worth explicit AICC review.

### 7. Possible candidate duplicates
- 17 mobile numbers shared by >1 candidate; most are typo-pairs (`G.TIKARAM` vs `G.Tikaram`, `B.Muralidhar` vs `B .Muralidhar`). One genuinely suspicious: mobile `8143447555` shared by `Koka Phani Bhushan` and `Nallabrollu Kumari`.
- 21 candidate names appearing twice; mostly legitimate city/rural-twin districts (Chittoor City + Chittoor; Kakinada City + Kakinada). A few common names may represent different people in different states.

### 8. Observer engagement windows
- Median observer active window: **13 days**
- 64 of 236 active observers (27%) filed for fewer than 7 days
- 17 of 253 DR observers (7%) filed no daily activity at all (their districts correctly score 0 on the daily component)

### 9. Asymmetric submissions
- **31 districts** have proposed names ≥1 but no formal district profile filed.
- **71 districts** have daily activity but no formal district profile filed.
The grader treats these as separate signals — districts get credit for what they actually did. Observers may have prioritised candidate work over the formal report.

### 10. Recent-joiner candidates
Year_Joined_INC distribution shows 67 candidates joined the party in 2024–2026 (just before screening). This is a fact about the candidate pool, not the grading; flagged for AICC vetting if "parachute candidate" risk is a concern.

### 11. State coverage
The 592 districts span **19 states + UTs**. Several large states are absent from the AICC observer dataset entirely (Kerala, Madhya Pradesh, Uttar Pradesh, West Bengal, Gujarat, Karnataka, Haryana, etc.) — this is a function of which states had active observer assignments at extraction time, not a data loss.

---

## Files

- `grading_system.py` — scoring engine
- `extract_candidates.py` — candidate-detail puller (requires `AICC_USERNAME` / `AICC_PASSWORD` env vars; see root `.env.example`)
- `extract_district_analysis.py` — pulls per-district analysis (TypeId=29) and observer roster (TypeId=40, with `password`/`access_code` stripped on read)
- `infer_observer_caste.py` — best-guess religion/caste inference from observer names (see "Observer-caste inference" section below)
- `consolidated_district_grading.csv` — final grading output (592 rows)
- `candidates_detailed.csv` — 2,413 candidate-level profiles
- `all_timestamps.csv` — 9,104 per-record submission events (authoritative count source)
- `district_analysis.csv` / `.json` — 558 per-district analysis records with caste percentages, political-faction text, etc.
- `observers_master.csv` / `.json` — 360 observer roster records (passwords / access codes deliberately not captured)
- `observers_inferred_caste.csv` — observer-level inferred religion + category with confidence tier
- `*.json` — raw AICC API extracts

---

## Observer-caste inference

**The AICC portal does not expose observer caste.** None of the seven endpoints we extract has a caste/category/religion field on the observer record. To answer the population-level question "what is the religion + caste mix of the observers?", `infer_observer_caste.py` does name-based inference and labels every guess with an explicit confidence tier.

### Method

1. **Religion (high confidence)** — match name tokens against curated Muslim, Sikh, and Christian first/last-name dictionaries. `SINGH` alone is treated as ambiguous (Rajput vs. Sikh) unless a second Sikh marker is present (e.g., `KAUR`, distinctive Punjabi first name, Sikh-only surname like `SANDHU`/`GILL`/`DHILLON`).

2. **Hindu category — empirical** — for non-religious names, compute the surname's distribution of `Category` values across the 2,413 self-declared candidate records (the same population). If the surname has ≥5 candidates with ≥80% concentrated in one Category, label `HIGH_SURNAME`. If ≥2 candidates with ≥60% concentration, label `MEDIUM`. Otherwise drop through.

3. **Hindu category — curated dict fallback** — for surnames not covered by candidates, use a conservative hand-curated dictionary (Sharma/Mishra/Tiwari/etc. → General; Yadav/Kurmi/Mahato → OBC; Munda/Tudu/Soren → ST; …). Only includes surnames with well-known nationally-consistent mappings; state-context-dependent surnames (`PATEL`, `MEENA`, `SINGH`, `THAKUR`) are deliberately omitted and remain `LOW_AMBIGUOUS`.

4. **Generic-token stoplist** — `KUMAR`, `LAL`, `PRASAD`, `DEVI`, `CHANDRA`, `CHAND`, `NATH`, `BABU`, `BAI` carry no caste signal; if these are the last token, the inference falls back to the second-to-last token.

5. **Deduplication** — observers registered under multiple name formats (e.g., `DR. PALAK VERMA` and `DR PALAK VERMA, AICC JNT. SECRETARY`) share a mobile number; the script collapses each `mobile_no` group to its highest-confidence record.

### Confidence tiers

| Tier | Method | Expected accuracy |
|---|---|---|
| `HIGH_RELIGION` | distinctive Muslim/Sikh/Christian token | ~95% |
| `HIGH_SURNAME` | surname has ≥5 candidates, ≥80% in one Category | ~90% |
| `MEDIUM` | ≥2 candidates with ≥60% concentration, OR curated-dict match | ~70–80% |
| `LOW_AMBIGUOUS` | sparse, split, or unknown surname | uncertain — treat as no signal |

### Validation

8 observers also appear as DCC candidates in `candidates_detailed.csv` and have self-declared `Category` there. After deduplication, 7 unique observer–candidate ground-truth pairs. The script logs a per-observer comparison; current accuracy on this set is **5/7 = 71%**, with the failures concentrated in `LOW_AMBIGUOUS` rows (which by design we don't claim to know).

### Coverage and distribution (340 unique observers, dummies removed)

- **Coverage with non-empty inferred category:** 242 / 340 = **71%**
- **Tier distribution:** 47 `HIGH_RELIGION` / 40 `HIGH_SURNAME` / 107 `MEDIUM` / 146 `LOW_AMBIGUOUS`
- **Religion (best-guess):** Hindu 195 (57%) · Muslim 27 (8%) · Sikh 11 (3%) · Christian 9 (3%) · Unknown 98 (29%)
- **Category (best-guess, among 242 categorised):** General 88 (36%) · OBC 76 (31%) · Minority 31 (13%) · Others 20 (8%) · SC 18 (7%) · ST 9 (4%)

### Caveats — read before using

> **This is inference, not identity.** The Caste/Category column in `observers_inferred_caste.csv` is *guessed from name patterns + the candidate-population training signal*. It is not self-declaration and some observers will identify differently than their name suggests.
>
> Use only for **population-level summaries** ("≥X% of HIGH-tier-categorised observers have General-coded surnames"). **Do not** attribute caste to individual observers in any public-facing deliverable; the per-observer rows are present so AICC can cross-check, not to be republished.
>
> When summarising, exclude `LOW_AMBIGUOUS` rows or report the share separately so consumers don't read a coin-flip as a measurement. Roughly 29% of observers couldn't be confidently categorised at all.

## Reproducibility

```bash
cd aicc_analysis
python3 grading_system.py
# Output: consolidated_district_grading.csv
# Stable sha256 hash; deterministic across runs.
```
