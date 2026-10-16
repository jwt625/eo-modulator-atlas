// Field renderer (DevLog-023 D8, DevLog-032 layers, DevLog-034 refined display): WebGL2, one indexed draw call per
// layer. A frame is an ordered list of layers (COMSOL plot features): surface (color table fill), contour (iso-lines in
// the fragment shader at up to 64 levels, color table or uniform), region (material colors, mesh view), each on its own
// mesh with an optional region mask (selection filter); then instanced arrows. Every layer is drawn on the refined
// display of its mesh at level r (r^2 sub-triangles per element, values per element-local lattice point, Gouraud
// shading inside sub-triangles; contours therefore follow the refined values); the wireframe draws the parent elements.
// Buffers are cached per (mesh, r) (LRU), value buffers per values array. Canvas2DRenderer is the fallback when WebGL2
// is unavailable.
import { colormapLut, hexToRgb, type ColormapName } from './colormap';
import { scaleT, type Range } from './fieldmath';
import { refinedDisplay, type RefinedDisplay } from './refined';
import type { FieldMesh, ScaleMode } from './types';

export interface View {
	/** World point (um) at the canvas centre. */
	cx: number;
	cy: number;
	/** CSS px per um. */
	scale: number;
}

export interface Layer {
	kind: 'surface' | 'contour' | 'region';
	mesh: FieldMesh;
	/** Refinement level of the values (default 1 = element corners). */
	r?: number;
	/** One value per element-local lattice point of level r, element-major (engine `location: 'refined'`). */
	values?: ArrayLike<number> | null;
	scaleMode?: ScaleMode;
	range?: Range;
	colormap?: ColormapName;
	reverse?: boolean;
	/** Contour levels in value units (at most 64). */
	levels?: number[];
	/** Contour uniform color (null = color table). */
	uniform?: string | null;
	/** Allowed region indices of this mesh (selection filter); null = all. */
	regionMask?: Uint8Array | null;
	/** Data range: fragments with values outside [min, max] are not drawn (surface and contour). */
	dataRange?: Range | null;
	regionColors?: string[];
	wire?: boolean;
	wireColor?: string;
	/** Value sampler for the Canvas 2D raster mode (value at a world point). */
	sampler?: (x: number, y: number) => { v: number; region: number } | null;
}

export interface ArrowSet {
	/** Instances: x, y (um), angle (rad), length (CSS px). */
	inst: Float32Array;
	color: string;
	heads: boolean;
}

export interface DrawState {
	view: View;
	background: string;
	layers: Layer[];
	arrows: ArrowSet[];
}

export interface FieldRenderer {
	readonly kind: 'webgl2' | 'canvas2d';
	resize(cssW: number, cssH: number, dpr: number): void;
	draw(s: DrawState): void;
	isLost(): boolean;
	info(): string;
	dispose(): void;
}

const MAX_LEVELS = 64;

