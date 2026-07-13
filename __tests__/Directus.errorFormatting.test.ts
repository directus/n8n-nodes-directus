import { describe, it, expect } from 'vitest';
import { extractDirectusErrorDetails } from '../nodes/Directus/methods/api';

describe('Directus error extraction', () => {
	it('should extract foreign key errors with extensions and expose structured details', () => {
		const details = extractDirectusErrorDetails({
			message: 'Request failed with status code 400',
			response: {
				status: 400,
				data: {
					errors: [
						{
							message:
								'Invalid foreign key "199" for field "owner" in collection "tools".',
							extensions: {
								collection: 'tools',
								field: 'owner',
								value: 199,
								code: 'INVALID_FOREIGN_KEY',
							},
						},
					],
				},
			},
		});

		expect(details.statusCode).toBe(400);
		expect(details.message).toContain('Invalid foreign key "199" for field "owner"');
		expect(details.directusErrors).toEqual([
			expect.objectContaining({
				message:
					'Invalid foreign key "199" for field "owner" in collection "tools".',
				extensions: expect.objectContaining({
					collection: 'tools',
					field: 'owner',
					value: 199,
					code: 'INVALID_FOREIGN_KEY',
				}),
			}),
		]);
		expect(details.responseBody).toEqual(
			expect.objectContaining({
				errors: expect.arrayContaining([
					expect.objectContaining({
						message:
							'Invalid foreign key "199" for field "owner" in collection "tools".',
					}),
				]),
			}),
		);
	});

	it('should extract Directus validation errors from an errors array', () => {
		const details = extractDirectusErrorDetails({
			message: 'Request failed with status code 400',
			response: {
				status: 400,
				data: {
					errors: [
						{
							message: 'Foreign key constraint failed',
							extensions: { code: 'FAILED_VALIDATION' },
						},
					],
				},
			},
		});

		expect(details.statusCode).toBe(400);
		expect(details.message).toContain('Foreign key constraint failed');
		expect(details.directusErrors).toHaveLength(1);
		expect(details.responseBody).toEqual(
			expect.objectContaining({
				errors: expect.any(Array),
			}),
		);
	});

	it('should parse JSON error response strings and extract Directus messages', () => {
		const details = extractDirectusErrorDetails({
			message: 'Request failed with status code 400',
			response: {
				status: 400,
				data: JSON.stringify({
					errors: [
						{
							message: 'Malformed query parameter',
							extensions: { code: 'INVALID_QUERY' },
						},
					],
				}),
			},
		});

		expect(details.message).toContain('Malformed query parameter');
		expect(details.directusErrors).toEqual([
			expect.objectContaining({
				extensions: expect.objectContaining({ code: 'INVALID_QUERY' }),
			}),
		]);
	});

	it('should aggregate multiple Directus error messages in order', () => {
		const details = extractDirectusErrorDetails({
			message: 'Request failed with status code 400',
			response: {
				status: 400,
				data: {
					errors: [
						{ message: 'First validation error' },
						{ message: 'Second validation error' },
					],
				},
			},
		});

		expect(details.message).toBe(
			'Request failed with status code 400: First validation error, Second validation error',
		);
	});

	it('should use a response message for permission errors when available', () => {
		const details = extractDirectusErrorDetails({
			message: 'Request failed with status code 403',
			response: {
				statusCode: 403,
				statusMessage: 'Forbidden',
				data: {
					message: 'You do not have permission to access this item',
				},
			},
		});

		expect(details.statusCode).toBe(403);
		expect(details.statusMessage).toBe('Forbidden');
		expect(details.message).toContain('You do not have permission to access this item');
	});

	it('should fall back to HTTP status and status text when Directus message is missing', () => {
		const details = extractDirectusErrorDetails({
			message: 'Request failed with status code 503',
			response: {
				status: 503,
				statusMessage: 'Service Unavailable',
				data: { requestId: 'abc-123' },
			},
		});

		expect(details.message).toBe('Request failed with status code 503 (Service Unavailable)');
		expect(details.statusCode).toBe(503);
		expect(details.statusMessage).toBe('Service Unavailable');
	});

	it('should redact sensitive keys in the response body', () => {
		const details = extractDirectusErrorDetails({
			message: 'Request failed with status code 400',
			response: {
				status: 400,
				data: {
					message: 'Malformed query',
					token: 'secret-token',
					authorization: 'Bearer abc',
				},
			},
		});

		expect(details.responseBody).toEqual(
			expect.objectContaining({
				token: '[redacted]',
				authorization: '[redacted]',
			}),
		);
	});

	it('should redact sensitive keys recursively in nested response objects', () => {
		const details = extractDirectusErrorDetails({
			message: 'Request failed with status code 400',
			response: {
				status: 400,
				data: {
					errors: [
						{
							message: 'Nested auth details should be redacted',
							extensions: {
								auth: {
									token: 'top-secret',
									authorization: 'Bearer top-secret',
								},
							},
						},
					],
				},
			},
		});

		expect(details.responseBody).toEqual(
			expect.objectContaining({
				errors: expect.arrayContaining([
					expect.objectContaining({
						extensions: expect.objectContaining({
							auth: expect.objectContaining({
								token: '[redacted]',
								authorization: '[redacted]',
							}),
						}),
					}),
				]),
			}),
		);
	});
});
