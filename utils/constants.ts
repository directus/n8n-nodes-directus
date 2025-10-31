// Prefix used to identify Directus system collections (e.g., directus_users, directus_files)
export const SYSTEM_COLLECTION_PREFIX = 'directus_';

// System fields filtered out from the n8n UI because:
// 1. They are managed automatically by Directus
// 2. Users shouldn't manually set them in most cases
// 3. They clutter the UI with technical fields that aren't relevant for typical operations
export const SYSTEM_FIELDS = {
	// Auto-managed audit fields present on all collections
	COMMON_SYSTEM_FIELDS: ['date_created', 'date_updated', 'user_created', 'user_updated', 'id'],
	// Sensitive or internal user fields that shouldn't be exposed in the UI
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
	// Technical file metadata managed by Directus storage system
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