const VS = `#version 300 es
in vec2 aPos;
in vec2 aBary;
in float aVal;
in float aReg;
uniform vec2 uScale;
uniform vec2 uOffset;
out float vVal;
out vec3 vBary;
flat out int vReg;
void main() {
	vBary = vec3(aBary, 1.0 - aBary.x - aBary.y);
	vVal = aVal;
	vReg = int(aReg + 0.5);
	gl_Position = vec4(aPos * uScale + uOffset, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
in float vVal;
in vec3 vBary;
flat in int vReg;
uniform int uMode; // 0 region, 1 surface, 2 contour
uniform int uLog;
uniform float uMin;
uniform float uMax;
uniform sampler2D uLut;
uniform sampler2D uRegions;
uniform sampler2D uMask;
uniform int uUseMask;
uniform float uWire;
uniform vec3 uWireColor;
uniform int uNLevels;
uniform float uLevels[${MAX_LEVELS}];
uniform int uUniform;
uniform vec3 uUniformColor;
uniform int uUseData;
uniform float uDataMin;
uniform float uDataMax;
out vec4 outColor;
float mapT(float v) {
	if (uLog == 2) {
		float a = abs(v);
		if (a < uMin) return 0.5;
		float u = min(1.0, (log2(a) - log2(uMin)) / (log2(uMax) - log2(uMin)));
		return 0.5 + 0.5 * sign(v) * u;
	}
	if (uLog == 1) {
		float a = abs(v);
		if (a <= 0.0) return -1.0;
		return (log2(a) - log2(uMin)) / (log2(uMax) - log2(uMin));
	}
	return (v - uMin) / (uMax - uMin);
}
vec3 lut(float t) { return texture(uLut, vec2(clamp(t, 0.0, 1.0) * (255.0 / 256.0) + 0.5 / 256.0, 0.5)).rgb; }
void main() {
	if (uUseMask == 1 && texelFetch(uMask, ivec2(vReg, 0), 0).r < 0.5) discard;
	if (uUseData == 1 && uMode != 0 && (vVal < uDataMin || vVal > uDataMax)) discard;
	vec3 col;
	float alpha = 1.0;
	if (uMode == 1) {
		col = lut(mapT(vVal));
	} else if (uMode == 2) {
		float t = mapT(vVal);
		float w = max(fwidth(t), 1e-7);
		float best = 0.0;
		float lev = 0.0;
		for (int i = 0; i < ${MAX_LEVELS}; i++) {
			if (i >= uNLevels) break;
			float d = abs(t - uLevels[i]) / w;
			float a = 1.0 - smoothstep(0.6, 1.4, d);
			if (a > best) { best = a; lev = uLevels[i]; }
		}
		if (best <= 0.01) discard;
		col = uUniform == 1 ? uUniformColor : lut(lev);
		alpha = best;
	} else {
		col = texelFetch(uRegions, ivec2(vReg, 0), 0).rgb;
	}
	if (uWire > 0.5) {
		float d = min(min(vBary.x, vBary.y), vBary.z);
		float fw = max(fwidth(d), 1e-6);
		float line = 1.0 - smoothstep(0.0, 1.2 * fw, d);
		float fade = clamp(((1.0 / 3.0) / fw - 1.5) / 3.0, 0.0, 1.0);
		col = mix(col, uWireColor, 0.8 * line * fade);
	}
	outColor = vec4(col, alpha);
}`;

const AVS = `#version 300 es
in vec2 aBase;
in vec4 aInst;
uniform vec2 uScale;
uniform vec2 uOffset;
uniform vec2 uPx;
void main() {
	vec2 p = aInst.xy * uScale + uOffset;
	float c = cos(aInst.z), s = sin(aInst.z);
	vec2 b = (aBase - vec2(0.5, 0.0)) * aInst.w;
	vec2 r = vec2(c * b.x - s * b.y, s * b.x + c * b.y);
	gl_Position = vec4(p + r * uPx, 0.0, 1.0);
}`;

const AFS = `#version 300 es
precision mediump float;
uniform vec4 uColor;
out vec4 outColor;
void main() { outColor = uColor; }`;

// Arrow template along +x, unit length: shaft (2 triangles) and head (1 triangle); heads off = shaft to the tip.
const ARROW = new Float32Array([0, -0.05, 0.62, -0.05, 0.62, 0.05, 0, -0.05, 0.62, 0.05, 0, 0.05, 0.62, -0.2, 1, 0, 0.62, 0.2]);
const SHAFT = new Float32Array([0, -0.04, 1, -0.04, 1, 0.04, 0, -0.04, 1, 0.04, 0, 0.04]);

const rgb01 = (hex: string): [number, number, number] => hexToRgb(hex).map((v) => v / 255) as [number, number, number];

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
	const prog = gl.createProgram()!;
	for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
		const sh = gl.createShader(type)!;
		gl.shaderSource(sh, src);
		gl.compileShader(sh);
		if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`shader: ${gl.getShaderInfoLog(sh)}`);
		gl.attachShader(prog, sh);
	}
	gl.linkProgram(prog);
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`program: ${gl.getProgramInfoLog(prog)}`);
	return prog;
}

/** Mesh centre used as the float32 origin of vertex positions. */
function centreOf(mesh: FieldMesh): [number, number] {
	let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
	for (let i = 0; i < mesh.x.length; i++) {
		x0 = Math.min(x0, mesh.x[i]); x1 = Math.max(x1, mesh.x[i]);
		y0 = Math.min(y0, mesh.y[i]); y1 = Math.max(y1, mesh.y[i]);
	}
	return [(x0 + x1) / 2, (y0 + y1) / 2];
}

