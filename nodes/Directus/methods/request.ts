import type { IHttpRequestOptions } from 'n8n-workflow';
import type { DirectusCredentials } from '../types';

export function createAuthenticatedRequest(credentials: DirectusCredentials) {
	const baseUrl = credentials.url.replace(/\/+$/, '');

	return (options: IHttpRequestOptions): IHttpRequestOptions => {
		return {
			...options,
			baseURL: baseUrl,
			headers: {
				Authorization: `Bearer ${credentials.token}`,
				'Content-Type': 'application/json',
				Accept: 'application/json',
				...options.headers,
			},
		};
	};
}
