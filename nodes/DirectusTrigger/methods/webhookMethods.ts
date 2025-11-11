import { IHookFunctions, NodeOperationError } from 'n8n-workflow';
import type { DirectusCredentials } from '../../Directus/types';

/**
 * Capitalize the first letter of each word in a string
 * Handles spaces, underscores, and hyphens as word separators
 */
function capitalizeWords(str: string): string {
	if (!str) return str;
	return str
		.split(/[\s_-]+/)
		.filter((word) => word.length > 0)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
}

/**
 * Check if the Directus flow we created still exists
 * Called when n8n workflow is activated to verify webhook is still valid
 */
export async function checkExists(this: IHookFunctions): Promise<boolean> {
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
}

/**
 * Create Directus flows that will send events to n8n
 *
 * TEST MODE EXPLANATION:
 * When testing a workflow in n8n, n8n provides a test webhook URL (contains 'webhook-test').
 * When activating a workflow, n8n provides a production webhook URL (contains 'webhook').
 *
 * We need TWO flows in Directus:
 * 1. Test flow: "N8N - Create Posts (test)" → sends to test webhook URL
 *    - Used when you click "Listen for Test Event" in n8n
 *    - Automatically cleaned up when test ends
 *
 * 2. Production flow: "N8N - Create Posts" → sends to production webhook URL
 *    - Used when workflow is activated
 *    - Persists until workflow is deactivated
 *
 * WHY BOTH?
 * - During testing, we create BOTH so production flow is ready when you activate
 * - On activation, we only update production flow (test flow was already created)
 * - This prevents needing to recreate flows every time you test then activate
 */
export async function create(this: IHookFunctions): Promise<boolean> {
	const n8nWebhookUrl = this.getNodeWebhookUrl('default') as string;
	const isTestMode = n8nWebhookUrl.includes('webhook-test');

	const credentials = (await this.getCredentials('directusApi')) as DirectusCredentials;
	const resource = this.getNodeParameter('resource', 0) as string;
	const event = this.getNodeParameter('event', 0) as string;
	const collection = this.getNodeParameter('collection', 0) as string;

	const resourceName = collection || resource;
	const directusBaseUrl = credentials.url.replace(/\/+$/, '');
	const directusFlowsApiUrl = `${directusBaseUrl}/flows`;

	// Format names with proper capitalization
	const capitalizedEvent = capitalizeWords(event);
	const capitalizedResource = capitalizeWords(resourceName);

	// Flow names: one for testing, one for production
	const testFlowName = `N8N - ${capitalizedEvent} ${capitalizedResource} (test)`;
	const prodFlowName = `N8N - ${capitalizedEvent} ${capitalizedResource}`;

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
				throw new NodeOperationError(this.getNode(), `Failed to create request op for ${flowName}`);
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
			throw new NodeOperationError(this.getNode(), `Failed to create request op for ${flowName}`);
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
			typeof createScriptOpResp === 'string' ? JSON.parse(createScriptOpResp) : createScriptOpResp;
		const scriptOpId = scriptOp?.data?.id;

		if (!scriptOpId) {
			throw new NodeOperationError(this.getNode(), `Failed to create script op for ${flowName}`);
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
}

/**
 * Delete the Directus flow when workflow is deactivated
 */
export async function deleteWebhook(this: IHookFunctions): Promise<boolean> {
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
}
