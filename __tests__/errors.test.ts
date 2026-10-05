import { describe, it, expect, vi } from 'vitest';
import { NodeApiError, NodeOperationError, type INode } from 'n8n-workflow';
import { readDirectusErrors, toNodeError } from '../nodes/Directus/methods/api';
import {
	getCollectionFieldsLoadOptions,
	getCollectionsLoadOptions,
	getRolesLoadOptions,
} from '../nodes/Directus/methods/loadOptions';
import { getCollectionsLoadOptions as getTriggerCollectionsLoadOptions } from '../nodes/DirectusTrigger/methods/loadOptions';

const node: INode = {
	id: 'test-node-id',
	name: 'Directus',
	type: 'directus',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

// Shape thrown by this.helpers.httpRequest (axios)
function axiosError(status: number, data?: unknown) {
	return Object.assign(new Error(`Request failed with status code ${status}`), {
		isAxiosError: true,
		status,
		response: { status, statusText: 'Status Text', headers: {}, data },
	});
}

// Shape thrown by the legacy this.helpers.request (used for file uploads)
function legacyRequestError(status: number, body: unknown) {
	return Object.assign(new Error(`${status} - ${JSON.stringify(body)}`), {
		statusCode: status,
		status,
		error: body,
		response: { headers: {}, status, statusText: 'Status Text' },
	});
}

const uniqueError = {
	errors: [
		{
			message: 'Value for field "title" in collection "posts" has to be unique.',
			extensions: { code: 'RECORD_NOT_UNIQUE', collection: 'posts', field: 'title' },
		},
	],
};

describe('readDirectusErrors', () => {
	it('reads message and code from an axios error', () => {
		expect(readDirectusErrors(axiosError(400, uniqueError))).toEqual({
			errors: uniqueError.errors,
			message: 'Value for field "title" in collection "posts" has to be unique.',
			code: 'RECORD_NOT_UNIQUE',
		});
	});

	it('joins multiple messages and dedupes codes', () => {
		const error = axiosError(400, {
			errors: [
				{ message: 'First problem', extensions: { code: 'INVALID_PAYLOAD' } },
				{ message: 'Second problem', extensions: { code: 'INVALID_PAYLOAD' } },
				{ message: 'Third problem', extensions: { code: 'FAILED_VALIDATION' } },
			],
		});

		expect(readDirectusErrors(error)).toMatchObject({
			message: 'First problem; Second problem; Third problem',
			code: 'INVALID_PAYLOAD, FAILED_VALIDATION',
		});
	});

	it('parses a JSON string body', () => {
		expect(readDirectusErrors(axiosError(400, JSON.stringify(uniqueError)))).toMatchObject({
			message: 'Value for field "title" in collection "posts" has to be unique.',
			code: 'RECORD_NOT_UNIQUE',
		});
	});

	it('reads the legacy request body from error.error, as object or string', () => {
		const expected = {
			message: 'Value for field "title" in collection "posts" has to be unique.',
			code: 'RECORD_NOT_UNIQUE',
		};
		expect(readDirectusErrors(legacyRequestError(400, uniqueError))).toMatchObject(expected);
		expect(readDirectusErrors(legacyRequestError(400, JSON.stringify(uniqueError)))).toMatchObject(
			expected,
		);
	});

	it('skips malformed entries', () => {
		const error = axiosError(400, {
			errors: [
				null,
				{ message: '' },
				{ message: 42 },
				{ extensions: { code: 7 } },
				{ message: '  ' },
			],
		});
		expect(readDirectusErrors(error)).toEqual({
			message: undefined,
			code: undefined,
			errors: [{ message: '' }, { message: 42 }, { extensions: { code: 7 } }, { message: '  ' }],
		});
	});

	it('drops non-object entries from the error list', () => {
		const error = axiosError(400, {
			errors: [null, 'oops', 7, ['nested'], { message: 'Real problem' }],
		});
		expect(readDirectusErrors(error)).toEqual({
			message: 'Real problem',
			code: undefined,
			errors: [{ message: 'Real problem' }],
		});
	});

	it.each([
		['no body', axiosError(500)],
		['HTML body', axiosError(502, '<html><body>Bad Gateway</body></html>')],
		['errors not an array', axiosError(400, { errors: 'nope' })],
		['empty errors', axiosError(400, { errors: [] })],
		['plain Error', new Error('boom')],
		['string', 'boom'],
		['undefined', undefined],
		['null', null],
	])('returns nothing for %s', (_label, error) => {
		expect(readDirectusErrors(error)).toEqual(
			expect.not.objectContaining({ message: expect.any(String) }),
		);
	});
});

describe('toNodeError', () => {
	it('turns a Directus axios error into a NodeApiError with the Directus message', () => {
		const error = toNodeError(node, axiosError(400, uniqueError), 3);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error.message).toBe('Value for field "title" in collection "posts" has to be unique.');
		expect(error.description).toBe('Directus error code: RECORD_NOT_UNIQUE');
		expect((error as NodeApiError).httpCode).toBe('400');
		expect(error.context.itemIndex).toBe(3);
	});

	it('does not prefix the message with the item index', () => {
		const error = toNodeError(node, axiosError(400, uniqueError), 0);
		expect(error.message).not.toMatch(/\[item/i);
	});

	it.each([
		[403, "You don't have permission to access this.", 'FORBIDDEN'],
		[401, 'Invalid user credentials.', 'INVALID_CREDENTIALS'],
		[404, 'Route /nope does not exist.', 'ROUTE_NOT_FOUND'],
		[429, 'Too many requests, retry after 1s.', 'REQUESTS_EXCEEDED'],
		[503, 'Database is overloaded.', 'SERVICE_UNAVAILABLE'],
	])('keeps the Directus message for %i', (status, message, code) => {
		const error = toNodeError(
			node,
			axiosError(status, { errors: [{ message, extensions: { code } }] }),
		);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error.message).toBe(message);
		expect(error.description).toBe(`Directus error code: ${code}`);
		expect((error as NodeApiError).httpCode).toBe(String(status));
	});

	it('handles the legacy request error shape (file uploads)', () => {
		const error = toNodeError(node, legacyRequestError(400, uniqueError), 1);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error.message).toBe('Value for field "title" in collection "posts" has to be unique.');
		expect((error as NodeApiError).httpCode).toBe('400');
		expect(error.context.itemIndex).toBe(1);
	});

	it('keeps a Directus message that mentions a Node error code', () => {
		const message = 'Webhook to http://example.com failed: ECONNREFUSED';
		const error = toNodeError(
			node,
			axiosError(500, { errors: [{ message, extensions: { code: 'INTERNAL_SERVER_ERROR' } }] }),
		);

		expect(error.message).toBe(message);
	});

	it.each([
		['legacy request body', legacyRequestError(400, uniqueError)],
		['legacy request string body', legacyRequestError(400, JSON.stringify(uniqueError))],
		['axios string body', axiosError(400, JSON.stringify(uniqueError))],
		['axios object body', axiosError(400, uniqueError)],
	])('keeps the parsed response body on the error for %s', (_label, thrown) => {
		expect(toNodeError(node, thrown).context.data).toEqual(uniqueError);
	});

	it('falls back to n8n defaults when the body has no Directus errors', () => {
		const error = toNodeError(node, axiosError(502, '<html>Bad Gateway</html>'));

		expect(error).toBeInstanceOf(NodeApiError);
		expect((error as NodeApiError).httpCode).toBe('502');
		expect(error.message).toMatch(/bad gateway/i);
	});

	it('handles network errors with no response', () => {
		const networkError = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:8055'), {
			isAxiosError: true,
			code: 'ECONNREFUSED',
		});
		const error = toNodeError(node, networkError, 2);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error.message).toMatch(/refused/i);
		expect(error.context.itemIndex).toBe(2);
	});

	it('passes NodeOperationErrors through and adds the item index', () => {
		const original = new NodeOperationError(node, 'Item ID is required for get operation');
		const error = toNodeError(node, original, 4);

		expect(error).toBe(original);
		expect(error.message).toBe('Item ID is required for get operation');
		expect(error.context.itemIndex).toBe(4);
	});

	it('keeps an item index that is already set', () => {
		const original = new NodeOperationError(node, 'boom', { itemIndex: 1 });
		expect(toNodeError(node, original, 5).context.itemIndex).toBe(1);
	});

	it('replaces n8n generic text on NodeApiErrors from httpRequestWithAuthentication', () => {
		// httpRequestWithAuthentication throws new NodeApiError(node, axiosError)
		const wrapped = new NodeApiError(node, axiosError(403, uniqueError) as never);
		expect(wrapped.message).toBe('Forbidden - perhaps check your credentials?');

		const error = toNodeError(node, wrapped, 2);

		expect(error).toBe(wrapped);
		expect(error.message).toBe('Value for field "title" in collection "posts" has to be unique.');
		expect(error.description).toBe('Directus error code: RECORD_NOT_UNIQUE');
		expect((error as NodeApiError).httpCode).toBe('403');
		expect(error.context.itemIndex).toBe(2);
		expect(readDirectusErrors(wrapped)).toMatchObject({ code: 'RECORD_NOT_UNIQUE' });
	});

	it('passes NodeApiErrors through', () => {
		const original = new NodeApiError(node, { message: 'already wrapped' });
		expect(toNodeError(node, original, 0)).toBe(original);
	});

	it('wraps plain errors in a NodeOperationError with the same message', () => {
		const error = toNodeError(node, new SyntaxError('Unexpected token } in JSON'), 0);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).not.toBeInstanceOf(NodeApiError);
		expect(error.message).toBe('Unexpected token } in JSON');
		expect(error.context.itemIndex).toBe(0);
	});

	it.each([
		['a string', 'boom', 'boom'],
		['undefined', undefined, 'undefined'],
		['a number', 42, '42'],
	])('wraps %s in a NodeOperationError', (_label, thrown, message) => {
		const error = toNodeError(node, thrown);
		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error.message).toBe(message);
	});

	it('does not treat a null response as an HTTP error', () => {
		const error = toNodeError(node, Object.assign(new Error('odd'), { response: null }));
		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).not.toBeInstanceOf(NodeApiError);
	});
});

describe('load options errors', () => {
	const forbidden = () =>
		axiosError(403, {
			errors: [
				{ message: "You don't have permission to access this.", extensions: { code: 'FORBIDDEN' } },
			],
		});
	const loadOptionsFunctions = () =>
		({
			getCredentials: vi.fn().mockResolvedValue({ url: 'https://test.directus.app', token: 't' }),
			getNode: vi.fn(() => node),
			getCurrentNodeParameter: vi.fn((name: string) => (name === 'collection' ? 'posts' : 'get')),
			helpers: { httpRequest: vi.fn().mockRejectedValue(forbidden()) },
		}) as never;

	it.each([
		['action node collections', () => getCollectionsLoadOptions, 'collections'],
		['trigger node collections', () => getTriggerCollectionsLoadOptions, 'collections'],
		['collection fields', () => getCollectionFieldsLoadOptions, 'fields'],
		['roles', () => getRolesLoadOptions, 'roles'],
	])('shows the Directus message once for %s', async (_label, getLoader, resource) => {
		const functions = loadOptionsFunctions();

		await expect(getLoader().call(functions)).rejects.toMatchObject({
			message: `Failed to load ${resource}: You don't have permission to access this.`,
		});
	});
});
