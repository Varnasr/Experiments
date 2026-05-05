# DCC Readiness Grading — Methodology & Data Quality Notes

**Output:** `consolidated_district_grading.csv` (744 districts, A/B/C/D)
**Source data:** AICC Observers portal (`aiccobservers.in`) — extracted and committed in `aicc_analysis/`
**Refresh:** `python3 refresh_all.py` does a complete fresh pull of every endpoint (summaries, details, daily reports, observer roster) and rebuilds `all_timestamps.csv`. Then run `grading_system.py` and `infer_observer_caste.py` to regenerate the analysis outputs.
**Last verified:** independent end-to-end recompute, deterministic across runs.

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
- **Count components** (Proposed Names, Daily Reports, Supporting Documents, Potential Leaders): percentile rank against all 744 districts on the same scale.
  - `score = ((count_below + 0.5 × count_equal) / N) × 100`  (N = total districts in the grading universe; currently 744)
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

- **District identity:** all five summary endpoints + timestamps share `DistrictID`. 744 unique IDs are present in every source.
- **Daily reports → districts:** joined on `(mobile_no, district_name)`. The portal uses the `X_` prefix on mobile numbers for some observers; this prefix is symmetric across `district_reports.json` and `daily_reports.json`, so exact-string matching is correct (do not consolidate). Where suffix variants exist under one mobile (e.g., `Virudhunagar East` and `Virudhunagar West`), the join uses raw upper-case match first; falls back to suffix-normalised match only when exactly one candidate exists. **524/744 districts have non-zero daily activity** matched cleanly. The 68 unmatched are not join failures — they're observers whose daily reports cover districts other than their formal assignment (verified: same mobile, same observer, different district set).
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
| A | 101 | 13.6% |
| B | 344 | 46.2% |
| C | 240 | 32.3% |
| D | 59 | 7.9% |

Mean score 49.0, median 50.0. Distribution shifted vs. the prior pull because (a) data depth grew across every component, pulling the median up, and (b) the percentile base now includes 4 newly-active states.

**State coverage:** 23 states (was 19). New since the prior pull: **Gujarat (40 districts), Haryana (32), Madhya Pradesh (71), Tripura (9)**. Maharashtra/Delhi/Arunachal Pradesh kept the same district counts but their per-district activity levels grew sharply — Maharashtra went from 41 zero-activity districts to 0; Delhi 7→0; Arunachal Pradesh 22→0.

---

## Data quality notes

These are characteristics of the **source data** that reviewers should know when interpreting the report. None of them affects the grading arithmetic — the grader correctly counts what the source says.

### 1. Stale summary counts (10 districts, 4 components)
The summary `Profiles` field on the JSON endpoints lags the per-record timestamps in 10 (district, component) cells. Worst case: Patna Rural 2 attachments = 12 in summary vs 22 in timestamps. The grader uses the timestamps count where they differ (`max(timestamps, Profiles)`).

### 2. Proposed-name timestamps are date-only
All 3,630 `Proposed_Name` records have a `Created_Date` time of exactly `00:00:00 UTC`. The AICC API stores candidate proposals as date-only fields. Other DataTypes have full timestamps. **Implication:** any time-of-day analysis only works for the other four DataTypes.

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
The 744 districts span **19 states + UTs**. Several large states are absent from the AICC observer dataset entirely (Kerala, Madhya Pradesh, Uttar Pradesh, West Bengal, Gujarat, Karnataka, Haryana, etc.) — this is a function of which states had active observer assignments at extraction time, not a data loss.

---

## Files

**Refresh pipeline (run in this order):**
1. `refresh_all.py` — one-shot pull of every AICC endpoint; rebuilds the seven raw extracts and `all_timestamps.csv`. Requires `AICC_USERNAME` / `AICC_PASSWORD` env vars (see root `.env.example`).
2. `grading_system.py` — regenerates `consolidated_district_grading.csv`.
3. `infer_observer_caste.py` — regenerates `observers_inferred_caste.csv`.

