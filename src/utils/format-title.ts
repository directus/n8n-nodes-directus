import { FALLBACK_DISPLAY_FIELDS } from './constants';

// Words that shouldn't be capitalized unless they're the first or last word
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

function capitalizeFirst(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function decamelize(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
		.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2'); // Split consecutive capitals
}

export function formatTitle(input: string, separator: RegExp = /\s|-|_/g): string {
	if (!input) return '';

	// Decamelize the string first
	const decamelized = decamelize(input);

	// Split the string into words
	const words = decamelized.split(separator);

	// Process each word
	const formattedWords = words.map((word, index, array) => {
		const lowercaseWord = word.toLowerCase();

		// Always capitalize first and last words
		if (index === 0 || index === array.length - 1) {
			return capitalizeFirst(word);
		}

		// Check if word should remain lowercase
		if (LOWERCASE_WORDS.has(lowercaseWord)) {
			return lowercaseWord;
		}

		// Capitalize all other words
		return capitalizeFirst(word);
	});

	return formattedWords.join(' ');
}

function getItemDisplayValue(item: Record<string, unknown>, preferredFields: string[]): string {
	for (const field of preferredFields) {
		if (item[field]) return String(item[field]);
	}

	for (const field of FALLBACK_DISPLAY_FIELDS) {
		if (item[field]) return String(item[field]);
	}

	return `Item ${item.id}`;
}

export function createEnhancedItemLabel(
	item: Record<string, unknown>,
	preferredFields: string[],
): string {
	const displayValue = getItemDisplayValue(item, preferredFields);

	// Create a more descriptive label for users
	let label = displayValue;

	if (item.first_name && item.last_name) {
		label = `${item.first_name} ${item.last_name}`;
	} else if (item.email && !preferredFields.includes('email')) {
		label = `${displayValue} (${item.email})`;
	} else if (item.status && item.status !== 'published') {
		label = `${displayValue} (${item.status})`;
	}

	return label;
}
