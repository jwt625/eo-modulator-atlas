// Optical-mode and EO-arm solves behind one interface for the scalar (optics.mjs) and the full-vector
// (vector-mode.mjs, DevLog-025) solvers (DevLog-026 round 2). run.mjs and stages.mjs call these; the default
// solver is vector since round 5 (audit F1); scalar stays selectable and is labelled approximate. GPL-3.0-or-later.

import { buildOpticalModel, solveModesAt, groupIndex } from './optics.mjs';
import { buildVectorModel, solveVectorModes, selectVectorMode, vectorEoOverlap, vectorOpticalFields, sampleStaticFieldQ, VECTOR_LABELS } from './vector-mode.mjs';
import { eoOverlapFromEngine, EO_CONVENTIONS } from './eo-overlap.mjs';
import { opticalFields } from './fields.mjs';

/** Labels of a vector result that replace the scalar limitation codes (which do not apply to it). */
export const VECTOR_RESULT_LABELS = [...VECTOR_LABELS];
const fdDelta = (lambdaUm) => Math.min(0.01, lambdaUm / 100);
/** Per-mode convergence of a scalar eigen result (DevLog-024 round 2: modeConverged[k]; converged covers residualModes only). */
export const scalarModeConverged = (r, k) => (Array.isArray(r?.modeConverged) ? r.modeConverged[k] === true : r?.converged === true);

/** Bound on the vector mode-count doubling (F7): 2 (mode_index + 1) modes first, then up to 4 doublings. */
export const VECTOR_MAX_DOUBLINGS = 4;
/** Window-edge power fraction of the selected vector mode above which a warning label is added (numerical choice). */
export const WINDOW_MARGIN_WARNING = 1e-2;
/** Default cap on the selected lossy mode's power fraction in conductor regions (optics.max_metal_power_fraction). */
export const DEFAULT_MAX_METAL_POWER_FRACTION = 0.05;

const familyOf = (opts) => (opts.polarization === 'TM' ? 'TM' : 'TE');
const criterionOf = (family) => (family === 'TE' ? 'TE fraction >= 0.5' : 'TE fraction < 0.5');

/** Mode of the requested family: by n_eff order (default, te_fraction), by power in a region, or nearest a reference index. */
function pickMode(res, opts, nRef = null) {
  const family = familyOf(opts);
  const fam = res.modes.filter((m) => (family === 'TE' ? m.teFraction >= 0.5 : m.teFraction < 0.5));
  const sel = opts.modeSelect;
  if (sel?.by === 'confinement') {
    const ranked = [...fam].sort((a, b) => (b.confinement?.[sel.region]?.power ?? 0) - (a.confinement?.[sel.region]?.power ?? 0));
    return ranked[opts.modeIndex] ?? null;
  }
  if (nRef != null) {
    const ranked = [...fam].sort((a, b) => Math.abs(a.neff - nRef) - Math.abs(b.neff - nRef));
    return ranked[opts.modeIndex] ?? null;
  }
  return selectVectorMode(res, family, opts.modeIndex);
}

function solveVectorFamily(model, lambdaUm, opts, warm = null, { nTarget = null, nRef = null } = {}) {
  const family = familyOf(opts);
  // DevLog-025 round 3 request (adopted 2026-10-15): start with 2 (mode_index + 1) modes; F7 (round 5): keep doubling
  // up to VECTOR_MAX_DOUBLINGS times until the family index is found.
  let numModes = 2 * (opts.modeIndex + 1);
  for (let attempt = 0; attempt <= VECTOR_MAX_DOUBLINGS; attempt++) {
    const res = solveVectorModes(model, lambdaUm, { numModes, warm, ...(nTarget != null ? { nTarget } : {}),
      ...(opts.metalPermittivity ? { metalPermittivity: opts.metalPermittivity } : {}) });
    const mode = pickMode(res, opts, nRef);
    if (mode) return { res, mode, numModesRequested: numModes };
    if (attempt < VECTOR_MAX_DOUBLINGS) numModes *= 2;
  }
  throw new Error(`Vector optical solve found no ${family} mode with index ${opts.modeIndex} (${criterionOf(family)}${opts.modeSelect?.by === 'confinement' ? `, ranked by power in ${opts.modeSelect.region}` : ''}) among ${numModes} computed modes (${VECTOR_MAX_DOUBLINGS} doublings); the window may hold more modes of the other family (for example slab box modes) above it`);
}

