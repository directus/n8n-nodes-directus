import { ILoadOptionsFunctions, NodeOperationError } from 'n8n-workflow';
import { getCollections, convertCollectionFieldsToN8n } from './fields';
import { getFieldsFromAPI, getRolesFromAPI } from './api';
import { formatFieldName } from './utils';

function handleLoadOptionsError(
	functions: ILoadOptionsFunctions,
	error: unknown,
	resource: string,
): never {
	const message = error instanceof Error ? error.message : String(error);

	// Check if this is a permission error (api.ts throws this message)
	if (message.includes('Permission error:')) {
		throw new NodeOperationError(
			functions.getNode(),
			`Permission error: Token does not have access to ${resource}.`,
		);
	}

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
): Promise<Array<{ name: string; value: string; description?: string }>> {
	try {
		const collection = this.getCurrentNodeParameter('collection') as string;
		const operation = this.getCurrentNodeParameter('operation') as string;

		if (!collection) {
			return [];
		}

		// Fetch raw fields and converted fields in parallel for better performance
		const [rawFields, convertedFields] = await Promise.all([
			getFieldsFromAPI(this, collection),
			convertCollectionFieldsToN8n(this, collection),
		]);

		// Create a map for description fallback
		const fieldMap = new Map(rawFields.map((f) => [f.field, f]));

		const isCreateOrUpdate = operation === 'create' || operation === 'update';

		return convertedFields
			.map((field) => {
				const rawField = fieldMap.get(field.name);
				const isRequired = rawField?.meta?.required ?? false;
				const displayName = field.displayName || '';

				// Only show asterisk for required fields on create/update operations
				const finalDisplayName =
					isCreateOrUpdate && isRequired
						? `${displayName.replace(' *', '')} *`
						: displayName.replace(' *', '');

				return {
					name: finalDisplayName,
					value: field.name || '',
					description: field.description || rawField?.meta?.note || '',
					rawField,
				};
			})
			.filter((f) => {
				if (!f.name || !f.value) return false;

				const fieldName = f.value.toLowerCase();
				const displayName = f.name.toLowerCase();
				const isIdField = fieldName === 'id';

				// Handle id field specially: available for get operations, filtered for create/update
				if (isIdField) {
					return !isCreateOrUpdate;
				}

				// Skip if we don't have rawField data
				if (!f.rawField) {
					return false;
				}

				// Filter out hidden fields
				if (f.rawField.meta?.hidden) {
					return false;
				}

				// Filter out readonly fields for update operations
				if (operation === 'update' && f.rawField.meta?.readonly) {
					return false;
				}

				// Filter out fields with "meta" in the name
				if (displayName.includes('meta') || fieldName.includes('meta')) {
					return false;
				}

				return true;
			})
			.map((option) => ({
				name: option.name,
				value: option.value,
				description: option.description,
			}));
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

export async function getUserFieldsLoadOptions(
	this: ILoadOptionsFunctions,
): Promise<Array<{ name: string; value: string; description?: string }>> {
	try {
		const fields = await getFieldsFromAPI(this, 'directus_users');
		fields.sort((a, b) => (a.meta?.sort ?? 0) - (b.meta?.sort ?? 0));

		// fields we never want to show for users
		const HIDDEN_FIELDS = new Set([
			'token',
			'password',
			'provider',
			'external_identifier',
			'auth_data',
			'tfa_secret',
			'admin_divider',
			'preferences_divider',
			'theming_divider',
		]);

		return fields
			.filter((field) => field?.field && !HIDDEN_FIELDS.has(field.field))
			.map((field) => ({
				name: field.meta?.display_name || formatFieldName(field.field),
				value: field.field,
				description: field.meta?.note || '',
			}));
	} catch (error) {
		handleLoadOptionsError(this, error, 'user fields');
	}
}

export async function getFileFieldsLoadOptions(
	this: ILoadOptionsFunctions,
): Promise<Array<{ name: string; value: string }>> {
	try {
		const fields = await getFieldsFromAPI(this, 'directus_files');
		fields.sort((a, b) => (a.meta?.sort ?? 0) - (b.meta?.sort ?? 0));

		return fields
			.filter((field) => {
				if (!field.field) return false;
				const fieldName = field.field.toLowerCase();

				// Remove fields with "tus" in the name
				if (fieldName.includes('tus')) return false;

				return true;
			})
			.map((field) => ({
				name: field.meta?.display_name || formatFieldName(field.field),
				value: field.field,
				description: field.meta?.note || '',
			}));
	} catch (error) {
		handleLoadOptionsError(this, error, 'file fields');
	}
}
