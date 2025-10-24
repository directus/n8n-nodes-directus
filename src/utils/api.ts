import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { API_URL_VARIANTS } from './constants';

export interface DirectusCredentials {
	url: string;
	token: string;
	environment: string;
}

/**
 * Normalizes a Directus URL by removing trailing slashes
 */
export function normalizeUrl(url: string): string {
	return url.replace(/\/+$/, '');
}

/**
 * Makes an authenticated request to Directus API with URL variant fallback
 */
export async function makeDirectusRequest(
	functions: ILoadOptionsFunctions,
	urlVariants: string[],
	options: {
		method?: string;
		body?: unknown;
		headers?: Record<string, string>;
	} = {},
): Promise<unknown> {
	const credentials = await functions.getCredentials<DirectusCredentials>('directusApi');
	const baseUrl = normalizeUrl(credentials.url);

	const { method = 'GET', body, headers = {} } = options;
	const requestHeaders = {
		Authorization: `Bearer ${credentials.token}`,
		'Content-Type': 'application/json',
		...headers,
	};

	let lastError: Error | undefined;

	for (const variant of urlVariants) {
		try {
			const response = await functions.helpers.httpRequest({
				method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
				url: `${baseUrl}/${variant}`,
				headers: requestHeaders,
				...(body ? { body } : {}),
			});

			return parseDirectusResponse(response);
		} catch (error) {
			lastError = error;
			continue;
		}
	}

	throw lastError || new Error('All URL variants failed');
}

/**
 * Parses a Directus API response, handling both string and object responses
 */
export function parseDirectusResponse(response: unknown): { data: unknown } {
	let parsedResponse: unknown;

	if (typeof response === 'string') {
		try {
			parsedResponse = JSON.parse(response);
		} catch (parseError) {
			throw new Error(`Failed to parse JSON response: ${parseError}`);
		}
	} else {
		parsedResponse = response;
	}

	if (!parsedResponse || typeof parsedResponse !== 'object' || !('data' in parsedResponse)) {
		throw new Error('Invalid response format from Directus API');
	}

	return parsedResponse as { data: unknown };
}

/**
 * Gets collections from Directus API
 */
export async function getCollectionsFromAPI(functions: ILoadOptionsFunctions) {
	const urlVariants = API_URL_VARIANTS.COLLECTIONS;
	const response = (await makeDirectusRequest(functions, urlVariants)) as { data: unknown };
	const responseData = response.data;

	if (!Array.isArray(responseData)) {
		throw new Error(
			`Expected array, got ${typeof responseData}. Response: ${JSON.stringify(responseData)}`,
		);
	}

	return responseData;
}

/**
 * Gets fields for a collection from Directus API
 */
export async function getFieldsFromAPI(functions: ILoadOptionsFunctions, collection: string) {
	const urlVariants = API_URL_VARIANTS.FIELDS(collection);
	const response = (await makeDirectusRequest(functions, urlVariants)) as { data: unknown };
	const responseData = response.data;

	if (!Array.isArray(responseData)) {
		throw new Error('Invalid response format from Directus API');
	}

	return responseData;
}

/**
 * Gets roles from Directus API
 */
export async function getRolesFromAPI(functions: ILoadOptionsFunctions) {
	const urlVariants = API_URL_VARIANTS.ROLES;
	const response = (await makeDirectusRequest(functions, urlVariants)) as { data: unknown };
	const responseData = response.data;

	if (!Array.isArray(responseData)) {
		throw new Error(
			`Expected array, got ${typeof responseData}. Response: ${JSON.stringify(responseData)}`,
		);
	}

	return responseData;
}

/**
 * Gets relations from Directus API
 */
export async function getRelationsFromAPI(functions: ILoadOptionsFunctions) {
	const urlVariants = API_URL_VARIANTS.RELATIONS;
	const response = (await makeDirectusRequest(functions, urlVariants)) as { data: unknown };
	const responseData = response.data;

	if (!Array.isArray(responseData)) {
		return [];
	}

	return responseData;
}
