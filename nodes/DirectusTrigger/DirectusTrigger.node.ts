import {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	ILoadOptionsFunctions,
	NodeOperationError,
	INodeExecutionData,
} from 'n8n-workflow';

import { getCollections } from '../Directus/methods/fields';
import type { DirectusCredentials } from '../Directus/types';

interface DirectusWebhookPayload {
	event: string;
	payload: Record<string, unknown>;
	collection?: string;
	key?: string;
	id?: string;
	keys?: string[];
}

export class DirectusTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Directus Trigger',
		name: 'directusTrigger',
		icon: 'file:directus.svg',
		group: ['trigger'],
		version: 1,
		subtitle:
			'={{$parameter["resource"] === "file" ? $parameter["event"] + " file" : $parameter["event"] + " in " + $parameter["collection"]}}',
		description: 'Starts the workflow when Directus events occur',
		defaults: {
			name: 'Directus Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'directusApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'directus-webhook',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Item',
						value: 'item',
					},
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'File',
						value: 'file',
					},
				],
				default: 'item',
			},
			{
				displayName: 'Collection Name or ID',
				name: 'collection',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCollections',
				},
				displayOptions: {
					show: {
						resource: ['item'],
					},
				},
				default: '',
				required: true,
				description:
					'The collection to watch for changes. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['item', 'user'],
					},
				},
				options: [
					{
						name: 'Created',
						value: 'create',
					},
					{
						name: 'Updated',
						value: 'update',
					},
					{
						name: 'Deleted',
						value: 'delete',
					},
				],
				default: 'create',
				description: 'The event to trigger on',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['file'],
					},
				},
				options: [
					{
						name: 'Uploaded',
						value: 'upload',
					},
				],
				default: 'upload',
				description: 'The event to trigger on (only upload is supported for files)',
			},
		],
		usableAsTool: true,
	};

	webhookMethods = {
		default: {
			/**
			 * Check if the Directus flow we created still exists
			 * Called when n8n workflow is activated to verify webhook is still valid
			 */
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (!webhookData.flowId) return false;

				const credentials = (await this.getCredentials('directusApi')) as DirectusCredentials;
				const directusBaseUrl = credentials.url.replace(/\/+$/, '');
				const flowCheckUrl = `${directusBaseUrl}/flows/${webhookData.flowId}`;

				try {
					await this.helpers.httpRequest({
						method: 'GET',
						url: flowCheckUrl,
						headers: { Authorization: `Bearer ${credentials.token}` },
					});
					return true;
				} catch (error: unknown) {
					const httpCode = (error as { cause?: { httpCode?: string } })?.cause?.httpCode;
					if (httpCode === '404') {
						delete webhookData.flowId;
						return false;
					}
				}

				delete webhookData.flowId;
				return false;
			},

			/**
			 * Create Directus flows that will send events to n8n
			 *
			 * TEST MODE EXPLANATION:
			 * When testing a workflow in n8n, n8n provides a test webhook URL (contains 'webhook-test').
			 * When activating a workflow, n8n provides a production webhook URL (contains 'webhook').
			 *
			 * We need TWO flows in Directus:
			 * 1. Test flow: "n8n - create posts (test)" → sends to test webhook URL
			 *    - Used when you click "Listen for Test Event" in n8n
			 *    - Automatically cleaned up when test ends
			 *
			 * 2. Production flow: "n8n - create posts" → sends to production webhook URL
			 *    - Used when workflow is activated
			 *    - Persists until workflow is deactivated
			 *
			 * WHY BOTH?
			 * - During testing, we create BOTH so production flow is ready when you activate
			 * - On activation, we only update production flow (test flow was already created)
			 * - This prevents needing to recreate flows every time you test then activate
			 */
			async create(this: IHookFunctions): Promise<boolean> {
				const n8nWebhookUrl = this.getNodeWebhookUrl('default') as string;
				const isTestMode = n8nWebhookUrl.includes('webhook-test');

				const credentials = (await this.getCredentials('directusApi')) as DirectusCredentials;
				const resource = this.getNodeParameter('resource', 0) as string;
				const event = this.getNodeParameter('event', 0) as string;
				const collection = this.getNodeParameter('collection', 0) as string;

				const resourceName = collection || resource;
				const directusBaseUrl = credentials.url.replace(/\/+$/, '');
				const directusFlowsApiUrl = `${directusBaseUrl}/flows`;

				// Flow names: one for testing, one for production
				const testFlowName = `n8n - ${event} ${resourceName} (test)`;
				const prodFlowName = `n8n - ${event} ${resourceName}`;

				// Webhook URLs: test uses webhook-test, production uses webhook
				const testWebhookUrl = n8nWebhookUrl.includes('webhook-test')
					? n8nWebhookUrl
					: n8nWebhookUrl.replace('webhook', 'webhook-test');
				const prodWebhookUrl = n8nWebhookUrl.replace('webhook-test', 'webhook');

				const flowConfig = {
					icon: 'bolt',
					status: 'active',
					trigger: 'event',
					accountability: 'all',
					options: {
						type: 'action',
						scope: resource === 'item' ? [`items.${event}`] : [`${resource}s.${event}`],
						collections: resource === 'item' ? [collection] : undefined,
					},
				};

				// Check if flows already exist (to avoid duplicates)
				let existingFlows: Array<{ id: string; name?: string }> = [];
				try {
					const response = await this.helpers.httpRequest({
						method: 'GET',
						url: directusFlowsApiUrl,
						headers: {
							Authorization: `Bearer ${credentials.token}`,
							Accept: 'application/json',
						},
					});

					if (Array.isArray(response)) {
						existingFlows = response;
					} else if ((response as { data?: unknown })?.data) {
						const data = (response as { data: unknown }).data;
						if (Array.isArray(data)) {
							existingFlows = data;
						}
					}
				} catch {
					// Continue if fetch fails
				}

				const existingTestFlow = existingFlows.find((flow) => flow.name === testFlowName);
				const existingProdFlow = existingFlows.find((flow) => flow.name === prodFlowName);

				const setupFlow = async (
					flowName: string,
					webhookUrl: string,
					existingFlow?: { id: string },
				): Promise<string> => {
					const isUserUpdate = resource === 'user' && event === 'update';
					const operationsApiUrl = directusFlowsApiUrl.replace('/flows', '/operations');

					let flowId: string;
					if (existingFlow) {
						flowId = existingFlow.id;
					} else {
						const createFlowResp = await this.helpers.httpRequest({
							method: 'POST',
							url: directusFlowsApiUrl,
							headers: {
								Authorization: `Bearer ${credentials.token}`,
								'Content-Type': 'application/json',
							},
							body: { ...flowConfig, name: flowName },
						});

						const parsed =
							typeof createFlowResp === 'string' ? JSON.parse(createFlowResp) : createFlowResp;
						flowId = parsed?.data?.id;

						if (!flowId) {
							throw new NodeOperationError(this.getNode(), `Failed to create flow: ${flowName}`);
						}
					}

					if (!isUserUpdate) {
						const createReqOpResp = await this.helpers.httpRequest({
							method: 'POST',
							url: operationsApiUrl,
							headers: {
								Authorization: `Bearer ${credentials.token}`,
								'Content-Type': 'application/json',
							},
							body: {
								flow: flowId,
								name: 'Send to n8n',
								key: 'send_to_n8n',
								type: 'request',
								position_x: 19,
								position_y: 1,
								options: {
									method: 'POST',
									url: webhookUrl,
									headers: [{ header: 'Content-Type', value: 'application/json' }],
									body: '{{$trigger}}',
								},
							},
						});

						const reqOp =
							typeof createReqOpResp === 'string' ? JSON.parse(createReqOpResp) : createReqOpResp;
						const reqOpId = reqOp?.data?.id;

						if (!reqOpId) {
							throw new NodeOperationError(
								this.getNode(),
								`Failed to create request op for ${flowName}`,
							);
						}

						await this.helpers.httpRequest({
							method: 'PATCH',
							url: `${directusFlowsApiUrl}/${flowId}`,
							headers: {
								Authorization: `Bearer ${credentials.token}`,
								'Content-Type': 'application/json',
							},
							body: { operation: reqOpId },
						});

						return flowId;
					}

					// Special handling for user.update: Directus automatically updates the `last_page` field
					// whenever a user navigates, causing unwanted webhook triggers. We use a script operation
					// to filter out updates that only contain `last_page`, allowing real user updates to proceed.
					const createReqOpResp = await this.helpers.httpRequest({
						method: 'POST',
						url: operationsApiUrl,
						headers: {
							Authorization: `Bearer ${credentials.token}`,
							'Content-Type': 'application/json',
						},
						body: {
							flow: flowId,
							name: 'Send to n8n',
							key: 'send_to_n8n',
							type: 'request',
							position_x: 38,
							position_y: 1,
							options: {
								method: 'POST',
								url: webhookUrl,
								headers: [{ header: 'Content-Type', value: 'application/json' }],
								body: '{{$trigger}}',
							},
						},
					});

					const reqOp =
						typeof createReqOpResp === 'string' ? JSON.parse(createReqOpResp) : createReqOpResp;
					const reqOpId = reqOp?.data?.id;

					if (!reqOpId) {
						throw new NodeOperationError(
							this.getNode(),
							`Failed to create request op for ${flowName}`,
						);
					}

					const createScriptOpResp = await this.helpers.httpRequest({
						method: 'POST',
						url: operationsApiUrl,
						headers: {
							Authorization: `Bearer ${credentials.token}`,
							'Content-Type': 'application/json',
						},
						body: {
							flow: flowId,
							name: 'Filter last_page updates',
							key: 'filter_last_page',
							type: 'exec',
							position_x: 19,
							position_y: 1,
							options: {
								code: `module.exports = async function(data) {
	const payload = data.$trigger.payload || {};
	const payloadKeys = Object.keys(payload);
	const onlyLastPage = payloadKeys.length === 1 && payloadKeys[0] === 'last_page';
	if (onlyLastPage) {
		throw new Error('Skipping last_page update');
	}
	return data.$trigger;
};`,
							},
							resolve: reqOpId,
							reject: null,
						},
					});

					const scriptOp =
						typeof createScriptOpResp === 'string'
							? JSON.parse(createScriptOpResp)
							: createScriptOpResp;
					const scriptOpId = scriptOp?.data?.id;

					if (!scriptOpId) {
						throw new NodeOperationError(
							this.getNode(),
							`Failed to create script op for ${flowName}`,
						);
					}

					await this.helpers.httpRequest({
						method: 'PATCH',
						url: `${directusFlowsApiUrl}/${flowId}`,
						headers: {
							Authorization: `Bearer ${credentials.token}`,
							'Content-Type': 'application/json',
						},
						body: { operation: scriptOpId },
					});

					return flowId;
				};

				try {
					if (isTestMode) {
						// Test mode: create/update BOTH flows
						// Test flow for current test, production flow ready for activation
						const testFlowId = await setupFlow(testFlowName, testWebhookUrl, existingTestFlow);
						await setupFlow(prodFlowName, prodWebhookUrl, existingProdFlow);

						const webhookData = this.getWorkflowStaticData('node');
						webhookData.flowId = testFlowId;
					} else {
						const prodFlowId = await setupFlow(prodFlowName, prodWebhookUrl, existingProdFlow);

						const webhookData = this.getWorkflowStaticData('node');
						webhookData.flowId = prodFlowId;
					}
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to create/configure flows: ${(error as Error).message}`,
					);
				}

				return true;
			},

			/**
			 * Delete the Directus flow when workflow is deactivated
			 */
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (!webhookData.flowId) return true;

				const credentials = (await this.getCredentials('directusApi')) as DirectusCredentials;
				const directusBaseUrl = credentials.url.replace(/\/+$/, '');
				const flowDeleteUrl = `${directusBaseUrl}/flows/${webhookData.flowId}`;

				try {
					await this.helpers.httpRequest({
						method: 'DELETE',
						url: flowDeleteUrl,
						headers: { Authorization: `Bearer ${credentials.token}` },
					});
				} catch {
					// Flow may already be deleted
				}

				delete webhookData.flowId;
				return true;
			},
		},
	};

	methods = {
		loadOptions: {
			async getCollections(
				this: ILoadOptionsFunctions,
			): Promise<Array<{ name: string; value: string }>> {
				try {
					const collections = await getCollections(this);
					return collections.map((collection: { collection: string }) => ({
						name: collection.collection,
						value: collection.collection,
					}));
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to load collections: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			},
		},
	};

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
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
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
}
