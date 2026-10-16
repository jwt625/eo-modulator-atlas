// Periodic capacitively loaded (T-rail) line: exact distributed Bloch cell of two uniform sections (DevLog-036).
// License: GPL-3.0-or-later.
//
// Model
//   - Period p = l_U + l_L: unloaded section (gap between T segments) of length l_U and loaded section (T segment) of
//     length l_L, each a uniform RLGC line (rf-line.mjs). Symmetric cell [U(l_U/2)] [L(l_L)] [U(l_U/2)].
//   - Uniform section ABCD: A = D = cosh(gamma l), B = Z0 sinh(gamma l), C = sinh(gamma l) / Z0.
//   - Bloch: cosh(gamma_B p) = (A + D) / 2; gamma_B = acosh(.) / p, principal branch (Re >= 0, Im in [0, pi] in the
//     first passband); Z_B = sqrt(B / C) (Re >= 0) at the middle of the unloaded section.
//   - Per-length parameters of the loaded section follow Shin, Sakamoto, Dagli, J. Lightwave Technol. 29, 48 (2011),
//     Sec. II (eqs. (4), (5), (12)): T rails add capacitance, the inductance and conductor resistance stay those of the
//     unloaded line. The caller builds the two section lines accordingly (stages.mjs runLoadedLineStage).
//   - Bragg frequency: first frequency of the lossless cell with beta_B p = pi.

import { cx, cadd, csub, cmul, cdiv, csqrt, cabs, cscale, ccosh, csinh } from './complex.mjs';
import { C_LIGHT, propagationAt, npPerMToDbPerCm } from './rf-line.mjs';

const fail = (m) => { throw new Error(`loaded-line: ${m}`); };
const finitePositive = (v, name) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || !(v > 0)) fail(`${name} must be a finite positive number (got ${v})`);
  return v;
};

const clog = (z) => ({ re: Math.log(cabs(z)), im: Math.atan2(z.im, z.re) });

/** Complex asinh with a series for small |s| (no cancellation near 0). */
export function casinh(s) {
  if (cabs(s) < 1e-3) {
    const s2 = cmul(s, s);
    const s3 = cmul(s2, s);
    const s5 = cmul(s3, s2);
    return cadd(csub(s, cscale(s3, 1 / 6)), cscale(s5, 3 / 40));
  }
  return clog(cadd(s, csqrt(cadd(cmul(s, s), cx(1)))));
}

/** ABCD of a uniform line section of length l (m). */
export function sectionAbcd(gamma, z0, l) {
  const gl = cscale(gamma, l);
  const ch = ccosh(gl);
  const sh = csinh(gl);
  // cosh(x) - 1 = 2 sinh^2(x / 2), kept separately for a stable (A + D)/2 - 1 at low frequency
  const shh = csinh(cscale(gl, 0.5));
  return { A: ch, B: cmul(z0, sh), C: cdiv(sh, z0), D: ch, aMinus1: cscale(cmul(shh, shh), 2) };
}

export function abcdMul(m, n) {
  return {
    A: cadd(cmul(m.A, n.A), cmul(m.B, n.C)),
    B: cadd(cmul(m.A, n.B), cmul(m.B, n.D)),
    C: cadd(cmul(m.C, n.A), cmul(m.D, n.C)),
    D: cadd(cmul(m.C, n.B), cmul(m.D, n.D)),
  };
}

/**
 * Bloch propagation constant and impedance of the symmetric cell from the two section (gamma, Z0) pairs.
 * (A + D)/2 - 1 is formed without cancellation from the section half-angle sinh terms.
 * @returns {{gammaB:{re:number,im:number}, zB:{re:number,im:number}, halfTrace:{re:number,im:number}, cell:any}}
 */
