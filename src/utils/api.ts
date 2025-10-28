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
	const credentials = (await functions.getCredentials('directusApi')) as DirectusCredentials;
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
			const response = await functions.helpers.request({
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
 * Generic function to fetch an array from Directus API
 * @param functions - n8n functions for making the request
 * @param urlVariants - Array of URL variants to try
 * @param allowEmpty - If true, returns empty array on invalid response instead of throwing
 */
async function getArrayFromAPI(
	functions: ILoadOptionsFunctions,
	urlVariants: string[],
	allowEmpty = false,
): Promise<unknown[]> {
	const response = (await makeDirectusRequest(functions, urlVariants)) as { data: unknown };
	const responseData = response.data;

	if (!Array.isArray(responseData)) {
		if (allowEmpty) {
			return [];
		}
		throw new Error(
			`Expected array, got ${typeof responseData}. Response: ${JSON.stringify(responseData)}`,
		);
	}

	return responseData;
}

/**
 * Gets collections from Directus API
 */
export async function getCollectionsFromAPI(functions: ILoadOptionsFunctions): Promise<
	Array<{
		collection: string;
		schema?: unknown;
		meta?: {
			translations?: Array<{ translation: string; [key: string]: unknown }>;
			display_template?: string;
		};
	}>
> {
	return getArrayFromAPI(functions, API_URL_VARIANTS.COLLECTIONS) as Promise<
		Array<{
			collection: string;
			schema?: unknown;
			meta?: {
				translations?: Array<{ translation: string; [key: string]: unknown }>;
				display_template?: string;
			};
		}>
	>;
}

/**
 * Gets fields for a collection from Directus API
 */
export async function getFieldsFromAPI(
	functions: ILoadOptionsFunctions,
	collection: string,
): Promise<
	Array<{
		field: string;
		type: string;
		collection?: string;
		meta?: {
			special?: string[];
			sort?: number;
			required?: boolean;
			note?: string;
			options?: {
				choices?: Array<{ text: string; value: string }>;
				[key: string]: unknown;
			};
			interface?: string;
			locked?: boolean;
			hidden?: boolean;
			translations?: Array<{ translation: string; [key: string]: unknown }>;
			display_name?: string;
		};
		schema?: {
			foreign_key_table?: string;
		};
	}>
> {
	return getArrayFromAPI(functions, API_URL_VARIANTS.FIELDS(collection)) as Promise<
		Array<{
			field: string;
			type: string;
			collection?: string;
			meta?: {
				special?: string[];
				sort?: number;
				required?: boolean;
				note?: string;
				options?: {
					choices?: Array<{ text: string; value: string }>;
					[key: string]: unknown;
				};
				interface?: string;
				locked?: boolean;
				hidden?: boolean;
				translations?: Array<{ translation: string; [key: string]: unknown }>;
				display_name?: string;
			};
			schema?: {
				foreign_key_table?: string;
			};
		}>
	>;
}

/**
 * Gets roles from Directus API
 */
export async function getRolesFromAPI(
	functions: ILoadOptionsFunctions,
): Promise<Array<{ id: string; name?: string; [key: string]: unknown }>> {
	return getArrayFromAPI(functions, API_URL_VARIANTS.ROLES) as Promise<
		Array<{ id: string; name?: string; [key: string]: unknown }>
	>;
}

/**
 * Gets relations from Directus API
 */
export async function getRelationsFromAPI(functions: ILoadOptionsFunctions): Promise<
	Array<{
		many_collection?: string;
		one_collection?: string;
		many_field?: string;
		one_field?: string;
	}>
> {
	return getArrayFromAPI(functions, API_URL_VARIANTS.RELATIONS, true) as Promise<
		Array<{
			many_collection?: string;
			one_collection?: string;
			many_field?: string;
			one_field?: string;
		}>
	>;
}
