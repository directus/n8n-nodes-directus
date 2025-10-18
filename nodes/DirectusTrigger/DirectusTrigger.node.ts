import {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	JsonObject,
	ILoadOptionsFunctions,
	NodeApiError,
	NodeOperationError,
	INodeExecutionData,
} from 'n8n-workflow';

import { getCollections } from '../../src/utils/directus';

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
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.flowId === undefined) {
					// No flow id is set so no flow can exist
					return false;
				}

				// Flow got created before so check if it still exists
				const credentials = (await this.getCredentials('directusApi')) as {
					url: string;
					token: string;
				};

				// Normalize the URL to avoid double slashes
				const baseUrl = credentials.url.replace(/\/+$/, '');

				const urlVariants = [
					`${baseUrl}/flows/${webhookData.flowId}`,
					`${baseUrl}/api/flows/${webhookData.flowId}`,
				];

				for (const apiUrl of urlVariants) {
					try {
						await this.helpers.httpRequest({
							method: 'GET',
							url: apiUrl,
							headers: {
								Authorization: `Bearer ${credentials.token}`,
							},
						});

						// If we get here, the flow exists
						return true;
					} catch (error: unknown) {
						if ((error as { cause?: { httpCode?: string } })?.cause?.httpCode === '404') {
							// Flow does not exist
							delete webhookData.flowId;
							return false;
						}

						// Some other error occurred, try next URL variant
						continue;
					}
				}

				// All URL variants failed, assume flow doesn't exist
				delete webhookData.flowId;
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const originalWebhookUrl = this.getNodeWebhookUrl('default') as string;
				const isTestExecution = originalWebhookUrl.includes('webhook-test');

				// Always create/update the production flow for persistent operation
				const productionWebhookUrl = originalWebhookUrl.replace('webhook-test', 'webhook');

				// Use the appropriate URL for this execution
				const webhookUrl = isTestExecution ? originalWebhookUrl : productionWebhookUrl;

				if (
					webhookUrl.includes('//localhost') &&
					!webhookUrl.includes('ngrok') &&
					!webhookUrl.includes('tunnel')
				) {
					// For local development, we'll allow localhost but warn the user
					// Note: Using localhost webhook URL. This will only work if Directus can reach this URL.
					// Uncomment the line below to enforce the restriction in production
					// throw new NodeOperationError(this.getNode(), 'The Webhook can not work on "localhost". Please use a public URL or start n8n with "--tunnel"!');
				}

				const credentials = (await this.getCredentials('directusApi')) as {
					url: string;
					token: string;
				};
				const resource = this.getNodeParameter('resource', 0) as string;
				const event = this.getNodeParameter('event', 0) as string;
				const collection = this.getNodeParameter('collection', 0) as string;

				// Normalize the URL to avoid double slashes
				const baseUrl = credentials.url.replace(/\/+$/, '');

				// Handle different URL formats for Directus API compatibility
				const urlVariants = [`${baseUrl}/flows`, `${baseUrl}/api/flows`];

				// Define flow names for both test and production
				const resourceName = collection || resource; // Use collection for items, resource name for users/files
				const testFlowName = `n8n - ${event} ${resourceName} (test)`;
				const productionFlowName = `n8n - ${event} ${resourceName}`;

				// Create flows for both test and production scenarios
				const flowsToCreate = [];

				if (isTestExecution) {
					// For test execution, create both test and production flows
					flowsToCreate.push(
						{
							name: testFlowName,
							url: originalWebhookUrl,
							isTest: true,
						},
						{
							name: productionFlowName,
							url: productionWebhookUrl,
							isTest: false,
						},
					);
				} else {
					// For production activation, only create/update production flow
					flowsToCreate.push({
						name: productionFlowName,
						url: productionWebhookUrl,
						isTest: false,
					});
				}

				const baseFlowConfig = {
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

				const webhookData = this.getWorkflowStaticData('node');

				// Clean up any existing flows with similar names to prevent duplicates
				try {
					// Get all existing flows
					for (const apiUrl of urlVariants) {
						try {
							const response = await this.helpers.httpRequest({
								method: 'GET',
								url: apiUrl,
								baseURL: credentials.url,
								headers: {
									Authorization: `Bearer ${credentials.token}`,
									Accept: 'application/json',
								},
							});

							const flows = response.data.data || [];

							// Find flows to clean up
							const flowsToDelete = flows.filter((flow: { name?: string; id: string }) => {
								const flowName = flow.name || '';
								// Clean up old test flows and matching production flows if we're recreating
								if (isTestExecution) {
									// For test execution, only clean up old test flows
									return flowName === testFlowName;
								} else {
									// For production, clean up both test and production flows
									return flowName === testFlowName || flowName === productionFlowName;
								}
							});

							// Delete matching flows
							for (const flow of flowsToDelete) {
								try {
									await this.helpers.httpRequest({
										method: 'DELETE',
										url: `${apiUrl}/${flow.id}`,
										baseURL: credentials.url,
										headers: {
											Authorization: `Bearer ${credentials.token}`,
										},
									});
								} catch {
									// Ignore cleanup errors
								}
							}

							break; // Success, exit the loop
						} catch {
							// Try next URL variant
							continue;
						}
					}
				} catch {
					// Ignore cleanup errors
				}

				// Create all flows and track them
				const createdFlows = [];
				let mainFlowId = null;

				for (const flowConfig of flowsToCreate) {
					const body = {
						...baseFlowConfig,
						name: flowConfig.name,
					};

					let responseData;
					let lastError: Error | undefined;

					// Try to create the flow
					for (const apiUrl of urlVariants) {
						try {
							responseData = await this.helpers.httpRequest({
								method: 'POST',
								url: apiUrl,
								headers: {
									Authorization: `Bearer ${credentials.token}`,
									'Content-Type': 'application/json',
								},
								body,
							});

							break; // Success
						} catch (error) {
							lastError = error;
							continue;
						}
					}

					if (!responseData) {
						throw new NodeOperationError(
							this.getNode(),
							`Failed to create Directus flow ${flowConfig.name}: ${(lastError as Error)?.message || 'All URL variants failed'}`,
							{ level: 'warning' },
						);
					}

					// Parse the response if it's a string
					let parsedResponse: { data?: { id: string } };

					if (typeof responseData === 'string') {
						try {
							parsedResponse = JSON.parse(responseData);
						} catch (parseError: unknown) {
							throw new NodeOperationError(
								this.getNode(),
								`Failed to parse flow response for ${flowConfig.name}: ${parseError}`,
								{
									level: 'warning',
								},
							);
						}
					} else {
						parsedResponse = responseData;
					}

					if (!parsedResponse?.data?.id) {
						throw new NodeApiError(this.getNode(), parsedResponse as JsonObject, {
							message: `Directus flow creation response for ${flowConfig.name} did not contain the expected data.`,
						});
					}

					const flow = parsedResponse.data as { id: string };
					createdFlows.push({ ...flow, webhookUrl: flowConfig.url, isTest: flowConfig.isTest });

					// Track the main flow ID (production flow for persistence, or test flow if only testing)
					if (!flowConfig.isTest || flowsToCreate.length === 1) {
						mainFlowId = flow.id;
					}
				}

				// Create operations for all flows
				for (const flow of createdFlows) {
					const operationUrl = urlVariants[0].replace('/flows', `/flows/${flow.id}`);

					try {
						await this.helpers.httpRequest({
							method: 'PATCH',
							url: operationUrl,
							headers: {
								Authorization: `Bearer ${credentials.token}`,
								'Content-Type': 'application/json',
							},
							body: {
								flow: flow.id,
								operation: {
									name: 'Send to n8n',
									key: 'send_to_n8n',
									type: 'request',
									position_x: 19,
									position_y: 1,
									flow: flow.id,
									options: {
										method: 'POST',
										url: flow.webhookUrl,
										headers: [
											{
												header: 'Content-Type',
												value: 'application/json',
											},
										],
										body: '{{$trigger}}',
									},
								},
							},
						});
					} catch (error) {
						// If operation creation fails, clean up the flow
						try {
							await this.helpers.httpRequest({
								method: 'DELETE',
								url: operationUrl,
								headers: {
									Authorization: `Bearer ${credentials.token}`,
								},
							});
						} catch {
							// Ignore cleanup errors
						}

						throw new NodeOperationError(
							this.getNode(),
							`Failed to create webhook operation for flow ${flow.id}: ${(error as Error).message}`,
							{ level: 'warning' },
						);
					}
				}

				// Store the main flow ID for persistence tracking
				webhookData.flowId = mainFlowId as string;

				// Store test flow IDs for cleanup if this was a test execution
				if (isTestExecution) {
					const testFlows = createdFlows.filter((f) => f.isTest);
					webhookData.testFlowIds = testFlows.map((f) => f.id);
				}
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				// Only clean up test flows by default, keep production flow for persistence
				// Production flow should only be deleted when the trigger node is actually removed

				if (webhookData.testFlowIds && Array.isArray(webhookData.testFlowIds)) {
					const credentials = (await this.getCredentials('directusApi')) as {
						url: string;
						token: string;
					};
					const baseUrl = credentials.url.replace(/\/+$/, '');
					const urlVariants = [`${baseUrl}/flows`, `${baseUrl}/api/flows`];

					for (const testFlowId of webhookData.testFlowIds) {
						for (const apiUrl of urlVariants) {
							try {
								await this.helpers.httpRequest({
									method: 'DELETE',
									url: `${apiUrl}/${testFlowId}`,
									headers: {
										Authorization: `Bearer ${credentials.token}`,
									},
								});
								break; // Success, move to next flow
							} catch {
								// Try next URL variant or ignore if flow already deleted
								continue;
							}
						}
					}

					// Clear the test flow IDs
					delete webhookData.testFlowIds;
				}

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

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		const resource = this.getNodeParameter('resource', 0) as string;
		const event = this.getNodeParameter('event', 0) as string;

		// Extract the actual webhook payload from Directus
		// Directus sends the payload in the body field
		let webhookPayload: unknown;

		if (bodyData && typeof bodyData === 'object' && !Array.isArray(bodyData)) {
			// Check if it's the Directus webhook format
			if (
				(bodyData as { event?: string; payload?: unknown }).event &&
				(bodyData as { event?: string; payload?: unknown }).payload
			) {
				webhookPayload = bodyData;
			} else if (
				(bodyData as { body?: { event?: string; payload?: unknown } }).body &&
				(bodyData as { body?: { event?: string; payload?: unknown } }).body?.event &&
				(bodyData as { body?: { event?: string; payload?: unknown } }).body?.payload
			) {
				// Sometimes the payload is nested in a body field
				webhookPayload = (bodyData as { body: { event?: string; payload?: unknown } }).body;
			} else {
				// Fallback to using the entire bodyData
				webhookPayload = bodyData;
			}
		} else {
			webhookPayload = bodyData;
		}

		// Process the webhook payload
		let workflowData: { json: Record<string, unknown> };

		if (resource === 'item') {
			// Extract the item ID from various possible locations in the payload
			let itemId =
				(webhookPayload as { key?: string })?.key ||
				(webhookPayload as { id?: string })?.id ||
				(webhookPayload as { payload?: { key?: string; id?: string } })?.payload?.id ||
				(webhookPayload as { payload?: { key?: string; id?: string } })?.payload?.key;
			let completeData = (webhookPayload as { payload?: unknown })?.payload || webhookPayload;
			const collection = (webhookPayload as { collection?: string })?.collection || 'unknown';

			// For update events, fetch complete item data to ensure we have the full item
			if (event === 'update' && itemId) {
				try {
					const credentials = (await this.getCredentials('directusApi')) as {
						url: string;
						token: string;
					};

					const response = await this.helpers.httpRequest({
						method: 'GET',
						url: `/items/${collection}/${itemId}`,
						baseURL: credentials.url,
						headers: {
							Authorization: `Bearer ${credentials.token}`,
							Accept: 'application/json',
						},
					});

					completeData = response.data.data;
					// Ensure we have the correct ID from the fetched data
					itemId = (completeData as { id?: string })?.id || itemId;
				} catch {
					// If we can't fetch complete data, use original data
				}
			}

			// For create events, extract ID from the payload
			if (event === 'create' && completeData) {
				itemId =
					(completeData as { id?: string; key?: string })?.id ||
					(completeData as { id?: string; key?: string })?.key ||
					itemId;
			}

			// For delete events, we might only have the key/ID
			if (event === 'delete') {
				itemId =
					(webhookPayload as { key?: string; id?: string })?.key ||
					(webhookPayload as { key?: string; id?: string })?.id ||
					itemId;
			}

			workflowData = {
				json: {
					event: (webhookPayload as { event?: string })?.event || `items.${event}`,
					collection: collection,
					action: event,
					payload: completeData,
					// Always include the item ID for use in other operations
					id: itemId,
					key: String(itemId), // For backward compatibility
					keys: (webhookPayload as { keys?: string[] })?.keys || [String(itemId)],
					timestamp: new Date().toISOString(),
				},
			};
		} else if (resource === 'user') {
			// Extract the user ID from various possible locations in the payload
			let completeData = (webhookPayload as { payload?: unknown })?.payload || webhookPayload;
			let userId =
				(webhookPayload as { key?: string })?.key ||
				(webhookPayload as { id?: string })?.id ||
				(webhookPayload as { payload?: { key?: string; id?: string } })?.payload?.id ||
				(webhookPayload as { payload?: { key?: string; id?: string } })?.payload?.key ||
				(completeData as { id?: string })?.id ||
				((webhookPayload as { keys?: string[] })?.keys &&
					(webhookPayload as { keys?: string[] })?.keys?.[0]); // For user webhooks, ID is often in keys array

			// For update events, fetch complete user data
			if (event === 'update' && userId) {
				try {
					const credentials = (await this.getCredentials('directusApi')) as {
						url: string;
						token: string;
					};

					const response = await this.helpers.httpRequest({
						method: 'GET',
						url: `/users/${userId}`,
						baseURL: credentials.url,
						headers: {
							Authorization: `Bearer ${credentials.token}`,
							Accept: 'application/json',
						},
					});

					completeData = response.data.data;
					userId = (completeData as { id?: string })?.id || userId;
				} catch {
					// If we can't fetch complete data, use original data
				}
			}

			// For create events, extract ID from the payload
			if (event === 'create' && completeData) {
				userId =
					(completeData as { id?: string; key?: string })?.id ||
					(completeData as { id?: string; key?: string })?.key ||
					userId;
			}

			// For delete events, we might only have the key/ID
			if (event === 'delete') {
				userId =
					(webhookPayload as { key?: string; id?: string })?.key ||
					(webhookPayload as { key?: string; id?: string })?.id ||
					userId;
			}

			workflowData = {
				json: {
					event: (webhookPayload as { event?: string })?.event || `users.${event}`,
					action: event,
					payload: completeData,
					// Always include the user ID for use in other operations
					id: userId,
					key: String(userId), // For backward compatibility
					keys: (webhookPayload as { keys?: string[] })?.keys || [String(userId)],
					timestamp: new Date().toISOString(),
				},
			};
		} else if (resource === 'file') {
			// For file webhooks, only handle upload events
			// Extract the file ID from various possible locations in the payload
			const completeData = (webhookPayload as { payload?: unknown })?.payload || webhookPayload;
			let fileId =
				(webhookPayload as { key?: string })?.key ||
				(webhookPayload as { id?: string })?.id ||
				(webhookPayload as { payload?: { key?: string; id?: string } })?.payload?.id ||
				(webhookPayload as { payload?: { key?: string; id?: string } })?.payload?.key ||
				(completeData as { id?: string })?.id ||
				((webhookPayload as { keys?: string[] })?.keys &&
					(webhookPayload as { keys?: string[] })?.keys?.[0]); // For file webhooks, ID is often in keys array

			// For upload events, the payload should contain the complete file data
			if (event === 'upload' && completeData) {
				fileId =
					(completeData as { id?: string; key?: string })?.id ||
					(completeData as { id?: string; key?: string })?.key ||
					fileId;
			}

			workflowData = {
				json: {
					event: (webhookPayload as { event?: string })?.event || `files.${event}`,
					action: event,
					payload: completeData,
					// Always include the file ID for use in other operations
					id: fileId,
					key: String(fileId), // For backward compatibility
					keys: (webhookPayload as { keys?: string[] })?.keys || [String(fileId)],
					timestamp: new Date().toISOString(),
				},
			};
		} else {
			workflowData = {
				json: {
					...(webhookPayload as Record<string, unknown>),
					event: (webhookPayload as { event?: string })?.event || `${resource}.${event}`,
					timestamp: new Date().toISOString(),
				},
			};
		}

		// Ensure workflowData is properly formatted
		if (!workflowData || !workflowData.json) {
			workflowData = {
				json: {
					event: (webhookPayload as { event?: string })?.event || `${resource}.${event}`,
					payload: webhookPayload,
					timestamp: new Date().toISOString(),
					error: 'Failed to process webhook data',
				},
			};
		}

		// Ensure the data structure is exactly what n8n expects
		// n8n expects each item to have a 'json' property
		if (!workflowData.json) {
			workflowData = { json: workflowData };
		}

		// Return the data in the format n8n expects for webhook nodes
		// n8n expects workflowData to be an array of INodeExecutionData objects
		// Each item should have a 'json' property containing the actual data
		return {
			workflowData: [[workflowData as INodeExecutionData]],
		};
	}
}
