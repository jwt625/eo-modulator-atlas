// Expression language of the postprocessing engine (DevLog-030 P2, DevLog-031): own recursive-descent parser (no
// eval, no Function, no property access), unit inference over SI dimension vectors, complex-aware evaluation over
// typed arrays. compileExpression turns the AST into closures that evaluate one array per node (array at a time);
// constant sub-expressions are folded at compile time. License: GPL-3.0-or-later.
//
// Grammar (lowest to highest precedence):
//   or := and ('||' and)* ; and := eq ('&&' eq)* ; eq := rel (('=='|'!=') rel)* ; rel := add (('<'|'<='|'>'|'>=') add)*
//   add := mul (('+'|'-') mul)* ; mul := unary (('*'|'/') unary)* ; unary := ('-'|'+'|'!') unary | power
//   power := postfix ('^' unary)?   (right associative; binds tighter than unary minus: -2^2 = -4)
//   postfix := primary ('[' unit ']')?   (multiplies by the unit: 2[um] = 2e-6 m; x[1/m] is x in metres, dimensionless)
//   primary := number | name | name '(' args ')' | '(' or ')'
// Names: letters, digits, underscore, dot-separated segments (es.normE, armA.Ex, eo.integrand_r33).

import { parseUnit, dimMul, dimDiv, dimPow, dimEq, isDimless, formatUnit, DIMLESS, UnitError } from './units.mjs';

export const MAX_EXPRESSION_LENGTH = 2000;
const MAX_DEPTH = 64;

export class ExpressionError extends Error {
  constructor(message, pos = null) {
    super(message);
    this.pos = pos;
  }
}

const FUNCTIONS = {
  abs: [1, 1], real: [1, 1], imag: [1, 1], conj: [1, 1], sqrt: [1, 1], exp: [1, 1], log: [1, 1], log10: [1, 1],
  sin: [1, 1], cos: [1, 1], tan: [1, 1], atan2: [2, 2], min: [1, Infinity], max: [1, Infinity], if: [3, 3],
};
export const EXPRESSION_FUNCTIONS = Object.freeze(Object.keys(FUNCTIONS));

function tokenize(src) {
  const toks = [];
  let i = 0;
  const err = (m) => { throw new ExpressionError(`expression "${src}": ${m} at position ${i + 1}`, i); };
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if ((c >= '0' && c <= '9') || (c === '.' && src[i + 1] >= '0' && src[i + 1] <= '9')) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      toks.push({ t: 'num', v: Number(m[0]), s: m[0], pos: i });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*/.exec(src.slice(i));
      toks.push({ t: 'name', v: m[0], s: m[0], pos: i });
      i += m[0].length;
      continue;
    }
    if (c === '[') {
      const j = src.indexOf(']', i + 1);
      if (j < 0) err("unit literal '[' without ']'");
      toks.push({ t: 'unit', v: src.slice(i + 1, j), s: src.slice(i, j + 1), pos: i });
      i = j + 1;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['<=', '>=', '==', '!=', '&&', '||'].includes(two)) { toks.push({ t: two, s: two, pos: i }); i += 2; continue; }
    if ('+-*/^(),<>!'.includes(c)) { toks.push({ t: c, s: c, pos: i }); i++; continue; }
    err(`unexpected character '${c}'`);
  }
  toks.push({ t: 'end', s: '', pos: src.length });
  return toks;
}

/**
 * Parse an expression into an AST. Node kinds: num {v}, ref {name}, unit {a, unit}, neg {a}, not {a},
 * bin {op, a, b}, call {name, args}; every node carries `pos` (0-based character index).
 * @param {string} src
 */
