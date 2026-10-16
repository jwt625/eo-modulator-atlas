// Engine configs of the S8 canonical cases K10-K12 (validation/cases/K10-K12.yaml, DevLog-040), built from the case
// files at run time. Mapping (DevLog-039 round 2): 2D strips for the 1D cases (height h), regions split at every doping
// step (and at the K12 i-region statistics window) so the steps lie on mesh lines; ideal ohmic contacts as boundary
// segment contacts on the end faces (the references pin the end nodes); K11 on the identical electrostatic domain with
// zero-flux outer boundaries, contacts on the slab end faces, optional semiconductor-only Poisson (Si-only C' gate),
// explicit oxide size cap (max_edge_um = far_edge_um = oxideEdge, default 0.05 um; round-2 audit R1) so the oxide
// fringe field is resolved and refines with meshScale.
// License: GPL-3.0-or-later.
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const root = new URL('../../validation/', import.meta.url);
export const caseOf = (k) => parse(readFileSync(new URL(`cases/${k}.yaml`, root), 'utf8'));
export const S8_REF = () => JSON.parse(readFileSync(new URL('reference/summary-s8.json', root), 'utf8'));

const models = (c) => {
  const m = c.models;
  if (m.statistics !== 'boltzmann' || m.ionization !== 'complete' || m.bandgap_narrowing !== 'none' || m.auger !== 'none') throw new Error(`${c.id}: model set not supported`);
  if (m.mobility.model !== 'masetti_1983_low_field' || m.mobility.electrons !== 'phosphorus_column' || m.mobility.doping_argument !== 'N_A_plus_N_D') throw new Error(`${c.id}: mobility mapping`);
  if (m.recombination.model !== 'srh_midgap') throw new Error(`${c.id}: recombination mapping`);
  return `    silicon: {semiconductor: silicon, intrinsic_density: {ni_cm3: ${m.intrinsic_density.n_i_cm3}}, mobility: {doping: masetti_1983, donor: phosphorus, field: none}, recombination: {srh: {tau_n_s: ${m.recombination.tau_n_s}, tau_p_s: ${m.recombination.tau_p_s}, trap_level_ev: 0}}}`;
};

/** 1D case (K10, K12) as a strip of height h um. splits: extra region boundaries (um). V_pn = anode bias, cathode 0. */
export function strip1d(k, { h = 0.02, edge = 0.004, splits = [], dv = 0.002, values = null } = {}) {
  const c = caseOf(k);
  if (c.temperature_K !== 300) throw new Error('300 K only');
  const xs = [...new Set([...c.geometry_1d.segments.flatMap((s) => s.x_um), ...splits])].sort((a, b) => a - b);
  const regions = [], doping = [];
  for (let i = 0; i + 1 < xs.length; i++) {
    const x0 = xs[i], x1 = xs[i + 1], xm = 0.5 * (x0 + x1);
    const seg = c.geometry_1d.segments.find((s) => xm > s.x_um[0] && xm < s.x_um[1]);
    const name = `r${i}`;
    regions.push(`    - {name: ${name}, material: silicon, rect: {x_um: [${x0}, ${x1}], y_um: [0, ${h}]}}`);
    if (seg.acceptor_cm3 > 0) doping.push(`    - {species: acceptor, profile: uniform, concentration_cm3: ${seg.acceptor_cm3}, within: {regions: [${name}]}}`);
    if (seg.donor_cm3 > 0) doping.push(`    - {species: donor, profile: uniform, concentration_cm3: ${seg.donor_cm3}, within: {regions: [${name}]}}`);
  }
  const [an, ca] = c.geometry_1d.contacts;
  return `schema: eo-atlas.sim/v1
id: ${k}-engine
materials:
  silicon: {eps_r: ${c.materials.silicon.eps_r}, n: 3.48}
geometry:
  domain: {x_um: [${xs[0]}, ${xs[xs.length - 1]}], y_um: [0, ${h}]}
  regions:
${regions.join('\n')}
  electrodes: []
  mesh: {max_edge_um: 0.05}
semiconductor:
  materials:
${models(c)}
  doping:
${doping.join('\n')}
  contacts:
    - {name: ${an.name}, segment: {x_um: [${an.x_um}, ${an.x_um}], y_um: [0, ${h}]}, bias_v: 0}
    - {name: ${ca.name}, segment: {x_um: [${ca.x_um}, ${ca.x_um}], y_um: [0, ${h}]}, bias_v: 0}
  bias: {contact: ${an.name}, values_v: [${(values ?? c.bias.values_V).join(', ')}], reference_v: ${(values ?? c.bias.values_V)[0]}}
  small_signal: {dv_v: ${dv}}
  mesh: {semiconductor_edge_um: ${edge}}
`;
}

