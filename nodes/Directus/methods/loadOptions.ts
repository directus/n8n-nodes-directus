import { ILoadOptionsFunctions, NodeOperationError } from 'n8n-workflow';
import { getCollections, convertCollectionFieldsToN8n } from './fields';
import { getFieldsFromAPI, getRolesFromAPI } from './api';
import { SYSTEM_FIELDS } from '../../../utils/constants';
import { shouldSkipField, formatFieldName } from './utils';
import type { DirectusField } from '../types';

function handleLoadOptionsError(
	functions: ILoadOptionsFunctions,
	error: unknown,
	resource: string,
): never {
	const message = error instanceof Error ? error.message : String(error);
	throw new NodeOperationError(functions.getNode(), `Failed to load ${resource}: ${message}`);
}

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
		handleLoadOptionsError(this, error, 'collections');
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
				name: field.displayName || '',
				value: field.name || '',
				description: field.description || '',
			}))
			.filter((f) => f.name && f.value);
	} catch (error) {
		handleLoadOptionsError(this, error, 'fields');
	}
}

export async function getRolesLoadOptions(
	this: ILoadOptionsFunctions,
): Promise<Array<{ name: string; value: string }>> {
	try {
		const roles = await getRolesFromAPI(this);
		return roles.map((role) => ({
			name: role.name || role.id,
			value: role.id,
		}));
	} catch (error) {
		handleLoadOptionsError(this, error, 'roles');
	}
}

function createFieldLoadOptions(
	fields: DirectusField[],
	additionalExcludedFields: string[] = [],
): Array<{ name: string; value: string; description: string }> {
	const excludedFields = new Set([
		...SYSTEM_FIELDS.COMMON_SYSTEM_FIELDS,
		...additionalExcludedFields,
	]);

	return fields
		.filter((field) => !shouldSkipField(field) && !excludedFields.has(field.field))
		.map((field) => {
			const displayName = field.meta?.display_name || formatFieldName(field.field);
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
		return createFieldLoadOptions(fields, SYSTEM_FIELDS.USER_SPECIFIC_FIELDS);
	} catch (error) {
		handleLoadOptionsError(this, error, 'user fields');
	}
}

export async function getFileFieldsLoadOptions(
	this: ILoadOptionsFunctions,
): Promise<Array<{ name: string; value: string }>> {
	try {
		const fields = await getFieldsFromAPI(this, 'directus_files');
		return createFieldLoadOptions(fields, SYSTEM_FIELDS.FILE_SPECIFIC_FIELDS);
	} catch (error) {
		handleLoadOptionsError(this, error, 'file fields');
	}
}
