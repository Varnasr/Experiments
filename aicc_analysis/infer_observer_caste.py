#!/usr/bin/env python3
"""
Infer observer religion + caste category from observer names, using
the 2,413 candidate-caste records as an empirical training signal.

This is INFERENCE, not identity. Output is suitable only for
population-level summaries. See METHODOLOGY.md for caveats.

Inputs:
  - observers_master.csv   (360 observer records)
  - candidates_detailed.csv (2,413 candidates with self-declared caste)
  - district_reports.json  (for the observer-as-candidate ground-truth join)

Output:
  - observers_inferred_caste.csv
"""

import csv
import json
import re
import sys
from collections import defaultdict, Counter


# ============================================================
# Religion markers (high-confidence patterns)
# ============================================================

MUSLIM_TOKENS = {
    # Honorifics / titles often paired with Muslim names
    'MOHAMMED', 'MOHAMMAD', 'MUHAMMAD', 'MD', 'MD.', 'MOHD', 'MOHD.',
    # First names
    'AHMED', 'AHMAD', 'AAMIR', 'AAMIIR', 'ABDUL', 'ABID', 'ABRAR',
    'AFSAR', 'AFZAL', 'AFTAB', 'AKHTAR', 'ALI', 'AMIN', 'ANWAR',
    'ARIF', 'ASIF', 'ASLAM', 'ATAUR', 'AYUB', 'AZHAR', 'AZIM',
    'AZMATULLAH', 'BASHIR', 'FAISAL', 'FAIZ', 'FAIZAN', 'FARID',
    'FAYAZ', 'FAYYAZ', 'FAROOQ', 'FIROZ', 'GHULAM', 'HABIB', 'HAFIZ',
    'HAMID', 'HASAN', 'HASSAN', 'HUSSAIN', 'HUSAIN', 'IBRAHIM',
    'IFTIKHAR', 'IMRAN', 'INAYAT', 'IRFAN', 'ISHAQ', 'JAMAL', 'JAVED',
    'JAVID', 'JAWED', 'KAMAL', 'KAMRAN', 'KARIM', 'KHAJA', 'KHALID',
    'KHALEQ', 'KHALIQUE', 'LIYAQAT', 'MAHMOOD', 'MAQBOOL', 'MAQSOOD',
    'MASOOD', 'MOHTARAM', 'MOTAHAR', 'MUSHTAQ', 'MUSTAFA', 'NADEEM',
    'NAEEM', 'NASIR', 'NAWAZ', 'NIZAMUDDIN', 'PARVEZ', 'QASIM',
    'RAFIQ', 'RAFI', 'RAHMAN', 'RASHID', 'RIYAZ', 'RIZWAN', 'SADIQ',
    'SAHIL', 'SAJID', 'SAJJAD', 'SALEEM', 'SALIM', 'SAMEER', 'SAMI',
    'SAQIB', 'SAYEED', 'SHAHID', 'SHAKIL', 'SHARIF', 'SHEIKH', 'SHEKH',
    'SIDDIQUI', 'SUHAIL', 'SULTAN', 'SYED', 'TAHIR', 'TANVEER',
    'TARIQ', 'WAJID', 'WAQAR', 'WASEEM', 'YASIR', 'YOUSUF', 'YUSUF',
    'ZAFAR', 'ZAHID', 'ZAHIDA', 'ZAKIR', 'ZAFARYAB',
    # Common surnames
    'KHAN', 'ANSARI', 'QURESHI', 'PATHAN', 'MIRZA', 'BEG', 'BEGUM',
    'CHISHTI', 'SHAH', 'NAQVI', 'MALIK', 'AKHTAR', 'CHOUDHURY',
    'IBRAHIM', 'ZAIDI', 'KAZI', 'QAZI', 'SALMANI', 'IDRISI',
}

