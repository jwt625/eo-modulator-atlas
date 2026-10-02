Local source cache. In the public repo only `source.json` and `crossref.json` are tracked; PDFs, extracted text and figures are git-ignored and regenerated locally with `scripts/prefetch_batch.py` (public spin-off 2026-10-01, original policy of DevLog-000 decision 5; rights are source-specific). Layout per source:

    references/<paper_id>/
      source.pdf | source.html      raw download
      source.json                   url, doi, sha256, retrieved_on (ISO), license, http status
      text.md                       extracted text, page-delimited ("<!-- page N -->"), metadata header
      figures/page_NN.png           150 dpi render of every page that has a figure caption
      figures/img_pNN_k.png         embedded raster images (>= 150 px)
      figures/figures.json          page/caption index

Public-repo note: tracked `crossref.json` files have the publisher `abstract` field removed (verbatim publisher text); all other Crossref metadata is unchanged.
