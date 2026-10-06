import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { Directus } from '../nodes/Directus/Directus.node';
import { createMockExecuteFunctions } from './helpers';
import * as fieldsUtils from '../nodes/Directus/methods/fields';
import * as apiUtils from '../nodes/Directus/methods/api';

vi.mock('../nodes/Directus/methods/fields', () => ({
	getCollections: vi.fn(),
	convertCollectionFieldsToN8n: vi.fn(),
}));

vi.mock('../nodes/Directus/methods/api', async (importOriginal) => ({
	...(await importOriginal<typeof import('../nodes/Directus/methods/api')>()),
	getFieldsFromAPI: vi.fn(),
	getRolesFromAPI: vi.fn(),
}));

function directusError(status: number, message: string, code: string) {
	return Object.assign(new Error(`Request failed with status code ${status}`), {
		isAxiosError: true,
		status,
		response: {
			status,
			statusText: 'Bad Request',
			headers: {},
			data: { errors: [{ message, extensions: { code } }] },
		},
	});
}

describe('Directus Node', () => {
	let node: Directus;
	let mockExecuteFunctions: any;

	beforeEach(() => {
		vi.clearAllMocks();
		node = new Directus();
		mockExecuteFunctions = createMockExecuteFunctions();
	});

	it('should initialize successfully', () => {
		expect(node).toBeDefined();
		expect(node.description).toBeDefined();
		expect(node.methods?.loadOptions).toBeDefined();
	});

	describe('Load Options', () => {
		it('should load collections', async () => {
			const mockCollections = [
				{ collection: 'users', schema: null, meta: null },
				{ collection: 'posts', schema: null, meta: null },
			];
			vi.mocked(fieldsUtils.getCollections).mockResolvedValue(mockCollections as any);

			const result = await node.methods!.loadOptions!.getCollections.call(mockExecuteFunctions);

			expect(result).toHaveLength(2);
			expect(result[0].value).toBe('users');
		});

		it('should load roles', async () => {
			const mockRoles = [
				{
					id: '1',
					name: 'admin',
					icon: '',
					description: null,
					ip_access: null,
					enforce_tfa: false,
					admin_access: false,
					app_access: false,
				},
			];
			vi.mocked(apiUtils.getRolesFromAPI).mockResolvedValue(mockRoles as any);

			const result = await node.methods!.loadOptions!.getRoles.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0].value).toBe('1');
		});

		it('should load collection fields', async () => {
			const mockFields = [
				{ name: 'name', displayName: 'Name', type: 'string' },
				{ name: 'email', displayName: 'Email', type: 'string' },
			] as any;
			vi.mocked(fieldsUtils.convertCollectionFieldsToN8n).mockResolvedValue(mockFields);
			mockExecuteFunctions.getCurrentNodeParameter.mockReturnValue('users');
			// Mock getFieldsFromAPI which is called by loadOptions
			vi.mocked(apiUtils.getFieldsFromAPI).mockResolvedValue([
				{ field: 'name', type: 'string', collection: 'users', meta: null, schema: null },
				{ field: 'email', type: 'string', collection: 'users', meta: null, schema: null },
			] as any);

			const result =
				await node.methods!.loadOptions!.getCollectionFields.call(mockExecuteFunctions);

			expect(result).toHaveLength(2);
			expect(result[0].value).toBe('name');
			expect(result[1].value).toBe('email');
		});
	});

	describe('Execute Operations', () => {
		it('should create item', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('users')
				.mockReturnValueOnce({ fields: { field: [{ name: 'name', value: 'Test' }] } });

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
				data: { id: 1, name: 'Test' },
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toEqual({ id: 1, name: 'Test' });
		});

		it('should get item', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('users')
				.mockReturnValueOnce('1');

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
				data: { id: 1, name: 'Test' },
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toEqual({ id: 1, name: 'Test' });
		});

		it('should get item when item ID is a number (expressions)', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('users')
				.mockReturnValueOnce(42);

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
				data: { id: 42, name: 'Numeric' },
			});

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: '/items/users/42',
				}),
			);
		});

		it('should throw when item ID is missing for get', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('users')
				.mockReturnValueOnce('');

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toBeInstanceOf(
				NodeOperationError,
			);
		});

		it('should throw when item ID is whitespace-only for get', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('users')
				.mockReturnValueOnce('   ');

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toBeInstanceOf(
				NodeOperationError,
			);
		});

		it('should update item', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('update')
				.mockReturnValueOnce('users')
				.mockReturnValueOnce('1')
				.mockReturnValueOnce({ fields: { field: [{ name: 'name', value: 'Updated' }] } });

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
				data: { id: 1, name: 'Updated' },
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toEqual({ id: 1, name: 'Updated' });
		});

		it('should delete item', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('delete')
				.mockReturnValueOnce('users')
				.mockReturnValueOnce('1');

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toEqual({ deleted: true, id: '1' });
		});

		it('should delete item when item ID is a number', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('delete')
				.mockReturnValueOnce('users')
				.mockReturnValueOnce(99);

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toEqual({ deleted: true, id: '99' });
			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'DELETE',
					url: '/items/users/99',
				}),
			);
		});

		it('should throw when item ID is missing for update', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('update')
				.mockReturnValueOnce('users')
				.mockReturnValueOnce({ fields: { field: [] } })
				.mockReturnValueOnce('');

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toBeInstanceOf(
				NodeOperationError,
			);
		});

		describe('User Operations', () => {
			it('should invite user', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('user')
					.mockReturnValueOnce('invite')
					.mockReturnValueOnce('test@example.com')
					.mockReturnValueOnce('1')
					.mockReturnValueOnce('');

				mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
					data: { email: 'test@example.com', role: '1' },
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result[0][0].json).toHaveProperty('email', 'test@example.com');
				expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
					expect.objectContaining({
						method: 'POST',
						url: '/users/invite',
					}),
				);
			});

			it('should get user', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('user')
					.mockReturnValueOnce('get')
					.mockReturnValueOnce('user-1')
					.mockReturnValueOnce(false);

				mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
					data: { id: 'user-1', email: 'test@example.com' },
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result[0][0].json).toEqual({ id: 'user-1', email: 'test@example.com' });
			});

			it('should get many users', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('user')
					.mockReturnValueOnce('getAll')
					.mockReturnValueOnce(false);

				mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
					data: [
						{ id: 'user-1', email: 'test1@example.com' },
						{ id: 'user-2', email: 'test2@example.com' },
					],
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result[0]).toHaveLength(2);
				expect(result[0][0].json).toEqual({ id: 'user-1', email: 'test1@example.com' });
			});

			it('should update user', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('user')
					.mockReturnValueOnce('update')
					.mockReturnValueOnce('user-1')
					.mockReturnValueOnce({
						fields: { field: [{ name: 'email', value: 'updated@example.com' }] },
					});

				mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
					data: { id: 'user-1', email: 'updated@example.com' },
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result[0][0].json).toEqual({ id: 'user-1', email: 'updated@example.com' });
			});

			it('should delete user', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('user')
					.mockReturnValueOnce('delete')
					.mockReturnValueOnce('user-1');

				mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result[0][0].json).toEqual({ deleted: true, id: 'user-1' });
			});
		});

		describe('File Operations', () => {
			it('should handle file upload operations', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('file')
					.mockReturnValueOnce('upload');

				const mockBinaryData = {
					file: {
						data: Buffer.from('test file content').toString('base64'),
						fileName: 'test.txt',
						mimeType: 'text/plain',
					},
				};
				mockExecuteFunctions.getInputData.mockReturnValue([{ binary: mockBinaryData }]);
				mockExecuteFunctions.helpers.assertBinaryData.mockReturnValue({
					fileName: 'test.txt',
					mimeType: 'text/plain',
				});
				mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(
					Buffer.from('test file content'),
				);
				mockExecuteFunctions.helpers.request = vi.fn().mockResolvedValue({
					data: { id: 'file-1', filename_download: 'test.txt' },
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result[0][0].json).toHaveProperty('id', 'file-1');
				expect(mockExecuteFunctions.helpers.request).toHaveBeenCalled();
			});

			it('should handle file import operations', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('file')
					.mockReturnValueOnce('import')
					.mockReturnValueOnce('https://example.com/image.jpg');

				mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
					data: { id: 'file-2', filename_download: 'image.jpg' },
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result[0][0].json).toHaveProperty('id', 'file-2');
			});

			it('should handle file get operations', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('file')
					.mockReturnValueOnce('get')
					.mockReturnValueOnce('file-3');

				mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
					data: { id: 'file-3', filename_download: 'document.pdf' },
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result[0][0].json).toHaveProperty('id', 'file-3');
			});

			it('should handle file delete operations', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('file')
					.mockReturnValueOnce('delete')
					.mockReturnValueOnce('file-4');

				mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result[0][0].json).toEqual({ deleted: true, id: 'file-4' });
			});
		});

		it('should handle errors with continueOnFail', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('users')
				.mockReturnValueOnce('1');

			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toHaveProperty('error', 'API Error');
		});

		it('should throw errors when continueOnFail is false', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('users')
				.mockReturnValueOnce('1');

			mockExecuteFunctions.continueOnFail.mockReturnValue(false);
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow('API Error');
		});

		it('should throw the Directus message with status, code, and item index', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('posts')
				.mockReturnValueOnce('1');

			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(
				directusError(403, "You don't have permission to access this.", 'FORBIDDEN'),
			);

			const error = await node.execute.call(mockExecuteFunctions).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(NodeApiError);
			expect(error).toMatchObject({
				message: "You don't have permission to access this.",
				description: 'Directus error code: FORBIDDEN',
				httpCode: '403',
				context: expect.objectContaining({ itemIndex: 0 }),
			});
		});

		it('should report the index of the item that failed', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }, { json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => {
				const params: Record<string, string> = {
					resource: 'item',
					operation: 'get',
					collection: 'posts',
					itemId: '1',
				};
				return params[name];
			});
			mockExecuteFunctions.helpers.httpRequest
				.mockResolvedValueOnce({ data: { id: 1 } })
				.mockResolvedValueOnce({ data: { id: 2 } })
				.mockRejectedValueOnce(directusError(400, 'Invalid query.', 'INVALID_QUERY'));

			const error = await node.execute.call(mockExecuteFunctions).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(NodeApiError);
			expect((error as NodeApiError).context.itemIndex).toBe(2);
			expect((error as NodeApiError).message).not.toMatch(/\[item/i);
		});

		it('should keep validation errors as NodeOperationError with the item index', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('posts')
				.mockReturnValueOnce('');

			const error = await node.execute.call(mockExecuteFunctions).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(NodeOperationError);
			expect(error).not.toBeInstanceOf(NodeApiError);
			expect(error).toMatchObject({
				message: 'Item ID is required for get operation',
				context: expect.objectContaining({ itemIndex: 0 }),
			});
		});

		it('should output Directus error details per item with continueOnFail', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => {
				const params: Record<string, unknown> = {
					resource: 'item',
					operation: 'create',
					collection: 'posts',
					collectionFields: { fields: { field: [{ name: 'title', value: 'Hello' }] } },
				};
				return params[name];
			});
			mockExecuteFunctions.helpers.httpRequest
				.mockResolvedValueOnce({ data: { id: 1, title: 'Hello' } })
				.mockRejectedValueOnce(
					directusError(
						400,
						'Value for field "title" in collection "posts" has to be unique.',
						'RECORD_NOT_UNIQUE',
					),
				);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0]).toEqual({ json: { id: 1, title: 'Hello' }, pairedItem: { item: 0 } });
			expect(result[0][1]).toMatchObject({
				json: {
					error: 'Value for field "title" in collection "posts" has to be unique.',
					details: {
						httpCode: '400',
						code: 'RECORD_NOT_UNIQUE',
						errors: [
							{
								message: 'Value for field "title" in collection "posts" has to be unique.',
								extensions: { code: 'RECORD_NOT_UNIQUE' },
							},
						],
					},
				},
				pairedItem: { item: 1 },
			});
		});

		describe('error output routing', () => {
			// WorkflowExecute.handleNodeErrorOutput: which items n8n sends to the error output, before and
			// after n8n-io/n8n#35939 (2.36.0, backported to 2.34.6 and 2.35.3)
			const routesWithoutDetailsRule = (json: Record<string, unknown>) =>
				Boolean(json.error) &&
				(Object.keys(json).length === 1 ||
					(Boolean(json.message) && Object.keys(json).length === 2));
			const routesWithDetailsRule = (json: Record<string, unknown>) =>
				Boolean(json.error) &&
				Object.keys(json).every((key) => ['error', 'message', 'details'].includes(key));

			async function failedItem(onError: string) {
				mockExecuteFunctions.continueOnFail.mockReturnValue(true);
				mockExecuteFunctions.getNode.mockReturnValue({
					...mockExecuteFunctions.getNode(),
					onError,
				});
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('item')
					.mockReturnValueOnce('get')
					.mockReturnValueOnce('posts')
					.mockReturnValueOnce('1');
				mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(
					directusError(403, "You don't have permission to access this.", 'FORBIDDEN'),
				);
				const [[item]] = await node.execute.call(mockExecuteFunctions);
				return item;
			}

			it('outputs only { error } so every n8n version routes it to the error output', async () => {
				const item = await failedItem('continueErrorOutput');

				expect(item.error).toBeUndefined();
				expect(item.json).toEqual({ error: "You don't have permission to access this." });
				expect(routesWithoutDetailsRule(item.json)).toBe(true);
				expect(routesWithDetailsRule(item.json)).toBe(true);
				expect(item.pairedItem).toEqual({ item: 0 });
			});

			it('adds details on the regular output', async () => {
				const item = await failedItem('continueRegularOutput');

				expect(item.error).toBeUndefined();
				expect(item.json).toMatchObject({
					error: "You don't have permission to access this.",
					details: { httpCode: '403', code: 'FORBIDDEN' },
				});
			});
		});

		it('should leave out httpCode for network errors with continueOnFail', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('posts')
				.mockReturnValueOnce('1');
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(
				Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:8055'), {
					isAxiosError: true,
					code: 'ECONNREFUSED',
				}),
			);

			const [[item]] = await node.execute.call(mockExecuteFunctions);

			expect(item.json).toEqual({
				error: 'The service refused the connection - perhaps it is offline',
			});
		});

		it('should output only the message for non-HTTP errors with continueOnFail', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('posts')
				.mockReturnValueOnce('');

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toEqual({ error: 'Item ID is required for get operation' });
		});

		it('should surface the Directus message for file uploads (legacy request helper)', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([
				{
					json: {},
					binary: { data: { data: '', mimeType: 'text/plain', fileName: 'test.txt' } },
				},
			]);
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('file')
				.mockReturnValueOnce('upload');
			const body = {
				errors: [
					{ message: 'File exceeds the maximum size.', extensions: { code: 'CONTENT_TOO_LARGE' } },
				],
			};
			mockExecuteFunctions.helpers.request.mockRejectedValue(
				Object.assign(new Error(`413 - ${JSON.stringify(body)}`), {
					statusCode: 413,
					status: 413,
					error: body,
					response: { headers: {}, status: 413, statusText: 'Payload Too Large' },
				}),
			);

			const error = await node.execute.call(mockExecuteFunctions).catch((e: unknown) => e);

			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalled();
			expect(error).toBeInstanceOf(NodeApiError);
			expect(error).toMatchObject({
				message: 'File exceeds the maximum size.',
				description: 'Directus error code: CONTENT_TOO_LARGE',
				httpCode: '413',
			});
		});
	});
});
