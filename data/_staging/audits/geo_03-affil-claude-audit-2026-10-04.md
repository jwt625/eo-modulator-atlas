---
auditor: claude (fresh-context independent audit)
task: geo_03 per-author affiliation audit (DevLog-018)
date: 2026-10-04
scope: data/_staging/geo_03/author_affiliations.csv (347 rows, 27 papers), data/_staging/geo_03/organizations.csv (1 new org)
mode: read-only
sources: references/<paper_id>/text.md (byline markers, affiliation blocks, footnotes, end-of-article author details); REPORT.md read after own checks
counts:
  papers: 27
  papers_pass: 26
  papers_pass_after_corrections: 1
  papers_fail: 0
  blocking: 0
  metadata: 0
  minor: 2
  observations: 4
---

# geo_03 affiliation audit

## Mechanical checks (all 347 rows)

- (paper_id, author_index, author) matches papers.csv `authors` at that index for every row.
- Every author of all 27 papers has at least one row; aff_order is contiguous 1..n per author.
- No duplicate (paper_id, author_index, aff_order) keys.
- Every org_name resolves to data/organizations.csv or the staged organizations.csv; no org is in both.
- Row country equals the org's country for every row (staged org: CN).
- kind counts: primary 264, additional 78, present_address 5.

## Per-paper result

| paper_id | result | findings |
|---|---|---|
| lin2025a | pass | |
| lin2026a | pass | M2 (optional), G |
| liu2021 | pass | |
| liu2023 | pass after corrections | M1, O1 |
| liu2025 | pass | |
| liu2025b | pass | |
| liu2025c | pass | |
| liu2026b | pass | |
| lotkov2024 | pass | |
| lu2020 | pass | O2 |
| luan2026 | pass | |
| luan2026a | pass | |
| mao2024 | pass | |
| meng2023 | pass | |
| montifiore2026 | pass | |
| multani2025 | pass | O3 |
| navarro2026 | pass | O3 |
| nelan2022 | pass | |
| nelan2022a | pass | |
| nenezic2026 | pass | M2 (optional), G |
| niels2025a | pass | M2 (optional), G |
| niels2026 | pass | M2 (optional), G |
| ogiso2016 | pass | |
| ogiso2024 | pass | |
| porto2026 | pass | |
| powell2024 | pass | |
| powell2024a | pass | |

"pass after corrections" here means a minor unit-wording fix only; no row is tied to a wrong institution, city or country.

## Findings

### M1 (minor) liu2023 unit of affiliation 1 abbreviated

- Rows: liu2023, author_index 1..9, aff_order 1 (all nine authors).
- Current unit: "State Key Laboratory for Modern Optical Instrumentation, College of Optical Science and Engineering".
- Printed (text.md p.1 and p.8 "Author details" 1): "State Key Laboratory for Modern Optical Instrumentation, Center for Optical & Electromagnetic Research, College of Optical Science and Engineering, International Research Center for Advanced Photonics, Zhejiang University, Zijingang Campus, Hangzhou 310058".
- Correct unit (if full printed form is wanted): "State Key Laboratory for Modern Optical Instrumentation, Center for Optical & Electromagnetic Research, College of Optical Science and Engineering, International Research Center for Advanced Photonics". Org, locality (Hangzhou) and country are correct.

### M2 (minor) note wording for the joint Ghent string

- Rows: every Ghent University row in lin2026a, nenezic2026, niels2025a, niels2026 (note "printed as Ghent University-imec; one row").
- Printed separators differ: "Ghent University - imec" (lin2026a affiliation 1, niels2025a affiliation 1), "Ghent University-imec" (lin2026a affiliation 2), "Ghent University–imec" with en dash (nenezic2026 affiliations 1, 3, 4; niels2026 affiliations 1, 3).
- In nenezic2026 and niels2026 imec is also printed as its own affiliation and has its own rows, so "one row" in the note is slightly misleading there (the joint string gives one row; the separate imec line gives another). Suggested note: "joint string Ghent University-imec mapped to Ghent University; imec separately printed as affiliation 2". Optional wording only.

### G. Judgment on "Ghent University - imec" mapped to Ghent University only

What the papers print:
- lin2026a: 1 "Photonics Research Group, Department of Information Technology (INTEC), Ghent University - imec, Ghent, Belgium"; 2 "Department of Information Technology (INTEC), IDLab, Ghent University-imec, Ghent, Belgium". No separate imec line.
- niels2025a: 1 "Photonics Research Group, INTEC, Ghent University - imec, 9052 Ghent, Belgium". No separate imec line.
- nenezic2026, niels2026: joint "Ghent University–imec, 9052 Ghent" lines plus a separate "imec, Kapeldreef 75, 3001 Leuven" line (marker 2).

Assessment:
- Location: correct. Every joint string carries a Ghent (9052) address, and every row from it has locality Ghent, BE. No author is pinned to a wrong city.
- Institution: the joint string names two institutions; mapping it to Ghent University only drops imec as a named co-institution for the 19 author rows of lin2026a (11) and niels2025a (8), which print no other imec line. For nenezic2026 and niels2026 nothing is lost because imec Leuven is printed separately and was extracted with correct marker order (e.g. "3,2" gives Ghent primary then imec; "2,3" gives imec primary then IDLab).
- An extra imec row with locality Leuven from the joint string would be wrong (the printed city is Ghent). An extra imec row with locality Ghent would be faithful to the print but adds a second pin at the same Ghent site per author.
- Consistency: same policy as geo_01, geo_04, geo_05 (vanackere2023, wu2023, zheng2026) and the existing organizations.csv note for Ghent University ("... Ghent University-imec").
- Verdict: acceptable as is; not an error. Caveat for the coordinator: if any view counts papers or authors per organization (e.g. "imec papers"), lin2026a and niels2025a will not count toward imec. If that matters, add one imec row per affected author (kind additional, locality Ghent, BE, note "joint Ghent University-imec affiliation, Ghent address") and apply the same rule to the other batches for consistency.

