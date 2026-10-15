// YAML round-trip helpers for form editing (DevLog-023 D6, L-UI requests DevLog-027): edits are source splices, so the
// rest of the text (comments, key order, number spellings such as 4.1e7, flow spacing, sequence indentation) is kept
// byte for byte. Every splice is verified by re-parsing; when a splice is not possible or does not reproduce the
// intended data, the helpers fall back to the yaml Document printer (PRINT options). GPL-3.0-or-later.

import { parseDocument, isMap, isSeq, isScalar, isPair } from 'yaml';

export { parseDocument as parseYamlDocument };

/** Fallback printer options: no line folding, flow collections without inner padding (`{a: 1}`). */
export const PRINT = Object.freeze({ lineWidth: 0, flowCollectionPadding: false });

const parse = (text) => {
  const doc = parseDocument(text, { uniqueKeys: true });
  if (doc.errors.length) throw new Error(`YAML: ${doc.errors.map((e) => e.message).join('; ')}`);
  return doc;
};

/** Dotted path to keys; numeric segments index sequences (`geometry.regions.0.name`). */
export function splitPath(path) {
  if (Array.isArray(path)) return path;
  return String(path).split('.').filter(Boolean).map((s) => (/^\d+$/.test(s) ? Number(s) : s));
}

/** Plain JS value at a path (undefined when absent). */
export function getIn(text, path) {
  const v = parse(text).getIn(splitPath(path), false);
  return v && typeof v === 'object' && typeof v.toJSON === 'function' ? v.toJSON() : v;
}

// ---- value formatting (flow style, as the sims configs are written) --------------------------------------------
const RESERVED = /^(true|false|null|yes|no|on|off|~|y|n)$/i;
const PLAIN = /^[A-Za-z_][A-Za-z0-9_ ./()+-]*$/;
function fmt(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error('non-finite numbers are not written');
    return String(v);
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return PLAIN.test(v) && !RESERVED.test(v) && !/\s$/.test(v) && !/:\s|\s#/.test(v) ? v : JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(fmt).join(', ')}]`;
  if (typeof v === 'object') return `{${Object.entries(v).map(([k, x]) => `${fmtKey(k)}: ${fmt(x)}`).join(', ')}}`;
  throw new Error(`cannot write a ${typeof v}`);
}
const fmtKey = (k) => (typeof k === 'string' && /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(k) && !RESERVED.test(k) ? k : JSON.stringify(String(k)));

