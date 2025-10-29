import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DirectusTrigger } from '../nodes/DirectusTrigger/DirectusTrigger.node';
import { createMockWebhookFunctions } from './helpers';

vi.mock('../nodes/Directus/methods/fields', () => ({
	getCollections: vi.fn(),
}));

describe('DirectusTrigger Node', () => {
	let node: DirectusTrigger;
	let mockWebhookFunctions: any;

	beforeEach(() => {
		vi.clearAllMocks();
		node = new DirectusTrigger();
		mockWebhookFunctions = createMockWebhookFunctions();
	});

	it('should initialize successfully', () => {
		expect(node).toBeDefined();
		expect(node.description).toBeDefined();
		expect(node.webhookMethods).toBeDefined();
	});

	describe('Webhook Management', () => {
		it('should create webhook flow', async () => {
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('users');
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});
			mockWebhookFunctions.helpers.httpRequest
				.mockResolvedValueOnce({ data: { data: [] } })
				.mockResolvedValueOnce({ data: { id: 'flow-id' } })
				.mockResolvedValueOnce({});

			const result = await node.webhookMethods!.default!.create.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should delete webhook flow', async () => {
			const staticData = { testFlowIds: ['flow-1'] };
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
			mockWebhookFunctions.helpers.httpRequest.mockResolvedValue({});

			const result = await node.webhookMethods!.default!.delete.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});
	});

	describe('Webhook Processing', () => {
		it('should process item webhook', async () => {
			const mockBodyData = {
				event: 'items.create',
				payload: { id: 1, name: 'Test' },
				collection: 'users',
				key: '1',
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('create');

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result.workflowData![0][0].json.event).toBe('items.create');
			expect(result.workflowData![0][0].json.id).toBe(1);
			expect(result.workflowData![0][0].json.collection).toBe('users');
		});

		it('should process user webhook', async () => {
			const mockBodyData = {
				event: 'users.update',
				payload: { id: 1, email: 'test@example.com' },
				key: '1',
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('user')
				.mockReturnValueOnce('update');
			mockWebhookFunctions.helpers.httpRequest.mockResolvedValue({
				data: { data: { id: 1, email: 'test@example.com' } },
			});

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result.workflowData![0][0].json.event).toBe('users.update');
			expect(result.workflowData![0][0].json.id).toBe(1);
		});

		it('should process file webhook', async () => {
			const mockBodyData = {
				event: 'files.upload',
				payload: { id: 'file-id', filename_download: 'test.txt' },
				key: 'file-id',
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('file')
				.mockReturnValueOnce('upload');

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result.workflowData![0][0].json.event).toBe('files.upload');
			expect(result.workflowData![0][0].json.id).toBe('file-id');
		});

		it('should extract ID from keys array when key is missing', async () => {
			const mockBodyData = {
				event: 'users.update',
				payload: { last_page: '/settings' },
				keys: ['user-uuid-123'],
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('user')
				.mockReturnValueOnce('update');
			mockWebhookFunctions.helpers.httpRequest.mockResolvedValue({
				data: { data: { id: 'user-uuid-123', email: 'test@example.com' } },
			});

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result.workflowData![0][0].json.id).toBe('user-uuid-123');
			expect(result.workflowData![0][0].json.key).toBe('user-uuid-123');
		});

		it('should handle empty webhook data', async () => {
			mockWebhookFunctions.getBodyData.mockReturnValue({});
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('create');

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result.workflowData![0][0].json.event).toBe('items.create');
			expect(result.workflowData![0][0].json.collection).toBe('unknown');
		});
	});
});
