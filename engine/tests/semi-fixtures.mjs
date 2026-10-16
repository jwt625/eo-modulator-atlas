// Inputs of the S8 semiconductor tests (DevLog-039). Analytic and illustrative cases only: no literature device.
// License: GPL-3.0-or-later.

/**
 * 1D abrupt PN junction as a 2D strip (height h um), ohmic contacts at x = -1 and x = 1 um, junction at x = 0.
 * NA = ND = N (cm^-3, analytic test input). `extra` is appended to the semiconductor block.
 */
export function pn1d({ N = 1e17, h = 0.02, edge = 0.005, srh = null, field = 'none', bias = '{contact: cathode, values_v: [0, 1, 2, 5]}', extra = '' } = {}) {
  const rec = srh ? `, recombination: {srh: {tau_n_s: ${srh}, tau_p_s: ${srh}}}` : '';
  return `schema: eo-atlas.sim/v1
id: semi-test-1d-pn
materials:
  silicon: {eps_r: 11.7, n: 3.48}
  metal: {conductor: true}
geometry:
  domain: {x_um: [-1.05, 1.05], y_um: [0, ${h}]}
  regions:
    - {name: p_si, material: silicon, rect: {x_um: [-1.05, 0], y_um: [0, ${h}]}}
    - {name: n_si, material: silicon, rect: {x_um: [0, 1.05], y_um: [0, ${h}]}}
  electrodes:
    - {name: anode, material: metal, weight: 0, rect: {x_um: [-1.05, -1.0], y_um: [0, ${h}]}}
    - {name: cathode, material: metal, weight: 1, rect: {x_um: [1.0, 1.05], y_um: [0, ${h}]}}
  mesh: {max_edge_um: 0.05, electrode_edge_um: 0.01, electrode_face_um: 0.01}
semiconductor:
  materials:
    silicon: {semiconductor: silicon, mobility: {field: ${field}}${rec}}
  doping:
    - {species: acceptor, profile: uniform, concentration_cm3: ${N}, within: {regions: [p_si]}}
    - {species: donor, profile: uniform, concentration_cm3: ${N}, within: {regions: [n_si]}}
  contacts:
    - {electrode: anode, bias_v: 0}
    - {electrode: cathode, bias_v: 0}
  bias: ${bias}
  mesh: {semiconductor_edge_um: ${edge}}
${extra}`;
}

/**
 * Canonical lateral PN rib phase shifter in SOI: 220 nm rib, 90 nm slab, 500 nm rib width, junction at the rib
 * centre. Doping (5e17 body, 1e20 contact strips), lifetimes (1 us), contact positions and oxide thicknesses are
 * ILLUSTRATIVE case inputs, not taken from a paper.
 */
export function rib({ edge = 0.01, values = '[0, 1, 2, 4]', optics = '{plasma_dispersion: nedeljkovic_2011, drive: single_arm}', extraTop = '' } = {}) {
  return `schema: eo-atlas.sim/v1
id: semi-canonical-lateral-pn-rib
title: canonical lateral PN rib phase shifter in SOI (illustrative inputs; not a literature device)
${extraTop}materials:
  silicon: {library: silicon}
  silicon_dioxide: {library: silicon_dioxide}
  metal: {conductor: true}
geometry:
  domain: {x_um: [-4, 4], y_um: [-1.5, 1.2]}
  regions:
    - {name: box, material: silicon_dioxide, rect: {x_um: [-4, 4], y_um: [-1.5, 0]}}
    - {name: clad, material: silicon_dioxide, rect: {x_um: [-4, 4], y_um: [0, 1.2]}}
    - {name: slab_p, material: silicon, rect: {x_um: [-4, 0], y_um: [0, 0.09]}}
    - {name: slab_n, material: silicon, rect: {x_um: [0, 4], y_um: [0, 0.09]}}
    - {name: rib_p, material: silicon, rect: {x_um: [-0.25, 0], y_um: [0.09, 0.22]}}
    - {name: rib_n, material: silicon, rect: {x_um: [0, 0.25], y_um: [0.09, 0.22]}}
  electrodes:
    - {name: anode, material: metal, weight: 0, rect: {x_um: [-3.5, -2.5], y_um: [0.09, 0.6]}}
    - {name: cathode, material: metal, weight: 1, rect: {x_um: [2.5, 3.5], y_um: [0.09, 0.6]}}
  optical_window: {x_um: [-1.6, 1.6], y_um: [-0.9, 1.1]}
  mesh: {max_edge_um: 0.2, electrode_edge_um: 0.05, window_edge_um: 0.03}
optics:
  solver: vector
  wavelength_nm: 1550
  polarization: TE
  mode_index: 0
semiconductor:
  materials:
    silicon: {semiconductor: silicon, recombination: {srh: {tau_n_s: 1.0e-6, tau_p_s: 1.0e-6}}}
  doping:
    - {name: p_body, species: acceptor, profile: uniform, concentration_cm3: 5.0e17, within: {regions: [slab_p, rib_p]}}
    - {name: n_body, species: donor, profile: uniform, concentration_cm3: 5.0e17, within: {regions: [slab_n, rib_n]}}
    - {name: p_contact, species: acceptor, profile: uniform, concentration_cm3: 1.0e20, within: {rect: {x_um: [-4, -1.6], y_um: [0, 0.09]}}}
    - {name: n_contact, species: donor, profile: uniform, concentration_cm3: 1.0e20, within: {rect: {x_um: [1.6, 4], y_um: [0, 0.09]}}}
  contacts:
    - {electrode: anode, bias_v: 0}
    - {electrode: cathode, bias_v: 0}
  bias: {contact: cathode, values_v: ${values}, reference_v: 0}
  mesh: {semiconductor_edge_um: ${edge}}
  optics: ${optics}
`;
}
