export const SYSTEM_COLLECTION_PREFIX = 'directus_';

export const API_URL_VARIANTS = {
	COLLECTIONS: ['collections', 'api/collections'],
	FIELDS: (collection: string) => [`fields/${collection}`, `api/fields/${collection}`],
	ROLES: ['roles', 'api/roles'],
	RELATIONS: ['relations', 'api/relations'],
};

export const SYSTEM_FIELDS = {
	COMMON_SYSTEM_FIELDS: ['date_created', 'date_updated', 'user_created', 'user_updated', 'id'],
	USER_SPECIFIC_FIELDS: [
		'password',
		'token',
		'last_access',
		'last_page',
		'provider',
		'external_identifier',
		'auth_data',
		'tfa_secret',
	],
	FILE_SPECIFIC_FIELDS: [
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