SIKH_TOKENS = {
    # Distinctive Sikh first/middle names
    'AMARDEEP', 'AMRITPAL', 'BALWANT', 'BIKRAM', 'BIRENDRA', 'CHARANJIT',
    'DALIP', 'DALJIT', 'DAVINDER', 'GAGANDEEP', 'GUR', 'GURBACHAN',
    'GURBINDER', 'GURDARSHAN', 'GURDEEP', 'GURDIAL', 'GURINDER',
    'GURJEET', 'GURMEET', 'GURPREET', 'GURVINDER', 'HARBHAJAN',
    'HARDEEP', 'HARJEET', 'HARJINDER', 'HARMINDER', 'HARPAL', 'HARPREET',
    'HARSIMRAT', 'HARVINDER', 'INDERJIT', 'JAGDEEP', 'JAGJIT', 'JAGTAR',
    'JASBIR', 'JASPAL', 'JASVIR', 'JASWANT', 'JAGMOHAN',
    'KULDEEP', 'KULJIT', 'KULWANT', 'LAKHWINDER', 'LAKHVINDER',
    'MALKIAT', 'MANDEEP', 'MANJIT', 'MANJINDER', 'MANMOHAN',
    'MANPREET', 'MANVIR', 'NAVDEEP', 'NAVJOT', 'NAVNEET', 'NAVTEJ',
    'NIRBHAI', 'NIRMAL', 'PALWINDER', 'PARAMJIT', 'PARMINDER',
    'PARDEEP', 'PRABHJOT', 'PRABHJIT', 'PRITAM', 'RAJ', 'RAJVINDER',
    'RANBIR', 'RANDHIR', 'RANJIT', 'RATTAN', 'RUPINDER', 'SARABJIT',
    'SATNAM', 'SATVIR', 'SHAMSHER', 'SUKHBIR', 'SUKHDEV', 'SUKHJINDER',
    'SUKHVINDER', 'SURENDRA', 'SURINDER', 'SURJEET', 'SUSHIL',
    'SWARAN', 'TAJINDER', 'TARLOCHAN', 'TEJINDER', 'UPINDER',
    'VARINDER', 'VIRENDER', 'YADWINDER',
    # Sikh surnames
    'AUJLA', 'BAINS', 'BAJWA', 'BAL', 'BHATIA', 'BHULLAR', 'BRAR',
    'CHEEMA', 'DHALIWAL', 'DHILLON', 'GILL', 'GREWAL', 'HUNDAL',
    'JOHAL', 'KAHLON', 'KHURANA', 'MANN', 'MULTANI', 'PANNU',
    'RANDHAWA', 'SANDHU', 'SARNA', 'SETHI', 'SIDHU', 'WARAICH',
    # Distinctive feminine sikh marker
    'KAUR',
    'SARDAR', 'SARDARJI', 'S.',
}

CHRISTIAN_TOKENS = {
    'ANTHONY', 'BENNY', 'CHARLES', 'CHRISTOPHER', 'DAVID', 'DEAN',
    'DOMINIC', 'FRANCIS', 'GEORGE', 'HENRY', 'JACOB', 'JAMES', 'JOHN',
    'JOSEPH', 'JUSTIN', 'LIJU', 'MANUEL', 'MARK', 'MARY', 'MATHEW',
    'MICHAEL', 'NELSON', 'PATRICK', 'PAUL', 'PETER', 'PHILIP',
    'RAPHAEL', 'RAYMOND', 'RICHARD', 'ROBERT', 'SAMUEL', 'STEPHEN',
    'THOMAS', 'TONY', 'WILLIAM', 'XAVIER',
    'ALMEIDA', 'COUTINHO', 'CRUZ', 'DSOUZA', "D'SOUZA", 'DIAS',
    'FERNANDES', 'GOMES', 'KOSHY', 'KURIAN', 'MATHAI', 'MENDEZ',
    'PINTO', 'PRINGLE', 'RAJU', 'TELLIS', 'VARGHESE',
}

