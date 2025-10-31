import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type {
	DirectusCredentials,
	DirectusRelation,
	DirectusCollection,
	DirectusField,
	DirectusRole,
	DirectusApiResponse,
} from '../types';
import { createAuthenticatedRequest } from './request';

async function fetchFromDirectus<T>(
	functions: ILoadOptionsFunctions,
	endpoint: string,
	allowEmptyResponse = false,
): Promise<T[]> {
	const credentials = (await functions.getCredentials('directusApi')) as DirectusCredentials;
	const getRequestOptions = createAuthenticatedRequest(credentials);

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
