export const TEMPLATE_TYPES: string[];
export interface Window { x_um: number[]; y_um: number[] }
export function expandTemplate(block: Record<string, unknown>, path?: string): {
  geometry: Record<string, unknown>; armWindows: { A: Window; B: Window | null }; arms: 'push_pull' | 'single';
  summary: { signalCentreUm: number; armBCentreUm: number | null; slabTopUm: number; electrodeBottomUm: number; ribBottomWidthUm: number | null };
};