# Religion priority: if a name contains both a Muslim and a generic Indian
# token, treat as Muslim (the markers are highly specific).


# ============================================================
# Surname stoplist for category inference
# (overly common; not a useful signal on its own)
# ============================================================

GENERIC_STOPLIST = {
    'KUMAR', 'KUMARI', 'LAL', 'PRASAD', 'DEVI', 'CHANDRA',
    'CHAND', 'NATH', 'BABU', 'BAI',
}


# ============================================================
# Curated surname → category fallback
# Used only when the empirical candidate data has no signal.
# Conservative: only entries where the mapping is well-known across
# regions. State-context-dependent surnames (PATEL, MEENA, SINGH,
# etc.) are deliberately omitted — they're flagged LOW_AMBIGUOUS
# instead.
# ============================================================

CURATED_SURNAME_TO_CATEGORY = {
    # Brahmin
    'SHARMA': 'General', 'MISHRA': 'General', 'MISRA': 'General',
    'TIWARI': 'General', 'TIWARY': 'General', 'PANDEY': 'General',
    'PANDE': 'General', 'JOSHI': 'General', 'TRIVEDI': 'General',
    'DUBEY': 'General', 'PATHAK': 'General', 'BHARDWAJ': 'General',
    'SHUKLA': 'General', 'CHATURVEDI': 'General', 'DWIVEDI': 'General',
    'IYER': 'General', 'IYENGAR': 'General', 'BHATT': 'General',
    'MUKHERJEE': 'General', 'BANERJEE': 'General', 'CHATTERJEE': 'General',
    'GAUR': 'General', 'AVASTHI': 'General', 'BHATTACHARYA': 'General',
    'BHATTACHARJEE': 'General', 'GANGULY': 'General', 'NAMBOOTHIRI': 'General',
    'NAMBIAR': 'General', 'KAUL': 'General', 'PANDIT': 'General',
    'YAJNIK': 'General', 'VYAS': 'General', 'OZA': 'General',
    'UPADHYAY': 'General', 'AVASTHY': 'General',
    # Khatri / Punjabi Forward
    'KAPOOR': 'General', 'MEHRA': 'General', 'KHANNA': 'General',
    'MALHOTRA': 'General', 'ARORA': 'General', 'CHADHA': 'General',
    'KHURANA': 'General', 'DHAWAN': 'General', 'VIJ': 'General',
    'DUGGAL': 'General', 'TANEJA': 'General', 'NANDA': 'General',
    'CHOPRA': 'General', 'BEDI': 'General',
    # Bania / Vaishya
    'AGARWAL': 'General', 'AGGARWAL': 'General', 'GUPTA': 'General',
    'GOEL': 'General', 'MITTAL': 'General', 'BANSAL': 'General',
    'JAIN': 'General', 'KHANDELWAL': 'General', 'MAHESHWARI': 'General',
    'GOENKA': 'General', 'BAJAJ': 'General', 'BHANDARI': 'General',
    'SARAF': 'General',
    # Rajput / Kshatriya
    'RAJPUT': 'General', 'CHAUHAN': 'General', 'TOMAR': 'General',
    'RANAUT': 'General',  # SOLANKI/THAKUR/RANA omitted (state-variable)
    # Maratha (Forward in MH classifications)
    'DESHMUKH': 'General', 'BHOSALE': 'General', 'BHOSLE': 'General',
    'SAWANT': 'General', 'NAIK': 'General',  # NAIK varies; include cautiously
    # Forward Bengali (Kayastha/Brahmin)
    'BOSE': 'General', 'GHOSH': 'General', 'SEN': 'General',
    'DEB': 'General',  # ROY too varied; skip
    # OBC
    'YADAV': 'OBC', 'MAHATO': 'OBC', 'MAHTO': 'OBC', 'KURMI': 'OBC',
    'KUSHWAHA': 'OBC', 'GUJJAR': 'OBC', 'AHIR': 'OBC', 'KOIRI': 'OBC',
    'TELI': 'OBC', 'BARAI': 'OBC', 'GOWDA': 'OBC',
    'PAWAR': 'OBC',  # Maratha/OBC borderline; mostly classified OBC
    'JADHAV': 'OBC', 'SHINDE': 'OBC', 'MORE': 'OBC',
    'NAIDU': 'OBC',  # Andhra OBC/Forward varies
    'REDDY': 'OBC',  # Andhra Forward in some classifications
    # SC
    'PASWAN': 'SC', 'ATHAWALE': 'SC', 'VALMIKI': 'SC',
    'JATAV': 'SC', 'CHAMAR': 'SC', 'BAHUJAN': 'SC', 'KHARWAR': 'SC',
    # ST
    'MUNDA': 'ST', 'TUDU': 'ST', 'SOREN': 'ST', 'HEMBROM': 'ST',
    'HANSDA': 'ST', 'MURMU': 'ST', 'KISKU': 'ST', 'GOND': 'ST',
    'BHIL': 'ST', 'KASHYAP': 'ST',
    # Sindhi Hindu (Forward) — distinctive
    'ADVANI': 'General', 'CHANDWANI': 'General', 'HIRANANDANI': 'General',
    # Other regionally common
    'MEEL': 'OBC',  # Rajasthan Jat OBC
    'JAT': 'OBC', 'JATT': 'OBC',
    'BARWE': 'SC',  # Maharashtra SC
    'KHUNTIA': 'OBC',  # Odisha OBC
    'GOHIL': 'General',  # Gujarat Rajput
    'JANGID': 'OBC',  # Rajasthan OBC (carpenter caste)
    'THAKRE': 'OBC',  # Maharashtra OBC
    'KAPRI': 'ST',  # Uttarakhand ST
    'SAPRA': 'General',  # Khatri/Punjabi
    'DUTT': 'General',  # Kashmiri Brahmin
    'LALLU': 'OBC',
    'JAYNAGARE': 'OBC',
    'KAYAS': 'OBC', 'KAYASTHA': 'General',
    'THAKOR': 'OBC',   # Gujarat Koli Thakor
    'KASWAN': 'OBC',   # Rajasthan Jat
    'MARKAM': 'ST',    # Chhattisgarh/MP Gond
    'ULAKA': 'ST',     # Odisha Kondh
    'TAGORE': 'General',  # Bengali Brahmin
    'HEGDE': 'General',   # Karnataka Brahmin
    'PADVI': 'ST',     # Maharashtra Bhil
    'TOKAS': 'OBC',    # Delhi Gurjar
    'GURJAR': 'OBC', 'GURUJAR': 'OBC',
    'BAGHEL': 'OBC',
    'BAGHELA': 'OBC',
    'BHAGAT': 'OBC',
    'CHISHTI': 'Minority', 'CHISTI': 'Minority',  # Sufi Muslim
}


