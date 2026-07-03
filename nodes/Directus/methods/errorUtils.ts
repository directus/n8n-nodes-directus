const DEFAULT_MAX_ERROR_PAYLOAD_LENGTH = 8000;

export function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function safeStringify(value: unknown): string {
	const seen = new WeakSet<object>();

	return JSON.stringify(value, (_key, currentValue) => {
		if (isObject(currentValue)) {
			if (seen.has(currentValue)) {
				return '[Circular]';
			}
			seen.add(currentValue);
		}

		return currentValue;
	});
}

export function truncateText(text: string, maxLength = DEFAULT_MAX_ERROR_PAYLOAD_LENGTH): string {
	if (text.length <= maxLength) {
		return text;
	}

	return `${text.slice(0, maxLength)}... [truncated]`;
}
