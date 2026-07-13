import { describe, expect, it } from 'vitest';
import { safeStringify } from '../nodes/Directus/methods/errorUtils';

describe('safeStringify', () => {
	it('serializes bigint values without throwing', () => {
		expect(safeStringify({ id: 9007199254740993n })).toBe('{"id":"9007199254740993"}');
		expect(safeStringify(42n)).toBe('"42"');
	});

	it('returns a string for top-level non-JSON values', () => {
		expect(safeStringify(undefined)).toBe('undefined');
		expect(safeStringify(Symbol('token'))).toBe('Symbol(token)');
	});

	it('handles circular references', () => {
		const value: { name: string; self?: unknown } = { name: 'directus' };
		value.self = value;

		expect(safeStringify(value)).toBe('{"name":"directus","self":"[Circular]"}');
	});

	it('falls back to [Unserializable] when both JSON and String conversion fail', () => {
		const unserializable = {
			toJSON() {
				throw new Error('json failed');
			},
			[Symbol.toPrimitive]() {
				throw new Error('string failed');
			},
		};

		expect(safeStringify(unserializable)).toBe('[Unserializable]');
	});
});