# Honorifics observed in observer names
HONORIFICS_SET = {
    'SHRI', 'SMT', 'DR', 'MR', 'MS', 'MRS', 'CAPT', 'CAPTAIN', 'MAJ',
    'COL', 'GEN', 'HON', 'HONBLE', 'JUSTICE', 'SARDAR', 'PROF', 'ENGR',
    'MS.', 'SHRI.', 'SMT.', 'DR.', 'MR.', 'MRS.',
}


# ============================================================
# Name parsing
# ============================================================

HONORIFIC_RE = re.compile(
    r'^(SHRI|SMT|DR|MR|MS|MRS|CAPT|CAPTAIN|MAJ|COL|GEN|HON|HONBLE|JUSTICE|SARDAR|S|PROF|ENGR)\.?\s+',
    re.IGNORECASE
)

NON_NAMES = {
    '11223344', '1234512345', 'ADMIN', 'USER', 'TESTER 1', 'TESTER 2',
    'TESTER 3', 'TESTER 4',
}


def clean_name(raw):
    """Strip honorifics, role suffix after comma, normalise whitespace."""
    if not raw:
        return ''
    n = raw.strip()
    # Drop everything after first comma (role/title suffix)
    n = n.split(',')[0].strip()
    # Drop honorific
    n = HONORIFIC_RE.sub('', n).strip()
    # Iteratively strip multiple honorifics (e.g., "DR. SHRI X")
    for _ in range(3):
        nn = HONORIFIC_RE.sub('', n).strip()
        if nn == n:
            break
        n = nn
    # Collapse whitespace
    n = re.sub(r'\s+', ' ', n)
    # Remove trailing periods
    n = n.rstrip('.').strip()
    return n.upper()


