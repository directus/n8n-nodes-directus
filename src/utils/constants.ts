// Common constants used across the n8n integration

export const DEFAULT_LIMIT = 25;

export const FALLBACK_DISPLAY_FIELDS = ['name', 'title', 'label', 'display', 'id'];

export const SYSTEM_COLLECTION_PREFIX = 'directus_';

// API URL variants for compatibility
export const API_URL_VARIANTS = {
	COLLECTIONS: ['collections', 'api/collections'],
	FIELDS: (collection: string) => [`fields/${collection}`, `api/fields/${collection}`],
	ROLES: ['roles', 'api/roles'],
	FLOWS: ['flows', 'api/flows'],
	RELATIONS: ['relations', 'api/relations'],
};

// System fields that should be filtered out
export const SYSTEM_FIELDS = {
	COMMON: ['date_created', 'date_updated', 'user_created', 'user_updated'],
	USER_SENSITIVE: [
		'id',
		'password',
		'token',
		'last_access',
		'last_page',
		'provider',
		'external_identifier',
		'auth_data',
		'tfa_secret',
		'date_created',
		'date_updated',
		'user_created',
		'user_updated',
	],
	FILE_SENSITIVE: [
		'id',
		'storage',
		'filename_disk',
		'filename_download',
		'type',
		'filesize',
		'width',
		'height',
		'duration',
		'embed',
		'uploaded_by',
		'uploaded_on',
		'modified_by',
		'modified_on',
		'charset',
		'focal_point_x',
		'focal_point_y',
	],
};

// Field type mappings
export const FIELD_TYPE_MAPPINGS: Record<string, string> = {
	integer: 'number',
	bigInteger: 'number',
	float: 'number',
	decimal: 'number',
	boolean: 'boolean',
	date: 'dateTime',
	dateTime: 'dateTime',
	timestamp: 'dateTime',
	text: 'string',
	json: 'string',
};
