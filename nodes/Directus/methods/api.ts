import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type {
	DirectusCredentials,
	DirectusRelation,
	DirectusCollection,
	DirectusField,
	DirectusRole,
	DirectusApiResponse,
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
		// Check for HTTP errors
		const httpError = error as DirectusHttpError;
		const statusCode = httpError.statusCode || httpError.response?.statusCode;
		const errorMessage =
			httpError.message || (error instanceof Error ? error.message : String(error));

		// Check status code from property or message
		const detectedStatus =
			statusCode ||
			(errorMessage.includes('status code 403')
				? 403
				: errorMessage.includes('status code 404')
					? 404
					: undefined);

		if (detectedStatus === 403) {
			throw new Error('Permission error: Token does not have access to this resource.');
		}

		if (detectedStatus === 404) {
			throw new Error(`Endpoint not found: ${endpoint}`);
		}

		// Format and throw all errors consistently
		throw formatDirectusError(error);
	}
}

/**
 * Formats Directus API errors into user-friendly messages
 * This is the single source of truth for error formatting
 */
export function formatDirectusError(error: unknown): Error {
	// api.ts throws Error instances, so most errors will already be formatted
	if (error instanceof Error) {
		return error;
	}

	// Handle HTTP error objects
	if (typeof error === 'object' && error !== null) {
		const httpError = error as DirectusHttpError;

		// Check for 403 permission errors
		const statusCode = httpError.statusCode || httpError.response?.statusCode;
		if (statusCode === 403) {
			return new Error('Permission error: Token does not have access to this resource.');
		}

		// Extract error messages from response
		if (httpError.response?.data?.errors?.length) {
			const messages = httpError.response.data.errors.map((x) => x.message || String(x)).join(', ');
			return new Error(messages);
		}
		if (httpError.response?.data?.message) {
			return new Error(httpError.response.data.message);
		}
		if (httpError.message) {
			return new Error(httpError.message);
		}
		if (httpError.errors?.length) {
			const messages = httpError.errors.map((x) => x.message || String(x)).join(', ');
			return new Error(messages);
		}
	}

	return new Error(String(error) || 'An unknown error occurred');
}

export async function getCollectionsFromAPI(
	functions: ILoadOptionsFunctions,
): Promise<DirectusCollection[]> {
	return fetchFromDirectus<DirectusCollection>(functions, 'collections');
}

export async function getFieldsFromAPI(
	functions: ILoadOptionsFunctions,
	collection: string,
): Promise<DirectusField[]> {
	return fetchFromDirectus<DirectusField>(functions, `fields/${collection}`);
}

export async function getRolesFromAPI(functions: ILoadOptionsFunctions): Promise<DirectusRole[]> {
	return fetchFromDirectus<DirectusRole>(functions, 'roles');
}

export async function getRelationsFromAPI(
	functions: ILoadOptionsFunctions,
): Promise<DirectusRelation[]> {
	return fetchFromDirectus<DirectusRelation>(functions, 'relations', true);
}