**Outputs:**
- `consolidated_district_grading.csv` — final grading output (744 rows)
- `candidates_detailed.csv` — 3,630 candidate-level profiles (slim 31-column form; raw JSON is dropped because per-candidate free-text essays push it past GitHub's 100 MB file limit)
- `all_timestamps.csv` — 11,678 per-record submission events (authoritative count source)
- `district_analysis.csv` / `.json` — 661 per-district analysis records with caste percentages, political-faction text, important-leader counts
- `attachments_detailed.{csv,json}` — 3,624 attachment records with `file_path` / `uploaded_date`
- `potential_leaders_detailed.{csv,json}` — 3,541 potential-leader records (per-record caste field)
- `political_influencers_detailed.{csv,json}` — 222 political-influencer records (per-record caste field)
- `daily_reports.json` — 686 observer-x-district records with cumulative `Total` and per-day counts
- `observers_master.{csv,json}` — 374 observer roster records (passwords / access codes deliberately not captured)
- `observers_inferred_caste.csv` — observer-level inferred religion + category with confidence tier
- Five summary JSONs: `district_reports.json` / `proposed_names.json` / `attachments.json` / `potential_leaders.json` / `political_influencers.json` — one row per district with the `Profiles` count

**Legacy scripts (kept for reference; superseded by `refresh_all.py`):**
- `extract_candidates.py` — old candidate-only puller
- `extract_district_analysis.py` — old district-analysis + observer-master puller

---

## Observer-caste inference

**The AICC portal does not expose observer caste.** None of the seven endpoints we extract has a caste/category/religion field on the observer record. To answer the population-level question "what is the religion + caste mix of the observers?", `infer_observer_caste.py` does name-based inference and labels every guess with an explicit confidence tier.

### Method

1. **Religion (high confidence)** — match name tokens against curated Muslim, Sikh, and Christian first/last-name dictionaries. `SINGH` alone is treated as ambiguous (Rajput vs. Sikh) unless a second Sikh marker is present (e.g., `KAUR`, distinctive Punjabi first name, Sikh-only surname like `SANDHU`/`GILL`/`DHILLON`).

2. **Hindu category — empirical** — for non-religious names, compute the surname's distribution of `Category` values across the 3,630 self-declared candidate records (the same population). If the surname has ≥5 candidates with ≥80% concentrated in one Category, label `HIGH_SURNAME`. If ≥2 candidates with ≥60% concentration, label `MEDIUM`. Otherwise drop through.

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

### Coverage and distribution (354 unique observers, dummies removed)

- **Coverage with non-empty inferred category:** 255 / 354 = **72%**
- **Tier distribution:** 50 `HIGH_RELIGION` / 31 `HIGH_SURNAME` / 128 `MEDIUM` / 145 `LOW_AMBIGUOUS`
- **Religion (best-guess):** Hindu 205 (58%) · Muslim 30 (8%) · Sikh 11 (3%) · Christian 9 (3%) · Unknown 99 (28%)
- **Category (best-guess, among 255 categorised):** General 93 (36%) · OBC 82 (32%) · Minority 34 (13%) · Others 20 (8%) · SC 17 (7%) · ST 9 (4%)

### Caveats — read before using

> **This is inference, not identity.** The Caste/Category column in `observers_inferred_caste.csv` is *guessed from name patterns + the candidate-population training signal*. It is not self-declaration and some observers will identify differently than their name suggests.
>
> Use only for **population-level summaries** ("≥X% of HIGH-tier-categorised observers have General-coded surnames"). **Do not** attribute caste to individual observers in any public-facing deliverable; the per-observer rows are present so AICC can cross-check, not to be republished.
>
> When summarising, exclude `LOW_AMBIGUOUS` rows or report the share separately so consumers don't read a coin-flip as a measurement. Roughly 29% of observers couldn't be confidently categorised at all.

## Reproducibility

```bash
cd aicc_analysis

# 1. Fresh pull from the AICC portal (replaces every raw extract)
AICC_USERNAME=… AICC_PASSWORD=… python3 refresh_all.py

# 2. Regenerate the grading
python3 grading_system.py        # writes consolidated_district_grading.csv

# 3. Regenerate the observer caste inference
python3 infer_observer_caste.py  # writes observers_inferred_caste.csv
```

Both `grading_system.py` and `infer_observer_caste.py` are deterministic given the same input — re-running on identical inputs produces a byte-identical CSV (sha256 stable). `refresh_all.py` reflects whatever the AICC portal currently exposes; counts therefore grow over time as observers add more data.
