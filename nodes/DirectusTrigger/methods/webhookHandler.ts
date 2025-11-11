import { IWebhookFunctions, IWebhookResponseData, INodeExecutionData } from 'n8n-workflow';
import type { DirectusCredentials, DirectusWebhookPayload } from '../../Directus/types';

/**
 * Handle incoming webhook from Directus
 *
 * This function is called when Directus sends an event to n8n.
 * It:
 * 1. Extracts the event data from Directus webhook payload
 * 2. For 'update' events, fetches the full updated record
 * 3. Formats the data for the n8n workflow
 * 4. Returns the data to trigger the workflow
 */
export async function handleWebhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
	const bodyData = this.getBodyData();
	const resource = this.getNodeParameter('resource', 0) as string;
	const event = this.getNodeParameter('event', 0) as string;

	const payload = (bodyData as Partial<DirectusWebhookPayload>) || {};
	let completeData: Record<string, unknown> =
		(payload.payload as Record<string, unknown>) ||
		(payload as Record<string, unknown>) ||
		({} as Record<string, unknown>);

	// Extract entity ID from payload (check common Directus fields)
	let entityId =
		payload.key ||
		payload.id ||
		payload.keys?.[0] ||
		(completeData as { id?: string; key?: string })?.id ||
		(completeData as { id?: string; key?: string })?.key ||
		undefined;

	// For update events, fetch the full updated record from Directus
	// (Directus webhooks only send partial data for updates)
	if (event === 'update' && entityId) {
		const credentials = (await this.getCredentials('directusApi')) as DirectusCredentials;
		const collection = resource === 'item' ? payload.collection || 'unknown' : undefined;
		const directusApiEndpoint =
			resource === 'item' ? `/items/${collection}/${entityId}` : `/${resource}s/${entityId}`;

		try {
			const response = await this.helpers.httpRequest({
				method: 'GET',
				url: directusApiEndpoint,
				baseURL: credentials.url,
				headers: {
					Authorization: `Bearer ${credentials.token}`,
					Accept: 'application/json',
				},
			});

			const fetchedData = (response as { data?: { data?: unknown } })?.data?.data;
			if (fetchedData && typeof fetchedData === 'object' && !Array.isArray(fetchedData)) {
				completeData = fetchedData as Record<string, unknown>;
				// Re-extract ID from fetched data
				entityId =
					(fetchedData as { id?: string; key?: string })?.id ||
					(fetchedData as { id?: string; key?: string })?.key ||
					entityId;
			}
		} catch {
			// Use original payload data if fetch fails
		}
	}

	const eventName = payload.event || `${resource === 'item' ? 'items' : resource + 's'}.${event}`;
	const collectionName = resource === 'item' ? payload.collection || 'unknown' : undefined;

	// Format data for n8n workflow
	const workflowData: INodeExecutionData = {
		json: {
			event: eventName,
			...(collectionName && { collection: collectionName }),
			action: event,
			payload: completeData,
			id: entityId ? String(entityId) : undefined,
			key: String(entityId || ''),
			keys: payload.keys || (entityId ? [String(entityId)] : []),
			timestamp: new Date().toISOString(),
		},
	};

	return {
		workflowData: [[workflowData]],
	};
}
