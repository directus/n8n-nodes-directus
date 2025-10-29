import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { API_URL_VARIANTS } from '../../../utils/constants';

export interface DirectusCredentials {
	url: string;
	token: string;
	environment: string;
}

type Relation = {
	many_collection?: string;
	one_collection?: string;
	many_field?: string;
	one_field?: string;
};

type CollectionResponse = {
	collection: string;
	schema?: unknown;
	meta?: {
		translations?: Array<{ translation: string; [key: string]: unknown }>;
		display_template?: string;
	};
};

type FieldResponse = {
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
};

async function makeDirectusRequest(
	functions: ILoadOptionsFunctions,
	urlVariants: string[],
	options: {
		method?: string;
		body?: unknown;
		headers?: Record<string, string>;
	} = {},
): Promise<{ data: unknown }> {
	const credentials = (await functions.getCredentials('directusApi')) as DirectusCredentials;
	const baseUrl = credentials.url.replace(/\/+$/, '');

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

			const parsed = typeof response === 'string' ? JSON.parse(response) : response;

			if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) {
				throw new Error('Invalid response format from Directus API');
			}

			return parsed as { data: unknown };
		} catch (error) {
			lastError = error as Error;
			continue;
		}
	}

	throw lastError || new Error('All URL variants failed');
}

async function getArrayFromAPI<T>(
	functions: ILoadOptionsFunctions,
	urlVariants: string[],
	allowEmpty = false,
): Promise<T[]> {
	const response = await makeDirectusRequest(functions, urlVariants);
	const responseData = response.data;

	if (!Array.isArray(responseData)) {
		if (allowEmpty) {
			return [];
		}
		throw new Error(
			`Expected array, got ${typeof responseData}. Response: ${JSON.stringify(responseData)}`,
		);
	}

	return responseData as T[];
}

export async function getCollectionsFromAPI(
	functions: ILoadOptionsFunctions,
): Promise<CollectionResponse[]> {
	return getArrayFromAPI<CollectionResponse>(functions, API_URL_VARIANTS.COLLECTIONS);
}

export async function getFieldsFromAPI(
	functions: ILoadOptionsFunctions,
	collection: string,
): Promise<FieldResponse[]> {
	return getArrayFromAPI<FieldResponse>(functions, API_URL_VARIANTS.FIELDS(collection));
}

export async function getRolesFromAPI(
	functions: ILoadOptionsFunctions,
): Promise<Array<{ id: string; name?: string; [key: string]: unknown }>> {
	return getArrayFromAPI<{ id: string; name?: string; [key: string]: unknown }>(
		functions,
		API_URL_VARIANTS.ROLES,
	);
}

export async function getRelationsFromAPI(functions: ILoadOptionsFunctions): Promise<Relation[]> {
	return getArrayFromAPI<Relation>(functions, API_URL_VARIANTS.RELATIONS, true);
}
