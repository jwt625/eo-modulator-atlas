// Field renderer (DevLog-023 D8): WebGL2 with one de-indexed draw call per mesh, Gouraud per-vertex values or flat
// per-triangle values mapped through a 256-entry colormap texture, wireframe and contours in the fragment shader,
// instanced E-field arrows. Canvas2DRenderer is the fallback when WebGL2 is unavailable.
import { colormapLut, hexToRgb, type ColormapName } from './colormap';
import { scaleT, type Range } from './fieldmath';
import type { FieldMesh, ScaleMode } from './types';

export interface View {
	/** World point (um) at the canvas centre. */
	cx: number;
	cy: number;
	/** CSS px per um. */
	scale: number;
}

export interface DrawState {
	view: View;
	mode: 'region' | 'scalar';
	scaleMode: ScaleMode;
	range: Range;
	colormap: ColormapName;
	wire: boolean;
	wireColor: string;
	contours: number;
	contourColor: string;
	highlightRegion: number;
	highlightColor: string;
	regionColors: string[];
	/** Arrow instances: x, y (um), angle (rad), length (CSS px). */
	arrows: Float32Array | null;
	arrowColor: string;
	background: string;
}

export interface FieldRenderer {
	readonly kind: 'webgl2' | 'canvas2d';
	resize(cssW: number, cssH: number, dpr: number): void;
	setMesh(mesh: FieldMesh | null): void;
	setValues(values: ArrayLike<number> | null, at: 'node' | 'tri' | 'corner'): void;
	draw(s: DrawState): void;
	/** True when the drawing context is lost (WebGL context loss). */
	isLost(): boolean;
	/** Info string for diagnostics (GPU renderer name when exposed). */
	info(): string;
	dispose(): void;
}