/** Lattice values of a layer, checked against its refined display (a wrong length draws nothing). */
function layerValues(L: Layer, d: { nT: number; np: number }): ArrayLike<number> | null {
	return L.values && L.values.length === d.nT * d.np ? L.values : null;
}

/** Contour levels mapped to the color coordinate t of the shader (linear, log or symlog). */
function levelT(levels: number[], mode: ScaleMode, r: Range): number[] {
	return levels.slice(0, MAX_LEVELS).map((l) => {
		if (mode === 'symlog') return scaleT(l, 'symlog', r);
		if (mode === 'log') return l > 0 ? (Math.log10(l) - Math.log10(r.min)) / (Math.log10(r.max) - Math.log10(r.min)) : -10;
		return (l - r.min) / (r.max - r.min);
	});
}

interface MeshEntry {
	pos: WebGLBuffer;
	bary: WebGLBuffer;
	reg: WebGLBuffer;
	idx: WebGLBuffer;
	/** Index count (3 per sub-triangle). */
	n: number;
	/** Elements and lattice points per element (the display arrays themselves are not retained, F2). */
	disp: { nT: number; np: number };
	c0: [number, number];
	vals: Map<ArrayLike<number>, WebGLBuffer>;
	used: number;
}

export class GlRenderer implements FieldRenderer {
	readonly kind = 'webgl2' as const;
	private gl: WebGL2RenderingContext;
	private prog: WebGLProgram;
	private aprog: WebGLProgram;
	private vao: WebGLVertexArrayObject;
	private avao: WebGLVertexArrayObject;
	private shaftVao: WebGLVertexArrayObject;
	private instBuf: WebGLBuffer;
	private zeroBuf: WebGLBuffer;
	private lutTex: WebGLTexture;
	private regTex: WebGLTexture;
	private maskTex: WebGLTexture;
	private lutKey = '';
	private regKey = '';
	private meshes = new Map<string, MeshEntry>();
	private meshKeys = new WeakMap<FieldMesh, number>();
	private meshSeq = 0;
	private frame = 0;
	private u: Record<string, WebGLUniformLocation | null> = {};
	private au: Record<string, WebGLUniformLocation | null> = {};
	private loc: Record<string, number> = {};
	private cssW = 1;
	private cssH = 1;

	static create(canvas: HTMLCanvasElement): GlRenderer | null {
		const gl = canvas.getContext('webgl2', { antialias: true, preserveDrawingBuffer: false, alpha: false });
		if (!gl) return null;
		try {
			return new GlRenderer(gl);
		} catch {
			return null;
		}
	}

	private constructor(gl: WebGL2RenderingContext) {
		this.gl = gl;
		this.prog = compile(gl, VS, FS);
		this.aprog = compile(gl, AVS, AFS);
		for (const n of ['uScale', 'uOffset', 'uMode', 'uLog', 'uMin', 'uMax', 'uLut', 'uRegions', 'uMask', 'uUseMask', 'uWire', 'uWireColor', 'uNLevels', 'uLevels', 'uUniform', 'uUniformColor', 'uUseData', 'uDataMin', 'uDataMax'])
			this.u[n] = gl.getUniformLocation(this.prog, n);
		for (const n of ['uScale', 'uOffset', 'uPx', 'uColor']) this.au[n] = gl.getUniformLocation(this.aprog, n);
		for (const n of ['aPos', 'aBary', 'aVal', 'aReg']) this.loc[n] = gl.getAttribLocation(this.prog, n);
		this.vao = gl.createVertexArray()!;
		this.zeroBuf = gl.createBuffer()!;
		this.instBuf = gl.createBuffer()!;
		const arrowVao = (shape: Float32Array) => {
			const vao = gl.createVertexArray()!;
			gl.bindVertexArray(vao);
			const baseBuf = gl.createBuffer()!;
			gl.bindBuffer(gl.ARRAY_BUFFER, baseBuf);
			gl.bufferData(gl.ARRAY_BUFFER, shape, gl.STATIC_DRAW);
			const bl = gl.getAttribLocation(this.aprog, 'aBase');
			gl.enableVertexAttribArray(bl);
			gl.vertexAttribPointer(bl, 2, gl.FLOAT, false, 0, 0);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
			const il = gl.getAttribLocation(this.aprog, 'aInst');
			gl.enableVertexAttribArray(il);
			gl.vertexAttribPointer(il, 4, gl.FLOAT, false, 0, 0);
			gl.vertexAttribDivisor(il, 1);
			gl.bindVertexArray(null);
			return vao;
		};
		this.avao = arrowVao(ARROW);
		this.shaftVao = arrowVao(SHAFT);
		const tex = () => {
			const t = gl.createTexture()!;
			gl.bindTexture(gl.TEXTURE_2D, t);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			return t;
		};
		this.lutTex = tex();
		this.regTex = tex();
		this.maskTex = tex();
		gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	}

