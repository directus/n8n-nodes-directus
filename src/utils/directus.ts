export interface Field {
	field: string;
	type: string;
	collection?: string;
	meta?: {
		special?: string[];
		sort?: number;
		required?: boolean;
		note?: string;
		options?: {
			choices?: Array<{ text: string; value: string }>;
			[key: string]: any;
		};
		interface?: string;
		locked?: boolean;
		hidden?: boolean;
		translations?: Array<{ translation: string; [key: string]: any }>;
		display_name?: string;
	};
	schema?: {
		foreign_key_table?: string;
	};
}

export interface Collection {
	collection: string;
	schema?: any;
	meta?: {
		translations?: Array<{ translation: string; [key: string]: any }>;
		display_template?: string;
	};
}

import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { formatTitle as formatTitleUtil, createEnhancedItemLabel } from './format-title';
import {
	FALLBACK_DISPLAY_FIELDS,
	SYSTEM_COLLECTION_PREFIX,
	SYSTEM_FIELDS,
	FIELD_TYPE_MAPPINGS,
} from './constants';
import {
	DirectusCredentials,
	getCollectionsFromAPI,
	getFieldsFromAPI,
	getRelationsFromAPI,
} from './api';

// Re-export for convenience
export { createEnhancedItemLabel, FALLBACK_DISPLAY_FIELDS };
export type { DirectusCredentials };

// Cache for relations to avoid repeated API calls
export const relationCache = new Map<string, any[]>();

interface RelationshipInfo {
	type: string;
	relatedCollection: string;
	isMultiSelect: boolean;
}

// Check if a field is a relationship field
export function isRelationshipField(field: Field): boolean {
	if (!field || !field.meta) return false;
	const special = field.meta?.special || [];
	return (
		special.includes('m2o') ||
		special.includes('o2m') ||
		special.includes('m2m') ||
		special.includes('m2a')
	);
}

// Get collection relations
export async function getCollectionRelations(
	functions: ILoadOptionsFunctions,
	collection: string,
): Promise<any[]> {
	const credentials = (await functions.getCredentials('directusApi')) as DirectusCredentials;
	const cacheKey = `${credentials.url}:${collection}`;

	if (relationCache.has(cacheKey)) {
		return relationCache.get(cacheKey)!;
	}

	try {
		const allRelations = await getRelationsFromAPI(functions);

		// Filter relations for this specific collection
		const collectionRelations = allRelations.filter(
			(relation: any) =>
				relation.many_collection === collection || relation.one_collection === collection,
		);

		relationCache.set(cacheKey, collectionRelations);
		return collectionRelations;
	} catch {
		return [];
	}
}

// Get relationship information for a specific field
export function getFieldRelationshipInfo(field: Field, relations: any[]): RelationshipInfo | null {
	if (!field || !field.field || !relations || !Array.isArray(relations)) {
		return null;
	}

	// Find the relation where this field is either the many_field or one_field
	const fieldRelation = relations.find(
		(relation: any) =>
			(relation.many_field === field.field && relation.many_collection === field.collection) ||
			(relation.one_field === field.field && relation.one_collection === field.collection),
	);

	if (!fieldRelation) {
		return null;
	}

	// Determine relationship type and related collection
	if (
		fieldRelation.many_field === field.field &&
		fieldRelation.many_collection === field.collection
	) {
		// This field is the "many" side - M2O relationship
		return {
			type: 'm2o',
			relatedCollection: fieldRelation.one_collection,
			isMultiSelect: false,
		};
	} else if (
		fieldRelation.one_field === field.field &&
		fieldRelation.one_collection === field.collection
	) {
		// This field is the "one" side - O2M relationship
		return {
			type: 'o2m',
			relatedCollection: fieldRelation.many_collection,
			isMultiSelect: true,
		};
	}

	return null;
}

// Check if field should be skipped
export function shouldSkipField(field: Field): boolean {
	if (!field || !field.meta) {
		return true;
	}
	const special = field.meta?.special || [];

	if (special.includes('m2a')) {
		return true;
	}

	if ((field.meta as any)?.locked) {
		return true;
	}

	if ((field.meta as any)?.hidden) {
		return true;
	}

	return false;
}

// Create base n8n field
export function createBaseN8nField(field: Field, isCreate = false): any {
	// Only mark as required during create operations
	const isRequired = isCreate && (field.meta?.required ?? false);
	const displayName = formatTitleUtil(field.field);

	return {
		name: field.field,
		displayName: isRequired ? `${displayName} *` : displayName,
		type: 'string',
		default: '',
		description: field.meta?.note || '',
		required: isRequired,
	};
}

// Create file field
export function createFileField(n8nField: any): any {
	return {
		...n8nField,
		type: 'string',
		description: `${n8nField.description}\nUpload a file or select from existing files.`.trim(),
	};
}

export function isSystemField(field: Field, isCreate = false): boolean {
	if (!field || !field.field) return false;

	if (field.meta?.special?.includes('m2a')) return true;
	if (field.type === 'alias') return true;
	if (field.field.startsWith('$')) return true;

	// In create mode, 'id' should not be considered a system field
	if (!isCreate && field.field === 'id') {
		return true;
	}

	if (SYSTEM_FIELDS.COMMON.includes(field.field)) {
		return true;
	}

	return false;
}

export async function getCollections(functions: ILoadOptionsFunctions): Promise<Collection[]> {
	try {
		const collections = await getCollectionsFromAPI(functions);

		return collections.filter((collection: Collection) => {
			if (!collection || !collection.collection) return false;
			if (collection.collection === 'directus_users' || collection.collection === 'directus_files')
				return true;
			return !collection.collection.startsWith(SYSTEM_COLLECTION_PREFIX) || !collection.schema;
		});
	} catch (error) {
		throw new Error(`Failed to fetch collections: ${formatDirectusError(error)}`);
	}
}