/**
 * Guard of a lossy-metal mode (audit F2, round-6 G6): returns an error message when the selected mode carries more than
 * `cap` of its unsigned power or electric energy in metal (metalFractions().value), or when its index is closer to a planar surface-plasmon index than to the metal-absent dielectric
 * reference; null when the mode is the dielectric mode of the request.
 */
export function lossyModeGuard({ neff, metalFraction, refNeff, sppIndices = [], cap = DEFAULT_MAX_METAL_POWER_FRACTION, teFraction = 0 }) {
  // Surface plasmons are TM-like: the index-proximity test applies to modes with TE fraction < 0.5 only.
  const nearSpp = teFraction < 0.5 && sppIndices.filter(Number.isFinite).some((n) => Math.abs(neff - n) < Math.abs(neff - refNeff));
  if (!(metalFraction > cap) && !nearSpp) return null;
  return `Lossy vector solve: the selected mode (n_eff ${neff.toFixed(6)}, ${(100 * metalFraction).toFixed(2)} % of |power| or |electric energy| in metal${nearSpp ? ', closer to a planar surface-plasmon index than to the metal-absent dielectric mode' : ''}) is not the dielectric mode of the request (metal-absent reference n_eff ${refNeff.toFixed(6)}); refusing to return a surface plasmon. Limit optics.max_metal_power_fraction = ${cap}; choose optics.mode_select or check the metal permittivity`;
}

/**
 * Unsigned metal fractions of a vector mode (round-6 audit G6): |P_z| and |W_e| per region summed over conductor regions,
 * divided by the sums over all regions. A signed Poynting fraction can be small or negative for a surface plasmon
 * (backward power in the metal), so the guard uses the larger of the two unsigned fractions.
 */
export function metalFractions(model, mode) {
  let pM = 0, pT = 0, eM = 0, eT = 0;
  for (const r of model.regions) {
    const c = mode.confinement?.[r.name];
    if (!c) continue;
    const p = Math.abs(c.power ?? 0), e = Math.abs(c.electricEnergy ?? 0);
    pT += p; eT += e;
    if (model.mats[r.material]?.conductor) { pM += p; eM += e; }
  }
  const absPower = pT > 0 ? pM / pT : 0, electricEnergy = eT > 0 ? eM / eT : 0;
  return { absPower, electricEnergy, value: Math.max(absPower, electricEnergy) };
}

/**
 * Solve the optical mode on a window (default: the section's optical_window).
 * @param {any} section CrossSection
 * @param {Record<string, any>} materials resolved materials
 * @param {ReturnType<import('./config.mjs').opticalOptions>} opts
 * @param {{meshScale?:number, window?:any, withGroupIndex?:boolean}} [o]
 * @returns {{kind:'scalar'|'vector', model:any, mode:any, res:any, neff:number, ng:number|null, window:any,
 *   diagnostics:any, labels:string[], limitations:string[], timing:any}}
 */