	isLost(): boolean {
		return this.gl.isContextLost();
	}

	info(): string {
		const gl = this.gl;
		const ext = gl.getExtension('WEBGL_debug_renderer_info');
		return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
	}

	resize(cssW: number, cssH: number, dpr: number): void {
		this.cssW = Math.max(1, cssW);
		this.cssH = Math.max(1, cssH);
		const c = this.gl.canvas as HTMLCanvasElement;
		const w = Math.max(1, Math.round(cssW * dpr)), h = Math.max(1, Math.round(cssH * dpr));
		if (c.width !== w || c.height !== h) {
			c.width = w;
			c.height = h;
		}
	}

	private key(mesh: FieldMesh, r: number): string {
		let k = this.meshKeys.get(mesh);
		if (k === undefined) this.meshKeys.set(mesh, (k = ++this.meshSeq));
		return `${k}:${r}`;
	}

	private entry(mesh: FieldMesh, r: number): MeshEntry {
		const key = this.key(mesh, r);
		let e = this.meshes.get(key);
		if (!e) {
			const gl = this.gl;
			const d = refinedDisplay(mesh, r);
			const c0 = centreOf(mesh);
			const n = d.x.length;
			const pos = new Float32Array(2 * n);
			const reg = new Float32Array(n);
			for (let i = 0; i < n; i++) {
				pos[2 * i] = d.x[i] - c0[0];
				pos[2 * i + 1] = d.y[i] - c0[1];
			}
			for (let t = 0; t < d.nT; t++) reg.fill(mesh.triRegion[t], t * d.np, (t + 1) * d.np);
			const buf = (data: ArrayBufferView<ArrayBuffer>, target: number = gl.ARRAY_BUFFER) => {
				const b = gl.createBuffer()!;
				gl.bindBuffer(target, b);
				gl.bufferData(target, data, gl.STATIC_DRAW);
				return b;
			};
			gl.bindVertexArray(this.vao);
			e = { pos: buf(pos), bary: buf(d.bary), reg: buf(reg), idx: buf(d.sub, gl.ELEMENT_ARRAY_BUFFER), n: d.sub.length, disp: { nT: d.nT, np: d.np }, c0, vals: new Map(), used: 0 };
			this.meshes.set(key, e);
		}
		e.used = this.frame;
		return e;
	}

