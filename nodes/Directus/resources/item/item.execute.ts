import { IExecuteFunctions, NodeOperationError, IDataObject } from 'n8n-workflow';
import {
	executeCreate,
	executeUpdate,
	executeDelete,
	executeGet,
	executeGetAll,
	normalizeRequiredId,
	type MakeRequestFn,
} from '../../methods/crud';
import type { FieldParameter } from '../../types';
import { parseJsonData } from '../../methods/utils';

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
			return executeUpdate(
				this,
				itemIndex,
				makeRequest,
				resourcePath,
				'itemId',
				collectionFields,
				'item',
			);
		}

		case 'updateRaw': {
			const itemId = normalizeRequiredId(
				this,
				this.getNodeParameter('itemId', itemIndex),
				'Item ID is required for updateRaw operation',
			);
			const jsonData = this.getNodeParameter('jsonData', itemIndex);
			const body = parseJsonData(this, jsonData) as Record<string, unknown>;
			return await makeRequest({
				method: 'PATCH',
				url: `${resourcePath}/${itemId}`,
				body,
			});
		}

		case 'delete':
			return executeDelete(this, itemIndex, makeRequest, resourcePath, 'itemId', 'item');

		case 'get':
			return executeGet(this, itemIndex, makeRequest, resourcePath, 'itemId', 'itemFields', 'item');

		case 'getRaw': {
			const itemId = normalizeRequiredId(
				this,
				this.getNodeParameter('itemId', itemIndex),
				'Item ID is required for getRaw operation',
			);
			const queryParamsJson = this.getNodeParameter('queryParameters', itemIndex) as string;
			let queryParams: IDataObject = {};
			if (queryParamsJson) {
				queryParams = parseJsonData(this, queryParamsJson) as IDataObject;
			}
			return await makeRequest({
				method: 'GET',
				url: `${resourcePath}/${itemId}`,
				qs: queryParams,
			});
		}

		case 'getAll':
			return executeGetAll(this, itemIndex, makeRequest, resourcePath, 'itemFields');

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
