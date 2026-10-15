// Dev-only synthetic electrostatic field on a structured triangle grid, for renderer performance measurements
// (DevLog-027). Not physics: phi = x / w on [-w/2, w/2] x [-h/2, h/2], E = -grad phi per triangle.
import type { EsFields } from './types';

export function syntheticEs(targetTris: number, w = 200, h = 100): EsFields {
	const ny = Math.max(1, Math.round(Math.sqrt(targetTris / 2 / (w / h))));
	const nx = Math.max(1, Math.round(targetTris / 2 / ny));
	const nn = (nx + 1) * (ny + 1);
	const x = new Float64Array(nn), y = new Float64Array(nn), phi = new Float64Array(nn);
	for (let j = 0; j <= ny; j++)
		for (let i = 0; i <= nx; i++) {
			const k = j * (nx + 1) + i;
			x[k] = -w / 2 + (w * i) / nx;
			y[k] = -h / 2 + (h * j) / ny;
			phi[k] = Math.sin((2 * Math.PI * x[k]) / w) * Math.cos((Math.PI * y[k]) / h);
		}
	const nT = 2 * nx * ny;
	const tri = new Int32Array(3 * nT), triRegion = new Int32Array(nT);
	const ex = new Float64Array(nT), ey = new Float64Array(nT);
	let t = 0;
	for (let j = 0; j < ny; j++)
		for (let i = 0; i < nx; i++) {
			const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
			for (const [p, q, r] of [[a, b, d], [a, d, c]]) {
				tri.set([p, q, r], 3 * t);
				triRegion[t] = y[p] + y[q] + y[r] > 0 ? 1 : 0;
				const det = (x[q] - x[p]) * (y[r] - y[p]) - (x[r] - x[p]) * (y[q] - y[p]);
				ex[t] = -((phi[q] - phi[p]) * (y[r] - y[p]) - (phi[r] - phi[p]) * (y[q] - y[p])) / det;
				ey[t] = -((x[q] - x[p]) * (phi[r] - phi[p]) - (x[r] - x[p]) * (phi[q] - phi[p])) / det;
				t++;
			}
		}
	return { x, y, tri, triRegion, regionNames: ['lower', 'upper'], regionMaterials: ['silicon_dioxide', 'lithium_niobate'], phi, ex, ey };
}