def name_tokens(cleaned):
    """Return non-empty uppercase tokens of a cleaned name."""
    if not cleaned:
        return []
    return [t for t in re.split(r'[\s\.]+', cleaned) if t]


def detect_religion(tokens):
    """Return ('Muslim'|'Sikh'|'Christian'|'', method, evidence_tokens)."""
    if not tokens:
        return '', '', []
    matched_muslim = [t for t in tokens if t in MUSLIM_TOKENS]
    if matched_muslim:
        return 'Muslim', 'muslim_token_match', matched_muslim
    matched_sikh = [t for t in tokens if t in SIKH_TOKENS]
    if matched_sikh:
        # 'SINGH' alone is ambiguous (Rajput vs Sikh). Require at least one
        # OTHER Sikh-specific token, or surname Kaur/Singh-Sandhu/etc.
        non_singh = [t for t in matched_sikh if t != 'SINGH']
        if non_singh:
            return 'Sikh', 'sikh_token_match', matched_sikh
        # Singh alone — leave to Hindu pathway with low confidence
    matched_christian = [t for t in tokens if t in CHRISTIAN_TOKENS]
    if matched_christian:
        return 'Christian', 'christian_token_match', matched_christian
    return '', '', []


# ============================================================
# Empirical surname → caste map from candidates_detailed
# ============================================================

def build_surname_map(cands_path='candidates_detailed.csv'):
    """For each surname token (last token of the candidate name, after
    cleaning), record (Category, Caste) frequencies."""
    by_surname = defaultdict(Counter)
    by_surname_caste = defaultdict(Counter)
    raw_count = 0
    with open(cands_path) as f:
        for c in csv.DictReader(f):
            raw_count += 1
            name = (c.get('Candidate_Name') or '').strip()
            cat = (c.get('Category') or '').strip()
            caste = (c.get('Caste') or '').strip()
            if not name or not cat:
                continue
            cleaned = clean_name(name)
            toks = name_tokens(cleaned)
            if not toks:
                continue
            surname = toks[-1]
            if surname in GENERIC_STOPLIST:
                # Try second-to-last token
                if len(toks) > 1 and toks[-2] not in GENERIC_STOPLIST:
                    surname = toks[-2]
            by_surname[surname][cat] += 1
            if caste:
                by_surname_caste[surname][caste] += 1
    print(f"  built map from {raw_count} candidates, {len(by_surname)} surnames", file=sys.stderr)
    return by_surname, by_surname_caste


# ============================================================
# Confidence tiers
# ============================================================