/** K11 lateral PN rib on the recorded domain. plasma: nedeljkovic_2011 | soref_bennett_1987; siOnly: semiconductor-only Poisson. */
export function k11({ plasma = 'nedeljkovic_2011', siOnly = false, edge = 0.01, windowEdge = 0.03, oxideEdge = 0.05, dv = 0.002, optics = true } = {}) {
  const c = caseOf('K11');
  const g = c.geometry_2d;
  const d = c.electrostatics.domain_um;
  const slab = g.regions.find((r) => r.name === 'slab'), rib = g.regions.find((r) => r.name === 'rib');
  const steps = [...new Set(g.doping.flatMap((q) => q.x_um))].sort((a, b) => a - b);
  const regions = g.regions.filter((r) => r.material === 'silicon_dioxide').map((r) => `    - {name: ${r.name}, material: silicon_dioxide, rect: {x_um: [${r.x_um}], y_um: [${r.y_um}]}}`);
  const doping = [];
  for (let i = 0; i + 1 < steps.length; i++) {
    const x0 = steps[i], x1 = steps[i + 1], xm = 0.5 * (x0 + x1);
    const dop = g.doping.find((q) => xm > q.x_um[0] && xm < q.x_um[1]);
    regions.push(`    - {name: slab${i}, material: silicon, rect: {x_um: [${x0}, ${x1}], y_um: [${slab.y_um}]}}`);
    const names = [`slab${i}`];
    const rx0 = Math.max(x0, rib.x_um[0]), rx1 = Math.min(x1, rib.x_um[1]);
    if (rx1 > rx0) { regions.push(`    - {name: rib${i}, material: silicon, rect: {x_um: [${rx0}, ${rx1}], y_um: [${rib.y_um}]}}`); names.push(`rib${i}`); }
    const sp = dop.acceptor_cm3 ? ['acceptor', dop.acceptor_cm3] : ['donor', dop.donor_cm3];
    doping.push(`    - {species: ${sp[0]}, profile: uniform, concentration_cm3: ${sp[1]}, within: {regions: [${names.join(', ')}]}}`);
  }
  const [an, ca] = g.contacts;
  const o = c.optics;
  return `schema: eo-atlas.sim/v1
id: K11-engine
materials:
  silicon: {library: silicon}
  silicon_dioxide: {library: silicon_dioxide}
geometry:
  domain: {x_um: [${d.x}], y_um: [${d.y}]}
  regions:
${regions.join('\n')}
  electrodes: []
  optical_window: {x_um: [${o.window_x_um}], y_um: [${o.window_y_um}]}
  mesh: {max_edge_um: ${oxideEdge}, far_edge_um: ${oxideEdge}, window_edge_um: ${windowEdge}}
optics:
  solver: vector
  wavelength_nm: ${o.wavelength_nm}
  polarization: ${o.polarization}
  mode_index: ${o.mode_index}
semiconductor:
  materials:
${models(c)}
  doping:
${doping.join('\n')}
  contacts:
    - {name: ${an.name}, segment: {x_um: [${an.x_um}], y_um: [${an.y_um}]}, bias_v: 0}
    - {name: ${ca.name}, segment: {x_um: [${ca.x_um}], y_um: [${ca.y_um}]}, bias_v: 0}
  bias: {contact: ${an.name}, values_v: [${c.bias.values_V.join(', ')}], reference_v: 0}
  small_signal: {dv_v: ${dv}}
  mesh: {semiconductor_edge_um: ${edge}}
${siOnly ? '  poisson_domain: semiconductor\n' : ''}${optics && !siOnly ? `  optics: {plasma_dispersion: ${plasma}, density_basis: absolute, delta_eps: first_order}\n` : ''}`;
}
