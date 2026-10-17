// Stage compatibility (DevLog-043): the single rule set for which stages run together, used by the runner (run.mjs)
// and the /sim UI. Readiness of a stage's inputs comes from config.mjs (stageErrors, semiconductorStageErrors); this
// module combines it with the combination rules and the implied dependency stages. License: GPL-3.0-or-later.

import { STAGES } from './config.mjs';

export const SEMICONDUCTOR = 'semiconductor';

/** Stages that may run with the semiconductor stage, and what each one is on that path. */
export const SEMICONDUCTOR_COMPANIONS = Object.freeze({
  optical_mode: "the semiconductor stage's own vector mode (solved once by the stage for the plasma-dispersion coupling; no second solve)",
  eo_response: 'junction-loaded traveling-wave response on line.rf_section at semiconductor.operating_bias_v',
});

/** Why a stage does not run with the semiconductor stage (physics, or the model that is not implemented). */
export const SEMICONDUCTOR_CONFLICTS = Object.freeze({
  electrostatics: 'the Laplace electrostatics stage treats every region as a fixed-permittivity dielectric; on the drift-diffusion device cut the doped silicon is a semiconductor whose free carriers screen the field, so the semiconductor stage solves its own Poisson equation with the carrier densities instead',
  eo_overlap: 'the Pockels overlap needs the Laplace field of the electrostatics stage and a linear electro-optic tensor; the device cut modulates by plasma dispersion (free carriers in silicon), which the semiconductor stage reports as dn_eff(V) and VpiL',
  rf_line: 'an RF line on the device cut would treat the doped silicon as a dielectric; with the semiconductor stage the line runs on line.rf_section only as the dependency of eo_response (junction-loaded line)',
  loaded_line: 'a junction-loaded periodic (T-rail) line is not implemented; the junction-loaded line after the semiconductor stage is uniform',
});

/**
 * DevLog-043 F4b: why the Laplace electrostatics stage is not available on a cross-section with doped silicon of the
 * semiconductor block (with or without the semiconductor stage selected).
 */
export const SEMICONDUCTOR_SECTION_REASON = 'this cross-section contains doped silicon of the semiconductor block (drift-diffusion); the Laplace electrostatics stage would treat it as a fixed-permittivity dielectric although its free carriers screen the field (the semiconductor stage solves its own Poisson equation with the carrier densities)';
/** Stages that need the Laplace field (unavailable on such a section without the semiconductor stage). */
const NEEDS_LAPLACE = ['eo_overlap', 'rf_line', 'loaded_line', 'eo_response'];

/** Order in which sanitizeStages keeps candidates (the semiconductor stage and eo_response before their dependencies). */
export const STAGE_PRIORITY = Object.freeze([SEMICONDUCTOR, 'eo_response', ...STAGES.filter((s) => s !== SEMICONDUCTOR && s !== 'eo_response')]);

const conflictsWithSemi = (stage, set) => {
  if (stage === SEMICONDUCTOR || Object.hasOwn(SEMICONDUCTOR_COMPANIONS, stage)) return false;
  if (stage === 'rf_line') return !set.has('eo_response');
  return true;
};

/** Stages added by the selection (DevLog-036 rules; with the semiconductor stage eo_response adds rf_line only). */
function impliedOf(set, periodic) {
  const out = {};
  if (!set.has('eo_response')) return out;
  if (set.has(SEMICONDUCTOR)) out.rf_line = 'eo_response';
  else { out.optical_mode = 'eo_response'; out[periodic ? 'loaded_line' : 'rf_line'] = 'eo_response'; }
  return out;
}

