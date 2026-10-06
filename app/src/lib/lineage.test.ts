import { describe, expect, it } from 'vitest';
import { buildLineage, nameKey, orderRows } from './lineage';
import type { Paper } from './types';

const paper = (id: string, year: number, authors: string[]): Paper =>
	({ paper_id: id, label: id, title: id, authors, year }) as unknown as Paper;

describe('lineage heuristic', () => {
	it('normalizes accents, initials and case', () => {
		expect(nameKey('Marko Lončar')).toBe('marko loncar');
		expect(nameKey('Tobias J. Kippenberg')).toBe(nameKey('Tobias Kippenberg'));
	});

	it('marks a junior co-author who later leads as candidate lineage, others as collaboration', () => {
		const g = buildLineage([
			paper('a2018', 2018, ['Ann Junior', 'Bo Second', 'Cy Senior', 'Pat Advisor']),
			paper('b2021', 2021, ['Dee Student', 'Ann Junior']),
			paper('c2022', 2022, ['Eve Student', 'Cy Senior']),
			paper('d2023', 2023, ['Fay Student', 'Pat Advisor'])
		]);
		const lin = g.edges.filter((e) => e.kind === 'lineage');
		const col = g.edges.filter((e) => e.kind === 'collab');
		expect(lin.map((e) => [e.from, e.to])).toEqual([['pat advisor', 'ann junior']]);
		// Cy Senior is in the second half of the author list: collaboration, not lineage
		expect(col.map((e) => [e.from, e.to])).toEqual([['pat advisor', 'cy senior']]);
	});

	it('does not count a co-authorship after the co-author already leads papers as lineage', () => {
		const g = buildLineage([
			paper('x2019', 2019, ['Hal Other', 'Gil Lead']),
			paper('y2020', 2020, ['Gil Lead', 'Ivy Third', 'Jo Fourth', 'Kim Pi'])
		]);
		expect(g.edges.map((e) => e.kind)).toEqual(['collab']);
	});

	it('keeps linked PIs and frequent PIs, grouping components together', () => {
		const g = buildLineage([
			paper('a', 2018, ['Ann Junior', 'Pat Advisor']),
			paper('b', 2021, ['Dee Student', 'Ann Junior']),
			paper('c', 2019, ['Zed One', 'Solo Pi']),
			paper('d', 2020, ['Zed Two', 'Lone Pi'])
		]);
		expect(orderRows(g, 2).map((p) => p.key)).toEqual(['pat advisor', 'ann junior']);
		expect(orderRows(g, 1).map((p) => p.key)).toEqual(['pat advisor', 'ann junior', 'solo pi', 'lone pi']);
	});

	it('matches people by deduplicated person id when present', () => {
		const withIds = (id: string, year: number, authors: string[], ids: string[]): Paper =>
			({ ...paper(id, year, authors), author_ids: ids }) as unknown as Paper;
		const g = buildLineage([
			withIds('a', 2018, ['Ann Junior', 'P. Advisor'], ['ann-junior', '0000-0001']),
			withIds('b', 2020, ['Bo Student', 'Pat Q. Advisor'], ['bo-student', '0000-0001'])
		]);
		expect(g.pis.map((p) => p.key)).toEqual(['0000-0001']);
		expect(g.pis[0].papers.length).toBe(2);
	});
});