export function parseExpression(src) {
  if (typeof src !== 'string') throw new ExpressionError('expression must be a string');
  if (src.length > MAX_EXPRESSION_LENGTH) throw new ExpressionError(`expression longer than ${MAX_EXPRESSION_LENGTH} characters`);
  if (!src.trim()) throw new ExpressionError('expression is empty');
  const toks = tokenize(src);
  let p = 0;
  let depth = 0;
  const peek = () => toks[p];
  const err = (pos, m) => { throw new ExpressionError(`expression "${src}": ${m} at position ${pos + 1}`, pos); };
  const take = (t) => {
    if (toks[p].t !== t) err(toks[p].pos, `expected '${t}'${toks[p].t === 'end' ? ' before the end' : ''}`);
    return toks[p++];
  };
  const enter = () => { if (++depth > MAX_DEPTH) err(toks[p].pos, 'nesting too deep'); };
  const leftAssoc = (next, ops) => () => {
    let a = next();
    while (ops.includes(peek().t)) {
      const tk = toks[p++];
      a = { k: 'bin', op: tk.t, a, b: next(), pos: tk.pos };
    }
    return a;
  };
  function unary() {
    const tk = peek();
    if (tk.t === '-' || tk.t === '+' || tk.t === '!') {
      p++;
      enter();
      const a = unary();
      depth--;
      return tk.t === '+' ? a : { k: tk.t === '-' ? 'neg' : 'not', a, pos: tk.pos };
    }
    return power();
  }
  function power() {
    const a = postfix();
    if (peek().t === '^') {
      const tk = toks[p++];
      enter();
      const b = unary();
      depth--;
      // audit E7: `x^2[um]` would bind the unit to the exponent; require parentheses either way
      if (b.k === 'unit' && !b.paren) err(b.pos, `a unit literal directly after an exponent is ambiguous; write (${src.slice(a.pos ?? 0, tk.pos).trim()}^...)[unit] for a unit on the power or ^(...[unit]) for one on the exponent`);
      return { k: 'bin', op: '^', a, b, pos: tk.pos };
    }
    return a;
  }
  function postfix() {
    let a = primary();
    while (peek().t === 'unit') {
      const tk = toks[p++];
      a = { k: 'unit', a, unit: tk.v, pos: tk.pos };
    }
    return a;
  }
  const mul = leftAssoc(unary, ['*', '/']);
  const add = leftAssoc(mul, ['+', '-']);
  const rel = leftAssoc(add, ['<', '<=', '>', '>=']);
  const eq = leftAssoc(rel, ['==', '!=']);
  const and = leftAssoc(eq, ['&&']);
  function or() {
    enter();
    const a = leftAssoc(and, ['||'])();
    depth--;
    return a;
  }
  function primary() {
    const tk = peek();
    if (tk.t === 'num') { p++; return { k: 'num', v: tk.v, pos: tk.pos }; }
    if (tk.t === '(') { p++; const a = or(); take(')'); return { ...a, paren: true }; }
    if (tk.t === 'name') {
      p++;
      if (peek().t === '(') {
        if (!Object.hasOwn(FUNCTIONS, tk.v)) err(tk.pos, `unknown function '${tk.v}' (allowed: ${EXPRESSION_FUNCTIONS.join(', ')})`);
        p++;
        const args = [];
        if (peek().t !== ')') { args.push(or()); while (peek().t === ',') { p++; args.push(or()); } }
        take(')');
        const [lo, hi] = FUNCTIONS[tk.v];
        if (args.length < lo || args.length > hi) err(tk.pos, `${tk.v} takes ${lo === hi ? lo : `at least ${lo}`} argument${hi === 1 ? '' : 's'}`);
        return { k: 'call', name: tk.v, args, pos: tk.pos };
      }
      if (Object.hasOwn(FUNCTIONS, tk.v)) err(tk.pos, `function '${tk.v}' needs parentheses`);
      return { k: 'ref', name: tk.v, pos: tk.pos };
    }
    err(tk.pos, tk.t === 'end' ? 'unexpected end of expression' : `unexpected '${tk.s}'`);
  }
  const ast = or();
  if (peek().t !== 'end') err(peek().pos, `unexpected '${peek().s}'`);
  return ast;
}

