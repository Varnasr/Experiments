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

### FWI Task Management Tool

A comprehensive task distribution system built for managing staff transitions at Fish Welfare Initiative.

**File:** `index.html`
**Deploy:** Netlify (via GitHub integration)

**Features:**
- Smart task assignment recommendations based on role and capacity
- Real-time progress tracking across team members
- Export capabilities: PDF and CSV
- Automated meeting agenda and email generation
- Risk analysis and critical path management for transition planning

**Usage:** Open `index.html` in any modern browser. No installation or build step required.

### Court Petition Translator (Hindi → English)

An AI-powered tool for translating Hindi Supreme Court and High Court petitions into formal legal English.

**Directory:** `court-translator/`
**Serverless function:** `netlify/functions/court-translate.mjs`
**Stage:** Prototype

**How it works:**
1. Hindi text is split into chunks and translated via [Sarvam AI](https://www.sarvam.ai) (`sarvam-translate:v1`, formal mode)
2. The raw translation is refined by Llama 3.3 70B (via Groq) with a legal-terminology-aware prompt that corrects terms like याचिकाकर्ता → Petitioner, माननीय → Hon'ble, अनुच्छेद → Article, etc.

**Environment variables required:**
- `SARVAM_API_KEY` — from [Sarvam AI dashboard](https://dashboard.sarvam.ai)
- `GROQ_API_KEY` — from [Groq console](https://console.groq.com) (free tier)

**Usage:** Open `court-translator/index.html` in the browser (via Netlify deploy). Paste Hindi petition text and click Translate.

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
├── index.html                          # FWI Task Management Tool
├── court-translator/
│   └── index.html                      # Court Petition Translator UI
├── netlify/
│   └── functions/
│       └── court-translate.mjs         # Hindi → English translation API
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
