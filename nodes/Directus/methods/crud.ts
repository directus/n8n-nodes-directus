import type { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { FieldParameter } from '../types';
import { buildRequestBody } from './utils';

export type MakeRequestFn = (options: IHttpRequestOptions) => Promise<unknown>;

export async function executeGet(
	context: IExecuteFunctions,
	itemIndex: number,
	makeRequest: MakeRequestFn,
	resourcePath: string,
	idParameter: string,
	fieldsParameter?: string,
	resourceName?: string,
): Promise<unknown> {
	const id = context.getNodeParameter(idParameter, itemIndex) as string;
	if (!id || id.trim() === '') {
		const resource = resourceName || 'item';
		const idLabel = resource === 'item' ? 'Item ID' : resource === 'user' ? 'User ID' : 'File ID';
		throw new NodeOperationError(context.getNode(), `${idLabel} is required for get operation`);
	}

	const fields = fieldsParameter
		? (context.getNodeParameter(fieldsParameter, itemIndex) as string[] | undefined)
		: undefined;

	const queryParams: Record<string, string> = {};
	if (fields && fields.length > 0) {
		queryParams.fields = fields.join(',');
	}

	return await makeRequest({
		method: 'GET',
		url: `${resourcePath}/${id}`,
		qs: Object.keys(queryParams).length > 0 ? queryParams : undefined,
	});
}

export async function executeGetAll(
	context: IExecuteFunctions,
	itemIndex: number,
	makeRequest: MakeRequestFn,
	resourcePath: string,
	fieldsParameter?: string,
): Promise<unknown> {
	const returnAll = context.getNodeParameter('returnAll', itemIndex) as boolean;
	const limit = context.getNodeParameter('limit', itemIndex, 50) as number;
	const fields = fieldsParameter
		? (context.getNodeParameter(fieldsParameter, itemIndex) as string[] | undefined)
		: undefined;

	const queryParams: Record<string, string | number> = {};
	if (!returnAll) {
		queryParams.limit = limit;
	}
	if (fields && fields.length > 0) {
		queryParams.fields = fields.join(',');
	}

	return await makeRequest({
		method: 'GET',
		url: resourcePath,
		qs: Object.keys(queryParams).length > 0 ? queryParams : undefined,
	});
}

export async function executeDelete(
	context: IExecuteFunctions,
	itemIndex: number,
	makeRequest: MakeRequestFn,
	resourcePath: string,
	idParameter: string,
): Promise<{ deleted: true; id: string }> {
	const id = context.getNodeParameter(idParameter, itemIndex) as string;
	await makeRequest({
		method: 'DELETE',
		url: `${resourcePath}/${id}`,
	});
	return { deleted: true, id };
}

export async function executeCreate(
	context: IExecuteFunctions,
	itemIndex: number,
	makeRequest: MakeRequestFn,
	resourcePath: string,
	fieldParameter: FieldParameter | undefined,
): Promise<unknown> {
	const body = buildRequestBody(fieldParameter);
	return await makeRequest({
		method: 'POST',
		url: resourcePath,
		body,
	});
}

export async function executeUpdate(
	context: IExecuteFunctions,
	itemIndex: number,
	makeRequest: MakeRequestFn,
	resourcePath: string,
	idParameter: string,
	fieldParameter: FieldParameter | undefined,
): Promise<unknown> {
	const id = context.getNodeParameter(idParameter, itemIndex) as string;
	const body = buildRequestBody(fieldParameter);
	return await makeRequest({
		method: 'PATCH',
		url: `${resourcePath}/${id}`,
		body,
	});
}
