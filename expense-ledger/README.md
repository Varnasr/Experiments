# Election Expenditure Ledger

Live at **https://varnasr-experiments.netlify.app/expense-ledger/**

A candidate's running account of election expenses against the ceiling, kept the
way section 77 of the Representation of the People Act 1951 requires it: a
separate and correct account of everything incurred or authorised between the date
of nomination and the date the result is declared, both inclusive.

## What it does

- Pre-fills the ceiling from Rule 90 of the Conduct of Elections Rules 1961 as
  amended on 6 January 2022 (Lok Sabha ₹95 lakh / ₹75 lakh; assembly ₹40 lakh /
  ₹28 lakh, by state band). The box is editable and the edited figure is used
  everywhere.
- Entries by date, head, description, amount, paid by, mode of payment, voucher
  number and an optional units × rate note. Heads follow the register that
  expenditure observers work from.
- Totals by head with shares, a cumulative step chart against the ceiling with the
  poll day marked, daily burn rate over the accounting days elapsed, a projection
  to counting day at the present rate, and the permitted daily spend for the days
  remaining if the projection breaches the ceiling.
- The section 78 lodging deadline (30 days from the declaration of the result).
- Flags: entries dated outside the accounting period; cash payments above the
  Commission's threshold (₹10,000 pre-filled, editable); expenditure by another
  person or entity, which Explanation 1 to section 77(1) treats as the candidate's
  when authorised.
- CSV export and import (RFC-style quoting, so descriptions with commas survive),
  print view, and an example ledger.

Everything is stored in the browser's local storage. Nothing leaves the page.

## Where the page stops

The state-band classification reproduces the pattern of the 2014 and 2022
notifications (Arunachal Pradesh, Goa, Sikkim and the Union territories other
than Delhi in the lower Lok Sabha band; those plus Manipur, Meghalaya, Mizoram,
Nagaland, Tripura and Puducherry in the lower assembly band). Check the
notification for the election in hand and edit the ceiling if it differs. The
page does not apply the district rate card itself; enter the observer's attributed
figures as entries under the rate-card head. The cash threshold is the
Commission's instruction as commonly stated; the compendium of instructions
controls.

## Verification

The example ledger's fourteen entries sum to ₹21,01,000 by hand and on the page;
adding a ₹12,000 cash entry raises the cash flag; CSV round-trips through the
parser with quoted commas intact.

Not legal advice. No dependencies. One HTML file. MIT.
