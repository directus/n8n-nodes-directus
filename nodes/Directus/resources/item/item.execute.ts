import { IExecuteFunctions, NodeOperationError, IHttpRequestOptions } from 'n8n-workflow';
import { processFieldValue } from '../../methods/fields';

export async function executeItemOperations(
	this: IExecuteFunctions,
	operation: string,
	collection: string,
	itemIndex: number,
	makeRequest: (options: IHttpRequestOptions) => Promise<unknown>,
): Promise<unknown> {
	type OperationHandler = (
		self: IExecuteFunctions,
		collection: string,
		i: number,
		makeRequest: (options: IHttpRequestOptions) => Promise<unknown>,
	) => Promise<unknown>;

	const operationMap: Record<string, OperationHandler> = {
		create: async (
			self: IExecuteFunctions,
			col: string,
			i: number,
			reqFn: (options: IHttpRequestOptions) => Promise<unknown>,
		) => {
			const collectionFields = self.getNodeParameter('collectionFields', i) as {
				fields?: { field?: Array<{ name: string; value: unknown }> };
			};

			const body: Record<string, unknown> = {};

			if (collectionFields?.fields?.field) {
				for (const field of collectionFields.fields.field) {
					if (field.name && field.value !== undefined) {
						body[field.name] = processFieldValue(field.value);
					}
				}
			}

			return await reqFn({
				method: 'POST',
				url: `/items/${col}`,
				body,
			});
		},

		createRaw: async (
			self: IExecuteFunctions,
			col: string,
			i: number,
			reqFn: (options: IHttpRequestOptions) => Promise<unknown>,
		) => {
			const jsonData = self.getNodeParameter('jsonData', i) as string;
			let body;
			try {
				body = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
			} catch {
				throw new NodeOperationError(self.getNode(), 'Invalid JSON format');
			}
			return await reqFn({
				method: 'POST',
				url: `/items/${col}`,
				body,
			});
		},

		update: async (
			self: IExecuteFunctions,
			col: string,
			i: number,
			reqFn: (options: IHttpRequestOptions) => Promise<unknown>,
		) => {
			const itemId = self.getNodeParameter('itemId', i) as string;
			const collectionFields = self.getNodeParameter('collectionFields', i) as {
				fields?: { field?: Array<{ name: string; value: unknown }> };
			};

			const body: Record<string, unknown> = {};

			// Only use fields explicitly set in the UI
			if (collectionFields?.fields?.field) {
				for (const field of collectionFields.fields.field) {
					if (field.name && field.value !== undefined) {
						body[field.name] = processFieldValue(field.value);
					}
				}
			}

			return await reqFn({
				method: 'PATCH',
				url: `/items/${col}/${itemId}`,
				body,
			});
		},

		updateRaw: async (
			self: IExecuteFunctions,
			col: string,
			i: number,
			reqFn: (options: IHttpRequestOptions) => Promise<unknown>,
		) => {
			const itemId = self.getNodeParameter('itemId', i) as string;
			const jsonData = self.getNodeParameter('jsonData', i) as string;
			let body;
			try {
				body = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
			} catch {
				throw new NodeOperationError(self.getNode(), 'Invalid JSON format');
			}
			return await reqFn({
				method: 'PATCH',
				url: `/items/${col}/${itemId}`,
				body,
			});
		},

		delete: async (
			self: IExecuteFunctions,
			col: string,
			i: number,
			reqFn: (options: IHttpRequestOptions) => Promise<unknown>,
		) => {
			const itemId = self.getNodeParameter('itemId', i) as string;
			await reqFn({
				method: 'DELETE',
				url: `/items/${col}/${itemId}`,
			});
			return { deleted: true, id: itemId };
		},

		get: async (
			self: IExecuteFunctions,
			col: string,
			i: number,
			reqFn: (options: IHttpRequestOptions) => Promise<unknown>,
		) => {
			const itemId = self.getNodeParameter('itemId', i) as string;
			return await reqFn({
				method: 'GET',
				url: `/items/${col}/${itemId}`,
			});
		},

		getAll: async (
			self: IExecuteFunctions,
			col: string,
			i: number,
			reqFn: (options: IHttpRequestOptions) => Promise<unknown>,
		) => {
			const returnAll = self.getNodeParameter('returnAll', i) as boolean;
			const limit = self.getNodeParameter('limit', i, 50) as number;
			return await reqFn({
				method: 'GET',
				url: `/items/${col}`,
				qs: returnAll ? {} : { limit },
			});
		},
	};

	const handler = operationMap[operation];
	if (!handler) {
		throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
	}

	return await handler(this, collection, itemIndex, makeRequest);
}
