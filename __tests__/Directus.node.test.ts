import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Directus } from '../nodes/Directus/Directus.node';
import { createMockExecuteFunctions } from './helpers';
import * as fieldsUtils from '../nodes/Directus/methods/fields';
import * as apiUtils from '../nodes/Directus/methods/api';

vi.mock('../nodes/Directus/methods/fields', () => ({
	getCollections: vi.fn(),
	convertCollectionFieldsToN8n: vi.fn(),
	formatDirectusError: vi.fn((error: any) => error.message || 'Unknown error'),
}));

vi.mock('../nodes/Directus/methods/api', () => ({
	getFieldsFromAPI: vi.fn(),
	getRolesFromAPI: vi.fn(),
	extractDirectusErrorDetails: vi.fn((error: any) => ({
		message: error?.message || 'Unknown error',
	})),
}));

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
			expect(result[0][0].json).toHaveProperty('errorDetails.itemIndex', 0);
			expect(result[0][0].json).toHaveProperty('errorDetails.resource', 'item');
			expect(result[0][0].json).toHaveProperty('errorDetails.operation', 'get');
			expect(result[0][0].json).toHaveProperty('errorDetails.collection', 'users');
		});

		it('should include the failing item index in continueOnFail output during batch processing', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);

			mockExecuteFunctions.getNodeParameter.mockImplementation((parameter: string, index: number) => {
				switch (parameter) {
					case 'resource':
						return 'item';
					case 'operation':
						return 'get';
					case 'collection':
						return 'users';
					case 'itemId':
						return index === 0 ? '1' : '2';
					default:
						return undefined;
				}
			});

			mockExecuteFunctions.helpers.httpRequest
				.mockResolvedValueOnce({ data: { id: 1, name: 'First item' } })
				.mockRejectedValueOnce(new Error('Relationship creation failed'));

			mockExecuteFunctions.continueOnFail.mockReturnValue(true);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(2);
			expect(result[0][0].json).toEqual({ id: 1, name: 'First item' });
			expect(result[0][1].json).toHaveProperty('error', 'Relationship creation failed');
			expect(result[0][1].json).toHaveProperty('errorDetails.itemIndex', 1);
		});

		it('should include structured Directus response details in continueOnFail output', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('tools')
				.mockReturnValueOnce('1');

			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(
				new Error('Request failed with status code 400'),
			);

			vi.mocked(apiUtils.extractDirectusErrorDetails).mockReturnValue({
				message:
					'Request failed with status code 400: Invalid foreign key "199" for field "owner" in collection "tools".',
				statusCode: 400,
				statusMessage: 'Bad Request',
				responseBody: {
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
				directusErrors: [
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
				originalMessage: 'Request failed with status code 400',
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toHaveProperty(
				'error',
				'Request failed with status code 400: Invalid foreign key "199" for field "owner" in collection "tools".',
			);
			expect(result[0][0].json).toHaveProperty('errorDetails.itemIndex', 0);
			expect(result[0][0].json).toHaveProperty('errorDetails.collection', 'tools');
			expect(result[0][0].json).toHaveProperty('errorDetails.statusCode', 400);
			expect(result[0][0].json).toHaveProperty('errorDetails.statusMessage', 'Bad Request');
			expect(result[0][0].json).toHaveProperty(
				'errorDetails.responseBody.errors.0.extensions.code',
				'INVALID_FOREIGN_KEY',
			);
			expect(result[0][0].json).toHaveProperty(
				'errorDetails.directusErrors.0.extensions.field',
				'owner',
			);
		});

		it('should throw errors when continueOnFail is false', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('users')
				.mockReturnValueOnce('1');

			mockExecuteFunctions.continueOnFail.mockReturnValue(false);
			const testError = new Error('API Error');
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(testError);
			vi.mocked(apiUtils.extractDirectusErrorDetails).mockReturnValue({
				message: 'API Error',
				statusCode: 400,
				responseBody: { errors: [{ message: 'Malformed query' }] },
			});

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow('[Item 0] API Error');
		});
	});
});
