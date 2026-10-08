# Long evidence notes brief (2026-10-07, DevLog-022 D1)

The validator warns on evidence notes over 25 words (`scripts/validate_db.py`). Input:
`data/_staging/ingest_2026_10_07/long_notes.csv` (66 notes: paper_id, device_id, field, words, note).

For each note propose a rewrite of at most 25 words that keeps every fact needed to trace and interpret the value
(conversion formula, which figure/panel, conflicting readings, the rule applied). Read the evidence entry
(`data/evidence/<paper_id>.yaml`: value, basis, locator) and, when needed, the source passage, so nothing becomes
wrong. Information that does not fit and is not already in the row notes (`data/devices.csv` notes of that
device_id) goes to `overflow_to_row_notes` as one short sentence to append there; leave it empty when the row notes
already carry it (say so in `reason`). Never drop a conflicting reading or a caveat; never add new claims.

Output: `data/_staging/ingest_2026_10_07/long_notes_proposals.csv` with columns paper_id, device_id, field,
old_words, new_note, new_words, overflow_to_row_notes, reason. No network, no git, no emoji; write only that file
(if the harness refuses the write, return its full content in your final message). Final message: counts (notes
rewritten, overflow sentences), notes you could not shorten without loss.
