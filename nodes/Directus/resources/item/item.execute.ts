import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import {
	executeCreate,
	executeUpdate,
	executeDelete,
	executeGet,
	executeGetAll,
	type MakeRequestFn,
} from '../../methods/crud';
import type { FieldParameter } from '../../types';

function parseJsonData(context: IExecuteFunctions, jsonData: string | unknown): unknown {
	if (typeof jsonData === 'string') {
		try {
			return JSON.parse(jsonData);
		} catch {
			throw new NodeOperationError(context.getNode(), 'Invalid JSON format');
		}
	}
	return jsonData;
}

export async function executeItemOperations(
	this: IExecuteFunctions,
	operation: string,
	collection: string,
	itemIndex: number,
	makeRequest: MakeRequestFn,
): Promise<unknown> {
	const resourcePath = `/items/${collection}`;

	switch (operation) {
		case 'create': {
			const collectionFields = this.getNodeParameter('collectionFields', itemIndex) as
				| FieldParameter
				| undefined;
			return executeCreate(this, itemIndex, makeRequest, resourcePath, collectionFields);
		}

		case 'createRaw': {
			const jsonData = this.getNodeParameter('jsonData', itemIndex);
			const body = parseJsonData(this, jsonData) as Record<string, unknown>;
			return await makeRequest({
				method: 'POST',
				url: resourcePath,
				body,
			});
		}

		case 'update': {
			const collectionFields = this.getNodeParameter('collectionFields', itemIndex) as
				| FieldParameter
				| undefined;
			return executeUpdate(this, itemIndex, makeRequest, resourcePath, 'itemId', collectionFields);
		}

		case 'updateRaw': {
			const itemId = this.getNodeParameter('itemId', itemIndex) as string;
			const jsonData = this.getNodeParameter('jsonData', itemIndex);
			const body = parseJsonData(this, jsonData) as Record<string, unknown>;
			return await makeRequest({
				method: 'PATCH',
				url: `${resourcePath}/${itemId}`,
				body,
			});
		}

		case 'delete':
			return executeDelete(this, itemIndex, makeRequest, resourcePath, 'itemId');

		case 'get':
			return executeGet(this, itemIndex, makeRequest, resourcePath, 'itemId');

		case 'getAll':
			return executeGetAll(this, itemIndex, makeRequest, resourcePath);

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
	}
}
