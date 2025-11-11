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
		throw formatDirectusError(error);
	}
}

/**
 * Formats Directus API errors into user-friendly messages
 */
export function formatDirectusError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}

	if (typeof error === 'object' && error !== null) {
		const httpError = error as DirectusHttpError;
		const statusCode =
			httpError.statusCode ||
			httpError.status ||
			httpError.response?.statusCode ||
			httpError.response?.status;

		if (statusCode === 403) {
			return new Error('Permission error: Token does not have access to this resource.');
		}

		const responseData = httpError.response?.data || httpError.response?.body;

		if (responseData) {
			let parsedData = responseData;
			if (typeof responseData === 'string') {
				try {
					parsedData = JSON.parse(responseData);
				} catch {
					return new Error(`Request failed with status code ${statusCode || 400}: ${responseData}`);
				}
			}

			if (
				typeof parsedData === 'object' &&
				parsedData !== null &&
				'errors' in parsedData &&
				Array.isArray((parsedData as { errors?: unknown[] }).errors) &&
				(parsedData as { errors: Array<{ message?: string }> }).errors.length > 0
			) {
				const messages = (parsedData as { errors: Array<{ message?: string }> }).errors
					.map((x) => x.message || String(x))
					.join(', ');
				return new Error(`Request failed with status code ${statusCode || 400}: ${messages}`);
			}

			if (
				typeof parsedData === 'object' &&
				parsedData !== null &&
				'message' in parsedData &&
				typeof (parsedData as { message?: unknown }).message === 'string'
			) {
				return new Error(
					`Request failed with status code ${statusCode || 400}: ${(parsedData as { message: string }).message}`,
				);
			}
		}

		if (statusCode) {
			return new Error(
				`Request failed with status code ${statusCode}: ${httpError.message || httpError.response?.statusMessage || 'Unknown error'}`,
			);
		}

		if (httpError.message) {
			return new Error(httpError.message);
		}
	}

	return new Error(String(error) || 'An unknown error occurred');
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
