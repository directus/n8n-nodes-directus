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

export async function executeFileOperations(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
	makeRequest: MakeRequestFn,
): Promise<unknown> {
	const resourcePath = '/files';

	switch (operation) {
		case 'upload': {
			// Upload a file using binary data from previous node
			const items = this.getInputData();
			const currentItem = items[itemIndex];
			const binaryData = currentItem?.binary;
			const binaryKey = Object.keys(binaryData || {})[0];
			const binaryFile = binaryKey ? binaryData?.[binaryKey] : null;

			if (!binaryFile) {
				throw new NodeOperationError(
					this.getNode(),
					'Binary data is required for file upload. Connect a node that outputs binary data before this node.',
				);
			}

			const binaryDataValidated = this.helpers.assertBinaryData(itemIndex, binaryKey);
			const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryKey);

			const filename = binaryDataValidated.fileName || binaryFile.fileName || 'file';
			const contentType =
				binaryDataValidated.mimeType || binaryFile.mimeType || 'application/octet-stream';

			return await makeRequest({
				method: 'POST',
				url: resourcePath,
				formData: {
					file: {
						value: buffer,
						options: {
							filename: filename,
							contentType: contentType,
						},
					},
					type: contentType,
					storage: 'cloud',
					filename_download: filename,
				},
			});
		}

		case 'import': {
			// Import a file from a URL
			const file = this.getNodeParameter('file', itemIndex) as string;
			if (!file || file.trim() === '') {
				throw new NodeOperationError(
					this.getNode(),
					'File URL is required for import. Provide a public URL in the File field.',
				);
			}

			const body: Record<string, unknown> = { url: file };

			return await makeRequest({
				method: 'POST',
				url: `${resourcePath}/import`,
				body,
			});
		}

		case 'update': {
			const fileFields = this.getNodeParameter('fileFields', itemIndex) as
				| FieldParameter
				| undefined;
			return executeUpdate(this, itemIndex, makeRequest, resourcePath, 'fileId', fileFields);
		}

		case 'updateRaw': {
			const fileId = this.getNodeParameter('fileId', itemIndex) as string;
			const jsonData = this.getNodeParameter('jsonData', itemIndex);
			const body = parseJsonData(this, jsonData) as Record<string, unknown>;
			return await makeRequest({
				method: 'PATCH',
				url: `${resourcePath}/${fileId}`,
				body,
			});
		}

		case 'delete':
			return executeDelete(this, itemIndex, makeRequest, resourcePath, 'fileId');

		case 'get':
			return executeGet(
				this,
				itemIndex,
				makeRequest,
				resourcePath,
				'fileId',
				'fileFieldsToReturn',
				'file',
			);

		case 'getRaw': {
			const fileId = this.getNodeParameter('fileId', itemIndex) as string;
			if (!fileId || fileId.trim() === '') {
				throw new NodeOperationError(this.getNode(), 'File ID is required for getRaw operation');
			}
			const queryParamsJson = this.getNodeParameter('queryParameters', itemIndex) as string;
			let queryParams: IDataObject = {};
			if (queryParamsJson) {
				queryParams = parseJsonData(this, queryParamsJson) as IDataObject;
			}
			return await makeRequest({
				method: 'GET',
				url: `${resourcePath}/${fileId}`,
				qs: queryParams,
			});
		}

		case 'getAll':
			return executeGetAll(this, itemIndex, makeRequest, resourcePath, 'fileFieldsToReturn');

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
