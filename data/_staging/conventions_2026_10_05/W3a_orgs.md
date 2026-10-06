# W3a organizations (university, national_lab, consortium, other), 2026-10-05

Scope: 112 rows of data/organizations.csv. ROR API v2 (query=, one request per org, 1.2 s apart, 117 requests total, no HTTP 429 or anti-bot signal). Raw JSON cached in a local scratch directory (not tracked) (outside the repo). Own-site names checked by page title / og:site_name / footer; ROR display used where it equals the own-site name. Detail per row in W3a_orgs.csv.

Counts: keep 100, rename 11, no_match 1, merge 0, fix_country 0.

## Renames (11)
| Current | Preferred | Source |
|---|---|---|
| Technical University Berlin | Technische Universität Berlin | https://www.tu.berlin/en (own English site keeps the German name; ROR identical) |
| Swiss Federal Institute of Technology Lausanne | EPFL | https://www.epfl.ch/en/ (own English site uses only "EPFL"; French long form École polytechnique fédérale de Lausanne in footer) |
| University of Muenster | University of Münster | https://www.uni-muenster.de/en/ |
| University of Colorado, Boulder | University of Colorado Boulder | https://www.colorado.edu |
| University of California, San Diego | University of California San Diego | https://ucsd.edu |
| University of Illinois at Urbana-Champaign | University of Illinois Urbana-Champaign | https://illinois.edu |
| Beijing Information Science and Technology University | Beijing Information Science & Technology University | https://english.bistu.edu.cn/About/index.htm |
| Harbin Institute of Technology (Shenzhen) | Harbin Institute of Technology, Shenzhen | https://en.hitsz.edu.cn/index.htm |
| U.S. Army Combat Capabilities Development Command Army Research Laboratory | DEVCOM Army Research Laboratory | https://arl.devcom.army.mil |
| University of Campinas | State University of Campinas | https://www.unicamp.br/en/ footer (judgement call; ROR alias and third parties say "University of Campinas") |
| Hefei National Laboratory | Hefei Laboratory | https://en.hfnl.cn/ (judgement call; Chinese name 合肥国家实验室 = Hefei National Laboratory) |

Knock-on: parent_org values in other-slice rows that name renamed orgs need updating: "Swiss Federal Institute of Technology Lausanne" (EPFL Center of MicroNano Technology, EPFL Institute of Physics cleanroom) -> EPFL; "University of California, San Diego" (San Diego Nanotechnology Infrastructure) -> University of California San Diego.

## Merges
None. No two rows in this slice are the same organization. Near-pairs checked and kept separate: HKUST vs HKUST (Guangzhou) (distinct ROR records and countries), Sun Yat-sen University vs National Sun Yat-sen University, Scuola Normale Superiore vs Scuola Superiore Sant'Anna, Ghent University vs imec (other slice). Candidate parent mappings (not merged): Harbin Institute of Technology, Shenzhen is a campus of Harbin Institute of Technology (no separate ROR record, no HIT row exists); INPHOTEC is a center of Scuola Superiore Sant'Anna.

## Country fixes
None. All 109 ROR-matched rows agree with country_current (Hong Kong rows use HK, matching ROR/ISO 3166). Rows whose country had no in-table source now have one: CMC Microsystems (ROR: Kingston, CA; cmc.ca), CNIT (ROR: IT; cnit.it/en), INPHOTEC (Pisa, IT; santannapisa.it). Hefei Laboratory and Harbin Institute of Technology, Shenzhen: no ROR record, countries (CN) from own-site addresses.

## Open items resolved
- Technical University Berlin vs Technische Universität Berlin: Technische Universität Berlin.
- Nokia Bell Labs / Nokia Corporation: not in this slice (company); skipped.

## No ROR match
- INPHOTEC (no ROR record; action no_match; name unverified on own site because inphotec.it has a broken TLS certificate; name evidence from santannapisa.it). Also without ROR but renamed: Hefei National Laboratory -> Hefei Laboratory; Harbin Institute of Technology (Shenzhen).

## Kept with caveats (see CSV notes)
- ROR display non-English but English name kept: Brazilian Nanotechnology National Laboratory (own site/ROR alias), National Inter-University Consortium for Telecommunications (own site title), Federal University of Mato Grosso (ufmt.br unreachable; English name from Wikipedia/Wikidata only, so not own-site verified).
- Leading "The" kept where own site uses it (The Hong Kong Polytechnic University, The Hong Kong University of Science and Technology, The Pennsylvania State University); The University of Aizu is mixed on its own site (header without, copyright with), kept.
- Northeastern University: US record (Boston); a different Northeastern University exists in Shenyang, CN.
- Observation outside scope: Brazil rows use region "other".
