# Experiments

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/Varnasr/Experiments)](https://github.com/Varnasr/Experiments/commits/main)
[![Part of OpenStacks](https://img.shields.io/badge/Part%20of-OpenStacks-blue)](https://openstacks.dev)

**Experimental prototypes, proof-of-concepts, and sandbox projects.**

A scratchpad for building and testing ideas quickly before they graduate into dedicated repositories — or get quietly retired.

---

## About

This repository houses small-scale experiments, early-stage prototypes, and one-off tools that don't yet warrant their own repository. Projects here range from functional tools shared with collaborators to quick explorations of an idea or technical approach.

Not everything here is polished. That's the point.

---

## Current Projects

### Court Petition Translator (Hindi → English)

An AI-powered tool for translating Hindi Supreme Court and High Court petitions into formal legal English.

**Directory:** `court-translator/`
**Serverless function:** `netlify/functions/court-translate.js`
**Stage:** Prototype

**How it works:**
1. Hindi text is split into chunks and translated via [Sarvam AI](https://www.sarvam.ai) (`sarvam-translate:v1`, formal mode)
2. The raw translation is refined by Llama 3.3 70B (via Groq) with a legal-terminology-aware prompt that corrects terms like याचिकाकर्ता → Petitioner, माननीय → Hon'ble, अनुच्छेद → Article, etc.

**Environment variables required:**
- `SARVAM_API_KEY` — from [Sarvam AI dashboard](https://dashboard.sarvam.ai)
- `GROQ_API_KEY` — from [Groq console](https://console.groq.com) (free tier)

**Usage:** Open `court-translator/index.html` in the browser (via Netlify deploy). Paste Hindi petition text and click Translate.

---

### Chamber Petition (AOR Supreme Court)

A static HTML signature-collection page for an AOR Supreme Court petition, migrated from ImpactMojo. Submissions go to Netlify Forms; the latest snapshot lives in `signatures-backup-2026-04-16.json` (66 verified signatures after removing one test record).

**Directory:** `chamber-petition/`
**Stage:** Active

---

### AICC Observers — DCC Readiness Grading

Methodology, data, and grading outputs for evaluating AICC-appointed District Observers on their preparation for District Congress Committee (DCC) membership recommendations. Six components scored: district report submission, proposed names, daily activity reports, supporting documents, potential leaders, non-political influencers.

**Directory:** `aicc_analysis/`
**Stage:** Congress-facing deliverable

**Files:**
- `grading_system.py` — scoring engine (weights, thresholds, joins documented in module docstring + commit history)
- `extract_candidates.py` — pulls candidate-level detail from the AICC portal (requires `AICC_USERNAME`/`AICC_PASSWORD` env vars)
- `consolidated_district_grading.csv` — 592-district A/B/C/D grading
- `candidates_detailed.csv` — 2,413 candidate-level profiles
- `all_timestamps.csv` — 9,104 per-record submission timestamps (authoritative count source)
- `*.json` — raw API extracts (district_reports, proposed_names, attachments, daily_reports, potential_leaders, political_influencers)

---

### Drive PDF Extractor

A small Node + Playwright tool that captures view-only Google Drive PDFs (the kind you can read but not download) and writes them out as a normal PDF.

**Directory:** `tools/drive-pdf-extractor/`
**Stage:** Internal tool

---

### KMUT Report

A Right to Care: Kashmiri Muslim and Other Tribes report (PDF), kept here for direct linking from project pages.

**File:** `docs/a-right-to-care-kmut-report.pdf`

---

## How This Repo Works

Projects in this repo follow a simple lifecycle:

| Stage | Description |
|-------|-------------|
| **Prototype** | Quick build to test feasibility or demonstrate an idea |
| **Active** | In use or being shared with collaborators |
| **Graduated** | Moved to its own dedicated repository |
| **Archived** | No longer maintained — kept for reference |

---

## Repository Structure

```
Experiments/
├── index.html                          # Experiments index page
├── court-translator/
│   └── index.html                      # Court Petition Translator UI
├── chamber-petition/
│   ├── index.html                      # AOR Supreme Court petition form
│   ├── README.md
│   └── signatures-backup-2026-04-16.json
├── aicc_analysis/
│   ├── grading_system.py               # DCC-readiness scoring engine
│   ├── extract_candidates.py           # AICC portal extractor (needs env vars)
│   ├── consolidated_district_grading.csv
│   ├── candidates_detailed.csv
│   ├── all_timestamps.csv
│   └── *.json                          # raw source extracts
├── tools/
│   └── drive-pdf-extractor/            # view-only Drive PDF capture
├── netlify/
│   └── functions/
│       └── court-translate.js          # Hindi → English translation API
├── docs/
│   └── a-right-to-care-kmut-report.pdf # KMUT report
├── netlify.toml                        # Netlify build & functions config
├── .env.example                        # Required environment variables
├── LICENSE                             # MIT License
└── README.md                           # This file
```

---

## Tech Stack

All experiments default to the simplest possible stack unless a specific tool requires otherwise:

| Default Stack | Reason |
|---------------|--------|
| Vanilla HTML / CSS / JS | No build step, instant deploy, easy to share |
| Netlify | Zero-config static hosting |

---

## Local Development

```bash
git clone https://github.com/Varnasr/Experiments.git
cd Experiments
open index.html
```

---

## Part of OpenStacks for Change

This repository is part of the [OpenStacks for Change](https://github.com/Varnasr/OpenStacks-for-Change) ecosystem — an open-source toolkit for development research, evaluation, and program design.

---

## License

MIT License — see [LICENSE](LICENSE) for details.