	private valueBuf(e: MeshEntry, values: ArrayLike<number>): WebGLBuffer {
		const hit = e.vals.get(values);
		if (hit) return hit;
		const gl = this.gl;
		const buf = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, values instanceof Float32Array ? values : Float32Array.from(values), gl.STATIC_DRAW);
		// keep a few value arrays per mesh (layer switching without re-upload)
		if (e.vals.size >= 6) {
			const [k, old] = e.vals.entries().next().value!;
			gl.deleteBuffer(old);
			e.vals.delete(k);
		}
		e.vals.set(values, buf);
		return buf;
	}

	private release(e: MeshEntry) {
		const gl = this.gl;
		for (const b of [e.pos, e.bary, e.reg, e.idx]) gl.deleteBuffer(b);
		for (const v of e.vals.values()) gl.deleteBuffer(v);
	}

	private evict(keep: Set<string>) {
		if (this.meshes.size <= 4) return;
		const old = [...this.meshes.entries()].filter(([k]) => !keep.has(k)).sort((a, b) => a[1].used - b[1].used);
		while (this.meshes.size > 4 && old.length) {
			const [k, e] = old.shift()!;
			this.release(e);
			this.meshes.delete(k);
		}
	}

	private uploadLut(name: ColormapName, reverse: boolean) {
		const key = `${name}:${reverse}`;
		if (this.lutKey === key) return;
		const gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, colormapLut(name, reverse));
		this.lutKey = key;
	}

	private uploadRegions(colors: string[]) {
		const key = colors.join(',');
		if (key === this.regKey) return;
		const gl = this.gl;
		const n = Math.max(1, colors.length);
		const data = new Uint8Array(4 * n);
		colors.forEach((c, i) => {
			const [r, g, b] = hexToRgb(c);
			data.set([r, g, b, 255], 4 * i);
		});
		gl.bindTexture(gl.TEXTURE_2D, this.regTex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, n, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
		this.regKey = key;
	}

	private uploadMask(mask: Uint8Array) {
		const gl = this.gl;
		const n = Math.max(1, mask.length);
		const data = new Uint8Array(4 * n);
		for (let i = 0; i < mask.length; i++) data[4 * i] = mask[i] ? 255 : 0;
		gl.bindTexture(gl.TEXTURE_2D, this.maskTex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, n, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
	}

	draw(s: DrawState): void {
		const gl = this.gl;
		this.frame++;
		const c = gl.canvas as HTMLCanvasElement;
		gl.viewport(0, 0, c.width, c.height);
		const [br, bg, bb] = rgb01(s.background);
		gl.clearColor(br, bg, bb, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		const sx = (2 * s.view.scale) / this.cssW, sy = (2 * s.view.scale) / this.cssH;
		const u = this.u;
		gl.useProgram(this.prog);
		gl.bindVertexArray(this.vao);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		const used = new Set<string>();
		for (const L of s.layers) {
			const lev = L.r ?? 1;
			const e = this.entry(L.mesh, lev);
			used.add(this.key(L.mesh, lev));
			const scalar = L.kind !== 'region';
			const vals = scalar ? layerValues(L, e.disp) : null;
			if (scalar && !vals) continue;
			gl.uniform2f(u.uScale, sx, sy);
			gl.uniform2f(u.uOffset, (e.c0[0] - s.view.cx) * sx, (e.c0[1] - s.view.cy) * sy);
			const bind = (buf: WebGLBuffer, name: string) => {
				gl.bindBuffer(gl.ARRAY_BUFFER, buf);
				gl.enableVertexAttribArray(this.loc[name]);
				gl.vertexAttribPointer(this.loc[name], name === 'aPos' || name === 'aBary' ? 2 : 1, gl.FLOAT, false, 0, 0);
			};
			bind(e.pos, 'aPos');
			bind(e.bary, 'aBary');
			bind(e.reg, 'aReg');
			if (vals) bind(this.valueBuf(e, vals), 'aVal');
			else {
				gl.disableVertexAttribArray(this.loc.aVal);
				gl.vertexAttrib1f(this.loc.aVal, 0);
			}
			const r = L.range ?? { min: 0, max: 1 };
			gl.uniform1i(u.uMode, L.kind === 'surface' ? 1 : L.kind === 'contour' ? 2 : 0);
			gl.uniform1i(u.uLog, L.scaleMode === 'log' ? 1 : L.scaleMode === 'symlog' ? 2 : 0);
			gl.uniform1f(u.uMin, r.min);
			gl.uniform1f(u.uMax, r.max === r.min ? r.min + 1 : r.max);
			this.uploadLut(L.colormap ?? 'Rainbow', !!L.reverse);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
			gl.uniform1i(u.uLut, 0);
			if (L.regionColors) this.uploadRegions(L.regionColors);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, this.regTex);
			gl.uniform1i(u.uRegions, 1);
			gl.uniform1i(u.uUseMask, L.regionMask ? 1 : 0);
			if (L.regionMask) this.uploadMask(L.regionMask);
			gl.activeTexture(gl.TEXTURE2);
			gl.bindTexture(gl.TEXTURE_2D, this.maskTex);
			gl.uniform1i(u.uMask, 2);
			gl.uniform1f(u.uWire, L.wire ? 1 : 0);
			gl.uniform3fv(u.uWireColor, rgb01(L.wireColor ?? '#e8e8e8'));
			const lv = L.kind === 'contour' ? levelT(L.levels ?? [], L.scaleMode ?? 'linear', r) : [];
			gl.uniform1i(u.uNLevels, lv.length);
			if (lv.length) gl.uniform1fv(u.uLevels, Float32Array.from(lv));
			gl.uniform1i(u.uUseData, L.dataRange ? 1 : 0);
			gl.uniform1f(u.uDataMin, L.dataRange?.min ?? 0);
			gl.uniform1f(u.uDataMax, L.dataRange?.max ?? 0);
			gl.uniform1i(u.uUniform, L.uniform ? 1 : 0);
			gl.uniform3fv(u.uUniformColor, rgb01(L.uniform ?? '#ffffff'));
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, e.idx);
			gl.drawElements(gl.TRIANGLES, e.n, gl.UNSIGNED_INT, 0);
		}
		gl.disable(gl.BLEND);
		for (const a of s.arrows) {
			if (!a.inst.length) continue;
			const inst = new Float32Array(a.inst.length);
			for (let i = 0; i < a.inst.length; i += 4) {
				inst[i] = a.inst[i] - s.view.cx;
				inst[i + 1] = a.inst[i + 1] - s.view.cy;
				inst[i + 2] = a.inst[i + 2];
				inst[i + 3] = a.inst[i + 3];
			}
			gl.useProgram(this.aprog);
			gl.bindVertexArray(a.heads ? this.avao : this.shaftVao);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
			gl.bufferData(gl.ARRAY_BUFFER, inst, gl.STREAM_DRAW);
			gl.uniform2f(this.au.uScale, sx, sy);
			gl.uniform2f(this.au.uOffset, 0, 0);
			gl.uniform2f(this.au.uPx, 2 / this.cssW, 2 / this.cssH);
			const [r, g, b] = rgb01(a.color);
			gl.uniform4f(this.au.uColor, r, g, b, 1);
			gl.drawArraysInstanced(gl.TRIANGLES, 0, a.heads ? 9 : 6, inst.length / 4);
		}
		gl.bindVertexArray(null);
		this.evict(used);
	}

	dispose(): void {
		const gl = this.gl;
		for (const e of this.meshes.values()) this.release(e);
		this.meshes.clear();
		for (const b of [this.instBuf, this.zeroBuf]) gl.deleteBuffer(b);
		for (const t of [this.lutTex, this.regTex, this.maskTex]) gl.deleteTexture(t);
		gl.deleteProgram(this.prog);
		gl.deleteProgram(this.aprog);
		gl.getExtension('WEBGL_lose_context')?.loseContext();
	}
}