/** Variable names referenced by an AST (unique, in order of appearance). */
export function referencedNames(ast) {
  const out = new Set();
  const walk = (n) => {
    if (n.k === 'ref') out.add(n.name);
    else if (n.k === 'neg' || n.k === 'not' || n.k === 'unit') walk(n.a);
    else if (n.k === 'bin') { walk(n.a); walk(n.b); }
    else if (n.k === 'call') n.args.forEach(walk);
  };
  walk(ast);
  return [...out];
}

// ---- values ------------------------------------------------------------------------------------------------------
// Runtime value: {re: Float64Array, im: Float64Array|null} over n points, or a scalar {s: true, re: number, im: number}.

const scalar = (re, im = 0) => ({ s: true, re, im });
const f64 = (n) => new Float64Array(n);

function toArr(v, n) {
  if (!v.s) return v;
  const re = f64(n).fill(v.re);
  return { re, im: v.im !== 0 ? f64(n).fill(v.im) : null };
}
const imOf = (v, n) => v.im ?? f64(n);

/** Run an array kernel on scalar operands (constant folding and scalar-only evaluation). */
function onScalars(kernel, args) {
  const arrs = args.map((v) => ({ re: Float64Array.of(v.re), im: v.im !== 0 ? Float64Array.of(v.im) : null }));
  const r = kernel(arrs, 1);
  return scalar(r.re[0], r.im ? r.im[0] : 0);
}

function apply(kernel, args, n) {
  if (args.every((v) => v.s)) return onScalars(kernel, args);
  return kernel(args.map((v) => toArr(v, n)), n);
}

