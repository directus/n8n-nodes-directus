import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { SYSTEM_COLLECTION_PREFIX, SYSTEM_FIELDS } from '../../../utils/constants';
import {
	DirectusCredentials,
	getCollectionsFromAPI,
	getFieldsFromAPI,
	getRelationsFromAPI,
} from './api';

const LOWERCASE_WORDS = new Set([
	'a',
	'an',
	'and',
	'as',
	'at',
	'but',
	'by',
	'for',
	'in',
	'of',
	'on',
	'or',
	'the',
	'to',
	'up',
	'yet',
]);

type Relation = {
	many_collection?: string;
	one_collection?: string;
	many_field?: string;
	one_field?: string;
};

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
			[key: string]: unknown;
		};
		interface?: string;
		locked?: boolean;
		hidden?: boolean;
		translations?: Array<{ translation: string; [key: string]: unknown }>;
		display_name?: string;
	};
	schema?: {
		foreign_key_table?: string;
	};
}

export interface Collection {
	collection: string;
	schema?: unknown;
	meta?: {
		translations?: Array<{ translation: string; [key: string]: unknown }>;
		display_template?: string;
	};
}

export type { DirectusCredentials };

const relationCache = new Map<string, Relation[]>();

function formatTitle(input: string): string {
	if (!input) return '';
	const decamelized = input
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
	const words = decamelized.split(/\s|-|_/g);

	return words
		.map((word, index, array) => {
			const lowercase = word.toLowerCase();
			if (index === 0 || index === array.length - 1) {
				return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
			}
			return LOWERCASE_WORDS.has(lowercase)
				? lowercase
				: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join(' ');
}

function isRelationshipField(field: Field): boolean {
	return field?.meta?.special?.some((s) => ['m2o', 'o2m', 'm2m', 'm2a'].includes(s)) ?? false;
}

async function getCollectionRelations(
	functions: ILoadOptionsFunctions,
	collection: string,
): Promise<Relation[]> {
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

function getFieldRelationshipInfo(
	field: Field,
	relations: Relation[],
): { type: string; relatedCollection: string } | null {
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

	if (relation.one_field === field.field && relation.one_collection === field.collection) {
		return { type: 'o2m', relatedCollection: relation.many_collection || '' };
	}

	return null;
}

function shouldSkipField(field: Field): boolean {
	if (!field?.meta) return true;
	const special = field.meta.special || [];
	return (
		special.includes('m2a') ||
		field.meta.locked ||
		field.meta.hidden ||
		field.type === 'alias' ||
		field.field?.startsWith('$')
	);
}

function isSystemField(field: Field): boolean {
	if (!field?.field) return false;
	if (field.field === 'id') return true;
	if (field.meta?.special?.includes('m2a') || field.type === 'alias' || field.field.startsWith('$'))
		return true;
	return SYSTEM_FIELDS.COMMON_SYSTEM_FIELDS.includes(field.field);
}

function createBaseN8nField(field: Field, isCreate = false) {
	const isRequired = isCreate && (field.meta?.required ?? false);
	const displayName = formatTitle(field.field);

	return {
		name: field.field,
		displayName: isRequired ? `${displayName} *` : displayName,
		type: 'string' as const,
		default: '',
		description: field.meta?.note || '',
		required: isRequired,
	};
}

function convertDirectusFieldToN8n(field: Field, isCreate = false, relations: Relation[] = []) {
	if (shouldSkipField(field)) return null;

	const n8nField = createBaseN8nField(field, isCreate);
	const fieldType = field.type.toLowerCase();
	const interfaceType = field.meta?.interface?.toLowerCase() || '';

	if (field.meta?.options?.choices) {
		return {
			...n8nField,
			type: 'options' as const,
			options: field.meta.options.choices.map((o) => ({ name: o.text, value: o.value })),
		};
	}

	if (isRelationshipField(field)) {
		const relationship = getFieldRelationshipInfo(field, relations);
		if (relationship) {
			const { type, relatedCollection } = relationship;
			if (relatedCollection === 'directus_files') {
				return {
					...n8nField,
					type: 'string' as const,
					description:
						`${n8nField.description}\nUpload a file or select from existing files.`.trim(),
				};
			}
			return {
				...n8nField,
				type: 'string' as const,
				description:
					`${n8nField.description}\n${type.toUpperCase()} relationship to ${formatTitle(relatedCollection)} collection.`.trim(),
			};
		}
	}

	if (['file', 'file-image', 'file-video'].includes(interfaceType)) {
		return {
			...n8nField,
			type: 'string' as const,
			description: `${n8nField.description}\nUpload a file or select from existing files.`.trim(),
		};
	}

	if (
		fieldType === 'boolean' ||
		fieldType === 'toggle' ||
		interfaceType === 'toggle' ||
		interfaceType === 'boolean'
	) {
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

	if (fieldType === 'json' || interfaceType === 'json') {
		return {
			...n8nField,
			type: 'string' as const,
			description: `${n8nField.description}\nEnter JSON data.`.trim(),
		};
	}

	return n8nField;
}

async function getFields(functions: ILoadOptionsFunctions, collection: string): Promise<Field[]> {
	try {
		const fields: Field[] = await getFieldsFromAPI(functions, collection);
		fields.sort((a, b) => (a.meta?.sort ?? 0) - (b.meta?.sort ?? 0));
		return fields.filter((f) => !isSystemField(f));
	} catch (error) {
		throw new Error(
			`Failed to fetch fields for collection '${collection}': ${formatDirectusError(error)}`,
		);
	}
}

export async function getCollections(functions: ILoadOptionsFunctions): Promise<Collection[]> {
	try {
		const collections = await getCollectionsFromAPI(functions);
		return collections.filter((c: Collection) => {
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

export function processFieldValue(value: unknown): unknown {
	if (value === undefined || value === null) return value;
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
		return value;
	if (typeof value === 'object') return value;
	return String(value);
}

export function formatDirectusError(error: unknown): string {
	const e = error as {
		response?: { data?: { errors?: Array<{ message?: string }>; message?: string } };
		message?: string;
		errors?: Array<{ message?: string }>;
	};

	if (e.response?.data?.errors?.length) {
		return e.response.data.errors.map((x) => x.message || x).join(', ');
	}
	if (e.response?.data?.message) return e.response.data.message;
	if (e.message) return e.message;
	if (e.errors?.length) return e.errors.map((x) => x.message).join(', ');
	return 'An unknown error occurred';
}

export function formatDisplayName(field: {
	field: string;
	meta?: { display_name?: string };
}): string {
	return (
		field.meta?.display_name ||
		field.field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
	);
}

export const shouldSkipFieldPublic = shouldSkipField;
