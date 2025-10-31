import { IExecuteFunctions, NodeOperationError, IDataObject } from 'n8n-workflow';
import {
	executeUpdate,
	executeDelete,
	executeGet,
	executeGetAll,
	type MakeRequestFn,
} from '../../methods/crud';
import type { FieldParameter } from '../../types';
import { parseJsonData } from '../../methods/utils';

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

		case 'updateRaw': {
			const userId = this.getNodeParameter('userId', itemIndex) as string;
			const jsonData = this.getNodeParameter('jsonData', itemIndex);
			const body = parseJsonData(this, jsonData) as Record<string, unknown>;
			return await makeRequest({
				method: 'PATCH',
				url: `${resourcePath}/${userId}`,
				body,
			});
		}

		case 'delete':
			return executeDelete(this, itemIndex, makeRequest, resourcePath, 'userId');

		case 'get':
			return executeGet(
				this,
				itemIndex,
				makeRequest,
				resourcePath,
				'userId',
				'userFieldsToReturn',
				'user',
			);

		case 'getRaw': {
			const userId = this.getNodeParameter('userId', itemIndex) as string;
			if (!userId || userId.trim() === '') {
				throw new NodeOperationError(this.getNode(), 'User ID is required for getRaw operation');
			}
			const queryParamsJson = this.getNodeParameter('queryParameters', itemIndex) as string;
			let queryParams: IDataObject = {};
			if (queryParamsJson) {
				queryParams = parseJsonData(this, queryParamsJson) as IDataObject;
			}
			return await makeRequest({
				method: 'GET',
				url: `${resourcePath}/${userId}`,
				qs: queryParams,
			});
		}

		case 'getAll':
			return executeGetAll(this, itemIndex, makeRequest, resourcePath, 'userFieldsToReturn');

		case 'getAllRaw': {
			const queryParamsJson = this.getNodeParameter('queryParameters', itemIndex) as string;
			let queryParams: IDataObject = {};
			if (queryParamsJson) {
				queryParams = parseJsonData(this, queryParamsJson) as IDataObject;
			}
			return await makeRequest({
				method: 'GET',
				url: resourcePath,
				qs: queryParams,
			});
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
	}
}
