import type { IHttpRequestOptions } from 'n8n-workflow';
import type { DirectusCredentials } from '../types';

export function createAuthenticatedRequest(credentials: DirectusCredentials) {
	const baseUrl = credentials.url.replace(/\/+$/, '');

	return (options: IHttpRequestOptions): IHttpRequestOptions => {
		const headers: Record<string, string> = {
			Authorization: `Bearer ${credentials.token}`,
			Accept: 'application/json',
			...options.headers,
		};

		// Only set Content-Type for JSON requests (not file uploads with formData)
		// formData uploads will have Content-Type set automatically by n8n with boundary
		const hasFormData = 'formData' in options && options.formData !== undefined;
		if (!hasFormData && !options.headers?.['Content-Type']) {
			headers['Content-Type'] = 'application/json';
		}

		return {
			...options,
			baseURL: baseUrl,
			headers,
		};
	};
}
