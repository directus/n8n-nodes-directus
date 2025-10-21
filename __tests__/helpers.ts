import { jest } from '@jest/globals';

export function createMockExecuteFunctions(
	options: {
		nodeParameters: any;
		credentials?: any;
		inputData?: any[];
	} = { nodeParameters: {} },
): any {
	return {
		getNodeParameter: jest.fn((parameter: string, index: number) => {
			return options.nodeParameters[parameter];
		}),
		getCurrentNodeParameter: jest.fn((parameter: string) => {
			return options.nodeParameters[parameter];
		}),
		getCredentials: jest.fn<any>().mockResolvedValue(options.credentials || {}),
		getInputData: jest.fn(() => {
			return options.inputData || [{ json: {} }];
		}),
		helpers: {
			request: jest.fn<any>().mockResolvedValue({ data: { data: [] } }),
			httpRequest: jest.fn<any>().mockResolvedValue({
				data: {
					data: [{ id: 1, name: 'Test User' }],
					id: 'flow-id-123',
				},
			}),
			requestWithAuthentication: jest.fn<any>().mockResolvedValue({ data: { data: [] } }),
		},
		continueOnFail: jest.fn(() => false),
		getNode: jest.fn(() => ({
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
		getNodeParameter: jest.fn((parameter: string, index: number) => {
			return options.nodeParameters[parameter];
		}),
		getBodyData: jest.fn(() => {
			return options.bodyData;
		}),
		getHeaderData: jest.fn(() => {
			return options.headerData || {};
		}),
		getNodeWebhookUrl: jest.fn(() => {
			return 'https://webhook.url';
		}),
		helpers: {
			request: jest.fn<any>().mockResolvedValue({ data: { data: [] } }),
			httpRequest: jest.fn<any>().mockResolvedValue({
				data: {
					data: [{ id: 1, name: 'Test User' }],
					id: 'flow-id-123',
				},
			}),
		},
		getCredentials: jest.fn<any>().mockResolvedValue({}),
		getWorkflowStaticData: jest.fn(() => ({ flowId: undefined })),
		getNode: jest.fn(() => ({
			id: 'test-node-id',
			name: 'Directus Trigger',
			type: 'directusTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: options.nodeParameters,
		})),
	};
}
