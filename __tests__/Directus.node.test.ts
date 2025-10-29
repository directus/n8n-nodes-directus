import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Directus } from '../nodes/Directus/Directus.node';
import { createMockExecuteFunctions } from './helpers';
import * as fieldsUtils from '../nodes/Directus/methods/fields';
import * as apiUtils from '../nodes/Directus/methods/api';

vi.mock('../nodes/Directus/methods/fields', () => ({
	getCollections: vi.fn(),
	convertCollectionFieldsToN8n: vi.fn(),
	formatDirectusError: vi.fn((error: any) => error.message || 'Unknown error'),
	processFieldValue: vi.fn((value: any) => value),
	shouldSkipFieldPublic: vi.fn(() => false),
	formatDisplayName: vi.fn((field: any) => field.meta?.display_name || field.field),
}));

vi.mock('../nodes/Directus/methods/api', () => ({
	getFieldsFromAPI: vi.fn(),
	getRolesFromAPI: vi.fn(),
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
				{ collection: 'users', meta: {} },
				{ collection: 'posts', meta: {} },
			];
			vi.mocked(fieldsUtils.getCollections).mockResolvedValue(mockCollections);

			const result = await node.methods!.loadOptions!.getCollections.call(mockExecuteFunctions);

			expect(result).toHaveLength(2);
			expect(result[0].value).toBe('users');
		});

		it('should load roles', async () => {
			const mockRoles = [{ id: '1', name: 'admin' }];
			vi.mocked(apiUtils.getRolesFromAPI).mockResolvedValue(mockRoles);

			const result = await node.methods!.loadOptions!.getRoles.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0].value).toBe('1');
		});

		it('should load collection fields', async () => {
			const mockFields = [{ name: 'name', displayName: 'Name' }] as any;
			vi.mocked(fieldsUtils.convertCollectionFieldsToN8n).mockResolvedValue(mockFields);
			mockExecuteFunctions.getCurrentNodeParameter.mockReturnValue('users');

			const result =
				await node.methods!.loadOptions!.getCollectionFields.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0].value).toBe('name');
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

		it('should handle user operations', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('user')
				.mockReturnValueOnce('invite')
				.mockReturnValueOnce('test@example.com')
				.mockReturnValueOnce('1')
				.mockReturnValueOnce('');

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toHaveProperty('success', true);
		});

		it('should handle file operations', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('file')
				.mockReturnValueOnce('upload')
				.mockReturnValueOnce('test.txt')
				.mockReturnValueOnce('Test File')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('');

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
				data: { id: 'file-1', filename_download: 'test.txt' },
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toHaveProperty('id', 'file-1');
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
	});
});
