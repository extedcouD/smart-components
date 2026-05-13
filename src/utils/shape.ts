export type ShapeLeaf = 'string' | 'number' | 'boolean';

export type ShapeDescriptor =
  | ShapeLeaf
  | { type: 'object'; fields: Record<string, ShapeDescriptor> }
  | { type: 'array'; item: ShapeDescriptor };

export type ValidateResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: string };

/**
 * Walk a runtime value to derive a shape descriptor used for LLM prompting.
 * Returns null at the *top level* when the value gives no information
 * (null/undefined/empty array) so the caller can fall back to a
 * user-supplied `shape`. Inside an object, an indeterminate child is a hard
 * throw — the enclosing object can't be expressed without it.
 */
export function introspectShape(v: unknown): ShapeDescriptor | null {
  if (v === null || v === undefined) return null;
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return t as ShapeLeaf;
  if (t === 'bigint' || t === 'symbol' || t === 'function') {
    throw new Error(`useSmartState: unsupported initial value type "${t}".`);
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return null;
    const item = introspectShape(v[0]);
    if (!item) return null;
    return { type: 'array', item };
  }
  if (
    v instanceof Date ||
    v instanceof Map ||
    v instanceof Set ||
    v instanceof RegExp
  ) {
    throw new Error(
      `useSmartState: unsupported initial value type "${(v as object).constructor.name}". Use plain objects/arrays/primitives.`,
    );
  }
  const fields: Record<string, ShapeDescriptor> = {};
  for (const k of Object.keys(v as object)) {
    const child = introspectShape((v as Record<string, unknown>)[k]);
    if (!child) {
      throw new Error(
        `useSmartState: cannot infer shape of field "${k}" (null/empty). Seed it with an example value, or pass options.shape.`,
      );
    }
    fields[k] = child;
  }
  return { type: 'object', fields };
}

export function validateAgainstShape(parsed: unknown, shape: ShapeDescriptor): ValidateResult {
  if (typeof shape === 'string') {
    if (typeof parsed === shape) return { ok: true, value: parsed };
    if (shape === 'number' && typeof parsed === 'string') {
      const n = Number(parsed);
      if (!Number.isNaN(n) && parsed.trim() !== '') return { ok: true, value: n };
    }
    if (shape === 'boolean' && (parsed === 'true' || parsed === 'false')) {
      return { ok: true, value: parsed === 'true' };
    }
    if (shape === 'string' && (typeof parsed === 'number' || typeof parsed === 'boolean')) {
      return { ok: true, value: String(parsed) };
    }
    return { ok: false, reason: `expected ${shape}, got ${parsed === null ? 'null' : typeof parsed}` };
  }
  if (shape.type === 'array') {
    if (!Array.isArray(parsed)) return { ok: false, reason: 'expected array' };
    const out: unknown[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const r = validateAgainstShape(parsed[i], shape.item);
      if (!r.ok) return { ok: false, reason: `[${i}]: ${r.reason}` };
      out.push(r.value);
    }
    return { ok: true, value: out };
  }
  // object
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'expected object' };
  }
  const out: Record<string, unknown> = {};
  for (const [k, fieldShape] of Object.entries(shape.fields)) {
    if (!(k in (parsed as object))) return { ok: false, reason: `missing field '${k}'` };
    const r = validateAgainstShape((parsed as Record<string, unknown>)[k], fieldShape);
    if (!r.ok) return { ok: false, reason: `${k}: ${r.reason}` };
    out[k] = r.value;
  }
  return { ok: true, value: out };
}

/**
 * Render a shape as a JSON-ish annotation string the LLM can mimic.
 * E.g. { "name": "string", "age": "number", "tags": ["string"] }
 */
export function renderShapeForPrompt(shape: ShapeDescriptor): string {
  if (typeof shape === 'string') return `"${shape}"`;
  if (shape.type === 'array') return `[${renderShapeForPrompt(shape.item)}]`;
  const entries = Object.entries(shape.fields)
    .map(([k, v]) => `"${k}": ${renderShapeForPrompt(v)}`)
    .join(', ');
  return `{ ${entries} }`;
}
