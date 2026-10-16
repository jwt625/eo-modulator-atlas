// Public entry of the postprocessing engine (DevLog-030, DevLog-031). Worker and Node import from here.
// License: GPL-3.0-or-later.

export { createSolutionStore, runGlobals, GLOBAL_VARIABLES, DEFAULT_CACHE_BYTES, CONSTANT_NAMES, TIE_BARYCENTRIC } from './store.mjs';
export { evaluatePlot, evaluateDerived, evaluateAtPoints, modeTable, evaluateGlobals } from './evaluate.mjs';
export { createSweepStore, storeForSweepPoint } from './sweep-store.mjs';
export { compileExpression, parseExpression, referencedNames, ExpressionError, EXPRESSION_FUNCTIONS } from './expr.mjs';
export { parseUnit, formatUnit, displayConversion, UnitError } from './units.mjs';
export { EO_FORMULAS, POCKELS_COMPONENTS, armElectrodeGap } from './eo-analysis.mjs';
export { RESOLUTIONS, MAX_RESOLUTION, MAX_SUBTRIANGLES, SMOOTHING, refinePattern, latticeIndex, refinedPoints, interpolateRefined, cappedLevel, resolutionLevel } from './refine.mjs';
