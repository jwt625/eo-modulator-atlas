/** Split a list of expressions or names on top-level commas or semicolons (commas inside parentheses are kept). */
export function splitTop(s: string): string[] {
	const out: string[] = [];
	let depth = 0, cur = '';
	for (const c of s) {
		if (c === '(') depth++;
		if (c === ')') depth = Math.max(0, depth - 1);
		if ((c === ',' || c === ';') && depth === 0) {
			if (cur.trim()) out.push(cur.trim());
			cur = '';
		} else cur += c;
	}
	if (cur.trim()) out.push(cur.trim());
	return out;
}
