import { describe, expect, it } from 'vitest';
import { clusterPoints, project } from './geo';

const pt = (name: string, lon: number, lat: number, w: number) => ({ lon, lat, w, item: name });

describe('zoom-dependent site clustering', () => {
	it('projects like Web Mercator with 512 px tiles', () => {
		expect(project(0, 0, 0)).toEqual([256, 256]);
		const [x, y] = project(180, 0, 1);
		expect(x).toBeCloseTo(1024);
		expect(y).toBeCloseTo(512);
	});

	it('lumps nearby sites when zoomed out and splits them when zoomed in', () => {
		const pts = [pt('Harvard', -71.118, 42.374, 7), pt('MIT', -71.094, 42.36, 5), pt('Stanford', -122.17, 37.43, 6)];
		const far = clusterPoints(pts, 2);
		expect(far.map((c) => c.items)).toEqual([['Harvard', 'MIT'], ['Stanford']]);
		const near = clusterPoints(pts, 13);
		expect(near.map((c) => c.items)).toEqual([['Harvard'], ['Stanford'], ['MIT']]);
	});

	it('seeds a cluster at its heaviest site', () => {
		const c = clusterPoints([pt('small', 8.55, 47.37, 1), pt('big', 8.54, 47.38, 9)], 3);
		expect(c).toHaveLength(1);
		expect(c[0].items[0]).toBe('big');
		expect([c[0].lon, c[0].lat]).toEqual([8.54, 47.38]);
	});
});
