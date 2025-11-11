import {
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import { checkExists, create, deleteWebhook } from './methods/webhookMethods';
import { getCollectionsLoadOptions } from './methods/loadOptions';
import { handleWebhook } from './methods/webhookHandler';

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
			checkExists,
			create,
			delete: deleteWebhook,
		},
	};

	methods = {
		loadOptions: {
			getCollections: getCollectionsLoadOptions,
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		return handleWebhook.call(this);
	}
}
