import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	ILoadOptionsFunctions,
	IHttpRequestOptions,
	IDataObject,
} from 'n8n-workflow';

import {
	getCollections,
	formatDirectusError,
	convertCollectionFieldsToN8n,
	processFieldValue,
	shouldSkipField,
	formatDisplayName,
} from '../../src/utils/directus';
import { getFieldsFromAPI, getRolesFromAPI } from '../../src/utils/api';
import { SYSTEM_FIELDS } from '../../src/utils/constants';
import { directusFields } from './DirectusDescription';

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
		properties: directusFields,
	};

	methods = {
		loadOptions: {
			async getCollections(
				this: ILoadOptionsFunctions,
			): Promise<Array<{ name: string; value: string }>> {
				try {
					const collections = await getCollections(this);
					return collections.map((collection) => ({
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
			async getCollectionFields(
				this: ILoadOptionsFunctions,
			): Promise<Array<{ name: string; value: string }>> {
				try {
					const collection = this.getCurrentNodeParameter('collection') as string;
					const operation = this.getCurrentNodeParameter('operation') as string;
					const isCreate = operation === 'create';

					if (!collection) {
						throw new NodeOperationError(this.getNode(), 'Collection parameter is required');
					}

					const fields = await convertCollectionFieldsToN8n(this, collection, isCreate);
					return fields.map((field) => ({
						name: field.displayName,
						value: field.name,
						description: field.description || '',
					}));
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to load fields: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			},
			async getRoles(this: ILoadOptionsFunctions): Promise<Array<{ name: string; value: string }>> {
				try {
					const roles = await getRolesFromAPI(this);
					return roles.map((role: { name?: string; id: string }) => ({
						name: role.name || role.id,
						value: role.id,
					}));
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to load roles: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			},
			async getUserFields(
				this: ILoadOptionsFunctions,
			): Promise<Array<{ name: string; value: string }>> {
				try {
					const fields = await getFieldsFromAPI(this, 'directus_users');
					const systemFields = [
						...SYSTEM_FIELDS.COMMON_SYSTEM_FIELDS,
						...SYSTEM_FIELDS.USER_SPECIFIC_FIELDS,
					];
					const editableFields = fields.filter((field) => !shouldSkipField(field));

					return editableFields
						.filter((field) => !systemFields.includes(field.field))
						.map((field) => {
							const displayName = formatDisplayName(field);
							const isRequired = field.meta?.required ?? false;

							return {
								name: isRequired ? `${displayName} *` : displayName,
								value: field.field,
								description: field.meta?.note || '',
							};
						});
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to load user fields: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			},
			async getFileFields(
				this: ILoadOptionsFunctions,
			): Promise<Array<{ name: string; value: string }>> {
				try {
					const fields = await getFieldsFromAPI(this, 'directus_files');
					const systemFields = [
						...SYSTEM_FIELDS.COMMON_SYSTEM_FIELDS,
						...SYSTEM_FIELDS.FILE_SPECIFIC_FIELDS,
					];
					const editableFields = fields.filter((field) => !shouldSkipField(field));

					return editableFields
						.filter((field) => !systemFields.includes(field.field))
						.map((field) => {
							const displayName = formatDisplayName(field);
							const isRequired = field.meta?.required ?? false;

							return {
								name: isRequired ? `${displayName} *` : displayName,
								value: field.field,
								description: field.meta?.note || '',
							};
						});
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to load file fields: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			},
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

				if (resource === 'item') {
					const collection = this.getNodeParameter('collection', i) as string;

					switch (operation) {
						case 'create': {
							const collectionFields = this.getNodeParameter('collectionFields', i) as {
								fields?: { field?: Array<{ name: string; value: unknown }> };
							};
							const inputData = items[i].json;

							const body: Record<string, unknown> =
								inputData.payload && typeof inputData.payload === 'object'
									? (inputData.payload as Record<string, unknown>)
									: (inputData as Record<string, unknown>);

							if (collectionFields?.fields?.field) {
								for (const field of collectionFields.fields.field) {
									if (field.name && field.value !== undefined) {
										body[field.name] = processFieldValue(field.value);
									}
								}
							}

							responseData = await makeRequest({
								method: 'POST',
								url: `/items/${collection}`,
								body,
							});
							break;
						}

						case 'createRaw': {
							const jsonData = this.getNodeParameter('jsonData', i) as string;
							let body;
							try {
								body = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
							} catch {
								throw new NodeOperationError(this.getNode(), 'Invalid JSON format');
							}
							responseData = await makeRequest({
								method: 'POST',
								url: `/items/${collection}`,
								body,
							});
							break;
						}

						case 'update': {
							const itemId = this.getNodeParameter('itemId', i) as string;
							const collectionFields = this.getNodeParameter('collectionFields', i) as {
								fields?: { field?: Array<{ name: string; value: unknown }> };
							};
							const inputData = items[i].json;

							const body: Record<string, unknown> =
								inputData.payload && typeof inputData.payload === 'object'
									? (inputData.payload as Record<string, unknown>)
									: (inputData as Record<string, unknown>);

							if (collectionFields?.fields?.field) {
								for (const field of collectionFields.fields.field) {
									if (field.name && field.value !== undefined) {
										body[field.name] = processFieldValue(field.value);
									}
								}
							}

							responseData = await makeRequest({
								method: 'PATCH',
								url: `/items/${collection}/${itemId}`,
								body,
							});
							break;
						}

						case 'updateRaw': {
							const itemId = this.getNodeParameter('itemId', i) as string;
							const jsonData = this.getNodeParameter('jsonData', i) as string;
							let body;
							try {
								body = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
							} catch {
								throw new NodeOperationError(this.getNode(), 'Invalid JSON format');
							}
							responseData = await makeRequest({
								method: 'PATCH',
								url: `/items/${collection}/${itemId}`,
								body,
							});
							break;
						}

						case 'delete': {
							const itemId = this.getNodeParameter('itemId', i) as string;
							await makeRequest({
								method: 'DELETE',
								url: `/items/${collection}/${itemId}`,
							});
							responseData = { deleted: true, id: itemId };
							break;
						}

						case 'get': {
							const itemId = this.getNodeParameter('itemId', i) as string;
							responseData = await makeRequest({
								method: 'GET',
								url: `/items/${collection}/${itemId}`,
							});
							break;
						}

						case 'getAll': {
							const returnAll = this.getNodeParameter('returnAll', i) as boolean;
							const limit = this.getNodeParameter('limit', i, 50) as number;
							responseData = await makeRequest({
								method: 'GET',
								url: `/items/${collection}`,
								qs: returnAll ? {} : { limit },
							});
							break;
						}

						default:
							throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
					}
				} else if (resource === 'user') {
					switch (operation) {
						case 'invite': {
							const email = this.getNodeParameter('email', i) as string;
							const role = this.getNodeParameter('role', i) as string;
							const invite_url = this.getNodeParameter('invite_url', i) as string;

							if (!email) {
								throw new NodeOperationError(
									this.getNode(),
									'Email is required for user invitation',
								);
							}

							const body: Record<string, unknown> = { email };
							if (role) body.role = role;
							if (invite_url) body.invite_url = invite_url;

							responseData = await makeRequest({
								method: 'POST',
								url: '/users/invite',
								body,
							});

							responseData = {
								success: true,
								message: 'User invitation sent successfully',
								email,
								status: 'invited',
								...(responseData as Record<string, unknown>),
							};
							break;
						}

						case 'update': {
							const userId = this.getNodeParameter('userId', i) as string;
							const userFields = this.getNodeParameter('userFields', i) as {
								fields?: { field?: Array<{ name: string; value: unknown }> };
							};
							const inputData = items[i].json;

							const body: Record<string, unknown> =
								inputData.payload && typeof inputData.payload === 'object'
									? (inputData.payload as Record<string, unknown>)
									: (inputData as Record<string, unknown>);

							if (userFields?.fields?.field) {
								for (const field of userFields.fields.field) {
									if (field.name && field.value !== undefined) {
										body[field.name] = processFieldValue(field.value);
									}
								}
							}

							responseData = await makeRequest({
								method: 'PATCH',
								url: `/users/${userId}`,
								body,
							});
							break;
						}

						case 'delete': {
							const userId = this.getNodeParameter('userId', i) as string;
							await makeRequest({
								method: 'DELETE',
								url: `/users/${userId}`,
							});
							responseData = { deleted: true, id: userId };
							break;
						}

						case 'get': {
							const userId = this.getNodeParameter('userId', i) as string;
							responseData = await makeRequest({
								method: 'GET',
								url: `/users/${userId}`,
							});
							break;
						}

						case 'getAll': {
							const returnAll = this.getNodeParameter('returnAll', i) as boolean;
							const limit = this.getNodeParameter('limit', i, 50) as number;
							responseData = await makeRequest({
								method: 'GET',
								url: '/users',
								qs: returnAll ? {} : { limit },
							});
							break;
						}

						default:
							throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
					}
				} else if (resource === 'file') {
					switch (operation) {
						case 'upload': {
							const file = this.getNodeParameter('file', i) as string;
							const title = this.getNodeParameter('title', i) as string;
							const description = this.getNodeParameter('description', i) as string;
							const folder = this.getNodeParameter('folder', i) as string;

							if (!file) {
								throw new NodeOperationError(this.getNode(), 'File is required for upload');
							}

							const body: Record<string, unknown> = { file };
							if (title) body.title = title;
							if (description) body.description = description;
							if (folder) body.folder = folder;

							responseData = await makeRequest({
								method: 'POST',
								url: '/files',
								body,
							});
							break;
						}

						case 'update': {
							const fileId = this.getNodeParameter('fileId', i) as string;
							const fileFields = this.getNodeParameter('fileFields', i) as {
								fields?: { field?: Array<{ name: string; value: unknown }> };
							};
							const inputData = items[i].json;

							const body: Record<string, unknown> =
								inputData.payload && typeof inputData.payload === 'object'
									? (inputData.payload as Record<string, unknown>)
									: (inputData as Record<string, unknown>);

							if (fileFields?.fields?.field) {
								for (const field of fileFields.fields.field) {
									if (field.name && field.value !== undefined) {
										body[field.name] = processFieldValue(field.value);
									}
								}
							}

							responseData = await makeRequest({
								method: 'PATCH',
								url: `/files/${fileId}`,
								body,
							});
							break;
						}

						case 'delete': {
							const fileId = this.getNodeParameter('fileId', i) as string;
							await makeRequest({
								method: 'DELETE',
								url: `/files/${fileId}`,
							});
							responseData = { deleted: true, id: fileId };
							break;
						}

						case 'get': {
							const fileId = this.getNodeParameter('fileId', i) as string;
							responseData = await makeRequest({
								method: 'GET',
								url: `/files/${fileId}`,
							});
							break;
						}

						case 'getAll': {
							const returnAll = this.getNodeParameter('returnAll', i) as boolean;
							const limit = this.getNodeParameter('limit', i, 50) as number;
							responseData = await makeRequest({
								method: 'GET',
								url: '/files',
								qs: returnAll ? {} : { limit },
							});
							break;
						}

						default:
							throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
					}
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
