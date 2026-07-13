import { safeStringify, truncateText } from './errorUtils';
import type { DirectusErrorDetails, DirectusExecutionErrorDetails } from '../types';

interface BuildExecutionErrorContextParams {
	itemIndex: number;
	resource: string;
	operation: string;
	collection?: string;
	errorDetails: DirectusErrorDetails;
}

export function buildExecutionErrorContext({
	itemIndex,
	resource,
	operation,
	collection,
	errorDetails,
}: BuildExecutionErrorContextParams): DirectusExecutionErrorDetails {
	return {
		...errorDetails,
		itemIndex,
		resource,
		operation,
		...(collection ? { collection } : {}),
	};
}

export function buildExecutionErrorDescription(
	errorDetails: DirectusExecutionErrorDetails,
): string {
	const descriptionLines = [
		`Item index: ${errorDetails.itemIndex}`,
		`Resource: ${errorDetails.resource}`,
		`Operation: ${errorDetails.operation}`,
	];

	if (errorDetails.collection) {
		descriptionLines.push(`Collection: ${errorDetails.collection}`);
	}

	if (errorDetails.statusCode !== undefined) {
		const statusMessage = errorDetails.statusMessage ? ` (${errorDetails.statusMessage})` : '';
		descriptionLines.push(`HTTP status: ${errorDetails.statusCode}${statusMessage}`);
	}

	if (errorDetails.responseBody !== undefined) {
		descriptionLines.push(
			`Response body: ${truncateText(safeStringify(errorDetails.responseBody), 2000)}`,
		);
	}

	if (errorDetails.directusErrors && errorDetails.directusErrors.length > 0) {
		descriptionLines.push(
			`Directus errors: ${truncateText(safeStringify(errorDetails.directusErrors), 2000)}`,
		);
	}

	if (errorDetails.originalMessage && errorDetails.originalMessage !== errorDetails.message) {
		descriptionLines.push(`Original error: ${errorDetails.originalMessage}`);
	}

	return descriptionLines.join('\n');
}
