import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DirectusTrigger } from '../nodes/DirectusTrigger/DirectusTrigger.node';
import { createMockWebhookFunctions } from './helpers';

// Mock the directus utils
jest.mock('../src/utils/directus', () => ({
	getCollections: jest.fn(),
}));

describe('DirectusTrigger Node', () => {
	let node: DirectusTrigger;
	let mockWebhookFunctions: any;

	beforeEach(() => {
		jest.clearAllMocks();
		node = new DirectusTrigger();
		mockWebhookFunctions = createMockWebhookFunctions();
	});

	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			expect(node.description.name).toBe('directusTrigger');
			expect(node.description.displayName).toBe('Directus Trigger');
			expect(node.description.group).toEqual(['trigger']);
			expect(node.description.version).toBe(1);
		});

		it('should have correct inputs and outputs', () => {
			expect(node.description.inputs).toEqual([]);
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

		it('should have webhook methods', () => {
			expect(node.webhookMethods).toBeDefined();
			expect(node.webhookMethods?.default?.checkExists).toBeDefined();
			expect(node.webhookMethods?.default?.create).toBeDefined();
			expect(node.webhookMethods?.default?.delete).toBeDefined();
		});
	});

	describe('Webhook Methods', () => {
		describe('checkExists', () => {
			it('should return true when webhook exists', async () => {
				// Set up workflow static data with flowId
				const staticData = { flowId: 'existing-flow-id' };
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
				mockWebhookFunctions.getCredentials.mockResolvedValue({
					url: 'https://test.directus.app',
					token: 'test-token',
				});
				mockWebhookFunctions.helpers.request.mockResolvedValue({
					data: { id: 'existing-flow-id' },
				});

				const result = await node.webhookMethods!.default!.checkExists.call(mockWebhookFunctions);

				expect(result).toBe(true);
			});

			it('should return false when webhook does not exist', async () => {
				// Set up workflow static data with no flowId
				const staticData = {};
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);

				const result = await node.webhookMethods!.default!.checkExists.call(mockWebhookFunctions);

				expect(result).toBe(false);
			});

			it('should handle API errors gracefully', async () => {
				// Set up workflow static data with flowId that will fail
				const staticData = { flowId: 'non-existent-flow' };
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
				mockWebhookFunctions.getCredentials.mockResolvedValue({
					url: 'https://test.directus.app',
					token: 'test-token',
				});
				mockWebhookFunctions.helpers.request.mockRejectedValue(new Error('API Error'));

				const result = await node.webhookMethods!.default!.checkExists.call(mockWebhookFunctions);

				expect(result).toBe(false);
			});
		});

		describe('create', () => {
			it('should create webhook successfully', async () => {
				mockWebhookFunctions.getNodeParameter
					.mockReturnValueOnce('item') // resource
					.mockReturnValueOnce('create') // event
					.mockReturnValueOnce('users'); // collection
				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getCredentials.mockResolvedValue({
					url: 'https://test.directus.app',
					token: 'test-token',
				});
				const staticData = {};
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);

				// Mock successful flow creation response
				mockWebhookFunctions.helpers.request
					.mockResolvedValueOnce({ data: { data: [] } }) // cleanup flows
					.mockResolvedValueOnce({ data: { id: 'flow-id' } }) // create flow
					.mockResolvedValueOnce({}); // create operation

				const result = await node.webhookMethods!.default!.create.call(mockWebhookFunctions);

				expect(result).toBe(true);
			});

			it('should handle creation errors gracefully', async () => {
				mockWebhookFunctions.getNodeParameter
					.mockReturnValueOnce('item') // resource
					.mockReturnValueOnce('create') // event
					.mockReturnValueOnce('users'); // collection
				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getCredentials.mockResolvedValue({
					url: 'https://test.directus.app',
					token: 'test-token',
				});
				const staticData = {};
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
				mockWebhookFunctions.helpers.request.mockRejectedValue(new Error('API Error'));

				await expect(
					node.webhookMethods!.default!.create.call(mockWebhookFunctions),
				).rejects.toThrow('API Error');
			});
		});

		describe('delete', () => {
			it('should delete webhook successfully', async () => {
				const staticData = { testFlowIds: ['test-flow-1', 'test-flow-2'] };
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
				mockWebhookFunctions.getCredentials.mockResolvedValue({
					url: 'https://test.directus.app',
					token: 'test-token',
				});
				mockWebhookFunctions.helpers.request.mockResolvedValue({});

				const result = await node.webhookMethods!.default!.delete.call(mockWebhookFunctions);

				expect(result).toBe(true);
			});

			it('should handle deletion errors gracefully', async () => {
				const staticData = { testFlowIds: ['test-flow-1'] };
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
				mockWebhookFunctions.getCredentials.mockResolvedValue({
					url: 'https://test.directus.app',
					token: 'test-token',
				});
				mockWebhookFunctions.helpers.request.mockRejectedValue(new Error('API Error'));

				const result = await node.webhookMethods!.default!.delete.call(mockWebhookFunctions);

				expect(result).toBe(true); // Still returns true because it handles errors gracefully
			});
		});
	});

	describe('Webhook Handler', () => {
		it('should process item webhook correctly', async () => {
			const mockBodyData = {
				event: 'items.create',
				payload: { id: 1, name: 'Test Item' },
				collection: 'users',
				key: '1',
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('item') // resource
				.mockReturnValueOnce('create'); // event

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				workflowData: [
					[
						{
							json: {
								event: 'items.create',
								collection: 'users',
								action: 'create',
								payload: { id: 1, name: 'Test Item' },
								id: 1,
								key: '1',
								keys: ['1'],
								timestamp: expect.any(String),
							},
						},
					],
				],
			});
		});

		it('should process user webhook correctly', async () => {
			const mockBodyData = {
				event: 'users.update',
				payload: { id: 1, email: 'test@example.com' },
				key: '1',
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('user') // resource
				.mockReturnValueOnce('update'); // event
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				url: 'https://test.directus.app',
				token: 'test-token',
			});
			mockWebhookFunctions.helpers.request.mockResolvedValue({
				data: { data: { id: 1, email: 'test@example.com' } },
			});

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				workflowData: [
					[
						{
							json: {
								event: 'users.update',
								action: 'update',
								payload: { id: 1, email: 'test@example.com' },
								id: 1,
								key: '1',
								keys: ['1'],
								timestamp: expect.any(String),
							},
						},
					],
				],
			});
		});

		it('should process user webhook with keys array (real Directus behavior)', async () => {
			const mockBodyData = {
				event: 'users.update',
				payload: { last_page: '/settings/flows' },
				keys: ['d56956bf-6ed0-465e-bb4a-ec9bde65c5f0'], // Real Directus behavior
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('user') // resource
				.mockReturnValueOnce('update'); // event
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				url: 'https://test.directus.app',
				token: 'test-token',
			});
			mockWebhookFunctions.helpers.request.mockResolvedValue({
				data: { data: { id: 'd56956bf-6ed0-465e-bb4a-ec9bde65c5f0', email: 'test@example.com' } },
			});

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				workflowData: [
					[
						{
							json: {
								event: 'users.update',
								action: 'update',
								payload: { id: 'd56956bf-6ed0-465e-bb4a-ec9bde65c5f0', email: 'test@example.com' },
								id: 'd56956bf-6ed0-465e-bb4a-ec9bde65c5f0',
								key: 'd56956bf-6ed0-465e-bb4a-ec9bde65c5f0',
								keys: ['d56956bf-6ed0-465e-bb4a-ec9bde65c5f0'],
								timestamp: expect.any(String),
							},
						},
					],
				],
			});
		});

		it('should process file webhook correctly', async () => {
			const mockBodyData = {
				event: 'files.upload',
				payload: { id: 'file-id', filename_download: 'test.txt' },
				key: 'file-id',
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('file') // resource
				.mockReturnValueOnce('upload'); // event

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				workflowData: [
					[
						{
							json: {
								event: 'files.upload',
								action: 'upload',
								payload: { id: 'file-id', filename_download: 'test.txt' },
								id: 'file-id',
								key: 'file-id',
								keys: ['file-id'],
								timestamp: expect.any(String),
							},
						},
					],
				],
			});
		});

		it('should process file webhook with keys array (real Directus behavior)', async () => {
			const mockBodyData = {
				event: 'files.upload',
				payload: { id: 'file-id', filename_download: 'test.txt' },
				keys: ['file-id'], // Real Directus behavior - ID in keys array
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('file') // resource
				.mockReturnValueOnce('upload'); // event

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				workflowData: [
					[
						{
							json: {
								event: 'files.upload',
								action: 'upload',
								payload: { id: 'file-id', filename_download: 'test.txt' },
								id: 'file-id',
								key: 'file-id',
								keys: ['file-id'],
								timestamp: expect.any(String),
							},
						},
					],
				],
			});
		});

		it('should handle nested webhook payload', async () => {
			const mockBodyData = {
				body: {
					event: 'items.create',
					payload: { id: 1, name: 'Test Item' },
					collection: 'users',
					key: '1',
				},
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('item') // resource
				.mockReturnValueOnce('create'); // event

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result.workflowData![0][0].json.event).toBe('items.create');
			expect(result.workflowData![0][0].json.collection).toBe('users');
		});

		it('should handle invalid webhook data gracefully', async () => {
			mockWebhookFunctions.getBodyData.mockReturnValue({});
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('item') // resource
				.mockReturnValueOnce('create'); // event

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result.workflowData![0][0].json.event).toBe('items.create');
			expect(result.workflowData![0][0].json.collection).toBe('unknown');
		});

		it('should fetch complete data for update events', async () => {
			const mockBodyData = {
				event: 'items.update',
				payload: { id: 1, name: 'Updated Item' },
				collection: 'users',
				key: '1',
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('item') // resource
				.mockReturnValueOnce('update'); // event

			// Mock the complete data fetch
			mockWebhookFunctions.helpers.request.mockResolvedValue({
				data: { data: { id: 1, name: 'Updated Item', email: 'test@example.com' } },
			});

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result.workflowData![0][0].json.payload).toEqual({
				id: 1,
				name: 'Updated Item',
				email: 'test@example.com',
			});
		});

		it('should fallback to original data if complete data fetch fails', async () => {
			const mockBodyData = {
				event: 'items.update',
				payload: { id: 1, name: 'Updated Item' },
				collection: 'users',
				key: '1',
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('item') // resource
				.mockReturnValueOnce('update'); // event

			// Mock the complete data fetch to fail
			mockWebhookFunctions.helpers.request.mockRejectedValue(new Error('API Error'));

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result.workflowData![0][0].json.payload).toEqual({
				id: 1,
				name: 'Updated Item',
			});
		});
	});
});
