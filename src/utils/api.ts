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
		body?: any;
		headers?: Record<string, string>;
	} = {},
): Promise<any> {
	const credentials = (await functions.getCredentials('directusApi')) as DirectusCredentials;
	const baseUrl = normalizeUrl(credentials.url);

	const { method = 'GET', body, headers = {} } = options;
	const requestHeaders = {
		Authorization: `Bearer ${credentials.token}`,
		'Content-Type': 'application/json',
		...headers,
	};

	let lastError: any;

	for (const variant of urlVariants) {
		try {
			const response = await functions.helpers.request({
				method,
				url: `${baseUrl}/${variant}`,
				headers: requestHeaders,
				...(body && { body }),
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
export function parseDirectusResponse(response: any): any {
	let parsedResponse: any;

	if (typeof response === 'string') {
		try {
			parsedResponse = JSON.parse(response);
		} catch (parseError) {
			throw new Error(`Failed to parse JSON response: ${parseError}`);
		}
	} else {
		parsedResponse = response;
	}

	if (!parsedResponse || !parsedResponse.data) {
		throw new Error('Invalid response format from Directus API');
	}

	return parsedResponse;
}

/**
 * Gets collections from Directus API
 */
export async function getCollectionsFromAPI(functions: ILoadOptionsFunctions) {
	const urlVariants = API_URL_VARIANTS.COLLECTIONS;
	const response = await makeDirectusRequest(functions, urlVariants);

	if (!Array.isArray(response.data)) {
		throw new Error(
			`Expected array, got ${typeof response.data}. Response: ${JSON.stringify(response.data)}`,
		);
	}

	return response.data;
}

/**
 * Gets fields for a collection from Directus API
 */
export async function getFieldsFromAPI(functions: ILoadOptionsFunctions, collection: string) {
	const urlVariants = API_URL_VARIANTS.FIELDS(collection);
	const response = await makeDirectusRequest(functions, urlVariants);

	if (!Array.isArray(response.data)) {
		throw new Error('Invalid response format from Directus API');
	}

	return response.data;
}

/**
 * Gets roles from Directus API
 */
export async function getRolesFromAPI(functions: ILoadOptionsFunctions) {
	const urlVariants = API_URL_VARIANTS.ROLES;
	const response = await makeDirectusRequest(functions, urlVariants);

	if (!Array.isArray(response.data)) {
		throw new Error(
			`Expected array, got ${typeof response.data}. Response: ${JSON.stringify(response.data)}`,
		);
	}

	return response.data;
}

/**
 * Gets relations from Directus API
 */
export async function getRelationsFromAPI(functions: ILoadOptionsFunctions) {
	const urlVariants = API_URL_VARIANTS.RELATIONS;
	const response = await makeDirectusRequest(functions, urlVariants);

	if (!Array.isArray(response.data)) {
		return [];
	}

	return response.data;
}
