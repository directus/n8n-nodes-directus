import type { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { FieldParameter } from '../types';
import { buildRequestBody } from './utils';

// Extended type to support formData for file uploads
export type MakeRequestOptions = IHttpRequestOptions & {
	formData?: Record<string, unknown>;
};

export type MakeRequestFn = (options: MakeRequestOptions) => Promise<unknown>;

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

const RETURN_ALL_MAX_PAGES = 10_000;

function unwrapListPayload(response: unknown): unknown[] | null {
	const payload =
		response !== null &&
		typeof response === 'object' &&
		'data' in response &&
		(response as { data?: unknown }).data !== undefined
			? (response as { data: unknown }).data
			: response;
	return Array.isArray(payload) ? payload : null;
}

function listQueryParams(
	fields: string[] | undefined,
	extra: Record<string, string | number> = {},
): Record<string, string | number> | undefined {
	const queryParams: Record<string, string | number> = { ...extra };
	if (fields && fields.length > 0) {
		queryParams.fields = fields.join(',');
	}
	return Object.keys(queryParams).length > 0 ? queryParams : undefined;
}

/**
 * Fetch every page with offset pagination.
 * Does not send `limit` (Directus applies min(QUERY_LIMIT_DEFAULT, QUERY_LIMIT_MAX))
 * or `limit=-1` (unbounded when max is unset). Offset advances by the number of
 * rows actually returned, so a lower QUERY_LIMIT_MAX cannot skip items.
 */
async function fetchAllPages(
	context: IExecuteFunctions,
	makeRequest: MakeRequestFn,
	resourcePath: string,
	fields: string[] | undefined,
): Promise<{ data: unknown[] }> {
	const allItems: unknown[] = [];
	let offset = 0;
	let expectedTotal: number | undefined;

	for (let page = 0; page < RETURN_ALL_MAX_PAGES; page++) {
		const response = await makeRequest({
			method: 'GET',
			url: resourcePath,
			qs: listQueryParams(fields, {
				offset,
				meta: 'filter_count',
			}),
		});
		const items = unwrapListPayload(response);

		if (!items || items.length === 0) {
			return { data: allItems };
		}

		allItems.push(...items);

		if (expectedTotal === undefined) {
			const filterCount = (response as { meta?: { filter_count?: unknown } })?.meta?.filter_count;
			if (typeof filterCount === 'number') {
				expectedTotal = filterCount;
			}
		}

		if (expectedTotal !== undefined && allItems.length >= expectedTotal) {
			return { data: allItems };
		}

		offset += items.length;
	}

	throw new NodeOperationError(
		context.getNode(),
		`Return All stopped after ${RETURN_ALL_MAX_PAGES} pages. Narrow the query or paginate with Get Many (Raw JSON).`,
	);
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

	if (returnAll) {
		return await fetchAllPages(context, makeRequest, resourcePath, fields);
	}

	return await makeRequest({
		method: 'GET',
		url: resourcePath,
		qs: listQueryParams(fields, { limit }),
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
