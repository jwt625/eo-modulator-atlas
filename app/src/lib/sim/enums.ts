// Form enumerations from the engine (DevLog-027 W1): typed constant exports where the engine declares them, otherwise
// the enums of the engine's JSON schema (engine/schema/sim.schema.json). Nothing is hard-coded here.
import schema from '../../../../engine/schema/sim.schema.json';
import { GROUP_INDEX_METHODS, METAL_POLICIES_ALL, OPTICAL_SOLVERS, ELEMENT_ORDERS } from '../../../../engine/src/config.mjs';

type Node = { enum?: unknown[]; properties?: Record<string, Node>; $defs?: Record<string, Node> };

function enumAt(path: string[]): string[] {
	let n: Node | undefined = schema as unknown as Node;
	for (const k of path) n = (n as Record<string, unknown> | undefined)?.[k] as Node | undefined;
	if (!n?.enum) throw new Error(`engine schema has no enum at ${path.join('/')}`);
	return n.enum.map(String);
}

export const ENUMS = {
	groupIndex: GROUP_INDEX_METHODS,
	metal: METAL_POLICIES_ALL,
	solver: OPTICAL_SOLVERS,
	elementOrder: ELEMENT_ORDERS.map(String),
	vectorOrder: enumAt(['properties', 'optics', 'properties', 'vector_order']),
	polarization: enumAt(['properties', 'optics', 'properties', 'polarization']),
	armDrive: enumAt(['properties', 'optics', 'properties', 'eo', 'properties', 'arm_drive']),
	terminalDrive: enumAt(['properties', 'optics', 'properties', 'eo', 'properties', 'terminal_drive']),
	loading: enumAt(['properties', 'line', 'properties', 'loading', 'properties', 'type']),
	conductorLoss: enumAt(['properties', 'line', 'properties', 'conductor_loss_model']),
	dielectricLoss: enumAt(['properties', 'line', 'properties', 'dielectric_loss_model']),
	symmetry: enumAt(['$defs', 'geometry', 'properties', 'symmetry']),
	boundary: enumAt(['$defs', 'geometry', 'properties', 'boundary', 'properties', 'left'])
};