export function solveOptical(section, materials, opts, { meshScale = 1, window = null, withGroupIndex = false, warm = null } = {}) {
  const lambda = opts.lambda0Um;
  const idx = opts.modeIndex;
  const wantNg = withGroupIndex && opts.groupIndex !== 'fixed';
  if (opts.solver !== 'vector') {
    const model = buildOpticalModel(section, materials, { ...opts, ...(window ? { window } : {}), meshScale });
    let base, ng = null, gTiming = null;
    if (wantNg) {
      const g = groupIndex(model, lambda, idx, { delta: fdDelta(lambda), method: opts.groupIndex === 'finite_difference_wavelength' ? 'finite_difference' : 'perturbation' });
      // DevLog-024 request 3: g.converged covers both methods.
      if (![g.base, g.lo, g.hi].every((r) => scalarModeConverged(r, idx))) throw new Error('Optical group-index solves did not converge (mode index ' + idx + ')');
      base = g.base; ng = g.ng; gTiming = g.timing ?? null;
    } else base = solveModesAt(model, lambda, { numModes: idx + 1 });
    if (!scalarModeConverged(base, idx)) throw new Error(`Optical mode solve did not converge (mode index ${idx})`);
    // F1 (round 5): vector is the default; a scalar result is labelled approximate.
    const sLabels = [...base.labels, 'scalar_optical_approximate'];
    return {
      kind: 'scalar', model, mode: base, res: null, neff: base.neff[idx], ng, window: model.window,
      labels: sLabels, limitations: base.limitations,
      timing: { opticalModel: model.timing ?? null, modes: base.timing ?? null, groupIndex: gTiming },
      diagnostics: {
        solver: 'scalar', nNodes: model.mesh.nNodes, nTris: model.mesh.nTris, iterations: base.iterations,
        form: base.form, modeIndex: idx, converged: scalarModeConverged(base, idx), residual: base.residual?.[idx] ?? null, metal: base.metal, labels: sLabels, limitations: base.limitations,
        boundaryMarginFraction: { marginUm: base.boundaryMarginFraction.marginUm, value: base.boundaryMarginFraction.perMode[idx] },
        groupIndexMethod: withGroupIndex ? opts.groupIndex : null,
      },
    };
  }
  const model = buildVectorModel(section, materials, {
    lambda0Um: lambda, order: opts.vectorOrder, metal: opts.metal, meshScale, ...(window ? { window } : {}),
  });
  let lossyRef = null;
  let anchor = {};
  if (opts.metal === 'lossy') {
    // F2 (round 5): anchor the lossy solve on the dielectric mode of the same window with the metal absent; shift just
    // above it so the nearest eigenvalues are that mode's perturbed copy, not the surface plasmons above it.
    const refModel = buildVectorModel(section, materials, { lambda0Um: lambda, order: opts.vectorOrder, metal: 'absent', meshScale, ...(window ? { window } : {}) });
    const ref = solveVectorFamily(refModel, lambda, opts);
    lossyRef = { neff: ref.mode.neff, teFraction: ref.mode.teFraction };
    anchor = { nTarget: ref.mode.neff * (1 + 2e-3), nRef: ref.mode.neff };
  }
  // warm: the previous solve of the same window (sweeps); the solver reuses its shift and, on an equal mesh, its vectors.
  const { res, mode } = solveVectorFamily(model, lambda, opts, opts.metal === 'lossy' ? null : warm, anchor);
  if (!res.converged) throw new Error(`Vector optical mode solve did not converge (${res.warnings.join('; ')})`);
  let metalFraction = null;
  if (opts.metal === 'lossy') {
    metalFraction = metalFractions(model, mode);
    const problem = lossyModeGuard({ neff: mode.neff, teFraction: mode.teFraction, metalFraction: metalFraction.value, refNeff: lossyRef.neff, sppIndices: (res.spp?.pairs ?? []).map((q) => q.nSpp), cap: opts.maxMetalPowerFraction ?? DEFAULT_MAX_METAL_POWER_FRACTION });
    if (problem) throw new Error(problem);
  }
  let ng = null, gTiming = null;
  if (wantNg) {
    if (opts.groupIndex === 'finite_difference_wavelength') {
      const d = fdDelta(lambda);
      const t0 = performance.now();
      const lo = solveVectorFamily(model, lambda - d, opts, res.warm, opts.metal === 'lossy' ? anchor : {});
      const hi = solveVectorFamily(model, lambda + d, opts, res.warm, opts.metal === 'lossy' ? anchor : {});
      if (!lo.res.converged || !hi.res.converged) throw new Error('Vector group-index solves did not converge');
      ng = mode.neff - lambda * (hi.mode.neff - lo.mode.neff) / (2 * d);
      gTiming = { method: 'finite_difference', total_ms: performance.now() - t0, nEigenSolves: 2 };
    } else {
      ng = mode.ng;
      gTiming = { method: 'perturbation', total_ms: 0, nEigenSolves: 0, note: 'mode.ng of the same solve' };
    }
  }
  const labels = [...new Set([...VECTOR_RESULT_LABELS, ...res.labels, ...(lossyRef ? ['lossy_metal_loss_mesh_sensitive_check_convergence'] : []),
    ...((mode.windowMargin?.powerFraction ?? 0) > WINDOW_MARGIN_WARNING ? ['vector_mode_power_near_window_edge_above_1e-2'] : [])])];
  return {
    kind: 'vector', model, mode, res, neff: mode.neff, ng, window: model.window, labels, limitations: [],
    timing: { opticalModel: model.timing ?? null, modes: res.timing ?? null, groupIndex: gTiming },
    diagnostics: {
      solver: 'vector', order: model.order, nNodes: model.mesh.nNodes, nTris: model.mesh.nTris, nDof: model.dof.n,
      modeIndex: idx, polarizationFamily: opts.polarization, converged: res.converged, teFraction: mode.teFraction,
      residual: mode.residual, effectiveAreaUm2: mode.effectiveAreaUm2 ?? null, metal: model.metal, labels,
      limitations: [], solverWarnings: res.warnings, nModesComputed: res.modes.length,
      ...(mode.lossDbPerCm != null ? { lossDbPerCm: mode.lossDbPerCm } : {}),
      groupIndexMethod: withGroupIndex ? opts.groupIndex : null,
      windowMarginPowerFraction: mode.windowMargin?.powerFraction ?? null, windowMarginUm: mode.windowMargin?.marginUm ?? null,
      modeSelect: opts.modeSelect ?? { by: 'te_fraction' },
      ...(lossyRef ? { lossy: { metalFraction: metalFraction.value, metalAbsPowerFraction: metalFraction.absPower, metalElectricEnergyFraction: metalFraction.electricEnergy,
        metalAbsentReferenceNeff: lossyRef.neff, lossMeshSensitivity: 'mode loss from a lossy metal depends on the mesh near the metal surface (K4 TM: 0.0220 vs 0.0116 dB/cm between mesh scales 1 and 2); check convergence by meshScale',
        sppIndices: [...new Map((res.spp?.pairs ?? []).map((q) => [`${q.metal}:${q.eps_d}`, q])).values()] } } : {}),
    },
  };
}

