import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type {
	DirectusCredentials,
	DirectusErrorDetails,
	DirectusRelation,
	DirectusCollection,
	DirectusField,
	DirectusRole,
	DirectusApiResponse,
	DirectusHttpError,
} from '../types';
import { isObject, safeStringify, truncateText } from './errorUtils';
import { createAuthenticatedRequest } from './request';

const SENSITIVE_ERROR_KEYS = new Set([
	'authorization',
	'cookie',
	'password',
	'secret',
	'token',
	'access_token',
	'refresh_token',
	'api_key',
	'apikey',
]);

function sanitizeErrorValue(value: unknown, seen = new WeakSet<object>()): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => sanitizeErrorValue(entry, seen));
	}

	if (!isObject(value)) {
		return value;
	}

	if (seen.has(value)) {
		return '[Circular]';
	}

	seen.add(value);
	const sanitized: Record<string, unknown> = {};

	for (const [key, entryValue] of Object.entries(value)) {
		if (SENSITIVE_ERROR_KEYS.has(key.toLowerCase())) {
			sanitized[key] = '[redacted]';
			continue;
		}

		sanitized[key] = sanitizeErrorValue(entryValue, seen);
	}

	return sanitized;
}

function parseIfJson(value: unknown): unknown {
	if (typeof value !== 'string') {
		return value;
	}

	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

function toShortText(value: unknown, maxLength = 240): string {
	if (typeof value === 'string') {
		return truncateText(value, maxLength);
	}

	if (!isObject(value) && !Array.isArray(value)) {
		return String(value);
	}

	return truncateText(safeStringify(value), maxLength);
}

function extractDirectusMessages(parsedData: unknown): {
	directusErrors?: Array<Record<string, unknown>>;
	directusMessage?: string;
} {
	if (!isObject(parsedData)) {
		return {};
	}

	if ('errors' in parsedData && Array.isArray(parsedData.errors) && parsedData.errors.length > 0) {
		const directusErrors = parsedData.errors
			.filter((entry): entry is Record<string, unknown> => isObject(entry))
			.map((entry) => sanitizeErrorValue(entry) as Record<string, unknown>);

		const directusMessage = parsedData.errors
			.map((entry) => {
				if (
					isObject(entry) &&
					typeof entry.message === 'string' &&
					entry.message.trim().length > 0
				) {
					return entry.message;
				}

				return toShortText(entry, 180);
			})
			.join(', ');

		return { directusErrors, directusMessage };
	}

	if (typeof parsedData.message === 'string' && parsedData.message.trim().length > 0) {
		return { directusMessage: parsedData.message };
	}

	return {};
}

function limitErrorPayload(value: unknown): unknown {
	if (value === undefined) {
		return undefined;
	}

	if (typeof value === 'string') {
		return truncateText(value);
	}

	const serialized = truncateText(safeStringify(value));
	if (serialized.endsWith('... [truncated]')) {
		return {
			truncated: true,
			preview: serialized,
		};
	}

	return value;
}

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
	const errorDetails = extractDirectusErrorDetails(error);
	return new Error(errorDetails.message);
}

export function extractDirectusErrorDetails(error: unknown): DirectusErrorDetails {
	const httpError = isObject(error) ? (error as DirectusHttpError) : undefined;
	const statusCode =
		httpError?.statusCode ||
		httpError?.status ||
		httpError?.response?.statusCode ||
		httpError?.response?.status;
	const statusMessage = httpError?.response?.statusMessage;

	const responseData = httpError?.response?.data || httpError?.response?.body;
	const parsedResponseData = parseIfJson(responseData);
	const sanitizedResponse =
		parsedResponseData !== undefined
			? limitErrorPayload(sanitizeErrorValue(parsedResponseData))
			: undefined;

	const { directusErrors, directusMessage } = extractDirectusMessages(parsedResponseData);

	const baseMessage =
		error instanceof Error
			? error.message
			: typeof httpError?.message === 'string'
				? httpError.message
				: String(error || 'An unknown error occurred');

	let message = baseMessage;

	if (directusMessage && statusCode) {
		message = `Request failed with status code ${statusCode}: ${directusMessage}`;
	} else if (directusMessage) {
		message = directusMessage;
	} else if (statusCode) {
		const statusText = statusMessage ? ` (${statusMessage})` : '';
		if (!baseMessage || /request failed with status code/i.test(baseMessage)) {
			message = `Request failed with status code ${statusCode}${statusText}`;
		} else {
			message = `Request failed with status code ${statusCode}${statusText}: ${baseMessage}`;
		}
	}

	return {
		message: truncateText(message, 1200),
		statusCode,
		statusMessage,
		responseBody: sanitizedResponse,
		directusErrors,
		originalMessage: baseMessage ? truncateText(baseMessage, 1200) : undefined,
	};
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
