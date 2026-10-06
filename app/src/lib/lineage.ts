// Academic lineage derived from author order only (no advisor records exist in the database).
// PI proxy: the last author of a paper. Candidate lineage A -> B: B is in the first half of the
// author list of a paper whose last author is A, published before B's first last-author paper.
// Other co-authorships between PIs are kept as collaboration links. People are matched by the
// deduplicated person id (data/paper_authors.csv) when present, else by a normalized name key.
import type { Paper } from './types';

export interface PiNode {
	key: string;
	name: string;
	papers: Paper[];
	first: number;
	last: number;
}

export interface LineageEdge {
	kind: 'lineage' | 'collab';
	from: string;
	to: string;
	year: number;
	paper: Paper;
	/** 1-based position of `to` in the author list of `paper`, and list length */
	pos: number;
	n: number;
}

export interface LineageGraph {
	pis: PiNode[];
	edges: LineageEdge[];
}

/** Normalized first + last name token: accents and initials dropped, case folded. */
export function nameKey(name: string): string {
	const t = name
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.split(/[\s.]+/)
		.filter((x) => x.replace(/-/g, '').length > 1);
	return t.length >= 2 ? `${t[0]} ${t[t.length - 1]}` : name.trim().toLowerCase();
}

/** Person key of author i: the deduplicated person id when known, else the name key. */
function personKey(p: Paper, i: number): string {
	return p.author_ids?.[i] || nameKey(p.authors[i]);
}

export function buildLineage(papers: Paper[]): LineageGraph {
	const pis = new Map<string, PiNode>();
	const spellings = new Map<string, Map<string, number>>();
	for (const p of papers) {
		const a = p.authors;
		if (!a.length) continue;
		const k = personKey(p, a.length - 1);
		const node = pis.get(k) ?? { key: k, name: '', papers: [], first: p.year, last: p.year };
		node.papers.push(p);
		node.first = Math.min(node.first, p.year);
		node.last = Math.max(node.last, p.year);
		pis.set(k, node);
		const s = spellings.get(k) ?? new Map<string, number>();
		s.set(a[a.length - 1], (s.get(a[a.length - 1]) ?? 0) + 1);
		spellings.set(k, s);
	}
	for (const [k, node] of pis) {
		node.name = [...(spellings.get(k) ?? new Map()).entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0][0];
		node.papers.sort((x, y) => x.year - y.year || x.label.localeCompare(y.label));
	}
	const edges: LineageEdge[] = [];
	const seen = new Set<string>();
	for (const p of papers) {
		const a = p.authors;
		if (a.length < 2) continue;
		const lead = personKey(p, a.length - 1);
		for (let i = 0; i < a.length - 1; i++) {
			const k = personKey(p, i);
			const other = pis.get(k);
			if (!other || k === lead) continue;
			const kind = i < a.length / 2 && p.year < other.first ? 'lineage' : 'collab';
			const id = `${kind}|${lead}|${k}|${p.paper_id}`;
			if (seen.has(id)) continue;
			seen.add(id);
			edges.push({ kind, from: lead, to: k, year: p.year, paper: p, pos: i + 1, n: a.length });
		}
	}
	return { pis: [...pis.values()], edges };
}

/**
 * Rows to draw: PIs with at least `minPapers` last-author papers or any link, grouped by connected
 * component (earliest component first), then by first year and name inside a component.
 */
export function orderRows(g: LineageGraph, minPapers: number): PiNode[] {
	const linked = new Set(g.edges.flatMap((e) => [e.from, e.to]));
	const keep = g.pis.filter((p) => p.papers.length >= minPapers || linked.has(p.key));
	const parent = new Map(keep.map((p) => [p.key, p.key]));
	const find = (k: string): string => {
		let r = k;
		while (parent.get(r) !== r) r = parent.get(r)!;
		return r;
	};
	for (const e of g.edges) if (parent.has(e.from) && parent.has(e.to)) parent.set(find(e.from), find(e.to));
	const comp = new Map<string, PiNode[]>();
	for (const p of keep) comp.set(find(p.key), [...(comp.get(find(p.key)) ?? []), p]);
	const byStart = (x: PiNode, y: PiNode) => x.first - y.first || x.name.localeCompare(y.name);
	return [...comp.values()]
		.map((c) => c.sort(byStart))
		.sort((x, y) => byStart(x[0], y[0]) || y.length - x.length)
		.flat();
}
