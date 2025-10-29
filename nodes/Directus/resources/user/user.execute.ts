import { IExecuteFunctions, NodeOperationError, IHttpRequestOptions } from 'n8n-workflow';
import { processFieldValue } from '../../methods/fields';

export async function executeUserOperations(
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
		invite: async (
			self: IExecuteFunctions,
			i: number,
			reqFn: (options: IHttpRequestOptions) => Promise<unknown>,
		) => {
			const email = self.getNodeParameter('email', i) as string;
			const role = self.getNodeParameter('role', i) as string;
			const invite_url = self.getNodeParameter('invite_url', i) as string;

			if (!email) {
				throw new NodeOperationError(self.getNode(), 'Email is required for user invitation');
			}

			const body: Record<string, unknown> = { email };
			if (role) body.role = role;
			if (invite_url) body.invite_url = invite_url;

			const responseData = await reqFn({
				method: 'POST',
				url: '/users/invite',
				body,
			});

			return {
				success: true,
				message: 'User invitation sent successfully',
				email,
				status: 'invited',
				...(responseData as Record<string, unknown>),
			};
		},

		update: async (
			self: IExecuteFunctions,
			i: number,
			reqFn: (options: IHttpRequestOptions) => Promise<unknown>,
		) => {
			const userId = self.getNodeParameter('userId', i) as string;
			const userFields = self.getNodeParameter('userFields', i) as {
				fields?: { field?: Array<{ name: string; value: unknown }> };
			};

			const body: Record<string, unknown> = {};

			if (userFields?.fields?.field) {
				for (const field of userFields.fields.field) {
					if (field.name && field.value !== undefined) {
						body[field.name] = processFieldValue(field.value);
					}
				}
			}

			return await reqFn({
				method: 'PATCH',
				url: `/users/${userId}`,
				body,
			});
		},

		delete: async (
			self: IExecuteFunctions,
			i: number,
			reqFn: (options: IHttpRequestOptions) => Promise<unknown>,
		) => {
			const userId = self.getNodeParameter('userId', i) as string;
			await reqFn({
				method: 'DELETE',
				url: `/users/${userId}`,
			});
			return { deleted: true, id: userId };
		},

		get: async (
			self: IExecuteFunctions,
			i: number,
			reqFn: (options: IHttpRequestOptions) => Promise<unknown>,
		) => {
			const userId = self.getNodeParameter('userId', i) as string;
			return await reqFn({
				method: 'GET',
				url: `/users/${userId}`,
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
				url: '/users',
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
