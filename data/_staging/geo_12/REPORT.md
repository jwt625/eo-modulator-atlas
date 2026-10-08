# geo_12 extraction report (2026-10-07)

Saved by the coordinator from the extractor's final message. Papers: the 5 p8_02 papers (cached arXiv copies).

Dry run: `staged rows 80, staged papers 5, kept canonical rows 2800; rows 2880, papers 231, new orgs 1, sites 309,
problems 0`. Markers legible in text.md; no page renders.

| paper | authors | with rows | without rows | rows |
|---|---|---|---|---|
| gaier2025 | 9 | 9 | none | 15 |
| liu2025d | 10 | 10 | none | 16 |
| xie2024 | 8 | 8 | none | 8 |
| zhang2024 | 9 | 8 | Yuansong Zeng (slot 3; Crossref only, empty affiliation) | 16 |
| park2026 | 14 | 14 | none | 25 |

## Per paper

- gaier2025: EPFL Hybrid Photonics Laboratory (1) and Center for Quantum Science and Engineering (QSE) (2); Harvard
  SEAS, Cambridge, MA (3); Delft University of Technology, Department of Quantum and Computer Engineering (4,
  Rajabali); DRS Daylight Solutions (5, Shams-Ansari).
- liu2025d: Southwest Jiaotong University (Center for Information Photonics and Communications, School of
  Information Science and Technology, Chengdu) (1); Key Laboratory of Photonic-Electric Integration and
  Communication-Sensing Convergence (Ministry of Education) (2, new org); Tianfu Xinglong Lake Laboratory (3);
  Jinan University (4, Guangzhou); University of Ottawa (5, "Ottawa, ON" reused).
- xie2024: City University of Hong Kong (Department of Electrical Engineering & State Key Laboratory of Terahertz
  and Millimeter Waves, "Kowloon, Hong Kong"; matches feng2022).
- zhang2024: City University of Hong Kong three rows (one per marker 1-3); Nankai University (4, Tianjin).
- park2026: KIST (Center for Quantum Technology, Seoul) all but Seo; Korea University; Sejong University; Korea
  University of Science and Technology (KIST School); Kyung Hee University; KAIST (Daejeon, Seo primary).

## Judgment calls

1. liu2025d marker 2 as its own org (Jiaxing Key Laboratory precedent); alternative: unit of Southwest Jiaotong
   University.
2. Empty locality where no city is printed (EPFL "CH-1015" only; Delft none; DRS Daylight Solutions "16465 Via
   Esprillo, CA, USA"); fallback: reuse "Lausanne", "Delft", "San Diego, CA".
3. University of Ottawa "Ottawa, ON" reused although the print says "Ottawa, Canada".
4. Unit strings as printed (QSE; "Harvard John A. Paulson School ..."; liu2025d marker-1 units in one string).
5. Korean orgs exist in organizations.csv; localities "Seoul", "Daejeon" as printed.
6. zhang2024 follows the print; Zeng without row.