// Kernels take arrays (im possibly null) and return {re, im}.
const K = {
  add([a, b], n) {
    const re = f64(n);
    for (let i = 0; i < n; i++) re[i] = a.re[i] + b.re[i];
    if (!a.im && !b.im) return { re, im: null };
    const ai = imOf(a, n), bi = imOf(b, n), im = f64(n);
    for (let i = 0; i < n; i++) im[i] = ai[i] + bi[i];
    return { re, im };
  },
  sub([a, b], n) {
    const re = f64(n);
    for (let i = 0; i < n; i++) re[i] = a.re[i] - b.re[i];
    if (!a.im && !b.im) return { re, im: null };
    const ai = imOf(a, n), bi = imOf(b, n), im = f64(n);
    for (let i = 0; i < n; i++) im[i] = ai[i] - bi[i];
    return { re, im };
  },
  mul([a, b], n) {
    const re = f64(n);
    if (!a.im && !b.im) { for (let i = 0; i < n; i++) re[i] = a.re[i] * b.re[i]; return { re, im: null }; }
    const ai = imOf(a, n), bi = imOf(b, n), im = f64(n);
    for (let i = 0; i < n; i++) { re[i] = a.re[i] * b.re[i] - ai[i] * bi[i]; im[i] = a.re[i] * bi[i] + ai[i] * b.re[i]; }
    return { re, im };
  },
  div([a, b], n) {
    const re = f64(n);
    if (!a.im && !b.im) { for (let i = 0; i < n; i++) re[i] = a.re[i] / b.re[i]; return { re, im: null }; }
    const ai = imOf(a, n), bi = imOf(b, n), im = f64(n);
    for (let i = 0; i < n; i++) {
      const d = b.re[i] * b.re[i] + bi[i] * bi[i];
      re[i] = (a.re[i] * b.re[i] + ai[i] * bi[i]) / d;
      im[i] = (ai[i] * b.re[i] - a.re[i] * bi[i]) / d;
    }
    return { re, im };
  },
  neg([a], n) {
    const re = f64(n);
    for (let i = 0; i < n; i++) re[i] = -a.re[i];
    if (!a.im) return { re, im: null };
    const im = f64(n);
    for (let i = 0; i < n; i++) im[i] = -a.im[i];
    return { re, im };
  },
  not([a], n) { const re = f64(n); for (let i = 0; i < n; i++) re[i] = a.re[i] === 0 ? 1 : 0; return { re, im: null }; },
  abs([a], n) {
    const re = f64(n);
    if (a.im) for (let i = 0; i < n; i++) re[i] = Math.hypot(a.re[i], a.im[i]);
    else for (let i = 0; i < n; i++) re[i] = Math.abs(a.re[i]);
    return { re, im: null };
  },
  real([a], n) { return { re: Float64Array.from(a.re.subarray(0, n)), im: null }; },
  imag([a], n) { return { re: a.im ? Float64Array.from(a.im.subarray(0, n)) : f64(n), im: null }; },
  conj([a], n) {
    if (!a.im) return { re: Float64Array.from(a.re.subarray(0, n)), im: null };
    const im = f64(n);
    for (let i = 0; i < n; i++) im[i] = -a.im[i];
    return { re: Float64Array.from(a.re.subarray(0, n)), im };
  },
  sqrt([a], n) {
    const re = f64(n);
    let neg = false;
    if (!a.im) {
      for (let i = 0; i < n; i++) { if (a.re[i] < 0) { neg = true; break; } re[i] = Math.sqrt(a.re[i]); }
      if (!neg) return { re, im: null };
    }
    const ai = imOf(a, n), im = f64(n);
    for (let i = 0; i < n; i++) {
      const m = Math.hypot(a.re[i], ai[i]);
      re[i] = Math.sqrt(0.5 * (m + a.re[i]));
      const s = Math.sqrt(Math.max(0, 0.5 * (m - a.re[i])));
      im[i] = ai[i] < 0 ? -s : s;
    }
    return { re, im };
  },
  exp([a], n) {
    const re = f64(n);
    if (!a.im) { for (let i = 0; i < n; i++) re[i] = Math.exp(a.re[i]); return { re, im: null }; }
    const im = f64(n);
    for (let i = 0; i < n; i++) { const e = Math.exp(a.re[i]); re[i] = e * Math.cos(a.im[i]); im[i] = e * Math.sin(a.im[i]); }
    return { re, im };
  },
  log([a], n) {
    const re = f64(n);
    let neg = false;
    if (!a.im) {
      for (let i = 0; i < n; i++) { if (a.re[i] < 0) { neg = true; break; } re[i] = Math.log(a.re[i]); }
      if (!neg) return { re, im: null };
    }
    const ai = imOf(a, n), im = f64(n);
    for (let i = 0; i < n; i++) { re[i] = Math.log(Math.hypot(a.re[i], ai[i])); im[i] = Math.atan2(ai[i], a.re[i]); }
    return { re, im };
  },
  log10(args, n) {
    const r = K.log(args, n);
    for (let i = 0; i < n; i++) r.re[i] /= Math.LN10;
    if (r.im) for (let i = 0; i < n; i++) r.im[i] /= Math.LN10;
    return r;
  },
  sin([a], n) {
    const re = f64(n);
    if (!a.im) { for (let i = 0; i < n; i++) re[i] = Math.sin(a.re[i]); return { re, im: null }; }
    const im = f64(n);
    for (let i = 0; i < n; i++) { re[i] = Math.sin(a.re[i]) * Math.cosh(a.im[i]); im[i] = Math.cos(a.re[i]) * Math.sinh(a.im[i]); }
    return { re, im };
  },
  cos([a], n) {
    const re = f64(n);
    if (!a.im) { for (let i = 0; i < n; i++) re[i] = Math.cos(a.re[i]); return { re, im: null }; }
    const im = f64(n);
    for (let i = 0; i < n; i++) { re[i] = Math.cos(a.re[i]) * Math.cosh(a.im[i]); im[i] = -Math.sin(a.re[i]) * Math.sinh(a.im[i]); }
    return { re, im };
  },
  tan(args, n) {
    if (!args[0].im) { const re = f64(n); for (let i = 0; i < n; i++) re[i] = Math.tan(args[0].re[i]); return { re, im: null }; }
    return K.div([K.sin(args, n), K.cos(args, n)], n);
  },
  atan2([a, b], n) { const re = f64(n); for (let i = 0; i < n; i++) re[i] = Math.atan2(a.re[i], b.re[i]); return { re, im: null }; },
  min(args, n) {
    const re = Float64Array.from(args[0].re.subarray(0, n));
    for (let k = 1; k < args.length; k++) { const b = args[k].re; for (let i = 0; i < n; i++) if (b[i] < re[i] || Number.isNaN(b[i])) re[i] = b[i]; }
    return { re, im: null };
  },
  max(args, n) {
    const re = Float64Array.from(args[0].re.subarray(0, n));
    for (let k = 1; k < args.length; k++) { const b = args[k].re; for (let i = 0; i < n; i++) if (b[i] > re[i] || Number.isNaN(b[i])) re[i] = b[i]; }
    return { re, im: null };
  },
  if([c, a, b], n) {
    const re = f64(n);
    for (let i = 0; i < n; i++) re[i] = c.re[i] !== 0 ? a.re[i] : b.re[i];
    if (!a.im && !b.im) return { re, im: null };
    const ai = imOf(a, n), bi = imOf(b, n), im = f64(n);
    for (let i = 0; i < n; i++) im[i] = c.re[i] !== 0 ? ai[i] : bi[i];
    return { re, im };
  },
  powInt([a], n, p) {
    // repeated squaring (exact for small integer exponents; complex aware)
    let base = { re: Float64Array.from(a.re.subarray(0, n)), im: a.im ? Float64Array.from(a.im.subarray(0, n)) : null };
    let acc = null;
    let e = Math.abs(p);
    if (e === 0) return { re: f64(n).fill(1), im: null };
    while (e > 0) {
      if (e & 1) acc = acc ? K.mul([acc, base], n) : base;
      e >>= 1;
      if (e) base = K.mul([base, base], n);
    }
    if (p < 0) acc = K.div([{ re: f64(n).fill(1), im: null }, acc], n);
    return acc;
  },
  pow([a, b], n) {
    if (!a.im && !b.im) {
      const re = f64(n);
      let neg = false;
      for (let i = 0; i < n; i++) {
        re[i] = a.re[i] ** b.re[i];
        if (a.re[i] < 0 && !Number.isInteger(b.re[i])) neg = true;
      }
      if (!neg) return { re, im: null };
    }
    return K.exp([K.mul([b, K.log([a], n)], n)], n);
  },
};
/** Operators and functions that need real operands (checked at compile time and at run time). */
const REAL_ONLY = new Set(['<', '<=', '>', '>=', '==', '!=', '&&', '||', 'not', 'atan2', 'min', 'max']);
const CMP = {
  '<': (x, y) => x < y, '<=': (x, y) => x <= y, '>': (x, y) => x > y, '>=': (x, y) => x >= y,
  '==': (x, y) => x === y, '!=': (x, y) => x !== y, '&&': (x, y) => x !== 0 && y !== 0, '||': (x, y) => x !== 0 || y !== 0,
};
function cmpKernel(op) {
  const f = CMP[op];
  return ([a, b], n) => { const re = f64(n); for (let i = 0; i < n; i++) re[i] = f(a.re[i], b.re[i]) ? 1 : 0; return { re, im: null }; };
}

