import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DirectusTrigger } from '../nodes/DirectusTrigger/DirectusTrigger.node';
import { createMockWebhookFunctions } from './helpers';

// Mock the directus utils
jest.mock('../src/utils/directus', () => ({
	getCollections: jest.fn(),
}));

describe('Integration Tests', () => {
	let mockWebhookFunctions: any;

	beforeEach(() => {
		mockWebhookFunctions = createMockWebhookFunctions({
			nodeParameters: {},
			bodyData: {},
		});

		jest.clearAllMocks();
	});

	describe('DirectusTrigger - File Webhook Restrictions)', () => {
		it('should ONLY allow upload events for file resources', () => {
			const node = new DirectusTrigger();

			// Check that file resource has different event options than item/user
			const properties = node.description.properties;
			const eventFields = properties.filter((prop: any) => prop.name === 'event');

			// Should have two event fields - one for item/user, one for file
			expect(eventFields).toHaveLength(2);

			const fileEventField = eventFields.find((field: any) =>
				field.displayOptions?.show?.resource?.includes('file'),
			);
			const itemUserEventField = eventFields.find((field: any) =>
				field.displayOptions?.show?.resource?.includes('item'),
			);

			// File events should only have upload
			expect(fileEventField).toBeDefined();
			expect(fileEventField!.options).toEqual([{ name: 'Uploaded', value: 'upload' }]);

			// Item/user events should have create, update, delete
			expect(itemUserEventField).toBeDefined();
			expect(itemUserEventField!.options).toHaveLength(3);
			expect(itemUserEventField!.options?.map((o: any) => o.value)).toEqual([
				'create',
				'update',
				'delete',
			]);
		});

		it('should process file upload webhooks correctly', async () => {
			const node = new DirectusTrigger();

			const fileUploadPayload = {
				event: 'files.upload',
				payload: { id: 'file-123', filename_download: 'document.pdf' },
				keys: ['file-123'],
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(fileUploadPayload);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('file') // resource
				.mockReturnValueOnce('upload'); // event

			const result = await node.webhook.call(mockWebhookFunctions);

			// Should extract file ID from keys array
			expect(result.workflowData![0][0].json.id).toBe('file-123');
			expect(result.workflowData![0][0].json.key).toBe('file-123');
			expect(result.workflowData![0][0].json.action).toBe('upload');
		});
	});

	describe('DirectusTrigger - Key Extraction Logic (Critical Bug Fix)', () => {
		it('should extract user ID from keys array when key field is missing', async () => {
			const node = new DirectusTrigger();

			// Real Directus user update webhook payload
			const userUpdatePayload = {
				event: 'users.update',
				payload: { last_page: '/settings/flows' },
				keys: ['d56956bf-6ed0-465e-bb4a-ec9bde65c5f0'],
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(userUpdatePayload);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('user') // resource
				.mockReturnValueOnce('update'); // event
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				url: 'https://test.directus.app',
				token: 'test-token',
			});
			mockWebhookFunctions.helpers.httpRequest.mockResolvedValue({
				data: { data: { id: 'd56956bf-6ed0-465e-bb4a-ec9bde65c5f0', email: 'test@example.com' } },
			});

			const result = await node.webhook.call(mockWebhookFunctions);

			// This would fail if key extraction logic was broken
			expect(result.workflowData![0][0].json.id).toBe('d56956bf-6ed0-465e-bb4a-ec9bde65c5f0');
			expect(result.workflowData![0][0].json.key).toBe('d56956bf-6ed0-465e-bb4a-ec9bde65c5f0');
			expect(result.workflowData![0][0].json.keys).toEqual([
				'd56956bf-6ed0-465e-bb4a-ec9bde65c5f0',
			]);
		});

		it('should handle missing keys gracefully', async () => {
			const node = new DirectusTrigger();

			const malformedPayload = {
				event: 'items.create',
				payload: { title: 'Test' },
				collection: 'posts',
				// No key or keys field - this should not crash
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(malformedPayload);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('item') // resource
				.mockReturnValueOnce('create'); // event

			const result = await node.webhook.call(mockWebhookFunctions);

			// Should still work, just with undefined/null IDs
			expect(result.workflowData![0][0].json.event).toBe('items.create');
			expect(result.workflowData![0][0].json.collection).toBe('posts');
			// ID might be undefined, but shouldn't crash
			expect(typeof result.workflowData![0][0].json.id).toBe('undefined');
		});
	});

	describe('DirectusTrigger - Flow Naming Logic (Recent Bug Fix)', () => {
		it('should name flows correctly for user/file resources vs item resources', async () => {
			const node = new DirectusTrigger();

			// Test user resource flow naming
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('user') // resource
				.mockReturnValueOnce('update') // event
				.mockReturnValueOnce(undefined); // collection (not applicable for users)
			mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				url: 'https://test.directus.app',
				token: 'test-token',
			});
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});

			// Mock flow creation
			let capturedFlowName = '';
			mockWebhookFunctions.helpers.httpRequest
				.mockResolvedValueOnce({ data: { data: [] } }) // cleanup flows
				.mockImplementationOnce((options: any) => {
					// Capture the flow name from the request body
					capturedFlowName = options.body.name;
					return Promise.resolve({ data: { id: 'flow-id' } });
				});

			await node.webhookMethods!.default!.create.call(mockWebhookFunctions);

			// Should use 'user' as resource name, not undefined collection
			expect(capturedFlowName).toContain('update user');
			expect(capturedFlowName).not.toContain('update undefined');
			expect(capturedFlowName).not.toContain('update 0');
		});

		it('should name flows correctly for item resources', async () => {
			const node = new DirectusTrigger();

			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('item') // resource
				.mockReturnValueOnce('create') // event
				.mockReturnValueOnce('articles'); // collection
			mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				url: 'https://test.directus.app',
				token: 'test-token',
			});
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});

			let capturedFlowName = '';
			mockWebhookFunctions.helpers.httpRequest
				.mockResolvedValueOnce({ data: { data: [] } })
				.mockImplementationOnce((options: any) => {
					capturedFlowName = options.body.name;
					return Promise.resolve({ data: { id: 'flow-id' } });
				});

			await node.webhookMethods!.default!.create.call(mockWebhookFunctions);

			// Should use collection name for items
			expect(capturedFlowName).toContain('create articles');
		});
	});

	describe('DirectusTrigger - Webhook Data Enrichment', () => {
		it('should add n8n-specific fields without breaking original payload', async () => {
			const node = new DirectusTrigger();

			const originalPayload = {
				event: 'items.create',
				payload: { id: 1, title: 'Test Article' },
				collection: 'articles',
				key: '1',
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(originalPayload);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('create');

			const result = await node.webhook.call(mockWebhookFunctions);

			const outputJson = result.workflowData![0][0].json;

			// Should preserve original fields
			expect(outputJson.event).toBe('items.create');
			expect(outputJson.collection).toBe('articles');
			expect(outputJson.payload).toEqual({ id: 1, title: 'Test Article' });

			// Should add n8n-specific fields
			expect(outputJson.action).toBe('create');
			expect(outputJson.id).toBe(1);
			expect(outputJson.key).toBe('1');
			expect(outputJson.keys).toEqual(['1']);
			expect(outputJson.timestamp).toBeDefined();
			expect(typeof outputJson.timestamp).toBe('string');
		});

		it('should handle nested webhook payloads from different sources', async () => {
			const node = new DirectusTrigger();

			// Some webhook sources wrap the payload in a 'body' field
			const nestedPayload = {
				body: {
					event: 'items.update',
					payload: { id: 2, title: 'Updated Article' },
					collection: 'articles',
					key: '2',
				},
			};

			mockWebhookFunctions.getBodyData.mockReturnValue(nestedPayload);
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('update');

			const result = await node.webhook.call(mockWebhookFunctions);

			// Should extract from nested body
			expect(result.workflowData![0][0].json.event).toBe('items.update');
			expect(result.workflowData![0][0].json.collection).toBe('articles');
		});
	});

	describe('DirectusTrigger - Error Scenarios That Should Not Crash', () => {
		it('should handle completely empty webhook data', async () => {
			const node = new DirectusTrigger();

			mockWebhookFunctions.getBodyData.mockReturnValue({});
			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('create');

			const result = await node.webhook.call(mockWebhookFunctions);

			// Should not crash, should provide fallback values
			expect(result.workflowData![0][0].json.event).toBe('items.create');
			expect(result.workflowData![0][0].json.collection).toBe('unknown');
			expect(result.workflowData![0][0].json.action).toBe('create');
		});

		it('should handle webhook creation failures gracefully', async () => {
			const node = new DirectusTrigger();

			mockWebhookFunctions.getNodeParameter
				.mockReturnValueOnce('item')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('articles');
			mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				url: 'https://test.directus.app',
				token: 'test-token',
			});
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});

			// Simulate API failure
			mockWebhookFunctions.helpers.httpRequest.mockRejectedValue(new Error('Directus API Error'));

			// Should throw the error, not silently fail
			await expect(node.webhookMethods!.default!.create.call(mockWebhookFunctions)).rejects.toThrow(
				'Directus API Error',
			);
		});
	});

	describe('DirectusTrigger - Subtitle Display Logic', () => {
		it('should show correct subtitle for file resources', () => {
			const node = new DirectusTrigger();

			// The subtitle should handle file resources differently
			const subtitle = node.description.subtitle;

			// Should be a dynamic expression that handles file vs collection resources
			expect(subtitle).toContain('resource');
			expect(subtitle).toContain('file');
			expect(subtitle).toContain('collection');
		});
	});
});