/** Canvas 2D fallback: flat sub-triangles with viewport culling, or a gap-free raster over budget (W4); marching-triangle contours on the sub-triangles. */
export class Canvas2DRenderer implements FieldRenderer {
	readonly kind = 'canvas2d' as const;
	private ctx: CanvasRenderingContext2D;
	private cssW = 1;
	private cssH = 1;
	private dpr = 1;
	budget = 60000;

	constructor(canvas: HTMLCanvasElement) {
		this.ctx = canvas.getContext('2d')!;
	}

	info(): string {
		return 'Canvas 2D fallback';
	}

	isLost(): boolean {
		return false;
	}

	resize(cssW: number, cssH: number, dpr: number): void {
		this.cssW = Math.max(1, cssW);
		this.cssH = Math.max(1, cssH);
		this.dpr = dpr;
		const c = this.ctx.canvas;
		c.width = Math.max(1, Math.round(cssW * dpr));
		c.height = Math.max(1, Math.round(cssH * dpr));
	}

	draw(s: DrawState): void {
		const { ctx } = this;
		ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		ctx.fillStyle = s.background;
		ctx.fillRect(0, 0, this.cssW, this.cssH);
		const { cx, cy, scale } = s.view;
		const W = this.cssW, H = this.cssH;
		const X = (x: number) => W / 2 + (x - cx) * scale;
		const Y = (y: number) => H / 2 - (y - cy) * scale;
		for (const L of s.layers) {
			const m = L.mesh;
			const nT = m.tri.length / 3;
			const scalar = L.kind !== 'region';
			const d = refinedDisplay(m, L.r ?? 1);
			const vals = scalar ? layerValues(L, d) : null;
			if (scalar && !vals) continue;
			const r = L.range ?? { min: 0, max: 1 };
			const mode = L.scaleMode ?? 'linear';
			const lut = colormapLut(L.colormap ?? 'Rainbow', !!L.reverse);
			const dr = L.dataRange;
			const ns = d.r * d.r;
			const visible: number[] = [];
			for (let t = 0; t < nT; t++) {
				if (L.regionMask && !L.regionMask[m.triRegion[t]]) continue;
				const a = m.tri[3 * t], b = m.tri[3 * t + 1], c = m.tri[3 * t + 2];
				const x0 = Math.min(X(m.x[a]), X(m.x[b]), X(m.x[c])), x1 = Math.max(X(m.x[a]), X(m.x[b]), X(m.x[c]));
				const y0 = Math.min(Y(m.y[a]), Y(m.y[b]), Y(m.y[c])), y1 = Math.max(Y(m.y[a]), Y(m.y[b]), Y(m.y[c]));
				if (x1 >= 0 && x0 <= W && y1 >= 0 && y0 <= H) visible.push(t);
			}
			if (L.kind === 'contour') {
				this.contours(L, d, vals!, visible, X, Y, mode, r, lut);
				continue;
			}
			if (visible.length * ns > this.budget && L.sampler) {
				this.raster(L, s.view, mode, r, lut);
				continue;
			}
			const stride = Math.max(1, Math.ceil((visible.length * ns) / this.budget));
			const wire = L.wire && visible.length < 20000;
			// F3: each flat sub-triangle is stroked 1 px wide in its own color (slight overdraw hides anti-aliasing seams)
			ctx.lineWidth = 1;
			let k = 0;
			for (const t of visible) {
				for (let q = 0; q < ns; q++, k++) {
					if (k % stride) continue;
					const o = 3 * (t * ns + q);
					const i0 = d.sub[o], i1 = d.sub[o + 1], i2 = d.sub[o + 2];
					let fill: string;
					if (vals) {
						const v = (vals[i0] + vals[i1] + vals[i2]) / 3;
						if (dr && !(v >= dr.min && v <= dr.max)) continue;
						const u = scaleT(v, mode, r);
						const i = Math.round((Number.isFinite(u) ? u : 0) * 255);
						fill = `rgb(${lut[4 * i]},${lut[4 * i + 1]},${lut[4 * i + 2]})`;
					} else fill = L.regionColors?.[m.triRegion[t]] ?? '#808080';
					ctx.beginPath();
					ctx.moveTo(X(d.x[i0]), Y(d.y[i0]));
					ctx.lineTo(X(d.x[i1]), Y(d.y[i1]));
					ctx.lineTo(X(d.x[i2]), Y(d.y[i2]));
					ctx.closePath();
					ctx.fillStyle = fill;
					ctx.fill();
					ctx.strokeStyle = fill;
					ctx.stroke();
				}
				if (wire) {
					ctx.lineWidth = 0.5;
					const a = m.tri[3 * t], b = m.tri[3 * t + 1], c = m.tri[3 * t + 2];
					ctx.beginPath();
					ctx.moveTo(X(m.x[a]), Y(m.y[a]));
					ctx.lineTo(X(m.x[b]), Y(m.y[b]));
					ctx.lineTo(X(m.x[c]), Y(m.y[c]));
					ctx.closePath();
					ctx.strokeStyle = L.wireColor ?? '#e8e8e8';
					ctx.stroke();
					ctx.lineWidth = 1;
				}
			}
		}
		for (const a of s.arrows) {
			ctx.strokeStyle = a.color;
			ctx.fillStyle = a.color;
			ctx.lineWidth = 1.2;
			for (let i = 0; i < a.inst.length; i += 4) {
				const px = X(a.inst[i]), py = Y(a.inst[i + 1]);
				const ux = Math.cos(a.inst[i + 2]), uy = -Math.sin(a.inst[i + 2]);
				const len = a.inst[i + 3];
				const tipX = px + (ux * len) / 2, tipY = py + (uy * len) / 2;
				ctx.beginPath();
				ctx.moveTo(px - (ux * len) / 2, py - (uy * len) / 2);
				ctx.lineTo(tipX, tipY);
				ctx.stroke();
				if (!a.heads) continue;
				const h = 0.38 * len, w = 0.2 * len;
				ctx.beginPath();
				ctx.moveTo(tipX, tipY);
				ctx.lineTo(tipX - ux * h - uy * w, tipY - uy * h + ux * w);
				ctx.lineTo(tipX - ux * h + uy * w, tipY - uy * h - ux * w);
				ctx.closePath();
				ctx.fill();
			}
		}
	}