### O1 (observation) Jiaxing Key Laboratory treated differently across batches

- geo_03 stages "Jiaxing Key Laboratory of Photonic Sensing & Intelligent Imaging" as a new org (research_institute, CN, east_asia). In liu2023 this is printed as its own numbered affiliation 3 ("Jiaxing Key Laboratory of Photonic Sensing & Intelligent Imaging, Jiaxing 314000, China") with no parent named, so a separate org is faithful to the print, and it is absent from data/organizations.csv (no spelling variant found).
- geo_01/geo_02 (guo2026, li2025a) put the same lab into the Zhejiang University unit string, where it is printed within the same line as the ZJU Jiaxing Research Institute.
- Both are defensible per paper. Effect: liu2023 authors 6-9 get two Jiaxing pins (the lab and ZJU Jiaxing Research Institute). Coordinator decision; no correction required for this batch.

### O2 (observation) lu2020 prefecture-only localities

- lu2020, author_index 1, aff_order 2 (The University of Aizu, "Fukushima") and aff_order 3 (Tokai University, "Kanagawa"). The paper prints only the prefecture plus postal code (Fukushima 965-8580; Kanagawa 259-1292). The rows follow the printed text and carry a note; correct per rule 3.
- Geocoding caveat (outside the paper, estimate): postal codes 965 and 259-12 correspond to Aizuwakamatsu and Hiratsuka, not Fukushima City or Yokohama. Geocode these by org (Wikidata) rather than by the locality string.

### O3 (observation) locality string variants across batches

Same site written differently in different batches; dedupe when building org_sites (none is wrong for its own paper):
- Stanford University: "Stanford" (geo_03 multani2025, printed without state) vs "Stanford, CA" (geo_01, geo_05).
- University of Campinas: "Campinas" (navarro2026) vs "Campinas, SP" (geo_02).
- Technical University of Denmark: "Kgs. Lyngby" (luan2026, luan2026a) vs "Lyngby" (geo_02).
- Ghent University: "Ghent" (geo_03) vs "Gent" (geo_01, geo_05).
- Peng Cheng Laboratory: "Shenzhen" vs "Shenzhen, Guangdong" (geo_02).

### O4 (observation) name strings

- niels2025a: printed "Günther Roelkens", papers.csv "Gunther Roelkens"; niels2026 text layer "Soe Janssen" is a ligature drop of "Sofie Janssen". Rows correctly use the papers.csv strings.

## Items specifically verified

- Equal-contribution and corresponding markers not treated as affiliations: lin2025a (marker 2 = equal contribution), liu2025 (dagger), liu2025c (dagger, double dagger, asterisk are email footnotes), meng2023 (& and a)), multani2025, powell2024 (a) b) c) are emails; Powell's luminacorp.com.au email is not a printed affiliation), powell2024a, niels2026, lin2026a.
- Present addresses: luan2026 and luan2026a (Chao Luan, "Current address" MIT RLE), montifiore2026 (Chauhan: NIST Time and Frequency Division and University of Colorado Boulder Physics; Wang: Lightmatter, Boston) all kind present_address with primary UCSB retained.
- Multi-marker authors: liu2023 (Zhang 1,2; Yu and Liu 1,3,4; Shi and Dai 1,2,3,4, affiliations 3-4 from p.8 Author details), liu2025c (Ren 1,3,4), liu2026b (1,2 authors), lotkov2024 (1,2 / 2,3 / 2,4 patterns), lu2020 (Lu 1,2,5; Yokoyama 1,3), mao2024 (Uemura 2 only; Lu and Yokoyama 1,2), montifiore2026, multani2025 (1,3,4 / 2,4), nelan2022/nelan2022a (Mercante and four others PSI only), nenezic2026 (Moerman 3,2,4), niels2025a (Vandekerckhove 1,2), niels2026 (1,2 vs 2,3 vs 2 only), liu2025b (Lei Wang 2 only; Xiao 1,2).
- End-of-letter affiliations: ogiso2016 (p.2, Ohiso at NTT Device Technology Laboratories, others NTT Device Innovation Center; NTT Corporation mapped to Nippon Telegraph and Telephone Corporation; Atsugi).
- Org choices: NTT Innovative Devices Corporation kept separate from NTT (ogiso2024, consistent with org note); SLAC as its own org (multani2025); LNNano (parent CNPEM in organizations.csv) for navarro2026; Kyushu University locality "Kasuga, Fukuoka" matches "6-1 Kasuga-koen Kasuga, Fukuoka".

## Papers verified clean (no finding)

lin2025a, liu2021, liu2025, liu2025b, liu2025c, liu2026b, lotkov2024, luan2026, luan2026a, mao2024, meng2023, montifiore2026, nelan2022, nelan2022a, ogiso2016, ogiso2024, porto2026, powell2024, powell2024a.

Clean apart from observations or optional wording: lu2020 (O2), multani2025 (O3), navarro2026 (O3), lin2026a, niels2025a, niels2026 (M2 optional, G), nenezic2026 (M2 optional, G), liu2023 (M1, O1).
