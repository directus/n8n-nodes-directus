import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { SYSTEM_COLLECTION_PREFIX, SYSTEM_FIELDS } from '../../../utils/constants';
import { getCollectionsFromAPI, getFieldsFromAPI, getRelationsFromAPI } from './api';
import { shouldSkipField, formatFieldName } from './utils';
import type {
	DirectusCredentials,
	DirectusRelation,
	DirectusField,
	DirectusCollection,
	FieldRelationship,
} from '../types';

export type { DirectusCredentials };

/** Cache for collection relations to avoid repeated API calls */
const relationCache = new Map<string, DirectusRelation[]>();

function isRelationshipField(field: DirectusField): boolean {
	return field?.meta?.special?.some((s) => ['m2o', 'o2m', 'm2m', 'm2a'].includes(s)) ?? false;
}

/**
 * Gets relations for a specific collection, with caching
 * @param collection - The collection name to get relations for
 */
async function getCollectionRelations(
	functions: ILoadOptionsFunctions,
	collection: string,
): Promise<DirectusRelation[]> {
	const credentials = (await functions.getCredentials('directusApi')) as DirectusCredentials;
	const cacheKey = `${credentials.url}:${collection}`;

	if (relationCache.has(cacheKey)) {
		return relationCache.get(cacheKey)!;
	}

	try {
		const allRelations = await getRelationsFromAPI(functions);
		const collectionRelations = allRelations.filter(
			(r) => r.many_collection === collection || r.one_collection === collection,
		);
		relationCache.set(cacheKey, collectionRelations);
		return collectionRelations;
	} catch {
		return [];
	}
}

/**
 * Extracts relationship information for a field
 * Determines if a field is part of a M2O, O2M, or M2M relationship
 */
function getFieldRelationshipInfo(
	field: DirectusField,
	relations: DirectusRelation[],
): FieldRelationship | null {
	if (!field?.field || !relations?.length) return null;

	const relation = relations.find(
		(r) =>
			(r.many_field === field.field && r.many_collection === field.collection) ||
			(r.one_field === field.field && r.one_collection === field.collection),
	);

	if (!relation) return null;

	if (relation.many_field === field.field && relation.many_collection === field.collection) {
		return { type: 'm2o', relatedCollection: relation.one_collection || '' };
	}

	return { type: 'o2m', relatedCollection: relation.many_collection || '' };
}

function isSystemField(field: DirectusField): boolean {
	if (!field?.field) return false;
	return shouldSkipField(field) || SYSTEM_FIELDS.COMMON_SYSTEM_FIELDS.includes(field.field);
}

function createBaseN8nField(field: DirectusField, isCreate = false) {
	const isRequired = isCreate && (field.meta?.required ?? false);
	const displayName = field.meta?.display_name || formatFieldName(field.field);

	return {
		name: field.field,
		displayName: isRequired ? `${displayName} *` : displayName,
		type: 'string' as const,
		default: '',
		description: field.meta?.note || '',
		required: isRequired,
	};
}

