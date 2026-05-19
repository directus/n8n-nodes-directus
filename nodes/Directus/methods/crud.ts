import type { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { FieldParameter } from '../types';
import { buildRequestBody } from './utils';

// Extended type to support formData for file uploads
export type MakeRequestOptions = IHttpRequestOptions & {
	formData?: Record<string, unknown>;
};

export type MakeRequestFn = (options: MakeRequestOptions) => Promise<unknown>;

function idLabelForResource(resourceName?: string): string {
	const resource = resourceName || 'item';
	if (resource === 'item') return 'Item ID';
	if (resource === 'user') return 'User ID';
	return 'File ID';
}

/** Coerce n8n parameter values (string | number | etc.) to a non-empty ID string for URL segments. */
export function normalizeRequiredId(
	context: IExecuteFunctions,
	raw: unknown,
	requiredMessage: string,
): string {
	if (raw === undefined || raw === null) {
		throw new NodeOperationError(context.getNode(), requiredMessage);
	}
	const id = String(raw).trim();
	if (id === '') {
		throw new NodeOperationError(context.getNode(), requiredMessage);
	}
	return id;
}

export async function executeGet(
	context: IExecuteFunctions,
	itemIndex: number,
	makeRequest: MakeRequestFn,
	resourcePath: string,
	idParameter: string,
	fieldsParameter?: string,
	resourceName?: string,
): Promise<unknown> {
	const rawId = context.getNodeParameter(idParameter, itemIndex);
	const label = idLabelForResource(resourceName);
	const id = normalizeRequiredId(context, rawId, `${label} is required for get operation`);

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
	resourceName?: string,
): Promise<{ deleted: true; id: string }> {
	const rawId = context.getNodeParameter(idParameter, itemIndex);
	const label = idLabelForResource(resourceName);
	const id = normalizeRequiredId(context, rawId, `${label} is required for delete operation`);
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
	resourceName?: string,
): Promise<unknown> {
	const rawId = context.getNodeParameter(idParameter, itemIndex);
	const label = idLabelForResource(resourceName);
	const id = normalizeRequiredId(context, rawId, `${label} is required for update operation`);
	const body = buildRequestBody(fieldParameter);
	return await makeRequest({
		method: 'PATCH',
		url: `${resourcePath}/${id}`,
		body,
	});
}
