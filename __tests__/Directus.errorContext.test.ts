import { describe, expect, it } from 'vitest';
import { buildExecutionErrorDescription } from '../nodes/Directus/methods/errorContext';

describe('buildExecutionErrorDescription', () => {
	it('truncates large serialized response and directus error payloads', () => {
		const hugeText = 'x'.repeat(9000);
		const description = buildExecutionErrorDescription({
			itemIndex: 0,
			resource: 'item',
			operation: 'get',
			message: 'Request failed',
			responseBody: { payload: hugeText },
			directusErrors: [{ message: hugeText }],
		});

		expect(description).toContain('Response body: ');
		expect(description).toContain('Directus errors: ');
		expect(description).toContain('... [truncated]');
	});

	it('preserves small serialized payloads without truncation marker', () => {
		const description = buildExecutionErrorDescription({
			itemIndex: 1,
			resource: 'user',
			operation: 'update',
			message: 'Validation failed',
			responseBody: { code: 'INVALID' },
			directusErrors: [{ message: 'Bad input' }],
		});

		expect(description).toContain('Response body: {"code":"INVALID"}');
		expect(description).toContain('Directus errors: [{"message":"Bad input"}]');
		expect(description).not.toContain('... [truncated]');
	});
});