def infer_category(surname, by_surname, by_surname_caste):
    """Return (category, caste, confidence_tier, method, evidence_str).

    Resolution order:
      1. Empirical map from candidates (preferred when n>=2 and concentrated)
      2. Curated fallback dict for well-known surnames not in candidate data
      3. Otherwise LOW_AMBIGUOUS / unknown
    """
    if not surname:
        return '', '', 'LOW_AMBIGUOUS', 'no_surname', ''
    if surname in GENERIC_STOPLIST:
        return '', '', 'LOW_AMBIGUOUS', 'generic_stoplist', f'{surname!r} is too generic'

    cat_dist = by_surname.get(surname)
    if cat_dist:
        total = sum(cat_dist.values())
        top_cat, top_n = cat_dist.most_common(1)[0]
        share = top_n / total
        caste_dist = by_surname_caste.get(surname, Counter())
        top_caste = caste_dist.most_common(1)[0][0] if caste_dist else ''
        evidence = f'n={total} {dict(cat_dist)}'
        if total >= 5 and share >= 0.80:
            return top_cat, top_caste, 'HIGH_SURNAME', 'empirical_surname', evidence
        if total >= 2 and share >= 0.60:
            return top_cat, top_caste, 'MEDIUM', 'empirical_surname', evidence
        if total < 2:
            # Single-record signal — drop to curated fallback if available
            if surname in CURATED_SURNAME_TO_CATEGORY:
                return CURATED_SURNAME_TO_CATEGORY[surname], '', 'MEDIUM', \
                       'curated_dict', f'{surname!r} curated; empirical n=1'
        return top_cat, top_caste, 'LOW_AMBIGUOUS', 'empirical_surname', evidence

    # No empirical signal — fall back to curated dict
    if surname in CURATED_SURNAME_TO_CATEGORY:
        return CURATED_SURNAME_TO_CATEGORY[surname], '', 'MEDIUM', \
               'curated_dict', f'{surname!r} curated; not in candidates'
    return '', '', 'LOW_AMBIGUOUS', 'surname_not_in_any_source', f'{surname!r}'


# ============================================================
# Main pipeline
# ============================================================

