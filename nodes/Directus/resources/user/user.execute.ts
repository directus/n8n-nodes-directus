import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import {
	executeUpdate,
	executeDelete,
	executeGet,
	executeGetAll,
	type MakeRequestFn,
} from '../../methods/crud';
import type { FieldParameter } from '../../types';

export async function executeUserOperations(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
	makeRequest: MakeRequestFn,
): Promise<unknown> {
	const resourcePath = '/users';

	switch (operation) {
		case 'invite': {
			const email = this.getNodeParameter('email', itemIndex) as string;
			const role = this.getNodeParameter('role', itemIndex) as string;
			const invite_url = this.getNodeParameter('invite_url', itemIndex) as string;

			if (!email) {
				throw new NodeOperationError(this.getNode(), 'Email is required for user invitation');
			}

			const body: Record<string, unknown> = { email };
			if (role) body.role = role;
			if (invite_url) body.invite_url = invite_url;

			const responseData = await makeRequest({
				method: 'POST',
				url: `${resourcePath}/invite`,
				body,
			});

			return {
				success: true,
				message: 'User invitation sent successfully',
				email,
				status: 'invited',
				...(responseData as Record<string, unknown>),
			};
		}

		case 'update': {
			const userFields = this.getNodeParameter('userFields', itemIndex) as
				| FieldParameter
				| undefined;
			return executeUpdate(this, itemIndex, makeRequest, resourcePath, 'userId', userFields);
		}

		case 'delete':
			return executeDelete(this, itemIndex, makeRequest, resourcePath, 'userId');

		case 'get':
			return executeGet(this, itemIndex, makeRequest, resourcePath, 'userId');

		case 'getAll':
			return executeGetAll(this, itemIndex, makeRequest, resourcePath);

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
	}
}
