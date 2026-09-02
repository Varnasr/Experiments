# Petition Builder

Live at **https://varnasr-experiments.netlify.app/petition-builder/**

Drafts a representation, memorandum or petition in the form Indian authorities
expect, from its parts: addressee, subject and reference, who sends it, the
facts, the grounds, the prayer, annexures, place and date, and a signatory sheet.

## Four forms

| Kind | Opening | Closing | Notes |
| --- | --- | --- | --- |
| Representation to a public authority | To … / Sir/Madam / submitted under Article 350 | request for acknowledgement; Yours faithfully | the ordinary form for a municipal, district or departmental office |
| Petition to the Lok Sabha or a State Assembly | To the House / "The humble petition of … sheweth" | "as in duty bound, will ever pray"; countersignature line for the presenting Member | the House rules prescribe the form and require a Member to countersign and present it |
| Memorandum to a minister or legislator | Respected Sir/Madam / "This memorandum is submitted by …" | request for a reply | for a delegation or a meeting |
| Petition to a court registry or professional body | To the Hon'ble … / "Most respectfully showeth" | "for this act of kindness … ever pray" | administrative petitions only; not a pleading |

Facts and grounds are numbered continuously; the prayer restarts at 1;
annexures are lettered. The signatory table takes name, designation or address
and an ID or enrolment number, with an option for ten blank rows for signatures
by hand, and a CSV import of signatories.

## Output

- Print or save as PDF (A4, 2 cm margins, the form only).
- Download as a Word document (`.doc`, an HTML file Word and LibreOffice open
  with the formatting intact).
- Download as Markdown.
- Copy a shareable link: the whole draft is encoded in the URL fragment, so a
  co-signatory who opens it sees the same draft with no server involved. A
  long petition makes a long link; the page reports its size.
- Export and import JSON. The draft is saved in the browser as you type.

## What it is not

Not a pleading. A writ petition, an appeal, an application under a statute or a
plaint has its own form, court rules and verification, and this page does not
draft those. The guidance on House petitions describes the general practice;
check the current rules of the House concerned and the Committee on Petitions'
practice before sending one.

## Verification

The example (an invented representation on street lights) renders with all
sections, four signatory rows and the annexure list; switching to the House form
changes the opening, closing and countersignature line; the draft survives a
reload from local storage. No dependencies. One HTML file. MIT.
