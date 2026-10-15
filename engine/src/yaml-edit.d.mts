export type PathKey = string | number;
export { parseDocument as parseYamlDocument } from 'yaml';
/** Fallback printer options (lineWidth 0, flowCollectionPadding false); setIn/deleteIn splice the source when possible. */
export const PRINT: { readonly lineWidth: 0; readonly flowCollectionPadding: false };
export function splitPath(path: string | PathKey[]): PathKey[];
export function getIn(text: string, path: string | PathKey[]): unknown;
export function setIn(text: string, path: string | PathKey[], value: unknown): string;
export function deleteIn(text: string, path: string | PathKey[]): string;
export function applyOverrides(text: string, overrides: [string | PathKey[], unknown][]): string;
