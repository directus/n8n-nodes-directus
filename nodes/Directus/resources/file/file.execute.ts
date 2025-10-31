import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import {
	executeUpdate,
	executeDelete,
	executeGet,
	executeGetAll,
	type MakeRequestFn,
} from '../../methods/crud';
import type { FieldParameter } from '../../types';

export async function executeFileOperations(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
	makeRequest: MakeRequestFn,
): Promise<unknown> {
	const resourcePath = '/files';

	switch (operation) {
		case 'upload': {
			const file = this.getNodeParameter('file', itemIndex) as string;
			const title = this.getNodeParameter('title', itemIndex) as string;
			const description = this.getNodeParameter('description', itemIndex) as string;
			const folder = this.getNodeParameter('folder', itemIndex) as string;

			if (!file) {
				throw new NodeOperationError(this.getNode(), 'File is required for upload');
			}

			const body: Record<string, unknown> = { file };
			if (title) body.title = title;
			if (description) body.description = description;
			if (folder) body.folder = folder;

			return await makeRequest({
				method: 'POST',
				url: resourcePath,
				body,
			});
		}

		case 'update': {
			const fileFields = this.getNodeParameter('fileFields', itemIndex) as
				| FieldParameter
				| undefined;
			return executeUpdate(this, itemIndex, makeRequest, resourcePath, 'fileId', fileFields);
		}

		case 'delete':
			return executeDelete(this, itemIndex, makeRequest, resourcePath, 'fileId');

		case 'get':
			return executeGet(this, itemIndex, makeRequest, resourcePath, 'fileId');

		case 'getAll':
			return executeGetAll(this, itemIndex, makeRequest, resourcePath);

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
	}
}