	/** Gap-free raster: one sampled value per few px through the layer sampler. */
	private raster(L: Layer, view: View, mode: ScaleMode, r: Range, lut: Uint8Array) {
		const { ctx } = this;
		const W = this.cssW, H = this.cssH;
		const cell = Math.max(2, Math.ceil(Math.sqrt((W * H) / 60000)));
		const nx = Math.ceil(W / cell), ny = Math.ceil(H / cell);
		const img = new ImageData(nx, ny);
		for (let j = 0; j < ny; j++)
			for (let i = 0; i < nx; i++) {
				const wx = view.cx + ((i + 0.5) * cell - W / 2) / view.scale, wy = view.cy - ((j + 0.5) * cell - H / 2) / view.scale;
				const s = L.sampler!(wx, wy);
				if (!s) continue;
				if (L.regionMask && !L.regionMask[s.region]) continue;
				if (L.dataRange && (s.v < L.dataRange.min || s.v > L.dataRange.max)) continue;
				let rgb: number[];
				if (L.kind === 'surface' && Number.isFinite(s.v)) {
					const k = Math.round(scaleT(s.v, mode, r) * 255);
					rgb = [lut[4 * k], lut[4 * k + 1], lut[4 * k + 2]];
				} else if (L.kind === 'region') rgb = hexToRgb(L.regionColors?.[s.region] ?? '#808080');
				else continue;
				const o = 4 * (j * nx + i);
				img.data[o] = rgb[0]; img.data[o + 1] = rgb[1]; img.data[o + 2] = rgb[2]; img.data[o + 3] = 255;
			}
		const off = new OffscreenCanvas(nx, ny);
		off.getContext('2d')!.putImageData(img, 0, 0);
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(off, 0, 0, nx * cell, ny * cell);
	}

