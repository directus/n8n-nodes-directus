export interface DirectusCredentials {
	url: string;
	token: string;
	environment: 'cloud' | 'self-hosted';
}

export interface DirectusRelation {
	many_collection: string | null;
	one_collection: string | null;
	many_field: string | null;
	one_field: string | null;
}

export interface DirectusCollectionMeta {
	collection: string;
	icon: string | null;
	note: string | null;
	display_template: string | null;
	hidden: boolean;
	singleton: boolean;
	translations: Record<string, string> | null;
	archive_field: string | null;
	archive_app_filter: boolean;
	archive_value: string | null;
	unarchive_value: string | null;
	sort_field: string | null;
	accountability: 'all' | 'activity' | null;
	color: string | null;
	item_duplication_fields: string[] | null;
	sort: number | null;
	group: string | null;
	collapse: 'open' | 'closed' | 'locked' | null;
	preview_url: string | null;
	versioning: boolean;
}

export interface DirectusCollectionSchema {
	name: string;
	comment?: string | null;
}

export interface DirectusCollection {
	collection: string;
	schema: DirectusCollectionSchema | null;
	meta: DirectusCollectionMeta | null;
}

export interface DirectusFieldMeta {
	special: string[] | null;
	sort: number | null;
	required: boolean;
	note: string | null;
	options: Record<string, unknown> | null;
	interface: string | null;
	locked: boolean;
	hidden: boolean;
	translations: Record<string, string> | null;
	display: string | null;
	display_options: Record<string, unknown> | null;
	display_name: string | null;
	width: string | null;
	validation: Record<string, unknown> | null;
	validation_message: string | null;
}

export interface DirectusFieldSchema {
	name: string;
	table: string;
	data_type: string;
	default_value: unknown;
	max_length: number | null;
	numeric_precision: number | null;
	numeric_scale: number | null;
	is_nullable: boolean;
	is_unique: boolean;
	is_primary_key: boolean;
	is_generated: boolean;
	generation_expression: string | null;
	has_auto_increment: boolean;
	foreign_key_table: string | null;
	foreign_key_column: string | null;
	comment: string | null;
}

export interface DirectusField {
	field: string;
	type: string;
	collection: string | null;
	meta: DirectusFieldMeta | null;
	schema: DirectusFieldSchema | null;
}

export interface DirectusRole {
	id: string;
	name: string;
	icon: string;
	description: string | null;
	ip_access: string[] | null;
	enforce_tfa: boolean;
	admin_access: boolean;
	app_access: boolean;
}

export interface FieldParameter {
	fields?: {
		field?: Array<{ name: string; value: unknown }>;
	};
}

export interface DirectusApiResponse<T> {
	data: T | T[];
}

export interface FieldRelationship {
	type: 'm2o' | 'o2m';
	relatedCollection: string;
}

export interface DirectusUser {
	id: string;
	email?: string;
	first_name?: string;
	last_name?: string;
	status?: string;
	role?: string | { id: string; name: string };
	date_created?: string;
	last_access?: string;
	[key: string]: unknown;
}

export interface DirectusFile {
	id: string;
	filename_download?: string;
	title?: string;
	type?: string;
	filesize?: number;
	width?: number;
	height?: number;
	date_created?: string;
	date_updated?: string;
	[key: string]: unknown;
}
