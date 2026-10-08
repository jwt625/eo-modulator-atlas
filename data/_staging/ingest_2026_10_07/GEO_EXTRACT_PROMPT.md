# Per-author affiliation extraction brief (2026-10-07, DevLog-022 G1; pipeline of DevLog-018)

Batch: `data/_staging/batches/<batch>.txt` (one paper_id per line). Output: `data/_staging/<batch>/`
(`author_affiliations.csv`, `organizations.csv` for new orgs only, `REPORT.md`). No network, no git, no emoji;
write nothing else.

## Table (header exactly as `data/author_affiliations.csv`)

One row per author x printed affiliation: paper_id; author_index (1-based position in `data/papers.csv`
`authors`, split on ';' and trimmed); author (the exact trimmed string at that position); aff_order (1-based order
of this author's affiliations as printed); kind (primary for aff_order 1, additional for aff_order 2 and above, present_address for a printed present address; as in the canonical table); org_name (must exist in
`data/organizations.csv`, else staged in your organizations.csv); unit (department/lab as printed, optional);
locality (city as printed, e.g. "Cambridge, MA"; empty if no city is printed); country (ISO alpha-2); source
(paper | crossref); locator (e.g. "p.1 affiliations"); note.

## Rules (from the DevLog-018 audits and coordinator decisions)

- Read the affiliation block of each paper in `references/<id>/text.md` (superscript markers, footnotes,
  author-details sections on later pages). Open `references/<id>/figures/page_01.png` (or render nothing: if the
  markers are not legible in text.md and no page image exists, say so in REPORT.md) to check marker assignment.
  The printed paper wins; `crossref.json` affiliations only fill authors the cached paper does not cover
  (source crossref) and resolve marker ambiguities only when they agree with the print.
- Equal-contribution and corresponding-author markers are not affiliations.
- org_name = the most specific existing row in `data/organizations.csv` that matches the printed institution
  (reuse names exactly); a department/lab that is not an org row goes to unit. Several units of one institution
  printed for one author = several rows. New organizations: staged in your organizations.csv with the
  `data/organizations.csv` header, name as printed (or its own preferred English name if printed), org_type,
  ISO country, region, notes with the locator; ror_id and name_source empty.
- locality as printed (no normalization, no invented city). Country from the printed address.
- Authors in papers.csv with no printed affiliation in any cached source: no row; list them in REPORT.md.
- Self-check before finishing: author strings match papers.csv slots, every org_name exists (canonical or
  staged), ISO countries, no duplicate (paper_id, author_index, aff_order). Then run
  `uv run python scripts/merge_affiliations.py data/_staging/<batch>` (dry run) and fix every problem it prints.

## REPORT.md

Per paper: authors in papers.csv / authors with rows / authors without rows (names), judgment calls (marker
reading, org mapping, page used), new orgs. Final message: counts, the dry-run line, judgment calls to audit.
