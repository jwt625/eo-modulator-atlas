"""Run this discovery manifest through the repository's serialized downloader.

Usage: .venv/bin/python data/_staging/discovery_2026_10_02/acquire.py queue.json
Existing PDFs are never replaced. Crossref abstracts are stripped. Journal
licenses are never assigned to an arXiv manuscript. No canonical tables change.
"""
from pathlib import Path
import datetime as dt
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
from prefetch_batch import crossref
from extract_source import extract
from fetch_source import arm_breaker, log

def main():
    queue = json.loads(Path(sys.argv[1]).read_text())
    for row in queue:
        pid = row['paper_id']
        out = ROOT / 'references' / pid
        out.mkdir(parents=True, exist_ok=True)
        status = {'paper_id': pid, 'url': row.get('pdf_url', ''), 'checked_on': '2026-10-02'}
        existed = (out / 'source.pdf').exists()
        old_meta = json.loads((out / 'source.json').read_text()) if (out / 'source.json').exists() else None
        try:
            msg = crossref(pid, row.get('doi', ''), out)
            cp = out / 'crossref.json'
            if cp.exists():
                payload = json.loads(cp.read_text())
                if 'abstract' in payload.get('message', {}):
                    del payload['message']['abstract']
                    cp.write_text(json.dumps(payload, indent=1) + '\n')
            status['crossref'] = 'available' if msg else 'not_available'
        except Exception as exc:
            status['crossref'] = type(exc).__name__
            print('Metadata unavailable:', pid, type(exc).__name__, flush=True)
            if 'blocked/throttled' in str(exc):
                raise
        if not row.get('pdf_url'):
            status.update(status='needs_retrieval', reason=row.get('retrieval_reason', 'No downloadable open primary-source PDF located in this search pass.'))
            with (Path(__file__).parent / 'acquisition_status.jsonl').open('a') as handle:
                handle.write(json.dumps(status) + '\n')
            print(pid, status['status'], flush=True)
            continue
        try:
            proc = subprocess.run([sys.executable, str(ROOT / 'scripts/fetch_source.py'), '--paper-id', pid, '--url', row['pdf_url']], capture_output=True, text=True, timeout=300)
        except subprocess.TimeoutExpired:
            # A socket timeout alone does not bound a transfer that trickles bytes.
            # subprocess.run kills and waits for the child, releasing its lock.
            reason = 'Incomplete transfer after five minutes; no retry this pass.'
            arm_breaker(reason, row['pdf_url'])
            log({'paper_id': pid, 'url': row['pdf_url'], 'event': 'coordinator_transfer_timeout', 'reason': reason})
            proc = subprocess.CompletedProcess([], 124, '', reason)
        status['fetch_exit'] = proc.returncode
        if proc.returncode == 0:
            pdf = out / 'source.pdf'
            actual_hash = hashlib.sha256(pdf.read_bytes()).hexdigest()
            if old_meta and old_meta.get('sha256') and old_meta['sha256'] != actual_hash:
                status['status'] = 'source_hash_differs_from_existing_metadata_review_required'
                status['sha256'] = actual_hash
            elif existed and (out / 'text.md').exists():
                status['status'] = 'already_cached'
                status['sha256'] = actual_hash
            else:
                meta = {**(old_meta or {}), 'paper_id': pid, 'url': row['pdf_url'], 'doi': row.get('doi', ''),
                        'source_type': row.get('source_type', 'arxiv_preprint'), 'source_version': row.get('source_version', ''),
                        'license': row.get('license', ''), 'license_verified': bool(row.get('license')),
                        'redistribution': row.get('redistribution', 'restricted_local_only'),
                        'retrieved_on': dt.datetime.now(dt.UTC).isoformat(timespec='seconds'),
                        'acquisition_origin': 'public_primary_source', 'identity_url': row.get('identity_url', ''),
                        'discovery_manifest': 'data/_staging/discovery_2026_10_02/manifest.csv'}
                result = extract(pdf, out, meta)
                status.update(status='cached_and_extracted', sha256=result['sha256'], pages=result['pages'], figures=result['n_figure_files'])
        else:
            status.update(status='needs_retrieval', reason=(proc.stderr or proc.stdout).strip()[:350] or f'Download process stopped (exit {proc.returncode}); incomplete source was not cached.')
        with (Path(__file__).parent / 'acquisition_status.jsonl').open('a') as handle:
            handle.write(json.dumps(status) + '\n')
        print(pid, status['status'], status.get('pages', ''), flush=True)

if __name__ == '__main__':
    main()
