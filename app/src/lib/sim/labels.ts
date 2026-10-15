// Display labels, units and tooltips of engine metrics.
export const METRIC_LABELS: Record<string, [label: string, unit: string, tip: string]> = {
	c_pul_pf_per_m: ["C'", 'pF/m', 'Capacitance per unit length (energy method)'],
	c0_pul_pf_per_m: ["C0'", 'pF/m', 'Vacuum capacitance per unit length'],
	l_pul_nh_per_m: ["L'", 'nH/m', "Inductance per unit length from C0'"],
	n_rf: ['n_RF', '', 'Quasi-static RF index of this section, sqrt(C/C0)'],
	z0_ohm: ['Z0', 'Ω', 'Quasi-static characteristic impedance of this section'],
	n_eff: ['n_eff', '', 'Effective index of the selected optical mode'],
	ng_opt: ['n_g', '', 'Optical group index'],
	vpi_l_dc_vcm: ['VπL', 'V·cm', 'DC Vpi-length product (engine convention, see EO table)'],
	vpi_dc_v: ['Vπ', 'V', 'DC Vpi at line.length_mm']
};
