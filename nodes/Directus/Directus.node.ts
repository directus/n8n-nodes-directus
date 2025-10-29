import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IHttpRequestOptions,
	IDataObject,
} from 'n8n-workflow';

import { formatDirectusError } from './methods/fields';
import { itemOperations } from './resources/item/item.operations';
import { userOperations } from './resources/user/user.operations';
import { fileOperations } from './resources/file/file.operations';
import { itemFields } from './resources/item/item.fields';
import { userFields } from './resources/user/user.fields';
import { fileFields } from './resources/file/file.fields';
import { sharedFields } from './resources/sharedFields';
import { executeItemOperations } from './resources/item/item.execute';
import { executeUserOperations } from './resources/user/user.execute';
import { executeFileOperations } from './resources/file/file.execute';
import {
	getCollectionsLoadOptions,
	getCollectionFieldsLoadOptions,
	getRolesLoadOptions,
	getUserFieldsLoadOptions,
	getFileFieldsLoadOptions,
} from './methods/loadOptions';

export class Directus implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Directus',
		name: 'directus',
		icon: 'file:directus.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Directus API',
		defaults: {
			name: 'Directus',
		},
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [
			{
				name: 'directusApi',
				required: true,
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
			...itemOperations,
			...userOperations,
			...fileOperations,
			...itemFields,
			...userFields,
			...fileFields,
			...sharedFields,
		],
	};

	methods = {
		loadOptions: {
			getCollections: getCollectionsLoadOptions,
			getCollectionFields: getCollectionFieldsLoadOptions,
			getRoles: getRolesLoadOptions,
			getUserFields: getUserFieldsLoadOptions,
			getFileFields: getFileFieldsLoadOptions,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = (await this.getCredentials('directusApi')) as {
			url: string;
			token: string;
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				// Helper function to make authenticated requests
				const makeRequest = async (options: IHttpRequestOptions) => {
					return await this.helpers.httpRequest({
						...options,
						baseURL: credentials.url,
						headers: {
							Authorization: `Bearer ${credentials.token}`,
							'Content-Type': 'application/json',
							Accept: 'application/json',
							...options.headers,
						},
					});
				};

				let responseData: unknown;

				// Dispatch to appropriate resource handler
				if (resource === 'item') {
					const collection = this.getNodeParameter('collection', i) as string;
					responseData = await executeItemOperations.call(
						this,
						operation,
						collection,
						i,
						makeRequest,
					);
				} else if (resource === 'user') {
					responseData = await executeUserOperations.call(this, operation, i, makeRequest);
				} else if (resource === 'file') {
					responseData = await executeFileOperations.call(this, operation, i, makeRequest);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
				}

				let parsedResponse = responseData;
				if (typeof responseData === 'string') {
					try {
						parsedResponse = JSON.parse(responseData);
					} catch {
						parsedResponse = responseData;
					}
				}

				const itemData = (parsedResponse as { data?: unknown })?.data || parsedResponse;

				// Apply simplification if requested (for users and files)
				let processedData = itemData;
				if (resource === 'user' || resource === 'file') {
					const simplify = this.getNodeParameter('simplify', i, false) as boolean;
					if (simplify && Array.isArray(itemData)) {
						processedData = itemData.map((item: Record<string, unknown>) => {
							if (resource === 'user') {
								// Return only essential fields for simplified user output
								const result: Record<string, unknown> = { id: item.id };
								if (item.email) result.email = item.email;
								if (item.first_name) result.first_name = item.first_name;
								if (item.last_name) result.last_name = item.last_name;
								if (item.status) result.status = item.status;
								if (item.role) result.role = item.role;
								if (item.date_created) result.date_created = item.date_created;
								if (item.last_access) result.last_access = item.last_access;
								return result;
							} else if (resource === 'file') {
								// Return only essential fields for simplified file output
								const result: Record<string, unknown> = { id: item.id };
								if (item.filename_download) result.filename_download = item.filename_download;
								if (item.title) result.title = item.title;
								if (item.type) result.type = item.type;
								if (item.filesize) result.filesize = item.filesize;
								if (item.width) result.width = item.width;
								if (item.height) result.height = item.height;
								if (item.date_created) result.date_created = item.date_created;
								if (item.date_updated) result.date_updated = item.date_updated;
								return result;
							}
							return item;
						});
					}
				}

				if (Array.isArray(processedData)) {
					for (const item of processedData) {
						returnData.push({ json: item, pairedItem: { item: i } });
					}
				} else {
					returnData.push({ json: processedData as IDataObject, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error instanceof Error ? error.message : String(error) },
						pairedItem: { item: i },
					});
				} else {
					throw new NodeOperationError(this.getNode(), formatDirectusError(error));
				}
			}
		}

		return [returnData];
	}
}
