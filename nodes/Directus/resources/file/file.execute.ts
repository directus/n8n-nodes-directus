import { IExecuteFunctions, NodeOperationError, IHttpRequestOptions } from 'n8n-workflow';
import { processFieldValue } from '../../methods/fields';

export async function executeFileOperations(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
	makeRequest: (options: IHttpRequestOptions) => Promise<unknown>,
): Promise<unknown> {
	type OperationHandler = (
		self: IExecuteFunctions,
		i: number,
		makeRequest: (options: IHttpRequestOptions) => Promise<unknown>,
	) => Promise<unknown>;

	const operationMap: Record<string, OperationHandler> = {
		upload: async (
			self: IExecuteFunctions,
			i: number,
			reqFn: (options: IHttpRequestOptions) => Promise<unknown>,
		) => {
			const file = self.getNodeParameter('file', i) as string;
			const title = self.getNodeParameter('title', i) as string;
			const description = self.getNodeParameter('description', i) as string;
			const folder = self.getNodeParameter('folder', i) as string;

			if (!file) {
				throw new NodeOperationError(self.getNode(), 'File is required for upload');
			}

			const body: Record<string, unknown> = { file };
			if (title) body.title = title;
			if (description) body.description = description;
			if (folder) body.folder = folder;

			return await reqFn({
				method: 'POST',
				url: '/files',
				body,
			});
		},

		update: async (
			self: IExecuteFunctions,
			i: number,
			reqFn: (options: IHttpRequestOptions) => Promise<unknown>,
		) => {
			const fileId = self.getNodeParameter('fileId', i) as string;
			const fileFields = self.getNodeParameter('fileFields', i) as {
				fields?: { field?: Array<{ name: string; value: unknown }> };
			};

			const body: Record<string, unknown> = {};

			if (fileFields?.fields?.field) {
				for (const field of fileFields.fields.field) {
					if (field.name && field.value !== undefined) {
						body[field.name] = processFieldValue(field.value);
					}
				}
			}

			return await reqFn({
				method: 'PATCH',
				url: `/files/${fileId}`,
				body,
			});
		},

		delete: async (
			self: IExecuteFunctions,
			i: number,
			reqFn: (options: IHttpRequestOptions) => Promise<unknown>,
		) => {
			const fileId = self.getNodeParameter('fileId', i) as string;
			await reqFn({
				method: 'DELETE',
				url: `/files/${fileId}`,
			});
			return { deleted: true, id: fileId };
		},

		get: async (
			self: IExecuteFunctions,
			i: number,
			reqFn: (options: IHttpRequestOptions) => Promise<unknown>,
		) => {
			const fileId = self.getNodeParameter('fileId', i) as string;
			return await reqFn({
				method: 'GET',
				url: `/files/${fileId}`,
			});
		},

		getAll: async (
			self: IExecuteFunctions,
			i: number,
			reqFn: (options: IHttpRequestOptions) => Promise<unknown>,
		) => {
			const returnAll = self.getNodeParameter('returnAll', i) as boolean;
			const limit = self.getNodeParameter('limit', i, 50) as number;
			return await reqFn({
				method: 'GET',
				url: '/files',
				qs: returnAll ? {} : { limit },
			});
		},
	};

	const handler = operationMap[operation];
	if (!handler) {
		throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
	}

	return await handler(this, itemIndex, makeRequest);
}
