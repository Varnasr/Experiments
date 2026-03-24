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
├── index.html      # Current active experiment (FWI Task Tool)
├── LICENSE         # MIT License
└── README.md       # This file
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
