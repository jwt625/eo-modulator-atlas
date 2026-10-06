# W3b organizations audit (company, research_institute, facility, foundry)

Date: 2026-10-05. Output table: `W3b_orgs.csv` (126 rows; the table grew from 232 to 238 rows during the run, slice re-read at the end and fully covered).

## Method
- ROR API v2 `organizations?query=`, one request at a time, at least 1.2 s apart, no 429 or anti-bot signal. Raw responses cached outside the repo in a local scratch directory (not tracked). A ROR id is recorded only when name, country and city clearly match; ROR display names for multinationals are country-suffixed (e.g. "NTT (Japan)") and were not used as preferred names.
- Own-site checks by direct page fetch (title, og:site_name, copyright/imprint line, address) and search results where the site blocked fetching (Ciena, Keysight, Intel, DRS Daylight, RISE returned 403/denied).
- Naming rule applied: preferred_name = form the organization uses for itself in English text (site title / og:site_name / copyright line); legal form recorded in note when different. Where own form could not be verified the name is kept and says so in the note.
- Action counts: keep 82, rename 31, no_match 8, fix_country 2, fix_type 2 (other 1, foundry 1), merge_into 1. Extra suggestions (parent_org, secondary type changes) are in the note column, not the action column.

## Open items resolved
- NTT: rename "Nippon Telegraph and Telephone Corporation" to "NTT, Inc." (group.ntt/en shows "NTT, Inc." and "(c) NTT, Inc."; renamed per NTT's 2025-05-09 announcement, effective 2025-07-01). No separate "NTT, Inc." row exists, so rename not merge. NTT Innovative Devices and NTT Research stay separate legal entities.
- Nokia: Nokia Corporation country US -> FI (HQ Karakaari 7, Espoo; ROR Nokia (Finland) 04pkc8m17; the US record is Nokia (United States), child). Nokia Bell Labs: Nokia's own locations page lists Murray Hill, New Jersey as Bell Labs global HQ, so the "Murray Hill" note is supported, not off-paper; it is the research arm of Nokia, not a duplicate; suggest parent_org Nokia Corporation and possibly type research_institute.
- CompoundTek: SG confirmed from own site address (5 International Business Park, Singapore 609914); name becomes "CompoundTek Pte Ltd".
- SMIC: CN confirmed from SMIC About page ("Headquartered in Shanghai, China"); name already correct.
- GT IEN: the Georgia Tech IEN merged with the Institute for Materials into the "Institute for Matter and Systems" on 2024-07-01 (Georgia Tech research news; IMS site confirms current name and Atlanta address). Renamed with a DECISION flag (historical name in the paper). Country US from own address.
- Infinera: acquired by Nokia, closed 2025-02-28 (Nokia newsroom); name kept, parent_org Nokia Corporation suggested.
- Not in this slice: CNIT and INPHOTEC (org_type consortium/other, other agent). Liobate Technology does not occur in organizations.csv at all.

## Other findings needing a lead decision
- Stanford: SNF and SNSF merged into "nano@stanford" on 2025-09-01. Proposed: SNF row renamed to nano@stanford, SNSF row merge_into:nano@stanford. Revert to keep/keep if the table should retain names as cited at paper time.
- Raytheon BBN Technologies -> "RTX BBN Technologies" (RTX press release 2025-08-28), parent RTX Corporation.
- Ciena Corporation country CA -> US (the paper addresses are Ciena Canada; corporation HQ is Hanover MD per ROR). Same logic could apply to other multinationals where a paper gives a subsidiary address.
- Other renames toward the own-site form: 1FINITY Inc. -> 1Finity; NVIDIA Corporation -> NVIDIA; Lightmatter, Inc. -> Lightmatter; MACOM Technology Solutions -> MACOM; Lumiphase AG, Luxtelligence SA, KEEQuant GmbH, SilOriX GmbH, Zurich Instruments AG -> brand only; Ligentec SA -> LIGENTEC; Dream Photonics Inc. -> Dream Photonics; Enosemi Inc -> Enosemi (acquired by AMD, 2025-05); Huawei Technologies -> Huawei Technologies Co., Ltd.; CSEM (French expansion replaced); IHP, IKZ, SIMIT, SIOM, Xi'an Institute of Optics and Precision Mechanics (row name lacked "Xi'an"), IBM Research - Zurich, FIRST, EPFL CMi, CUNY ASRC NanoFab, PARADIM, Istituto Nanoscienze, FMN Laboratory (BMSTU).
- Type: CORNERSTONE facility -> foundry (self-described "prototyping foundry"); A*STAR research_institute -> other (government agency, ROR funder/government).
- Parent_org suggestions: IME and NSTIC -> A*STAR; BRNC -> ETH Zurich; TOPTICA Photonics Inc. -> TOPTICA Photonics SE; AIXTRON Ltd -> AIXTRON SE; Freedom Photonics parent "QCi"; Advanced Micro Foundry (GlobalFoundries acquisition announced, completion not verified); Polariton (Marvell acquisition 2026-04-22 per secondary summary).
- Candidate duplicates not merged (equivalence unproven): HUST CMFC vs OMFC rows; ZJU Micro-Nano Fabrication Center vs ZJU Micro and Nano Processing Platform (same Chinese name, but ZJU also has a Haining-campus center); Takeda Sentanchi Super Cleanroom vs UTokyo Nanofabrication Platform Center.
- No duplicates found for NVIDIA, GlobalFoundries, Keysight (the German GmbH is a distinct subsidiary), Sumitomo trio, or Nokia/Bell Labs.
- no_match (no ROR record and no website found): Cetus Photonics, Genuine Optics, Wuhan ANPI, Wuhan HGGenuine, Hubei Optical Fundamental Research Center, Jiaxing Key Laboratory, La Luce Cristallina, Rhinopix. Country left as in the table (unverified).
- Hong Kong rows (Nanosystem Fabrication Facility) use HK; lead to confirm HK vs CN convention.

## Limits
- Search summaries (not primary pages) underpin: NTT effective date, GT IMS merge date, Marvell/Polariton date, GlobalFoundries/AMF, CICT/CUMEC naming, Enosemi/AMD, DRS/Leonardo DRS. Each is flagged in the note column.
- Own-site fetch blocked or unreachable: Ciena, Keysight, Intel, HPE, RISE, DRS Daylight, CUMEC, CICT, IIT, JONL, SOC, Micram.