/** Assumption codes of a vector arm overlap (the scalar ones do not apply). */
const VECTOR_ARM_ASSUMPTIONS = ['first_order_pockels_perturbation', 'full_pockels_tensor_incl_shear', 'static_field_E_z_zero_2d', 'static_field_sampled_at_quadrature_points'];

/**
 * First-order Pockels overlap of one solved arm with the static field. Returns the arm record combineArms takes.
 */
export function armOverlap(es, solved, name, lambdaUm) {
  if (solved.kind === 'scalar') return eoOverlapFromEngine({ es, model: solved.model, mode: solved.mode, modeIndex: solved.diagnostics.modeIndex, arm: name });
  // 6 quadrature points per optical triangle, P2-aware through gradientAt (DevLog-025 round 2).
  const F = sampleStaticFieldQ(es, solved.model);
  const ov = vectorEoOverlap(solved.model, solved.mode, F, lambdaUm);
  const k0 = (2 * Math.PI) / (lambdaUm * 1e-6);
  const conf = solved.mode.confinement ?? {};
  const byRegion = Object.fromEntries(Object.entries(ov.byRegion).map(([r, dn]) => [r, { dnEffPerV: dn, powerFraction: conf[r]?.power ?? null }]));
  return {
    arm: name, dnEffPerV: ov.dneffPerV, phasePerVPerM: k0 * ov.dneffPerV, neff: solved.neff, polarization: solved.diagnostics.polarizationFamily,
    form: 'vector', lambdaUm, converged: solved.res.converged === true, labels: ov.labels, limitations: [], metal: solved.model.metal,
    boundaryMarginFraction: null, byRegion, convention: EO_CONVENTIONS, assumptions: VECTOR_ARM_ASSUMPTIONS, staticFieldSampling: 'six_point_quadrature_per_optical_triangle',
    dAlphaPerUmPerV: ov.dAlphaPerUmPerV,
  };
}

