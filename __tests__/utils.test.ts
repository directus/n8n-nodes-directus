import { describe, it, expect } from '@jest/globals';
import {
	formatTitle,
	formatCollectionLabel,
	formatRoleLabel,
	createEnhancedItemLabel,
} from '../src/utils/format-title';
import {
	isRelationshipField,
	getFieldRelationshipInfo,
	isSystemField,
	convertDirectusFieldToN8n,
} from '../src/utils/directus';

describe('Format Title Utils', () => {
	describe('formatTitle', () => {
		it('should format snake_case to Title Case', () => {
			expect(formatTitle('user_name')).toBe('User Name');
			expect(formatTitle('first_name')).toBe('First Name');
			expect(formatTitle('created_at')).toBe('Created At');
		});

		it('should handle single words', () => {
			expect(formatTitle('name')).toBe('Name');
			expect(formatTitle('id')).toBe('Id');
		});

		it('should handle empty strings', () => {
			expect(formatTitle('')).toBe('');
		});
	});

	describe('formatCollectionLabel', () => {
		it('should format collection names properly', () => {
			expect(formatCollectionLabel({ collection: 'users' })).toBe('Users');
			expect(formatCollectionLabel({ collection: 'user_profiles' })).toBe('User Profiles');
			expect(formatCollectionLabel({ collection: 'blog_posts' })).toBe('Blog Posts');
		});

		it('should use translations when available', () => {
			const collection = {
				collection: 'users',
				meta: {
					translations: [{ translation: 'Utilisateurs' }],
				},
			};
			expect(formatCollectionLabel(collection)).toBe('Utilisateurs');
		});
	});

	describe('formatRoleLabel', () => {
		it('should format role names properly', () => {
			expect(formatRoleLabel({ name: 'admin' })).toBe('admin');
			expect(formatRoleLabel({ name: 'content_manager' })).toBe('content_manager');
			expect(formatRoleLabel({ name: 'public' })).toBe('public');
		});

		it('should handle roles without names', () => {
			expect(formatRoleLabel({})).toBe('Role');
		});
	});

	describe('createEnhancedItemLabel', () => {
		it('should create labels from item data', () => {
			const item = { id: 1, name: 'Test Item', title: 'Test Title' };
			const preferredFields = ['name', 'title', 'label'];
			expect(createEnhancedItemLabel(item, preferredFields)).toBe('Test Item');
		});

		it('should fallback to title if name not available', () => {
			const item = { id: 2, title: 'Test Title' };
			const preferredFields = ['name', 'title', 'label'];
			expect(createEnhancedItemLabel(item, preferredFields)).toBe('Test Title');
		});

		it('should fallback to id if no name or title', () => {
			const item = { id: 3 };
			const preferredFields = ['name', 'title', 'label'];
			expect(createEnhancedItemLabel(item, preferredFields)).toBe('3');
		});

		it('should handle items with different field names', () => {
			const item = { id: 4, label: 'Test Label' };
			const preferredFields = ['name', 'title', 'label'];
			expect(createEnhancedItemLabel(item, preferredFields)).toBe('Test Label');
		});

		it('should handle users with first and last names', () => {
			const item = { id: 5, name: 'Test User', first_name: 'John', last_name: 'Doe' };
			const preferredFields = ['name', 'title', 'label'];
			expect(createEnhancedItemLabel(item, preferredFields)).toBe('John Doe');
		});

		it('should include email when available', () => {
			const item = { id: 6, name: 'Test User', email: 'test@example.com' };
			const preferredFields = ['name', 'title', 'label'];
			expect(createEnhancedItemLabel(item, preferredFields)).toBe('Test User (test@example.com)');
		});

		it('should include status when not published', () => {
			const item = { id: 7, name: 'Test Item', status: 'draft' };
			const preferredFields = ['name', 'title', 'label'];
			expect(createEnhancedItemLabel(item, preferredFields)).toBe('Test Item (draft)');
		});
	});
});