/**
 * Compatibility of every stage with a selection.
 * @param {string[]} selected requested stages (any order; electrostatics is implicit and ignored)
 * @param {{hasSemiconductor?:boolean, topology?:string, readiness?:Record<string,string|null>|null,
 *   semiReadiness?:Record<string,string|null>|null}} [context] inspectConfig().stageContext; without readiness only
 *   the combination rules apply (runner)
 * @returns {{path:'cross_section'|'semiconductor'|'mode_only', run:string[], invalid:{stage:string, reason:string}[],
 *   stages:Record<string,{selected:boolean, runs:boolean, impliedBy:string|null, blocked:string|null,
 *   conflictsWith:string[], note:string|null}>}}
 *   blocked: why the stage cannot be selected now (readiness on the path it would run on, or a conflict with the
 *   selected stages), for a selected stage why it cannot run; invalid: the selected stages that are blocked.
 */
export function stageCompatibility(selected, context = {}) {
  const list = Array.isArray(selected) ? selected : [];
  const unknown = [...new Set(list.filter((s) => !STAGES.includes(s)))];
  const sel = new Set(list.filter((s) => STAGES.includes(s) && s !== 'electrostatics'));
  const ctx = context ?? {};
  const periodic = ctx.topology === 'periodic_t_rail';
  const semiPath = sel.has(SEMICONDUCTOR);
  // F4b: on a section with doped silicon of the semiconductor block, without the semiconductor stage, only the optical
  // mode can run (mode-only, no electrostatics)
  const modeOnly = !semiPath && !!ctx.semiSection;
  const implied = impliedOf(sel, periodic);
  const readyOf = (s, semi) => {
    if (s === SEMICONDUCTOR && !ctx.hasSemiconductor) return 'the semiconductor stage needs a semiconductor block';
    if (semi && Object.hasOwn(SEMICONDUCTOR_COMPANIONS, s) && ctx.semiReadiness) return ctx.semiReadiness[s] ?? null;
    return ctx.readiness?.[s] ?? null;
  };
  const stages = {};
  for (const s of STAGES) {
    const isSel = sel.has(s);
    if (s === 'electrostatics') {
      const runsEs = !semiPath && !modeOnly;
      stages[s] = { selected: runsEs, runs: runsEs, impliedBy: runsEs ? 'always' : null, blocked: semiPath ? `conflicts with semiconductor: ${SEMICONDUCTOR_CONFLICTS.electrostatics}` : modeOnly ? `not available: ${SEMICONDUCTOR_SECTION_REASON}` : (ctx.readiness?.electrostatics ?? null), conflictsWith: semiPath ? [SEMICONDUCTOR] : [], note: null };
      continue;
    }
    const others = new Set([...sel].filter((x) => x !== s));
    const withS = new Set([...others, s]);
    const semiIf = semiPath || s === SEMICONDUCTOR;
    let conflictsWith = [];
    if (s === SEMICONDUCTOR) conflictsWith = [...others].filter((x) => conflictsWithSemi(x, withS));
    else if (others.has(SEMICONDUCTOR) && conflictsWithSemi(s, withS)) conflictsWith = [SEMICONDUCTOR];
    // a conflict is reported before readiness: fixing the inputs would not make the combination valid
    const conflict = conflictsWith.length ? `conflicts with ${conflictsWith.join(', ')}: ${conflictsWith.map((x) => SEMICONDUCTOR_CONFLICTS[s === SEMICONDUCTOR ? x : s]).join('; ')}` : null;
    const noLaplace = modeOnly && NEEDS_LAPLACE.includes(s) ? `needs the Laplace electrostatics stage, which is not available here: ${SEMICONDUCTOR_SECTION_REASON}` : null;
    const blocked = (s === SEMICONDUCTOR && !ctx.hasSemiconductor ? readyOf(s, true) : null) ?? conflict ?? noLaplace ?? readyOf(s, semiIf);
    // F1: implied whether or not it is also selected (the UI shows it checked and disabled while implied)
    const impliedBy = implied[s] ?? null;
    let note = null;
    if (modeOnly && s === 'optical_mode') note = 'runs mode-only on this section (no Laplace electrostatics on the doped silicon of the semiconductor block)';
    else if (semiIf && s === 'optical_mode') note = SEMICONDUCTOR_COMPANIONS.optical_mode;
    else if (semiIf && s === 'eo_response') note = SEMICONDUCTOR_COMPANIONS.eo_response;
    else if (semiPath && s === 'rf_line' && (impliedBy || isSel) && sel.has('eo_response')) note = 'runs on line.rf_section as the dependency of eo_response';
    stages[s] = { selected: isSel, runs: isSel || !!impliedBy, impliedBy, blocked, conflictsWith, note };
  }
  const invalid = [
    ...unknown.map((s) => ({ stage: s, reason: `Unknown stage: ${s} (expected one of ${STAGES.join(', ')})` })),
    // electrostatics runs on the cross-section path: its readiness (e.g. touching electrodes) blocks the run
    ...(!semiPath && !modeOnly && stages.electrostatics.blocked ? [{ stage: 'electrostatics', reason: stages.electrostatics.blocked }] : []),
    // mode-only section with nothing that can run (Compute would need the unavailable electrostatics stage)
    ...(modeOnly && (!sel.has('optical_mode') || list.includes('electrostatics')) ? [{ stage: 'electrostatics', reason: stages.electrostatics.blocked }] : []),
    // an explicit electrostatics request with the semiconductor stage (runner / CLI; the UI never selects it)
    ...(semiPath && list.includes('electrostatics') ? [{ stage: 'electrostatics', reason: stages.electrostatics.blocked }] : []),
    ...STAGES.filter((s) => sel.has(s) && stages[s].blocked).map((s) => ({ stage: s, reason: stages[s].blocked })),
  ];
  const run = semiPath
    ? [SEMICONDUCTOR, ...(sel.has('optical_mode') ? ['optical_mode'] : []), ...(sel.has('eo_response') ? ['rf_line', 'eo_response'] : [])]
    : modeOnly ? (sel.has('optical_mode') ? ['optical_mode'] : [])
      : STAGES.filter((s) => s !== SEMICONDUCTOR && stages[s].runs);
  return { path: semiPath ? 'semiconductor' : modeOnly ? 'mode_only' : 'cross_section', run, invalid, stages };
}