/** Field payload (O4 contract) of a solved optical model, typed-array copies. */
export function solvedFields(solved, opts) {
  if (solved.kind === 'scalar') return opticalFields(solved.model, solved.mode, opts);
  const p = vectorOpticalFields(solved.model, solved.res);
  const copy = (a) => (a instanceof Int32Array || a instanceof Uint32Array ? Int32Array.from(a) : Float64Array.from(a));
  return {
    x: copy(p.x), y: copy(p.y), tri: Int32Array.from(p.tri), triRegion: Int32Array.from(p.triRegion),
    regionNames: p.regionNames, regionMaterials: solved.model.regions.map((r) => r.material),
    window: { x: [...solved.model.window.x], y: [...solved.model.window.y] },
    solver: 'vector', order: solved.model.order, polarization: solved.diagnostics.polarizationFamily, form: 'vector', lambdaUm: solved.res.lambdaUm,
    location: p.location, convention: p.convention,
    modes: p.modes.map((m) => ({ n_eff: m.n_eff, te_fraction: m.te_fraction, components: Object.fromEntries(Object.entries(m.components).map(([k, v]) => [k, ArrayBuffer.isView(v) ? Float64Array.from(v) : v])) })),
    selectedMode: solved.res.modes.indexOf(solved.mode),
    units: { x: 'um', y: 'um', e: 'V/m for max |E| = 1 V/m (centroid values; ez, hz are imaginary parts)', h: 'A/m' },
  };
}

/** Warm-start cache bounds (audit F8): at most this many entries and bytes; least recently used entries are evicted. */
export const WARM_CACHE_MAX_ENTRIES = 4;
export const WARM_CACHE_MAX_BYTES = 64 * 1024 * 1024;
const warmBytes = (w) => (w?.X ?? []).reduce((n, x) => n + (x?.byteLength ?? 0), 0);

/** Warm data of a previous solve stored under `key` (marks it most recently used), or null. */
export function warmGet(cache, key) {
  const m = cache?.opticalWarm;
  if (!(m instanceof Map) || !m.has(key)) return null;
  const v = m.get(key);
  m.delete(key);
  m.set(key, v);
  return v;
}

/** Store warm data under `key` and evict least recently used entries beyond the count and byte bounds. */
export function warmSet(cache, key, warm) {
  if (!cache || !warm) return;
  if (!(cache.opticalWarm instanceof Map)) cache.opticalWarm = new Map();
  const m = cache.opticalWarm;
  m.delete(key);
  m.set(key, warm);
  let bytes = 0;
  for (const v of m.values()) bytes += warmBytes(v);
  while (m.size > 1 && (m.size > WARM_CACHE_MAX_ENTRIES || bytes > WARM_CACHE_MAX_BYTES)) {
    const oldest = m.keys().next().value;
    bytes -= warmBytes(m.get(oldest));
    m.delete(oldest);
  }
}

/** Entries and bytes held by the warm cache (memory reporting). */
export function warmCacheStats(cache) {
  const m = cache?.opticalWarm;
  if (!(m instanceof Map)) return { entries: 0, bytes: 0 };
  let bytes = 0;
  for (const v of m.values()) bytes += warmBytes(v);
  return { entries: m.size, bytes };
}
