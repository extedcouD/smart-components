import { describe, it, expect } from 'vitest';
import {
  introspectShape,
  validateAgainstShape,
  renderShapeForPrompt,
  type ShapeDescriptor,
} from './shape';

describe('introspectShape', () => {
  it('primitive string', () => {
    expect(introspectShape('hello')).toBe('string');
    expect(introspectShape('')).toBe('string');
  });
  it('primitive number', () => {
    expect(introspectShape(0)).toBe('number');
    expect(introspectShape(3.14)).toBe('number');
  });
  it('primitive boolean', () => {
    expect(introspectShape(false)).toBe('boolean');
  });
  it('null/undefined → null', () => {
    expect(introspectShape(null)).toBeNull();
    expect(introspectShape(undefined)).toBeNull();
  });
  it('empty array → null', () => {
    expect(introspectShape([])).toBeNull();
  });
  it('flat object', () => {
    expect(introspectShape({ a: '', b: 0, c: false })).toEqual({
      type: 'object',
      fields: { a: 'string', b: 'number', c: 'boolean' },
    });
  });
  it('nested object', () => {
    expect(introspectShape({ user: { name: '' }, score: 0 })).toEqual({
      type: 'object',
      fields: {
        user: { type: 'object', fields: { name: 'string' } },
        score: 'number',
      },
    });
  });
  it('array of strings (uses first item)', () => {
    expect(introspectShape(['a', 'b'])).toEqual({ type: 'array', item: 'string' });
  });
  it('array of objects', () => {
    expect(introspectShape([{ id: 0 }])).toEqual({
      type: 'array',
      item: { type: 'object', fields: { id: 'number' } },
    });
  });
  it('throws on Date', () => {
    expect(() => introspectShape(new Date())).toThrow(/unsupported/i);
  });
  it('throws on Map', () => {
    expect(() => introspectShape(new Map())).toThrow(/unsupported/i);
  });
  it('throws on function', () => {
    expect(() => introspectShape(() => 0)).toThrow(/unsupported/i);
  });
  it('throws on bigint', () => {
    expect(() => introspectShape(BigInt(1))).toThrow(/unsupported/i);
  });
  it('throws on object with null field', () => {
    expect(() => introspectShape({ tags: [] })).toThrow(/cannot infer shape of field "tags"/);
  });
});

describe('validateAgainstShape', () => {
  it('passes matching primitives', () => {
    expect(validateAgainstShape('hi', 'string')).toEqual({ ok: true, value: 'hi' });
    expect(validateAgainstShape(42, 'number')).toEqual({ ok: true, value: 42 });
    expect(validateAgainstShape(true, 'boolean')).toEqual({ ok: true, value: true });
  });
  it('coerces "42" → 42 for number leaf', () => {
    expect(validateAgainstShape('42', 'number')).toEqual({ ok: true, value: 42 });
  });
  it('coerces "true"/"false" → boolean leaf', () => {
    expect(validateAgainstShape('true', 'boolean')).toEqual({ ok: true, value: true });
    expect(validateAgainstShape('false', 'boolean')).toEqual({ ok: true, value: false });
  });
  it('coerces number/boolean → string leaf', () => {
    expect(validateAgainstShape(1, 'string')).toEqual({ ok: true, value: '1' });
    expect(validateAgainstShape(true, 'string')).toEqual({ ok: true, value: 'true' });
  });
  it('rejects empty string coercion to number', () => {
    const r = validateAgainstShape('', 'number');
    expect(r.ok).toBe(false);
  });
  it('rejects mismatched leaf', () => {
    const r = validateAgainstShape({}, 'number');
    expect(r).toEqual({ ok: false, reason: 'expected number, got object' });
  });
  it('validates array happy path', () => {
    const shape: ShapeDescriptor = { type: 'array', item: 'string' };
    expect(validateAgainstShape(['a', 'b'], shape)).toEqual({ ok: true, value: ['a', 'b'] });
  });
  it('array element error includes index', () => {
    const shape: ShapeDescriptor = { type: 'array', item: 'number' };
    const r = validateAgainstShape([1, 'oops', 3], shape);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/\[1\]/);
  });
  it('non-array fails array shape', () => {
    expect(validateAgainstShape({}, { type: 'array', item: 'string' })).toEqual({
      ok: false,
      reason: 'expected array',
    });
  });
  it('validates object happy path + drops extras', () => {
    const shape: ShapeDescriptor = {
      type: 'object',
      fields: { name: 'string', age: 'number' },
    };
    const r = validateAgainstShape({ name: 'Neo', age: 33, extra: 'ignored' }, shape);
    expect(r).toEqual({ ok: true, value: { name: 'Neo', age: 33 } });
  });
  it('object missing field', () => {
    const shape: ShapeDescriptor = {
      type: 'object',
      fields: { name: 'string', age: 'number' },
    };
    const r = validateAgainstShape({ name: 'Neo' }, shape);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/age/);
  });
  it('object with bad field type', () => {
    const shape: ShapeDescriptor = {
      type: 'object',
      fields: { name: 'string', age: 'number' },
    };
    const r = validateAgainstShape({ name: 'Neo', age: 'old' }, shape);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/age:/);
  });
});

describe('renderShapeForPrompt', () => {
  it('renders a leaf', () => {
    expect(renderShapeForPrompt('string')).toBe('"string"');
  });
  it('renders an array', () => {
    expect(renderShapeForPrompt({ type: 'array', item: 'number' })).toBe('["number"]');
  });
  it('renders a nested object', () => {
    expect(
      renderShapeForPrompt({
        type: 'object',
        fields: { name: 'string', tags: { type: 'array', item: 'string' } },
      }),
    ).toBe('{ "name": "string", "tags": ["string"] }');
  });
});