/**
 * Keep the candidates that can run together: the whole set when it is valid, else greedily in STAGE_PRIORITY order
 * (each candidate kept only when it is not blocked given the stages kept so far). Electrostatics is implicit.
 * @returns {{kept:string[], dropped:{stage:string, reason:string}[]}} kept in STAGES order
 */
export function sanitizeStages(candidates, context = {}) {
  const all = Array.isArray(candidates) ? candidates : [];
  const list = [...new Set(all.filter((s) => s !== 'electrostatics'))];
  // F5: electrostatics is implicit; a candidate list naming it (a link) reports it as dropped
  const dropped = [...(all.includes('electrostatics') ? [{ stage: 'electrostatics', reason: 'implicit: electrostatics is not a selectable stage (it runs on the cross-section path)' }] : []),
    ...list.filter((s) => !STAGES.includes(s)).map((s) => ({ stage: s, reason: `Unknown stage: ${s}` }))];
  const known = list.filter((s) => STAGES.includes(s));
  if (!stageCompatibility(known, context).invalid.length) return { kept: STAGES.filter((s) => known.includes(s)), dropped };
  const kept = [];
  for (const s of STAGE_PRIORITY.filter((x) => known.includes(x))) {
    const st = stageCompatibility(kept, context).stages[s];
    if (st.blocked) dropped.push({ stage: s, reason: st.blocked });
    else kept.push(s);
  }
  return { kept: STAGES.filter((s) => kept.includes(s)), dropped };
}

/**
 * Runner check of the combination rules (readiness stays with each stage's own input checks): throws on a stage that
 * cannot run with the others, naming the reason. Returns the stageCompatibility result.
 */
export function checkStageSelection(stages, raw, { semiSection = false } = {}) {
  const c = stageCompatibility(stages ?? [], { hasSemiconductor: raw?.semiconductor != null, semiSection, topology: raw?.line?.loading?.type ?? 'unspecified' });
  if (c.invalid.length) throw new Error(`Stage selection: ${c.invalid.map((x) => `${x.stage}: ${x.reason}`).join('; ')}`);
  return c;
}
