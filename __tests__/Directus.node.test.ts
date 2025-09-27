import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Directus } from '../nodes/Directus/Directus.node';
import { createMockExecuteFunctions } from './helpers';

// Mock the directus utils
jest.mock('../src/utils/directus', () => ({
	getCollections: jest.fn(),
	convertCollectionFieldsToN8n: jest.fn(),
	formatDirectusError: jest.fn((error: any) => error.message || 'Unknown error'),
	createEnhancedItemLabel: jest.fn((item: any) => item.name || `Item ${item.id}`),
	FALLBACK_DISPLAY_FIELDS: ['name', 'title', 'label', 'display', 'id'],
}));

// Mock the API utils
jest.mock('../src/utils/api', () => ({
	getFieldsFromAPI: jest.fn(),
	getRolesFromAPI: jest.fn(),
}));

describe('Directus Node', () => {
	let node: Directus;
	let mockExecuteFunctions: any;

	beforeEach(() => {
		jest.clearAllMocks();
		node = new Directus();
		mockExecuteFunctions = createMockExecuteFunctions();
	});

	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			expect(node.description.name).toBe('directus');
			expect(node.description.displayName).toBe('Directus');
			expect(node.description.group).toEqual(['output']);
			expect(node.description.version).toBe(1);
		});

		it('should have correct inputs and outputs', () => {
			expect(node.description.inputs).toEqual(['main']);
			expect(node.description.outputs).toEqual(['main']);
		});

		it('should require directusApi credentials', () => {
			expect(node.description.credentials).toEqual([
				{
					name: 'directusApi',
					required: true,
				},
			]);
		});

		it('should have loadOptions methods', () => {
			expect(node.methods?.loadOptions).toBeDefined();
			expect(node.methods?.loadOptions?.getCollections).toBeDefined();
			expect(node.methods?.loadOptions?.getRoles).toBeDefined();
			expect(node.methods?.loadOptions?.getCollectionFields).toBeDefined();
			expect(node.methods?.loadOptions?.getUserFields).toBeDefined();
			expect(node.methods?.loadOptions?.getFileFields).toBeDefined();
		});
	});

	describe('Load Options', () => {
		describe('getCollections', () => {
			it('should return collections in correct format', async () => {
				const mockCollections = [
					{ collection: 'users', meta: { display_template: '{{name}}' } },
					{ collection: 'posts', meta: { display_template: '{{title}}' } },
				];

				const { getCollections } = require('../src/utils/directus');
				getCollections.mockResolvedValue(mockCollections);

				const result = await node.methods!.loadOptions!.getCollections.call(mockExecuteFunctions);

				expect(result).toEqual([
					{ name: 'users', value: 'users' },
					{ name: 'posts', value: 'posts' },
				]);
				expect(getCollections).toHaveBeenCalledWith(mockExecuteFunctions);
			});

			it('should handle errors gracefully', async () => {
				const { getCollections } = require('../src/utils/directus');
				getCollections.mockRejectedValue(new Error('API Error'));

				await expect(
					node.methods!.loadOptions!.getCollections.call(mockExecuteFunctions),
				).rejects.toThrow('Failed to load collections: API Error');
			});
		});

		describe('getRoles', () => {
			it('should return roles in correct format', async () => {
				const mockRoles = [
					{ id: '1', name: 'admin', admin_access: true },
					{ id: '2', name: 'editor', admin_access: false },
				];

				const { getRolesFromAPI } = require('../src/utils/api');
				getRolesFromAPI.mockResolvedValue(mockRoles);

				const result = await node.methods!.loadOptions!.getRoles.call(mockExecuteFunctions);

				expect(result).toEqual([
					{ name: 'admin', value: '1' },
					{ name: 'editor', value: '2' },
				]);
			});

			it('should handle API errors', async () => {
				const { getRolesFromAPI } = require('../src/utils/api');
				getRolesFromAPI.mockRejectedValue(new Error('API Error'));

				await expect(
					node.methods!.loadOptions!.getRoles.call(mockExecuteFunctions),
				).rejects.toThrow('Failed to load roles: API Error');
			});
		});

		describe('getCollectionFields', () => {
			it('should return fields in correct format', async () => {
				const mockFields = [
					{ name: 'name', displayName: 'Name' },
					{ name: 'email', displayName: 'Email' },
				];

				const { convertCollectionFieldsToN8n } = require('../src/utils/directus');
				convertCollectionFieldsToN8n.mockResolvedValue(mockFields);

				mockExecuteFunctions.getCurrentNodeParameter.mockReturnValue('users');

				const result =
					await node.methods!.loadOptions!.getCollectionFields.call(mockExecuteFunctions);

				expect(result).toEqual([
					{ name: 'Name', value: 'name', description: '' },
					{ name: 'Email', value: 'email', description: '' },
				]);
			});

			it('should handle missing collection parameter', async () => {
				mockExecuteFunctions.getCurrentNodeParameter.mockReturnValue('');

				await expect(
					node.methods!.loadOptions!.getCollectionFields.call(mockExecuteFunctions),
				).rejects.toThrow('Collection parameter is required');
			});
		});

		describe('getUserFields', () => {
			it('should return user fields in correct format', async () => {
				const mockUserFields = [
					{
						field: 'first_name',
						type: 'string',
						meta: {
							display_name: 'First Name',
							required: true,
							note: 'User first name',
							special: [],
							locked: false,
							hidden: false,
						},
					},
					{
						field: 'last_name',
						type: 'string',
						meta: {
							display_name: 'Last Name',
							required: false,
							note: 'User last name',
							special: [],
							locked: false,
							hidden: false,
						},
					},
				];

				const { getFieldsFromAPI } = require('../src/utils/api');
				getFieldsFromAPI.mockResolvedValue(mockUserFields);

				const result = await node.methods!.loadOptions!.getUserFields.call(mockExecuteFunctions);

				expect(result).toEqual([
					{ name: 'First Name *', value: 'first_name', description: 'User first name' },
					{ name: 'Last Name', value: 'last_name', description: 'User last name' },
				]);
				expect(getFieldsFromAPI).toHaveBeenCalledWith(mockExecuteFunctions, 'directus_users');
			});

			it('should handle API errors', async () => {
				const { getFieldsFromAPI } = require('../src/utils/api');
				getFieldsFromAPI.mockRejectedValue(new Error('API Error'));

				await expect(
					node.methods!.loadOptions!.getUserFields.call(mockExecuteFunctions),
				).rejects.toThrow('Failed to load user fields: API Error');
			});
		});

		describe('getFileFields', () => {
			it('should return file fields in correct format', async () => {
				const mockFileFields = [
					{
						field: 'title',
						type: 'string',
						meta: {
							display_name: 'Title',
							required: true,
							note: 'File title',
							special: [],
							locked: false,
							hidden: false,
						},
					},
					{
						field: 'description',
						type: 'text',
						meta: {
							display_name: 'Description',
							required: false,
							note: 'File description',
							special: [],
							locked: false,
							hidden: false,
						},
					},
					{
						field: 'storage',
						type: 'string',
						meta: {
							display_name: 'Storage',
							required: true,
							note: 'Storage location',
							special: [],
							locked: false,
							hidden: false,
						},
					},
				];

				const { getFieldsFromAPI } = require('../src/utils/api');
				getFieldsFromAPI.mockResolvedValue(mockFileFields);

				const result = await node.methods!.loadOptions!.getFileFields.call(mockExecuteFunctions);

				expect(result).toEqual([
					{ name: 'Title *', value: 'title', description: 'File title' },
					{ name: 'Description', value: 'description', description: 'File description' },
				]);
				expect(getFieldsFromAPI).toHaveBeenCalledWith(mockExecuteFunctions, 'directus_files');
			});

			it('should handle API errors', async () => {
				const { getFieldsFromAPI } = require('../src/utils/api');
				getFieldsFromAPI.mockRejectedValue(new Error('API Error'));

				await expect(
					node.methods!.loadOptions!.getFileFields.call(mockExecuteFunctions),
				).rejects.toThrow('Failed to load file fields: API Error');
			});
		});
	});

	describe('Execute Method', () => {
		it('should handle item create operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item') // resource
				.mockReturnValueOnce('create') // operation
				.mockReturnValueOnce('users') // collection
				.mockReturnValueOnce('{"name": "Test User"}'); // jsonData

			mockExecuteFunctions.helpers.request.mockResolvedValue({
				data: { id: 1, name: 'Test User' },
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([
				[
					{
						json: { id: 1, name: 'Test User' },
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should handle item get operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item') // resource
				.mockReturnValueOnce('get') // operation
				.mockReturnValueOnce('users') // collection
				.mockReturnValueOnce('1'); // itemId

			mockExecuteFunctions.helpers.request.mockResolvedValue({
				data: { id: 1, name: 'Test User' },
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([
				[
					{
						json: { id: 1, name: 'Test User' },
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should handle user invite operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('user') // resource
				.mockReturnValueOnce('invite') // operation
				.mockReturnValueOnce('test@example.com') // email
				.mockReturnValueOnce('1'); // role

			mockExecuteFunctions.helpers.request.mockResolvedValue({
				data: { id: 1, email: 'test@example.com' },
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([
				[
					{
						json: { id: 1, email: 'test@example.com' },
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should handle file upload operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('file') // resource
				.mockReturnValueOnce('upload') // operation
				.mockReturnValueOnce('test.txt') // filename
				.mockReturnValueOnce('text/plain'); // mimeType

			mockExecuteFunctions.helpers.request.mockResolvedValue({
				data: { id: 'file-id', filename_download: 'test.txt' },
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([
				[
					{
						json: { id: 'file-id', filename_download: 'test.txt' },
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should handle errors with continueOnFail', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item') // resource
				.mockReturnValueOnce('create') // operation
				.mockReturnValueOnce('users') // collection
				.mockReturnValueOnce('{"name": "Test User"}'); // jsonData

			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			mockExecuteFunctions.helpers.request.mockRejectedValue(new Error('API Error'));

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([
				[
					{
						json: { error: 'API Error' },
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should throw errors when continueOnFail is false', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('item') // resource
				.mockReturnValueOnce('create') // operation
				.mockReturnValueOnce('users') // collection
				.mockReturnValueOnce('{"name": "Test User"}'); // jsonData

			mockExecuteFunctions.continueOnFail.mockReturnValue(false);
			mockExecuteFunctions.helpers.request.mockRejectedValue(new Error('API Error'));

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow('API Error');
		});
	});
});
