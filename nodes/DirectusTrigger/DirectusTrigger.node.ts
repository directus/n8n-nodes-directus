import {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeConnectionTypes,
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
		outputs: [NodeConnectionTypes.Main],
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
						name: 'File',
						value: 'file',
					},
					{
						name: 'Item',
						value: 'item',
					},
					{
						name: 'User',
						value: 'user',
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
						name: 'Deleted',
						value: 'delete',
					},
					{
						name: 'Updated',
						value: 'update',
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
				return checkExists.call(this);
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return create.call(this);
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return deleteWebhook.call(this);
			},
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
