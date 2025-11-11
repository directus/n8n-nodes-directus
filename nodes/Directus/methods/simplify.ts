import type { DirectusUser, DirectusFile } from '../types';

type SimplifiedUser = Pick<
	DirectusUser,
	'id' | 'email' | 'first_name' | 'last_name' | 'status' | 'role' | 'date_created' | 'last_access'
>;

type SimplifiedFile = Pick<
	DirectusFile,
	| 'id'
	| 'filename_download'
	| 'title'
	| 'type'
	| 'filesize'
	| 'width'
	| 'height'
	| 'date_created'
	| 'date_updated'
>;

export function simplifyUser(item: DirectusUser): SimplifiedUser {
	const result: SimplifiedUser = { id: item.id };
	if (item.email) result.email = item.email;
	if (item.first_name) result.first_name = item.first_name;
	if (item.last_name) result.last_name = item.last_name;
	if (item.status) result.status = item.status;
	if (item.role) result.role = item.role;
	if (item.date_created) result.date_created = item.date_created;
	if (item.last_access) result.last_access = item.last_access;
	return result;
}

export function simplifyFile(item: DirectusFile): SimplifiedFile {
	const result: SimplifiedFile = { id: item.id };
	if (item.filename_download) result.filename_download = item.filename_download;
	if (item.title) result.title = item.title;
	if (item.type) result.type = item.type;
	if (item.filesize) result.filesize = item.filesize;
	if (item.width) result.width = item.width;
	if (item.height) result.height = item.height;
	if (item.date_created) result.date_created = item.date_created;
	if (item.date_updated) result.date_updated = item.date_updated;
	return result;
}