export function blochCell({ gammaU, z0U, gammaL, z0L, lU, lL }) {
  if (!(lU >= 0) || !(lL >= 0) || !(lU + lL > 0)) fail('section lengths must be >= 0 with a positive period');
  const p = lU + lL;
  const hU = sectionAbcd(gammaU, z0U, lU / 2);
  const mL = sectionAbcd(gammaL, z0L, lL);
  const cell = abcdMul(abcdMul(hU, mL), hU);
  // (A+D)/2 of U(lU) L(lL) (same trace as the symmetric cell): cosh(gU lU) cosh(gL lL) + (1/2)(zU/zL + zL/zU) sinh sinh.
  const fU = sectionAbcd(gammaU, z0U, lU);
  const ratio = cscale(cadd(cdiv(z0U, z0L), cdiv(z0L, z0U)), 0.5);
  const shU = csinh(cscale(gammaU, lU));
  const shL = csinh(cscale(gammaL, lL));
  // cosh a cosh b - 1 = (ca - 1)(cb - 1) + (ca - 1) + (cb - 1)
  const am = fU.aMinus1;
  const bm = mL.aMinus1;
  const t = cadd(cadd(cadd(cmul(am, bm), am), bm), cmul(ratio, cmul(shU, shL)));
  // A passive cell in its first passband has Im t >= 0 (cosh(a + jb) - 1, a >= 0, b in [0, pi]); a negative Im t at
  // rounding level (lossless cell) is set to +0 so that the principal root below lands on that branch.
  const tt = !(t.im > 0) && Math.abs(t.im) <= 1e-12 * cabs(t) ? { re: t.re, im: 0 } : t; // also maps -0 to +0
  // gamma_B p = acosh(1 + t) = 2 asinh(sqrt(t / 2))
  let w = cscale(casinh(csqrt(cscale(tt, 0.5))), 2);
  // Re >= 0: a rounding-level negative real part (lossless passband) is zeroed, a genuine one selects the other root
  if (w.re < 0) w = -w.re <= 1e-12 * cabs(w) ? { re: 0, im: w.im } : cscale(w, -1);
  const gammaB = cscale(w, 1 / p);
  const zB = csqrt(cdiv(cell.B, cell.C));
  return { gammaB, zB, halfTrace: cadd(cx(1), t), cell };
}

/** Lossless half trace cos(beta_B p) of the cell from L', C' per section at fHz. */
export function losslessHalfTrace({ lU, lL, LU, CU, LL, CL }, fHz) {
  const w = 2 * Math.PI * fHz;
  const tU = w * Math.sqrt(LU * CU) * lU;
  const tL = w * Math.sqrt(LL * CL) * lL;
  const zU = Math.sqrt(LU / CU);
  const zL = Math.sqrt(LL / CL);
  return Math.cos(tU) * Math.cos(tL) - 0.5 * (zU / zL + zL / zU) * Math.sin(tU) * Math.sin(tL);
}

/** Quasi-static (f -> 0, lossless) Bloch index and impedance: c sqrt(L'avg C'avg), sqrt(L'avg / C'avg). */
export function quasiStaticBloch({ lU, lL, LU, CU, LL, CL }) {
  const p = lU + lL;
  const Lavg = (LU * lU + LL * lL) / p;
  const Cavg = (CU * lU + CL * lL) / p;
  return { nRf: C_LIGHT * Math.sqrt(Lavg * Cavg), zOhm: Math.sqrt(Lavg / Cavg), lAvgHPerM: Lavg, cAvgFPerM: Cavg };
}

/**
 * Bragg frequency (Hz) of the lossless cell: lowest f with beta_B p = pi. Scan to 4x the averaged-line estimate
 * c / (2 p n_B0), bisection on (A+D)/2 + 1 at the first stopband point; without a gap (identical sections) the
 * maximum of acos((A+D)/2) (golden section). Returns {fHz, estimateHz, gap}.
 */