function convertDirectusFieldToN8n(
	field: DirectusField,
	isCreate = false,
	relations: DirectusRelation[] = [],
) {
	if (shouldSkipField(field)) return null;

	const n8nField = createBaseN8nField(field, isCreate);
	const fieldType = field.type.toLowerCase();
	const interfaceType = field.meta?.interface?.toLowerCase() || '';

	// Choices/options field
	if (
		field.meta?.options &&
		typeof field.meta.options === 'object' &&
		'choices' in field.meta.options
	) {
		const choices = (field.meta.options.choices as Array<{ text: string; value: string }>) || [];
		return {
			...n8nField,
			type: 'options' as const,
			options: choices.map((o) => ({ name: o.text, value: o.value })),
		};
	}

	// File fields (including relationship fields pointing to files)
	const isFileField = ['file', 'file-image', 'file-video'].includes(interfaceType);
	const relationship = isRelationshipField(field)
		? getFieldRelationshipInfo(field, relations)
		: null;
	const isFileRelationship = relationship?.relatedCollection === 'directus_files';

	if (isFileField || isFileRelationship) {
		return {
			...n8nField,
			type: 'string' as const,
			description: `${n8nField.description}\nUpload a file or select from existing files.`.trim(),
		};
	}

	// Other relationship fields
	if (relationship) {
		const { type, relatedCollection } = relationship;
		return {
			...n8nField,
			type: 'string' as const,
			description:
				`${n8nField.description}\n${type.toUpperCase()} relationship to ${formatFieldName(relatedCollection)} collection.`.trim(),
		};
	}

	// JSON fields
	if (fieldType === 'json' || interfaceType === 'json') {
		return {
			...n8nField,
			type: 'string' as const,
			description: `${n8nField.description}\nEnter JSON data.`.trim(),
		};
	}

	// Type mapping for common field types
	if (['boolean', 'toggle'].includes(fieldType) || ['toggle', 'boolean'].includes(interfaceType)) {
		return { ...n8nField, type: 'boolean' as const };
	}

	if (
		['date', 'datetime', 'timestamp'].includes(fieldType) ||
		['datetime', 'date'].includes(interfaceType)
	) {
		return { ...n8nField, type: 'dateTime' as const };
	}

	if (
		['integer', 'biginteger', 'float', 'decimal'].includes(fieldType) ||
		['numeric', 'integer', 'decimal', 'float'].includes(interfaceType)
	) {
		return { ...n8nField, type: 'number' as const };
	}

	if (fieldType === 'text' || interfaceType === 'textarea') {
		return { ...n8nField, type: 'string' as const };
	}

	return n8nField;
}

async function getFields(
	functions: ILoadOptionsFunctions,
	collection: string,
): Promise<DirectusField[]> {
	try {
		const fields = await getFieldsFromAPI(functions, collection);
		fields.sort((a, b) => (a.meta?.sort ?? 0) - (b.meta?.sort ?? 0));
		return fields.filter((f) => !isSystemField(f));
	} catch (error) {
		throw new Error(
			`Failed to fetch fields for collection '${collection}': ${formatDirectusError(error)}`,
		);
	}
}

export async function getCollections(
	functions: ILoadOptionsFunctions,
): Promise<DirectusCollection[]> {
	try {
		const collections = await getCollectionsFromAPI(functions);
		return collections.filter((c) => {
			if (!c?.collection) return false;
			if (c.collection === 'directus_users' || c.collection === 'directus_files') return true;
			return !c.collection.startsWith(SYSTEM_COLLECTION_PREFIX) || c.schema;
		});
	} catch (error) {
		throw new Error(`Failed to fetch collections: ${formatDirectusError(error)}`);
	}
}

export async function convertCollectionFieldsToN8n(
	functions: ILoadOptionsFunctions,
	collection: string,
	isCreate = false,
) {
	const fields = await getFields(functions, collection);
	const hasRelationshipFields = fields.some(isRelationshipField);
	const relations = hasRelationshipFields
		? await getCollectionRelations(functions, collection)
		: [];

	return fields
		.map((field) => convertDirectusFieldToN8n(field, isCreate, relations))
		.filter((f): f is NonNullable<typeof f> => f !== null);
}

export function formatDirectusError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === 'object' && error !== null) {
		const e = error as {
			response?: { data?: { errors?: Array<{ message?: string }>; message?: string } };
			message?: string;
			errors?: Array<{ message?: string }>;
		};

		if (e.response?.data?.errors?.length) {
			return e.response.data.errors.map((x) => x.message || String(x)).join(', ');
		}
		if (e.response?.data?.message) {
			return e.response.data.message;
		}
		if (e.message) {
			return e.message;
		}
		if (e.errors?.length) {
			return e.errors.map((x) => x.message || String(x)).join(', ');
		}
	}

	return String(error) || 'An unknown error occurred';
}
