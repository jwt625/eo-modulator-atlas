Local source cache. Tracked here: `source.json`, `crossref.json` and cached `source.pdf` files. Extracted text and figures are git-ignored and regenerated locally with `scripts/prefetch_batch.py` (rights are source-specific). Layout per source:

    references/<paper_id>/
      source.pdf | source.html      raw download
      source.json                   url, doi, sha256, retrieved_on (ISO), license, http status
      text.md                       extracted text, page-delimited ("<!-- page N -->"), metadata header
      figures/page_NN.png           150 dpi render of every page that has a figure caption
      figures/img_pNN_k.png         embedded raster images (>= 150 px)
      figures/figures.json          page/caption index

Public-repo note: tracked `crossref.json` files have the publisher `abstract` field removed (verbatim publisher text); all other Crossref metadata is unchanged.

The [2026-10-02 discovery report](../data/_staging/discovery_2026_10_02/REPORT.md)
records the 2020–2026 cache expansion and exact source versions. Current
[retrieval requests](../data/_staging/discovery_2026_10_02/RETRIEVAL_REQUESTS.md)
use the local, git-ignored [`_inbox/`](_inbox/README.md).