def main():
    print("Loading candidate data...", file=sys.stderr)
    by_surname, by_surname_caste = build_surname_map()

    print("Loading observers...", file=sys.stderr)
    with open('observers_master.csv') as f:
        observers = list(csv.DictReader(f))

    # Build candidate-mobile -> (Category, Caste) for ground-truth validation
    cand_by_mobile = {}
    with open('candidates_detailed.csv') as f:
        for c in csv.DictReader(f):
            m = (c.get('Mobile') or '').strip()
            if m:
                cand_by_mobile[m] = (c.get('Category', ''), c.get('Caste', ''))

    out = []
    for o in observers:
        raw_name = o.get('Name', '')
        mobile = (o.get('mobile_no') or '').strip()

        # Exclude dummies
        if raw_name.upper().strip() in NON_NAMES or raw_name.strip().isdigit():
            continue

        cleaned = clean_name(raw_name)
        toks = name_tokens(cleaned)

        # Religious inference (priority)
        religion, rel_method, rel_evidence = detect_religion(toks)

        # Caste category inference (only for non-religious or when religion is empty)
        if religion in ('Muslim',):
            inferred_cat, inferred_caste, tier, method, evidence = (
                'Minority', religion, 'HIGH_RELIGION', rel_method, ','.join(rel_evidence)
            )
        elif religion in ('Sikh', 'Christian'):
            inferred_cat, inferred_caste, tier, method, evidence = (
                'Others', religion, 'HIGH_RELIGION', rel_method, ','.join(rel_evidence)
            )
        else:
            # Hindu/other — use empirical surname map
            surname = toks[-1] if toks else ''
            if surname in GENERIC_STOPLIST and len(toks) >= 2:
                surname = toks[-2]
            inferred_cat, inferred_caste, tier, method, evidence = infer_category(
                surname, by_surname, by_surname_caste
            )
            religion = 'Hindu' if inferred_cat else ''

        # Ground-truth check
        gt_cat, gt_caste = cand_by_mobile.get(mobile, ('', ''))

        out.append({
            'ObserverID': o.get('id'),
            'Mobile': mobile,
            'StateName': o.get('StateName'),
            'Role': o.get('role'),
            'OriginalName': raw_name,
            'CleanedName': cleaned,
            'InferredReligion': religion,
            'InferredCategory': inferred_cat,
            'InferredCaste': inferred_caste,
            'ConfidenceTier': tier,
            'Method': method,
            'Evidence': evidence,
            'GroundTruth_Category': gt_cat,
            'GroundTruth_Caste': gt_caste,
        })

    # Dedup by mobile_no — same person registered with multiple name formats.
    # Keep the record whose original name is longest (most formal).
    by_mobile = defaultdict(list)
    no_mobile = []
    for r in out:
        if r['Mobile']:
            by_mobile[r['Mobile']].append(r)
        else:
            no_mobile.append(r)
    deduped = no_mobile.copy()
    merge_count = 0
    for mobile, records in by_mobile.items():
        if len(records) == 1:
            deduped.append(records[0])
        else:
            # Prefer record with highest-confidence tier; tiebreak by longest name
            tier_rank = {'HIGH_RELIGION': 0, 'HIGH_SURNAME': 1, 'MEDIUM': 2, 'LOW_AMBIGUOUS': 3}
            records.sort(key=lambda r: (tier_rank.get(r['ConfidenceTier'], 4),
                                         -len(r['OriginalName'])))
            deduped.append(records[0])
            merge_count += len(records) - 1
    print(f"\nDeduplication: {len(out)} → {len(deduped)} unique observers "
          f"(merged {merge_count} duplicate records)", file=sys.stderr)
    out = deduped

    # Validation
    gt_rows = [r for r in out if r['GroundTruth_Category']]
    correct_cat = sum(1 for r in gt_rows if r['GroundTruth_Category'] == r['InferredCategory'])
    print(f"\nGround-truth validation: {len(gt_rows)} observers also appear as candidates",
          file=sys.stderr)
    if gt_rows:
        for r in gt_rows:
            mark = '✓' if r['GroundTruth_Category'] == r['InferredCategory'] else '✗'
            print(f"  {mark} {r['OriginalName'][:40]:<40} "
                  f"inferred={r['InferredCategory']:<10} actual={r['GroundTruth_Category']:<10} "
                  f"tier={r['ConfidenceTier']}", file=sys.stderr)
        print(f"  Accuracy: {correct_cat}/{len(gt_rows)} = {correct_cat/len(gt_rows)*100:.0f}%",
              file=sys.stderr)

    # Distribution
    print(f"\nInference summary ({len(out)} non-dummy observers):", file=sys.stderr)
    print(f"  Religion: {Counter(r['InferredReligion'] for r in out).most_common()}", file=sys.stderr)
    print(f"  Category: {Counter(r['InferredCategory'] for r in out).most_common()}", file=sys.stderr)
    print(f"  Tier: {Counter(r['ConfidenceTier'] for r in out).most_common()}", file=sys.stderr)

    # Per-state breakdown (Religion + Category × State)
    print(f"\nPer-state inferred religion mix (HIGH_* tiers only):", file=sys.stderr)
    high_rows = [r for r in out if r['ConfidenceTier'].startswith('HIGH')]
    state_rel = defaultdict(Counter)
    for r in high_rows:
        state_rel[r['StateName']][r['InferredReligion'] or '?'] += 1
    print(f"  {'State':<25} {'Total':>6} {'Hindu':>6} {'Muslim':>7} {'Sikh':>5} {'Christ':>7} {'Other':>6}",
          file=sys.stderr)
    for state in sorted(state_rel):
        c = state_rel[state]
        print(f"  {state:<25} {sum(c.values()):>6} {c.get('Hindu',0):>6} "
              f"{c.get('Muslim',0):>7} {c.get('Sikh',0):>5} "
              f"{c.get('Christian',0):>7} {c.get('?',0)+c.get('Others',0):>6}", file=sys.stderr)

    # Write CSV (sorted by ObserverID for stable diff)
    out.sort(key=lambda r: int(r['ObserverID']) if r['ObserverID'] else 0)
    fieldnames = list(out[0].keys())
    with open('observers_inferred_caste.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(out)
    print(f"\nWrote: observers_inferred_caste.csv ({len(out)} rows)", file=sys.stderr)


if __name__ == '__main__':
    main()