const VS = `#version 300 es
in vec2 aPos;
in float aVal;
in float aReg;
uniform vec2 uScale;
uniform vec2 uOffset;
out float vVal;
out vec3 vBary;
flat out int vReg;
void main() {
	int k = gl_VertexID % 3;
	vBary = vec3(k == 0 ? 1.0 : 0.0, k == 1 ? 1.0 : 0.0, k == 2 ? 1.0 : 0.0);
	vVal = aVal;
	vReg = int(aReg + 0.5);
	gl_Position = vec4(aPos * uScale + uOffset, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
in float vVal;
in vec3 vBary;
flat in int vReg;
uniform int uMode;
uniform int uLog;
uniform float uMin;
uniform float uMax;
uniform sampler2D uLut;
uniform sampler2D uRegions;
uniform float uWire;
uniform vec3 uWireColor;
uniform float uContours;
uniform vec3 uContourColor;
uniform int uHighlight;
uniform vec3 uHighlightColor;
out vec4 outColor;
float mapT(float v) {
	if (uLog == 1) {
		float a = abs(v);
		if (a <= 0.0) return 0.0;
		return (log2(a) - log2(uMin)) / (log2(uMax) - log2(uMin));
	}
	return (v - uMin) / (uMax - uMin);
}
void main() {
	vec3 col;
	if (uMode == 1) {
		float t = clamp(mapT(vVal), 0.0, 1.0);
		col = texture(uLut, vec2(t * (255.0 / 256.0) + 0.5 / 256.0, 0.5)).rgb;
		if (uContours > 0.5) {
			float c = mapT(vVal) * uContours;
			float f = abs(fract(c - 0.5) - 0.5);
			float w = fwidth(c);
			float line = 1.0 - smoothstep(0.5 * w, 1.5 * w, f);
			col = mix(col, uContourColor, 0.85 * line);
		}
	} else {
		col = texelFetch(uRegions, ivec2(vReg, 0), 0).rgb;
	}
	if (vReg == uHighlight) col = mix(col, uHighlightColor, 0.45);
	if (uWire > 0.5) {
		float d = min(min(vBary.x, vBary.y), vBary.z);
		float fw = max(fwidth(d), 1e-6);
		float line = 1.0 - smoothstep(0.0, 1.2 * fw, d);
		float fade = clamp(((1.0 / 3.0) / fw - 1.5) / 3.0, 0.0, 1.0);
		col = mix(col, uWireColor, 0.8 * line * fade);
	}
	outColor = vec4(col, 1.0);
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

// Arrow template along +x, unit length: shaft (2 triangles) and head (1 triangle).
const ARROW = new Float32Array([
	0, -0.05, 0.62, -0.05, 0.62, 0.05,
	0, -0.05, 0.62, 0.05, 0, 0.05,
	0.62, -0.2, 1, 0, 0.62, 0.2
]);

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

export class GlRenderer implements FieldRenderer {
	readonly kind = 'webgl2' as const;
	private gl: WebGL2RenderingContext;
	private prog: WebGLProgram;
	private aprog: WebGLProgram;
	private vao: WebGLVertexArrayObject;
	private avao: WebGLVertexArrayObject;
	private posBuf: WebGLBuffer;
	private valBuf: WebGLBuffer;
	private regBuf: WebGLBuffer;
	private instBuf: WebGLBuffer;
	private lutTex: WebGLTexture;
	private regTex: WebGLTexture;
	private lutName: ColormapName | null = null;
	private regKey = '';
	private nVerts = 0;
	private mesh: FieldMesh | null = null;
	private c0: [number, number] = [0, 0];
	private u: Record<string, WebGLUniformLocation | null> = {};
	private au: Record<string, WebGLUniformLocation | null> = {};
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
		for (const n of ['uScale', 'uOffset', 'uMode', 'uLog', 'uMin', 'uMax', 'uLut', 'uRegions', 'uWire', 'uWireColor', 'uContours', 'uContourColor', 'uHighlight', 'uHighlightColor'])
			this.u[n] = gl.getUniformLocation(this.prog, n);
		for (const n of ['uScale', 'uOffset', 'uPx', 'uColor']) this.au[n] = gl.getUniformLocation(this.aprog, n);
		this.vao = gl.createVertexArray()!;
		this.posBuf = gl.createBuffer()!;
		this.valBuf = gl.createBuffer()!;
		this.regBuf = gl.createBuffer()!;
		gl.bindVertexArray(this.vao);
		const attr = (buf: WebGLBuffer, name: string, size: number) => {
			const loc = gl.getAttribLocation(this.prog, name);
			gl.bindBuffer(gl.ARRAY_BUFFER, buf);
			gl.enableVertexAttribArray(loc);
			gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
		};
		attr(this.posBuf, 'aPos', 2);
		attr(this.valBuf, 'aVal', 1);
		attr(this.regBuf, 'aReg', 1);
		this.avao = gl.createVertexArray()!;
		gl.bindVertexArray(this.avao);
		const baseBuf = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, baseBuf);
		gl.bufferData(gl.ARRAY_BUFFER, ARROW, gl.STATIC_DRAW);
		const bl = gl.getAttribLocation(this.aprog, 'aBase');
		gl.enableVertexAttribArray(bl);
		gl.vertexAttribPointer(bl, 2, gl.FLOAT, false, 0, 0);
		this.instBuf = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
		const il = gl.getAttribLocation(this.aprog, 'aInst');
		gl.enableVertexAttribArray(il);
		gl.vertexAttribPointer(il, 4, gl.FLOAT, false, 0, 0);
		gl.vertexAttribDivisor(il, 1);
		gl.bindVertexArray(null);
		this.lutTex = gl.createTexture()!;
		this.regTex = gl.createTexture()!;
		for (const t of [this.lutTex, this.regTex]) {
			gl.bindTexture(gl.TEXTURE_2D, t);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		}
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

	setMesh(mesh: FieldMesh | null): void {
		const gl = this.gl;
		this.mesh = mesh;
		if (!mesh) {
			this.nVerts = 0;
			return;
		}
		this.c0 = centreOf(mesh);
		const nT = mesh.tri.length / 3;
		const pos = new Float32Array(6 * nT);
		const reg = new Float32Array(3 * nT);
		const [cx, cy] = this.c0;
		for (let t = 0; t < nT; t++)
			for (let k = 0; k < 3; k++) {
				const n = mesh.tri[3 * t + k];
				pos[6 * t + 2 * k] = mesh.x[n] - cx;
				pos[6 * t + 2 * k + 1] = mesh.y[n] - cy;
				reg[3 * t + k] = mesh.triRegion[t];
			}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
		gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.regBuf);
		gl.bufferData(gl.ARRAY_BUFFER, reg, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.valBuf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(3 * nT), gl.DYNAMIC_DRAW);
		this.nVerts = 3 * nT;
	}

	setValues(values: ArrayLike<number> | null, at: 'node' | 'tri' | 'corner'): void {
		const mesh = this.mesh;
		if (!mesh || !values) return;
		const nT = mesh.tri.length / 3;
		const v = new Float32Array(3 * nT);
		if (at === 'tri') for (let t = 0; t < nT; t++) v[3 * t] = v[3 * t + 1] = v[3 * t + 2] = values[t];
		else if (at === 'corner') for (let i = 0; i < 3 * nT; i++) v[i] = values[i];
		else for (let i = 0; i < 3 * nT; i++) v[i] = values[mesh.tri[i]];
		const gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.valBuf);
		gl.bufferData(gl.ARRAY_BUFFER, v, gl.DYNAMIC_DRAW);
	}

	private uploadLut(name: ColormapName) {
		if (this.lutName === name) return;
		const gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, colormapLut(name));
		this.lutName = name;
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

	draw(s: DrawState): void {
		const gl = this.gl;
		const c = gl.canvas as HTMLCanvasElement;
		gl.viewport(0, 0, c.width, c.height);
		const [br, bg, bb] = rgb01(s.background);
		gl.clearColor(br, bg, bb, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		if (!this.nVerts) return;
		const sx = (2 * s.view.scale) / this.cssW, sy = (2 * s.view.scale) / this.cssH;
		const ox = (this.c0[0] - s.view.cx) * sx, oy = (this.c0[1] - s.view.cy) * sy;
		this.uploadLut(s.colormap);
		this.uploadRegions(s.regionColors);
		gl.useProgram(this.prog);
		gl.bindVertexArray(this.vao);
		const u = this.u;
		gl.uniform2f(u.uScale, sx, sy);
		gl.uniform2f(u.uOffset, ox, oy);
		gl.uniform1i(u.uMode, s.mode === 'scalar' ? 1 : 0);
		gl.uniform1i(u.uLog, s.scaleMode === 'log' ? 1 : 0);
		gl.uniform1f(u.uMin, s.range.min);
		gl.uniform1f(u.uMax, s.range.max === s.range.min ? s.range.min + 1 : s.range.max);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
		gl.uniform1i(u.uLut, 0);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.regTex);
		gl.uniform1i(u.uRegions, 1);
		gl.uniform1f(u.uWire, s.wire ? 1 : 0);
		gl.uniform3fv(u.uWireColor, rgb01(s.wireColor));
		gl.uniform1f(u.uContours, s.contours);
		gl.uniform3fv(u.uContourColor, rgb01(s.contourColor));
		gl.uniform1i(u.uHighlight, s.highlightRegion);
		gl.uniform3fv(u.uHighlightColor, rgb01(s.highlightColor));
		gl.drawArrays(gl.TRIANGLES, 0, this.nVerts);
		if (s.arrows && s.arrows.length) {
			const inst = new Float32Array(s.arrows.length);
			for (let i = 0; i < s.arrows.length; i += 4) {
				inst[i] = s.arrows[i] - this.c0[0];
				inst[i + 1] = s.arrows[i + 1] - this.c0[1];
				inst[i + 2] = s.arrows[i + 2];
				inst[i + 3] = s.arrows[i + 3];
			}
			gl.useProgram(this.aprog);
			gl.bindVertexArray(this.avao);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
			gl.bufferData(gl.ARRAY_BUFFER, inst, gl.STREAM_DRAW);
			gl.uniform2f(this.au.uScale, sx, sy);
			gl.uniform2f(this.au.uOffset, ox, oy);
			gl.uniform2f(this.au.uPx, 2 / this.cssW, 2 / this.cssH);
			const [r, g, b] = rgb01(s.arrowColor);
			gl.uniform4f(this.au.uColor, r, g, b, 1);
			gl.drawArraysInstanced(gl.TRIANGLES, 0, 9, inst.length / 4);
		}
		gl.bindVertexArray(null);
	}

	dispose(): void {
		const gl = this.gl;
		for (const b of [this.posBuf, this.valBuf, this.regBuf, this.instBuf]) gl.deleteBuffer(b);
		gl.deleteTexture(this.lutTex);
		gl.deleteTexture(this.regTex);
		gl.deleteProgram(this.prog);
		gl.deleteProgram(this.aprog);
		gl.getExtension('WEBGL_lose_context')?.loseContext();
	}
}

/** Flat-shaded Canvas 2D fallback with viewport culling and a triangle budget (stride LOD). */
export class Canvas2DRenderer implements FieldRenderer {
	readonly kind = 'canvas2d' as const;
	private ctx: CanvasRenderingContext2D;
	private mesh: FieldMesh | null = null;
	private triVal: Float64Array | null = null;
	/** Corner values (3 per triangle) for contour lines; null for per-triangle fields. */
	private cornerVal: Float64Array | null = null;
	private cssW = 1;
	private cssH = 1;
	private dpr = 1;
	budget = 60000;
	/** Point sampler (value and region at a world point) for the gap-free raster mode used over budget (W4). */
	private sampler: ((x: number, y: number) => { v: number; region: number } | null) | null = null;

	setSampler(f: ((x: number, y: number) => { v: number; region: number } | null) | null): void {
		this.sampler = f;
	}

	/** Over budget: sample one value per screen cell through the triangle index (no gaps), contours by marching squares. */
	private drawRaster(s: DrawState, X: (x: number) => number, Y: (y: number) => number) {
		const { ctx } = this;
		const W = this.cssW, H = this.cssH;
		const cell = Math.max(2, Math.ceil(Math.sqrt((W * H) / 60000)));
		const nx = Math.ceil(W / cell), ny = Math.ceil(H / cell);
		const img = new ImageData(nx, ny);
		const u = new Float64Array(nx * ny).fill(NaN);
		const lut = colormapLut(s.colormap);
		const { cx, cy, scale } = s.view;
		for (let j = 0; j < ny; j++)
			for (let i = 0; i < nx; i++) {
				const wx = cx + ((i + 0.5) * cell - W / 2) / scale, wy = cy - ((j + 0.5) * cell - H / 2) / scale;
				const r = this.sampler!(wx, wy);
				if (!r) continue;
				let rgb: [number, number, number];
				if (s.mode === 'scalar' && Number.isFinite(r.v)) {
					const t = scaleT(r.v, s.scaleMode, s.range);
					u[j * nx + i] = t;
					const k = Math.round(t * 255);
					rgb = [lut[4 * k], lut[4 * k + 1], lut[4 * k + 2]];
				} else {
					const hex = s.regionColors[r.region] ?? '#808080';
					rgb = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
				}
				const o = 4 * (j * nx + i);
				img.data[o] = rgb[0]; img.data[o + 1] = rgb[1]; img.data[o + 2] = rgb[2]; img.data[o + 3] = 255;
			}
		const off = new OffscreenCanvas(nx, ny);
		off.getContext('2d')!.putImageData(img, 0, 0);
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(off, 0, 0, nx * cell, ny * cell);
		if (s.mode === 'scalar' && s.contours > 0) {
			// Marching squares on the cell-centre grid (continuous lines; saddles resolved by the first pairing).
			ctx.strokeStyle = s.contourColor;
			ctx.lineWidth = 1;
			ctx.beginPath();
			const P = (i: number, j: number) => [(i + 0.5) * cell, (j + 0.5) * cell];
			for (let j = 0; j < ny - 1; j++)
				for (let i = 0; i < nx - 1; i++) {
					const q = [u[j * nx + i], u[j * nx + i + 1], u[(j + 1) * nx + i + 1], u[(j + 1) * nx + i]].map((v) => v * s.contours);
					if (q.some((v) => !Number.isFinite(v))) continue;
					const corners = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
					const lo = Math.ceil(Math.min(...q)), hi = Math.floor(Math.max(...q));
					for (let lev = lo; lev <= hi; lev++) {
						const pts: number[][] = [];
						for (let e = 0; e < 4; e++) {
							const a = e, b = (e + 1) % 4;
							if ((q[a] - lev) * (q[b] - lev) < 0) {
								const f = (lev - q[a]) / (q[b] - q[a]);
								pts.push([corners[a][0] + f * (corners[b][0] - corners[a][0]), corners[a][1] + f * (corners[b][1] - corners[a][1])]);
							}
						}
						for (let k = 0; k + 1 < pts.length; k += 2) {
							ctx.moveTo(pts[k][0], pts[k][1]);
							ctx.lineTo(pts[k + 1][0], pts[k + 1][1]);
						}
					}
				}
			ctx.stroke();
		}
		void X; void Y;
	}

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

	setMesh(mesh: FieldMesh | null): void {
		this.mesh = mesh;
		this.triVal = null;
	}

	setValues(values: ArrayLike<number> | null, at: 'node' | 'tri' | 'corner'): void {
		const m = this.mesh;
		if (!m || !values) return;
		const nT = m.tri.length / 3;
		const v = new Float64Array(nT);
		const c = at === 'tri' ? null : new Float64Array(3 * nT);
		for (let t = 0; t < nT; t++) {
			if (at === 'tri') { v[t] = values[t]; continue; }
			for (let k = 0; k < 3; k++) c![3 * t + k] = at === 'corner' ? values[3 * t + k] : values[m.tri[3 * t + k]];
			v[t] = (c![3 * t] + c![3 * t + 1] + c![3 * t + 2]) / 3;
		}
		this.triVal = v;
		this.cornerVal = c;
	}

	draw(s: DrawState): void {
		const { ctx } = this;
		const m = this.mesh;
		ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		ctx.fillStyle = s.background;
		ctx.fillRect(0, 0, this.cssW, this.cssH);
		if (!m) return;
		const { cx, cy, scale } = s.view;
		const W = this.cssW, H = this.cssH;
		const X = (x: number) => W / 2 + (x - cx) * scale;
		const Y = (y: number) => H / 2 - (y - cy) * scale;
		const nT = m.tri.length / 3;
		const visible: number[] = [];
		for (let t = 0; t < nT; t++) {
			const a = m.tri[3 * t], b = m.tri[3 * t + 1], c = m.tri[3 * t + 2];
			const x0 = Math.min(X(m.x[a]), X(m.x[b]), X(m.x[c])), x1 = Math.max(X(m.x[a]), X(m.x[b]), X(m.x[c]));
			const y0 = Math.min(Y(m.y[a]), Y(m.y[b]), Y(m.y[c])), y1 = Math.max(Y(m.y[a]), Y(m.y[b]), Y(m.y[c]));
			if (x1 >= 0 && x0 <= W && y1 >= 0 && y0 <= H) visible.push(t);
		}
		const raster = visible.length > this.budget && !!this.sampler;
		const stride = raster ? 1 : Math.max(1, Math.ceil(visible.length / this.budget));
		if (raster) this.drawRaster(s, X, Y);
		const lut = colormapLut(s.colormap);
		const wire = s.wire && visible.length / stride < 20000;
		ctx.lineWidth = 0.5;
		if (!raster) for (let k = 0; k < visible.length; k += stride) {
			const t = visible[k];
			const a = m.tri[3 * t], b = m.tri[3 * t + 1], c = m.tri[3 * t + 2];
			let fill: string;
			if (s.mode === 'scalar' && this.triVal) {
				const u = scaleT(this.triVal[t], s.scaleMode, s.range);
				const i = Math.round((Number.isFinite(u) ? u : 0) * 255);
				fill = `rgb(${lut[4 * i]},${lut[4 * i + 1]},${lut[4 * i + 2]})`;
			} else fill = s.regionColors[m.triRegion[t]] ?? '#808080';
			ctx.beginPath();
			ctx.moveTo(X(m.x[a]), Y(m.y[a]));
			ctx.lineTo(X(m.x[b]), Y(m.y[b]));
			ctx.lineTo(X(m.x[c]), Y(m.y[c]));
			ctx.closePath();
			ctx.fillStyle = fill;
			ctx.fill();
			ctx.strokeStyle = wire ? s.wireColor : fill;
			ctx.stroke();
		}
		// Contour lines by marching triangles on the linear corner values (U6).
		if (!raster && s.mode === 'scalar' && s.contours > 0 && this.cornerVal) {
			const cv = this.cornerVal;
			ctx.strokeStyle = s.contourColor;
			ctx.lineWidth = 1;
			ctx.beginPath();
			for (let k = 0; k < visible.length; k += stride) {
				const t = visible[k];
				const u = [0, 1, 2].map((i) => scaleT(cv[3 * t + i], s.scaleMode, s.range) * s.contours);
				if (u.some((x) => !Number.isFinite(x))) continue;
				const lo = Math.ceil(Math.min(u[0], u[1], u[2])), hi = Math.floor(Math.max(u[0], u[1], u[2]));
				const px = [0, 1, 2].map((i) => X(m.x[m.tri[3 * t + i]])), py = [0, 1, 2].map((i) => Y(m.y[m.tri[3 * t + i]]));
				for (let lev = lo; lev <= hi; lev++) {
					const pts: [number, number][] = [];
					for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
						if ((u[a] - lev) * (u[b] - lev) < 0 || (u[a] === lev && u[b] !== lev)) {
							const f = (lev - u[a]) / (u[b] - u[a]);
							pts.push([px[a] + f * (px[b] - px[a]), py[a] + f * (py[b] - py[a])]);
						}
					}
					if (pts.length >= 2) {
						ctx.moveTo(pts[0][0], pts[0][1]);
						ctx.lineTo(pts[1][0], pts[1][1]);
					}
				}
			}
			ctx.stroke();
		}
		if (s.arrows) {
			ctx.strokeStyle = s.arrowColor;
			ctx.fillStyle = s.arrowColor;
			ctx.lineWidth = 1.2;
			for (let i = 0; i < s.arrows.length; i += 4) {
				const px = X(s.arrows[i]), py = Y(s.arrows[i + 1]);
				const ux = Math.cos(s.arrows[i + 2]), uy = -Math.sin(s.arrows[i + 2]);
				const len = s.arrows[i + 3];
				const tipX = px + (ux * len) / 2, tipY = py + (uy * len) / 2;
				ctx.beginPath();
				ctx.moveTo(px - (ux * len) / 2, py - (uy * len) / 2);
				ctx.lineTo(tipX, tipY);
				ctx.stroke();
				// arrowhead (same proportions as the WebGL template)
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

	dispose(): void {
		this.mesh = null;
	}
}

export function createRenderer(canvas: HTMLCanvasElement, forceCanvas = false): FieldRenderer {
	return (!forceCanvas && GlRenderer.create(canvas)) || new Canvas2DRenderer(canvas);
}
