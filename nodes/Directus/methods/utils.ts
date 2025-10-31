import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { FieldParameter, DirectusField } from '../types';

export function buildRequestBody(fieldParams: FieldParameter | undefined): Record<string, unknown> {
	const body: Record<string, unknown> = {};

	if (fieldParams?.fields?.field) {
		for (const field of fieldParams.fields.field) {
			if (field.name && field.value !== undefined) {
				body[field.name] = field.value;
			}
		}
	}

	return body;
}

export function shouldSkipField(field: DirectusField): boolean {
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

export function formatFieldName(input: string): string {
	if (!input) return '';
	return input.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function parseJsonData(context: IExecuteFunctions, jsonData: string | unknown): unknown {
	if (typeof jsonData === 'string') {
		try {
			return JSON.parse(jsonData);
		} catch {
			throw new NodeOperationError(context.getNode(), 'Invalid JSON format');
		}
	}
	return jsonData;
}
