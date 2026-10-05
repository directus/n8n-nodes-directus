import {
	NodeApiError,
	NodeOperationError,
	type ILoadOptionsFunctions,
	type INode,
	type JsonObject,
} from 'n8n-workflow';
import type {
	DirectusCredentials,
	DirectusRelation,
	DirectusCollection,
	DirectusField,
	DirectusRole,
	DirectusApiResponse,
	DirectusErrorBody,
	DirectusHttpError,
} from '../types';
import { createAuthenticatedRequest } from './request';

async function fetchFromDirectus<T>(
	functions: ILoadOptionsFunctions,
	endpoint: string,
	allowEmptyResponse = false,
): Promise<T[]> {
	const credentials = (await functions.getCredentials('directusApi')) as DirectusCredentials;
	const getRequestOptions = createAuthenticatedRequest(credentials);

	try {
		const response = await functions.helpers.httpRequest(
			getRequestOptions({
				method: 'GET',
				url: `/${endpoint}`,
			}),
		);

		const parsed: DirectusApiResponse<T> =
			typeof response === 'string' ? JSON.parse(response) : response;

		if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) {
			throw new Error('Invalid response format from Directus API');
		}

		const responseData = parsed.data;

		if (!Array.isArray(responseData)) {
			if (allowEmptyResponse) {
				return [];
			}
			throw new Error(
				`Expected array, got ${typeof responseData}. Response: ${JSON.stringify(responseData)}`,
			);
		}

		return responseData;
	} catch (error) {
		throw toNodeError(functions.getNode(), error);
	}
}

function getResponseBody(error: DirectusHttpError): unknown {
	// httpRequest (axios) keeps the body on response.data; the legacy helpers.request puts it on error.error
	const body = error.response?.data ?? error.error;
	if (typeof body !== 'string') {
		return body;
	}
	try {
		return JSON.parse(body);
	} catch {
		return body;
	}
}

type DirectusErrorSummary = {
	message?: string;
	code?: string;
	errors?: DirectusErrorBody['errors'];
};

function summarizeDirectusBody(body: unknown): DirectusErrorSummary {
	const errors = Array.isArray((body as DirectusErrorBody | undefined)?.errors)
		? (body as Required<DirectusErrorBody>).errors
		: [];
	const messages = errors.map((entry) => entry?.message).filter(isNonEmptyString);
	const codes = [
		...new Set(errors.map((entry) => entry?.extensions?.code).filter(isNonEmptyString)),
	];

	return {
		message: messages.length > 0 ? messages.join('; ') : undefined,
		code: codes.length > 0 ? codes.join(', ') : undefined,
		errors: errors.length > 0 ? errors : undefined,
	};
}

/**
 * Pulls the human-readable messages, error codes, and raw error entries out of a Directus
 * `{ errors: [...] }` body
 */
export function readDirectusErrors(error: unknown): DirectusErrorSummary {
	if (typeof error !== 'object' || error === null) {
		return {};
	}
	if (error instanceof NodeApiError) {
		return summarizeDirectusBody(error.context.data);
	}
	return summarizeDirectusBody(getResponseBody(error as DirectusHttpError));
}

// NodeApiError swaps messages mentioning codes like ECONNREFUSED for generic text, so set them after construction
function applyDirectusSummary(apiError: NodeApiError, { message, code }: DirectusErrorSummary) {
	if (message) {
		apiError.message = message;
	}
	if (code) {
		apiError.description = `Directus error code: ${code}`;
	}
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim() !== '';
}

function isHttpError(error: unknown): error is DirectusHttpError {
	if (typeof error !== 'object' || error === null) {
		return false;
	}
	const httpError = error as DirectusHttpError;
	return (
		httpError.isAxiosError === true ||
		(typeof httpError.response === 'object' && httpError.response !== null) ||
		typeof httpError.statusCode === 'number'
	);
}

/**
 * Converts anything thrown while talking to Directus into an n8n error, using the Directus
 * error message when the response has one
 */
export function toNodeError(
	node: INode,
	error: unknown,
	itemIndex?: number,
): NodeApiError | NodeOperationError {
	if (error instanceof NodeApiError || error instanceof NodeOperationError) {
		if (itemIndex !== undefined && error.context.itemIndex === undefined) {
			error.context.itemIndex = itemIndex;
		}
		// httpRequestWithAuthentication already wraps failures in a NodeApiError with n8n's generic text
		if (error instanceof NodeApiError) {
			applyDirectusSummary(error, readDirectusErrors(error));
		}
		return error;
	}

	if (isHttpError(error)) {
		const summary = readDirectusErrors(error);
		const apiError = new NodeApiError(node, error as unknown as JsonObject, { itemIndex });
		applyDirectusSummary(apiError, summary);

		// NodeApiError only keeps object bodies found on response.data, which misses legacy uploads and string bodies
		const body = getResponseBody(error);
		if (apiError.context.data === undefined && typeof body === 'object' && body !== null) {
			apiError.context.data = body as JsonObject;
		}

		return apiError;
	}

	return new NodeOperationError(node, error instanceof Error ? error : String(error), {
		itemIndex,
	});
}

// API fetch functions - thin wrappers around fetchFromDirectus for type safety and clarity
export const getCollectionsFromAPI = (functions: ILoadOptionsFunctions) =>
	fetchFromDirectus<DirectusCollection>(functions, 'collections');

export const getFieldsFromAPI = (functions: ILoadOptionsFunctions, collection: string) =>
	fetchFromDirectus<DirectusField>(functions, `fields/${collection}`);

export const getRolesFromAPI = (functions: ILoadOptionsFunctions) =>
	fetchFromDirectus<DirectusRole>(functions, 'roles');

export const getRelationsFromAPI = (functions: ILoadOptionsFunctions) =>
	fetchFromDirectus<DirectusRelation>(functions, 'relations', true);