// ---- compiler ----------------------------------------------------------------------------------------------------

/**
 * Compile an expression against a scope.
 * scope.resolve(name) -> null (unknown) | {kind: 'const', re, im?, dim, global?: boolean}
 *   | {kind: 'field', key, dim, complex, continuous, mesh?: string|null}
 * scope.describe?(name) -> string used in the unknown-name error (suggestions).
 * @returns {{src:string, ast:any, dim:number[], unit:string, complex:boolean, global:boolean, continuous:boolean,
 *   fields:Map<string, any>, constant:{re:number, im:number}|null, run:(ctx:{n:number, get:(key:string)=>{re:Float64Array, im:Float64Array|null}})=>any}}
 */
export function compileExpression(src, scope) {
  const ast = parseExpression(src);
  const fields = new Map();
  const err = (node, m) => { throw new ExpressionError(`expression "${src}": ${m}${node?.pos != null ? ` at position ${node.pos + 1}` : ''}`, node?.pos ?? null); };
  const unitName = (d) => formatUnit(d);
  const sameDim = (node, a, b, what) => {
    if (!dimEq(a.dim, b.dim)) err(node, `${what} incompatible units ${unitName(a.dim)} and ${unitName(b.dim)}`);
  };
  const constNode = (v, dim, extra = {}) => ({ dim, cplx: v.im !== 0, cont: true, konst: v, fn: () => v, ...extra });

  function build(node) {
    switch (node.k) {
      case 'num': return constNode(scalar(node.v), DIMLESS);
      case 'unit': {
        let u;
        try { u = parseUnit(node.unit); } catch (e) {
          if (!(e instanceof UnitError)) throw e;
          // one position: the offending character inside the brackets (audit E6)
          err({ pos: node.pos + 1 + (e.pos ?? 0) }, `unit [${node.unit}]: ${e.detail}`);
        }
        const a = build(node.a);
        return combine(node, 'mul', [a, constNode(scalar(u.factor), u.dim)], dimMul(a.dim, u.dim));
      }
      case 'ref': {
        const r = scope.resolve(node.name);
        if (!r) err(node, `unknown variable '${node.name}'${scope.describe ? scope.describe(node.name) : ''}`);
        if (r.kind === 'const') return constNode(scalar(r.re, r.im ?? 0), r.dim, { global: !!r.global });
        fields.set(r.key, r);
        const key = r.key;
        return { dim: r.dim, cplx: !!r.complex, cont: !!r.continuous, konst: null, fn: (ctx) => ctx.get(key) };
      }
      case 'neg': { const a = build(node.a); return combine(node, 'neg', [a], a.dim); }
      case 'not': { const a = build(node.a); return combine(node, 'not', [a], DIMLESS); }
      case 'bin': {
        const a = build(node.a), b = build(node.b);
        switch (node.op) {
          case '+': sameDim(node, a, b, "'+' of"); return combine(node, 'add', [a, b], a.dim);
          case '-': sameDim(node, a, b, "'-' of"); return combine(node, 'sub', [a, b], a.dim);
          case '*': return combine(node, 'mul', [a, b], dimMul(a.dim, b.dim));
          case '/': return combine(node, 'div', [a, b], dimDiv(a.dim, b.dim));
          case '^': {
            if (!isDimless(b.dim)) err(node, `exponent must be dimensionless (has unit ${unitName(b.dim)})`);
            if (!isDimless(a.dim)) {
              if (!b.konst || b.konst.im !== 0) err(node, `a quantity with unit ${unitName(a.dim)} needs a constant real exponent`);
            }
            const dim = isDimless(a.dim) ? DIMLESS : dimPow(a.dim, b.konst.re);
            if (b.konst && b.konst.im === 0 && Number.isInteger(b.konst.re) && Math.abs(b.konst.re) <= 64) {
              const p = b.konst.re;
              return combine(node, 'powInt', [a], dim, p);
            }
            return combine(node, 'pow', [a, b], dim);
          }
          default: {
            // comparisons and logical operators: real operands, dimensionless 0/1 result
            if (a.cplx || b.cplx) err(node, `'${node.op}' needs real operands; use real() or abs()`);
            if (node.op !== '&&' && node.op !== '||') sameDim(node, a, b, `'${node.op}' of`);
            return combine(node, node.op, [a, b], DIMLESS);
          }
        }
      }
      case 'call': {
        const args = node.args.map(build);
        const [a] = args;
        switch (node.name) {
          case 'abs': case 'real': case 'imag': return combine(node, node.name, args, a.dim, undefined, false);
          case 'conj': return combine(node, 'conj', args, a.dim);
          case 'sqrt': return combine(node, 'sqrt', args, dimPow(a.dim, 0.5));
          case 'exp': case 'log': case 'log10': case 'sin': case 'cos': case 'tan':
            if (!isDimless(a.dim)) err(node, `${node.name} needs a dimensionless argument (has unit ${unitName(a.dim)})`);
            return combine(node, node.name, args, DIMLESS);
          case 'atan2':
            sameDim(node, args[0], args[1], 'atan2 of');
            if (args.some((q) => q.cplx)) err(node, 'atan2 needs real arguments');
            return combine(node, 'atan2', args, DIMLESS, undefined, false);
          case 'min': case 'max':
            for (const q of args.slice(1)) sameDim(node, a, q, `${node.name} of`);
            if (args.some((q) => q.cplx)) err(node, `${node.name} of complex values is undefined; use real() or abs()`);
            return combine(node, node.name, args, a.dim, undefined, false);
          case 'if':
            if (args[0].cplx) err(node, 'if condition must be real');
            sameDim(node, args[1], args[2], 'if branches with');
            return combine(node, 'if', args, args[1].dim);
          default: return err(node, `unknown function ${node.name}`);
        }
      }
      default: return err(node, 'invalid node');
    }
  }

  // Audit E3: operands that become complex only at run time (sqrt, log or a fractional power of a negative real) are
  // checked here; a complex value where a real one is required is an error, never a silent real part.
  function realGuard(node, op, kernel) {
    const which = REAL_ONLY.has(op) ? null : op === 'if' ? [0] : [];
    if (which && !which.length) return kernel;
    const name = op === 'not' ? '!' : op;
    return (arr, n) => {
      for (let a = 0; a < arr.length; a++) {
        if (which && !which.includes(a)) continue;
        const im = arr[a].im;
        if (!im) continue;
        for (let i = 0; i < n; i++) {
          if (im[i] !== 0 && !Number.isNaN(im[i])) err(node, `'${name}' needs real ${op === 'if' ? 'condition' : 'operands'}, but ${op === 'if' ? 'the condition' : `operand ${a + 1}`} is complex at run time (${arr[a].re[i]} + ${im[i]}i); use real() or abs()`);
        }
      }
      return kernel(arr, n);
    };
  }

  function combine(node, op, args, dim, extra, cplxOverride) {
    const kernel = realGuard(node, op, op === 'powInt' ? (arr, n) => K.powInt(arr, n, extra) : K[op] ?? cmpKernel(op));
    const cplx = cplxOverride ?? (op === 'not' || CMP[op] ? false : args.some((q) => q.cplx));
    const cont = args.every((q) => q.cont);
    if (args.every((q) => q.konst)) {
      const v = onScalars(kernel, args.map((q) => q.konst));
      return { dim, cplx: v.im !== 0, cont: true, konst: v, fn: () => v, global: args.some((q) => q.global) };
    }
    const fns = args.map((q) => q.fn);
    return { dim, cplx, cont, konst: null, fn: (ctx) => apply(kernel, fns.map((f) => f(ctx)), ctx.n) };
  }

  let root;
  try { root = build(ast); } catch (e) {
    if (e instanceof ExpressionError || e?.passThrough) throw e;
    throw new ExpressionError(`expression "${src}": ${e.message}`);
  }
  return {
    src, ast, dim: root.dim, unit: formatUnit(root.dim), complex: root.cplx, global: fields.size === 0, continuous: root.cont,
    fields, constant: root.konst ? { re: root.konst.re, im: root.konst.im } : null,
    run: (ctx) => root.fn(ctx),
  };
}

/** Evaluate a compiled expression that has no field variables (globals and constants only). */
export function evaluateConstant(compiled) {
  if (!compiled.global) throw new ExpressionError(`expression "${compiled.src}" depends on fields; a global evaluation needs constants and globals only`);
  return compiled.constant;
}