describe('Directus Utils', () => {
	describe('isRelationshipField', () => {
		it('should identify relationship fields correctly', () => {
			const m2oField = { meta: { special: ['m2o'] } };
			const o2mField = { meta: { special: ['o2m'] } };
			const m2mField = { meta: { special: ['m2m'] } };
			const m2aField = { meta: { special: ['m2a'] } };
			const regularField = { meta: { special: [] } };

			expect(isRelationshipField(m2oField as any)).toBe(true);
			expect(isRelationshipField(o2mField as any)).toBe(true);
			expect(isRelationshipField(m2mField as any)).toBe(true);
			expect(isRelationshipField(m2aField as any)).toBe(true);
			expect(isRelationshipField(regularField as any)).toBe(false);
		});

		it('should handle fields with multiple special types', () => {
			const mixedField = { meta: { special: ['cast-boolean', 'm2o'] } };
			expect(isRelationshipField(mixedField as any)).toBe(true);
		});

		it('should handle edge cases', () => {
			expect(isRelationshipField(null as any)).toBe(false);
			expect(isRelationshipField(undefined as any)).toBe(false);
			expect(isRelationshipField({} as any)).toBe(false);
			expect(isRelationshipField({ meta: null } as any)).toBe(false);
			expect(isRelationshipField({ meta: { special: null } } as any)).toBe(false);
		});
	});

	describe('getFieldRelationshipInfo', () => {
		const mockRelations = [
			{
				many_field: 'user_id',
				many_collection: 'posts',
				one_field: 'id',
				one_collection: 'users',
			},
			{
				many_field: 'category_id',
				many_collection: 'posts',
				one_field: 'id',
				one_collection: 'categories',
			},
		];

		it('should identify many-to-one relationships', () => {
			const field = { field: 'user_id', collection: 'posts' };
			const result = getFieldRelationshipInfo(field as any, mockRelations);

			expect(result).toEqual({
				type: 'm2o',
				relatedCollection: 'users',
				isMultiSelect: false,
			});
		});

		it('should identify one-to-many relationships', () => {
			const field = { field: 'id', collection: 'users' };
			const result = getFieldRelationshipInfo(field as any, mockRelations);

			expect(result).toEqual({
				type: 'o2m',
				relatedCollection: 'posts',
				isMultiSelect: true,
			});
		});

		it('should return null for non-relationship fields', () => {
			const field = { field: 'title', collection: 'posts' };
			const result = getFieldRelationshipInfo(field as any, mockRelations);

			expect(result).toBeNull();
		});

		it('should handle edge cases', () => {
			expect(getFieldRelationshipInfo(null as any, mockRelations)).toBeNull();
			expect(getFieldRelationshipInfo({} as any, mockRelations)).toBeNull();
			expect(getFieldRelationshipInfo({ field: 'test' } as any, [])).toBeNull();
			expect(getFieldRelationshipInfo({ field: 'test' } as any, null as any)).toBeNull();
		});

		it('should handle ambiguous relationships correctly', () => {
			// Test case where field name exists in multiple relations
			const ambiguousRelations = [
				...mockRelations,
				{
					many_field: 'user_id',
					many_collection: 'comments',
					one_field: 'id',
					one_collection: 'users',
				},
			];

			const postsField = { field: 'user_id', collection: 'posts' };
			const commentsField = { field: 'user_id', collection: 'comments' };

			const postsResult = getFieldRelationshipInfo(postsField as any, ambiguousRelations);
			const commentsResult = getFieldRelationshipInfo(commentsField as any, ambiguousRelations);

			expect(postsResult?.relatedCollection).toBe('users');
			expect(commentsResult?.relatedCollection).toBe('users');
			expect(postsResult?.type).toBe('m2o');
			expect(commentsResult?.type).toBe('m2o');
		});
	});

	describe('isSystemField', () => {
		it('should identify system fields correctly', () => {
			const systemFields = ['date_created', 'date_updated', 'user_created', 'user_updated'];

			systemFields.forEach((fieldName) => {
				const field = { field: fieldName };
				expect(isSystemField(field as any)).toBe(true);
			});
		});

		it('should identify non-system fields', () => {
			const regularFields = ['name', 'title', 'description', 'email'];

			regularFields.forEach((fieldName) => {
				const field = { field: fieldName };
				expect(isSystemField(field as any)).toBe(false);
			});
		});

		it('should identify fields starting with $ as system fields', () => {
			const field = { field: '$thumbnail' };
			expect(isSystemField(field as any)).toBe(true);
		});

		it('should handle create mode correctly', () => {
			// In create mode, id should not be considered a system field
			const field = { field: 'id' };
			expect(isSystemField(field as any, true)).toBe(false);
		});
	});

	describe('convertDirectusFieldToN8n', () => {
		it('should convert Directus field types to n8n types', () => {
			const stringField = { field: 'name', type: 'string', meta: {} };
			const intField = { field: 'age', type: 'integer', meta: {} };
			const floatField = { field: 'price', type: 'float', meta: {} };
			const booleanField = { field: 'active', type: 'boolean', meta: {} };
			const dateField = { field: 'created_at', type: 'date', meta: {} };

			expect(convertDirectusFieldToN8n(stringField as any)?.type).toBe('string');
			expect(convertDirectusFieldToN8n(intField as any)?.type).toBe('number'); // Integer type
			expect(convertDirectusFieldToN8n(floatField as any)?.type).toBe('number'); // Float type
			expect(convertDirectusFieldToN8n(booleanField as any)?.type).toBe('boolean');
			expect(convertDirectusFieldToN8n(dateField as any)?.type).toBe('dateTime');
		});

		it('should return null for invalid fields', () => {
			expect(convertDirectusFieldToN8n(null as any)).toBeNull();
			expect(convertDirectusFieldToN8n(undefined as any)).toBeNull();
		});

		it('should handle choice fields', () => {
			const choiceField = {
				field: 'status',
				type: 'string',
				meta: {
					options: {
						choices: [
							{ text: 'Active', value: 'active' },
							{ text: 'Inactive', value: 'inactive' },
						],
					},
				},
			};

			const result = convertDirectusFieldToN8n(choiceField as any);
			expect(result?.type).toBe('options');
			expect(result?.options).toHaveLength(2);
			expect(result?.options[0]).toEqual({ name: 'Active', value: 'active' });
		});

		it('should handle fields that should be skipped', () => {
			const lockedField = { field: 'locked', type: 'string', meta: { locked: true } };
			const hiddenField = { field: 'hidden', type: 'string', meta: { hidden: true } };
			const m2aField = { field: 'relations', type: 'alias', meta: { special: ['m2a'] } };

			expect(convertDirectusFieldToN8n(lockedField as any)).toBeNull();
			expect(convertDirectusFieldToN8n(hiddenField as any)).toBeNull();
			expect(convertDirectusFieldToN8n(m2aField as any)).toBeNull();
		});

		it('should handle empty choice fields gracefully', () => {
			const emptyChoiceField = {
				field: 'status',
				type: 'string',
				meta: { options: { choices: [] } },
			};

			const result = convertDirectusFieldToN8n(emptyChoiceField as any);
			expect(result?.type).toBe('options');
			expect(result?.options).toHaveLength(0);
		});
	});
});
