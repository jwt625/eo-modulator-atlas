// 256-entry colormap lookup tables built by linear interpolation between published anchor colors.
// viridis/inferno anchors: matplotlib (sampled at equal steps); RdBu: ColorBrewer 11-class diverging (reversed so
// negative = blue). Linear sRGB interpolation between anchors is a display approximation of the originals.

export type ColormapName = 'viridis' | 'inferno' | 'rdbu' | 'gray';

const ANCHORS: Record<ColormapName, string[]> = {
	viridis: ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'],
	inferno: ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4'],
	rdbu: ['#053061', '#2166ac', '#4393c3', '#92c5de', '#d1e5f0', '#f7f7f7', '#fddbc7', '#f4a582', '#d6604d', '#b2182b', '#67001f'],
	gray: ['#000000', '#ffffff']
};

export const COLORMAPS: ColormapName[] = ['viridis', 'inferno', 'rdbu', 'gray'];

export function hexToRgb(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const cache = new Map<ColormapName, Uint8Array>();

/** RGBA8 table, 256 entries. */
export function colormapLut(name: ColormapName): Uint8Array {
	const hit = cache.get(name);
	if (hit) return hit;
	const anchors = ANCHORS[name].map(hexToRgb);
	const lut = new Uint8Array(256 * 4);
	for (let i = 0; i < 256; i++) {
		const u = (i / 255) * (anchors.length - 1);
		const k = Math.min(anchors.length - 2, Math.floor(u));
		const f = u - k;
		for (let c = 0; c < 3; c++) lut[4 * i + c] = Math.round(anchors[k][c] * (1 - f) + anchors[k + 1][c] * f);
		lut[4 * i + 3] = 255;
	}
	cache.set(name, lut);
	return lut;
}

export function lutColor(lut: Uint8Array, t: number): string {
	const i = Math.max(0, Math.min(255, Math.round(t * 255)));
	return `rgb(${lut[4 * i]},${lut[4 * i + 1]},${lut[4 * i + 2]})`;
}

// Material colors: fixed for the common materials, otherwise from a muted categorical list by first use.
const MATERIAL: Record<string, string> = {
	air: '#1f2b3a',
	vacuum: '#1f2b3a',
	silicon: '#6b6e7d',
	silicon_dioxide: '#4a7d9b',
	sio2: '#4a7d9b',
	lithium_niobate: '#a76cb4',
	lithium_tantalate: '#8f6cc0',
	silicon_nitride: '#5e9c76',
	barium_titanate: '#b07d5a',
	gold: '#d9ab52',
	metal: '#d9ab52',
	aluminum: '#a9b3bd'
};
const EXTRA = ['#7a8f5c', '#5c7a8f', '#8f5c7a', '#8f7a5c', '#5c8f86', '#6f5c8f', '#8f665c', '#5c668f'];

export function materialColor(name: string, conductor = false): string {
	if (MATERIAL[name]) return MATERIAL[name];
	if (conductor) return MATERIAL.gold;
	let h = 0;
	for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
	return EXTRA[h % EXTRA.length];
}