export async function getFields(
	functions: ILoadOptionsFunctions,
	collection: string,
	isCreate = false,
): Promise<Field[]> {
	try {
		const fields: Field[] = await getFieldsFromAPI(functions, collection);
		fields.sort((a: Field, b: Field) => (a.meta?.sort ?? 0) - (b.meta?.sort ?? 0));

		return fields.filter((field: Field) => !isSystemField(field, isCreate));
	} catch (error) {
		throw new Error(
			`Failed to fetch fields for collection '${collection}': ${formatDirectusError(error)}`,
		);
	}
}

// Remove duplicate function - use formatTitleUtil from format-title.ts

export function getN8nFieldType(field: Field): string {
	return FIELD_TYPE_MAPPINGS[field.type] || 'string';
}

// Convert a Directus field to a n8n field configuration
export function convertDirectusFieldToN8n(field: Field, isCreate = false): any | null {
	if (shouldSkipField(field)) {
		return null;
	}

	const n8nField = createBaseN8nField(field, isCreate);

	// Handle choice fields
	if (field.meta?.options?.choices) {
		return {
			...n8nField,
			type: 'options',
			options: field.meta.options.choices.reduce(
				(acc: Array<{ name: string; value: string }>, option: any) => {
					acc.push({ name: option.text, value: option.value });
					return acc;
				},
				[],
			),
		};
	}

	// Handle file fields
	if (
		field.meta?.interface === 'file' ||
		field.meta?.interface === 'file-image' ||
		field.meta?.interface === 'file-video'
	) {
		return createFileField(n8nField);
	}

	// Handle boolean fields
	if (
		field.type === 'boolean' ||
		field.meta?.interface === 'toggle' ||
		field.meta?.interface === 'boolean'
	) {
		return {
			...n8nField,
			type: 'boolean',
		};
	}

	// Handle date/time fields
	if (
		field.type === 'date' ||
		field.type === 'dateTime' ||
		field.type === 'timestamp' ||
		field.meta?.interface === 'datetime' ||
		field.meta?.interface === 'date'
	) {
		return {
			...n8nField,
			type: 'dateTime',
		};
	}

	// Handle numeric fields
	if (
		field.type === 'integer' ||
		field.type === 'bigInteger' ||
		field.meta?.interface === 'numeric' ||
		field.meta?.interface === 'integer'
	) {
		return {
			...n8nField,
			type: 'number',
		};
	}

	if (
		field.type === 'float' ||
		field.type === 'decimal' ||
		field.meta?.interface === 'decimal' ||
		field.meta?.interface === 'float'
	) {
		return {
			...n8nField,
			type: 'number',
		};
	}

	// Handle text fields
	if (field.type === 'text' || field.meta?.interface === 'textarea') {
		return {
			...n8nField,
			type: 'string',
		};
	}

	// Handle JSON fields
	if (field.type === 'json' || field.meta?.interface === 'json') {
		return {
			...n8nField,
			type: 'string',
			description: `${n8nField.description}\nEnter JSON data.`.trim(),
		};
	}

	// Default to string
	return n8nField;
}

// Convert fields for a collection with relationship handling
export async function convertCollectionFieldsToN8n(
	functions: ILoadOptionsFunctions,
	collection: string,
	isCreate = false,
): Promise<any[]> {
	const fields = await getFields(functions, collection, isCreate);

	// Only fetch relations if we have relationship fields
	const hasRelationshipFields = fields.some(isRelationshipField);
	let relations: any[] = [];

	if (hasRelationshipFields) {
		relations = await getCollectionRelations(functions, collection);
	}

	const convertedFields = fields.map((field) => {
		if (shouldSkipField(field)) {
			return null;
		}

		const n8nField = createBaseN8nField(field, isCreate);

		if (isRelationshipField(field)) {
			const relationship = getFieldRelationshipInfo(field, relations);

			if (relationship) {
				const { type, relatedCollection } = relationship;

				if (relatedCollection === 'directus_files') {
					return createFileField(n8nField);
				}

				return {
					...n8nField,
					type: 'string',
					description:
						`${n8nField.description}\n${type.toUpperCase()} relationship to ${formatTitleUtil(
							relatedCollection,
						)} collection.`.trim(),
				};
			}
		}

		return convertDirectusFieldToN8n(field, isCreate);
	});

	return convertedFields.filter(Boolean) as any[];
}

export function processFieldValue(value: any): any {
	if (value === undefined || value === null) {
		return value;
	}

	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'object') {
		return value;
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();

		if (
			(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
			(trimmed.startsWith("'") && trimmed.endsWith("'"))
		) {
			return trimmed.slice(1, -1);
		}

		if (!isNaN(Number(trimmed)) && !isNaN(parseFloat(trimmed))) {
			return Number(trimmed);
		}

		if (trimmed.toLowerCase() === 'true') return true;
		if (trimmed.toLowerCase() === 'false') return false;
		if (trimmed.toLowerCase() === 'null') return null;

		return trimmed;
	}

	return String(value);
}

export function formatDirectusError(error: any): string {
	if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
		return error.response.data.errors.map((e: any) => e.message || e).join(', ');
	}

	if (error.response?.data?.message) return error.response.data.message;
	if (error.message) return error.message;
	if (error.errors && Array.isArray(error.errors))
		return error.errors.map((e: any) => e.message).join(', ');
	return 'An unknown error occurred';
}