	private contours(L: Layer, d: RefinedDisplay, cv: ArrayLike<number>, visible: number[], X: (x: number) => number, Y: (y: number) => number, mode: ScaleMode, r: Range, lut: Uint8Array) {
		const { ctx } = this;
		const levels = (L.levels ?? []).slice(0, MAX_LEVELS);
		const ns = d.r * d.r;
		ctx.lineWidth = 1;
		const u = [0, 0, 0], px = [0, 0, 0], py = [0, 0, 0];
		for (const lev of levels) {
			const tl = scaleT(lev, mode, r);
			const k = Math.round(tl * 255);
			ctx.strokeStyle = L.uniform ?? `rgb(${lut[4 * k]},${lut[4 * k + 1]},${lut[4 * k + 2]})`;
			ctx.beginPath();
			for (const t of visible)
				for (let q = 0; q < ns; q++) {
					const o = 3 * (t * ns + q);
					for (let c = 0; c < 3; c++) {
						const i = d.sub[o + c];
						u[c] = cv[i];
						px[c] = X(d.x[i]);
						py[c] = Y(d.y[i]);
					}
					if (!(Number.isFinite(u[0]) && Number.isFinite(u[1]) && Number.isFinite(u[2]))) continue;
					if (lev < Math.min(u[0], u[1], u[2]) || lev > Math.max(u[0], u[1], u[2])) continue;
					const pts: [number, number][] = [];
					for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
						if ((u[a] - lev) * (u[b] - lev) < 0) {
							const f = (lev - u[a]) / (u[b] - u[a]);
							pts.push([px[a] + f * (px[b] - px[a]), py[a] + f * (py[b] - py[a])]);
						}
					}
					if (pts.length >= 2) {
						ctx.moveTo(pts[0][0], pts[0][1]);
						ctx.lineTo(pts[1][0], pts[1][1]);
					}
				}
			ctx.stroke();
		}
	}

	dispose(): void {}
}

export function createRenderer(canvas: HTMLCanvasElement, forceCanvas = false): FieldRenderer {
	return (!forceCanvas && GlRenderer.create(canvas)) || new Canvas2DRenderer(canvas);
}