export function braggFrequency(cellLc) {
  const p = cellLc.lU + cellLc.lL;
  const est = C_LIGHT / (2 * p * quasiStaticBloch(cellLc).nRf);
  const n = 4000;
  const fMax = 4 * est;
  const h = (f) => losslessHalfTrace(cellLc, f);
  const phi = (f) => Math.acos(Math.max(-1, Math.min(1, h(f))));
  let prevF = 0;
  let prevPhi = 0;
  for (let i = 1; i <= n; i++) {
    const f = (fMax * i) / n;
    const v = h(f);
    if (v < -1 - 1e-12) {
      let a = prevF, b = f;
      for (let k = 0; k < 100 && b - a > 1e-12 * b; k++) { const m = 0.5 * (a + b); if (h(m) < -1) b = m; else a = m; }
      return { fHz: 0.5 * (a + b), estimateHz: est, gap: true };
    }
    const ph = phi(f);
    if (ph < prevPhi) {
      // passed through pi without a stopband: maximise phi on [f - 2 df, f]
      let a = Math.max(0, f - (2 * fMax) / n), b = f;
      const g = (Math.sqrt(5) - 1) / 2;
      for (let k = 0; k < 200 && b - a > 1e-12 * b; k++) {
        const c = b - g * (b - a), d = a + g * (b - a);
        if (phi(c) > phi(d)) b = d; else a = c;
      }
      return { fHz: 0.5 * (a + b), estimateHz: est, gap: false };
    }
    prevF = f;
    prevPhi = ph;
  }
  return fail(`no Bragg frequency found below ${fMax} Hz`);
}

/**
 * Loaded line from two uniform section lines (createRfLine objects) and the cell geometry.
 * @param {{periodM:number, loadedLengthM:number, unloaded:any, loaded:any}} p
 */
export function createLoadedLine({ periodM, loadedLengthM, unloaded, loaded }) {
  finitePositive(periodM, 'period (m)');
  finitePositive(loadedLengthM, 'loaded length (m)');
  if (loadedLengthM > periodM) fail('loaded length cannot exceed the period');
  if (!unloaded || !loaded) fail('both section lines are required');
  const lU = periodM - loadedLengthM;
  const lL = loadedLengthM;
  const lc = { lU, lL, LU: unloaded.lPul, CU: unloaded.cPul, LL: loaded.lPul, CL: loaded.cPul };
  return Object.freeze({ periodM, lU, lL, unloaded, loaded, lc, quasiStatic: quasiStaticBloch(lc), bragg: braggFrequency(lc) });
}

/** Bloch quantities at fHz. Values at or above the Bragg frequency carry aboveBragg: true. */
export function blochAt(ll, fHz) {
  const pU = propagationAt(ll.unloaded, fHz);
  const pL = propagationAt(ll.loaded, fHz);
  const b = blochCell({ gammaU: pU.gamma, z0U: pU.z0, gammaL: pL.gamma, z0L: pL.z0, lU: ll.lU, lL: ll.lL });
  const w = 2 * Math.PI * fHz;
  return {
    fHz, gammaB: b.gammaB, zB: b.zB, nB: (C_LIGHT * b.gammaB.im) / w, alphaNpPerM: b.gammaB.re,
    alphaDbPerCm: npPerMToDbPerCm(b.gammaB.re), betaP: b.gammaB.im * ll.periodM, aboveBragg: fHz >= ll.bragg.fHz,
    sections: { unloaded: pU, loaded: pL }, warnings: [...new Set([...pU.warnings, ...pL.warnings])],
  };
}

/**
 * Section list of a periodic line of total length lengthM (DevLog-036 round 2, S5): the symmetric cell
 * [U(l_U/2)] [L(l_L)] [U(l_U/2)] repeated from the source end and cut at lengthM (a partial last cell keeps the cell
 * order). Returns [{kind: 'U'|'L', l}] with lengths in metres; zero-length sections are dropped.
 */
export function cascadeSections(ll, lengthM) {
  finitePositive(lengthM, 'line length (m)');
  const cell = [['U', ll.lU / 2], ['L', ll.lL], ['U', ll.lU / 2]].filter(([, l]) => l > 0);
  const out = [];
  let left = lengthM;
  const tol = 1e-12 * lengthM;
  while (left > tol) {
    for (const [kind, l] of cell) {
      if (left <= tol) break;
      const take = Math.min(l, left);
      out.push({ kind, l: take });
      left -= take;
    }
  }
  return out;
}

/** gamma, Z0 of both section lines at fHz mapped onto a cascadeSections() list. */
export function cascadeAt(ll, sections, fHz) {
  const pU = propagationAt(ll.unloaded, fHz);
  const pL = propagationAt(ll.loaded, fHz);
  return sections.map((s) => (s.kind === 'U' ? { gamma: pU.gamma, z0: pU.z0, l: s.l } : { gamma: pL.gamma, z0: pL.z0, l: s.l }));
}
