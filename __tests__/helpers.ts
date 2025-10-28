import { vi } from 'vitest';

export function createMockExecuteFunctions(
	options: {
		nodeParameters: any;
		credentials?: any;
		inputData?: any[];
	} = { nodeParameters: {} },
): any {
	return {
		getNodeParameter: vi.fn((parameter: string, index: number) => {
			return options.nodeParameters[parameter];
		}),
		getCurrentNodeParameter: vi.fn((parameter: string) => {
			return options.nodeParameters[parameter];
		}),
		getCredentials: vi.fn<any>().mockResolvedValue(options.credentials || {}),
		getInputData: vi.fn(() => {
			return options.inputData || [{ json: {} }];
		}),
		helpers: {
			request: vi.fn<any>().mockResolvedValue({ data: { data: [] } }),
			httpRequest: vi.fn<any>().mockResolvedValue({
				data: {
					data: [{ id: 1, name: 'Test User' }],
					id: 'flow-id-123',
				},
			}),
			requestWithAuthentication: vi.fn<any>().mockResolvedValue({ data: { data: [] } }),
		},
		continueOnFail: vi.fn(() => false),
		getNode: vi.fn(() => ({
			id: 'test-node-id',
			name: 'Directus',
			type: 'directus',
			typeVersion: 1,
			position: [0, 0],
			parameters: options.nodeParameters,
		})),
	};
}

export function createMockWebhookFunctions(
	options: {
		nodeParameters: any;
		bodyData?: any;
		headerData?: any;
	} = { nodeParameters: {} },
): any {
	return {
		getNodeParameter: vi.fn((parameter: string, index: number) => {
			return options.nodeParameters[parameter];
		}),
		getBodyData: vi.fn(() => {
			return options.bodyData;
		}),
		getHeaderData: vi.fn(() => {
			return options.headerData || {};
		}),
		getNodeWebhookUrl: vi.fn(() => {
			return 'https://webhook.url';
		}),
		helpers: {
			request: vi.fn<any>().mockResolvedValue({ data: { data: [] } }),
			httpRequest: vi.fn<any>().mockResolvedValue({
				data: {
					data: [{ id: 1, name: 'Test User' }],
					id: 'flow-id-123',
				},
			}),
		},
		getCredentials: vi.fn<any>().mockResolvedValue({}),
		getWorkflowStaticData: vi.fn(() => ({ flowId: undefined })),
		getNode: vi.fn(() => ({
			id: 'test-node-id',
			name: 'Directus Trigger',
			type: 'directusTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: options.nodeParameters,
		})),
	};
}