// ---- plain-data helpers for verification ------------------------------------------------------------------------
const clone = (x) => (x === undefined ? undefined : structuredClone(x));
function setPlain(obj, path, value) {
  let o = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (o[k] === undefined || o[k] === null || typeof o[k] !== 'object') o[k] = typeof path[i + 1] === 'number' ? [] : {};
    o = o[k];
  }
  o[path.at(-1)] = clone(value);
  return obj;
}
function deletePlain(obj, path) {
  let o = obj;
  for (let i = 0; i < path.length - 1; i++) { o = o?.[path[i]]; if (o == null) return obj; }
  if (Array.isArray(o)) o.splice(path.at(-1), 1); else if (o) delete o[path.at(-1)];
  return obj;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Walk a path; returns {node, parent, pair, depth} of the deepest existing node. */
function locate(doc, path) {
  let node = doc.contents, parent = null, pair = null;
  for (let i = 0; i < path.length; i++) {
    const k = path[i];
    if (isMap(node)) {
      const p = node.items.find((q) => isPair(q) && (isScalar(q.key) ? q.key.value : q.key) === k);
      if (!p) return { node, parent, pair, depth: i, missing: true };
      parent = node; pair = p; node = p.value;
    } else if (isSeq(node) && typeof k === 'number' && k < node.items.length) {
      parent = node; pair = null; node = node.items[k];
    } else return { node, parent, pair, depth: i, missing: true, blocked: true };
  }
  return { node, parent, pair, depth: path.length, missing: false };
}
const lineStart = (text, pos) => text.lastIndexOf('\n', pos - 1) + 1;
const lineEnd = (text, pos) => { const i = text.indexOf('\n', pos); return i < 0 ? text.length : i; };
const nest = (keys, value) => keys.reduceRight((v, k) => ({ [k]: v }), value);

function spliceSet(text, doc, path, value) {
  const loc = locate(doc, path);
  if (!loc.missing) {
    const n = loc.node;
    if (!n || !n.range) return null;
    const scalarValue = value === null || ['number', 'string', 'boolean'].includes(typeof value);
    if (isScalar(n) && scalarValue) {
      const quoted = n.type === 'QUOTE_DOUBLE' || n.type === 'QUOTE_SINGLE';
      const out = typeof value === 'string' && quoted ? JSON.stringify(value) : fmt(value);
      return text.slice(0, n.range[0]) + out + text.slice(n.range[1]);
    }
    if (n.flow || isScalar(n)) return text.slice(0, n.range[0]) + fmt(value) + text.slice(n.range[1]);
    return null; // block collection replaced by a value: printer fallback
  }
  if (loc.blocked) return null;
  const parent = loc.node; // the map that lacks path[depth]
  const key = path[loc.depth];
  if (!isMap(parent) || typeof key !== 'string') return null;
  const entry = `${fmtKey(key)}: ${fmt(nest(path.slice(loc.depth + 1), value))}`;
  if (parent.flow) {
    const close = parent.range[1] - 1;
    if (text[close] !== '}') return null;
    if (!parent.items.length) return text.slice(0, close) + entry + text.slice(close);
    const last = parent.items.at(-1);
    const end = (last.value ?? last.key).range[1];
    return text.slice(0, end) + `, ${entry}` + text.slice(end);
  }
  if (!parent.items.length || !parent.items[0].key?.range) return null;
  const first = parent.items[0].key.range[0];
  const indent = text.slice(lineStart(text, first), first);
  if (/\S/.test(indent)) return null; // first key not at line start (e.g. inside a sequence item): fallback
  const last = parent.items.at(-1);
  const end = Math.max((last.value ?? last.key).range[1], last.key.range[1]);
  const at = lineEnd(text, Math.max(end - 1, 0)); // the newline ending the last entry's line, or the end of the text
  if (at < text.length) return text.slice(0, at + 1) + indent + entry + '\n' + text.slice(at + 1);
  return `${text}\n${indent}${entry}\n`;
}

function spliceDelete(text, doc, path) {
  const loc = locate(doc, path);
  if (loc.missing || !loc.pair || !isMap(loc.parent)) return null;
  const parent = loc.parent, pair = loc.pair, i = parent.items.indexOf(pair);
  const vEnd = (pair.value ?? pair.key).range[1];
  if (parent.flow) {
    if (parent.items.length === 1) return text.slice(0, pair.key.range[0]) + text.slice(vEnd);
    if (i < parent.items.length - 1) return text.slice(0, pair.key.range[0]) + text.slice(parent.items[i + 1].key.range[0]);
    const prevEnd = (parent.items[i - 1].value ?? parent.items[i - 1].key).range[1];
    return text.slice(0, prevEnd) + text.slice(vEnd);
  }
  const s = lineStart(text, pair.key.range[0]);
  if (/\S/.test(text.slice(s, pair.key.range[0]))) return null;
  const e = lineEnd(text, Math.max(vEnd - 1, pair.key.range[1]));
  return text.slice(0, s) + text.slice(Math.min(e + 1, text.length));
}

function verified(candidate, expected) {
  if (candidate == null) return null;
  try { return same(parse(candidate).toJS(), expected) ? candidate : null; } catch { return null; }
}

/** New text with one value set; source splice when possible (verified), printer fallback otherwise. */
export function setIn(text, path, value) {
  const keys = splitPath(path);
  const doc = parse(text);
  const expected = setPlain(clone(doc.toJS()) ?? {}, keys, value);
  const spliced = verified(spliceSet(text, doc, keys, value), expected);
  if (spliced != null) return spliced;
  doc.setIn(keys, value);
  return doc.toString(PRINT);
}

/**
 * New text with a path removed; source splice when possible (verified), printer fallback otherwise. A map left empty by
 * the deletion is removed too, up to the first non-empty ancestor (round-6 audit G9: no `mode_select: {}` remains).
 */
export function deleteIn(text, path) {
  let keys = splitPath(path);
  const doc = parse(text);
  while (keys.length > 1) {
    const parent = doc.getIn(keys.slice(0, -1), true);
    if (!(isMap(parent) && parent.items.length === 1 && typeof keys.at(-2) === 'string')) break;
    keys = keys.slice(0, -1);
  }
  const expected = deletePlain(clone(doc.toJS()), keys);
  const spliced = verified(spliceDelete(text, doc, keys), expected);
  if (spliced != null) return spliced;
  doc.deleteIn(keys);
  return doc.toString(PRINT);
}

/** Apply several [path, value] overrides in order. */
export function applyOverrides(text, overrides) {
  let out = text;
  for (const [p, v] of overrides ?? []) out = setIn(out, p, v);
  return out;
}
