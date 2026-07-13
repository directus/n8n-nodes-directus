import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
	IHttpRequestOptions,
	IDataObject,
} from 'n8n-workflow';

import { extractDirectusErrorDetails } from './methods/api';
import { buildExecutionErrorContext, buildExecutionErrorDescription } from './methods/errorContext';
import { simplifyUser, simplifyFile } from './methods/simplify';
import { createAuthenticatedRequest } from './methods/request';
import type {
	DirectusCredentials,
	DirectusUser,
	DirectusFile,
	IRequestOptionsWithFormData,
	IExecuteFunctionsWithRequest,
} from './types';
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
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
			{
				displayName:
					'Token Permission Required: Ensure your token has the correct permissions for this resource',
				name: 'permissionWarningItem',
				type: 'notice',
				typeOptions: {
					noticeType: 'warning',
				},
				displayOptions: {
					show: {
						resource: ['item'],
					},
				},
				default: '',
			},
			{
				displayName:
					'Token Permission Required: Ensure your token has the correct permissions for this resource',
				name: 'permissionWarningUser',
				type: 'notice',
				typeOptions: {
					noticeType: 'warning',
				},
				displayOptions: {
					show: {
						resource: ['user'],
					},
				},
				default: '',
			},
			{
				displayName:
					'Token Permission Required: Ensure your token has the correct permissions for this resource',
				name: 'permissionWarningFile',
				type: 'notice',
				typeOptions: {
					noticeType: 'warning',
				},
				displayOptions: {
					show: {
						resource: ['file'],
					},
				},
				default: '',
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
		const credentials = (await this.getCredentials('directusApi')) as DirectusCredentials;

		for (let i = 0; i < items.length; i++) {
			let resource = 'unknown';
			let operation = 'unknown';
			let collection: string | undefined;

			try {
				resource = this.getNodeParameter('resource', i) as string;
				operation = this.getNodeParameter('operation', i) as string;

				const getRequestOptions = createAuthenticatedRequest(credentials);
				const makeRequest = async (
					options: IHttpRequestOptions & { formData?: Record<string, unknown> },
				) => {
					const requestOptions = getRequestOptions(options);
					// Check if this is a formData upload (for file uploads)
					const hasFormData = 'formData' in options && options.formData !== undefined;
					if (hasFormData) {
						// Use helpers.request for formData uploads (httpRequest doesn't handle it properly)
						const helpersWithRequest = this as IExecuteFunctionsWithRequest;
						return await helpersWithRequest.helpers.request({
							...requestOptions,
							formData: options.formData,
						} as IRequestOptionsWithFormData);
					}
					return await this.helpers.httpRequest(requestOptions);
				};

				let responseData: unknown;

				// Dispatch to appropriate resource handler
				if (resource === 'item') {
					collection = this.getNodeParameter('collection', i) as string;
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

				let parsedResponse: unknown = responseData;
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
						processedData = itemData.map((item) => {
							return resource === 'user'
								? simplifyUser(item as DirectusUser)
								: simplifyFile(item as DirectusFile);
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
				const directusErrorDetails = extractDirectusErrorDetails(error);
				const errorDetails = buildExecutionErrorContext({
					itemIndex: i,
					resource,
					operation,
					collection,
					errorDetails: directusErrorDetails,
				});

				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: errorDetails.message,
							errorDetails,
						},
						pairedItem: { item: i },
					});
				} else {
					const description = buildExecutionErrorDescription(errorDetails);

					throw new NodeOperationError(this.getNode(), `[Item ${i}] ${errorDetails.message}`, {
						itemIndex: i,
						description,
					});
				}
			}
		}

		return [returnData];
	}
}
