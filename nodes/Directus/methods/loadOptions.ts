import { ILoadOptionsFunctions, NodeOperationError } from 'n8n-workflow';
import {
	getCollections,
	convertCollectionFieldsToN8n,
	shouldSkipFieldPublic as shouldSkipField,
	formatDisplayName,
	type Field,
} from './fields';
import { getFieldsFromAPI, getRolesFromAPI } from './api';
import { SYSTEM_FIELDS } from '../../../utils/constants';

export async function getCollectionsLoadOptions(
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
}

export async function getCollectionFieldsLoadOptions(
	this: ILoadOptionsFunctions,
): Promise<Array<{ name: string; value: string }>> {
	try {
		const collection = this.getCurrentNodeParameter('collection') as string;
		const operation = this.getCurrentNodeParameter('operation') as string;

		if (!collection) {
			throw new NodeOperationError(this.getNode(), 'Collection parameter is required');
		}

		const fields = await convertCollectionFieldsToN8n(this, collection, operation === 'create');
		return fields
			.map((field) => ({
				name: field?.displayName || '',
				value: field?.name || '',
				description: field?.description || '',
			}))
			.filter((f) => f.name && f.value);
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to load fields: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

export async function getRolesLoadOptions(
	this: ILoadOptionsFunctions,
): Promise<Array<{ name: string; value: string }>> {
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
}

function createFieldLoadOptions(
	fields: Field[],
	excludedFields: string[],
): Array<{ name: string; value: string; description: string }> {
	return fields
		.filter((field) => !shouldSkipField(field) && !excludedFields.includes(field.field))
		.map((field) => {
			const displayName = formatDisplayName(field);
			const isRequired = field.meta?.required ?? false;

			return {
				name: isRequired ? `${displayName} *` : displayName,
				value: field.field,
				description: field.meta?.note || '',
			};
		});
}

export async function getUserFieldsLoadOptions(
	this: ILoadOptionsFunctions,
): Promise<Array<{ name: string; value: string }>> {
	try {
		const fields = await getFieldsFromAPI(this, 'directus_users');
		const excludedFields = [
			...SYSTEM_FIELDS.COMMON_SYSTEM_FIELDS,
			...SYSTEM_FIELDS.USER_SPECIFIC_FIELDS,
		];
		return createFieldLoadOptions(fields, excludedFields);
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to load user fields: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

export async function getFileFieldsLoadOptions(
	this: ILoadOptionsFunctions,
): Promise<Array<{ name: string; value: string }>> {
	try {
		const fields = await getFieldsFromAPI(this, 'directus_files');
		const excludedFields = [
			...SYSTEM_FIELDS.COMMON_SYSTEM_FIELDS,
			...SYSTEM_FIELDS.FILE_SPECIFIC_FIELDS,
		];
		return createFieldLoadOptions(fields, excludedFields);
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to load file fields: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
