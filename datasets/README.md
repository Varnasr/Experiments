# Datasets

Public-but-registered microdata used across experiments in this repo. None of the raw data is committed — each folder has a README documenting how to obtain the files and where to place them locally.

| Folder | Dataset | Source | Period |
|---|---|---|---|
| [`ihds-i-2004-05/`](ihds-i-2004-05/) | India Human Development Survey, Round I | ICPSR 22626 | 2004–05 |
| [`ihds-ii-2011-12/`](ihds-ii-2011-12/) | India Human Development Survey, Round II | ICPSR 36151 | 2011–12 |
| [`nfhs-5-2019-21/`](nfhs-5-2019-21/) | National Family Health Survey, Round 5 | DHS Program | 2019–21 |
| [`plfs-2022-23/`](plfs-2022-23/) | Periodic Labour Force Survey, unit-level | MoSPI | Jul 2022 – Jun 2023 |

All four require registration with the producing institution before download. See each folder's README for the access procedure.

## Convention

Within each dataset folder:

- `data/` — raw downloaded microdata (gitignored)
- `docs/` — codebooks, questionnaires, manuals (gitignored)
- `analysis/` — scripts and outputs (committed)
